"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Zap } from "lucide-react";

interface BlackSwanControlsProps {
  isDarkMode?: boolean;
  selectedSymbol: string;
}

export default function BlackSwanControls({
  isDarkMode = true,
  selectedSymbol,
}: BlackSwanControlsProps) {
  const currentTheme = isDarkMode ? "dark" : "light";

  const themeConfig = {
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

  const theme = themeConfig[currentTheme];

  return (
    <div className="relative">
      <button
        style={{
          padding: "8px 12px",
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: "6px",
          color: theme.text,
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "500",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
        title="Black Swan Event (Automatic)"
      >
        <Zap style={{ width: "16px", height: "16px", color: "#f59e0b" }} />
        <span>Black Swan</span>
      </button>
    </div>
  );
}
