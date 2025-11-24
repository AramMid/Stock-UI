"use client";
import RightSidebar from "./RightSidebar";

interface WatchlistSectionProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  isDarkMode: boolean;
}

export default function WatchlistSection({
  selectedSymbol,
  onSymbolSelect,
  isDarkMode,
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
      />
    </div>
  );
}
