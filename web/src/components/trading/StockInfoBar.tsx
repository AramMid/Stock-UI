"use client";

interface StockInfoBarProps {
  symbol: string;
  ohlcData?: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  } | null;
  isDarkMode?: boolean;
}

export default function StockInfoBar({
  symbol,
  ohlcData,
  isDarkMode = true,
}: StockInfoBarProps) {
  const isPositive = (ohlcData?.change || 0) >= 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const changeSymbol = isPositive ? "+" : "";

  // Sample data for when ohlcData is not available
  const displayData = ohlcData || {
    open: 245.3,
    high: 246.85,
    low: 244.12,
    close: 245.5,
    change: 0.2,
    changePercent: 0.08,
  };

  return (
    <div className="bg-[#131722] border-b border-[#2a2e39] px-4 py-2 flex items-center justify-between text-white text-sm">
      {/* Left Section - Company Info */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <h1 className="font-semibold text-base">{symbol}</h1>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">1D</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">HCMC</span>
        </div>
      </div>

      {/* Center Section - OHLC Data */}
      <div className="flex items-center justify-center flex-1">
        <div className="flex items-center gap-6">
          {/* Open */}
          <div className="flex items-center space-x-2 bg-gray-800/30 px-4 py-2 rounded-md">
            <span className="text-xs text-gray-400 font-medium">O</span>
            <span className="font-mono text-white font-semibold text-sm">
              {displayData.open.toFixed(2)}
            </span>
          </div>

          {/* High */}
          <div className="flex items-center space-x-2 bg-gray-800/30 px-4 py-2 rounded-md">
            <span className="text-xs text-gray-400 font-medium">H</span>
            <span className="font-mono text-green-400 font-semibold text-sm">
              {displayData.high.toFixed(2)}
            </span>
          </div>

          {/* Low */}
          <div className="flex items-center space-x-2 bg-gray-800/30 px-4 py-2 rounded-md">
            <span className="text-xs text-gray-400 font-medium">L</span>
            <span className="font-mono text-red-400 font-semibold text-sm">
              {displayData.low.toFixed(2)}
            </span>
          </div>

          {/* Close */}
          <div className="flex items-center space-x-2 bg-gray-800/30 px-4 py-2 rounded-md">
            <span className="text-xs text-gray-400 font-medium">C</span>
            <span className={`font-mono ${changeColor} font-semibold text-sm`}>
              {displayData.close.toFixed(2)}
            </span>
          </div>

          {/* Change */}
          <div className="flex items-center space-x-2 bg-gray-800/30 px-4 py-2 rounded-md">
            <span className={`font-mono ${changeColor} font-semibold text-sm`}>
              {changeSymbol}
              {Math.abs(displayData.change).toFixed(2)} ({changeSymbol}
              {Math.abs(displayData.changePercent).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Right Section - Market Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-gray-400">Market Closed</span>
        </div>
        <span className="text-gray-400">19:40:00 UTC+7</span>
      </div>
    </div>
  );
}