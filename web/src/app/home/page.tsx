"use client";
import { useRef, useState, useCallback, useEffect } from "react";
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

  // Reactive positions map for watchlist
  const [positionsMap, setPositionsMap] = useState<Map<string, number>>(
    new Map()
  );
  const previousPositionsRef = useRef<{ symbol: string; position: number }[]>(
    []
  );

  // Update positions map when trading positions change
  useEffect(() => {
    const currentPositions = getAllPositions();
    const newPositionsMap = new Map<string, number>();

    currentPositions.forEach((position) => {
      newPositionsMap.set(position.symbol, position.position);
    });

    const previousPositions = previousPositionsRef.current;

    if (previousPositions.length !== currentPositions.length) {
      setPositionsMap(newPositionsMap);
      previousPositionsRef.current = currentPositions;
      return;
    }

    let hasChanged = false;
    for (let i = 0; i < currentPositions.length; i++) {
      const currentPos = currentPositions[i];
      const previousPos = previousPositions[i];

      if (
        currentPos.symbol !== previousPos.symbol ||
        currentPos.position !== previousPos.position
      ) {
        hasChanged = true;
        break;
      }
    }

    if (hasChanged) {
      setPositionsMap(newPositionsMap);
      previousPositionsRef.current = currentPositions;
    }
  }); // intentionally no deps → check on each render but only set when changed

  // ✅ MarketSimulation chỉ dùng cho bot, KHÔNG đụng tới ohlcData / bid/ask
  useEffect(() => {
    marketSimulationRef.current = new MarketSimulationService();

    marketSimulationRef.current.startSimulation(
      (data: SimulatedMarketData) => {
        if (data.symbol === selectedSymbol) {
          // chỉ update giá cho tradingPosition / bot
          updateLastPrice(data.symbol, data.price);
        }
      }
    );

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

    window.addEventListener(
      "toggleStrategyTesterFullscreen",
      handleToggleFullscreen
    );
    return () => {
      window.removeEventListener(
        "toggleStrategyTesterFullscreen",
        handleToggleFullscreen
      );
    };
  }, [layoutManager, isPrivateMode]);

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

  // ✅ Bid / Ask chỉ tính từ close của chart (ohlcData.close)
  useEffect(() => {
    if (!ohlcData?.close) return;

    const closePrice = ohlcData.close;
    lastPriceRef.current = closePrice;

    const bidPrice = closePrice - 100; // SELL
    const askPrice = closePrice + 100; // BUY

    setBestBidPrice(bidPrice);
    setBestAskPrice(askPrice);
  }, [ohlcData?.close]);

  const drawing = chartResult?.drawing || {
    isEnabled: false,
    isDrawing: false,
    trendlines: [],
    startDrawing: () => {},
    cancelDrawing: () => {},
    clearAll: () => {},
    undo: () => {},
  };

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
          const availableHeight =
            containerHeight - 12 - 12 - 12 - 12; // 4 dividers
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

  // Handlers
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
      console.log("Selected tool:", toolId);

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

  const handleOrderSubmit = useCallback(
    (side: "buy" | "sell", quantity: number, price: number) => {
      console.log(`Order submitted: ${side} ${quantity} shares at ${price}`);

      const orderQuantities = splitOrderForExchangeLimit(quantity);

      orderQuantities.forEach((orderQty, index) => {
        const order: Order = {
          id: `ORD${Date.now()}-${index}`,
          symbol: selectedSymbol,
          type: side,
          orderType: "Market",
          quantity: orderQty,
          price: price,
          status: "NEW",
          timestamp: new Date(),
        };

        orderBookService.addOrder(order);

        const webSocketService = WebSocketService.getInstance();
        const notificationService = NotificationService.getInstance();

        webSocketService.subscribe(order.id, (update) => {
          orderBookService.updateOrder(update.orderId, {
            status: update.status,
            filledPrice: update.filledPrice,
            filledQuantity: update.filledQuantity,
          });

          setOrders((prevOrders) =>
            prevOrders.map((o) =>
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

          let localStatus: OrderStatus | "pending" | "partial" = "pending";
          if (
            update.filledQuantity !== undefined &&
            update.filledQuantity === orderQty
          ) {
            localStatus = "FILLED";
          } else if (
            update.filledQuantity !== undefined &&
            update.filledQuantity > 0 &&
            update.filledQuantity < orderQty
          ) {
            localStatus = "partial";
          } else if (update.status === "CANCELED") {
            localStatus = "CANCELED";
          }

          if (localStatus === "FILLED" && update.filledPrice) {
            let success = false;
            if (side === "buy") {
              success = handleBuy(
                selectedSymbol,
                update.filledQuantity || quantity,
                update.filledPrice
              );
            } else {
              success = handleSell(
                selectedSymbol,
                update.filledQuantity || quantity,
                update.filledPrice
              );
            }

            if (success) {
              notificationService.showSuccess(
                `Order ${update.orderId} filled successfully!`
              );
              refreshUserData();
            }
          }

          if (
            update.status === "FILLED" ||
            update.status === "REJECTED" ||
            update.status === "CANCELED"
          ) {
            const hasCalledApi = sessionStorage.getItem(
              `order_api_called_${order.id}`
            );
            if (!hasCalledApi) {
              sessionStorage.setItem(`order_api_called_${order.id}`, "true");

              let dbStatus: string | null = null;
              if (update.status === "FILLED") dbStatus = "filled";
              else if (update.status === "CANCELED") dbStatus = "cancelled";
              else if (update.status === "REJECTED") dbStatus = "cancelled";

              if (dbStatus === null) {
                console.warn(
                  "Unexpected status received, not saving to database:",
                  update.status
                );
                return;
              }

              const payload: CreateOrderDto = {
                stockSymbol: selectedSymbol,
                side: side,
                quantity: orderQty,
                orderType: order.orderType?.toLowerCase() ?? "limit",
                price: price !== undefined ? price : undefined,
                status: dbStatus,
                filledQuantity: order.filledQuantity ?? undefined,
                filledPrice: order.filledPrice ?? price ?? undefined,
                commission: 0,
                filledAt:
                  (order as unknown as { filledAt?: Date }).filledAt
                    ?.toISOString?.() ??
                  order.timestamp?.toISOString?.() ??
                  new Date().toISOString(),
              };

              console.log(
                "[OrderSync] Sending payload to backend:",
                JSON.stringify(payload, null, 2)
              );

              createOrder(payload)
                .then((response) => {
                  console.log(
                    "Order saved to database with status:",
                    dbStatus,
                    response
                  );
                  refreshUserData();
                })
                .catch((error) => {
                  console.error("Error saving order to database:", error);
                  console.error(
                    "[OrderSync] Payload that caused error:",
                    JSON.stringify(payload, null, 2)
                  );
                });
            }
          }
        });

        if (marketSimulationRef.current) {
          marketSimulationRef.current.processUserOrder(order);
        }

        orderBookService.updateOrder(order.id, {
          status: "NEW",
        });

        const updatedOrder: Order = {
          ...order,
          orderType: "Market",
          status: "NEW",
          filledPrice: undefined,
          filledQuantity: undefined,
        };

        setTimeout(() => {
          orderBookService.updateOrder(order.id, {
            status: "PARTIALLY_FILLED",
          });

          setOrders((prevOrders) =>
            prevOrders.map((o) =>
              o.id === order.id ? { ...o, status: "PARTIALLY_FILLED" } : o
            )
          );
        }, 1000);

        setOrders((prevOrders) => [updatedOrder, ...prevOrders]);

        // FIX: Removed redeclaration 'const notificationService'.
        // It uses the instance declared at the top of the forEach loop.
        notificationService.showSuccess(
          `Order submitted. Waiting for status update from server.`,
          5000
        );
      });

      setShowOrderPanel(false);
    },
    [handleBuy, handleSell, selectedSymbol, tradingPosition]
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
      {/* Top Navigation */}
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

      {/* Stock Info Bar */}
      <StockInfoBar
        symbol={selectedSymbol}
        ohlcData={ohlcData}
        isDarkMode={isDarkMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          onToolSelect={handleToolSelect}
          onGroupToggle={handleGroupToggle}
          onMenuOpen={handleMenuOpen}
        />

        {/* Main Grid */}
        <div
          ref={layoutManager.mainContainerRef}
          className="flex-1 flex gap-2 p-2"
        >
          {/* Left Column: Chart + Account/Strategy */}
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
            {/* Chart Panel */}
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

            {/* Divider between chart and account/strategy */}
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

            {/* Account / Strategy section */}
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
              />
            )}
          </div>

          {/* Vertical divider between left & right sections */}
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

          {/* Right Column */}
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
            {/* Watchlist */}
            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <WatchlistSection
                selectedSymbol={selectedSymbol}
                onSymbolSelect={handleSymbolChange}
                isDarkMode={isDarkMode}
                positions={positionsMap}
                isPrivateMode={isPrivateMode}
                marketSimulation={marketSimulationRef.current || undefined}
              />
            </div>

            {/* Divider Watchlist / below */}
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

            {/* Order Panel (optional) */}
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
                      document.removeEventListener(
                        "mousemove",
                        handleMouseMove
                      );
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
                  splitPercentage={0} // Not used for fixed height panels usually, or irrelevant here
                  isDarkMode={isDarkMode}
                />
              </>
            )}

            {/* Stock Info Section */}
            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <StockInfoSection
                selectedSymbol={selectedSymbol}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Divider Stock Info / News */}
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

            {/* News Section */}
            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <NewsSection isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}