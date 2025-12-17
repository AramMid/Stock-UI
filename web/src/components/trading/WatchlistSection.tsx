"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, ChevronDown } from "lucide-react";
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
  position?: number; // shares
}

interface RightSidebarProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  isDarkMode?: boolean;
  positions?: Map<string, number>;
  isPrivateMode?: boolean;
  marketSimulation?: MarketSimulationService;
}

function formatShares(n: number) {
  // Display whole numbers without decimal places, otherwise show 2 decimal places
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function RightSidebar({
  selectedSymbol,
  onSymbolSelect,
  isDarkMode = true,
  positions = new Map(),
  isPrivateMode = false,
  marketSimulation,
}: RightSidebarProps) {
  // Debug log to see what positions are being passed
  // Positions data is now available in the component

  const [stocksExpanded, setStocksExpanded] = useState(true);
  const [forexExpanded, setForexExpanded] = useState(true);

  const stockSymbols = useMemo(
    () => [
      "VIC.VN",
      "VHM.VN",
      "VCB.VN",
      "TCB.VN",
      "FPT.VN",
      "VNM.VN",
      "HPG.VN",
      "MSN.VN",
    ],
    []
  );

  const forexSymbols = useMemo(
    () => ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"],
    []
  );

  const getMarketSimulation = useCallback(
    () => marketSimulation || null,
    [marketSimulation]
  );

  const { marketData: stockMarketData, loading: stockLoading } = useMarketData(
    stockSymbols,
    getMarketSimulation
  );
  const { marketData: forexMarketData, loading: forexLoading } = useMarketData(
    forexSymbols,
    getMarketSimulation
  );

  const stockStaticData: Record<string, { name: string; category: "STOCKS" }> =
    {
      "VIC.VN": { name: "Vingroup JSC", category: "STOCKS" },
      "VHM.VN": { name: "Vinhomes JSC", category: "STOCKS" },
      "VCB.VN": { name: "Vietcombank", category: "STOCKS" },
      "TCB.VN": { name: "Techcombank", category: "STOCKS" },
      "FPT.VN": { name: "FPT Corporation", category: "STOCKS" },
      "VNM.VN": { name: "Vinamilk", category: "STOCKS" },
      "HPG.VN": { name: "Hoa Phat Steel", category: "STOCKS" },
      "MSN.VN": { name: "Masan Group", category: "STOCKS" },
    };

  const forexStaticData: Record<string, { name: string; category: "FOREX" }> = {
    EURUSD: { name: "Euro / US Dollar", category: "FOREX" },
    GBPUSD: { name: "British Pound / US Dollar", category: "FOREX" },
    USDJPY: { name: "US Dollar / Japanese Yen", category: "FOREX" },
    AUDUSD: { name: "Australian Dollar / US Dollar", category: "FOREX" },
  };

  const stockWatchlist: WatchlistItem[] = stockSymbols.map((symbol) => {
    const staticData = stockStaticData[symbol];
    const marketData = stockMarketData[symbol];
    const position = positions.get(symbol) || 0;

    // Processing symbol with position data
    if (symbol === "VIC.VN") {
      // VIC.VN specific debug data processing
    }

    return {
      symbol,
      name: staticData?.name || symbol,
      price: marketData?.price || 0,
      change: marketData?.change || 0,
      changePercent: marketData?.changePercent || 0,
      category: "STOCKS",
      position,
    };
  });

  const forexWatchlist: WatchlistItem[] = forexSymbols.map((symbol) => {
    const staticData = forexStaticData[symbol];
    const marketData = forexMarketData[symbol];
    const position = positions.get(symbol) || 0;

    // Processing forex symbol with position data

    return {
      symbol,
      name: staticData?.name || symbol,
      price: marketData?.price || 0,
      change: marketData?.change || 0,
      changePercent: marketData?.changePercent || 0,
      category: "FOREX",
      position,
    };
  });

  const Row = ({ item }: { item: WatchlistItem }) => {
    const active = selectedSymbol === item.symbol;
    const up = item.change >= 0;

    const priceText = item.symbol.endsWith(".VN")
      ? formatVND(item.price)
      : item.price.toFixed(item.category === "FOREX" ? 5 : 2);

    const changeText = item.symbol.endsWith(".VN")
      ? formatVND(item.change)
      : item.change.toFixed(item.category === "FOREX" ? 5 : 2);

    const bg = active
      ? isDarkMode
        ? "bg-[#1e222d]"
        : "bg-blue-50"
      : isDarkMode
      ? "hover:bg-[#1a1f2a]"
      : "hover:bg-gray-50";

    return (
      <button
        onClick={() => onSymbolSelect(item.symbol)}
        className={`w-full text-left px-3 py-2 ${bg} transition-colors border-b ${
          isDarkMode ? "border-[#202634]" : "border-gray-100"
        }`}
      >
        {/* GRID 4 CỘT: Symbol | Shares | Price | Change */}
        <div className="grid grid-cols-[1.25fr_.95fr_1fr_1.25fr] gap-2 items-center">
          {/* Symbol */}
          <div className="min-w-0 flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white ${
                item.category === "STOCKS" ? "bg-blue-600" : "bg-emerald-600"
              }`}
            >
              {item.category === "STOCKS"
                ? item.symbol.charAt(0)
                : item.symbol.slice(0, 2)}
            </div>

            <div className="min-w-0">
              <div
                className={`truncate font-semibold text-[12px] ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {item.symbol}
              </div>
              <div
                className={`truncate text-[11px] ${
                  isDarkMode ? "text-[#7f8898]" : "text-gray-500"
                }`}
              >
                {item.name}
              </div>
            </div>
          </div>

          {/* Shares (RÕ RÀNG) */}
          <div className="text-right">
            <div
              className={`font-mono font-semibold text-[12px] ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {formatShares(item.position ?? 0)}
            </div>
            <div
              className={`text-[11px] ${
                isDarkMode ? "text-[#7f8898]" : "text-gray-500"
              }`}
            >
              Shares
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            <div
              className={`font-mono font-semibold text-[12px] ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {priceText}
            </div>
            <div
              className={`text-[11px] ${
                isDarkMode ? "text-[#7f8898]" : "text-gray-500"
              }`}
            >
              Price
            </div>
          </div>

          {/* Change */}
          <div className="text-right">
            <div
              className={`font-mono font-semibold text-[12px] ${
                up ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {up ? "+" : ""}
              {changeText}
              <span className="ml-2 text-[11px]">
                ({up ? "+" : ""}
                {item.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div
              className={`text-[11px] ${
                isDarkMode ? "text-[#7f8898]" : "text-gray-500"
              }`}
            >
              Change
            </div>
          </div>
        </div>
      </button>
    );
  };

  const Section = ({
    title,
    expanded,
    onToggle,
    loading,
    items,
  }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    loading: boolean;
    items: WatchlistItem[];
  }) => {
    return (
      <div
        className={`border-b ${
          isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
        }`}
      >
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${
            isDarkMode ? "hover:bg-[#1a1f2a]" : "hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold tracking-wider ${
                isDarkMode ? "text-[#b7bfcc]" : "text-gray-600"
              }`}
            >
              {title}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                isDarkMode
                  ? "bg-[#1e222d] text-[#9aa4b2]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {items.length}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {expanded && (
          <div
            className={`${
              isDarkMode ? "bg-[#131722]" : "bg-white"
            } max-h-[380px] overflow-y-auto`}
          >
            {loading ? (
              <div
                className={`px-3 py-3 text-center text-[12px] ${
                  isDarkMode ? "text-[#7f8898]" : "text-gray-500"
                }`}
              >
                Loading...
              </div>
            ) : (
              items.map((it) => <Row key={it.symbol} item={it} />)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`w-full h-full flex flex-col ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}
    >
      {/* Header */}
      <div
        className={`border-b px-3 py-3 ${
          isDarkMode ? "border-[#2a2e39]" : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`font-semibold text-sm ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Watchlist
          </h3>

          <div className="flex items-center gap-2">
            <select
              className={`border rounded px-2 py-1 text-xs ${
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
              className={`${
                isDarkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Add symbol"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Column hint (nhẹ, gọn) */}
        <div
          className={`mt-2 grid grid-cols-[1.25fr_.95fr_1fr_1.25fr] gap-2 text-[11px] ${
            isDarkMode ? "text-[#7f8898]" : "text-gray-500"
          }`}
        >
          <div>Symbol</div>
          <div className="text-right">Shares</div>
          <div className="text-right">Price</div>
          <div className="text-right">Change</div>
        </div>
      </div>

      {/* Sections */}
      <Section
        title="STOCKS"
        expanded={stocksExpanded}
        onToggle={() => setStocksExpanded((s) => !s)}
        loading={stockLoading}
        items={stockWatchlist}
      />

      <Section
        title="FOREX"
        expanded={forexExpanded}
        onToggle={() => setForexExpanded((s) => !s)}
        loading={forexLoading}
        items={forexWatchlist}
      />
    </div>
  );
}
