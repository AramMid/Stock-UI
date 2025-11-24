"use client";
import { useState } from "react";

interface QuickTradingButtonsProps {
  onBuyClick: () => void;
  onSellClick: () => void;
  currentPrice: number;
  change?: number;
  changePercent?: number;
  isDarkMode?: boolean;
  currentVolume?: number;
  dayRange?: { low: number; high: number };
  fiftyTwoWeekRange?: { low: number; high: number };
}

export default function QuickTradingButtons({
  onBuyClick,
  onSellClick,
  currentPrice,
  change = 0,
  changePercent = 0,
  isDarkMode = true,
  currentVolume = 0,
  dayRange = { low: 240.21, high: 246.3 },
  fiftyTwoWeekRange = { low: 180.5, high: 260.8 },
}: QuickTradingButtonsProps) {
  // Format volume for display
  const formatVolume = (vol: number) => {
    if (vol >= 1000000000) {
      return `${(vol / 1000000000).toFixed(1)}B`;
    } else if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(1)}M`;
    } else if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toLocaleString();
  };

  const [isHovered, setIsHovered] = useState(false);

  const isPositive = change >= 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const changeSymbol = isPositive ? "+" : "";

  // Format price to 2 decimal places
  const formattedPrice = currentPrice.toFixed(2);
  const formattedChange = Math.abs(change).toFixed(2);
  const formattedChangePercent = Math.abs(changePercent).toFixed(2);

  // Calculate spread (simple example - typically bid/ask difference)
  const spread = 0.02; // Example spread value
  const bidPrice = (currentPrice - spread / 2).toFixed(2);
  const askPrice = (currentPrice + spread / 2).toFixed(2);

  return (
    <div
      className="absolute top-4 left-4 z-20 flex items-center gap-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sell Button - Stock Market Red */}
      <button
        onClick={onSellClick}
        className="text-white px-6 py-3 rounded text-sm font-bold transition-colors flex flex-col items-center min-w-[90px] border-0 shadow-lg hover:opacity-90"
        style={{ backgroundColor: "#f23645" }}
      >
        <div className="text-white font-mono text-sm">{bidPrice}</div>
        <div className="text-white font-bold text-xs mt-1">SELL</div>
      </button>

      {/* Spread Display in Middle */}
      <div
        className={`flex flex-col items-center px-8 py-2 backdrop-blur-sm rounded border transition-colors duration-300 ${
          isDarkMode
            ? "bg-[#131722]/80 border-[#2a2e39] text-[#d9d9d9]"
            : "bg-white/80 border-gray-200 text-gray-900"
        }`}
      >
        <div
          className={`text-xs ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Spread
        </div>
        <div className="text-orange-400 font-mono text-sm font-bold">
          {spread.toFixed(2)}
        </div>
      </div>

      {/* Buy Button - Stock Market Green */}
      <button
        onClick={onBuyClick}
        className="text-white px-6 py-3 rounded text-sm font-bold transition-colors flex flex-col items-center min-w-[90px] border-0 shadow-lg hover:opacity-90"
        style={{ backgroundColor: "#089981" }}
      >
        <div className="text-white font-mono text-sm">{askPrice}</div>
        <div className="text-white font-bold text-xs mt-1">BUY</div>
      </button>

      {/* Volume Display */}
      <div
        className={`absolute top-16 left-4 flex items-center justify-center space-x-2 text-xs backdrop-blur-sm rounded px-3 py-1 transition-colors duration-300 ${
          isDarkMode
            ? "bg-[#131722]/80 text-[#d9d9d9]"
            : "bg-white/80 text-gray-900"
        }`}
      >
        <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
          Volume
        </span>
        <span className="text-blue-400 font-mono">
          {currentVolume > 0 ? formatVolume(currentVolume) : "N/A"}
        </span>
      </div>

      {/* Trading Info Tooltip (shown on hover) */}
      {isHovered && (
        <div
          className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 border rounded px-3 py-2 text-xs shadow-lg z-30 transition-colors duration-300 ${
            isDarkMode
              ? "bg-[#131722] border-[#2a2e39] text-[#d9d9d9]"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                Bid:
              </span>
              <span className="text-red-400 font-mono text-xs">{bidPrice}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                Ask:
              </span>
              <span className="text-green-400 font-mono text-xs">
                {askPrice}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Info Panel (shown on hover) */}
      {isHovered && (
        <div
          className={`absolute left-full ml-4 top-0 border backdrop-blur-sm rounded-xl p-4 min-w-64 text-xs shadow-2xl z-30 transition-colors duration-300 ${
            isDarkMode
              ? "bg-[#131722] border-[#2a2e39] text-[#d9d9d9]"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="space-y-3">
            {/* Market Data */}
            <div
              className={`border-b pb-2 ${
                isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
              }`}
            >
              <h4 className="font-semibold text-sm mb-2 text-blue-400">
                Market Data
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Volume:
                  </span>
                  <span
                    className={`font-mono ${
                      isDarkMode ? "text-[#d9d9d9]" : "text-gray-900"
                    }`}
                  >
                    {currentVolume > 0 ? formatVolume(currentVolume) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Avg Vol:
                  </span>
                  <span
                    className={`font-mono ${
                      isDarkMode ? "text-[#d9d9d9]" : "text-gray-900"
                    }`}
                  >
                    {currentVolume > 0
                      ? formatVolume(currentVolume * 0.65)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    52W High:
                  </span>
                  <span className="font-mono text-green-400">
                    {fiftyTwoWeekRange.high.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    52W Low:
                  </span>
                  <span className="font-mono text-red-400">
                    {fiftyTwoWeekRange.low.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Info */}
            <div
              className={`border-b pb-2 ${
                isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
              }`}
            >
              <h4 className="font-semibold text-sm mb-2 text-green-400">
                Position Info
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Bid:
                  </span>
                  <span className="font-mono text-red-400">{bidPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Ask:
                  </span>
                  <span className="font-mono text-green-400">{askPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Spread:
                  </span>
                  <span className="font-mono text-orange-400">
                    {spread.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* P&L Info */}
            <div>
              <h4 className="font-semibold text-sm mb-2 text-purple-400">
                P&L Summary
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Unrealized:
                  </span>
                  <span className="font-mono text-green-400">+$127.50</span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Realized:
                  </span>
                  <span className="font-mono text-blue-400">+$89.32</span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Total P&L:
                  </span>
                  <span className="font-mono text-green-400 font-semibold">
                    +$216.82
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
