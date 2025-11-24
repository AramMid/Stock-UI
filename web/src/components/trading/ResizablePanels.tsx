"use client";
import { useState, useCallback, useRef, useEffect } from "react";

interface ResizablePanelsProps {
  children: React.ReactNode[];
  isDarkMode?: boolean;
}

export default function ResizablePanels({
  children,
  isDarkMode = true,
}: ResizablePanelsProps) {
  // Panel sizes as percentages
  const [horizontalSplit, setHorizontalSplit] = useState(70); // Left vs Right split (70% left, 30% right)
  const [leftVerticalSplit, setLeftVerticalSplit] = useState(70); // Chart vs Account Manager (70% chart, 30% account)
  const [rightVerticalSplit, setRightVerticalSplit] = useState(50); // Watchlist vs Details/News (50% each)

  // Panel visibility states
  const [panelVisibility, setPanelVisibility] = useState({
    chart: true,
    accountManager: true,
    watchlist: true,
    details: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<string | null>(null);

  const handleMouseDown = useCallback(
    (panel: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = panel;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    []
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    switch (isDragging.current) {
      case "horizontal":
        // Horizontal divider between left and right panels
        if (x < 5) {
          // Minimize left panels but don't hide completely
          setHorizontalSplit(5);
        } else if (x > 95) {
          // Minimize right panels but don't hide completely
          setHorizontalSplit(95);
        } else {
          // Normal resizing - ensure all panels are visible
          setPanelVisibility((prev) => ({
            ...prev,
            chart: true,
            accountManager: true,
            watchlist: true,
            details: true,
          }));
          setHorizontalSplit(Math.max(15, Math.min(85, x)));
        }
        break;

      case "leftVertical":
        // Vertical divider between chart and account manager
        if (y < 5) {
          setLeftVerticalSplit(5); // Minimize chart
        } else if (y > 95) {
          setLeftVerticalSplit(95); // Minimize account manager
        } else {
          setPanelVisibility((prev) => ({
            ...prev,
            chart: true,
            accountManager: true,
          }));
          setLeftVerticalSplit(Math.max(15, Math.min(85, y)));
        }
        break;

      case "rightVertical":
        // Vertical divider between watchlist and details
        if (y < 5) {
          setRightVerticalSplit(5); // Minimize watchlist
        } else if (y > 95) {
          setRightVerticalSplit(95); // Minimize details
        } else {
          setPanelVisibility((prev) => ({
            ...prev,
            watchlist: true,
            details: true,
          }));
          setRightVerticalSplit(Math.max(15, Math.min(85, y)));
        }
        break;
    }
  }, []);

  // Handle panel restore on click
  const handlePanelRestore = useCallback(
    (panelType: string) => {
      switch (panelType) {
        case "leftVertical":
          if (leftVerticalSplit <= 10) {
            setLeftVerticalSplit(60); // Restore chart
          } else if (leftVerticalSplit >= 90) {
            setLeftVerticalSplit(60); // Restore account manager
          }
          break;
        case "rightVertical":
          if (rightVerticalSplit <= 10) {
            setRightVerticalSplit(50); // Restore watchlist
          } else if (rightVerticalSplit >= 90) {
            setRightVerticalSplit(50); // Restore details
          }
          break;
        case "horizontal":
          if (horizontalSplit <= 10) {
            setHorizontalSplit(70); // Restore left panels
          } else if (horizontalSplit >= 90) {
            setHorizontalSplit(70); // Restore right panels
          }
          break;
      }
    },
    [leftVerticalSplit, rightVerticalSplit, horizontalSplit]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const dragHandleClass = `absolute bg-transparent hover:bg-blue-500/30 transition-colors z-50 ${
    isDarkMode ? "border-[#2a2e39]" : "border-gray-300"
  }`;

  return (
    <div ref={containerRef} className="relative w-full h-full flex gap-1 p-1">
      {/* Left Panel Container - Chart and Account Manager */}
      <div
        className="flex flex-col relative gap-1"
        style={{
          width: `${horizontalSplit}%`,
          display:
            panelVisibility.chart || panelVisibility.accountManager
              ? "flex"
              : "none",
        }}
      >
        {/* Chart Panel */}
        {panelVisibility.chart && (
          <div
            className="relative overflow-hidden bg-[#131722] border border-[#2a2e39] rounded"
            style={{ height: `${leftVerticalSplit}%` }}
          >
            <div className="p-1 h-full">{children[0]}</div>
          </div>
        )}

        {/* Left Vertical Drag Handle */}
        {panelVisibility.chart && panelVisibility.accountManager && (
          <div
            className="w-full h-2 cursor-row-resize bg-[#2a2e39] hover:bg-blue-500/30 rounded transition-colors"
            onMouseDown={handleMouseDown("leftVertical")}
            onDoubleClick={() => handlePanelRestore("leftVertical")}
          />
        )}

        {/* Account Manager Panel */}
        {panelVisibility.accountManager && (
          <div
            className="relative overflow-hidden bg-[#131722] border border-[#2a2e39] rounded"
            style={{ height: `${100 - leftVerticalSplit}%` }}
          >
            <div className="h-full">{children[1]}</div>
          </div>
        )}
      </div>

      {/* Horizontal Drag Handle */}
      {(panelVisibility.chart || panelVisibility.accountManager) &&
        (panelVisibility.watchlist || panelVisibility.details) && (
          <div
            className="w-2 h-full cursor-col-resize bg-[#2a2e39] hover:bg-blue-500/30 rounded transition-colors"
            onMouseDown={handleMouseDown("horizontal")}
            onDoubleClick={() => handlePanelRestore("horizontal")}
          />
        )}

      {/* Right Panel Container - Watchlist and Details */}
      <div
        className="flex flex-col relative gap-1"
        style={{
          width: `${100 - horizontalSplit}%`,
          display:
            panelVisibility.watchlist || panelVisibility.details
              ? "flex"
              : "none",
        }}
      >
        {/* Watchlist Panel */}
        {panelVisibility.watchlist && (
          <div
            className="relative overflow-hidden bg-[#131722] border border-[#2a2e39] rounded"
            style={{ height: `${rightVerticalSplit}%` }}
          >
            <div className="h-full">{children[2]}</div>
          </div>
        )}

        {/* Right Vertical Drag Handle */}
        {panelVisibility.watchlist && panelVisibility.details && (
          <div
            className="w-full h-2 cursor-row-resize bg-[#2a2e39] hover:bg-blue-500/30 rounded transition-colors"
            onMouseDown={handleMouseDown("rightVertical")}
            onDoubleClick={() => handlePanelRestore("rightVertical")}
          />
        )}

        {/* Details/News Panel */}
        {panelVisibility.details && (
          <div
            className="relative overflow-hidden bg-[#131722] border border-[#2a2e39] rounded"
            style={{ height: `${100 - rightVerticalSplit}%` }}
          >
            <div className="p-2 h-full">{children[3]}</div>
          </div>
        )}
      </div>
    </div>
  );
}
