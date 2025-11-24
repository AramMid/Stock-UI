"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  BookOpen,
  Video,
  MessageCircle,
  ExternalLink,
  Search,
  ChevronRight,
  X,
  Keyboard,
  Mouse,
  Zap,
  BarChart3,
  TrendingUp,
  Settings,
  Download,
  Share2,
} from "lucide-react";

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  icon: React.ReactNode;
  keywords: string[];
  videoUrl?: string;
  externalLinks?: { label: string; url: string }[];
}

interface HelpCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  topics: HelpTopic[];
}

interface HelpSystemProps {
  isDarkMode?: boolean;
  onClose?: () => void;
  defaultTopic?: string;
  enableKeyboardShortcuts?: boolean;
}

// Help content data
const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: <BookOpen className="w-5 h-5" />,
    topics: [
      {
        id: "overview",
        title: "Platform Overview",
        description: "Learn the basics of the trading platform",
        content: `
# Platform Overview

Welcome to the Advanced Trading Platform! This guide will help you get started with all the features.

## Main Components

### 1. Top Navigation
- **Symbol Search**: Find and switch between different stocks/symbols
- **Timeframe Selector**: Change chart timeframes (1m, 5m, 1h, 1D, etc.)
- **Chart Type**: Switch between candlestick, line, and area charts
- **Indicators**: Add technical indicators like RSI, MACD, Moving Averages
- **Drawing Tools**: Draw trend lines, support/resistance levels

### 2. Chart Area
- **Main Chart**: Price action with volume
- **Indicators Panel**: RSI, MACD displayed below main chart
- **Quick Trading**: Buy/Sell buttons with current prices
- **Layout Options**: Single chart or multiple chart layouts

### 3. Sidebars
- **Left Sidebar**: Drawing tools, chart settings, templates
- **Right Sidebar**: Watchlist, stock details, news

### 4. Bottom Panel
- **Account Manager**: View positions, orders, balance
- **Trade Panel**: Place orders, manage positions

## Key Features
- Real-time data with Lightning Mode
- Multiple chart layouts (2x1, 2x2, 3x1, etc.)
- Comprehensive technical analysis tools
- Save/load chart configurations
- Cloud sync capabilities
        `,
        category: "getting-started",
        icon: <BarChart3 className="w-4 h-4" />,
        keywords: ["overview", "basic", "introduction", "platform"],
        videoUrl: "https://youtube.com/watch?v=demo",
      },
      {
        id: "navigation",
        title: "Navigation Basics",
        description: "How to navigate around the platform",
        content: `
# Navigation Basics

Learn how to efficiently navigate the trading platform.

## Mouse Navigation
- **Pan Chart**: Click and drag to move the chart
- **Zoom**: Use mouse wheel to zoom in/out
- **Crosshair**: Hold Ctrl and move mouse for precise price/time readings

## Keyboard Shortcuts
- **Space**: Toggle between cursor and crosshair
- **Ctrl + Z**: Undo last action
- **Ctrl + Y**: Redo action
- **Ctrl + S**: Save current chart
- **ESC**: Cancel current drawing tool
- **F11**: Toggle fullscreen mode

## Touch Navigation (Mobile)
- **Pinch**: Zoom in/out
- **Two-finger drag**: Pan chart
- **Long press**: Show context menu
        `,
        category: "getting-started",
        icon: <Mouse className="w-4 h-4" />,
        keywords: ["navigation", "mouse", "keyboard", "shortcuts", "touch"],
      },
    ],
  },
  {
    id: "charting",
    name: "Charting",
    icon: <TrendingUp className="w-5 h-5" />,
    topics: [
      {
        id: "chart-types",
        title: "Chart Types",
        description: "Understanding different chart visualizations",
        content: `
# Chart Types

Choose the right chart type for your analysis.

## Candlestick Charts
- **Best for**: Detailed price analysis, pattern recognition
- **Shows**: Open, High, Low, Close (OHLC) data
- **Green candles**: Price closed higher than opened (bullish)
- **Red candles**: Price closed lower than opened (bearish)

## Line Charts
- **Best for**: Trend analysis, cleaner view
- **Shows**: Only closing prices connected by lines
- **Advantages**: Less noise, clearer trends

## Area Charts
- **Best for**: Volume-weighted analysis
- **Shows**: Filled area below price line
- **Advantages**: Emphasizes price movements over time

## Volume Analysis
- Volume bars show trading activity
- Higher volume = stronger price movements
- Look for volume confirmation on breakouts
        `,
        category: "charting",
        icon: <BarChart3 className="w-4 h-4" />,
        keywords: ["chart", "candlestick", "line", "area", "volume"],
      },
      {
        id: "indicators",
        title: "Technical Indicators",
        description: "Using RSI, MACD, and other indicators",
        content: `
# Technical Indicators

Master the most important technical indicators.

## RSI (Relative Strength Index)
- **Range**: 0-100
- **Overbought**: Above 70 (potential sell signal)
- **Oversold**: Below 30 (potential buy signal)
- **Best for**: Identifying momentum reversals

## MACD (Moving Average Convergence Divergence)
- **Components**: MACD line, Signal line, Histogram
- **Buy signal**: MACD crosses above signal line
- **Sell signal**: MACD crosses below signal line
- **Divergence**: Price vs MACD direction differs

## Moving Averages
- **SMA**: Simple Moving Average
- **EMA**: Exponential Moving Average (more responsive)
- **Golden Cross**: Short MA crosses above long MA (bullish)
- **Death Cross**: Short MA crosses below long MA (bearish)

## Bollinger Bands
- **Upper band**: Resistance level
- **Lower band**: Support level
- **Squeeze**: Low volatility, breakout expected
        `,
        category: "charting",
        icon: <TrendingUp className="w-4 h-4" />,
        keywords: ["indicators", "RSI", "MACD", "moving average", "bollinger"],
      },
    ],
  },
  {
    id: "features",
    name: "Advanced Features",
    icon: <Zap className="w-5 h-5" />,
    topics: [
      {
        id: "lightning-mode",
        title: "Lightning Mode",
        description: "Real-time data streaming",
        content: `
# Lightning Mode

Get real-time market data with WebSocket connections.

## What is Lightning Mode?
Lightning Mode provides real-time streaming data updates without page refresh.

## Benefits
- **Instant updates**: Price changes appear immediately
- **Lower latency**: Direct WebSocket connection
- **Better accuracy**: No polling delays
- **Efficient**: Minimal bandwidth usage

## How to Enable
1. Click the lightning bolt icon in the top navigation
2. Icon turns yellow when active
3. Real-time updates start immediately

## Connection Status
- **Green**: Connected and receiving data
- **Yellow**: Connecting
- **Red**: Connection error
- **Gray**: Disabled

## Troubleshooting
- Check internet connection
- Disable ad blockers that might block WebSockets
- Try refreshing the page
- Contact support if issues persist
        `,
        category: "features",
        icon: <Zap className="w-4 h-4" />,
        keywords: ["lightning", "realtime", "websocket", "streaming", "live"],
      },
      {
        id: "save-load",
        title: "Save & Load Charts",
        description: "Manage your chart configurations",
        content: `
# Save & Load Charts

Save your chart setups and load them later.

## Local Storage
Charts are automatically saved to your browser's local storage.

## Manual Save
1. Set up your chart with indicators, drawings, etc.
2. Click the "Save" checkbox in top navigation
3. Enter a name for your chart configuration
4. Chart is saved with current symbol, timeframe, indicators

## Load Saved Charts
1. Click the dropdown next to "Save"
2. Select from your saved configurations
3. Chart loads with all previous settings

## Cloud Save (Premium)
- Sync charts across devices
- Share charts with others
- Backup to cloud storage
- Access from anywhere

## Export/Import
- Export charts as JSON files
- Import charts from files
- Share chart setups with others
        `,
        category: "features",
        icon: <Download className="w-4 h-4" />,
        keywords: ["save", "load", "export", "import", "cloud", "storage"],
      },
    ],
  },
];

