"use client";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Timeframe } from "@/lib/types";
import { useChart } from "@/lib/hooks/useChart";
import { useTradingPosition } from "@/lib/hooks/useTradingPosition";
import { useUserData } from "@/lib/hooks/useUserData";
import { useTheme } from "@/contexts/ThemeContext";
import { DrawingProvider, useDrawing } from "@/contexts/DrawingContext";
import { useLayoutManager } from "@/lib/hooks/useLayoutManager";
import { useChartResize } from "@/lib/hooks/useChartResize";
import { Order } from "@/lib/order-management";
import { OrderStatus } from "@/lib/services/orderService";
import {
  MarketSimulationService,
  SimulatedMarketData,
} from "@/lib/services/marketSimulationService";
import { orderBookService } from "@/lib/services/orderBookService";
import { WebSocketService } from "@/lib/services/webSocketService";
import { NotificationService } from "@/lib/services/notificationService";
import { splitOrderForExchangeLimit } from "@/lib/position-sizing";

import TopNavigation from "@/components/trading/TopNavigation";
import StockInfoBar from "@/components/trading/StockInfoBar";
import LeftSidebar from "@/components/trading/LeftSidebar";
import ChartSection from "@/components/trading/ChartSection";
import AccountManagerSection from "@/components/trading/AccountManagerSection";
import StrategyTester from "@/components/trading/StrategyTester";
import WatchlistSection from "@/components/trading/WatchlistSection";
import StockInfoSection from "@/components/trading/StockInfoSection";
import NewsSection from "@/components/trading/NewsSection";
import ResizableDivider from "@/components/trading/ResizableDivider";
import OrderPanel from "@/components/trading/OrderPanel";

import {
  createOrder,
  CreateOrderDto,
  getOrders,
} from "@/lib/services/orderApiService";

import { useWatchlistPositions } from "@/lib/hooks/useWatchlistPositions";

interface TradingPageProps {
  symbol?: string;
}

export default function TradingPlatformWrapper(props: TradingPageProps) {
  return (
    <DrawingProvider>
      <Home {...props} />
    </DrawingProvider>
  );
}

