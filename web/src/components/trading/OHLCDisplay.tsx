"use client";
import { useState, useEffect } from "react";

interface OHLCDisplayProps {
  ohlcData: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  } | null;
  symbol: string;
  isDarkMode?: boolean;
}

export default function OHLCDisplay({
  ohlcData,
  symbol,
  isDarkMode = true,
}: OHLCDisplayProps) {
  if (!ohlcData) return null;

  const isPositive = ohlcData.change >= 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const changeSymbol = isPositive ? "+" : "";

  return (
    <div
      className={`absolute top-4 left-16 z-10 ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}
    >
      <div className="flex items-center text-sm font-mono">
        {/* OHLC Values with increased spacing */}
        <div className="flex items-center space-x-20">
          {/* Open */}
          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              O
            </span>
            <span className="font-semibold text-white">
              {ohlcData.open.toFixed(2)}
            </span>
          </div>

          {/* High */}
          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              H
            </span>
            <span className="font-semibold text-green-400">
              {ohlcData.high.toFixed(2)}
            </span>
          </div>

          {/* Low */}
          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              L
            </span>
            <span className="font-semibold text-red-400">
              {ohlcData.low.toFixed(2)}
            </span>
          </div>

          {/* Close */}
          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              C
            </span>
            <span className={`font-semibold ${changeColor}`}>
              {ohlcData.close.toFixed(2)}
            </span>
          </div>

          {/* Change */}
          <div className="flex flex-col">
            <span
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              Change
            </span>
            <span className={`font-semibold ${changeColor}`}>
              {changeSymbol}
              {ohlcData.change.toFixed(2)} ({changeSymbol}
              {ohlcData.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}