export default function HelpSystem({
  isDarkMode = true,
  onClose,
  defaultTopic = "overview",
  enableKeyboardShortcuts = true,
}: HelpSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>(defaultTopic);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<string>("getting-started");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter topics based on search
  const filteredTopics = React.useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    return helpCategories.flatMap((category) =>
      category.topics.filter(
        (topic) =>
          topic.title.toLowerCase().includes(query) ||
          topic.description.toLowerCase().includes(query) ||
          topic.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query)
          )
      )
    );
  }, [searchQuery]);

  // Get current topic
  const currentTopic = React.useMemo(() => {
    for (const category of helpCategories) {
      const topic = category.topics.find((t) => t.id === selectedTopic);
      if (topic) return topic;
    }
    return helpCategories[0].topics[0];
  }, [selectedTopic]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "F1" || (e.ctrlKey && e.key === "h")) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      } else if (e.ctrlKey && e.key === "k" && isOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [enableKeyboardShortcuts, isOpen]);

  // Focus search when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    setSearchQuery("");
  };

  const handleExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const themeClasses = {
    modal: isDarkMode
      ? "bg-black/50 backdrop-blur-sm"
      : "bg-gray-500/50 backdrop-blur-sm",
    container: isDarkMode
      ? "bg-[#1e222d] border-[#2a2e39] text-gray-300"
      : "bg-white border-gray-300 text-gray-700",
    sidebar: isDarkMode
      ? "bg-[#131722] border-[#2a2e39]"
      : "bg-gray-50 border-gray-200",
    content: isDarkMode
      ? "bg-[#1e222d] text-gray-300"
      : "bg-white text-gray-700",
    searchInput: isDarkMode
      ? "bg-[#2a2e39] border-[#3a3e49] text-white placeholder-gray-400"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500",
    categoryButton: isDarkMode
      ? "text-gray-400 hover:text-white hover:bg-[#2a2e39]"
      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
    topicButton: isDarkMode
      ? "text-gray-300 hover:text-white hover:bg-[#2a2e39]"
      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
    activeButton: isDarkMode
      ? "bg-blue-600 text-white"
      : "bg-blue-500 text-white",
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
          ${
            isDarkMode
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }
        `}
        title="Help & Documentation (F1)"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Help</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${themeClasses.modal}`}
    >
      <div
        className={`
        w-full max-w-6xl h-full max-h-[90vh] border rounded-xl shadow-2xl flex overflow-hidden
        ${themeClasses.container}
      `}
      >
        {/* Sidebar */}
        <div className={`w-80 border-r ${themeClasses.sidebar} flex flex-col`}>
          {/* Header */}
          <div className="p-4 border-b border-current/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Help & Documentation</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                className="p-1 rounded hover:bg-current/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                  w-full pl-10 pr-4 py-2 border rounded-lg transition-colors
                  ${themeClasses.searchInput}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                `}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {searchQuery ? (
              /* Search Results */
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-2 opacity-70">
                  Search Results ({filteredTopics.length})
                </h3>
                <div className="space-y-1">
                  {filteredTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicSelect(topic.id)}
                      className={`
                        w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-colors
                        ${
                          selectedTopic === topic.id
                            ? themeClasses.activeButton
                            : themeClasses.topicButton
                        }
                      `}
                    >
                      <div className="flex-shrink-0">{topic.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {topic.title}
                        </div>
                        <div className="text-xs opacity-70 truncate">
                          {topic.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Categories */
              <div>
                {helpCategories.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className={`
                        w-full flex items-center space-x-3 p-3 text-left transition-colors
                        ${
                          selectedCategory === category.id
                            ? themeClasses.activeButton
                            : themeClasses.categoryButton
                        }
                      `}
                    >
                      <div className="flex-shrink-0">{category.icon}</div>
                      <span className="font-medium">{category.name}</span>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </button>

                    {/* Topics in category */}
                    {selectedCategory === category.id && (
                      <div className="pl-6 pb-2">
                        {category.topics.map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => handleTopicSelect(topic.id)}
                            className={`
                              w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-colors
                              ${
                                selectedTopic === topic.id
                                  ? themeClasses.activeButton
                                  : themeClasses.topicButton
                              }
                            `}
                          >
                            <div className="flex-shrink-0">{topic.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {topic.title}
                              </div>
                              <div className="text-xs opacity-70 truncate">
                                {topic.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-current/10">
            <div className="space-y-2 text-xs opacity-70">
              <div className="flex items-center space-x-2">
                <Keyboard className="w-3 h-3" />
                <span>F1 or Ctrl+H: Open help</span>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="w-3 h-3" />
                <span>Ctrl+K: Focus search</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 ${themeClasses.content} flex flex-col`}>
          {/* Topic Header */}
          <div className="p-6 border-b border-current/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">{currentTopic.icon}</div>
                <div>
                  <h1 className="text-2xl font-bold">{currentTopic.title}</h1>
                  <p className="opacity-70 mt-1">{currentTopic.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {currentTopic.videoUrl && (
                  <button
                    onClick={() => handleExternalLink(currentTopic.videoUrl!)}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
                      ${themeClasses.topicButton}
                    `}
                  >
                    <Video className="w-4 h-4" />
                    <span className="text-sm">Watch Video</span>
                  </button>
                )}
                <button
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
                    ${themeClasses.topicButton}
                  `}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Share</span>
                </button>
              </div>
            </div>
          </div>

          {/* Topic Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{
                  __html: currentTopic.content
                    .replace(/\n/g, "<br>")
                    .replace(/## /g, "<h2>")
                    .replace(/### /g, "<h3>")
                    .replace(/# /g, "<h1>"),
                }}
              />
            </div>

            {/* External Links */}
            {currentTopic.externalLinks &&
              currentTopic.externalLinks.length > 0 && (
                <div className="mt-8 pt-6 border-t border-current/10">
                  <h3 className="text-lg font-semibold mb-4">Related Links</h3>
                  <div className="space-y-2">
                    {currentTopic.externalLinks.map((link, index) => (
                      <button
                        key={index}
                        onClick={() => handleExternalLink(link.url)}
                        className={`
                        flex items-center space-x-2 p-3 rounded-lg transition-colors w-full text-left
                        ${themeClasses.topicButton}
                      `}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{link.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
