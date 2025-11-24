"use client";
import BottomPanel from "./BottomPanel";

interface AccountManagerSectionProps {
  tradingPosition: any;
  isDarkMode: boolean;
  isDragging: boolean;
  isAccountCollapsed: boolean;
  isAccountMaximized: boolean;
  chartAccountSplit: number;
  onCollapsePanel: () => void;
  onOpenPanel: () => void;
  onMaximizePanel: () => void;
  onRestorePanel: () => void;
}

export default function AccountManagerSection({
  tradingPosition,
  isDarkMode,
  isDragging,
  isAccountCollapsed,
  isAccountMaximized,
  chartAccountSplit,
  onCollapsePanel,
  onOpenPanel,
  onMaximizePanel,
  onRestorePanel,
}: AccountManagerSectionProps) {
  return (
    <div
      className={`border rounded overflow-hidden relative transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#131722] border-[#2a2e39]"
          : "bg-white border-gray-200"
      }`}
      style={{
        // GPU acceleration and layout optimization
        willChange: isDragging ? "height" : "auto",
        transform: "translateZ(0)",
      }}
    >
      {/* Account Manager Header with Controls */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b transition-colors duration-200 ${
          isDarkMode
            ? "bg-[#1e222d] border-[#2a2e39]"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <h3
          className={`font-medium text-sm transition-colors duration-200 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Account Manager
        </h3>
        <div className="flex items-center gap-2">
          {/* Collapse/Open Panel Button - Only show collapse when not collapsed and not at header-only size */}
          {!isAccountCollapsed && chartAccountSplit < 90 && (
            <button
              onClick={onCollapsePanel}
              className={`p-1 rounded transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
              title="Collapse panel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
          )}

          {/* Open Panel Button - Only show when collapsed */}
          {isAccountCollapsed && (
            <button
              onClick={onOpenPanel}
              className={`p-1 rounded transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
              title="Open panel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="18,15 12,9 6,15"></polyline>
              </svg>
            </button>
          )}

          {/* Maximize/Restore Panel Button */}
          {!isAccountMaximized ? (
            <button
              onClick={onMaximizePanel}
              className={`p-1 rounded transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
              title="Maximize panel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15,3 21,3 21,9"></polyline>
                <polyline points="9,21 3,21 3,15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          ) : (
            <button
              onClick={onRestorePanel}
              className={`p-1 rounded transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
              title="Restore panel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4,14 10,14 10,20"></polyline>
                <polyline points="20,10 14,10 14,4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Account Manager Content - Hide when collapsed */}
      {!isAccountCollapsed && (
        <div className="flex-1 overflow-hidden">
          <BottomPanel
            tradingPosition={tradingPosition}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </div>
  );
}
