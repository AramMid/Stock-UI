"use client";
import { useRef, useState, useCallback } from "react";
import { useResizableLayout } from "./useResizableLayout";

export function useLayoutManager() {
  // Refs
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rightSectionRef = useRef<HTMLDivElement>(null);

  // Chart vs Account Manager split
  const chartAccountLayout = useResizableLayout({
    initialSplit: 70,
    minSplit: 5,
    maxSplit: 95,
    containerRef: leftColumnRef
  });

  // Left vs Right section split
  const horizontalLayout = useResizableLayout({
    initialSplit: 75,
    minSplit: 40,
    maxSplit: 90,
    containerRef: mainContainerRef
  });

  // Right section splits
  const watchlistLayout = useResizableLayout({
    initialSplit: 40,
    minSplit: 20,
    maxSplit: 70,
    containerRef: rightSectionRef
  });

  const stockInfoLayout = useResizableLayout({
    initialSplit: 30,
    minSplit: 15,
    maxSplit: 60,
    containerRef: rightSectionRef
  });

  // Account panel states
  const [isAccountCollapsed, setIsAccountCollapsed] = useState(false);
  const [isAccountMaximized, setIsAccountMaximized] = useState(false);

  // Account panel controls
  const handleCollapsePanel = useCallback(() => {
    if (!isAccountCollapsed) {
      chartAccountLayout.setPreviousSplit(chartAccountLayout.split);
      chartAccountLayout.setSplit(95);
      setIsAccountCollapsed(true);
      setIsAccountMaximized(false);
    }
  }, [chartAccountLayout, isAccountCollapsed]);

  const handleOpenPanel = useCallback(() => {
    chartAccountLayout.setSplit(50);
    setIsAccountCollapsed(false);
    setIsAccountMaximized(false);
    chartAccountLayout.setPreviousSplit(50);
  }, [chartAccountLayout]);

  const handleMaximizePanel = useCallback(() => {
    if (!isAccountMaximized) {
      chartAccountLayout.setPreviousSplit(chartAccountLayout.split);
      chartAccountLayout.setSplit(5);
      setIsAccountMaximized(true);
      setIsAccountCollapsed(false);
    }
  }, [chartAccountLayout, isAccountMaximized]);

  const handleRestorePanel = useCallback(() => {
    chartAccountLayout.setSplit(chartAccountLayout.previousSplit);
    setIsAccountMaximized(false);
    setIsAccountCollapsed(false);
  }, [chartAccountLayout]);

  return {
    // Refs
    leftColumnRef,
    mainContainerRef,
    rightSectionRef,
    
    // Layout states
    chartAccountLayout,
    horizontalLayout,
    watchlistLayout,
    stockInfoLayout,
    
    // Account panel states
    isAccountCollapsed,
    isAccountMaximized,
    
    // Account panel controls
    handleCollapsePanel,
    handleOpenPanel,
    handleMaximizePanel,
    handleRestorePanel
  };
}