function Home({ symbol = "VIC.VN" }: TradingPageProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const marketSimulationRef = useRef<MarketSimulationService | null>(null);
  const hasManuallyResizedOrderPanel = useRef(false);

  // Core state
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const [ohlcData, setOhlcData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  } | null>(null);

  // Chart state
  const [currentVolume, setCurrentVolume] = useState(0);
  const [chartType, setChartType] = useState<
    "candlestick" | "line" | "area"
  >("candlestick");
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  const lastPriceRef = useRef(0);
  // ✅ FIX: store last price per symbol so unrealized can update correctly
  const lastPriceBySymbolRef = useRef<Record<string, number>>({});

  const [chartData, setChartData] = useState<{ time: number; value: number }[]>(
    []
  );

  // UI state
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [enableTrendlineDrawing, setEnableTrendlineDrawing] = useState(false);
  const [enableBrushDrawing, setEnableBrushDrawing] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [isOrderPanelDragging, setIsOrderPanelDragging] = useState(false);
  const [orderPanelSide, setOrderPanelSide] = useState<"buy" | "sell">("buy");
  const [bestBidPrice, setBestBidPrice] = useState<number | undefined>(
    undefined
  );
  const [bestAskPrice, setBestAskPrice] = useState<number | undefined>(
    undefined
  );

  // User data
  const {
    userDetail,
    userBalance,
    loading: userDataLoading,
    error: userDataError,
    refreshUserData,
  } = useUserData();

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);

  // ===== Orders refs (tránh stale closure) =====
  const ordersRef = useRef<Order[]>([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // ===== Prevent double-apply filled qty (WS có thể bắn nhiều lần) =====
  const appliedFilledQtyRef = useRef<Record<string, number>>({});

  // ===== Ledger để tính cost-basis & realized PnL theo FIFO =====
  type Lot = { qty: number; price: number };
  const lotsRef = useRef<Map<string, Lot[]>>(new Map()); // key = symbol

  // ===== P&L state =====
  const [realizedPnl, setRealizedPnl] = useState(0);
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);
  const [equity, setEquity] = useState(0);

  // Market simulation
  const {
    tradingPosition,
    handleBuy,
    handleSell,
    updateLastPrice,
    getAllPositions,
  } = useTradingPosition();

  // Custom hooks
  const { theme } = useTheme();
  const { activeTool, setActiveTool } = useDrawing();
  const { triggerChartResize } = useChartResize(containerRef);
  const layoutManager = useLayoutManager();
  const isDarkMode = true;

  // Watchlist symbols
  const watchlistStocks = useMemo(
    () => ["VIC.VN", "VHM.VN", "VCB.VN", "TCB.VN", "FPT.VN", "VNM.VN", "HPG.VN", "MSN.VN"],
    []
  );

  // Use the new watchlist positions hook
  const { positions, refreshWatchlistPositions, loadingPositions } =
    useWatchlistPositions(watchlistStocks);

  // Effect to refresh positions on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshWatchlistPositions();
    }, 100);
    return () => clearTimeout(timer);
  }, [refreshWatchlistPositions]);

  // Effect to initialize lots from existing positions
  useEffect(() => {
    if (loadingPositions || !positions) return;
  
    // Clear existing lots and re-initialize when positions change
    lotsRef.current.clear();
  
    console.log('[INIT] Initializing lots from positions:', positions);
  
    // Convert positions to lots (assuming average price of 10000 for initialization)
    // In a real implementation, you would need to get the actual average price from the backend
    positions.forEach((shares, symbol) => {
      if (shares > 0) {
        // Create a single lot with an estimated average price
        const avgPrice = 10000; // Placeholder - you'd need to get this from backend
        lotsRef.current.set(symbol, [{ qty: shares, price: avgPrice }]);
        console.log('[INIT] Created lot for', symbol, ':', { qty: shares, price: avgPrice });
      }
    });
  
    // Update P&L after initialization
    markToMarketAll();
  }, [positions, loadingPositions]);

  // ✅ MarketSimulation chỉ dùng cho bot, KHÔNG đụng tới ohlcData / bid/ask
  useEffect(() => {
    marketSimulationRef.current = new MarketSimulationService();

    marketSimulationRef.current.startSimulation((data: SimulatedMarketData) => {
      if (data.symbol === selectedSymbol) {
        updateLastPrice(data.symbol, data.price);
      }
    });

    return () => {
      marketSimulationRef.current?.stopSimulation();
    };
  }, [updateLastPrice, selectedSymbol]);

  // Strategy Tester fullscreen toggle
  useEffect(() => {
    const handleToggleFullscreen = () => {
      if (isPrivateMode) {
        if (layoutManager.chartAccountLayout.split > 50) {
          layoutManager.chartAccountLayout.setSplit(20);
        } else {
          layoutManager.chartAccountLayout.setSplit(50);
        }
      } else {
        if (layoutManager.isAccountMaximized) {
          layoutManager.handleRestorePanel();
        } else {
          layoutManager.handleMaximizePanel();
        }
      }
    };

    window.addEventListener("toggleStrategyTesterFullscreen", handleToggleFullscreen);
    return () => {
      window.removeEventListener("toggleStrategyTesterFullscreen", handleToggleFullscreen);
    };
  }, [layoutManager, isPrivateMode]);
  // ✅ Re-mark-to-market whenever latest chart price changes
