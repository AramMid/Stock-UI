"use client";
import React, { useState } from "react";
import {
  Grid,
  ChevronDown,
  Monitor,
  Square,
  MoreHorizontal,
} from "lucide-react";

export type ChartLayout =
  | "single"
  | "2x1"
  | "1x2"
  | "2x2"
  | "3x1"
  | "1x3"
  | "3x2"
  | "2x3"
  | "4x1"
  | "1x4"
  | "custom";

interface LayoutOption {
  value: ChartLayout;
  label: string;
  icon: React.ReactNode;
  description: string;
  gridCols: number;
  gridRows: number;
}

interface ChartLayoutSelectorProps {
  currentLayout: ChartLayout;
  onLayoutChange: (layout: ChartLayout) => void;
  isDarkMode?: boolean;
  disabled?: boolean;
}

const layoutOptions: LayoutOption[] = [
  {
    value: "single",
    label: "Single Chart",
    icon: <Square className="w-4 h-4" />,
    description: "One full-size chart",
    gridCols: 1,
    gridRows: 1,
  },
  {
    value: "2x1",
    label: "2 Horizontal",
    icon: (
      <div className="flex space-x-0.5">
        <div className="w-2 h-3 bg-current rounded-sm"></div>
        <div className="w-2 h-3 bg-current rounded-sm"></div>
      </div>
    ),
    description: "Two charts side by side",
    gridCols: 2,
    gridRows: 1,
  },
  {
    value: "1x2",
    label: "2 Vertical",
    icon: (
      <div className="flex flex-col space-y-0.5">
        <div className="w-4 h-1.5 bg-current rounded-sm"></div>
        <div className="w-4 h-1.5 bg-current rounded-sm"></div>
      </div>
    ),
    description: "Two charts stacked vertically",
    gridCols: 1,
    gridRows: 2,
  },
  {
    value: "2x2",
    label: "2x2 Grid",
    icon: (
      <div className="grid grid-cols-2 gap-0.5">
        <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
        <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
        <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
        <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
      </div>
    ),
    description: "Four charts in a 2x2 grid",
    gridCols: 2,
    gridRows: 2,
  },
  {
    value: "3x1",
    label: "3 Horizontal",
    icon: (
      <div className="flex space-x-0.5">
        <div className="w-1.5 h-3 bg-current rounded-sm"></div>
        <div className="w-1.5 h-3 bg-current rounded-sm"></div>
        <div className="w-1.5 h-3 bg-current rounded-sm"></div>
      </div>
    ),
    description: "Three charts horizontally",
    gridCols: 3,
    gridRows: 1,
  },
  {
    value: "1x3",
    label: "3 Vertical",
    icon: (
      <div className="flex flex-col space-y-0.5">
        <div className="w-4 h-1 bg-current rounded-sm"></div>
        <div className="w-4 h-1 bg-current rounded-sm"></div>
        <div className="w-4 h-1 bg-current rounded-sm"></div>
      </div>
    ),
    description: "Three charts vertically",
    gridCols: 1,
    gridRows: 3,
  },
  {
    value: "3x2",
    label: "3x2 Grid",
    icon: (
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-1 h-1 bg-current rounded-sm"></div>
        ))}
      </div>
    ),
    description: "Six charts in a 3x2 grid",
    gridCols: 3,
    gridRows: 2,
  },
  {
    value: "2x3",
    label: "2x3 Grid",
    icon: (
      <div className="grid grid-cols-2 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1 bg-current rounded-sm"></div>
        ))}
      </div>
    ),
    description: "Six charts in a 2x3 grid",
    gridCols: 2,
    gridRows: 3,
  },
  {
    value: "4x1",
    label: "4 Horizontal",
    icon: (
      <div className="flex space-x-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-1 h-3 bg-current rounded-sm"></div>
        ))}
      </div>
    ),
    description: "Four charts horizontally",
    gridCols: 4,
    gridRows: 1,
  },
  {
    value: "1x4",
    label: "4 Vertical",
    icon: (
      <div className="flex flex-col space-y-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-4 h-0.5 bg-current rounded-sm"></div>
        ))}
      </div>
    ),
    description: "Four charts vertically",
    gridCols: 1,
    gridRows: 4,
  },
];

export default function ChartLayoutSelector({
  currentLayout,
  onLayoutChange,
  isDarkMode = true,
  disabled = false,
}: ChartLayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption =
    layoutOptions.find((option) => option.value === currentLayout) ||
    layoutOptions[0];

  const handleLayoutSelect = (layout: ChartLayout) => {
    onLayoutChange(layout);
    setIsOpen(false);
  };

  const themeClasses = {
    button: isDarkMode
      ? "bg-[#1e222d] border-[#2a2e39] text-gray-300 hover:text-white hover:bg-[#2a2e39]"
      : "bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50",
    dropdown: isDarkMode
      ? "bg-[#1e222d] border-[#2a2e39] text-gray-300"
      : "bg-white border-gray-300 text-gray-700",
    optionHover: isDarkMode
      ? "hover:bg-[#2a2e39] hover:text-white"
      : "hover:bg-gray-50 hover:text-gray-900",
    optionActive: isDarkMode
      ? "bg-blue-600 text-white"
      : "bg-blue-500 text-white",
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center p-2 border rounded transition-colors
          ${themeClasses.button}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        title={`Current layout: ${currentOption.description}`}
      >
        <Grid className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className={`
            absolute top-full left-0 mt-1 border rounded-lg shadow-xl z-50 min-w-80 max-w-96 p-4
            ${themeClasses.dropdown}
          `}
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold mb-1">Chart Layout</h3>
              <p className="text-xs opacity-70">
                Choose how charts are arranged
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleLayoutSelect(option.value)}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg transition-colors text-left
                    ${
                      option.value === currentLayout
                        ? themeClasses.optionActive
                        : themeClasses.optionHover
                    }
                  `}
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <div className="text-current">{option.icon}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {option.label}
                    </div>
                    <div className="text-xs opacity-70 truncate">
                      {option.description}
                    </div>
                    <div className="text-xs opacity-50 mt-1">
                      {option.gridCols}×{option.gridRows}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-current/10">
              <button
                onClick={() => {
                  // TODO: Implement custom layout creator
                  console.log("Custom layout creator not implemented yet");
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-center space-x-2 p-2 rounded-lg transition-colors
                  ${themeClasses.optionHover}
                `}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-sm">Custom Layout...</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
