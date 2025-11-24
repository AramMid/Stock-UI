"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface WatchlistPanelProps {
  onSymbolSelect: (symbol: string) => void;
  selectedSymbol: string;
  isDarkMode?: boolean;
}

export default function WatchlistPanel({
  onSymbolSelect,
  selectedSymbol,
  isDarkMode = true,
}: WatchlistPanelProps) {
  const [activeTab, setActiveTab] = useState<"STOCKS" | "FOREX">("STOCKS");

  const stockWatchlist: WatchlistItem[] = [
    {
      symbol: "FUESSV30.HM",
      name: "Future ESG VN30 ETF",
      price: 245.3,
      change: -0.28,
      changePercent: -0.11,
    },
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 245.5,
      change: 7.62,
      changePercent: 3.2,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corp.",
      price: 517.93,
      change: 9.48,
      changePercent: 1.86,
    },
    {
      symbol: "IBM",
      name: "IBM Corp.",
      price: 266.4,
      change: 1.4,
      changePercent: 0.53,
    },
  ];

  const forexWatchlist: WatchlistItem[] = [
    {
      symbol: "EUR",
      name: "Euro",
      price: 1.1744,
      change: -0.00411,
      changePercent: -0.35,
    },
  ];

  const currentWatchlist =
    activeTab === "STOCKS" ? stockWatchlist : forexWatchlist;

  return (
    <div
      className={`w-80 ${
        isDarkMode
          ? "bg-slate-900 border-slate-700 text-white"
          : "bg-white border-gray-200 text-gray-900"
      } border-l transition-colors duration-200`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          isDarkMode ? "border-slate-700" : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Watchlist</h3>
          <button
            className={`text-${
              isDarkMode
                ? "slate-400 hover:text-white"
                : "gray-500 hover:text-gray-900"
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab("STOCKS")}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === "STOCKS"
                ? isDarkMode
                  ? "bg-slate-700 text-white"
                  : "bg-blue-100 text-blue-700"
                : isDarkMode
                ? "text-slate-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            STOCKS
          </button>
          <button
            onClick={() => setActiveTab("FOREX")}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === "FOREX"
                ? isDarkMode
                  ? "bg-slate-700 text-white"
                  : "bg-blue-100 text-blue-700"
                : isDarkMode
                ? "text-slate-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            FOREX
          </button>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        {/* Column Headers */}
        <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs text-slate-400 border-b border-slate-700">
          <span>Symbol</span>
          <span className="text-right">Last</span>
          <span className="text-right">Chg</span>
          <span className="text-right">Chg%</span>
        </div>

        {/* Watchlist Items */}
        {currentWatchlist.map((item) => (
          <div
            key={item.symbol}
            onClick={() => onSymbolSelect(item.symbol)}
            className={`grid grid-cols-3 gap-2 px-4 py-3 text-xs cursor-pointer hover:bg-slate-800 transition-colors border-b border-slate-800 ${
              selectedSymbol === item.symbol ? "bg-slate-800" : ""
            }`}
          >
            {/* Symbol and Name */}
            <div className="flex flex-col">
              <span className="font-semibold text-white">{item.symbol}</span>
              <span className="text-slate-400 text-xs truncate">
                {item.name}
              </span>
            </div>

            {/* Price */}
            <div className="text-right">
              <span className="text-white font-mono">
                {item.price.toFixed(2)}
              </span>
            </div>

            {/* Change and Percentage */}
            <div className="text-right">
              <div
                className={`flex items-center justify-end ${
                  item.change >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {item.change >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                <span className="font-mono">
                  {item.change >= 0 ? "+" : ""}
                  {item.change.toFixed(2)}
                </span>
              </div>
              <div
                className={`text-xs ${
                  item.changePercent >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {item.changePercent >= 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}

        {/* Selected Stock Details */}
        {activeTab === "STOCKS" &&
          (selectedSymbol === "AAPL" || selectedSymbol === "FUESSV30.HM") && (
            <div className="p-4 border-t border-slate-700">
              <div className="mb-2">
                <h4 className="font-semibold text-lg">{selectedSymbol}</h4>
                <p className="text-slate-400 text-xs">
                  {selectedSymbol === "AAPL"
                    ? "Apple Inc. • NASDAQ"
                    : "Future ESG VN30 ETF • HCMC"}
                </p>
              </div>

              <div className="mb-3">
                <span className="text-2xl font-bold text-white">
                  {selectedSymbol === "AAPL" ? "245.50" : "245.30"}
                </span>
                <div
                  className={`flex items-center text-sm ${
                    selectedSymbol === "AAPL"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {selectedSymbol === "AAPL" ? (
                    <>
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span>+7.62 +3.20%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 mr-1" />
                      <span>-0.28 -0.11%</span>
                    </>
                  )}
                </div>
                <p className="text-slate-400 text-xs">Market closed</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">DAY'S RANGE</span>
                  <div className="text-white font-mono">
                    <span>
                      {selectedSymbol === "AAPL" ? "240.21" : "242.50"}
                    </span>
                    <span className="mx-2">—</span>
                    <span>
                      {selectedSymbol === "AAPL" ? "246.30" : "246.30"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* News Section */}
      <div className="border-t border-slate-700 p-4">
        <h4 className="font-semibold mb-3">Top News Stories</h4>
        <div className="space-y-3">
          <div className="text-xs border-b border-slate-800 pb-2">
            <p className="text-slate-400 mb-1">08:40 • Sep 20 • TradingView</p>
            <p className="text-white leading-relaxed">
              Natera Executive Chairman Matthew Rabinowitz Sells 50,000 Shares
            </p>
          </div>
          <div className="text-xs border-b border-slate-800 pb-2">
            <p className="text-slate-400 mb-1">07:30 • Sep 20 • Bloomberg</p>
            <p className="text-white leading-relaxed">
              Vietnam ETF Shows Strong Performance Despite Market Volatility
            </p>
          </div>
          <div className="text-xs">
            <p className="text-slate-400 mb-1">06:15 • Sep 20 • Reuters</p>
            <p className="text-white leading-relaxed">
              Asian Markets Rally on Fed Rate Cut Expectations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
