"use client";
import React, { useState } from "react";
import { X, Palette, Grid, Eye, BarChart, TrendingUp } from "lucide-react";

interface ChartSettings {
  // Chart appearance
  backgroundColor: string;
  gridLineColor: string;
  showGrid: boolean;
  gridLineStyle: "solid" | "dashed" | "dotted";

  // Price display
  showLastPrice: boolean;
  showPriceLabels: boolean;
  priceLineColor: string;

  // Candlestick colors
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;

  // Volume
  showVolume: boolean;
  volumeUpColor: string;
  volumeDownColor: string;

  // Technical indicators
  smaColor: string;
  emaColor: string;
  rsiColor: string;
  macdColor: string;

  // Chart behavior
  crosshairMode: "normal" | "magnet";
  scaleMode: "normal" | "logarithmic";
  timezone: string;
}

interface ChartSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChartSettings;
  onSettingsChange: (settings: ChartSettings) => void;
  isDarkMode?: boolean;
}

const defaultSettings: ChartSettings = {
  backgroundColor: "#131722",
  gridLineColor: "#2a2e39",
  showGrid: true,
  gridLineStyle: "solid",
  showLastPrice: true,
  showPriceLabels: true,
  priceLineColor: "#2196F3",
  upColor: "#26a69a",
  downColor: "#ef5350",
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
  showVolume: true,
  volumeUpColor: "#26a69a",
  volumeDownColor: "#ef5350",
  smaColor: "#2196F3",
  emaColor: "#ff9800",
  rsiColor: "#9c27b0",
  macdColor: "#4caf50",
  crosshairMode: "normal",
  scaleMode: "normal",
  timezone: "UTC",
};

/**
 * Comprehensive Chart Settings Modal
 * Task #10: Cài đặt biểu đồ (Chart Settings)
 */
