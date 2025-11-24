"use client";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockDetailsPanelProps {
  selectedSymbol: string;
  isDarkMode?: boolean;
  currentVolume?: number;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayRange: { low: number; high: number };
  fiftyTwoWeekRange: { low: number; high: number };
  volume: number;
}

export default function StockDetailsPanel({
  selectedSymbol,
  isDarkMode = true,
  currentVolume = 0,
}: StockDetailsPanelProps) {
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
  // Sample data - in real app this would come from props or API
  const stockData: StockData = {
    symbol: selectedSymbol,
    name: selectedSymbol === "AAPL" ? "Apple Inc." : "Future ESG VN30 ETF",
    price: 245.5,
    change: 7.62,
    changePercent: 3.2,
    dayRange: { low: 240.21, high: 246.3 },
    fiftyTwoWeekRange: { low: 180.5, high: 260.8 },
    volume: currentVolume, // Use dynamic volume from chart
  };

  const isPositive = stockData.change >= 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={`h-full p-4 overflow-y-auto ${
        isDarkMode ? "bg-transparent text-white" : "bg-white text-gray-900"
      }`}
    >
      {/* Stock Header */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-orange-400">🍎</span>
          <h3 className="font-bold text-xl">{stockData.symbol}</h3>
        </div>
        <p
          className={`text-sm ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {stockData.name} • NASDAQ
        </p>
      </div>

      {/* Price Information */}
      <div className="mb-6">
        <div className="text-3xl font-bold mb-2">
          {stockData.price.toFixed(2)}
        </div>
        <div className={`flex items-center text-sm ${changeColor}`}>
          <ChangeIcon className="w-4 h-4 mr-1" />
          <span>
            {isPositive ? "+" : ""}
            {stockData.change.toFixed(2)} ({isPositive ? "+" : ""}
            {stockData.changePercent.toFixed(2)}%)
          </span>
        </div>
        <p
          className={`text-xs mt-1 ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Market closed
        </p>
      </div>

      {/* Market Data */}
      <div className="space-y-4">
        <div>
          <span
            className={`text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            DAY'S RANGE
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm font-mono">
              {stockData.dayRange.low.toFixed(2)}
            </span>
            <div
              className={`flex-1 h-1 rounded ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              } relative`}
            >
              <div
                className="h-full bg-blue-500 rounded"
                style={{ width: "65%" }}
              />
              <div
                className="absolute top-0 w-0.5 h-full bg-white"
                style={{ left: "65%" }}
              />
            </div>
            <span className="text-sm font-mono">
              {stockData.dayRange.high.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              52W RANGE
            </span>
            <div className="font-mono">
              {stockData.fiftyTwoWeekRange.low.toFixed(2)} -{" "}
              {stockData.fiftyTwoWeekRange.high.toFixed(2)}
            </div>
          </div>

          <div>
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              VOLUME
            </span>
            <div className="font-mono">
              {currentVolume > 0 ? formatVolume(currentVolume) : "N/A"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              MARKET CAP
            </span>
            <div className="font-mono">$2.89T</div>
          </div>

          <div>
            <span
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              P/E RATIO
            </span>
            <div className="font-mono">28.45</div>
          </div>
        </div>
      </div>

      {/* Top News Stories */}
      <div className="mt-8">
        <h4 className="font-semibold mb-4 text-lg">Top News Stories</h4>
        <div className="space-y-4">
          <div
            className={`pb-3 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <p
              className={`text-xs mb-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              08:40 • Sep 20 • Bloomberg
            </p>
            <p className="text-sm leading-relaxed">
              Apple Announces New iPhone 15 Series with Enhanced AI Capabilities
            </p>
          </div>

          <div
            className={`pb-3 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <p
              className={`text-xs mb-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              07:30 • Sep 20 • Reuters
            </p>
            <p className="text-sm leading-relaxed">
              Technology Stocks Rally as Federal Reserve Signals Rate Cuts
            </p>
          </div>

          <div
            className={`pb-3 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <p
              className={`text-xs mb-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              06:15 • Sep 20 • MarketWatch
            </p>
            <p className="text-sm leading-relaxed">
              Analysts Upgrade Apple Stock Following Strong Quarterly Results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
