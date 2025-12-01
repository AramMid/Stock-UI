// File: app/trading/page.tsx - DEBUG VERSION
"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { Timeframe } from "@/lib/types";
import { useChart } from "@/lib/hooks/useChart";
import { useTradingPosition } from "@/lib/hooks/useTradingPosition";
import { useTheme } from "@/contexts/ThemeContext";
import { DrawingProvider, useDrawing } from "@/contexts/DrawingContext";
import { useLayoutManager } from "@/lib/hooks/useLayoutManager";
import { useChartResize } from "@/lib/hooks/useChartResize";
import { Order } from "../../lib/order-management";
import { MarketSimulationService, SimulatedMarketData } from "@/lib/services/marketSimulationService";
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
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick");
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [enableTrendlineDrawing, setEnableTrendlineDrawing] = useState(false); // Separate state for trendline
  const [enableBrushDrawing, setEnableBrushDrawing] = useState(false); // Separate state for brush
  const [showOrderPanel, setShowOrderPanel] = useState(false); // State for order panel
  const [isOrderPanelDragging, setIsOrderPanelDragging] = useState(false); // State for order panel resize dragging
  const hasManuallyResizedOrderPanel = useRef(false); // Track if user has manually resized order panel
  const [orderPanelSide, setOrderPanelSide] = useState<"buy" | "sell">("buy"); // Track which side to show in order panel
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);

  // Market simulation
  const marketSimulationRef = useRef<MarketSimulationService | null>(null);
  const lastPriceRef = useRef<number>(45200); // Initial price

  // Custom hooks
  const { theme } = useTheme();
  const { tradingPosition, handleBuy, handleSell, updateLastPrice } = useTradingPosition();
  const { activeTool, setActiveTool } = useDrawing();
  const { triggerChartResize } = useChartResize(containerRef);
  const layoutManager = useLayoutManager();

  const isDarkMode = true;

  // Initialize market simulation service
  useEffect(() => {
    marketSimulationRef.current = new MarketSimulationService();
    
    // Start simulation
    marketSimulationRef.current.startSimulation((data: SimulatedMarketData) => {
      // Update price data
      const newOhlc = {
        open: lastPriceRef.current,
        high: Math.max(lastPriceRef.current, data.price),
        low: Math.min(lastPriceRef.current, data.price),
        close: data.price,
        change: data.price - lastPriceRef.current,
        changePercent: ((data.price - lastPriceRef.current) / lastPriceRef.current) * 100,
      };
      
      setOhlcData(newOhlc);
      setCurrentVolume(data.volume);
      updateLastPrice(data.price);
      lastPriceRef.current = data.price;
    });

    // Cleanup on unmount
    return () => {
      if (marketSimulationRef.current) {
        marketSimulationRef.current.stopSimulation();
      }
    };
  }, [updateLastPrice]);

  // DEBUG: Log to see if useChart is being called
  console.log("🔍 TradingPlatform render - enableTrendlineDrawing:", enableTrendlineDrawing);
  console.log("🔍 TradingPlatform render - enableBrushDrawing:", enableBrushDrawing);
  console.log("🔍 containerRef.current:", containerRef.current);

  // Chart management with drawing
  const chartResult = useChart({
    containerRef,
    symbol: selectedSymbol,
    timeframe,
    onPriceUpdate: updateLastPrice,
    onOHLCUpdate: setOhlcData,
    onVolumeUpdate: setCurrentVolume,
    isDarkMode,
    showRSI,
    showMACD,
    chartType,
    isPrivateMode,
    enableTrendlineDrawing: enableTrendlineDrawing,
    enableBrushDrawing: enableBrushDrawing,
    activeTool: activeTool,
    onDrawingComplete: () => {
      // Khi hoàn thành vẽ, đặt lại công cụ đang hoạt động về chế độ chọn và tắt enableDrawing
      setActiveTool("selection");
      setEnableTrendlineDrawing(false);
    },
  });

  // DEBUG: Check what useChart returns
  console.log("🔍 chartResult:", chartResult);
  console.log("🔍 chartResult.drawing:", chartResult?.drawing);

  // Safe access to drawing object
  const drawing = chartResult?.drawing || {
    isEnabled: false,
    isDrawing: false,
    trendlines: [],
    startDrawing: () => { },
    cancelDrawing: () => { },
    clearAll: () => { },
    undo: () => { },
  };

  // Effect to handle split changes
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

  // Effect to update order panel height when panel first appears or container resizes (only if not manually resized)
  useEffect(() => {
    if (showOrderPanel && layoutManager.rightSectionRef.current) {
      const updateOrderPanelHeight = () => {
        // Don't auto-update if user has manually resized
        if (hasManuallyResizedOrderPanel.current) return;
        
        const container = layoutManager.rightSectionRef.current;
        if (container) {
          // Calculate 3/4 of available height for order panel
          const containerHeight = container.clientHeight;
          // Estimate the available height for the order panel
          // (container height - dividers - other sections)
          const availableHeight = containerHeight - 12 - 12 - 12 - 12; // 4 dividers of 12px each
          const estimatedOrderHeight = availableHeight * 0.75; // 3/4 of available height
          layoutManager.handleOrderPanelResize(estimatedOrderHeight);
        }
      };
      
      // Set initial height when panel first appears
      updateOrderPanelHeight();
      
      // Add resize observer for container resize
      const resizeObserver = new ResizeObserver(updateOrderPanelHeight);
      if (layoutManager.rightSectionRef.current) {
        resizeObserver.observe(layoutManager.rightSectionRef.current);
      }
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [showOrderPanel, layoutManager]);
  
  // Reset manual resize flag when panel is closed
  useEffect(() => {
    if (!showOrderPanel) {
      hasManuallyResizedOrderPanel.current = false;
    }
  }, [showOrderPanel]);

  // Event handlers
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSelectedSymbol(newSymbol);
  }, []);

  const handleScreenshot = useCallback(async () => {
    try {
      console.log("Screenshot functionality not implemented yet");
    } catch (error) {
      console.error("Screenshot error:", error);
    }
  }, [selectedSymbol, timeframe]);

  const handleToolSelect = useCallback((toolId: string) => {
    console.log("Selected tool:", toolId);

    if (toolId === 'trendline') {
      const newDrawingState = !enableTrendlineDrawing;
      console.log("🎨 Toggling trendline drawing mode:", newDrawingState);
      setEnableTrendlineDrawing(newDrawingState);
      setEnableBrushDrawing(false); // Disable brush when enabling trendline

      if (newDrawingState && drawing.startDrawing) {
        drawing.startDrawing();
      } else if (!newDrawingState && drawing.cancelDrawing) {
        drawing.cancelDrawing();
      }
    }
    
    // Handle brush tool
    else if (toolId === 'brush') {
      const newBrushState = !enableBrushDrawing;
      console.log("🎨 Toggling brush drawing mode:", newBrushState);
      setEnableBrushDrawing(newBrushState);
      setEnableTrendlineDrawing(false); // Disable trendline when enabling brush
    }
    
    // For all other tools, disable both drawing modes
    else {
      setEnableTrendlineDrawing(false);
      setEnableBrushDrawing(false);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setActiveTool(toolId as any);
  }, [enableTrendlineDrawing, enableBrushDrawing, drawing, setActiveTool]);

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

  const handleOrderSubmit = useCallback((side: 'buy' | 'sell', quantity: number, price: number) => {
    console.log(`Order submitted: ${side} ${quantity} shares at ${price}`);
    
    // Create order object
    const order: Order = {
      id: `ORD${Date.now()}`,
      symbol: selectedSymbol,
      type: side,
      orderType: "Market", // Default to market order for immediate execution
      quantity: quantity,
      price: price,
      status: "NEW", // Only NEW or FILLED states
      timestamp: new Date()
    };
    
    // Process order against simulated market
    let executionResult: { success: boolean; filledPrice?: number; filledQuantity?: number } = { success: false };
    if (marketSimulationRef.current) {
      executionResult = marketSimulationRef.current.processUserOrder(order);
    }
    
    // Execute the trade if order was filled
    let success = false;
    if (executionResult.success && executionResult.filledPrice) {
      if (side === 'buy') {
        success = handleBuy(quantity, executionResult.filledPrice);
      } else {
        success = handleSell(quantity, executionResult.filledPrice);
      }
    }
    
    // Update order status - only Pending or Filled states
    const updatedOrder: Order = {
      ...order,
      orderType: "Market",
      status: executionResult.success ? "FILLED" : "NEW", // Only these two states
      filledPrice: executionResult.filledPrice,
      filledQuantity: executionResult.filledQuantity
    };
    
    // Add order to state
    setOrders(prevOrders => [updatedOrder, ...prevOrders]);
    
    setShowOrderPanel(false);
  }, [handleBuy, handleSell, selectedSymbol, tradingPosition]);

  const handleBuyClick = useCallback(() => {
    setOrderPanelSide("buy");
    setShowOrderPanel(true);
  }, []);

  const handleSellClick = useCallback(() => {
    setOrderPanelSide("sell");
    setShowOrderPanel(true);
  }, []);

  return (
    <div
      className={`h-screen flex flex-col transition-colors duration-200 bg-[#131722]`}
    >
      {/* DEBUG INFO */}
      <div className="fixed top-20 right-4 z-50 bg-red-900 text-white p-2 text-xs rounded">
        <div>Chart Container: {containerRef.current ? '✅' : '❌'}</div>
        <div>Trendline Drawing: {enableTrendlineDrawing ? '✅' : '❌'}</div>
        <div>Brush Drawing: {enableBrushDrawing ? '✅' : '❌'}</div>
        <div>Drawing Object: {drawing ? '✅' : '❌'}</div>
        <div>Trendlines: {drawing.trendlines?.length || 0}</div>
      </div>

      {/* Top Navigation Bar */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          onToolSelect={handleToolSelect}
          onGroupToggle={handleGroupToggle}
          onMenuOpen={handleMenuOpen}
          onSettingsOpen={handleSettingsOpen}
        />

        {/* Main Grid Area */}
        <div ref={layoutManager.mainContainerRef} className="flex-1 flex gap-2 p-2">
          {/* Left Section - Chart and Account Manager */}
          <div
            ref={layoutManager.leftColumnRef}
            className="grid gap-2 transition-none relative"
            style={{
              width: `${layoutManager.horizontalLayout.split}%`,
              gridTemplateRows: `${layoutManager.chartAccountLayout.split}fr 12px ${100 - layoutManager.chartAccountLayout.split
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
              onTimeframeChange={handleTimeframeChange}
              onBuyClick={handleBuyClick}
              onSellClick={handleSellClick}
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
                low: selectedSymbol.includes(".VN") ? lastPriceRef.current * 0.8 : lastPriceRef.current * 0.7,
                high: selectedSymbol.includes(".VN") ? lastPriceRef.current * 1.2 : lastPriceRef.current * 1.3,
              }}
            />

            {/* Vertical Divider */}
            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.chartAccountLayout.isDragging}
              onMouseDown={(e) => layoutManager.chartAccountLayout.handleMouseDown(e, true)}
              title={
                layoutManager.isAccountCollapsed
                  ? "Account Manager is collapsed"
                  : "Drag up/down to resize chart and account manager heights"
              }
              splitPercentage={layoutManager.chartAccountLayout.split}
              isDisabled={layoutManager.isAccountCollapsed}
              isDarkMode={isDarkMode}
            />

            {/* Account Manager Section */}
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
              onOpenOrderPanel={(side, price) => {
                setShowOrderPanel(true);
                setOrderPanelSide(side);
                // In a real implementation, you might want to set a specific price
              }}
            />
          </div>

          {/* Horizontal Divider */}
          <ResizableDivider
            isVertical={false}
            isDragging={layoutManager.horizontalLayout.isDragging}
            onMouseDown={(e) => layoutManager.horizontalLayout.handleMouseDown(e, false)}
            onDoubleClick={layoutManager.horizontalLayout.resetSplit}
            title="Drag left/right to resize sections | Double-click to reset"
            splitPercentage={layoutManager.horizontalLayout.split}
            isDarkMode={isDarkMode}
          />

          {/* Right Section - Balanced layout with working resize */}
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
            {/* Watchlist Section */}
            <WatchlistSection
              selectedSymbol={selectedSymbol}
              onSymbolSelect={handleSymbolChange}
              isDarkMode={isDarkMode}
            />

            {/* Divider and Order Panel - Only shown when buy/sell is clicked */}
            {showOrderPanel && (
              <>
                <ResizableDivider
                  isVertical={true}
                  isDragging={isOrderPanelDragging}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    setIsOrderPanelDragging(true);
                    
                    // Get initial position and height
                    const startY = e.clientY;
                    const startHeight = layoutManager.orderPanelHeight;
                    const container = layoutManager.rightSectionRef.current;
                    
                    if (!container) {
                      setIsOrderPanelDragging(false);
                      return;
                    }
                      
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      moveEvent.preventDefault();
                      
                      if (!container) return;
                      
                      // Mark that user has manually resized
                      hasManuallyResizedOrderPanel.current = true;
                      
                      // Calculate available space for order panel
                      const containerRect = container.getBoundingClientRect();
                      const containerHeight = containerRect.height;
                      // Reserve space for other sections (watchlist, dividers, stock info, news)
                      // Each divider is 12px, and we need space for other sections
                      const reservedSpace = containerHeight * 0.4; // Reserve 40% for other sections
                      const maxHeight = containerHeight - reservedSpace;
                      
                      const deltaY = moveEvent.clientY - startY;
                      // Kéo xuống (deltaY dương) → thu nhỏ (giảm height)
                      // Kéo lên (deltaY âm) → phóng to (tăng height)
                      const newHeight = Math.max(100, Math.min(maxHeight, startHeight - deltaY));
                      layoutManager.handleOrderPanelResize(newHeight);
                    };
                      
                    const handleMouseUp = () => {
                      setIsOrderPanelDragging(false);
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                      document.body.style.cursor = '';
                      document.body.style.userSelect = '';
                    };
                      
                    // Set cursor and prevent text selection
                    document.body.style.cursor = 'row-resize';
                    document.body.style.userSelect = 'none';
                    
                    document.addEventListener('mousemove', handleMouseMove, { passive: false });
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  title="Drag to resize order panel"
                  splitPercentage={75}
                  isDarkMode={isDarkMode}
                />
                <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
                  <OrderPanel
                    symbol={selectedSymbol}
                    currentPrice={ohlcData?.close || lastPriceRef.current}
                    onClose={handleCloseOrderPanel}
                    onBuy={(quantity: number, price: number) => handleOrderSubmit('buy', quantity, price)}
                    onSell={(quantity: number, price: number) => handleOrderSubmit('sell', quantity, price)}
                    isDarkMode={isDarkMode}
                    side={orderPanelSide} // Pass the side that was clicked
                    onSideChange={setOrderPanelSide} // Handle side changes from within the panel
                  />
                </div>
              </>
            )}

            {/* Stock Info Divider */}
            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.stockInfoLayout.isDragging}
              onMouseDown={(e: React.MouseEvent) => layoutManager.stockInfoLayout.handleMouseDown(e, true)}
              title="Drag up/down to resize stock info and news sections"
              splitPercentage={layoutManager.stockInfoLayout.split + layoutManager.watchlistLayout.split}
              isDarkMode={isDarkMode}
            />

            {/* Stock Info Section */}
            <StockInfoSection
              selectedSymbol={selectedSymbol}
              isDarkMode={isDarkMode}
              currentVolume={currentVolume}
            />

            {/* Stock Info to News Divider */}
            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.stockInfoLayout.isDragging}
              onMouseDown={(e: React.MouseEvent) => layoutManager.stockInfoLayout.handleMouseDown(e, true)}
              title="Drag up/down to resize stock info and news sections"
              splitPercentage={layoutManager.stockInfoLayout.split + layoutManager.watchlistLayout.split}
              isDarkMode={isDarkMode}
            />

            {/* News Section */}
            <NewsSection isDarkMode={isDarkMode} />
          </div>

          {/* Remove any modal overlay for order panel */}
        </div>
      </div>
    </div>
  );
}
