"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type DrawingTool = 
  | "selection"
  | "trendline"
  | "extended-line"
  | "ray"
  | "horizontal-line"
  | "vertical-line"
  | "trend-channel"
  | "parallel-channel"
  | "fibonacci"
  | "shapes"
  | "brush"
  | "text"
  | "measure"
  | "zoom"
  | "bar-pattern"
  | "lock"
  | "delete"
  | "visibility";

interface DrawingContextType {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawing: boolean) => void;
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState<DrawingTool>("selection");
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  return (
    <DrawingContext.Provider
      value={{
        activeTool,
        setActiveTool,
        isDrawingMode,
        setIsDrawingMode,
      }}
    >
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawing() {
  const context = useContext(DrawingContext);
  if (context === undefined) {
    throw new Error("useDrawing must be used within a DrawingProvider");
  }
  return context;
}