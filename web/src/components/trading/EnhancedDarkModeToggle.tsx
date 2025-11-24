"use client";
import React, { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

interface EnhancedDarkModeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
  enableTransitions?: boolean;
  showSystemOption?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "switch" | "button" | "dropdown";
  className?: string;
}

type ThemeMode = "light" | "dark" | "system";

export default function EnhancedDarkModeToggle({
  isDarkMode,
  onToggle,
  enableTransitions = true,
  showSystemOption = true,
  size = "md",
  variant = "switch",
  className = "",
}: EnhancedDarkModeToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentMode, setCurrentMode] = useState<ThemeMode>("dark");

  // Detect system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Size configurations
  const sizeConfig = {
    sm: {
      switch: "w-8 h-4",
      thumb: "w-3 h-3",
      button: "p-1.5",
      icon: "w-3 h-3",
      text: "text-xs",
    },
    md: {
      switch: "w-12 h-6",
      thumb: "w-5 h-5",
      button: "p-2",
      icon: "w-4 h-4",
      text: "text-sm",
    },
    lg: {
      switch: "w-16 h-8",
      thumb: "w-7 h-7",
      button: "p-3",
      icon: "w-5 h-5",
      text: "text-base",
    },
  };

  const config = sizeConfig[size];

  // Animation handler
  const handleToggle = () => {
    if (enableTransitions) {
      setIsAnimating(true);

      // Add page-level transition effect
      document.documentElement.style.setProperty(
        "--theme-transition",
        "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      );

      setTimeout(() => {
        onToggle();
        setIsAnimating(false);
      }, 150);

      // Remove transition after animation
      setTimeout(() => {
        document.documentElement.style.removeProperty("--theme-transition");
      }, 300);
    } else {
      onToggle();
    }
  };

  // Mode change handler for dropdown variant
  const handleModeChange = (mode: ThemeMode) => {
    setCurrentMode(mode);
    setShowDropdown(false);

    if (mode === "system") {
      // Use system preference
      if (systemPrefersDark !== isDarkMode) {
        handleToggle();
      }
    } else {
      const shouldBeDark = mode === "dark";
      if (shouldBeDark !== isDarkMode) {
        handleToggle();
      }
    }
  };

  // Switch variant
  if (variant === "switch") {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <button
          onClick={handleToggle}
          className={`
            relative rounded-full transition-all duration-300 ease-in-out
            ${config.switch}
            ${
              isDarkMode
                ? "bg-blue-600 shadow-lg shadow-blue-600/30"
                : "bg-gray-300 shadow-inner"
            }
            ${isAnimating ? "scale-105" : ""}
            hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          `}
          title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
        >
          <div
            className={`
              absolute top-0.5 left-0.5 rounded-full transition-all duration-300 ease-in-out
              ${config.thumb}
              ${
                isDarkMode
                  ? "translate-x-6 bg-white shadow-lg"
                  : "translate-x-0 bg-white shadow-md"
              }
              flex items-center justify-center
            `}
          >
            {isDarkMode ? (
              <Moon className={`${config.icon} text-blue-600`} />
            ) : (
              <Sun className={`${config.icon} text-yellow-500`} />
            )}
          </div>

          {/* Background icons */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            <Sun
              className={`${config.icon} text-yellow-300 transition-opacity ${
                isDarkMode ? "opacity-0" : "opacity-70"
              }`}
            />
            <Moon
              className={`${config.icon} text-blue-300 transition-opacity ${
                isDarkMode ? "opacity-70" : "opacity-0"
              }`}
            />
          </div>
        </button>

        {/* Optional label */}
        <span
          className={`${config.text} text-gray-600 dark:text-gray-300 font-medium`}
        >
          {isDarkMode ? "Dark" : "Light"} Mode
        </span>
      </div>
    );
  }

  // Button variant
  if (variant === "button") {
    return (
      <button
        onClick={handleToggle}
        className={`
          ${config.button} rounded-lg transition-all duration-300 ease-in-out
          ${
            isDarkMode
              ? "bg-gray-800 text-yellow-400 hover:bg-gray-700 shadow-lg shadow-gray-800/30"
              : "bg-white text-gray-700 hover:bg-gray-50 shadow-lg shadow-gray-200/50"
          }
          ${isAnimating ? "scale-110 rotate-180" : ""}
          hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          border border-gray-200 dark:border-gray-700
          ${className}
        `}
        title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      >
        <div className="relative">
          {isDarkMode ? (
            <Sun
              className={`${config.icon} transition-transform duration-300`}
            />
          ) : (
            <Moon
              className={`${config.icon} transition-transform duration-300`}
            />
          )}
        </div>
      </button>
    );
  }

  // Dropdown variant
  if (variant === "dropdown") {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`
            flex items-center space-x-2 ${
              config.button
            } rounded-lg transition-all duration-300
            ${
              isDarkMode
                ? "bg-gray-800 text-white hover:bg-gray-700 border-gray-700"
                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
            }
            border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          `}
        >
          {currentMode === "light" && <Sun className={config.icon} />}
          {currentMode === "dark" && <Moon className={config.icon} />}
          {currentMode === "system" && <Monitor className={config.icon} />}
          <span className={config.text}>
            {currentMode === "system"
              ? "Auto"
              : currentMode === "dark"
              ? "Dark"
              : "Light"}
          </span>
        </button>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />

            {/* Dropdown menu */}
            <div
              className={`
              absolute top-full right-0 mt-1 border rounded-lg shadow-xl z-50 min-w-40 py-1
              ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }
            `}
            >
              {[
                { mode: "light" as ThemeMode, icon: Sun, label: "Light" },
                { mode: "dark" as ThemeMode, icon: Moon, label: "Dark" },
                ...(showSystemOption
                  ? [
                      {
                        mode: "system" as ThemeMode,
                        icon: Monitor,
                        label: "System",
                      },
                    ]
                  : []),
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors
                    ${config.text}
                    ${
                      currentMode === mode
                        ? isDarkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-500 text-white"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <Icon className={config.icon} />
                  <span>{label}</span>
                  {mode === "system" && (
                    <span className="text-xs opacity-60 ml-auto">
                      ({systemPrefersDark ? "Dark" : "Light"})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// CSS to add to globals.css for smooth transitions
export const ThemeTransitionCSS = `
/* Theme transition styles */
html {
  transition: var(--theme-transition, none);
}

html * {
  transition: var(--theme-transition, none) !important;
}

/* Prevent flash during theme change */
html.theme-transitioning * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
}

/* Smooth chart theme transitions */
.chart-container * {
  transition: var(--theme-transition, none) !important;
}

/* TradingView-style theme variables */
:root {
  --tv-color-platform-background: #ffffff;
  --tv-color-pane-background: #ffffff;
  --tv-color-toolbar-background: #f8f9fa;
  --tv-color-widget-background: #ffffff;
  --tv-color-text-primary: #131722;
  --tv-color-text-secondary: #787b86;
  --tv-color-border: #e0e3eb;
  --tv-color-item-active-background: #2962ff;
  --tv-color-accent: #2962ff;
}

.dark {
  --tv-color-platform-background: #131722;
  --tv-color-pane-background: #1e222d;
  --tv-color-toolbar-background: #2a2e39;
  --tv-color-widget-background: #1e222d;
  --tv-color-text-primary: #d1d4dc;
  --tv-color-text-secondary: #787b86;
  --tv-color-border: #2a2e39;
  --tv-color-item-active-background: #2962ff;
  --tv-color-accent: #2962ff;
}
`;

// Hook for managing theme transitions
export function useThemeTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = () => {
    setIsTransitioning(true);
    document.documentElement.classList.add("theme-transitioning");

    setTimeout(() => {
      setIsTransitioning(false);
      document.documentElement.classList.remove("theme-transitioning");
    }, 300);
  };

  return { isTransitioning, startTransition };
}
