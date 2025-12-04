"use client";
import RightSidebar from "./RightSidebar";

interface WatchlistSectionProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  isDarkMode: boolean;
  positions?: Map<string, number>; // symbol -> quantity mapping
}

export default function WatchlistSection({
  selectedSymbol,
  onSymbolSelect,
  isDarkMode,
  positions = new Map(),
}: WatchlistSectionProps) {
  return (
    <div
      className={`border rounded overflow-hidden h-full transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#131722] border-[#2a2e39]"
          : "bg-white border-gray-200"
      }`}
    >
      <RightSidebar
        selectedSymbol={selectedSymbol}
        onSymbolSelect={onSymbolSelect}
        isDarkMode={isDarkMode}
        positions={positions}
      />
    </div>
  );
}
