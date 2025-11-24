"use client";
import { useRef, useCallback, useEffect } from "react";

export function useChartResize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const animationFrameRef = useRef<number | null>(null);
  const lastResizeTimeRef = useRef<number>(0);

  const triggerChartResize = useCallback(() => {
    const now = Date.now();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (now - lastResizeTimeRef.current >= 16) {
        const resizeEvent = new CustomEvent("chartResize");
        window.dispatchEvent(resizeEvent);
        lastResizeTimeRef.current = now;
      }
    });
  }, []);

  useEffect(() => {
    const chartContainer = containerRef.current;
    if (!chartContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      triggerChartResize();
    });

    resizeObserver.observe(chartContainer);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [triggerChartResize]);

  return { triggerChartResize };
}
