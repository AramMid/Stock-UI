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
import { OrderStatus } from "../../lib/services/orderService";
import { MarketSimulationService, SimulatedMarketData } from "@/lib/services/marketSimulationService";
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

// Import the new order API service
import { createOrder, CreateOrderDto, getOrders } from "@/lib/services/orderApiService";

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
  const { tradingPosition, handleBuy, handleSell, updateLastPrice, getAllPositions } = useTradingPosition();
  const { activeTool, setActiveTool } = useDrawing();
  const { triggerChartResize } = useChartResize(containerRef);
  const layoutManager = useLayoutManager();

  // Create positions map for watchlist
  const positionsMap = new Map<string, number>();
  getAllPositions().forEach(position => {
    positionsMap.set(position.symbol, position.position);
  });

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
      updateLastPrice(selectedSymbol, data.price);
      lastPriceRef.current = data.price;
    });

    // Cleanup on unmount
    return () => {
      if (marketSimulationRef.current) {
        marketSimulationRef.current.stopSimulation();
      }
    };
  }, [updateLastPrice]);

  // Handle Strategy Tester full-screen toggle
  useEffect(() => {
    const handleToggleFullscreen = () => {
      // Toggle between maximized and restored state
      if (isPrivateMode) {
        // For private mode, we'll implement a simple toggle of the chart/strategy tester split
        if (layoutManager.chartAccountLayout.split > 50) {
          // Currently showing more chart, maximize strategy tester
          layoutManager.chartAccountLayout.setSplit(20); // Show more strategy tester
        } else {
          // Currently showing more strategy tester, balance the view
          layoutManager.chartAccountLayout.setSplit(50); // Balanced view
        }
      } else {
        // For public mode, use the account manager toggle
        if (layoutManager.isAccountMaximized) {
          layoutManager.handleRestorePanel();
        } else {
          layoutManager.handleMaximizePanel();
        }
      }
    };

    window.addEventListener('toggleStrategyTesterFullscreen', handleToggleFullscreen);
    return () => {
      window.removeEventListener('toggleStrategyTesterFullscreen', handleToggleFullscreen);
    };
  }, [layoutManager, isPrivateMode]);

  // DEBUG: Log to see if useChart is being called
  console.log("🔍 TradingPlatform render - enableTrendlineDrawing:", enableTrendlineDrawing);
  console.log("🔍 TradingPlatform render - enableBrushDrawing:", enableBrushDrawing);
  console.log("🔍 containerRef.current:", containerRef.current);

  // Wrapper function for onPriceUpdate to pass symbol
  const handlePriceUpdate = useCallback((price: number) => {
    updateLastPrice(selectedSymbol, price);
  }, [selectedSymbol, updateLastPrice]);

  // Chart management with drawing
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
    
    // Split large orders according to exchange limits
    const orderQuantities = splitOrderForExchangeLimit(quantity);
    
    // Process each order
    orderQuantities.forEach((orderQty, index) => {
      // Create order object
      const order: Order = {
        id: `ORD${Date.now()}-${index}`,
        symbol: selectedSymbol,
        type: side,
        orderType: "Market", // Default to market order for immediate execution
        quantity: orderQty,
        price: price,
        status: "NEW", // Only NEW or FILLED states
        timestamp: new Date()
      };
      
      // Add order to order book service for tracking
      orderBookService.addOrder(order);
      
      // Subscribe to WebSocket updates for this order
      const webSocketService = WebSocketService.getInstance();
      const notificationService = NotificationService.getInstance();
      
      webSocketService.subscribe(order.id, (update) => {
        // Update order in order book service
        orderBookService.updateOrder(update.orderId, {
          status: update.status,
          filledPrice: update.filledPrice,
          filledQuantity: update.filledQuantity
        });
        
        // Update local order state
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === update.orderId 
              ? { ...o, status: update.status, filledPrice: update.filledPrice, filledQuantity: update.filledQuantity } 
              : o
          )
        );
        
        // Local logic to determine order status based on filled quantity
        let localStatus = "pending";
        if (update.filledQuantity !== undefined && update.filledQuantity === orderQty) {
          localStatus = "filled";
        } else if (update.filledQuantity !== undefined && update.filledQuantity > 0 && update.filledQuantity < orderQty) {
          localStatus = "partial";
        } else if (update.status === "CANCELED") {
          localStatus = "cancelled";
        }
        
        // Execute the trade and show notification if order is filled
        if (localStatus === "filled" && update.filledPrice) {
          let success = false;
          if (side === 'buy') {
            success = handleBuy(selectedSymbol, update.filledQuantity || quantity, update.filledPrice);
          } else {
            success = handleSell(selectedSymbol, update.filledQuantity || quantity, update.filledPrice);
          }
          
          if (success) {
            notificationService.showSuccess(`Order ${update.orderId} filled successfully!`);
          }
        }
        
        // Call API to save order to database AFTER receiving final status update
        // Only call once per order when we get a definitive final status update from WebSocket
        if (update.status === "FILLED" || update.status === "REJECTED" || update.status === "CANCELED") {
          // Check if we've already called the API for this order
          const hasCalledApi = sessionStorage.getItem(`order_api_called_${order.id}`);
          if (!hasCalledApi) {
            sessionStorage.setItem(`order_api_called_${order.id}`, "true");
            
            // Map WebSocket status directly to database status
            // Only FILLED and CANCELLED/REJECTED statuses should be saved to database
            let dbStatus: string | null = null;
            
            // Direct mapping from WebSocket status to database status
            if (update.status === "FILLED") {
              dbStatus = "filled";
            } else if (update.status === "CANCELED") {
              dbStatus = "cancelled";
            } else if (update.status === "REJECTED") {
              dbStatus = "cancelled"; // Map REJECTED to cancelled in database
            }
            
            // Safety check - should never happen due to the condition above
            if (dbStatus === null) {
              console.warn("Unexpected status received, not saving to database:", update.status);
              return;
            }
            
            // Create payload matching the NestJS DTO
            const payload: CreateOrderDto = {
              stockSymbol: selectedSymbol,
              side: side,
              quantity: orderQty,
              orderType: order.orderType?.toLowerCase() ?? "limit", // Use the actual order type
              price: price !== undefined ? price : undefined,
              status: dbStatus, // Only "filled" or "cancelled" statuses
              // Optional fields from DTO
              filledQuantity: order.filledQuantity ?? undefined,
              filledPrice: order.filledPrice ?? price ?? undefined,
              commission: 0,
              filledAt:
                (order as unknown as { filledAt?: Date }).filledAt?.toISOString?.() ??
                order.timestamp?.toISOString?.() ??
                new Date().toISOString(),
            };

            // Log the payload for debugging
            console.log("[OrderSync] Sending payload to backend:", JSON.stringify(payload, null, 2));
            
            createOrder(payload)
              .then(response => {
                console.log("Order saved to database with status:", dbStatus, response);
              })
              .catch(error => {
                console.error("Error saving order to database:", error);
                // Log the payload that caused the error
                console.error("[OrderSync] Payload that caused error:", JSON.stringify(payload, null, 2));
              });
          }
        }
      });
      
      // Process order against simulated market - this adds order to pending list for bot processing
      if (marketSimulationRef.current) {
        marketSimulationRef.current.processUserOrder(order);
      }
      
      // Order is pending bot processing
      // Update order in order book service with NEW status
      orderBookService.updateOrder(order.id, {
        status: "NEW"
      });
      
      // Update order status - only Pending or Filled states
      const updatedOrder: Order = {
        ...order,
        orderType: "Market",
        status: "NEW",
        filledPrice: undefined,
        filledQuantity: undefined
      };
      
      // After 1 second, update status to PARTIALLY_FILLED as a temporary status
      setTimeout(() => {
        orderBookService.updateOrder(order.id, {
          status: "PARTIALLY_FILLED"
        });
        
        // Update local order state
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === order.id 
              ? { ...o, status: "PARTIALLY_FILLED" } 
              : o
          )
        );
      }, 1000);
      
      // Add order to state
      setOrders(prevOrders => [updatedOrder, ...prevOrders]);

      // Show notification about order submission
      notificationService.showSuccess(`Order submitted. Waiting for status update from server.`, 5000);
    });
    
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
          {/* Left Section - Chart and Account Manager / Strategy Tester */}
          <div
            ref={layoutManager.leftColumnRef}
            className="grid gap-2 transition-none relative"
            style={{
              width: `${layoutManager.horizontalLayout.split}%`,
              gridTemplateRows: `${layoutManager.chartAccountLayout.split}fr 12px ${100 - layoutManager.chartAccountLayout.split}fr`,
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
              currentPrice={lastPriceRef.current}
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
              isPrivateMode={isPrivateMode} // Truyền isPrivateMode vào ChartSection
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

            {/* Conditional rendering based on private mode */}
            {isPrivateMode ? (
              // Strategy Tester in private mode (using same layout as Account Manager)
              <div 
                className="border rounded overflow-hidden relative flex flex-col transition-colors duration-200"
                style={{
                  willChange: layoutManager.chartAccountLayout.isDragging ? "height" : "auto",
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
                        const event = new CustomEvent("toggleStrategyTesterFullscreen");
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
              // Account Manager Section in public mode
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
                  // In a real implementation, you might want to set a specific price
                }}
              />
            )}
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

          {/* Right Section - Completely redesigned layout */}
          <div
            ref={layoutManager.rightSectionRef}
            className="grid gap-2 transition-none"
            style={{
              width: `${100 - layoutManager.horizontalLayout.split}%`,
              // Completely redesigned grid layout for right section
              // Structure: Watchlist, Divider, [OrderPanel, Divider,] StockInfo, Divider, News
              // When order panel is shown: 5 sections + 3 dividers = 8 grid rows
              // When order panel is hidden: 3 sections + 2 dividers = 5 grid rows
              gridTemplateRows: showOrderPanel 
                ? `${Math.max(15, layoutManager.watchlistLayout.split)}fr 12px ${layoutManager.orderPanelHeight}px 12px ${Math.max(20, layoutManager.stockInfoLayout.split)}fr 12px ${Math.max(20, 100 - layoutManager.watchlistLayout.split - layoutManager.stockInfoLayout.split)}fr`
                : `${Math.max(20, layoutManager.watchlistLayout.split)}fr 12px ${Math.max(25, layoutManager.stockInfoLayout.split)}fr 12px ${Math.max(25, 100 - layoutManager.watchlistLayout.split - layoutManager.stockInfoLayout.split)}fr`,
            }}
          >
            {/* Watchlist Section */}
            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <WatchlistSection
                selectedSymbol={selectedSymbol}
                onSymbolSelect={handleSymbolChange}
                isDarkMode={isDarkMode}
                positions={positionsMap}
                isPrivateMode={isPrivateMode} // Truyền isPrivateMode vào WatchlistSection
                marketSimulation={marketSimulationRef.current || undefined} // Truyền marketSimulation instance
              />
            </div>

            {/* Divider between Watchlist and Stock Info/New Sections */}
            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.watchlistLayout.isDragging}
              onMouseDown={(e: React.MouseEvent) => layoutManager.watchlistLayout.handleMouseDown(e, true)}
              title="Drag up/down to resize watchlist and other sections"
              splitPercentage={layoutManager.watchlistLayout.split}
              isDarkMode={isDarkMode}
            />

            {/* Conditional Order Panel Section */}
            {showOrderPanel && (
              <>
                <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
                  <OrderPanel
                    symbol={selectedSymbol}
                    currentPrice={ohlcData?.close || lastPriceRef.current}
                    onClose={handleCloseOrderPanel}
                    onBuy={(quantity: number, price: number) => handleOrderSubmit('buy', quantity, price)}
                    onSell={(quantity: number, price: number) => handleOrderSubmit('sell', quantity, price)}
                    isDarkMode={isDarkMode}
                    side={orderPanelSide}
                    onSideChange={setOrderPanelSide}
                  />
                </div>
                
                {/* Divider between Order Panel and Stock Info */}
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
                      // Prevent text selection during drag
                      moveEvent.preventDefault();
                      
                      // Update order panel height based on drag direction
                      hasManuallyResizedOrderPanel.current = true;
                      
                      // Calculate available space for order panel
                      const containerRect = container.getBoundingClientRect();
                      const containerHeight = containerRect.height;
                      // Reserve space for other sections (watchlist, dividers, stock info, news)
                      // Each divider is 12px, and we need space for other sections
                      const reservedSpace = containerHeight * 0.3;
                      const maxHeight = containerHeight - reservedSpace;
                      
                      const deltaY = moveEvent.clientY - startY;
                      // Kéo xuống (deltaY dương) → thu nhỏ (giảm height)
                      // Kéo lên (deltaY âm) → phóng to (tăng height)
                      const newHeight = Math.max(150, Math.min(maxHeight, startHeight - deltaY));
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
              </>
            )}

            {/* Stock Info Section */}
            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <StockInfoSection
                selectedSymbol={selectedSymbol}
                isDarkMode={isDarkMode}
                currentVolume={currentVolume}
              />
            </div>

            {/* Stock Info to News Divider */}
            <ResizableDivider
              isVertical={true}
              isDragging={layoutManager.stockInfoLayout.isDragging}
              onMouseDown={(e: React.MouseEvent) => layoutManager.stockInfoLayout.handleMouseDown(e, true)}
              title="Drag up/down to resize stock info and news sections"
              splitPercentage={layoutManager.stockInfoLayout.split}
              isDarkMode={isDarkMode}
            />

            {/* News Section */}
            <div className="rounded-lg overflow-hidden bg-[#131722] h-full">
              <NewsSection isDarkMode={isDarkMode} />
            </div>
          </div>

          {/* Remove any modal overlay for order panel */}
        </div>
      </div>
    </div>
  );
}