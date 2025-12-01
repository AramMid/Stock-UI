"use client";
import { useState } from "react";
import { TradingPosition } from "@/lib/types";

interface AccountManagerSectionProps {
  tradingPosition: TradingPosition;
  isDarkMode: boolean;
  isDragging: boolean;
  isAccountCollapsed: boolean;
  isAccountMaximized: boolean;
  chartAccountSplit: number;
  onCollapsePanel: () => void;
  onOpenPanel: () => void;
  onMaximizePanel: () => void;
  onRestorePanel: () => void;
}

export default function AccountManagerSection({
  tradingPosition,
  isDarkMode,
  isDragging,
  isAccountCollapsed,
  isAccountMaximized,
  chartAccountSplit,
  onCollapsePanel,
  onOpenPanel,
  onMaximizePanel,
  onRestorePanel,
}: AccountManagerSectionProps) {
  const [activeTab, setActiveTab] = useState("Positions");

  const tabs = [
    "Positions",
    "Orders",
    "Order History",
    "Balance History",
    "Trading Journal",
  ];

  const metrics = [
    { label: "Account Balance", value: "100,000.00" },
    { label: "Equity", value: "100,000.00" },
    { label: "Realized P&L", value: "0.00" },
    { label: "Unrealized P&L", value: "0.00" },
    { label: "Account margin", value: "0.00", info: true },
    { label: "Available funds", value: "100,000.00", info: true },
    { label: "Orders margin", value: "0.00", info: true },
  ];

  return (
    <div
      className={`border rounded overflow-hidden relative flex flex-col transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#131722] border-[#2a2e39]"
          : "bg-white border-gray-200"
      }`}
      style={{
        willChange: isDragging ? "height" : "auto",
        transform: "translateZ(0)",
        height: "100%",
      }}
    >
      {/* --- HEADER SECTION (Removed Paper Trading) --- */}
      <div
        className={`flex-none flex items-center justify-between px-4 py-3 border-b select-none ${
          isDarkMode
            ? "border-[#2a2e39] text-[#d1d4dc]"
            : "border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <span>vuvuihoc123 USD</span>
          </div>
           {/* Settings Icon */}
           <div className="cursor-pointer hover:text-blue-500 ml-2">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7L2 17L12 22L22 17L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          {!isAccountCollapsed && chartAccountSplit < 90 && (
            <button onClick={onCollapsePanel} className={`p-1.5 rounded hover:bg-gray-700/50 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"></polyline></svg>
            </button>
          )}
          {isAccountCollapsed && (
            <button onClick={onOpenPanel} className={`p-1.5 rounded hover:bg-gray-700/50 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18,15 12,9 6,15"></polyline></svg>
            </button>
          )}
          <button onClick={isAccountMaximized ? onRestorePanel : onMaximizePanel} className={`p-1.5 rounded hover:bg-gray-700/50 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
             {isAccountMaximized ? (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4,14 10,14 10,20"></polyline>
                <polyline points="20,10 14,10 14,4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,3 21,3 21,9"></polyline>
                <polyline points="9,21 3,21 3,15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      {!isAccountCollapsed && (
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* 1. Metrics Row - Giữ nguyên layout thoáng */}
          <div className={`flex-none px-4 py-4 border-b ${isDarkMode ? "border-[#2a2e39]" : "border-gray-200"}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {metrics.map((metric, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className={`flex items-center gap-1 text-xs font-normal ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {metric.label}
                    {metric.info && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cursor-help opacity-70 hover:opacity-100">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                    )}
                  </div>
                  <div className={`font-medium text-[14px] tracking-wide ${isDarkMode ? "text-white" : "text-gray-900"}`}>{metric.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Navigation Tabs */}
          <div className={`flex-none flex items-center px-4 border-b gap-6 ${isDarkMode ? "border-[#2a2e39]" : "border-gray-200"}`}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  relative py-3 text-sm font-medium transition-colors select-none
                  ${
                    activeTab === tab
                      ? (isDarkMode ? "text-[#2962ff]" : "text-blue-600")
                      : (isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700")
                  }
                `}
              >
                {tab}
                {activeTab === tab && (
                  <div className={`absolute bottom-0 left-0 w-full h-[2px] ${isDarkMode ? "bg-[#2962ff]" : "bg-blue-600"}`} />
                )}
              </button>
            ))}
          </div>

          {/* 3. Table Content Area - Container */}
          <div className="flex-1 overflow-hidden relative">
            {/* Removed BottomPanel since we're removing demo account functionality */}
          </div>
        </div>
      )}
    </div>
  );
}