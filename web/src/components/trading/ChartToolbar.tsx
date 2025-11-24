"use client";
import { useState } from "react";
import {
  Plus,
  BarChart3,
  TrendingUp,
  RotateCcw,
  RotateCw,
  Camera,
  Search,
  Settings,
  Maximize,
  FileText,
  ChevronDown,
  Grid3X3,
  Eye,
} from "lucide-react";
import { Timeframe } from "@/lib/types";

interface ChartToolbarProps {
  symbol: string;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function ChartToolbar({
  symbol,
  timeframe,
  onTimeframeChange,
  isDarkMode = true,
  onToggleDarkMode,
}: ChartToolbarProps) {
  const [showIndicators, setShowIndicators] = useState(false);

  const timeframes = [
    { label: "5y", value: "5Y" as Timeframe },
    { label: "1y", value: "1Y" as Timeframe },
    { label: "6m", value: "6M" as Timeframe },
    { label: "3m", value: "3M" as Timeframe },
    { label: "1m", value: "1M" as Timeframe },
    { label: "5d", value: "5D" as Timeframe },
    { label: "1d", value: "1D" as Timeframe },
    { label: "1h", value: "1H" as Timeframe },
  ];

  return (
    <div
      className={`border-b px-4 py-2 flex items-center justify-between text-sm transition-colors duration-200 ${
        isDarkMode
          ? "bg-slate-900 border-slate-700 text-white"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      {/* Left Section - Symbol, Timeframes, Chart Type */}
      <div className="flex items-center space-x-6">
        {/* Symbol with Search Icon */}
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-base">{symbol}</span>
          <button
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center space-x-1">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                timeframe === tf.value
                  ? isDarkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Chart Type Selector */}
        <div className="flex items-center space-x-3">
          <button
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>

        {/* Drawing Tools */}
        <button
          className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
            isDarkMode
              ? "text-slate-400 hover:text-white hover:bg-slate-700"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      {/* Center Section - Indicators */}
      <div className="flex items-center space-x-4">
        {/* Indicators Button */}
        <button
          onClick={() => setShowIndicators(!showIndicators)}
          className={`flex items-center space-x-2 px-3 py-1 rounded transition-colors ${
            isDarkMode
              ? "text-slate-300 hover:text-white hover:bg-slate-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Indicators</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Additional Tools */}
        <div className="flex items-center space-x-2">
          <button
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Section - Actions and Toggle */}
      <div className="flex items-center space-x-4">
        {/* Save Dropdown */}
        <div className="flex items-center space-x-2">
          <input type="checkbox" className="rounded" />
          <button
            className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
              isDarkMode
                ? "text-slate-300 hover:text-white hover:bg-slate-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <span>Save</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded transition-colors ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs ${
              isDarkMode ? "text-slate-300" : "text-gray-600"
            }`}
          >
            Dark Mode
          </span>
          <button
            onClick={onToggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isDarkMode ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                isDarkMode ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Documentation Button */}
        <button className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
          Documentation
        </button>
      </div>

      {/* Indicators Dropdown */}
      {showIndicators && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4 min-w-80">
          <h3 className="text-sm font-semibold mb-3">Technical Indicators</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              "Moving Average",
              "RSI",
              "MACD",
              "Bollinger Bands",
              "Stochastic",
              "Williams %R",
              "CCI",
              "ADX",
            ].map((indicator) => (
              <label
                key={indicator}
                className="flex items-center space-x-2 text-xs"
              >
                <input type="checkbox" className="accent-blue-500" />
                <span>{indicator}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => setShowIndicators(false)}
            className="mt-3 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
