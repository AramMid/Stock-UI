import React from "react";

interface VolumeDisplayProps {
  volume: number;
  isDarkMode: boolean;
}

export default function VolumeDisplay({
  volume,
  isDarkMode,
}: VolumeDisplayProps) {
  const formatVolume = (vol: number) => {
    if (vol >= 1000000000) {
      return `${(vol / 1000000000).toFixed(1)}B`;
    } else if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(1)}M`;
    } else if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toLocaleString();
  };

  return (
    <div
      className={`absolute top-12 left-3 z-10 px-3 py-2 rounded-lg border ${
        isDarkMode
          ? "bg-[#131722] border-[#2a2e39] text-white"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      <div className="flex items-center space-x-2">
        <span
          className={`text-xs font-medium ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Volume:
        </span>
        <span className="text-sm font-mono font-semibold">
          {volume > 0 ? formatVolume(volume) : "N/A"}
        </span>
      </div>
    </div>
  );
}
