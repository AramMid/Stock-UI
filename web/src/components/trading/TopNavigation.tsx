import { useState } from "react";
import {
  Plus,
  ChevronDown,
  TrendingUp,
  RotateCcw,
  RotateCw,
  Maximize,
  Camera,
  Settings,
  LineChart,
  BarChart3,
  Activity,
  Save,
  Upload,
  Download,
  Grid,
  Search,
  Sun,
  Moon,
  Bell,
  Zap,
  Lock,
  Unlock,
} from "lucide-react";

import { Timeframe } from "@/lib/types";

// Types
type ChartType = "candlestick" | "line" | "area";
type Theme = "light" | "dark";

interface TopNavigationProps {
  symbol?: string;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  // Also support the alternative prop names for compatibility
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onSymbolChange?: (symbol: string) => void;
  chartType?: ChartType;
  onChartTypeChange?: (chartType: ChartType) => void;
  showRSI?: boolean;
  showMACD?: boolean;
  onToggleRSI?: () => void;
  onToggleMACD?: () => void;
  onScreenshot?: () => void;
  onSaveChart?: () => void;
  isPrivateMode?: boolean;
  onTogglePrivateMode?: () => void;
}

export default function TopNavigation({
  symbol = "AAPL",
  timeframe = "1H",
  onTimeframeChange,
  theme = "dark",
  onThemeChange,
  isDarkMode,
  onToggleDarkMode,
  onSymbolChange,
  chartType = "candlestick",
  onChartTypeChange,
  showRSI = false,
  showMACD = false,
  onToggleRSI,
  onToggleMACD,
  onScreenshot,
  onSaveChart,
  isPrivateMode = false,
  onTogglePrivateMode,
}: TopNavigationProps) {
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  // Determine current theme (support both prop patterns)
  const currentThemeMode: Theme =
    isDarkMode !== undefined ? (isDarkMode ? "dark" : "light") : theme;

  // Theme configurations
  const themes = {
    dark: {
      bg: "#131722",
      border: "#2a2e39",
      cardBg: "#1e222d",
      text: "#ffffff",
      textSecondary: "#d1d5db",
      textMuted: "#6b7280",
      hover: "#374151",
      active: "#2563eb",
      separator: "#374151",
    },
    light: {
      bg: "#ffffff",
      border: "#e5e7eb",
      cardBg: "#f9fafb",
      text: "#111827",
      textSecondary: "#374151",
      textMuted: "#6b7280",
      hover: "#f3f4f6",
      active: "#2563eb",
      separator: "#e5e7eb",
    },
  };

  const currentTheme = themes[currentThemeMode];

  const timeframes = [
    { label: "1m", value: "1m" as Timeframe },
    { label: "5m", value: "5m" as Timeframe },
    { label: "15m", value: "15m" as Timeframe },
    { label: "30m", value: "30m" as Timeframe },
    { label: "1h", value: "1H" as Timeframe },
    { label: "4h", value: "4H" as Timeframe },
    { label: "1D", value: "1D" as Timeframe },
    { label: "5d", value: "5D" as Timeframe },
    { label: "1W", value: "1W" as Timeframe },
    { label: "1M", value: "1M" as Timeframe },
    { label: "3M", value: "3M" as Timeframe },
    { label: "6M", value: "6M" as Timeframe },
    { label: "1Y", value: "1Y" as Timeframe },
    { label: "5Y", value: "5Y" as Timeframe },
  ];

  const chartTypes = [
    {
      label: "Candlestick",
      value: "candlestick" as ChartType,
      icon: BarChart3,
    },
    { label: "Line", value: "line" as ChartType, icon: LineChart },
    { label: "Area", value: "area" as ChartType, icon: Activity },
  ];

  // Styles
  const containerStyle = {
    backgroundColor: currentTheme.bg,
    borderBottom: `1px solid ${currentTheme.border}`,
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: currentTheme.text,
    fontSize: "14px",
    minHeight: "60px",
  };

  const sectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  };

  const buttonStyle = (isActive = false) => ({
    padding: "10px",
    color: isActive ? currentTheme.text : currentTheme.textMuted,
    backgroundColor: isActive ? currentTheme.active : "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const dropdownButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: currentTheme.cardBg,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: "6px",
    color: currentTheme.text,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  };

  const symbolInputStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: currentTheme.cardBg,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: "6px",
    minWidth: "120px",
  };

  const separatorStyle = {
    height: "24px",
    width: "1px",
    backgroundColor: currentTheme.separator,
  };

  const dropdownStyle = {
    position: "absolute" as const,
    top: "100%",
    left: "0",
    marginTop: "4px",
    backgroundColor: currentTheme.cardBg,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: "8px",
    boxShadow:
      currentThemeMode === "dark"
        ? "0 10px 25px rgba(0, 0, 0, 0.5)"
        : "0 10px 25px rgba(0, 0, 0, 0.1)",
    zIndex: 50,
    minWidth: "140px",
  };

  const handleThemeToggle = () => {
    if (onToggleDarkMode) {
      // Use isDarkMode/onToggleDarkMode pattern
      onToggleDarkMode();
    } else if (onThemeChange) {
      // Use theme/onThemeChange pattern
      const newTheme = currentThemeMode === "dark" ? "light" : "dark";
      onThemeChange(newTheme);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Left Section - Trading Controls */}
      <div style={sectionStyle}>
        {/* Symbol Search */}
        <div style={symbolInputStyle}>
          <Search
            style={{
              width: "16px",
              height: "16px",
              color: currentTheme.textMuted,
            }}
          />
          <input
            value={symbol}
            onChange={(e) => onSymbolChange?.(e.target.value)}
            placeholder="Symbol"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: currentTheme.text,
              fontSize: "14px",
              fontWeight: "600",
              width: "80px",
            }}
          />
        </div>

        {/* Add Chart Tab */}
        <button
          style={buttonStyle()}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.hover;
            e.currentTarget.style.color = currentTheme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = currentTheme.textMuted;
          }}
          title="Add new chart tab"
        >
          <Plus style={{ width: "18px", height: "18px" }} />
        </button>

        <div style={separatorStyle} />

        {/* Timeframe Selector */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
            style={dropdownButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.cardBg;
            }}
          >
            <span>{timeframe}</span>
            <ChevronDown style={{ width: "14px", height: "14px" }} />
          </button>

          {showTimeframeDropdown && (
            <div style={dropdownStyle}>
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => {
                    onTimeframeChange?.(tf.value);
                    setShowTimeframeDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    fontSize: "13px",
                    backgroundColor:
                      timeframe === tf.value
                        ? currentTheme.active
                        : "transparent",
                    color:
                      timeframe === tf.value
                        ? "white"
                        : currentTheme.textSecondary,
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (timeframe !== tf.value) {
                      e.currentTarget.style.backgroundColor =
                        currentTheme.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (timeframe !== tf.value) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chart Type Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {chartTypes.map((type) => {
            const IconComponent = type.icon;
            const isActive = chartType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => onChartTypeChange?.(type.value)}
                style={buttonStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = currentTheme.text;
                    e.currentTarget.style.backgroundColor = currentTheme.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = currentTheme.textMuted;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={type.label}
              >
                <IconComponent style={{ width: "18px", height: "18px" }} />
              </button>
            );
          })}
        </div>

        <div style={separatorStyle} />

        {/* Undo/Redo Controls (replaced drawing tools) */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Undo"
          >
            <RotateCcw style={{ width: "16px", height: "16px" }} />
          </button>
          <button
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Redo"
          >
            <RotateCw style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* Indicators */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            style={dropdownButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.cardBg;
            }}
          >
            <span>Indicators</span>
            <ChevronDown style={{ width: "14px", height: "14px" }} />
          </button>

          {showIndicators && (
            <div
              style={{
                ...dropdownStyle,
                minWidth: "280px",
                padding: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                  color: currentTheme.text,
                }}
              >
                Technical Indicators
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {[
                  {
                    id: "rsi",
                    name: "RSI (14)",
                    enabled: showRSI,
                    handler: onToggleRSI,
                  },
                  {
                    id: "macd",
                    name: "MACD (12, 26, 9)",
                    enabled: showMACD,
                    handler: onToggleMACD,
                  },
                  { id: "sma", name: "SMA (20)", enabled: false },
                  { id: "ema", name: "EMA (20)", enabled: false },
                  { id: "bb", name: "Bollinger Bands", enabled: false },
                ].map((indicator) => (
                  <label
                    key={indicator.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: currentTheme.textSecondary,
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={indicator.enabled}
                      onChange={() => indicator.handler?.()}
                      style={{
                        width: "14px",
                        height: "14px",
                        accentColor: currentTheme.active,
                        cursor: "pointer",
                      }}
                    />
                    <span>{indicator.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Section - From Save onwards */}
      <div style={sectionStyle}>
        {/* Save Menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowSaveMenu(!showSaveMenu)}
            style={dropdownButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.cardBg;
            }}
          >
            <span>Save</span>
            <ChevronDown style={{ width: "14px", height: "14px" }} />
          </button>

          {showSaveMenu && (
            <div
              style={{
                ...dropdownStyle,
                right: "0",
                left: "auto",
                minWidth: "160px",
                padding: "6px",
              }}
            >
              {[
                { icon: Save, label: "Save Chart", handler: onSaveChart },
                { icon: Upload, label: "Load Chart" },
                { icon: Download, label: "Export" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.handler?.();
                    setShowSaveMenu(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    fontSize: "13px",
                    textAlign: "left",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "4px",
                    color: currentTheme.textSecondary,
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <item.icon style={{ width: "16px", height: "16px" }} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={separatorStyle} />

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Layout Grid */}
          <button
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Chart layout"
          >
            <Grid style={{ width: "16px", height: "16px" }} />
          </button>

          {/* Screenshot */}
          <button
            onClick={onScreenshot}
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Screenshot"
          >
            <Camera style={{ width: "16px", height: "16px" }} />
          </button>

          {/* Fullscreen */}
          <button
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Fullscreen"
          >
            <Maximize style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        <div style={separatorStyle} />

        {/* App Settings */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Flash Search */}
          <button
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Flash Search"
          >
            <Zap style={{ width: "16px", height: "16px" }} />
          </button>

          {/* Notifications */}
          <button
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Notifications"
          >
            <Bell style={{ width: "16px", height: "16px" }} />
          </button>

          {/* Settings */}
          <button
            style={buttonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
              e.currentTarget.style.color = currentTheme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
            title="Settings"
          >
            <Settings style={{ width: "16px", height: "16px" }} />
          </button>

          {/* Private Mode Toggle */}
          <button
            onClick={onTogglePrivateMode}
            style={{
              ...buttonStyle(),
              backgroundColor: isPrivateMode ? currentTheme.active : currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`,
              padding: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isPrivateMode ? currentTheme.active : currentTheme.cardBg;
            }}
            title={
              isPrivateMode
                ? "Switch to public mode (enable real-time simulation)"
                : "Switch to private mode (disable real-time simulation)"
            }
          >
            {isPrivateMode ? (
              <Lock
                style={{
                  width: "16px",
                  height: "16px",
                  color: "white",
                }}
              />
            ) : (
              <Unlock
                style={{
                  width: "16px",
                  height: "16px",
                  color: currentTheme.text,
                }}
              />
            )}
          </button>

          {/* Theme Toggle - Removed as per requirement to only use dark mode */}
        </div>

        {/* Documentation Button */}
        <button
          style={{
            padding: "8px 14px",
            backgroundColor: currentTheme.active,
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1d4ed8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.active;
          }}
        >
          Documentation
        </button>
      </div>
    </div>
  );
}

// Demo component to show theme switching
function DemoWrapper() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [symbol, setSymbol] = useState("AAPL");
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    setTheme(isDarkMode ? "light" : "dark");
  };

  const currentTheme = isDarkMode ? "dark" : "light";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: currentTheme === "dark" ? "#0d1117" : "#f6f8fa",
        transition: "background-color 0.3s ease",
      }}
    >
      <TopNavigation
        symbol={symbol}
        timeframe={timeframe}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        chartType={chartType}
        showRSI={showRSI}
        showMACD={showMACD}
        onSymbolChange={setSymbol}
        onTimeframeChange={setTimeframe}
        onChartTypeChange={setChartType}
        onToggleRSI={() => setShowRSI(!showRSI)}
        onToggleMACD={() => setShowMACD(!showMACD)}
        onScreenshot={() => console.log("Screenshot taken")}
        onSaveChart={() => console.log("Chart saved")}
      />

      {/* Demo content area */}
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: currentTheme === "dark" ? "#ffffff" : "#000000",
        }}
      >
        <h2>
          Trading Interface - {currentTheme === "dark" ? "Dark" : "Light"} Mode
        </h2>
        <p
          style={{
            color: currentTheme === "dark" ? "#8b949e" : "#656d76",
            marginTop: "16px",
          }}
        >
          Current Symbol: <strong>{symbol}</strong> | Timeframe:{" "}
          <strong>{timeframe}</strong> | Chart: <strong>{chartType}</strong>
        </p>
        {(showRSI || showMACD) && (
          <p
            style={{
              color: currentTheme === "dark" ? "#8b949e" : "#656d76",
              marginTop: "8px",
            }}
          >
            Active Indicators:{" "}
            {[showRSI && "RSI", showMACD && "MACD"].filter(Boolean).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
