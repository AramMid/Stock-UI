"use client";
import { useState } from "react";
import { Palette, Settings, Type, Square } from "lucide-react";

interface DrawingStylePanelProps {
  isDarkMode?: boolean;
  onStyleChange?: (style: DrawingStyle) => void;
}

interface DrawingStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
}

const defaultStyle: DrawingStyle = {
  strokeColor: "#00ff00",
  fillColor: "rgba(0, 255, 0, 0.1)",
  strokeWidth: 2,
  opacity: 1,
};

const colorOptions = [
  { name: "Green", value: "#00ff00", fill: "rgba(0, 255, 0, 0.1)" },
  { name: "Red", value: "#ff0000", fill: "rgba(255, 0, 0, 0.1)" },
  { name: "Blue", value: "#0000ff", fill: "rgba(0, 0, 255, 0.1)" },
  { name: "Yellow", value: "#ffff00", fill: "rgba(255, 255, 0, 0.1)" },
  { name: "Purple", value: "#ff00ff", fill: "rgba(255, 0, 255, 0.1)" },
  { name: "Cyan", value: "#00ffff", fill: "rgba(0, 255, 255, 0.1)" },
  { name: "Orange", value: "#ffa500", fill: "rgba(255, 165, 0, 0.1)" },
  { name: "White", value: "#ffffff", fill: "rgba(255, 255, 255, 0.1)" },
];

const strokeWidthOptions = [1, 2, 3, 4, 5];
const opacityOptions = [0.3, 0.5, 0.7, 1.0];

export default function DrawingStylePanel({ 
  isDarkMode = true, 
  onStyleChange 
}: DrawingStylePanelProps) {
  const [currentStyle, setCurrentStyle] = useState<DrawingStyle>(defaultStyle);
  const [isOpen, setIsOpen] = useState(false);

  const handleStyleChange = (newStyle: Partial<DrawingStyle>) => {
    const updatedStyle = { ...currentStyle, ...newStyle };
    setCurrentStyle(updatedStyle);
    onStyleChange?.(updatedStyle);
  };

  const containerClass = `fixed top-4 right-4 z-50 transition-all duration-300 ${
    isOpen ? "translate-x-0" : "translate-x-full"
  }`;

  const panelClass = `w-80 p-4 rounded-lg shadow-lg border ${
    isDarkMode 
      ? "bg-[#1e222d] border-gray-700 text-white" 
      : "bg-white border-gray-200 text-black"
  }`;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg transition-all ${
          isDarkMode 
            ? "bg-[#1e222d] border border-gray-700 text-white hover:bg-[#2a2e39]" 
            : "bg-white border border-gray-200 text-black hover:bg-gray-50"
        }`}
        title="Drawing Style Options"
      >
        <Palette className="w-5 h-5" />
      </button>

      {/* Style Panel */}
      <div className={containerClass}>
        <div className={panelClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Drawing Style
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          {/* Color Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Stroke Color</label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleStyleChange({ 
                    strokeColor: color.value,
                    fillColor: color.fill 
                  })}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    currentStyle.strokeColor === color.value
                      ? "border-white scale-110"
                      : "border-gray-400 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Stroke Width</label>
            <div className="flex gap-2">
              {strokeWidthOptions.map((width) => (
                <button
                  key={width}
                  onClick={() => handleStyleChange({ strokeWidth: width })}
                  className={`px-3 py-1 rounded text-sm transition-all ${
                    currentStyle.strokeWidth === width
                      ? isDarkMode 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-500 text-white"
                      : isDarkMode 
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {width}px
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Opacity</label>
            <div className="flex gap-2">
              {opacityOptions.map((opacity) => (
                <button
                  key={opacity}
                  onClick={() => handleStyleChange({ opacity })}
                  className={`px-3 py-1 rounded text-sm transition-all ${
                    currentStyle.opacity === opacity
                      ? isDarkMode 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-500 text-white"
                      : isDarkMode 
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {Math.round(opacity * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Preview</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-8 bg-gray-800 rounded flex items-center justify-center">
                <div
                  className="w-16 h-4 rounded"
                  style={{
                    backgroundColor: currentStyle.fillColor,
                    border: `${currentStyle.strokeWidth}px solid ${currentStyle.strokeColor}`,
                    opacity: currentStyle.opacity,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStyleChange({
                  strokeColor: "#00ff00",
                  fillColor: "rgba(0, 255, 0, 0.1)",
                  strokeWidth: 2,
                  opacity: 1,
                })}
                className="px-3 py-2 text-sm rounded border border-gray-600 hover:bg-gray-700"
              >
                Trendline
              </button>
              <button
                onClick={() => handleStyleChange({
                  strokeColor: "#ff0000",
                  fillColor: "rgba(255, 0, 0, 0.1)",
                  strokeWidth: 2,
                  opacity: 0.7,
                })}
                className="px-3 py-2 text-sm rounded border border-gray-600 hover:bg-gray-700"
              >
                Resistance
              </button>
              <button
                onClick={() => handleStyleChange({
                  strokeColor: "#0000ff",
                  fillColor: "rgba(0, 0, 255, 0.1)",
                  strokeWidth: 2,
                  opacity: 0.7,
                })}
                className="px-3 py-2 text-sm rounded border border-gray-600 hover:bg-gray-700"
              >
                Support
              </button>
              <button
                onClick={() => handleStyleChange({
                  strokeColor: "#ffff00",
                  fillColor: "rgba(255, 255, 0, 0.1)",
                  strokeWidth: 3,
                  opacity: 0.5,
                })}
                className="px-3 py-2 text-sm rounded border border-gray-600 hover:bg-gray-700"
              >
                Highlight
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
