"use client";

interface ResizableDividerProps {
  isVertical?: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  title: string;
  splitPercentage?: number;
  isDisabled?: boolean;
  isDarkMode?: boolean;
}

export default function ResizableDivider({
  isVertical = true,
  isDragging,
  onMouseDown,
  onDoubleClick,
  title,
  splitPercentage,
  isDisabled = false,
  isDarkMode = true,
}: ResizableDividerProps) {
  const baseClasses = `flex items-center justify-center group relative rounded transition-all duration-200 ease-out`;

  const directionClasses = isVertical
    ? "cursor-row-resize"
    : "cursor-col-resize";

  // Theme-aware colors
  const themeColors = {
    base: isDarkMode ? "#2E2E2E" : "#d1d5db", // dark: custom gray, light: gray-300
    hover: isDarkMode ? "#3E3E3E" : "#9ca3af", // dark: lighter gray, light: gray-400
    active: "#3b82f6", // blue-500 for both themes
    disabled: isDarkMode ? "#2E2E2E" : "#e5e7eb", // dark: same as base, light: gray-200
  };

  const getBackgroundStyle = () => {
    if (isDisabled) {
      return { backgroundColor: themeColors.disabled };
    }
    if (isDragging) {
      return { backgroundColor: themeColors.active };
    }
    return { backgroundColor: themeColors.base };
  };

  const stateClasses = isDisabled
    ? "cursor-default"
    : isDragging
    ? `${directionClasses} shadow-xl border-2 border-blue-300 ${
        isVertical ? "scale-y-125" : "scale-x-125"
      }`
    : `${directionClasses} hover:shadow-md active:scale-105`;

  const indicatorDirection = isVertical
    ? "flex-col space-y-0.5"
    : "flex-row space-x-0.5";
  const indicatorSize = isVertical ? "h-0.5" : "w-0.5";
  const indicatorWidth = isVertical ? "w-" : "h-";
  const indicatorHeight = isVertical ? "h-" : "w-";

  return (
    <div
      className={`${baseClasses} ${stateClasses}`}
      onMouseDown={isDisabled ? undefined : onMouseDown}
      onDoubleClick={onDoubleClick}
      title={title}
      style={{
        ...getBackgroundStyle(),
        width: isVertical ? "auto" : "8px",
        height: isVertical ? "12px" : "auto",
        willChange: isDragging
          ? "background-color, transform, box-shadow"
          : "auto",
        transformOrigin: "center",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled && !isDragging) {
          e.currentTarget.style.backgroundColor = themeColors.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled && !isDragging) {
          e.currentTarget.style.backgroundColor = themeColors.base;
        }
      }}
    >
      {/* Visual Indicator - Hide when disabled */}
      {!isDisabled && (
        <div className={`flex ${indicatorDirection} pointer-events-none`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${indicatorSize} rounded-full transition-all duration-300 ease-out ${
                isDragging
                  ? isVertical
                    ? "w-12 shadow-lg shadow-blue-400/50"
                    : "h-12 shadow-lg shadow-blue-400/50"
                  : isVertical
                  ? "w-6 group-hover:w-9 group-hover:shadow-sm"
                  : "h-6 group-hover:h-9 group-hover:shadow-sm"
              }`}
              style={{
                backgroundColor: isDragging
                  ? "white"
                  : isDarkMode
                  ? "#9ca3af" // gray-400
                  : "#6b7280", // gray-500 for better contrast in light mode
              }}
            />
          ))}
        </div>
      )}

      {/* Enhanced drag hint tooltip with smooth animation */}
      {isDragging && splitPercentage !== undefined && (
        <div
          className={`absolute z-50 animate-pulse ${
            isVertical
              ? "-top-10 left-1/2 transform -translate-x-1/2"
              : "-left-20 top-1/2 transform -translate-y-1/2"
          } bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none border border-blue-400`}
        >
          <div className="font-mono font-semibold">
            {Math.round(splitPercentage)}% / {Math.round(100 - splitPercentage)}
            %
          </div>
          {/* Tooltip arrow */}
          <div
            className={`absolute ${
              isVertical
                ? "top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"
                : "left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-blue-600"
            }`}
          />
        </div>
      )}
    </div>
  );
}
