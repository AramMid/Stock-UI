"use client";
import { useState } from "react";
import {
  Search,
  TrendingUp,
  BarChart3,
  Zap,
  Settings,
  Grid3X3,
  PenTool,
  Move,
  Target,
  History,
} from "lucide-react";

interface TradingSidebarProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  isDarkMode?: boolean;
}

export default function TradingSidebar({
  selectedSymbol,
  onSymbolChange,
  isDarkMode = true,
}: TradingSidebarProps) {
  const [searchValue, setSearchValue] = useState("");

  const toolIcons = [
    { icon: Move, label: "Crosshair", active: false },
    { icon: TrendingUp, label: "Trend Line", active: false },
    { icon: BarChart3, label: "Chart", active: true },
    { icon: Grid3X3, label: "Grid", active: false },
    { icon: PenTool, label: "Draw", active: false },
    { icon: Target, label: "Targets", active: false },
    { icon: Zap, label: "Alerts", active: false },
    { icon: History, label: "History", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  return (
    <div
      className={`w-12 ${
        isDarkMode
          ? "bg-slate-900 border-slate-700"
          : "bg-white border-gray-200"
      } border-r flex flex-col transition-colors duration-200`}
    >
      {/* Symbol Search */}
      <div
        className={`p-2 border-b ${
          isDarkMode ? "border-slate-700" : "border-gray-200"
        }`}
      >
        <div className="relative">
          <Search
            className={`w-4 h-4 ${
              isDarkMode ? "text-slate-400" : "text-gray-500"
            } absolute left-2 top-2`}
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="AAPL"
            className={`w-full ${
              isDarkMode
                ? "bg-slate-800 border-slate-600 text-white"
                : "bg-gray-100 border-gray-300 text-gray-900"
            } text-xs pl-8 pr-2 py-1.5 rounded-md border focus:border-blue-500 focus:outline-none transition-colors`}
          />
        </div>
      </div>

      {/* Tool Icons */}
      <div className="flex-1 py-2">
        {toolIcons.map((tool, index) => {
          const IconComponent = tool.icon;
          return (
            <button
              key={index}
              className={`w-full h-10 flex items-center justify-center hover:${
                isDarkMode ? "bg-slate-800" : "bg-gray-100"
              } transition-colors rounded-md ${
                tool.active
                  ? isDarkMode
                    ? "bg-slate-700 text-blue-400"
                    : "bg-blue-100 text-blue-600"
                  : isDarkMode
                  ? "text-slate-400"
                  : "text-gray-500"
              }`}
              title={tool.label}
            >
              <IconComponent className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div
        className={`p-2 border-t ${
          isDarkMode ? "border-slate-700" : "border-gray-200"
        }`}
      >
        <button
          className={`w-full h-8 flex items-center justify-center ${
            isDarkMode
              ? "text-slate-400 hover:bg-slate-800"
              : "text-gray-500 hover:bg-gray-100"
          } rounded-md transition-colors`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
