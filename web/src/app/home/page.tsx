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
import TopNavigation from "@/components/trading/TopNavigation";
import StockInfoBar from "@/components/trading/StockInfoBar";
import LeftSidebar from "@/components/trading/LeftSidebar";
import ChartSection from "@/components/trading/ChartSection";
import AccountManagerSection from "@/components/trading/AccountManagerSection";
import WatchlistSection from "@/components/trading/WatchlistSection";
import StockInfoSection from "@/components/trading/StockInfoSection";
import NewsSection from "@/components/trading/NewsSection";
import ResizableDivider from "@/components/trading/ResizableDivider";

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

  // Custom hooks
  const { theme } = useTheme();
  const { tradingPosition, handleBuy, handleSell, updateLastPrice } = useTradingPosition();
  const { activeTool, setActiveTool } = useDrawing();
  const { triggerChartResize } = useChartResize(containerRef);
  const layoutManager = useLayoutManager();

  const isDarkMode = true;

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

  // Event handlers
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSelectedSymbol(newSymbol);
  }, []);

  const handleBuyClick = useCallback(() => {
    handleBuy();
  }, [handleBuy]);

  const handleSellClick = useCallback(() => {
    handleSell();
  }, [handleSell]);

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
    if (toolId === 'brush') {
      const newBrushState = !enableBrushDrawing;
      console.log("🎨 Toggling brush drawing mode:", newBrushState);
      setEnableBrushDrawing(newBrushState);
      setEnableTrendlineDrawing(false); // Disable trendline when enabling brush
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
              currentPrice={ohlcData?.close || tradingPosition.lastPrice || 245.3}
              change={ohlcData?.change || 0}
              changePercent={ohlcData?.changePercent || 0}
              showRSI={showRSI}
              showMACD={showMACD}
              onToggleRSI={() => setShowRSI(!showRSI)}
              onToggleMACD={() => setShowMACD(!showMACD)}
              isDragging={layoutManager.chartAccountLayout.isDragging}
              currentVolume={currentVolume}
              dayRange={{
                low: ohlcData?.low || 240.21,
                high: ohlcData?.high || 246.3,
              }}
              fiftyTwoWeekRange={{
                low: selectedSymbol.includes(".VN") ? 180500 : 180.5,
                high: selectedSymbol.includes(".VN") ? 260800 : 260.8,
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

          {/* Right Section */}
          <div
            ref={layoutManager.rightSectionRef}
            className="grid gap-2 transition-none"
            style={{
              width: `${100 - layoutManager.horizontalLayout.split}%`,
              gridTemplateRows: `${layoutManager.watchlistLayout.split}fr 12px ${layoutManager.stockInfoLayout.split}fr 12px ${100 - layoutManager.watchlistLayout.split - layoutManager.stockInfoLayout.split
                }fr`,
            }}
          >
            {/* Watchlist Section */}
            <WatchlistSection
              selectedSymbol={selectedSymbol}
              onSymbolSelect={handleSymbolChange}
              isDarkMode={isDarkMode}
            />

            {/* Watchlist to Stock Info Divider */}
            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.watchlistLayout.isDragging}
              onMouseDown={(e) => layoutManager.watchlistLayout.handleMouseDown(e, true)}
              title="Drag up/down to resize watchlist and stock info sections"
              splitPercentage={layoutManager.watchlistLayout.split}
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
              onMouseDown={(e) => layoutManager.stockInfoLayout.handleMouseDown(e, true)}
              title="Drag up/down to resize stock info and news sections"
              splitPercentage={layoutManager.stockInfoLayout.split + layoutManager.watchlistLayout.split}
              isDarkMode={isDarkMode}
            />

            {/* News Section */}
            <NewsSection isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>
    </div>
  );
}