"use client";
import { useRef, useEffect, useState } from "react";
import { useDrawing } from "@/contexts/DrawingContext";
import { drawingService } from "@/lib/drawing-service";
import DrawingStylePanel from "./DrawingStylePanel";

interface TrendlineDemoProps {
  isDarkMode?: boolean;
}

export default function TrendlineDemo({ isDarkMode = true }: TrendlineDemoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { activeTool, setActiveTool } = useDrawing();
  const [instructions, setInstructions] = useState("Select a drawing tool from the sidebar to start drawing");

  useEffect(() => {
    if (containerRef.current) {
      drawingService.initialize(containerRef.current);
    }
    
    return () => {
      drawingService.destroy();
    };
  }, []);
  
  useEffect(() => {
    drawingService.setActiveTool(activeTool);
    
    // Update instructions based on active tool
    switch (activeTool) {
      case "trendline":
        setInstructions("Click and drag to draw a trendline. Use selection tool to edit or delete.");
        break;
      case "selection":
        setInstructions("Click on any drawing to select it. Press Delete to remove selected drawing. Use Cursor/Selection Tool submenu to change cursor style.");
        break;
      case "horizontal-line":
        setInstructions("Click and drag to draw a horizontal line.");
        break;
      case "vertical-line":
        setInstructions("Click and drag to draw a vertical line.");
        break;
      case "rectangle":
        setInstructions("Click and drag to draw a rectangle. Perfect for highlighting support/resistance zones.");
        break;
      case "ellipse":
        setInstructions("Click and drag to draw an ellipse. Great for marking price action areas.");
        break;
      case "triangle":
        setInstructions("Click and drag to draw a triangle. Useful for marking consolidation patterns.");
        break;
      case "polygon":
        setInstructions("Click to add points for polygon. Double-click to finish. Create custom shapes for complex analysis.");
        break;
      case "arrow":
        setInstructions("Click and drag to draw an arrow. Point to important areas and show direction.");
        break;
      default:
        setInstructions("Select a drawing tool from the sidebar to start drawing");
    }
  }, [activeTool]);

  const handleClearAll = () => {
    drawingService.clearAllDrawings();
  };

  const handleDeleteSelected = () => {
    drawingService.deleteSelectedDrawing();
  };

  const handleRefreshCursor = () => {
    drawingService.refreshCursor();
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? "bg-[#131722]" : "bg-white"}`}>
      {/* Instructions */}
      <div className={`p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
        <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          {instructions}
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear All
          </button>
          <button
            onClick={handleDeleteSelected}
            className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Delete Selected
          </button>
          <button
            onClick={handleRefreshCursor}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Cursor
          </button>
        </div>
      </div>

      {/* Style Panel */}
      <DrawingStylePanel isDarkMode={isDarkMode} />

      {/* Drawing Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 relative ${isDarkMode ? "bg-[#131722]" : "bg-white"}`}
        style={{
          minHeight: "400px",
          backgroundImage: `
            linear-gradient(to right, ${isDarkMode ? "#2a2e39" : "#e5e7eb"} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDarkMode ? "#2a2e39" : "#e5e7eb"} 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      >
        {/* Sample chart-like content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Drawing Canvas - Use tools from sidebar
          </div>
        </div>
      </div>

      {/* Tool Status */}
      <div className={`p-2 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Active Tool: <span className="font-mono">{activeTool || "None"}</span>
        </p>
      </div>
    </div>
  );
}
