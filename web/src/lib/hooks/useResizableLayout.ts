"use client";
import { useState, useCallback, useRef } from "react";

interface UseResizableLayoutOptions {
  initialSplit: number;
  minSplit: number;
  maxSplit: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSplitChange?: (split: number) => void;
}

export function useResizableLayout({
  initialSplit,
  minSplit,
  maxSplit,
  containerRef,
  onSplitChange
}: UseResizableLayoutOptions) {
  const [split, setSplit] = useState(initialSplit);
  const [isDragging, setIsDragging] = useState(false);
  const [previousSplit, setPreviousSplit] = useState(initialSplit);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, isVertical: boolean = true) => {
      e.preventDefault();
      setIsDragging(true);

      const container = containerRef.current;
      if (!container) return;

      const startPos = isVertical ? e.clientY : e.clientX;
      const containerRect = container.getBoundingClientRect();
      const containerSize = isVertical ? containerRect.height : containerRect.width;
      const startSplit = split;

      let lastUpdateTime = 0;
      const updateThreshold = 8; // ~120fps

      const handleMouseMove = (e: MouseEvent) => {
        const now = performance.now();
        if (now - lastUpdateTime < updateThreshold) return;
        lastUpdateTime = now;

        requestAnimationFrame(() => {
          const currentPos = isVertical ? e.clientY : e.clientX;
          const delta = currentPos - startPos;
          const deltaPercentage = (delta / containerSize) * 100;
          let newSplit = startSplit + deltaPercentage;

          // Smooth constraints with easing near boundaries
          if (newSplit < minSplit) {
            newSplit = minSplit + (newSplit - minSplit) * 0.1;
          } else if (newSplit > maxSplit) {
            newSplit = maxSplit + (newSplit - maxSplit) * 0.1;
          }

          newSplit = Math.max(minSplit, Math.min(maxSplit, newSplit));
          setSplit(newSplit);
          onSplitChange?.(newSplit);
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        setPreviousSplit(split);

        // Add smooth transition back
        if (containerRef.current) {
          const property = isVertical ? "grid-template-rows" : "grid-template-columns";
          containerRef.current.style.transition = `${property} 0.2s ease-out`;
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.style.transition = "";
            }
          }, 200);
        }
      };

      document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";

      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp);
    },
    [split, minSplit, maxSplit, containerRef, onSplitChange]
  );

  const resetSplit = useCallback(() => {
    setSplit(initialSplit);
    setPreviousSplit(initialSplit);
    onSplitChange?.(initialSplit);
  }, [initialSplit, onSplitChange]);

  return {
    split,
    setSplit,
    isDragging,
    previousSplit,
    setPreviousSplit,
    handleMouseDown,
    resetSplit
  };
}
