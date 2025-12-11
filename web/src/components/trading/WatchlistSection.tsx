"use client";
import RightSidebar from "./RightSidebar";
import { MarketSimulationService } from "@/lib/services/marketSimulationService";

interface WatchlistSectionProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  isDarkMode: boolean;
  positions?: Map<string, number>; // symbol -> quantity mapping
  isPrivateMode?: boolean; // Thêm isPrivateMode vào props
  marketSimulation?: MarketSimulationService; // Add market simulation service
}

export default function WatchlistSection({
  selectedSymbol,
  onSymbolSelect,
  isDarkMode,
  positions = new Map(),
  isPrivateMode = false, // Mặc định là false
  marketSimulation
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
        isPrivateMode={isPrivateMode} // Truyền isPrivateMode vào RightSidebar
        marketSimulation={marketSimulation} // Truyền marketSimulation vào RightSidebar
      />
    </div>
  );
}