"use client";
import { useRef, MutableRefObject, useEffect } from "react";
import { Timeframe } from "@/lib/types";
import QuickTradingButtons from "./QuickTradingButtons";
import TimeframeControls from "./TimeframeControls";
import { useDrawing } from "@/contexts/DrawingContext";
import { drawingService } from "@/lib/drawing-service";

interface ChartSectionProps {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  ohlcData: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  } | null;
  selectedSymbol: string;
  isDarkMode: boolean;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onBuyClick: () => void;
  onSellClick: () => void;
  currentPrice: number;
  change: number;
  changePercent: number;
  showRSI: boolean;
  showMACD: boolean;
  onToggleRSI: () => void;
  onToggleMACD: () => void;
  isDragging: boolean;
  currentVolume: number;
  dayRange?: { low: number; high: number };
  fiftyTwoWeekRange?: { low: number; high: number };
}

export default function ChartSection({
  containerRef,
  ohlcData,
  selectedSymbol,
  isDarkMode,
  timeframe,
  onTimeframeChange,
  onBuyClick,
  onSellClick,
  currentPrice,
  change,
  changePercent,
  showRSI,
  showMACD,
  onToggleRSI,
  onToggleMACD,
  isDragging,
  currentVolume,
  dayRange,
  fiftyTwoWeekRange,
}: ChartSectionProps) {
  const { activeTool } = useDrawing();
  
  // Initialize drawing service when container is available
  useEffect(() => {
    if (containerRef.current) {
      drawingService.initialize(containerRef.current);
    }
    
    return () => {
      drawingService.destroy();
    };
  }, [containerRef]);
  
  // Update active tool in drawing service
  useEffect(() => {
    drawingService.setActiveTool(activeTool);
  }, [activeTool]);
  
  return (
    <div
      className={`rounded overflow-hidden relative transition-colors duration-300 ${
        isDarkMode ? "bg-[#131722]" : "bg-white"
      }`}
    >
      <div className="absolute inset-0 flex flex-col overflow-hidden">
        {/* Quick Trading Buttons Overlay */}
        <QuickTradingButtons
          onBuyClick={onBuyClick}
          onSellClick={onSellClick}
          currentPrice={currentPrice}
          change={change}
          changePercent={changePercent}
          isDarkMode={isDarkMode}
          currentVolume={currentVolume}
          dayRange={dayRange}
          fiftyTwoWeekRange={fiftyTwoWeekRange}
        />

        {/* Main Chart Container - Optimized for smooth resizing */}
        <div
          ref={containerRef}
          className={`flex-1 w-full relative ${
            isDarkMode ? "bg-[#131722]" : "bg-white"
          }`}
          style={{
            overflow: "hidden",
            minHeight: "200px",
            // Prevent layout thrashing during resize
            willChange: isDragging ? "height" : "auto",
            // GPU acceleration for smoother resizing
            transform: "translateZ(0)",
          }}
        />

        {/* Timeframe Controls */}
        <div className="absolute bottom-2 left-2 z-10">
          <TimeframeControls
            timeframe={timeframe}
            onTimeframeChange={onTimeframeChange}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Indicator Controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button
            onClick={onToggleRSI}
            className={`px-3 py-1 text-xs rounded transition-colors border-0 ${
              showRSI
                ? "bg-purple-600 text-white"
                : isDarkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            RSI
          </button>
          <button
            onClick={onToggleMACD}
            className={`px-3 py-1 text-xs rounded transition-colors border-0 ${
              showMACD
                ? "bg-green-600 text-white"
                : isDarkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            MACD
          </button>
        </div>
      </div>
    </div>
  );
}