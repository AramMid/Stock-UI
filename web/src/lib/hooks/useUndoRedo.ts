"use client";
import { useState, useCallback, useRef } from "react";

export interface HistoryState {
  id: string;
  timestamp: number;
  type:
    | "drawing"
    | "indicator"
    | "layout"
    | "settings"
    | "symbol"
    | "timeframe";
  description: string;
  data: any;
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  enableDebounce?: boolean;
  debounceMs?: number;
}

interface UseUndoRedoReturn {
  // State
  canUndo: boolean;
  canRedo: boolean;
  currentIndex: number;
  history: HistoryState[];

  // Actions
  pushState: (state: Omit<HistoryState, "id" | "timestamp">) => void;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  clear: () => void;
  goToState: (index: number) => HistoryState | null;

  // Utilities
  getStateAtIndex: (index: number) => HistoryState | null;
  findLastStateOfType: (type: HistoryState["type"]) => HistoryState | null;
  removeStatesOfType: (type: HistoryState["type"]) => void;
}

/**
 * Custom hook for managing undo/redo functionality in trading charts
 * Supports drawings, indicators, layout changes, and other chart modifications
 */
export default function useUndoRedo(
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn {
  const {
    maxHistorySize = 50,
    enableDebounce = true,
    debounceMs = 300,
  } = options;

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate unique ID for each state
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Check if we can undo/redo
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Push new state to history
  const pushState = useCallback(
    (state: Omit<HistoryState, "id" | "timestamp">) => {
      const pushStateImmediate = () => {
        const newState: HistoryState = {
          ...state,
          id: generateId(),
          timestamp: Date.now(),
        };

        setHistory((prevHistory) => {
          // Remove any states after current index (when branching from middle of history)
          const newHistory = prevHistory.slice(0, currentIndex + 1);

          // Add new state
          newHistory.push(newState);

          // Trim history if it exceeds max size
          if (newHistory.length > maxHistorySize) {
            return newHistory.slice(-maxHistorySize);
          }

          return newHistory;
        });

        setCurrentIndex((prevIndex) => {
          const newIndex = Math.min(prevIndex + 1, maxHistorySize - 1);
          return newIndex;
        });
      };

      if (enableDebounce && state.type !== "layout") {
        // Clear existing timer
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        // Set new timer
        debounceTimer.current = setTimeout(pushStateImmediate, debounceMs);
      } else {
        pushStateImmediate();
      }
    },
    [currentIndex, maxHistorySize, enableDebounce, debounceMs, generateId]
  );

  // Undo to previous state
  const undo = useCallback((): HistoryState | null => {
    if (!canUndo) return null;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);

    return history[newIndex] || null;
  }, [canUndo, currentIndex, history]);

  // Redo to next state
  const redo = useCallback((): HistoryState | null => {
    if (!canRedo) return null;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);

    return history[newIndex] || null;
  }, [canRedo, currentIndex, history]);

  // Clear all history
  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);

    // Clear any pending debounced actions
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  // Go to specific state index
  const goToState = useCallback(
    (index: number): HistoryState | null => {
      if (index < 0 || index >= history.length) return null;

      setCurrentIndex(index);
      return history[index] || null;
    },
    [history]
  );

  // Get state at specific index
  const getStateAtIndex = useCallback(
    (index: number): HistoryState | null => {
      if (index < 0 || index >= history.length) return null;
      return history[index] || null;
    },
    [history]
  );

  // Find last state of specific type
  const findLastStateOfType = useCallback(
    (type: HistoryState["type"]): HistoryState | null => {
      for (let i = currentIndex; i >= 0; i--) {
        if (history[i] && history[i].type === type) {
          return history[i];
        }
      }
      return null;
    },
    [history, currentIndex]
  );

  // Remove all states of specific type
  const removeStatesOfType = useCallback((type: HistoryState["type"]) => {
    setHistory((prevHistory) => {
      const filteredHistory = prevHistory.filter(
        (state) => state.type !== type
      );
      const removedCount = prevHistory.length - filteredHistory.length;

      // Adjust current index if needed
      if (removedCount > 0) {
        setCurrentIndex((prevIndex) => Math.max(-1, prevIndex - removedCount));
      }

      return filteredHistory;
    });
  }, []);

  return {
    // State
    canUndo,
    canRedo,
    currentIndex,
    history,

    // Actions
    pushState,
    undo,
    redo,
    clear,
    goToState,

    // Utilities
    getStateAtIndex,
    findLastStateOfType,
    removeStatesOfType,
  };
}

// Helper functions for common chart operations
export const createDrawingState = (
  drawingType: string,
  drawingData: any,
  description?: string
): Omit<HistoryState, "id" | "timestamp"> => ({
  type: "drawing",
  description: description || `Added ${drawingType}`,
  data: {
    action: "add",
    drawingType,
    drawingData,
  },
});

export const createIndicatorState = (
  indicatorType: string,
  indicatorData: any,
  action: "add" | "remove" | "modify" = "add",
  description?: string
): Omit<HistoryState, "id" | "timestamp"> => ({
  type: "indicator",
  description:
    description ||
    `${
      action === "add" ? "Added" : action === "remove" ? "Removed" : "Modified"
    } ${indicatorType}`,
  data: {
    action,
    indicatorType,
    indicatorData,
  },
});

export const createLayoutState = (
  layoutType: string,
  layoutData: any,
  description?: string
): Omit<HistoryState, "id" | "timestamp"> => ({
  type: "layout",
  description: description || `Changed layout to ${layoutType}`,
  data: {
    action: "change",
    layoutType,
    layoutData,
  },
});

export const createSymbolState = (
  symbol: string,
  previousSymbol?: string,
  description?: string
): Omit<HistoryState, "id" | "timestamp"> => ({
  type: "symbol",
  description: description || `Changed symbol to ${symbol}`,
  data: {
    action: "change",
    symbol,
    previousSymbol,
  },
});

export const createTimeframeState = (
  timeframe: string,
  previousTimeframe?: string,
  description?: string
): Omit<HistoryState, "id" | "timestamp"> => ({
  type: "timeframe",
  description: description || `Changed timeframe to ${timeframe}`,
  data: {
    action: "change",
    timeframe,
    previousTimeframe,
  },
});
