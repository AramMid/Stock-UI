"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Timeframe } from "@/lib/types";
import { useChart } from "@/lib/hooks/useChart";
import { useTradingPosition } from "@/lib/hooks/useTradingPosition";
import { useTheme } from "@/contexts/ThemeContext";
import { DrawingProvider, useDrawing } from "@/contexts/DrawingContext";
import { useLayoutManager } from "@/lib/hooks/useLayoutManager";
import { useChartResize } from "@/lib/hooks/useChartResize";
import { Order } from "@/lib/order-management";
import { orderBookService } from "@/lib/services/orderBookService";
import { WebSocketService } from "@/lib/services/webSocketService";
import { NotificationService } from "@/lib/services/notificationService";
import {
  SimulatedMarketData,
} from "@/lib/services/marketSimulationService";


import TopNavigation from "@/components/trading/TopNavigation";
import StockInfoBar from "@/components/trading/StockInfoBar";
import LeftSidebar from "@/components/trading/LeftSidebar";
import ChartSection from "@/components/trading/ChartSection";
import AccountManagerSection from "@/components/trading/AccountManagerSection";
import WatchlistSection from "@/components/trading/WatchlistSection";
import StockInfoSection from "@/components/trading/StockInfoSection";
import NewsSection from "@/components/trading/NewsSection";
import ResizableDivider from "@/components/trading/ResizableDivider";
import OrderPanel from "@/components/trading/OrderPanel";
import { useMarketSimulation } from "@/lib/hooks/useMarketSimulation";

// Singleton services (không redeclare trong hàm)
const notificationService = NotificationService.getInstance();
const webSocketService = WebSocketService.getInstance();

interface TradingPageProps {
  symbol?: string;
}

export default function TradingPlatformWrapper(props: TradingPageProps) {
  return (
    <DrawingProvider>
      <TradingPlatform {...props} />
    </DrawingProvider>
  );
}

