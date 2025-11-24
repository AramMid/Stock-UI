// File: components/trading/DrawingControls.tsx
import React from 'react';
import { Undo, Trash2, XCircle } from 'lucide-react';

interface DrawingControlsProps {
  isEnabled: boolean;
  isDrawing: boolean;
  trendlineCount: number;
  onUndo: () => void;
  onClearAll: () => void;
  isDarkMode?: boolean;
}

export default function DrawingControls({
  isEnabled,
  isDrawing,
  trendlineCount,
  onUndo,
  onClearAll,
  isDarkMode = true,
}: DrawingControlsProps) {
  if (!isEnabled) return null;

  return (
    <div className="absolute top-2 left-2 z-20 flex gap-2 pointer-events-auto">
      {/* Drawing Instructions - Show when in drawing mode */}
      {isDrawing && (
        <div className={`px-3 py-2 text-xs rounded shadow-lg animate-pulse ${
          isDarkMode
            ? 'bg-blue-900/90 text-blue-100 border border-blue-700'
            : 'bg-blue-100 text-blue-900 border border-blue-300'
        }`}>
          <p className="font-semibold mb-1 flex items-center gap-1">
            <span className="text-lg">📏</span> Drawing Mode Active
          </p>
          <p className="text-[10px] leading-tight opacity-90">
            <strong>Step 1:</strong> Click to place start point<br/>
            <strong>Step 2:</strong> Move mouse to preview<br/>
            <strong>Step 3:</strong> Click again to finish<br/>
            <kbd className="px-1 py-0.5 bg-black/20 rounded text-[9px] font-mono">ESC</kbd> to cancel
          </p>
        </div>
      )}
      
      {/* Control Buttons - Always show when drawing is enabled */}
      <div className="flex gap-2">
        {/* Undo Button - Only show when there are trendlines */}
        {trendlineCount > 0 && (
          <button
            onClick={onUndo}
            className={`px-3 py-2 text-xs rounded font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
            }`}
            title="Undo last trendline (Ctrl+Z)"
          >
            <Undo size={14} />
            <span>Undo</span>
          </button>
        )}
        
        {/* Clear All Button - Only show when there are trendlines */}
        {trendlineCount > 0 && (
          <button
            onClick={onClearAll}
            className={`px-3 py-2 text-xs rounded font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'bg-red-700 text-white hover:bg-red-600 border border-red-600'
                : 'bg-red-600 text-white hover:bg-red-700 border border-red-700'
            }`}
            title="Clear all trendlines"
          >
            <Trash2 size={14} />
            <span>Clear All ({trendlineCount})</span>
          </button>
        )}

        {/* Info Badge - Show trendline count when not drawing */}
        {!isDrawing && trendlineCount === 0 && (
          <div className={`px-3 py-2 text-xs rounded flex items-center gap-2 ${
            isDarkMode
              ? 'bg-gray-800/80 text-gray-400 border border-gray-700'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}>
            <span className="text-sm">📏</span>
            <span>Click on chart to start drawing</span>
          </div>
        )}
      </div>
    </div>
  );
}