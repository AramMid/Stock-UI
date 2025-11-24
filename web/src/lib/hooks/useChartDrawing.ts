// File: lib/hooks/useChartDrawing.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import { IChartApi, MouseEventParams, Time } from 'lightweight-charts';

export interface TrendLine {
  id: string;
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  color: string;
  width: number;
}

type DrawingMode = 'none' | 'drawing';

interface UseChartDrawingProps {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  mainChart: IChartApi | null;
  priceSeries: any;
  enabled: boolean;
  isDarkMode?: boolean;
}

export function useChartDrawing({
  containerRef,
  mainChart,
  priceSeries,
  enabled,
  isDarkMode = true,
}: UseChartDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeScaleRef = useRef<any>(null);
  
  const [trendlines, setTrendlines] = useState<TrendLine[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [currentLine, setCurrentLine] = useState<Partial<TrendLine> | null>(null);

  // Convert chart coordinates to canvas pixels
  const chartToCanvas = useCallback((time: number, price: number): { x: number; y: number } | null => {
    if (!timeScaleRef.current || !priceSeries) return null;

    try {
      const x = timeScaleRef.current.timeToCoordinate(time as Time);
      const y = priceSeries.priceToCoordinate(price);
      
      if (x === null || y === null) return null;
      
      return { x, y };
    } catch {
      return null;
    }
  }, [priceSeries]);

  // Draw all trendlines
  const redrawTrendlines = useCallback(() => {
    if (!canvasRef.current || !enabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved trendlines
    trendlines.forEach((line) => {
      const start = chartToCanvas(line.startTime, line.startPrice);
      const end = chartToCanvas(line.endTime, line.endPrice);

      if (!start || !end) return;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.stroke();

      // Control points
      ctx.fillStyle = line.color;
      ctx.fillRect(start.x - 4, start.y - 4, 8, 8);
      ctx.fillRect(end.x - 4, end.y - 4, 8, 8);
    });

    // Draw current line being drawn
    if (currentLine && currentLine.startTime && currentLine.startPrice && currentLine.endTime && currentLine.endPrice) {
      const start = chartToCanvas(currentLine.startTime, currentLine.startPrice);
      const end = chartToCanvas(currentLine.endTime, currentLine.endPrice);

      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = currentLine.color || '#2196F3';
        ctx.lineWidth = currentLine.width || 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = currentLine.color || '#2196F3';
        ctx.fillRect(start.x - 4, start.y - 4, 8, 8);
      }
    }
  }, [trendlines, currentLine, chartToCanvas, enabled]);

  // Initialize canvas overlay
  useEffect(() => {
    if (!enabled || !containerRef.current || !mainChart) {
      // Remove canvas if drawing is disabled
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      return;
    }

    const container = containerRef.current;
    
    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '10';
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }

    // Store time scale
    timeScaleRef.current = mainChart.timeScale();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (canvasRef.current && container) {
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
        redrawTrendlines();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [enabled, containerRef, mainChart, redrawTrendlines]);

  // Redraw on changes
  useEffect(() => {
    if (enabled) {
      redrawTrendlines();
    }
  }, [enabled, redrawTrendlines]);

  // Redraw on scroll/zoom
  useEffect(() => {
    if (!enabled || !timeScaleRef.current) return;

    const handleVisibleRangeChange = () => {
      redrawTrendlines();
    };

    timeScaleRef.current.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      timeScaleRef.current?.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [enabled, redrawTrendlines]);

  // Handle crosshair move
  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    if (!enabled || drawingMode !== 'drawing' || !currentLine) return;
    if (!param.time || param.point === undefined) return;

    const price = priceSeries?.coordinateToPrice(param.point.y);
    if (price === undefined || price === null) return;

    setCurrentLine((prev) => ({
      ...prev,
      endTime: param.time as number,
      endPrice: price,
    }));
  }, [enabled, drawingMode, currentLine, priceSeries]);

  // Subscribe to crosshair
  useEffect(() => {
    if (!enabled || !mainChart) return;

    mainChart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      mainChart?.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [enabled, mainChart, handleCrosshairMove]);

  // Handle click
  const handleClick = useCallback((e: MouseEvent) => {
    if (!enabled || !mainChart || !containerRef.current || !priceSeries) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = timeScaleRef.current?.coordinateToTime(x);
    const price = priceSeries.coordinateToPrice(y);

    if (time === undefined || price === undefined || price === null) return;

    if (drawingMode === 'none') {
      setDrawingMode('drawing');
      setCurrentLine({
        id: `line-${Date.now()}`,
        startTime: time as number,
        startPrice: price,
        endTime: time as number,
        endPrice: price,
        color: isDarkMode ? '#2196F3' : '#1976D2',
        width: 2,
      });
    } else if (drawingMode === 'drawing' && currentLine) {
      const newLine: TrendLine = {
        id: currentLine.id || `line-${Date.now()}`,
        startTime: currentLine.startTime!,
        startPrice: currentLine.startPrice!,
        endTime: time as number,
        endPrice: price,
        color: currentLine.color || (isDarkMode ? '#2196F3' : '#1976D2'),
        width: currentLine.width || 2,
      };

      setTrendlines((prev) => [...prev, newLine]);
      setCurrentLine(null);
      setDrawingMode('none');
    }
  }, [enabled, drawingMode, currentLine, containerRef, priceSeries, mainChart, isDarkMode]);

  // Add click listener
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [enabled, containerRef, handleClick]);

  // Update cursor style
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    if (drawingMode === 'drawing') {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = 'default';
    }

    return () => {
      container.style.cursor = 'default';
    };
  }, [enabled, drawingMode, containerRef]);

  return {
    trendlines,
    drawingMode,
    isDrawing: drawingMode === 'drawing',
    startDrawing: () => setDrawingMode('drawing'),
    cancelDrawing: () => {
      setDrawingMode('none');
      setCurrentLine(null);
    },
    clearAll: () => {
      setTrendlines([]);
      setCurrentLine(null);
      setDrawingMode('none');
    },
    undo: () => setTrendlines((prev) => prev.slice(0, -1)),
  };
}