function TradingPlatform({ symbol = "VIC.VN" }: TradingPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [chartType, setChartType] = useState<
    "candlestick" | "line" | "area"
  >("candlestick");
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [enableTrendlineDrawing, setEnableTrendlineDrawing] =
    useState(false);
  const [enableBrushDrawing, setEnableBrushDrawing] =
    useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [isOrderPanelDragging, setIsOrderPanelDragging] =
    useState(false);
  const hasManuallyResizedOrderPanel = useRef(false);
  const [orderPanelSide, setOrderPanelSide] = useState<"buy" | "sell">(
    "buy"
  );
  const [orders, setOrders] = useState<Order[]>([]);

  const lastCloseRef = useRef<number | null>(null);

  const { theme } = useTheme();
  const {
    tradingPosition,
    handleBuy,
    handleSell,
    updateLastPrice,
    getAllPositions,
  } = useTradingPosition();
  const { activeTool, setActiveTool } = useDrawing();
  const { triggerChartResize } = useChartResize(containerRef);
  const layoutManager = useLayoutManager();

  const positionsMap = new Map<string, number>();
  getAllPositions().forEach((position) => {
    positionsMap.set(position.symbol, position.position);
  });

  const isDarkMode = true;

  // 🧠 MARKET DATA từ backend (FastAPI)
  const {
    data: marketData,
  }: { data: SimulatedMarketData | null } = useMarketSimulation({
    symbol: selectedSymbol,
    intervalMs: 1000,
    autoStart: true,
  });

  // Cập nhật OHLC/Volume mỗi khi nhận marketData mới
  useEffect(() => {
    if (!marketData) return;

    const prevClose =
      lastCloseRef.current ?? marketData.price;

    const newOhlc = {
      open: prevClose,
      high: Math.max(prevClose, marketData.price),
      low: Math.min(prevClose, marketData.price),
      close: marketData.price,
      change: marketData.price - prevClose,
      changePercent:
        ((marketData.price - prevClose) / prevClose) * 100,
    };

    setOhlcData(newOhlc);
    setCurrentVolume(marketData.volume);
    updateLastPrice(selectedSymbol, marketData.price);
    lastCloseRef.current = marketData.price;
  }, [marketData, selectedSymbol, updateLastPrice]);

  // Chart price callback
  const handlePriceUpdate = useCallback(
    (price: number) => {
      updateLastPrice(selectedSymbol, price);
    },
    [selectedSymbol, updateLastPrice]
  );

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

  // Resize logic
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

  // auto height for order panel
  useEffect(() => {
    if (showOrderPanel && layoutManager.rightSectionRef.current) {
      const updateOrderPanelHeight = () => {
        if (hasManuallyResizedOrderPanel.current) return;

        const container = layoutManager.rightSectionRef.current;
        if (!container) return;

        const containerHeight = container.clientHeight;
        const availableHeight = containerHeight - 12 * 4;
        const estimated = availableHeight * 0.75;
        layoutManager.handleOrderPanelResize(estimated);
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

  // HANDLERS
  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setTimeframe(tf);
  }, []);

  const handleSymbolChange = useCallback((sym: string) => {
    setSelectedSymbol(sym);
  }, []);

  const handleScreenshot = useCallback(async () => {
    console.log("Screenshot not implemented");
  }, [selectedSymbol, timeframe]);

  const handleToolSelect = useCallback(
    (toolId: string) => {
      if (toolId === "trendline") {
        const newState = !enableTrendlineDrawing;
        setEnableTrendlineDrawing(newState);
        setEnableBrushDrawing(false);

        if (newState) {
          drawing.startDrawing();
        } else {
          drawing.cancelDrawing();
        }
      } else if (toolId === "brush") {
        const newState = !enableBrushDrawing;
        setEnableBrushDrawing(newState);
        setEnableTrendlineDrawing(false);
      } else {
        setEnableTrendlineDrawing(false);
        setEnableBrushDrawing(false);
      }

      setActiveTool(toolId as any);
    },
    [enableTrendlineDrawing, enableBrushDrawing, drawing, setActiveTool]
  );

  const handleGroupToggle = useCallback((groupId: string) => {
    console.log("Group toggled:", groupId);
  }, []);

  const handleMenuOpen = useCallback(() => {
    console.log("Menu opened");
  }, []);

  const handleSettingsOpen = useCallback(() => {
    console.log("Settings opened");
  }, []);

  const handleCloseOrderPanel = useCallback(() => {
    setShowOrderPanel(false);
  }, []);

  const handleOrderSubmit = useCallback(
    (side: "buy" | "sell", quantity: number, price: number) => {
      console.log(`Order submitted: ${side} ${quantity} @ ${price}`);

      const order: Order = {
        id: `ORD${Date.now()}`,
        symbol: selectedSymbol,
        type: side,
        orderType: "Market",
        quantity,
        price,
        status: "NEW",
        timestamp: new Date(),
      };

      orderBookService.addOrder(order);

      webSocketService.subscribe(order.id, (update) => {
        orderBookService.updateOrder(update.orderId, {
          status: update.status,
          filledPrice: update.filledPrice,
          filledQuantity: update.filledQuantity,
        });

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

        if (update.status === "FILLED" && update.filledPrice) {
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
          }
        }
      });

      if (marketData) {
        // Nếu muốn gửi order xuống backend mô phỏng:
        // marketSimulationService.processUserOrder(...)  // tuỳ bạn có dùng hay không
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

      setOrders((prev) => [updatedOrder, ...prev]);

      notificationService.showSuccess(
        `Order submitted. Bots will decide whether to match your order within 5 seconds.`,
        10000
      );

      setShowOrderPanel(false);
    },
    [handleBuy, handleSell, selectedSymbol, marketData]
  );

  const handleBuyClick = useCallback(() => {
    setOrderPanelSide("buy");
    setShowOrderPanel(true);
  }, []);

  const handleSellClick = useCallback(() => {
    setOrderPanelSide("sell");
    setShowOrderPanel(true);
  }, []);

  const fallbackPrice =
    ohlcData?.close ?? marketData?.price ?? 45200;

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
        onToggleRSI={() => setShowRSI((v) => !v)}
        onToggleMACD={() => setShowMACD((v) => !v)}
        isPrivateMode={isPrivateMode}
        onTogglePrivateMode={() =>
          setIsPrivateMode((v) => !v)
        }
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
          onSettingsOpen={handleSettingsOpen}
        />

        <div
          ref={layoutManager.mainContainerRef}
          className="flex-1 flex gap-2 p-2"
        >
          {/* LEFT COLUMN: CHART + ACCOUNT */}
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
              onTimeframeChange={handleTimeframeChange}
              onBuyClick={handleBuyClick}
              onSellClick={handleSellClick}
              currentPrice={fallbackPrice}
              change={ohlcData?.change || 0}
              changePercent={ohlcData?.changePercent || 0}
              showRSI={showRSI}
              showMACD={showMACD}
              onToggleRSI={() => setShowRSI((v) => !v)}
              onToggleMACD={() => setShowMACD((v) => !v)}
              isDragging={layoutManager.chartAccountLayout.isDragging}
              currentVolume={currentVolume}
              dayRange={{
                low: ohlcData?.low || fallbackPrice * 0.99,
                high: ohlcData?.high || fallbackPrice * 1.01,
              }}
              fiftyTwoWeekRange={{
                low: fallbackPrice * 0.8,
                high: fallbackPrice * 1.2,
              }}
            />

            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.chartAccountLayout.isDragging}
              onMouseDown={(e) =>
                layoutManager.chartAccountLayout.handleMouseDown(
                  e,
                  true
                )
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
              selectedSymbol={selectedSymbol}
              onOpenOrderPanel={(side, price) => {
                setShowOrderPanel(true);
                setOrderPanelSide(side);
              }}
              marketData={marketData ?? undefined}
            />
          </div>

          {/* MIDDLE DIVIDER */}
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

          {/* RIGHT COLUMN: WATCHLIST + ORDER PANEL + INFO + NEWS */}
          <div
            ref={layoutManager.rightSectionRef}
            className="grid gap-2 transition-none"
            style={{
              width: `${100 - layoutManager.horizontalLayout.split}%`,
              gridTemplateRows: showOrderPanel
                ? `1fr 12px ${layoutManager.orderPanelHeight}px 12px 1fr 12px 1fr`
                : `1fr 12px 1fr 12px 1fr`,
            }}
          >
            <WatchlistSection
              selectedSymbol={selectedSymbol}
              onSymbolSelect={handleSymbolChange}
              isDarkMode={isDarkMode}
              positions={positionsMap}
            />

            {showOrderPanel && (
              <>
                <ResizableDivider
                  isVertical={true}
                  isDragging={isOrderPanelDragging}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    setIsOrderPanelDragging(true);

                    const startY = e.clientY;
                    const startHeight =
                      layoutManager.orderPanelHeight;
                    const container =
                      layoutManager.rightSectionRef.current;

                    if (!container) {
                      setIsOrderPanelDragging(false);
                      return;
                    }

                    const handleMouseMove = (
                      moveEvent: MouseEvent
                    ) => {
                      moveEvent.preventDefault();
                      if (!container) return;

                      hasManuallyResizedOrderPanel.current = true;

                      const rect = container.getBoundingClientRect();
                      const containerHeight = rect.height;
                      const reservedSpace = containerHeight * 0.4;
                      const maxHeight =
                        containerHeight - reservedSpace;

                      const deltaY = moveEvent.clientY - startY;
                      const newHeight = Math.max(
                        100,
                        Math.min(maxHeight, startHeight - deltaY)
                      );
                      layoutManager.handleOrderPanelResize(
                        newHeight
                      );
                    };

                    const handleMouseUp = () => {
                      setIsOrderPanelDragging(false);
                      document.removeEventListener(
                        "mousemove",
                        handleMouseMove
                      );
                      document.removeEventListener(
                        "mouseup",
                        handleMouseUp
                      );
                      document.body.style.cursor = "";
                      document.body.style.userSelect = "";
                    };

                    document.body.style.cursor = "row-resize";
                    document.body.style.userSelect = "none";

                    document.addEventListener("mousemove", handleMouseMove, {
                      passive: false,
                    });
                    document.addEventListener("mouseup", handleMouseUp);
                  }}
                  title="Drag to resize order panel"
                  splitPercentage={75}
                  isDarkMode={isDarkMode}
                />

                <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
                  <OrderPanel
                    symbol={selectedSymbol}
                    currentPrice={fallbackPrice}
                    onClose={handleCloseOrderPanel}
                    onBuy={(qty, price) =>
                      handleOrderSubmit("buy", qty, price)
                    }
                    onSell={(qty, price) =>
                      handleOrderSubmit("sell", qty, price)
                    }
                    isDarkMode={isDarkMode}
                    side={orderPanelSide}
                    onSideChange={setOrderPanelSide}
                  />
                </div>
              </>
            )}

            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.stockInfoLayout.isDragging}
              onMouseDown={(e) =>
                layoutManager.stockInfoLayout.handleMouseDown(e, true)
              }
              title="Drag up/down to resize stock info and news sections"
              splitPercentage={
                layoutManager.stockInfoLayout.split +
                layoutManager.watchlistLayout.split
              }
              isDarkMode={isDarkMode}
            />

            <StockInfoSection
              selectedSymbol={selectedSymbol}
              isDarkMode={isDarkMode}
              currentVolume={currentVolume}
            />

            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.stockInfoLayout.isDragging}
              onMouseDown={(e) =>
                layoutManager.stockInfoLayout.handleMouseDown(e, true)
              }
              title="Drag up/down to resize stock info and news sections"
              splitPercentage={
                layoutManager.stockInfoLayout.split +
                layoutManager.watchlistLayout.split
              }
              isDarkMode={isDarkMode}
            />

            <NewsSection isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
