"use client";
import { Timeframe } from "@/lib/types";

interface TimeframeControlsProps {
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  isDarkMode?: boolean;
}

export default function TimeframeControls({
  timeframe,
  onTimeframeChange,
  isDarkMode = true,
}: TimeframeControlsProps) {
  const timeframes = [
    { label: "1m", value: "1m" as Timeframe },
    { label: "5m", value: "5m" as Timeframe },
    { label: "15m", value: "15m" as Timeframe },
    { label: "1H", value: "1H" as Timeframe },
    { label: "4H", value: "4H" as Timeframe },
    { label: "1D", value: "1D" as Timeframe },
    { label: "1W", value: "1W" as Timeframe },
    { label: "1M", value: "1M" as Timeframe },
  ];

  const currentTime = new Date().toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour12: false,
  });

  return (
    <div
      className={`absolute bottom-4 left-4 flex items-center space-x-4 backdrop-blur-sm border rounded-lg px-3 py-2 text-xs transition-colors duration-300 ${
        isDarkMode
          ? "bg-black bg-opacity-80 border-gray-700 text-white"
          : "bg-white bg-opacity-90 border-gray-300 text-gray-900"
      }`}
    >
      {/* Timeframe Buttons */}
      <div className="flex items-center space-x-1">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            className={`px-2 py-1 rounded transition-colors ${
              timeframe === tf.value
                ? "bg-blue-600 text-white"
                : isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div
        className={`w-px h-4 ${isDarkMode ? "bg-gray-600" : "bg-gray-300"}`}
      ></div>

      {/* Status Indicators */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
            Live
          </span>
        </div>

        <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
          UTC: {currentTime}
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
            Pre-Market
          </span>
        </div>
      </div>
    </div>
  );
}
