"use client";
import { useState } from "react";
import { Plus, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: "STOCKS" | "FOREX" | "CRYPTO";
}

interface RightSidebarProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  isDarkMode?: boolean;
}

export default function RightSidebar({
  selectedSymbol,
  onSymbolSelect,
  isDarkMode = true,
}: RightSidebarProps) {
  const [stocksExpanded, setStocksExpanded] = useState(true);
  const [forexExpanded, setForexExpanded] = useState(true);

  const stockWatchlist: WatchlistItem[] = [
    {
      symbol: "VIC.VN",
      name: "Vingroup JSC",
      price: 45200,
      change: 800,
      changePercent: 1.8,
      category: "STOCKS",
    },
    {
      symbol: "VHM.VN",
      name: "Vinhomes JSC",
      price: 55500,
      change: -500,
      changePercent: -0.89,
      category: "STOCKS",
    },
    {
      symbol: "VCB.VN",
      name: "Vietcombank",
      price: 82700,
      change: 1200,
      changePercent: 1.47,
      category: "STOCKS",
    },
    {
      symbol: "TCB.VN",
      name: "Techcombank",
      price: 22950,
      change: 350,
      changePercent: 1.55,
      category: "STOCKS",
    },
    {
      symbol: "FPT.VN",
      name: "FPT Corporation",
      price: 123500,
      change: -1500,
      changePercent: -1.2,
      category: "STOCKS",
    },
    {
      symbol: "VNM.VN",
      name: "Vietnam Dairy Products",
      price: 48200,
      change: 600,
      changePercent: 1.26,
      category: "STOCKS",
    },
    {
      symbol: "HPG.VN",
      name: "Hoa Phat Group",
      price: 18850,
      change: -250,
      changePercent: -1.31,
      category: "STOCKS",
    },
    {
      symbol: "MSN.VN",
      name: "Masan Group",
      price: 67800,
      change: 2100,
      changePercent: 3.2,
      category: "STOCKS",
    },
  ];

  const forexWatchlist: WatchlistItem[] = [
    {
      symbol: "EURUSD",
      name: "Euro / US Dollar",
      price: 1.1744,
      change: -0.00411,
      changePercent: -0.35,
      category: "FOREX",
    },
    {
      symbol: "GBPUSD",
      name: "British Pound / US Dollar",
      price: 1.34605,
      change: -0.0094,
      changePercent: -0.69,
      category: "FOREX",
    },
  ];

  const renderWatchlistItems = (items: WatchlistItem[]) => {
    return items.map((item) => (
      <div
        key={item.symbol}
        onClick={() => onSymbolSelect(item.symbol)}
        className={`grid grid-cols-4 gap-2 px-3 py-2 cursor-pointer transition-colors text-xs ${
          isDarkMode ? "hover:bg-[#1e222d]" : "hover:bg-gray-50"
        } ${
          selectedSymbol === item.symbol
            ? isDarkMode
              ? "bg-[#1e222d]"
              : "bg-blue-50"
            : ""
        }`}
      >
        {/* Symbol with flag/icon */}
        <div className="flex items-center space-x-1">
          {item.category === "STOCKS" && (
            <div className="w-3 h-3 rounded bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
              {item.symbol.charAt(0)}
            </div>
          )}
          {item.category === "FOREX" && (
            <div className="w-3 h-3 rounded bg-green-500 flex items-center justify-center text-[8px] font-bold text-white">
              {item.symbol.substring(0, 2)}
            </div>
          )}
          <span
            className={`font-medium truncate transition-colors duration-200 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {item.symbol}
          </span>
        </div>

        {/* Price */}
        <div
          className={`text-right font-mono transition-colors duration-200 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {item.symbol.endsWith(".VN")
            ? item.price.toLocaleString("vi-VN")
            : item.price.toFixed(item.category === "FOREX" ? 5 : 2)}
        </div>

        {/* Change */}
        <div
          className={`text-right font-mono ${
            item.change >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {item.change >= 0 ? "+" : ""}
          {item.symbol.endsWith(".VN")
            ? item.change.toLocaleString("vi-VN")
            : item.change.toFixed(item.category === "FOREX" ? 5 : 2)}
        </div>

        {/* Change % */}
        <div
          className={`text-right font-mono ${
            item.changePercent >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {item.changePercent >= 0 ? "+" : ""}
          {item.changePercent.toFixed(2)}%
        </div>
      </div>
    ));
  };

  return (
    <div
      className={`w-full bg-transparent flex flex-col h-full transition-colors duration-200 ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}
    >
      {/* Watchlist Header */}
      <div
        className={`border-b px-3 py-3 transition-colors duration-200 ${
          isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`font-semibold text-sm transition-colors duration-200 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Watchlist
          </h3>
          <div className="flex items-center space-x-2">
            <select
              className={`border rounded px-2 py-1 text-xs transition-colors duration-200 ${
                isDarkMode
                  ? "bg-[#1e222d] border-[#2a2e39] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option>Default</option>
              <option>Custom 1</option>
              <option>Custom 2</option>
            </select>
            <button
              className={`transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Headers */}
      <div
        className={`border-b px-3 py-2 transition-colors duration-200 ${
          isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
        }`}
      >
        <div
          className={`grid grid-cols-4 gap-2 text-xs font-medium transition-colors duration-200 ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          <div>Symbol</div>
          <div className="text-right">Last</div>
          <div className="text-right">Chg</div>
          <div className="text-right">Chg%</div>
        </div>
      </div>

      {/* Stocks Section */}
      <div
        className={`border-b transition-colors duration-200 ${
          isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setStocksExpanded(!stocksExpanded)}
          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            isDarkMode ? "hover:bg-[#1e222d]" : "hover:bg-gray-50"
          }`}
        >
          <span
            className={`font-medium text-xs transition-colors duration-200 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            STOCKS
          </span>
          <ChevronDown
            className={`w-3 h-3 transition-transform ${
              stocksExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        {stocksExpanded && (
          <div
            className={`transition-colors duration-200 ${
              isDarkMode ? "bg-[#131722]" : "bg-white"
            }`}
          >
            {renderWatchlistItems(stockWatchlist)}
          </div>
        )}
      </div>

      {/* Forex Section */}
      <div
        className={`border-b transition-colors duration-200 ${
          isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setForexExpanded(!forexExpanded)}
          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            isDarkMode ? "hover:bg-[#1e222d]" : "hover:bg-gray-50"
          }`}
        >
          <span
            className={`font-medium text-xs transition-colors duration-200 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            FOREX
          </span>
          <ChevronDown
            className={`w-3 h-3 transition-transform ${
              forexExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        {forexExpanded && (
          <div
            className={`transition-colors duration-200 ${
              isDarkMode ? "bg-[#131722]" : "bg-white"
            }`}
          >
            {renderWatchlistItems(forexWatchlist)}
          </div>
        )}
      </div>
    </div>
  );
}
