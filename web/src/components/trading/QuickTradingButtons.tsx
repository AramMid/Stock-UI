"use client";
import { useState, useEffect } from "react";

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
  isPrivateMode?: boolean; // Thêm prop isPrivateMode
  bestBidPrice?: number; // Best bid price
  bestAskPrice?: number; // Best ask price
  onBidPriceChange?: (price: number) => void; // Callback when bid price changes
  onAskPriceChange?: (price: number) => void; // Callback when ask price changes
}

// Add CSS for flash animations
const flashStyles = `
  @keyframes flashGreen {
    0% { box-shadow: 0 0 0 0 rgba(8, 153, 129, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(8, 153, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(8, 153, 129, 0); }
  }
  
  @keyframes flashRed {
    0% { box-shadow: 0 0 0 0 rgba(242, 54, 69, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(242, 54, 69, 0); }
    100% { box-shadow: 0 0 0 0 rgba(242, 54, 69, 0); }
  }
  
  .animate-flash-green {
    animation: flashGreen 0.3s ease-out;
  }
  
  .animate-flash-red {
    animation: flashRed 0.3s ease-out;
  }
`;

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
  isPrivateMode = false, // Mặc định là false
  bestBidPrice, // Best bid price
  bestAskPrice, // Best ask price
  onBidPriceChange, // Callback when bid price changes
  onAskPriceChange, // Callback when ask price changes
}: QuickTradingButtonsProps) {
  // console.log('QuickTradingButtons rendered with props:', {
  //   currentPrice,
  //   bestBidPrice,
  //   bestAskPrice,
  //   isPrivateMode
  // });

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
  const [previousBidPrice, setPreviousBidPrice] = useState<number | undefined>(undefined);
  const [previousAskPrice, setPreviousAskPrice] = useState<number | undefined>(undefined);
  const [bidFlashClass, setBidFlashClass] = useState("");
  const [askFlashClass, setAskFlashClass] = useState("");

  // Inject CSS styles for flash animations
  useEffect(() => {
    // console.log('Injecting flash animation styles');
    // Create style element
    const style = document.createElement('style');
    style.innerHTML = flashStyles;
    document.head.appendChild(style);
    // console.log('Flash animation styles injected');
    
    // Clean up on unmount
    return () => {
      // console.log('Removing flash animation styles');
      document.head.removeChild(style);
    };
  }, []);
  
  // Track price changes for visual feedback
  useEffect(() => {
    // Check if bid price changed
    if (bestBidPrice !== undefined && previousBidPrice !== undefined) {
      // Handle floating point precision issues
      const priceDiff = bestBidPrice - previousBidPrice;
      const epsilon = 0.0001; // Small threshold for price changes
      
      if (priceDiff > epsilon) {
        // console.log('Bid price increased - flashing green', { diff: priceDiff });
        setBidFlashClass("animate-flash-green");
        setTimeout(() => setBidFlashClass(""), 300);
      } else if (priceDiff < -epsilon) {
        // console.log('Bid price decreased - flashing red', { diff: priceDiff });
        setBidFlashClass("animate-flash-red");
        setTimeout(() => setBidFlashClass(""), 300);
      }
    }
    
    // Check if ask price changed
    if (bestAskPrice !== undefined && previousAskPrice !== undefined) {
      // Handle floating point precision issues
      const priceDiff = bestAskPrice - previousAskPrice;
      const epsilon = 0.0001; // Small threshold for price changes
      
      if (priceDiff > epsilon) {
        // console.log('Ask price increased - flashing green', { diff: priceDiff });
        setAskFlashClass("animate-flash-green");
        setTimeout(() => setAskFlashClass(""), 300);
      } else if (priceDiff < -epsilon) {
        // console.log('Ask price decreased - flashing red', { diff: priceDiff });
        setAskFlashClass("animate-flash-red");
        setTimeout(() => setAskFlashClass(""), 300);
      }
    }
    
    // Update previous prices
    if (bestBidPrice !== undefined) {
      // console.log('Updating previous bid price:', bestBidPrice);
      setPreviousBidPrice(bestBidPrice);
    }
    if (bestAskPrice !== undefined) {
      // console.log('Updating previous ask price:', bestAskPrice);
      setPreviousAskPrice(bestAskPrice);
    }
  }, [bestBidPrice, bestAskPrice]);
  
  const isPositive = change >= 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const changeSymbol = isPositive ? "+" : "";

  // Format price to 2 decimal places
  const formattedPrice = currentPrice.toFixed(2);
  const formattedChange = Math.abs(change).toFixed(2);
  const formattedChangePercent = Math.abs(changePercent).toFixed(2);

  // Use real bid/ask prices if provided, otherwise calculate from current price
  // Use fixed 100 VND spread if no bid/ask prices provided
  // Don't show prices if they are 0 (no data)
  const bidValue = bestBidPrice !== undefined && bestBidPrice > 0 ? bestBidPrice : 
                  (currentPrice > 0 ? currentPrice - 100 : 0);
  const askValue = bestAskPrice !== undefined && bestAskPrice > 0 ? bestAskPrice : 
                  (currentPrice > 0 ? currentPrice + 100 : 0);
  
  // Only format prices if they are greater than 0
  const bidPrice = bidValue > 0 ? bidValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--";
  const askPrice = askValue > 0 ? askValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--";
  const spread = (askValue > 0 && bidValue > 0) ? askValue - bidValue : 0;
  
  // Debug logging
  // console.log('QuickTradingButtons prices:', {
  //   bestBidPrice,
  //   bestAskPrice,
  //   bidPrice,
  //   askPrice,
  //   currentPrice,
  //   bidFlashClass,
  //   askFlashClass
  // });

  // Nếu đang ở chế độ private, không hiển thị các button buy/sell
  if (isPrivateMode) {
    return null;
  }
  
  // Don't show buttons if there's no price data
  if ((bestBidPrice === undefined || bestBidPrice === 0) && 
      (bestAskPrice === undefined || bestAskPrice === 0) && 
      currentPrice === 0) {
    return null;
  }

  return (
    <div
      className="absolute top-4 left-4 z-20 flex items-center gap-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sell Button - Stock Market Red */}
      <button
        onClick={onSellClick}
        className={`text-white px-6 py-3 rounded text-sm font-bold transition-colors flex flex-col items-center min-w-[90px] border-0 shadow-lg hover:opacity-90 ${bidFlashClass}`}
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
        className={`text-white px-6 py-3 rounded text-sm font-bold transition-colors flex flex-col items-center min-w-[90px] border-0 shadow-lg hover:opacity-90 ${askFlashClass}`}
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
                    Day Range:
                  </span>
                  <span
                    className={`font-mono ${
                      isDarkMode ? "text-[#d9d9d9]" : "text-gray-900"
                    }`}
                  >
                    {dayRange.low.toFixed(2)} - {dayRange.high.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    52W Range:
                  </span>
                  <span
                    className={`font-mono ${
                      isDarkMode ? "text-[#d9d9d9]" : "text-gray-900"
                    }`}
                  >
                    {fiftyTwoWeekRange.low.toFixed(2)} -{" "}
                    {fiftyTwoWeekRange.high.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div>
              <h4 className="font-semibold text-sm mb-2 text-blue-400">
                Price Info
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Open:
                  </span>
                  <span
                    className={`font-mono ${
                      isDarkMode ? "text-[#d9d9d9]" : "text-gray-900"
                    }`}
                  >
                    {currentPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Change:
                  </span>
                  <span
                    className={`font-mono ${changeColor}`}
                  >
                    {changeSymbol}
                    {formattedChange} ({changeSymbol}
                    {formattedChangePercent}%)
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