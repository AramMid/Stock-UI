import { useState, useEffect } from "react";
import {
  Plus,
  ChevronDown,
  LineChart,
  BarChart3,
  Activity,
  Search,
  Bell,
  Lock,
  Unlock,
} from "lucide-react";
import BlackSwanControls from "./BlackSwanControls";

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
  isPrivateMode?: boolean;
  onTogglePrivateMode?: () => void;
  onTriggerBlackSwan?: (
    symbol: string,
    eventType: "crash" | "delist",
    severity: "mild" | "moderate" | "severe"
  ) => void;
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
  isPrivateMode = false,
  onTogglePrivateMode,
  onTriggerBlackSwan,
}: TopNavigationProps) {
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [isBlackSwanActive, setIsBlackSwanActive] = useState(false);

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

  // Filter timeframes based on mode - in public mode, only show HFT
  const displayedTimeframes = isPrivateMode
    ? timeframes
    : [{ label: "HFT", value: "1m" as Timeframe }];

  // Display timeframe - in public mode, always show HFT
  const displayTimeframe = isPrivateMode ? timeframe : "HFT";

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
    justifyContent: "center", // Center all content
    color: currentTheme.text,
    fontSize: "14px",
    minHeight: "60px",
  };

  const centerSectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    justifyContent: "center",
    width: "100%",
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

  // Listen for Black Swan event activation
  useEffect(() => {
    const handleBlackSwanEvent = (event: CustomEvent) => {
      setIsBlackSwanActive(event.detail.active);
    };

    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.addEventListener(
        "blackSwanEventScheduled",
        handleBlackSwanEvent as EventListener
      );
      window.addEventListener(
        "blackSwanEventEnded",
        handleBlackSwanEvent as EventListener
      );
    }

    return () => {
      if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
        window.removeEventListener(
          "blackSwanEventScheduled",
          handleBlackSwanEvent as EventListener
        );
        window.removeEventListener(
          "blackSwanEventEnded",
          handleBlackSwanEvent as EventListener
        );
      }
    };
  }, []);

  // Define pulse animation styles
  const pulseAnimationStyle = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
    
    .black-swan-pulse {
      animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{pulseAnimationStyle}</style>
      {/* Centered Section - All Controls */}
      <div style={centerSectionStyle}>
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
            <span>{displayTimeframe}</span>
            <ChevronDown style={{ width: "14px", height: "14px" }} />
          </button>

          {showTimeframeDropdown && (
            <div style={dropdownStyle}>
              {displayedTimeframes.map((tf) => (
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

        <div style={separatorStyle} />

        {/* App Settings */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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

          {/* Black Swan Controls */}
          <div className={isBlackSwanActive ? "black-swan-pulse" : ""}>
            <BlackSwanControls
              isDarkMode={currentThemeMode === "dark"}
              selectedSymbol={symbol}
            />
          </div>

          {/* Private Mode Toggle */}
          <button
            onClick={onTogglePrivateMode}
            style={{
              ...buttonStyle(),
              backgroundColor: isPrivateMode
                ? currentTheme.active
                : currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`,
              padding: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isPrivateMode
                ? currentTheme.active
                : currentTheme.cardBg;
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
        </div>
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