useEffect(() => {
  if (!ohlcData?.close) return;
  // mỗi khi chart close đổi => unrealized/equity update
  markToMarketAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ohlcData?.close]);


  // Wrap price update for chart
  const handlePriceUpdate = useCallback(
    (price: number) => {
      updateLastPrice(selectedSymbol, price);
    },
    [selectedSymbol, updateLastPrice]
  );

  // Chart management with drawing – data thật (Yahoo) vào đây
  const chartResult = useChart({
    containerRef,
    symbol: selectedSymbol,
    timeframe,
    onPriceUpdate: handlePriceUpdate,
    onOHLCUpdate: setOhlcData,
    onVolumeUpdate: setCurrentVolume,
    isDarkMode,
    showRSI,
    showMACD,
    chartType,
    isPrivateMode,
    enableTrendlineDrawing,
    enableBrushDrawing,
    activeTool,
    onDrawingComplete: () => {
      setActiveTool("selection");
      setEnableTrendlineDrawing(false);
    },
  });

  const drawing = chartResult?.drawing || {
    isEnabled: false,
    isDrawing: false,
    trendlines: [],
    startDrawing: () => {},
    cancelDrawing: () => {},
    clearAll: () => {},
    undo: () => {},
  };

  const FEE_RATE = 0.0015; // 0.15%
  const TAX_RATE = 0.001; // 0.1% chỉ bán

  function getLastPrice(symbol: string) {
    // ✅ FIX: prefer per-symbol cache
    const p = lastPriceBySymbolRef.current[symbol];
    if (Number.isFinite(p) && p > 0) return p;

    // fallback: if currently viewing this symbol, use OHLC close
    if (symbol === selectedSymbol && ohlcData?.close != null) return Number(ohlcData.close);

    // last fallback
    return Number(lastPriceRef.current || 0);
  }

  function markToMarketAll() {
    // Unrealized = sum( (lastPrice - lotPrice) * lotQty )
    let u = 0;
    for (const [sym, lots] of lotsRef.current.entries()) {
      const p = getLastPrice(sym);
      if (!Number.isFinite(p) || p <= 0) continue;
      for (const lot of lots) {
        u += (p - lot.price) * lot.qty;
      }
    }
    setUnrealizedPnl(u);
    
    console.log('[P&L] markToMarketAll:', { 
      lots: Array.from(lotsRef.current.entries()),
      unrealized: u
    });

    // Equity = cash + market value
    let mv = 0;
    for (const [sym, lots] of lotsRef.current.entries()) {
      const p = getLastPrice(sym);
      if (!Number.isFinite(p) || p <= 0) continue;
      for (const lot of lots) mv += p * lot.qty;
    }
    const cash = Number(userBalance?.balance?.availableBalance ?? 0);
    setEquity(cash + mv);
  }

  // ✅ Bid / Ask chỉ tính từ close của chart (ohlcData.close)
  // ✅ FIX: update per-symbol last price + mark-to-market when price changes
  useEffect(() => {
    if (!ohlcData?.close) return;

    const closePrice = Number(ohlcData.close);
    lastPriceRef.current = closePrice;

    console.log('[PRICE] Updating last price:', { 
      symbol: selectedSymbol, 
      closePrice,
      previous: lastPriceBySymbolRef.current[selectedSymbol]
    });

    // ✅ store last price for this symbol
    lastPriceBySymbolRef.current[selectedSymbol] = closePrice;

    const bidPrice = closePrice - 100; // SELL
    const askPrice = closePrice + 100; // BUY

    setBestBidPrice(bidPrice);
    setBestAskPrice(askPrice);

    // ✅ IMPORTANT: update unrealized in realtime
    markToMarketAll();
  }, [ohlcData?.close, selectedSymbol]);

  function applyFillFIFO(params: {
    symbol: string;
    side: "buy" | "sell";
    qty: number;
    price: number;
  }) {
    const { symbol, side, qty, price } = params;
    if (!Number.isFinite(price) || price <= 0 || qty <= 0) return;

    const lots = lotsRef.current.get(symbol) ?? [];
    
    console.log('[P&L] applyFillFIFO input:', { symbol, side, qty, price });

    if (side === "buy") {
      // ✅ Add fee into cost basis
      const effectiveBuyPrice = price * (1 + FEE_RATE);
      lots.push({ qty, price: effectiveBuyPrice });
      lotsRef.current.set(symbol, lots);
      console.log('[P&L] Added buy lot:', { symbol, qty, price: effectiveBuyPrice, lots: [...lots] });
      return;
    }

    // ✅ SELL FIFO: realized = (sellNet - costBasis) for executed qty
    let remaining = qty;
    let cost = 0;
    let executed = 0;

    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const used = Math.min(remaining, lot.qty);

      cost += used * lot.price;
      executed += used;

      lot.qty -= used;
      remaining -= used;

      if (lot.qty === 0) lots.shift();
    }

    lotsRef.current.set(symbol, lots);

    if (executed <= 0) return;

    const grossProceeds = executed * price;
    const sellFee = grossProceeds * FEE_RATE;
    const sellTax = grossProceeds * TAX_RATE;
    const netProceeds = grossProceeds - sellFee - sellTax;

    const realized = netProceeds - cost;
    setRealizedPnl((prev) => {
      const newRealized = prev + realized;
      console.log('[P&L] Updated realized P&L:', { 
        prev, 
        realized, 
        newRealized,
        executed,
        cost,
        netProceeds
      });
      return newRealized;
    });
  }

  const isFinal = (s: string) =>
    ["FILLED", "REJECTED", "CANCELED"].includes(String(s).toUpperCase());

  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSelectedSymbol(newSymbol);
  }, []);

  const handleScreenshot = useCallback(async () => {
    console.log("Screenshot functionality not implemented yet");
  }, [selectedSymbol, timeframe]);

  const handleToolSelect = useCallback(
    (toolId: string) => {
      if (toolId === "trendline") {
        const newDrawingState = !enableTrendlineDrawing;
        setEnableTrendlineDrawing(newDrawingState);
        setEnableBrushDrawing(false);

        if (newDrawingState && drawing.startDrawing) {
          drawing.startDrawing();
        } else if (!newDrawingState && drawing.cancelDrawing) {
          drawing.cancelDrawing();
        }
      } else if (toolId === "brush") {
        const newBrushState = !enableBrushDrawing;
        setEnableBrushDrawing(newBrushState);
        setEnableTrendlineDrawing(false);
      } else {
        setEnableTrendlineDrawing(false);
        setEnableBrushDrawing(false);
      }

      setActiveTool(toolId as Parameters<typeof setActiveTool>[0]);
    },
    [enableTrendlineDrawing, enableBrushDrawing, drawing, setActiveTool]
  );

  const handleGroupToggle = useCallback((groupId: string) => {
    console.log("Group toggled:", groupId);
  }, []);

  const handleMenuOpen = useCallback(() => {
    console.log("Menu opened");
  }, []);

  const handleCloseOrderPanel = useCallback(() => {
    setShowOrderPanel(false);
  }, []);

  // Resize handling
  useEffect(() => {
    const isAnyDragging =
      layoutManager.chartAccountLayout.isDragging ||
      layoutManager.horizontalLayout.isDragging ||
      layoutManager.watchlistLayout.isDragging ||
      layoutManager.stockInfoLayout.isDragging;

    if (isAnyDragging) {
      triggerChartResize();
    } else {
      const timeout = setTimeout(() => {
        triggerChartResize();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [
    layoutManager.chartAccountLayout.split,
    layoutManager.horizontalLayout.split,
    layoutManager.watchlistLayout.split,
    layoutManager.stockInfoLayout.split,
    layoutManager.chartAccountLayout.isDragging,
    layoutManager.horizontalLayout.isDragging,
    layoutManager.watchlistLayout.isDragging,
    layoutManager.stockInfoLayout.isDragging,
    triggerChartResize,
  ]);

  // Auto height for order panel
  useEffect(() => {
    if (showOrderPanel && layoutManager.rightSectionRef.current) {
      const updateOrderPanelHeight = () => {
        if (hasManuallyResizedOrderPanel.current) return;

        const container = layoutManager.rightSectionRef.current;
        if (container) {
          const containerHeight = container.clientHeight;
          const availableHeight = containerHeight - 12 - 12 - 12 - 12;
          const estimatedOrderHeight = availableHeight * 0.75;
          layoutManager.handleOrderPanelResize(estimatedOrderHeight);
        }
      };

      updateOrderPanelHeight();

      const resizeObserver = new ResizeObserver(updateOrderPanelHeight);
      resizeObserver.observe(layoutManager.rightSectionRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [showOrderPanel, layoutManager]);

  useEffect(() => {
    if (!showOrderPanel) {
      hasManuallyResizedOrderPanel.current = false;
    }
  }, [showOrderPanel]);

  const handleOrderSubmit = useCallback(
    (side: "buy" | "sell", quantity: number, price: number) => {
      const orderQuantities = splitOrderForExchangeLimit(quantity);

      const webSocketService = WebSocketService.getInstance();
      const notificationService = NotificationService.getInstance();

      orderQuantities.forEach((orderQty, index) => {
        const orderSymbol = selectedSymbol;

        const order: Order = {
          id: `ORD${Date.now()}-${index}`,
          symbol: orderSymbol,
          type: side,
          orderType: "Market",
          quantity: orderQty,
          price,
          status: "NEW",
          timestamp: new Date(),
        };

        // 1) Add to UI first
        setOrders((prev) => [order, ...prev]);

        // 2) Subscribe BEFORE sending
        const unsubscribe = webSocketService.subscribe(order.id, (update) => {
          const upperStatus = String(update.status).toUpperCase();

          // --- Sync orderBookService ---
          orderBookService.updateOrder(update.orderId, {
            status: update.status,
            filledPrice: update.filledPrice,
            filledQuantity: update.filledQuantity,
          });

          // --- Sync React state ---
          setOrders((prev) =>
            prev.map((o) =>
              o.id === update.orderId
                ? {
                    ...o,
                    status: update.status,
                    filledPrice: update.filledPrice,
                    filledQuantity: update.filledQuantity,
                  }
                : o
            )
          );

          // Update position on FILLED
          if (upperStatus === "FILLED" && update.filledPrice != null) {
            const filledQty = update.filledQuantity ?? orderQty;

            const success =
              side === "buy"
                ? handleBuy(orderSymbol, filledQty, update.filledPrice)
                : handleSell(orderSymbol, filledQty, update.filledPrice);

            if (success) {
              notificationService.showSuccess(
                `Order ${update.orderId} filled successfully`
              );
              refreshUserData();
              setTimeout(() => refreshWatchlistPositions(), 1000);
            }
          }

          // ✅ Apply P&L only for NEW delta filled qty
          const normalizedStatus = String(update.status).toUpperCase();

          console.log('[WS] Order update received:', { 
            orderId: update.orderId, 
            status: normalizedStatus, 
            filledQuantity: update.filledQuantity, 
            filledPrice: update.filledPrice 
          });

          const totalFilled =
            update.filledQuantity != null
              ? Number(update.filledQuantity)
              : normalizedStatus === "FILLED"
              ? orderQty
              : 0;

          const prevApplied = appliedFilledQtyRef.current[update.orderId] ?? 0;
          const deltaQty = totalFilled - prevApplied;

          console.log('[WS] Quantity calculation:', { 
            totalFilled, 
            prevApplied, 
            deltaQty 
          });

          if (deltaQty > 0 && update.filledPrice != null) {
            appliedFilledQtyRef.current[update.orderId] = totalFilled;

            console.log('[WS] Applying fill FIFO:', { 
              symbol: orderSymbol, 
              side, 
              qty: deltaQty, 
              price: Number(update.filledPrice) 
            });

            applyFillFIFO({
              symbol: orderSymbol, // ✅ FIX
              side,
              qty: deltaQty,
              price: Number(update.filledPrice),
            });

            // ensure we have last price for this symbol (if currently selected, already updated by OHLC)
            // and recalc unrealized
            markToMarketAll();
          }

          // Final status → sync backend 1 lần + unsubscribe
          if (isFinal(upperStatus)) {
            try {
              const calledKey = `order_api_called_${order.id}`;
              if (!sessionStorage.getItem(calledKey)) {
                sessionStorage.setItem(calledKey, "true");

                let dbStatus: "filled" | "cancelled" | null = null;
                if (upperStatus === "FILLED") dbStatus = "filled";
                if (upperStatus === "REJECTED" || upperStatus === "CANCELED")
                  dbStatus = "cancelled";

                if (dbStatus) {
                  const payload: CreateOrderDto = {
                    stockSymbol: orderSymbol,
                    side,
                    quantity: orderQty,
                    orderType: "market",
                    price,
                    status: dbStatus,
                    filledQuantity: update.filledQuantity ?? undefined,
                    filledPrice: update.filledPrice ?? price,
                    commission: 0,
                    filledAt: new Date().toISOString(),
                  };

                  createOrder(payload)
                    .then(() => {
                      refreshUserData();
                      setTimeout(() => refreshWatchlistPositions(), 600);
                    })
                    .catch((err) => console.error("[OrderSync] Error:", err));
                }
              }
            } finally {
              unsubscribe?.();
            }
          }
        });

        // 3) Send order into the engine
        orderBookService.addOrder(order);

        notificationService.showSuccess(
          "Order submitted. Waiting for execution...",
          3000
        );
      });

      setShowOrderPanel(false);
    },
    [
      selectedSymbol,
      handleBuy,
      handleSell,
      refreshUserData,
      refreshWatchlistPositions,
    ]
  );

  const handleBuyClick = useCallback(() => {
    setOrderPanelSide("buy");
    setShowOrderPanel(true);
  }, []);

  const handleSellClick = useCallback(() => {
    setOrderPanelSide("sell");
    setShowOrderPanel(true);
  }, []);

  return (
    <div className="h-screen flex flex-col transition-colors duration-200 bg-[#131722]">
      <TopNavigation
        symbol={selectedSymbol}
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        isDarkMode={isDarkMode}
        onSymbolChange={handleSymbolChange}
        chartType={chartType}
        onChartTypeChange={setChartType}
        showRSI={showRSI}
        showMACD={showMACD}
        onToggleRSI={() => setShowRSI(!showRSI)}
        onToggleMACD={() => setShowMACD(!showMACD)}
        isPrivateMode={isPrivateMode}
        onTogglePrivateMode={() => setIsPrivateMode(!isPrivateMode)}
      />

      <StockInfoBar
        symbol={selectedSymbol}
        ohlcData={ohlcData}
        isDarkMode={isDarkMode}
      />

      <div className="flex-1 flex relative overflow-hidden">
        <LeftSidebar
          onToolSelect={handleToolSelect}
          onGroupToggle={handleGroupToggle}
          onMenuOpen={handleMenuOpen}
        />

        <div
          ref={layoutManager.mainContainerRef}
          className="flex-1 flex gap-2 p-2"
        >
          <div
            ref={layoutManager.leftColumnRef}
            className="grid gap-2 transition-none relative"
            style={{
              width: `${layoutManager.horizontalLayout.split}%`,
              gridTemplateRows: `${layoutManager.chartAccountLayout.split}fr 12px ${
                100 - layoutManager.chartAccountLayout.split
              }fr`,
            }}
          >
            <ChartSection
              containerRef={containerRef}
              ohlcData={ohlcData}
              selectedSymbol={selectedSymbol}
              isDarkMode={isDarkMode}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onBuyClick={() => setShowOrderPanel(true)}
              onSellClick={() => {
                setOrderPanelSide("sell");
                setShowOrderPanel(true);
              }}
              currentPrice={ohlcData?.close || lastPriceRef.current}
              change={ohlcData?.change || 0}
              changePercent={ohlcData?.changePercent || 0}
              showRSI={showRSI}
              showMACD={showMACD}
              onToggleRSI={() => setShowRSI(!showRSI)}
              onToggleMACD={() => setShowMACD(!showMACD)}
              isDragging={layoutManager.chartAccountLayout.isDragging}
              currentVolume={currentVolume}
              dayRange={{
                low: ohlcData?.low || lastPriceRef.current * 0.99,
                high: ohlcData?.high || lastPriceRef.current * 1.01,
              }}
              fiftyTwoWeekRange={{
                low: selectedSymbol.includes(".VN")
                  ? lastPriceRef.current * 0.8
                  : lastPriceRef.current * 0.7,
                high: selectedSymbol.includes(".VN")
                  ? lastPriceRef.current * 1.2
                  : lastPriceRef.current * 1.3,
              }}
              isPrivateMode={isPrivateMode}
              bestBidPrice={bestBidPrice}
              bestAskPrice={bestAskPrice}
            />

            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.chartAccountLayout.isDragging}
              onMouseDown={(e) =>
                layoutManager.chartAccountLayout.handleMouseDown(e, true)
              }
              title={
                layoutManager.isAccountCollapsed
                  ? "Account Manager is collapsed"
                  : "Drag up/down to resize chart and account manager heights"
              }
              splitPercentage={layoutManager.chartAccountLayout.split}
              isDisabled={layoutManager.isAccountCollapsed}
              isDarkMode={isDarkMode}
            />

            {isPrivateMode ? (
              <div
                className="border rounded overflow-hidden relative flex flex-col transition-colors duration-200"
                style={{
                  willChange: layoutManager.chartAccountLayout.isDragging
                    ? "height"
                    : "auto",
                  transform: "translateZ(0)",
                  height: "100%",
                }}
              >
                <div className="flex-none flex items-center justify-between px-4 py-3 border-b select-none">
                  <div className="flex items-center gap-2 text-sm opacity-80">
                    <span className="font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                      BACKTEST MODE
                    </span>
                    <span className="text-gray-500">•</span>
                    <span>{selectedSymbol}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const event = new CustomEvent(
                          "toggleStrategyTesterFullscreen"
                        );
                        window.dispatchEvent(event);
                      }}
                      className="p-1.5 rounded hover:bg-gray-700/50"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <StrategyTester
                    isDarkMode={isDarkMode}
                    tradingPosition={tradingPosition}
                    selectedSymbol={selectedSymbol}
                    marketSimulation={marketSimulationRef.current}
                  />
                </div>
              </div>
            ) : (
              <AccountManagerSection
                tradingPosition={tradingPosition}
                isDarkMode={isDarkMode}
                isDragging={layoutManager.chartAccountLayout.isDragging}
                isAccountCollapsed={layoutManager.isAccountCollapsed}
                isAccountMaximized={layoutManager.isAccountMaximized}
                chartAccountSplit={layoutManager.chartAccountLayout.split}
                onCollapsePanel={layoutManager.handleCollapsePanel}
                onOpenPanel={layoutManager.handleOpenPanel}
                onMaximizePanel={layoutManager.handleMaximizePanel}
                onRestorePanel={layoutManager.handleRestorePanel}
                orders={orders}
                marketSimulation={marketSimulationRef.current}
                selectedSymbol={selectedSymbol}
                onOpenOrderPanel={(side, price) => {
                  setShowOrderPanel(true);
                  setOrderPanelSide(side);
                }}
                userBalance={userBalance?.balance?.availableBalance}
                userName={
                  userDetail?.first_name
                    ? `${userDetail.first_name} ${userDetail.last_name}`
                    : userDetail?.email?.split("@")[0] || "User"
                }
                realizedPnl={realizedPnl}
                unrealizedPnl={unrealizedPnl}
              />
            )}
          </div>

          <ResizableDivider
            isVertical={false}
            isDragging={layoutManager.horizontalLayout.isDragging}
            onMouseDown={(e) =>
              layoutManager.horizontalLayout.handleMouseDown(e, false)
            }
            onDoubleClick={layoutManager.horizontalLayout.resetSplit}
            title="Drag left/right to resize sections | Double-click to reset"
            splitPercentage={layoutManager.horizontalLayout.split}
            isDarkMode={isDarkMode}
          />

          <div
            ref={layoutManager.rightSectionRef}
            className="grid gap-2 transition-none"
            style={{
              width: `${100 - layoutManager.horizontalLayout.split}%`,
              gridTemplateRows: showOrderPanel
                ? `${Math.max(
                    15,
                    layoutManager.watchlistLayout.split
                  )}fr 12px ${layoutManager.orderPanelHeight}px 12px ${Math.max(
                    20,
                    layoutManager.stockInfoLayout.split
                  )}fr 12px ${Math.max(
                    20,
                    100 -
                      layoutManager.watchlistLayout.split -
                      layoutManager.stockInfoLayout.split
                  )}fr`
                : `${Math.max(
                    20,
                    layoutManager.watchlistLayout.split
                  )}fr 12px ${Math.max(
                    25,
                    layoutManager.stockInfoLayout.split
                  )}fr 12px ${Math.max(
                    25,
                    100 -
                      layoutManager.watchlistLayout.split -
                      layoutManager.stockInfoLayout.split
                  )}fr`,
            }}
          >
            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <WatchlistSection
                selectedSymbol={selectedSymbol}
                onSymbolSelect={handleSymbolChange}
                isDarkMode={isDarkMode}
                positions={positions}
                isPrivateMode={isPrivateMode}
                marketSimulation={marketSimulationRef.current || undefined}
              />
            </div>

            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.watchlistLayout.isDragging}
              onMouseDown={(e: React.MouseEvent) =>
                layoutManager.watchlistLayout.handleMouseDown(e, true)
              }
              title="Drag up/down to resize watchlist and other sections"
              splitPercentage={layoutManager.watchlistLayout.split}
              isDarkMode={isDarkMode}
            />

            {showOrderPanel && (
              <>
                <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
                  <OrderPanel
                    symbol={selectedSymbol}
                    currentPrice={ohlcData?.close || lastPriceRef.current}
                    onClose={handleCloseOrderPanel}
                    onBuy={(quantity: number, price: number) =>
                      handleOrderSubmit("buy", quantity, price)
                    }
                    onSell={(quantity: number, price: number) =>
                      handleOrderSubmit("sell", quantity, price)
                    }
                    isDarkMode={isDarkMode}
                    side={orderPanelSide}
                    onSideChange={setOrderPanelSide}
                  />
                </div>

                <ResizableDivider
                  isVertical={true}
                  isDragging={isOrderPanelDragging}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();

                    setIsOrderPanelDragging(true);

                    const startY = e.clientY;
                    const startHeight = layoutManager.orderPanelHeight;
                    const container = layoutManager.rightSectionRef.current;

                    if (!container) {
                      setIsOrderPanelDragging(false);
                      return;
                    }

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      moveEvent.preventDefault();

                      hasManuallyResizedOrderPanel.current = true;

                      const containerRect = container.getBoundingClientRect();
                      const containerHeight = containerRect.height;
                      const reservedSpace = containerHeight * 0.3;
                      const maxHeight = containerHeight - reservedSpace;

                      const deltaY = moveEvent.clientY - startY;
                      const newHeight = Math.max(
                        150,
                        Math.min(maxHeight, startHeight - deltaY)
                      );
                      layoutManager.handleOrderPanelResize(newHeight);
                    };

                    const handleMouseUp = () => {
                      setIsOrderPanelDragging(false);
                      document.removeEventListener("mousemove", handleMouseMove);
                      document.removeEventListener("mouseup", handleMouseUp);
                      document.body.style.cursor = "";
                      document.body.style.userSelect = "";
                    };

                    document.body.style.cursor = "row-resize";
                    document.body.style.userSelect = "none";
                    document.addEventListener("mousemove", handleMouseMove);
                    document.addEventListener("mouseup", handleMouseUp);
                  }}
                  title="Drag to resize order panel"
                  splitPercentage={0}
                  isDarkMode={isDarkMode}
                />
              </>
            )}

            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <StockInfoSection selectedSymbol={selectedSymbol} isDarkMode={isDarkMode} />
            </div>

            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.stockInfoLayout.isDragging}
              onMouseDown={(e: React.MouseEvent) =>
                layoutManager.stockInfoLayout.handleMouseDown(e, true)
              }
              title="Drag up/down to resize stock info and news"
              splitPercentage={layoutManager.stockInfoLayout.split}
              isDarkMode={isDarkMode}
            />

            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <NewsSection isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
