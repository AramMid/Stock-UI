import { ThemeType } from "@/types/theme";

export const lightTheme: ThemeType = {
  colors: {
    primary: "#2563eb",
    secondary: "#64748b",
    background: "#f8fafc",
    surface: "#ffffff",
    text: {
      primary: "#1e293b",
      secondary: "#64748b",
      disabled: "#94a3b8",
    },
    border: "#e2e8f0",
    error: "#ef4444",
    success: "#10b981",
    warning: "#f59e0b",
  },
  breakpoints: {
    xs: "0px",
    sm: "576px",
    md: "768px",
    lg: "992px",
    xl: "1200px",
    xxl: "1400px",
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    xxl: "3rem",
  },
};

export const darkTheme: ThemeType = {
  colors: {
    primary: "#3b82f6",
    secondary: "#94a3b8",
    background: "#131722", // Chart background color
    surface: "#1e222d", // Panel background color
    text: {
      primary: "#d9d9d9", // Main text color
      secondary: "#787b86", // Secondary text color
      disabled: "#555761", // Disabled text color
    },
    border: "#2a2e39", // Border color
    error: "#f7525f", // Red color for sell/bearish
    success: "#26a69a", // Green color for buy/bullish
    warning: "#ffb74d", // Warning color
  },
  breakpoints: { ...lightTheme.breakpoints },
  spacing: { ...lightTheme.spacing },
};
