"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { formatVND } from "@/lib/order-management";
import { useMarketData } from "@/lib/hooks/useMarketData";
import { MarketSimulationService } from "@/lib/services/marketSimulationService";

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: "STOCKS" | "FOREX" | "CRYPTO";
  position?: number; // User's position (number of shares owned)
}

interface RightSidebarProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  isDarkMode?: boolean;
  positions?: Map<string, number>; // symbol -> quantity mapping
  isPrivateMode?: boolean; // Thêm isPrivateMode vào props
  marketSimulation?: MarketSimulationService; // Add market simulation service
}

export default function RightSidebar({
  selectedSymbol,
  onSymbolSelect,
  isDarkMode = true,
  positions = new Map(),
  isPrivateMode = false, // Mặc định là false
  marketSimulation
}: RightSidebarProps) {
  const [stocksExpanded, setStocksExpanded] = useState(true);
  const [forexExpanded, setForexExpanded] = useState(true);

  // Define the symbols we want to track - memoized to prevent re-renders
  const stockSymbols = useMemo(() => [
    "VIC.VN", "VHM.VN", "VCB.VN", "TCB.VN", 
    "FPT.VN", "VNM.VN", "HPG.VN", "MSN.VN"
  ], []);
  
  const forexSymbols = useMemo(() => [
    "EURUSD", "GBPUSD", "USDJPY", "AUDUSD"
  ], []);

  // Getter function for market simulation service
  const getMarketSimulation = useCallback(() => {
    return marketSimulation || null;
  }, [marketSimulation]);

  // Use the market data hook
  const { marketData: stockMarketData, loading: stockLoading } = useMarketData(stockSymbols, getMarketSimulation);
  const { marketData: forexMarketData, loading: forexLoading } = useMarketData(forexSymbols, getMarketSimulation);

  // Static data for names and categories (in a real app, this would come from an API too)
  const stockStaticData: Record<string, { name: string; category: "STOCKS" }> = {
    "VIC.VN": { 
      name: "Vingroup JSC", 
      category: "STOCKS",
    },
    "VHM.VN": { 
      name: "Vinhomes JSC", 
      category: "STOCKS",
    },
    "VCB.VN": { 
      name: "Vietcombank", 
      category: "STOCKS",
    },
    "TCB.VN": { 
      name: "Techcombank", 
      category: "STOCKS",
    },
    "FPT.VN": { 
      name: "FPT Corporation", 
      category: "STOCKS",
    },
    "VNM.VN": { 
      name: "Vinamilk", 
      category: "STOCKS",
    },
    "HPG.VN": { 
      name: "Hoa Phat Steel", 
      category: "STOCKS",
    },
    "MSN.VN": { 
      name: "Masan Group", 
      category: "STOCKS",
    },
  };

  const forexStaticData: Record<string, { name: string; category: "FOREX" }> = {
    "EURUSD": { name: "Euro / US Dollar", category: "FOREX" },
    "GBPUSD": { name: "British Pound / US Dollar", category: "FOREX" },
    "USDJPY": { name: "US Dollar / Japanese Yen", category: "FOREX" },
    "AUDUSD": { name: "Australian Dollar / US Dollar", category: "FOREX" }
  };

  const renderWatchlistItems = (items: WatchlistItem[]) => {
    return items.map((item) => (
      <div
        key={item.symbol}
        onClick={() => onSymbolSelect(item.symbol)}
        className={`grid grid-cols-6 gap-2 px-3 py-2 cursor-pointer transition-colors text-xs ${
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
        <div className="col-span-2 flex items-center space-x-1">
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

        {/* Position (shares owned) */}
        <div
          className={`text-right font-mono transition-colors duration-200 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {item.position !== undefined && item.position > 0 ? item.position : "-"}
        </div>

        {/* Price */}
        <div
          className={`text-right font-mono transition-colors duration-200 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {item.symbol.endsWith(".VN")
            ? formatVND(item.price)
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
            ? formatVND(item.change)
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

  // Render watchlist items with price bands for Vietnamese stocks
  const renderWatchlistItemsWithBands = (items: WatchlistItem[]) => {
    return items.map((item) => (
      <div
        key={item.symbol}
        onClick={() => onSymbolSelect(item.symbol)}
        className={`px-3 py-2 cursor-pointer transition-colors text-xs ${
          isDarkMode ? "hover:bg-[#1e222d]" : "hover:bg-gray-50"
        } ${
          selectedSymbol === item.symbol
            ? isDarkMode
              ? "bg-[#1e222d]"
              : "bg-blue-50"
            : ""
        }`}
      >
        <div className="grid grid-cols-12 gap-2">
          {/* Symbol with flag/icon and position */}
          <div className="col-span-3 flex items-center space-x-1">
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
            <div className="flex flex-col">
              <span
                className={`font-medium truncate transition-colors duration-200 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {item.symbol}
              </span>
              {item.position !== undefined && item.position > 0 && (
                <span className="text-xs text-gray-500">
                  Pos: {item.position}
                </span>
              )}
            </div>
          </div>

          {/* Price and Change */}
          <div className="col-span-5">
            <div className="flex items-center justify-between">
              <span
                className={`font-mono transition-colors duration-200 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {item.symbol.endsWith(".VN")
                  ? formatVND(item.price)
                  : item.price.toFixed(item.category === "FOREX" ? 5 : 2)}
              </span>
              <span
                className={`font-mono text-xs ${
                  item.change >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {item.change >= 0 ? "+" : ""}
                {item.symbol.endsWith(".VN")
                  ? formatVND(item.change)
                  : item.change.toFixed(item.category === "FOREX" ? 5 : 2)}
                <span className="ml-1">
                  ({item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Price Bands for Stocks - REMOVED as per user request to avoid static data */}
        </div>
      </div>
    ));
  };

  // Prepare stock watchlist data
  const stockWatchlist: WatchlistItem[] = stockSymbols.map(symbol => {
    const staticData = stockStaticData[symbol];
    const marketData = stockMarketData[symbol];
    const position = positions.get(symbol) || 0;
    
    return {
      symbol,
      name: staticData?.name || symbol,
      price: marketData?.price || 0,
      change: marketData?.change || 0,
      changePercent: marketData?.changePercent || 0,
      category: "STOCKS",
      position
    };
  });

  // Prepare forex watchlist data
  const forexWatchlist: WatchlistItem[] = forexSymbols.map(symbol => {
    const staticData = forexStaticData[symbol];
    const marketData = forexMarketData[symbol];
    const position = positions.get(symbol) || 0;
    
    return {
      symbol,
      name: staticData?.name || symbol,
      price: marketData?.price || 0,
      change: marketData?.change || 0,
      changePercent: marketData?.changePercent || 0,
      category: "FOREX",
      position
    };
  });

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
        <div className="grid grid-cols-12 gap-2 text-xs">
          <div className="col-span-3 font-medium">Symbol</div>
          <div className="col-span-5 font-medium">Price</div>
          <div className="col-span-4 font-medium text-right">Bands</div>
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
            className={`transition-colors duration-200 overflow-y-auto max-h-[400px] ${
              isDarkMode ? "bg-[#131722]" : "bg-white"
            }`}
          >
            {stockLoading ? (
              <div className="px-3 py-2 text-center text-gray-500">
                Loading...
              </div>
            ) : (
              renderWatchlistItemsWithBands(stockWatchlist)
            )}
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
            className={`transition-colors duration-200 overflow-y-auto max-h-[300px] ${
              isDarkMode ? "bg-[#131722]" : "bg-white"
            }`}
          >
            {forexLoading ? (
              <div className="px-3 py-2 text-center text-gray-500">
                Loading...
              </div>
            ) : (
              renderWatchlistItems(forexWatchlist)
            )}
          </div>
        )}
      </div>
    </div>
  );
}