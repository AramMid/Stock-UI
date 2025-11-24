"use client";
import React, { useState, useRef, useCallback } from "react";
import { Plus, X, Settings, ChevronDown } from "lucide-react";
import { Timeframe } from "@/lib/types";
import ChartLayoutSelector, { ChartLayout } from "./ChartLayoutSelector";

interface ChartTab {
  id: string;
  name: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: "candlestick" | "line" | "area";
  indicators: string[];
  isActive: boolean;
  layout: ChartLayout;
}

interface MultiTabChartLayoutProps {
  isDarkMode?: boolean;
  onTabChange?: (tabId: string) => void;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  children?: React.ReactNode;
}

/**
 * Multi-Tab Chart Layout Component
 * Task #2: Nút tạo biểu đồ mới (+) & Task #6: Chọn layout nhiều biểu đồ
 */
export default function MultiTabChartLayout({
  isDarkMode = true,
  onTabChange,
  onSymbolChange,
  onTimeframeChange,
  children,
}: MultiTabChartLayoutProps) {
  const [tabs, setTabs] = useState<ChartTab[]>([
    {
      id: "tab-1",
      name: "VIC.VN",
      symbol: "VIC.VN",
      timeframe: "1D",
      chartType: "candlestick",
      indicators: [],
      isActive: true,
      layout: "single",
    },
  ]);

  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Get the active tab
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];

  // Create a new tab
  const createNewTab = useCallback(() => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: ChartTab = {
      id: newTabId,
      name: `Chart ${tabs.length + 1}`,
      symbol: "VIC.VN",
      timeframe: "1D",
      chartType: "candlestick",
      indicators: [],
      isActive: false,
      layout: "single",
    };

    setTabs((prev) => [
      ...prev.map((tab) => ({ ...tab, isActive: false })),
      { ...newTab, isActive: true },
    ]);

    onTabChange?.(newTabId);
  }, [tabs.length, onTabChange]);

  // Switch to tab
  const switchToTab = useCallback(
    (tabId: string) => {
      setTabs((prev) =>
        prev.map((tab) => ({
          ...tab,
          isActive: tab.id === tabId,
        }))
      );
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  // Close tab
  const closeTab = useCallback(
    (tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();

      if (tabs.length === 1) {
        // Don't close the last tab, just reset it
        setTabs([
          {
            id: "tab-1",
            name: "VIC.VN",
            symbol: "VIC.VN",
            timeframe: "1D",
            chartType: "candlestick",
            indicators: [],
            isActive: true,
            layout: "single",
          },
        ]);
        return;
      }

      const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
      const isActiveTab = tabs[tabIndex]?.isActive;

      setTabs((prev) => {
        const newTabs = prev.filter((tab) => tab.id !== tabId);

        // If we closed the active tab, activate the previous or next tab
        if (isActiveTab && newTabs.length > 0) {
          const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
          newTabs[newActiveIndex].isActive = true;
          onTabChange?.(newTabs[newActiveIndex].id);
        }

        return newTabs;
      });
    },
    [tabs, onTabChange]
  );

  // Update tab properties
  const updateTab = useCallback((tabId: string, updates: Partial<ChartTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
    );
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback(
    (layout: ChartTab["layout"]) => {
      if (activeTab) {
        updateTab(activeTab.id, { layout });
      }
      setShowLayoutSelector(false);
    },
    [activeTab, updateTab]
  );

  // Render chart based on layout
  const renderChartContent = () => {
    if (!activeTab) return children;

    const { layout } = activeTab;

    switch (layout) {
      case "2x1":
        return (
          <div className="grid grid-cols-2 gap-2 h-full">
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
          </div>
        );

      case "2x2":
        return (
          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
          </div>
        );

      case "3x1":
        return (
          <div className="grid grid-cols-3 gap-2 h-full">
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
          </div>
        );

      case "1x3":
        return (
          <div className="grid grid-rows-3 gap-2 h-full">
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
            <div
              className={`rounded border transition-colors duration-300 ${
                isDarkMode
                  ? "bg-[#131722] border-[#2a2e39]"
                  : "bg-white border-gray-200"
              }`}
            >
              {children}
            </div>
          </div>
        );

      default:
        return children;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div
        className={`flex items-center border-b px-2 py-1 transition-colors duration-300 ${
          isDarkMode
            ? "bg-[#131722] border-[#2a2e39]"
            : "bg-[#f8fafc] border-gray-200"
        }`}
      >
        {/* Tabs Container */}
        <div
          ref={tabsContainerRef}
          className="flex items-center space-x-1 flex-1 overflow-x-auto scrollbar-thin"
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => switchToTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors duration-300 group min-w-0 ${
                tab.isActive
                  ? isDarkMode
                    ? "bg-[#1e222d] border-t border-l border-r border-[#2a2e39] text-white"
                    : "bg-white border-t border-l border-r border-gray-200 text-gray-900"
                  : isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-[#1e222d]/50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {/* Tab Name */}
              <span className="text-sm font-medium truncate max-w-24">
                {tab.name}
              </span>

              {/* Tab Layout Indicator */}
              {tab.layout !== "single" && (
                <span
                  className={`text-xs px-1 rounded ${
                    isDarkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {tab.layout === "2x1"
                    ? "⬛⬛"
                    : tab.layout === "2x2"
                    ? "⬛⬛\n⬛⬛"
                    : tab.layout === "3x1"
                    ? "⬛⬛⬛"
                    : tab.layout === "1x3"
                    ? "⬛\n⬛\n⬛"
                    : "📊"}
                </span>
              )}

              {/* Close Button */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDarkMode
                      ? "text-gray-400 hover:text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Tab Actions */}
        <div className="flex items-center space-x-2 ml-2">
          {/* Enhanced Layout Selector */}
          <ChartLayoutSelector
            currentLayout={activeTab?.layout || "single"}
            onLayoutChange={handleLayoutChange}
            isDarkMode={isDarkMode}
          />

          {/* New Tab Button */}
          <button
            onClick={createNewTab}
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-800"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            title="Create New Chart Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Content Area */}
      <div className="flex-1 overflow-hidden p-2">{renderChartContent()}</div>
    </div>
  );
}
