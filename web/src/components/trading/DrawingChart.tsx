import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  MouseEventParams, 
  CandlestickSeries,
  Time,
  ITimeScaleApi
} from 'lightweight-charts';

// Trendline data structure
interface TrendLine {
  id: string;
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  color: string;
  width: number;
}

// Drawing state
type DrawingMode = 'none' | 'drawing';

const DrawingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [trendlines, setTrendlines] = useState<TrendLine[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [currentLine, setCurrentLine] = useState<Partial<TrendLine> | null>(null);
  
  // Store time scale for coordinate conversion
  const timeScaleRef = useRef<ITimeScaleApi<Time> | null>(null);

  // Generate sample candlestick data
  const generateSampleData = () => {
    const data = [];
    const basePrice = 100;
    let currentPrice = basePrice;
    const startTime = Math.floor(Date.now() / 1000) - 86400 * 100; // 100 days ago

    for (let i = 0; i < 100; i++) {
      const time = startTime + i * 86400;
      const open = currentPrice;
      const close = open + (Math.random() - 0.5) * 5;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      
      data.push({
        time: time as Time,
        open,
        high,
        low,
        close,
      });
      
      currentPrice = close;
    }
    
    return data;
  };

  // Convert chart coordinates (time, price) to canvas pixels
  const chartToCanvas = useCallback((time: number, price: number): { x: number; y: number } | null => {
    if (!timeScaleRef.current || !seriesRef.current) return null;

    try {
      const x = timeScaleRef.current.timeToCoordinate(time as Time);
      const y = seriesRef.current.priceToCoordinate(price);
      
      if (x === null || y === null) return null;
      
      return { x, y };
    } catch {
      return null;
    }
  }, []);

  // Draw all trendlines on canvas
  const redrawTrendlines = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all saved trendlines
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

      // Draw control points
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

        // Draw start point
        ctx.fillStyle = currentLine.color || '#2196F3';
        ctx.fillRect(start.x - 4, start.y - 4, 8, 8);
      }
    }
  }, [trendlines, currentLine, chartToCanvas]);

  // Handle mouse movement during drawing
  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    if (drawingMode !== 'drawing' || !currentLine) return;
    if (!param.time || param.point === undefined) return;

    const price = seriesRef.current?.coordinateToPrice(param.point.y);
    if (price === undefined || price === null) return;

    setCurrentLine((prev) => ({
      ...prev,
      endTime: param.time as number,
      endPrice: price,
    }));
  }, [drawingMode, currentLine]);

  // Handle click to start/finish drawing
  const handleChartClick = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return;

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = timeScaleRef.current?.coordinateToTime(x);
    const price = seriesRef.current?.coordinateToPrice(y);

    if (time === undefined || price === undefined || price === null) return;

    if (drawingMode === 'none') {
      // Start drawing
      setDrawingMode('drawing');
      setCurrentLine({
        id: `line-${Date.now()}`,
        startTime: time as number,
        startPrice: price,
        endTime: time as number,
        endPrice: price,
        color: '#2196F3',
        width: 2,
      });
    } else if (drawingMode === 'drawing' && currentLine) {
      // Finish drawing
      const newLine: TrendLine = {
        id: currentLine.id || `line-${Date.now()}`,
        startTime: currentLine.startTime!,
        startPrice: currentLine.startPrice!,
        endTime: time as number,
        endPrice: price,
        color: currentLine.color || '#2196F3',
        width: currentLine.width || 2,
      };

      setTrendlines((prev) => [...prev, newLine]);
      setCurrentLine(null);
      setDrawingMode('none');
    }
  }, [drawingMode, currentLine]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#131722' },
        textColor: '#d9d9d9',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const data = generateSampleData();
    series.setData(data);

    chartRef.current = chart;
    seriesRef.current = series;
    timeScaleRef.current = chart.timeScale();

    // Create canvas overlay for drawings
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.width = chartContainerRef.current.clientWidth;
    canvas.height = 600;
    chartContainerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && canvas) {
        chart.resize(chartContainerRef.current.clientWidth, 600);
        canvas.width = chartContainerRef.current.clientWidth;
        canvas.height = 600;
        redrawTrendlines();
      }
    };

    window.addEventListener('resize', handleResize);

    // Subscribe to crosshair move for live drawing
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      canvas.remove();
    };
  }, [handleCrosshairMove, redrawTrendlines]);

  // Redraw when trendlines or currentLine changes
  useEffect(() => {
    redrawTrendlines();
  }, [redrawTrendlines]);

  // Redraw on scroll/zoom
  useEffect(() => {
    if (!chartRef.current) return;

    const handleVisibleRangeChange = () => {
      redrawTrendlines();
    };

    timeScaleRef.current?.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      timeScaleRef.current?.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [redrawTrendlines]);

  // Clear all trendlines
  const handleClear = () => {
    setTrendlines([]);
    setCurrentLine(null);
    setDrawingMode('none');
  };

  // Delete last trendline
  const handleUndo = () => {
    setTrendlines((prev) => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 min-h-screen">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => {
            if (drawingMode === 'none') {
              setDrawingMode('drawing');
            } else {
              setDrawingMode('none');
              setCurrentLine(null);
            }
          }}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            drawingMode === 'drawing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {drawingMode === 'drawing' ? 'Drawing Mode (Click to place points)' : 'Start Drawing'}
        </button>
        
        <button
          onClick={handleUndo}
          disabled={trendlines.length === 0}
          className="px-4 py-2 rounded bg-yellow-600 text-white font-medium hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          Undo Last
        </button>
        
        <button
          onClick={handleClear}
          className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
        >
          Clear All
        </button>

        <div className="ml-auto text-gray-400 text-sm">
          Trendlines: {trendlines.length}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h3 className="text-white font-semibold mb-2">Instructions:</h3>
        <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
          <li>Click &quot;Start Drawing&quot; to enable drawing mode</li>
          <li>Click on the chart to set the first point of the trendline</li>
          <li>Move your mouse to see the line preview</li>
          <li>Click again to set the second point and complete the line</li>
          <li>The trendline will stay at the same time + price coordinates when you scroll or zoom</li>
          <li>Use &quot;Undo Last&quot; to remove the most recent line</li>
          <li>Use &quot;Clear All&quot; to remove all trendlines</li>
        </ul>
      </div>

      <div
        ref={chartContainerRef}
        onClick={handleChartClick}
        className="relative bg-[#131722] rounded overflow-hidden"
        style={{ cursor: drawingMode === 'drawing' ? 'crosshair' : 'default' }}
      />
    </div>
  );
};

export default DrawingChart;