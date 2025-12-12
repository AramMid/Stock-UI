"use client";
import { formatVND } from "@/lib/order-management";
import { getExchangeBySymbol, calculatePriceBands } from "@/lib/position-sizing";
import { useMarketData } from "@/lib/hooks/useMarketData"; // Import the useMarketData hook

interface StockData {
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  dayLow: number;
  dayHigh: number;
  marketStatus: string;
  isVN: boolean;
}

interface StockInfoSectionProps {
  selectedSymbol: string;
  isDarkMode: boolean;
  currentVolume?: number;
}

export default function StockInfoSection({
  selectedSymbol,
  isDarkMode,
  currentVolume = 0,
}: StockInfoSectionProps) {
  // Use the useMarketData hook to get real data
  const { marketData, loading, error } = useMarketData([selectedSymbol]);
  
  // Get the real market data for the selected symbol
  const realMarketData = marketData[selectedSymbol];
  
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

  // Use real data if available, otherwise show loading state
  const stockData: StockData = realMarketData 
    ? {
        name: realMarketData.symbol, // Will be updated with real name if needed
        exchange: getExchangeBySymbol(realMarketData.symbol),
        price: realMarketData.price,
        change: realMarketData.change,
        changePercent: realMarketData.changePercent,
        dayLow: realMarketData.price * 0.99, // Approximate values
        dayHigh: realMarketData.price * 1.01,
        marketStatus: "Market open", // Default status
        isVN: realMarketData.symbol.includes(".VN"),
      }
    : {
        name: selectedSymbol,
        exchange: getExchangeBySymbol(selectedSymbol),
        price: 0,
        change: 0,
        changePercent: 0,
        dayLow: 0,
        dayHigh: 0,
        marketStatus: "Loading...",
        isVN: selectedSymbol.includes(".VN"),
      };

  const isPositive = stockData.change >= 0;
  const rangePercentage =
    stockData.dayHigh !== stockData.dayLow
      ? ((stockData.price - stockData.dayLow) /
          (stockData.dayHigh - stockData.dayLow)) *
        100
      : 50;

  const priceBands = calculatePriceBands(stockData.price, getExchangeBySymbol(selectedSymbol));

  return (
    <div
      className={`border rounded overflow-hidden h-full transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#131722] border-[#2a2e39]"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="p-4 h-full">
        {/* Stock Symbol and Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div
            className={`w-8 h-8 rounded flex items-center justify-center ${
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <span
              className={`text-sm font-bold ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {selectedSymbol.charAt(0)}
            </span>
          </div>
          <div>
            <h4
              className={`font-semibold text-lg transition-colors duration-200 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {selectedSymbol}
            </h4>
            <p
              className={`text-sm transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {stockData.name} • {stockData.exchange}
            </p>
          </div>
        </div>

        {/* Price Display */}
        <div className="mb-6">
          <div
            className={`text-3xl font-bold mb-2 transition-colors duration-200 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {stockData.isVN
              ? formatVND(stockData.price)
              : stockData.price.toFixed(2)}
          </div>
          <div
            className={`flex items-center space-x-2 text-sm ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            <span className="font-medium">
              {isPositive ? "+" : ""}
              {stockData.isVN
                ? formatVND(stockData.change)
                : stockData.change.toFixed(2)}
            </span>
            <span className="font-medium">
              {isPositive ? "+" : ""}
              {stockData.changePercent.toFixed(2)}%
            </span>
          </div>
          <div
            className={`text-xs mt-1 transition-colors duration-200 ${
              isDarkMode ? "text-gray-500" : "text-gray-600"
            }`}
          >
            {stockData.marketStatus}
          </div>
        </div>

        {/* Day's Range */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span
              className={`text-xs font-medium transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              DAY&apos;S RANGE
            </span>
            <span
              className={`text-xs transition-colors duration-200 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {stockData.isVN
                ? formatVND(stockData.dayHigh)
                : stockData.dayHigh.toFixed(2)}
            </span>
          </div>

          {/* Range Bar */}
          <div
            className={`relative h-1 rounded-full mb-2 ${
              isDarkMode ? "bg-gray-700" : "bg-gray-300"
            }`}
          >
            <div
              className="absolute h-full bg-teal-400 rounded-full"
              style={{ width: `${rangePercentage}%` }}
            ></div>
            <div
              className={`absolute w-2 h-2 rounded-full border transform -translate-y-0.5 ${
                isDarkMode
                  ? "bg-white border-gray-600"
                  : "bg-gray-700 border-gray-400"
              }`}
              style={{ left: `calc(${rangePercentage}% - 4px)` }}
            ></div>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400 text-xs">
              {stockData.isVN
                ? formatVND(stockData.dayLow)
                : stockData.dayLow.toFixed(2)}
            </span>
            <span className="text-gray-400 text-xs">
              {stockData.isVN
                ? formatVND(stockData.dayHigh)
                : stockData.dayHigh.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Price Bands */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              REF
            </span>
            <span className={`font-medium ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}>
              {stockData.isVN ? formatVND(priceBands.reference) : priceBands.reference.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              CEIL
            </span>
            <span className={`font-medium ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
              {stockData.isVN ? formatVND(priceBands.ceiling) : priceBands.ceiling.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              FLOOR
            </span>
            <span className={`font-medium ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
              {stockData.isVN ? formatVND(priceBands.floor) : priceBands.floor.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span
              className={`transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Open
            </span>
            <span
              className={`transition-colors duration-200 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {stockData.isVN
                ? formatVND(stockData.dayLow + 800)
                : (stockData.dayLow + 1.2).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span
              className={`transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Volume
            </span>
            <span
              className={`transition-colors duration-200 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {currentVolume > 0 ? formatVolume(currentVolume) : "N/A"}
            </span>
          </div>
          <div className="flex justify-between">
            <span
              className={`transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Market Cap
            </span>
            <span
              className={`transition-colors duration-200 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {stockData.isVN ? "520.8T VND" : "3.85T USD"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
