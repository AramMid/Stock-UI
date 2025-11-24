"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { lightTheme, darkTheme } from "@/themes/theme";
import { ThemeType } from "@/types/theme";

// Changed type to only allow "dark"
type Theme = "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  themeConfig: ThemeType;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Changed initial state to always be "dark"
  const [theme, setTheme] = useState<Theme>("dark");
  const themeConfig = darkTheme; // Always use dark theme

  // Hàm inject CSS variables vào root
  const injectCSSVariables = (theme: ThemeType) => {
    const root = document.documentElement;

    // Inject color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--${key}-${subKey}`, String(subValue));
        });
      } else {
        root.style.setProperty(`--${key}`, String(value));
      }
    });

    // Inject spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, String(value));
    });

    // Inject breakpoint variables
    Object.entries(theme.breakpoints).forEach(([key, value]) => {
      root.style.setProperty(`--breakpoint-${key}`, String(value));
    });
  };

  useEffect(() => {
    // Always set theme to dark and save to localStorage
    setTheme("dark");
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
    injectCSSVariables(themeConfig);
  }, []);

  // Removed toggleTheme functionality since we only want dark mode
  const toggleTheme = () => {
    // Do nothing - theme is always dark
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};