export default function ChartSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  isDarkMode = true,
}: ChartSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "appearance" | "colors" | "behavior"
  >("appearance");
  const [localSettings, setLocalSettings] = useState<ChartSettings>(settings);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof ChartSettings>(
    key: K,
    value: ChartSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
  };

  const ColorPicker = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (color: string) => void;
  }) => (
    <div className="flex items-center justify-between py-2">
      <label
        className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-20 px-2 py-1 text-xs rounded border ${
            isDarkMode
              ? "bg-gray-800 border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
          }`}
        />
      </div>
    </div>
  );

  const tabs = [
    { id: "appearance", label: "Appearance", icon: Eye },
    { id: "colors", label: "Colors", icon: Palette },
    { id: "behavior", label: "Behavior", icon: BarChart },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`w-full max-w-4xl max-h-[90vh] m-4 rounded-2xl shadow-2xl overflow-hidden ${
          isDarkMode ? "bg-[#1e222d]" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h2
            className={`text-xl font-semibold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Chart Settings
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Tab Navigation */}
          <div
            className={`w-48 border-r ${
              isDarkMode
                ? "border-gray-700 bg-[#131722]"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="p-4">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors mb-2 ${
                      activeTab === tab.id
                        ? isDarkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-500 text-white"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h3
                      className={`text-lg font-medium mb-4 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Chart Appearance
                    </h3>

                    {/* Grid Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Show Grid Lines
                        </label>
                        <input
                          type="checkbox"
                          checked={localSettings.showGrid}
                          onChange={(e) =>
                            updateSetting("showGrid", e.target.checked)
                          }
                          className="accent-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Grid Line Style
                        </label>
                        <select
                          value={localSettings.gridLineStyle}
                          onChange={(e) =>
                            updateSetting(
                              "gridLineStyle",
                              e.target.value as any
                            )
                          }
                          className={`px-3 py-1 rounded border ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Show Last Price
                        </label>
                        <input
                          type="checkbox"
                          checked={localSettings.showLastPrice}
                          onChange={(e) =>
                            updateSetting("showLastPrice", e.target.checked)
                          }
                          className="accent-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Show Price Labels
                        </label>
                        <input
                          type="checkbox"
                          checked={localSettings.showPriceLabels}
                          onChange={(e) =>
                            updateSetting("showPriceLabels", e.target.checked)
                          }
                          className="accent-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Show Volume
                        </label>
                        <input
                          type="checkbox"
                          checked={localSettings.showVolume}
                          onChange={(e) =>
                            updateSetting("showVolume", e.target.checked)
                          }
                          className="accent-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "colors" && (
                <div className="space-y-6">
                  <div>
                    <h3
                      className={`text-lg font-medium mb-4 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Color Scheme
                    </h3>

                    {/* Background Colors */}
                    <div className="mb-6">
                      <h4
                        className={`text-md font-medium mb-3 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        Background & Grid
                      </h4>
                      <ColorPicker
                        label="Background Color"
                        value={localSettings.backgroundColor}
                        onChange={(color) =>
                          updateSetting("backgroundColor", color)
                        }
                      />
                      <ColorPicker
                        label="Grid Line Color"
                        value={localSettings.gridLineColor}
                        onChange={(color) =>
                          updateSetting("gridLineColor", color)
                        }
                      />
                      <ColorPicker
                        label="Price Line Color"
                        value={localSettings.priceLineColor}
                        onChange={(color) =>
                          updateSetting("priceLineColor", color)
                        }
                      />
                    </div>

                    {/* Candlestick Colors */}
                    <div className="mb-6">
                      <h4
                        className={`text-md font-medium mb-3 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        Candlestick Colors
                      </h4>
                      <ColorPicker
                        label="Up Candle Color"
                        value={localSettings.upColor}
                        onChange={(color) => updateSetting("upColor", color)}
                      />
                      <ColorPicker
                        label="Down Candle Color"
                        value={localSettings.downColor}
                        onChange={(color) => updateSetting("downColor", color)}
                      />
                      <ColorPicker
                        label="Up Wick Color"
                        value={localSettings.wickUpColor}
                        onChange={(color) =>
                          updateSetting("wickUpColor", color)
                        }
                      />
                      <ColorPicker
                        label="Down Wick Color"
                        value={localSettings.wickDownColor}
                        onChange={(color) =>
                          updateSetting("wickDownColor", color)
                        }
                      />
                    </div>

                    {/* Volume Colors */}
                    <div className="mb-6">
                      <h4
                        className={`text-md font-medium mb-3 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        Volume Colors
                      </h4>
                      <ColorPicker
                        label="Volume Up Color"
                        value={localSettings.volumeUpColor}
                        onChange={(color) =>
                          updateSetting("volumeUpColor", color)
                        }
                      />
                      <ColorPicker
                        label="Volume Down Color"
                        value={localSettings.volumeDownColor}
                        onChange={(color) =>
                          updateSetting("volumeDownColor", color)
                        }
                      />
                    </div>

                    {/* Indicator Colors */}
                    <div>
                      <h4
                        className={`text-md font-medium mb-3 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        Technical Indicators
                      </h4>
                      <ColorPicker
                        label="SMA Color"
                        value={localSettings.smaColor}
                        onChange={(color) => updateSetting("smaColor", color)}
                      />
                      <ColorPicker
                        label="EMA Color"
                        value={localSettings.emaColor}
                        onChange={(color) => updateSetting("emaColor", color)}
                      />
                      <ColorPicker
                        label="RSI Color"
                        value={localSettings.rsiColor}
                        onChange={(color) => updateSetting("rsiColor", color)}
                      />
                      <ColorPicker
                        label="MACD Color"
                        value={localSettings.macdColor}
                        onChange={(color) => updateSetting("macdColor", color)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "behavior" && (
                <div className="space-y-6">
                  <div>
                    <h3
                      className={`text-lg font-medium mb-4 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Chart Behavior
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Crosshair Mode
                        </label>
                        <select
                          value={localSettings.crosshairMode}
                          onChange={(e) =>
                            updateSetting(
                              "crosshairMode",
                              e.target.value as any
                            )
                          }
                          className={`px-3 py-1 rounded border ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          <option value="normal">Normal</option>
                          <option value="magnet">Magnet</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Scale Mode
                        </label>
                        <select
                          value={localSettings.scaleMode}
                          onChange={(e) =>
                            updateSetting("scaleMode", e.target.value as any)
                          }
                          className={`px-3 py-1 rounded border ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          <option value="normal">Linear</option>
                          <option value="logarithmic">Logarithmic</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <label
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Timezone
                        </label>
                        <select
                          value={localSettings.timezone}
                          onChange={(e) =>
                            updateSetting("timezone", e.target.value)
                          }
                          className={`px-3 py-1 rounded border ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">New York</option>
                          <option value="Europe/London">London</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                          <option value="Asia/Ho_Chi_Minh">Ho Chi Minh</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end space-x-3 px-6 py-4 border-t ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            onClick={handleReset}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
