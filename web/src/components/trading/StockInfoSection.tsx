"use client";

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

  // Mock data based on selected symbol
  const getStockData = (symbol: string) => {
    const stockData: Record<string, any> = {
      "VIC.VN": {
        name: "Vingroup JSC",
        exchange: "HOSE",
        price: 45200,
        change: 800,
        changePercent: 1.8,
        dayLow: 44200,
        dayHigh: 45800,
        marketStatus: "Market closed",
        isVN: true,
      },
      "VHM.VN": {
        name: "Vinhomes JSC",
        exchange: "HOSE",
        price: 55500,
        change: -500,
        changePercent: -0.89,
        dayLow: 54800,
        dayHigh: 56200,
        marketStatus: "Market closed",
        isVN: true,
      },
      "VCB.VN": {
        name: "Vietcombank",
        exchange: "HOSE",
        price: 82700,
        change: 1200,
        changePercent: 1.47,
        dayLow: 81200,
        dayHigh: 83500,
        marketStatus: "Market closed",
        isVN: true,
      },
      "TCB.VN": {
        name: "Techcombank",
        exchange: "HOSE",
        price: 22950,
        change: 350,
        changePercent: 1.55,
        dayLow: 22400,
        dayHigh: 23200,
        marketStatus: "Market closed",
        isVN: true,
      },
      "FPT.VN": {
        name: "FPT Corporation",
        exchange: "HOSE",
        price: 123500,
        change: -1500,
        changePercent: -1.2,
        dayLow: 122000,
        dayHigh: 125000,
        marketStatus: "Market closed",
        isVN: true,
      },
      "VNM.VN": {
        name: "Vietnam Dairy Products",
        exchange: "HOSE",
        price: 48200,
        change: 600,
        changePercent: 1.26,
        dayLow: 47400,
        dayHigh: 48800,
        marketStatus: "Market closed",
        isVN: true,
      },
      "HPG.VN": {
        name: "Hoa Phat Group",
        exchange: "HOSE",
        price: 18850,
        change: -250,
        changePercent: -1.31,
        dayLow: 18500,
        dayHigh: 19200,
        marketStatus: "Market closed",
        isVN: true,
      },
      "MSN.VN": {
        name: "Masan Group",
        exchange: "HOSE",
        price: 67800,
        change: 2100,
        changePercent: 3.2,
        dayLow: 65200,
        dayHigh: 68500,
        marketStatus: "Market closed",
        isVN: true,
      },
      AAPL: {
        name: "Apple Inc.",
        exchange: "NASDAQ",
        price: 245.5,
        change: 7.62,
        changePercent: 3.2,
        dayLow: 240.21,
        dayHigh: 246.3,
        marketStatus: "Market closed",
        isVN: false,
      },
      default: {
        name: "Vingroup JSC",
        exchange: "HOSE",
        price: 45200,
        change: 800,
        changePercent: 1.8,
        dayLow: 44200,
        dayHigh: 45800,
        marketStatus: "Market closed",
        isVN: true,
      },
    };
    return stockData[symbol] || stockData.default;
  };

  const stockData = getStockData(selectedSymbol);
  const isPositive = stockData.change >= 0;
  const rangePercentage =
    ((stockData.price - stockData.dayLow) /
      (stockData.dayHigh - stockData.dayLow)) *
    100;

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
              ? stockData.price.toLocaleString("vi-VN")
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
                ? stockData.change.toLocaleString("vi-VN")
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
              DAY'S RANGE
            </span>
            <span
              className={`text-xs transition-colors duration-200 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {stockData.isVN
                ? stockData.dayHigh.toLocaleString("vi-VN")
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
                ? stockData.dayLow.toLocaleString("vi-VN")
                : stockData.dayLow.toFixed(2)}
            </span>
            <span className="text-gray-400 text-xs">
              {stockData.isVN
                ? stockData.dayHigh.toLocaleString("vi-VN")
                : stockData.dayHigh.toFixed(2)}
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
                ? (stockData.dayLow + 800).toLocaleString("vi-VN")
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
