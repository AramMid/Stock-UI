// File: lib/hooks/useChart.ts
"use client";

// FIXED: session persist + sanitize OHLC + no max update depth loop
// + indicators update realtime (tick) + per-candle update (3s)

import {
  useRef,
  useEffect,
  MutableRefObject,
  useState,
  useCallback,
} from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  MouseEventParams,
  Time,
} from "lightweight-charts";

import { CandlestickWithVolume, Timeframe } from "../types";
import { fetchYahooSeries } from "../api";
import { generateNextBarRealistic } from "../trading-utils";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from "../indicators";

export interface TrendLine {
  id: string;
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  color: string;
  width: number;
  isPrivate: boolean;
}

type DrawingMode = "none" | "drawing";

interface UseChartProps {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  symbol: string;
  timeframe: Timeframe;
  onPriceUpdate: (price: number) => void;
  onOHLCUpdate?: (ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  }) => void;
  onVolumeUpdate?: (volume: number) => void;
  isDarkMode?: boolean;
  showRSI?: boolean;
  showMACD?: boolean;
  chartType?: "candlestick" | "line" | "area";
  isPrivateMode?: boolean;
  enableTrendlineDrawing?: boolean;
  enableBrushDrawing?: boolean;
  activeTool?: string;
  onDrawingComplete?: () => void;
}

/** ===== Session persist ===== */
const PERSIST_VERSION = 1;

type PersistedChartState = {
  version: number;
  symbol: string;
  timeframe: Timeframe;
  chartType: "candlestick" | "line" | "area";
  isPrivateMode: boolean;
  trendlines: TrendLine[];
  bars: CandlestickWithVolume[];
  savedAt: number;
};

const storageKey = (
  symbol: string,
  timeframe: Timeframe,
  chartType: "candlestick" | "line" | "area",
  isPrivateMode: boolean
) =>
  `chart_state_v${PERSIST_VERSION}:${symbol}:${timeframe}:${chartType}:${
    isPrivateMode ? "private" : "public"
  }`;

const safeParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const toNum = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const sanitizeBars = (bars: any[]): CandlestickWithVolume[] => {
  if (!Array.isArray(bars)) return [];
  return bars
    .map((b) => {
      const time = toNum(b?.time);
      const open = toNum(b?.open);
      const high = toNum(b?.high);
      const low = toNum(b?.low);
      const close = toNum(b?.close);
      const volume = toNum(b?.volume) ?? 0;

      if (
        time == null ||
        open == null ||
        high == null ||
        low == null ||
        close == null
      )
        return null;

      const hi = Math.max(high, open, close);
      const lo = Math.min(low, open, close);

      return {
        time: time as Time,
        open,
        high: hi,
        low: lo,
        close,
        volume,
      } as CandlestickWithVolume;
    })
    .filter(Boolean) as CandlestickWithVolume[];
};

export function useChart({
  containerRef,
  symbol,
  timeframe,
  onPriceUpdate,
  onOHLCUpdate,
  onVolumeUpdate,
  isDarkMode = true,
  showRSI = false,
  showMACD = false,
  chartType = "candlestick",
  isPrivateMode = false,
  enableTrendlineDrawing = false,
  enableBrushDrawing = false,
  activeTool = "",
  onDrawingComplete,
}: UseChartProps) {
  // refs & state
  const isInitializedRef = useRef<string>("");
  const cleanupRef = useRef<(() => void) | null>(null);
  const isDisposedRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<number | null>(null);

  const hydratedRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<number | null>(null);

  const chartsRef = useRef<{
    mainChart: IChartApi | null;
    rsiChart: IChartApi | null;
    macdChart: IChartApi | null;
  }>({
    mainChart: null,
    rsiChart: null,
    macdChart: null,
  });

  const seriesRef = useRef<{
    priceSeries:
      | ISeriesApi<"Candlestick">
      | ISeriesApi<"Line">
      | ISeriesApi<"Area">
      | null;
    volumeSeries: ISeriesApi<"Histogram"> | null;
    smaSeries: ISeriesApi<"Line"> | null;
    emaSeries: ISeriesApi<"Line"> | null;
    bbUpperSeries: ISeriesApi<"Line"> | null;
    bbLowerSeries: ISeriesApi<"Line"> | null;
    bbMiddleSeries: ISeriesApi<"Line"> | null;
    rsiSeries: ISeriesApi<"Line"> | null;
    macdLineSeries: ISeriesApi<"Line"> | null;
  }>({
    priceSeries: null,
    volumeSeries: null,
    smaSeries: null,
    emaSeries: null,
    bbUpperSeries: null,
    bbLowerSeries: null,
    bbMiddleSeries: null,
    rsiSeries: null,
    macdLineSeries: null,
  });

  const dataRef = useRef<{
    bars: CandlestickWithVolume[];
    closes: number[];
    volumes: number[];
    lastBar: CandlestickWithVolume | null;
    timer: number | null;
  }>({
    bars: [],
    closes: [],
    volumes: [],
    lastBar: null,
    timer: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [trendlines, setTrendlines] = useState<TrendLine[]>([]);
  const trendlinesRef = useRef<TrendLine[]>([]);
  useEffect(() => {
    trendlinesRef.current = trendlines;
  }, [trendlines]);

  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [currentLine, setCurrentLine] = useState<Partial<TrendLine> | null>(
    null
  );
  const [selectedLine, setSelectedLine] = useState<{
    line: TrendLine;
    point: "start" | "end" | "body";
  } | null>(null);

  const [chartsReady, setChartsReady] = useState(false);

  const lastClickTimeRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);
  const originalLineRef = useRef<{
    line: TrendLine;
    point: "start" | "end" | "body";
  } | null>(null);

  const mouseDownPositionRef = useRef<{
    x: number;
    y: number;
    time: number;
    price: number;
  } | null>(null);

  const isDraggingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  const eventHandlersRef = useRef<{
    resizeHandler: (() => void) | null;
  }>({ resizeHandler: null });

  /** ===== Persist helpers ===== */
  const loadState = useCallback((): PersistedChartState | null => {
    if (typeof window === "undefined") return null;
    const key = storageKey(symbol, timeframe, chartType, isPrivateMode || false);
    return safeParse<PersistedChartState>(sessionStorage.getItem(key));
  }, [symbol, timeframe, chartType, isPrivateMode]);

  const saveStateNow = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    if (isDisposedRef.current) return;

    const key = storageKey(symbol, timeframe, chartType, isPrivateMode || false);

    const MAX_BARS = 600;
    const bars =
      dataRef.current.bars.length > MAX_BARS
        ? dataRef.current.bars.slice(-MAX_BARS)
        : dataRef.current.bars;

    const payload: PersistedChartState = {
      version: PERSIST_VERSION,
      symbol,
      timeframe,
      chartType,
      isPrivateMode: isPrivateMode || false,
      trendlines: trendlinesRef.current,
      bars,
      savedAt: Date.now(),
    };

    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [symbol, timeframe, chartType, isPrivateMode]);

  const scheduleSave = useCallback(() => {
    if (typeof window === "undefined") return;
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      saveStateNow();
      saveTimeoutRef.current = null;
    }, 250);
  }, [saveStateNow]);

  /** ===== helpers ===== */
  const chartToCanvas = useCallback(
    (time: number, price: number): { x: number; y: number } | null => {
      const { mainChart } = chartsRef.current;
      const { priceSeries } = seriesRef.current;
      if (!mainChart || !priceSeries) return null;
      try {
        const timeScale = mainChart.timeScale();
        const x = timeScale.timeToCoordinate(time as Time);
        const y = priceSeries.priceToCoordinate(price);
        if (x === null || y === null) return null;
        return { x, y };
      } catch {
        return null;
      }
    },
    []
  );

  const redrawTrendlines = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawLine = (line: Partial<TrendLine>) => {
      if (
        line.startTime === undefined ||
        line.endTime === undefined ||
        line.startPrice === undefined ||
        line.endPrice === undefined
      )
        return;

      const start = chartToCanvas(line.startTime, line.startPrice);
      const end = chartToCanvas(line.endTime, line.endPrice);
      if (!start || !end) return;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = line.color || "#2196F3";
      ctx.lineWidth = line.width || 2;
      ctx.stroke();

      ctx.fillStyle = line.color || "#2196F3";
      ctx.fillRect(start.x - 4, start.y - 4, 8, 8);
      ctx.fillRect(end.x - 4, end.y - 4, 8, 8);

      if (selectedLine && selectedLine.line.id === line.id) {
        ctx.fillStyle = "#ff0000";
        if (selectedLine.point === "start") {
          ctx.fillRect(start.x - 6, start.y - 6, 12, 12);
        } else if (selectedLine.point === "end") {
          ctx.fillRect(end.x - 6, end.y - 6, 12, 12);
        } else {
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          ctx.fillRect(midX - 6, midY - 6, 12, 12);
        }
      }
    };

    trendlines
      .filter((t) => t.isPrivate === (isPrivateMode || false))
      .forEach((t) => drawLine(t));

    if (
      currentLine &&
      enableTrendlineDrawing &&
      currentLine.isPrivate === (isPrivateMode || false)
    ) {
      const start =
        currentLine.startTime != null && currentLine.startPrice != null
          ? chartToCanvas(currentLine.startTime, currentLine.startPrice)
          : null;
      const end =
        currentLine.endTime != null && currentLine.endPrice != null
          ? chartToCanvas(currentLine.endTime, currentLine.endPrice)
          : null;

      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = currentLine.color || "#2196F3";
        ctx.lineWidth = currentLine.width || 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = currentLine.color || "#2196F3";
        ctx.fillRect(start.x - 4, start.y - 4, 8, 8);
      }
    }
  }, [
    trendlines,
    currentLine,
    chartToCanvas,
    enableTrendlineDrawing,
    isPrivateMode,
    selectedLine,
  ]);

  /** ===== drawing handlers ===== */
  const handleDrawingCrosshairMove = useCallback(
    (param: MouseEventParams) => {
      if (!param.time || param.point === undefined) return;

      if (enableTrendlineDrawing && drawingMode === "drawing" && currentLine) {
        const price = seriesRef.current.priceSeries?.coordinateToPrice(
          param.point.y
        );
        if (price === undefined || price === null) return;
        setCurrentLine((prev) => ({
          ...prev,
          endTime: param.time as number,
          endPrice: price,
        }));
        return;
      }

      if (
        selectedLine &&
        !enableTrendlineDrawing &&
        isMouseDownRef.current &&
        originalLineRef.current
      ) {
        const price = seriesRef.current.priceSeries?.coordinateToPrice(
          param.point.y
        );
        if (price === undefined || price === null) return;

        if (mouseDownPositionRef.current) {
          const startCanvas = chartToCanvas(
            mouseDownPositionRef.current.time,
            mouseDownPositionRef.current.price
          );
          const currentCanvas = chartToCanvas(param.time as number, price);

          if (startCanvas && currentCanvas) {
            const distance = Math.sqrt(
              Math.pow(currentCanvas.x - startCanvas.x, 2) +
                Math.pow(currentCanvas.y - startCanvas.y, 2)
            );
            if (distance > 5) isDraggingRef.current = true;
          }
        }

        if (!isDraggingRef.current) return;

        const originalLine = originalLineRef.current.line;

        if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);

        rafIdRef.current = requestAnimationFrame(() => {
          if (selectedLine.point === "body") {
            const originalMidTime =
              (originalLine.startTime + originalLine.endTime) / 2;
            const originalMidPrice =
              (originalLine.startPrice + originalLine.endPrice) / 2;

            const deltaTime = (param.time as number) - originalMidTime;
            const deltaPrice = price - originalMidPrice;

            setTrendlines((prev) =>
              prev.map((t) => {
                if (t.id === selectedLine.line.id) {
                  return {
                    ...t,
                    startTime: originalLine.startTime + deltaTime,
                    startPrice: originalLine.startPrice + deltaPrice,
                    endTime: originalLine.endTime + deltaTime,
                    endPrice: originalLine.endPrice + deltaPrice,
                  };
                }
                return t;
              })
            );
          } else if (
            selectedLine.point === "start" ||
            selectedLine.point === "end"
          ) {
            setTrendlines((prev) =>
              prev.map((t) => {
                if (t.id === selectedLine.line.id) {
                  if (selectedLine.point === "start") {
                    return {
                      ...t,
                      startTime: param.time as number,
                      startPrice: price,
                    };
                  }
                  return {
                    ...t,
                    endTime: param.time as number,
                    endPrice: price,
                  };
                }
                return t;
              })
            );
          }
          rafIdRef.current = null;
        });
      }
    },
    [
      enableTrendlineDrawing,
      drawingMode,
      currentLine,
      selectedLine,
      chartToCanvas,
    ]
  );

  const distancePointToLine = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleChartMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!chartsRef.current.mainChart || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const timeScale = chartsRef.current.mainChart.timeScale();
      const time = timeScale.coordinateToTime(x);
      const price = seriesRef.current.priceSeries?.coordinateToPrice(y);

      if (time === undefined || price === undefined || price === null) return;

      if (enableTrendlineDrawing) return;

      isMouseDownRef.current = true;
      isDraggingRef.current = false;
      mouseDownPositionRef.current = { x, y, time: time as number, price };

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      let clickedOnLine = false;

      for (let i = trendlines.length - 1; i >= 0; i--) {
        const line = trendlines[i];
        if (line.isPrivate !== (isPrivateMode || false)) continue;

        const start = chartToCanvas(line.startTime, line.startPrice);
        const end = chartToCanvas(line.endTime, line.endPrice);
        if (!start || !end) continue;

        const dist = distancePointToLine(x, y, start.x, start.y, end.x, end.y);

        if (dist <= 5) {
          const dStart = Math.sqrt(
            Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2)
          );
          const dEnd = Math.sqrt(
            Math.pow(x - end.x, 2) + Math.pow(y - end.y, 2)
          );

          const threshold = 10;
          let pointType: "start" | "end" | "body" = "body";
          if (dStart <= threshold && dStart <= dEnd) pointType = "start";
          else if (dEnd <= threshold) pointType = "end";

          const selectedData = { line: { ...line }, point: pointType };
          setSelectedLine(selectedData);
          originalLineRef.current = selectedData;

          clickedOnLine = true;
          break;
        }
      }

      if (!clickedOnLine) {
        setSelectedLine(null);
        originalLineRef.current = null;
        isMouseDownRef.current = false;
      }
    },
    [enableTrendlineDrawing, trendlines, isPrivateMode, chartToCanvas]
  );

  const handleChartClick = useCallback(
    (e: MouseEvent) => {
      if (!chartsRef.current.mainChart || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const timeScale = chartsRef.current.mainChart.timeScale();
      const time = timeScale.coordinateToTime(x);
      const price = seriesRef.current.priceSeries?.coordinateToPrice(y);
      if (time === undefined || price === undefined || price === null) return;

      if (enableTrendlineDrawing) {
        if (drawingMode === "none") {
          setDrawingMode("drawing");
          setCurrentLine({
            id: `line-${Date.now()}`,
            startTime: time as number,
            startPrice: price,
            endTime: time as number,
            endPrice: price,
            color: isDarkMode ? "#2196F3" : "#1976D2",
            width: 2,
            isPrivate: isPrivateMode || false,
          });
          return;
        }

        if (drawingMode === "drawing" && currentLine) {
          const newLine: TrendLine = {
            id: currentLine.id || `line-${Date.now()}`,
            startTime: currentLine.startTime!,
            startPrice: currentLine.startPrice!,
            endTime: time as number,
            endPrice: price,
            color: currentLine.color || (isDarkMode ? "#2196F3" : "#1976D2"),
            width: currentLine.width || 2,
            isPrivate: isPrivateMode || false,
          };
          setTrendlines((prev) => [...prev, newLine]);
          setCurrentLine(null);
          setDrawingMode("none");
          onDrawingComplete?.();
          scheduleSave();
          return;
        }
      }

      // double click to delete
      const now = Date.now();
      const dt = now - lastClickTimeRef.current;
      const isDoubleClick = dt < 300 && dt > 0;

      if (isDoubleClick) {
        for (let i = trendlines.length - 1; i >= 0; i--) {
          const line = trendlines[i];
          if (line.isPrivate !== (isPrivateMode || false)) continue;

          const start = chartToCanvas(line.startTime, line.startPrice);
          const end = chartToCanvas(line.endTime, line.endPrice);
          if (!start || !end) continue;

          const dist = distancePointToLine(x, y, start.x, start.y, end.x, end.y);
          if (dist <= 5) {
            setTrendlines((prev) => prev.filter((t) => t.id !== line.id));
            setSelectedLine(null);
            originalLineRef.current = null;
            scheduleSave();
            break;
          }
        }
        lastClickTimeRef.current = 0;
      } else {
        lastClickTimeRef.current = now;
      }
    },
    [
      enableTrendlineDrawing,
      drawingMode,
      currentLine,
      isDarkMode,
      trendlines,
      isPrivateMode,
      chartToCanvas,
      onDrawingComplete,
      scheduleSave,
    ]
  );

  /** ========= MAIN CHART INIT (DO NOT depend on trendlines/redraw) ========= */
  useEffect(() => {
    const currentKey = `${symbol}-${timeframe}-${isDarkMode}-${showRSI}-${showMACD}-${chartType}-${isPrivateMode}`;

    if (isInitializedRef.current === currentKey && !isDisposedRef.current) {
      return;
    }

    if (cleanupRef.current && !isDisposedRef.current) {
      try {
        cleanupRef.current();
      } catch {}
      cleanupRef.current = null;
    }

    isDisposedRef.current = false;
    hydratedRef.current = false;
    isInitializedRef.current = currentKey;
    setChartsReady(false);

    const container = containerRef.current;
    if (!container) return;

    try {
      if (container.parentNode) container.innerHTML = "";
    } catch {
      return;
    }

    const chartTheme = isDarkMode
      ? {
          layout: { background: { color: "#131722" }, textColor: "#d9d9d9" },
          grid: {
            vertLines: { color: "#2a2e39" },
            horzLines: { color: "#2a2e39" },
          },
          crosshair: { mode: CrosshairMode.Normal },
          timeScale: { borderColor: "#2a2e39" },
          rightPriceScale: { borderColor: "#2a2e39" },
        }
      : {
          layout: { background: { color: "#ffffff" }, textColor: "#374151" },
          grid: {
            vertLines: { color: "#e5e7eb" },
            horzLines: { color: "#e5e7eb" },
          },
          crosshair: { mode: CrosshairMode.Normal },
          timeScale: { borderColor: "#d1d5db" },
          rightPriceScale: { borderColor: "#d1d5db" },
        };

    const getContainerHeight = () => {
      const rect = container.getBoundingClientRect();
      return Math.max(rect.height || 300, 300);
    };

    const createChartsWithDynamicSizing = () => {
      const containerHeight = getContainerHeight();
      let mainChartHeight = containerHeight;
      let rsiHeight = 0;
      let macdHeight = 0;

      if (showRSI && showMACD) {
        mainChartHeight = Math.floor(containerHeight * 0.6);
        rsiHeight = Math.floor(containerHeight * 0.2);
        macdHeight = Math.floor(containerHeight * 0.2);
      } else if (showRSI || showMACD) {
        mainChartHeight = Math.floor(containerHeight * 0.75);
        if (showRSI) rsiHeight = Math.floor(containerHeight * 0.25);
        if (showMACD) macdHeight = Math.floor(containerHeight * 0.25);
      }

      return { mainChartHeight, rsiHeight, macdHeight };
    };

    const { mainChartHeight, rsiHeight, macdHeight } =
      createChartsWithDynamicSizing();

    const mainChart = createChart(container, {
      width: container.clientWidth,
      height: mainChartHeight,
      ...chartTheme,
    });

    // apply pan/scroll based on tools
    const shouldDisablePanScroll =
      enableTrendlineDrawing || enableBrushDrawing || !!selectedLine;
    mainChart.applyOptions({
      handleScroll: {
        mouseWheel: !shouldDisablePanScroll,
        pressedMouseMove: !shouldDisablePanScroll,
      },
      handleScale: {
        axisPressedMouseMove: !shouldDisablePanScroll,
        pinch: !shouldDisablePanScroll,
      },
    });

    const addLineSeries = (opts?: any) =>
      mainChart.addSeries(LineSeries, { lineWidth: 2, ...opts });

    let priceSeries:
      | ISeriesApi<"Candlestick">
      | ISeriesApi<"Line">
      | ISeriesApi<"Area">
      | null = null;

    if (chartType === "candlestick") {
      priceSeries = mainChart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });
    } else if (chartType === "line") {
      priceSeries = addLineSeries({ color: isDarkMode ? "#2196F3" : "#1976D2" });
    } else {
      priceSeries = mainChart.addSeries(AreaSeries, {
        topColor: isDarkMode
          ? "rgba(33, 150, 243, 0.56)"
          : "rgba(25, 118, 210, 0.56)",
        bottomColor: isDarkMode
          ? "rgba(33, 150, 243, 0.04)"
          : "rgba(25, 118, 210, 0.04)",
        lineColor: isDarkMode ? "#2196F3" : "#1976D2",
      });
    }

    const volumeSeries = mainChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      base: 0,
      color: isDarkMode ? "#64748b" : "#9ca3af",
    });
    volumeSeries
      .priceScale()
      .applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const smaSeries = addLineSeries({ color: isDarkMode ? "#3b82f6" : "blue" });
    const emaSeries = addLineSeries({
      color: isDarkMode ? "#f97316" : "orange",
    });
    const bbUpperSeries = addLineSeries({
      color: isDarkMode ? "#6b7280" : "gray",
      lineWidth: 1,
    });
    const bbLowerSeries = addLineSeries({
      color: isDarkMode ? "#6b7280" : "gray",
      lineWidth: 1,
    });
    const bbMiddleSeries = addLineSeries({
      color: isDarkMode ? "#374151" : "black",
      lineWidth: 1,
    });

    let rsiChart: IChartApi | null = null;
    let rsiSeries: ISeriesApi<"Line"> | null = null;
    if (showRSI && rsiHeight > 0) {
      const rsiContainer = document.createElement("div");
      rsiContainer.style.marginTop = "4px";
      rsiContainer.style.height = `${rsiHeight}px`;
      rsiContainer.style.overflow = "hidden";
      container.appendChild(rsiContainer);

      rsiChart = createChart(rsiContainer, {
        width: container.clientWidth,
        height: rsiHeight,
        ...chartTheme,
      });
      rsiSeries = rsiChart.addSeries(LineSeries, {
        color: isDarkMode ? "#a855f7" : "purple",
        lineWidth: 2,
      });
      rsiChart.applyOptions({
        rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 } },
      });
    }

    let macdChart: IChartApi | null = null;
    let macdLineSeries: ISeriesApi<"Line"> | null = null;
    if (showMACD && macdHeight > 0) {
      const macdContainer = document.createElement("div");
      macdContainer.style.marginTop = "4px";
      macdContainer.style.height = `${macdHeight}px`;
      macdContainer.style.overflow = "hidden";
      container.appendChild(macdContainer);

      macdChart = createChart(macdContainer, {
        width: container.clientWidth,
        height: macdHeight,
        ...chartTheme,
      });
      macdLineSeries = macdChart.addSeries(LineSeries, {
        color: isDarkMode ? "#10b981" : "green",
        lineWidth: 2,
      });
    }

    chartsRef.current = { mainChart, rsiChart, macdChart };
    seriesRef.current = {
      priceSeries,
      volumeSeries,
      smaSeries,
      emaSeries,
      bbUpperSeries,
      bbLowerSeries,
      bbMiddleSeries,
      rsiSeries,
      macdLineSeries,
    };

    setChartsReady(true);

    const initFromData = (raw: CandlestickWithVolume[]) => {
      const data = sanitizeBars(raw as any[]);
      if (!data.length) return;

      dataRef.current.bars = data.slice();
      dataRef.current.closes = data.map((b) => b.close);
      dataRef.current.volumes = data.map((b) => b.volume ?? 0);
      dataRef.current.lastBar = data[data.length - 1] ?? null;

      const safeMap = (arr: { time: Time; value: number }[]) =>
        arr.filter((p) => Number.isFinite(p.value));

      const ps = seriesRef.current.priceSeries;
      const vs = seriesRef.current.volumeSeries;
      if (!ps || !vs) return;

      if (chartType === "candlestick") {
        (ps as ISeriesApi<"Candlestick">).setData(
          data.map((d) => ({
            time: d.time as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        );
      } else {
        (ps as ISeriesApi<"Line"> | ISeriesApi<"Area">).setData(
          data.map((d) => ({ time: d.time as Time, value: d.close }))
        );
      }

      vs.setData(
        data.map((b) => ({
          time: b.time as Time,
          value: b.volume ?? 0,
          color: b.close >= b.open ? "#26a69a" : "#ef5350",
        }))
      );

      const last = dataRef.current.lastBar;
      if (last) {
        onPriceUpdate(last.close);
        onVolumeUpdate?.(last.volume ?? 0);

        if (onOHLCUpdate && data.length > 1) {
          const prev = data[data.length - 2];
          const change = last.close - prev.close;
          const changePercent = (change / prev.close) * 100;
          onOHLCUpdate({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            change,
            changePercent,
          });
        }
      }

      const closes = dataRef.current.closes;

      const sma = calculateSMA(closes, 14);
      const ema = calculateEMA(closes, 14);
      const rsi = calculateRSI(closes, 14);
      const macdObj = calculateMACD(closes);
      const bb = calculateBollingerBands(closes, 20);

      seriesRef.current.bbUpperSeries?.setData(
        safeMap(
          data.map((b, i) => ({ time: b.time as Time, value: bb.upper[i] }))
        )
      );
      seriesRef.current.bbLowerSeries?.setData(
        safeMap(
          data.map((b, i) => ({ time: b.time as Time, value: bb.lower[i] }))
        )
      );
      seriesRef.current.bbMiddleSeries?.setData(
        safeMap(
          data.map((b, i) => ({ time: b.time as Time, value: bb.middle[i] }))
        )
      );
      seriesRef.current.smaSeries?.setData(
        safeMap(data.map((b, i) => ({ time: b.time as Time, value: sma[i] })))
      );
      seriesRef.current.emaSeries?.setData(
        safeMap(data.map((b, i) => ({ time: b.time as Time, value: ema[i] })))
      );
      seriesRef.current.rsiSeries?.setData(
        safeMap(data.map((b, i) => ({ time: b.time as Time, value: rsi[i] })))
      );
      seriesRef.current.macdLineSeries?.setData(
        safeMap(
          data.map((b, i) => ({
            time: b.time as Time,
            value: macdObj.macdLine[i],
          }))
        )
      );
    };

    /** ===== START REPLAY (tick 2s, candle 3s) ===== */
    const startReplay = () => {
      if (dataRef.current.timer) return;

      let currentBar: CandlestickWithVolume | null = dataRef.current.lastBar
        ? { ...dataRef.current.lastBar }
        : null;

      let lastCandleTime = Date.now();

      const safeUpdate = (s: ISeriesApi<"Line"> | null, t: Time, v: number) => {
        if (!s) return;
        if (!Number.isFinite(v)) return;
        s.update({ time: t, value: v });
      };

      dataRef.current.timer = window.setInterval(() => {
        if (isDisposedRef.current) return;
        if (!currentBar) return;

        const bars = dataRef.current.bars;
        const closes = dataRef.current.closes;
        const volumes = dataRef.current.volumes;

        const ps = seriesRef.current.priceSeries;
        const vs = seriesRef.current.volumeSeries;
        if (!ps || !vs) return;

        const now = Date.now();

        // ===== create new candle every 3s =====
        if (now - lastCandleTime >= 3000) {
          const next: CandlestickWithVolume = {
            time: Math.floor(now / 1000) as Time,
            open: currentBar.open,
            high: currentBar.high,
            low: currentBar.low,
            close: currentBar.close,
            volume: currentBar.volume ?? 0,
          };

          bars.push(next);
          closes.push(next.close);
          volumes.push(next.volume ?? 0);
          dataRef.current.lastBar = next;

          // 1) price
          if (chartType === "candlestick") {
            (ps as ISeriesApi<"Candlestick">).update({
              time: next.time as Time,
              open: next.open,
              high: next.high,
              low: next.low,
              close: next.close,
            });
          } else {
            (ps as ISeriesApi<"Line"> | ISeriesApi<"Area">).update({
              time: next.time as Time,
              value: next.close,
            });
          }

          // 2) volume
          vs.update({
            time: next.time as Time,
            value: next.volume ?? 0,
            color: next.close >= next.open ? "#26a69a" : "#ef5350",
          });

          // 3) callbacks
          onPriceUpdate(next.close);
          if (onVolumeUpdate) onVolumeUpdate(next.volume ?? 0);

          if (onOHLCUpdate && bars.length > 1) {
            const prev = bars[bars.length - 2];
            const change = next.close - prev.close;
            const changePercent = (change / prev.close) * 100;
            onOHLCUpdate({
              open: next.open,
              high: next.high,
              low: next.low,
              close: next.close,
              change,
              changePercent,
            });
          }

          // 4) indicators (per-candle)
          const i = closes.length - 1;

          const smaArr = calculateSMA(closes, 14);
          const emaArr = calculateEMA(closes, 14);
          const rsiArr = calculateRSI(closes, 14);
          const macdObj = calculateMACD(closes);
          const bb = calculateBollingerBands(closes, 20);

          safeUpdate(seriesRef.current.smaSeries, next.time as Time, smaArr[i]);
          safeUpdate(seriesRef.current.emaSeries, next.time as Time, emaArr[i]);
          safeUpdate(seriesRef.current.rsiSeries, next.time as Time, rsiArr[i]);
          safeUpdate(
            seriesRef.current.macdLineSeries,
            next.time as Time,
            macdObj.macdLine[i]
          );
          safeUpdate(seriesRef.current.bbUpperSeries, next.time as Time, bb.upper[i]);
          safeUpdate(
            seriesRef.current.bbMiddleSeries,
            next.time as Time,
            bb.middle[i]
          );
          safeUpdate(seriesRef.current.bbLowerSeries, next.time as Time, bb.lower[i]);

          // finalize
          currentBar = { ...next };
          lastCandleTime = now;

          scheduleSave();
          return;
        }

        // ===== tick-by-tick update (every 2s) =====
        const tempBar = generateNextBarRealistic(currentBar, closes, volumes);
        currentBar = { ...tempBar };

        // realtime price callback
        onPriceUpdate(tempBar.close);

        // if you want live OHLC preview (optional) - enabled:
        const last = dataRef.current.lastBar;
        if (last && onOHLCUpdate) {
          const change = tempBar.close - last.close;
          const changePercent = (change / last.close) * 100;
          onOHLCUpdate({
            open: last.open,
            high: Math.max(last.high, tempBar.close),
            low: Math.min(last.low, tempBar.close),
            close: tempBar.close,
            change,
            changePercent,
          });
        }

        // Update indicators at last candle time (overwrite last point)
        const lastBar = dataRef.current.lastBar;
        if (!lastBar) return;
        const t = lastBar.time as Time;

        const closesLive =
          closes.length > 0
            ? (() => {
                const c = closes.slice();
                c[c.length - 1] = tempBar.close; // overwrite close cuối
                return c;
              })()
            : [tempBar.close];

        const i = closesLive.length - 1;

        const smaArr = calculateSMA(closesLive, 14);
        const emaArr = calculateEMA(closesLive, 14);
        const rsiArr = calculateRSI(closesLive, 14);
        const macdObj = calculateMACD(closesLive);
        const bb = calculateBollingerBands(closesLive, 20);

        safeUpdate(seriesRef.current.smaSeries, t, smaArr[i]);
        safeUpdate(seriesRef.current.emaSeries, t, emaArr[i]);
        safeUpdate(seriesRef.current.rsiSeries, t, rsiArr[i]);
        safeUpdate(seriesRef.current.macdLineSeries, t, macdObj.macdLine[i]);
        safeUpdate(seriesRef.current.bbUpperSeries, t, bb.upper[i]);
        safeUpdate(seriesRef.current.bbMiddleSeries, t, bb.middle[i]);
        safeUpdate(seriesRef.current.bbLowerSeries, t, bb.lower[i]);
      }, 2000);
    };

    /** ===== resize ===== */
    const handleChartResize = () => {
      if (isDisposedRef.current) return;
      if (!container || !document.contains(container)) return;

      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);

      const { mainChartHeight } = createChartsWithDynamicSizing();

      try {
        mainChart.resize(container.clientWidth, mainChartHeight);
        if (canvasRef.current) {
          canvasRef.current.width = container.clientWidth;
          canvasRef.current.height = mainChartHeight;
        }
        redrawTrendlines();
      } catch {}
    };

    const handleResizeWrapper = () => {
      if (!isDisposedRef.current) handleChartResize();
    };

    eventHandlersRef.current.resizeHandler = handleResizeWrapper;
    window.addEventListener("resize", handleResizeWrapper);

    // hydrate or fetch
    (async () => {
      try {
        const persisted = loadState();
        if (
          persisted &&
          persisted.version === PERSIST_VERSION &&
          persisted.symbol === symbol &&
          persisted.timeframe === timeframe &&
          persisted.chartType === chartType &&
          persisted.isPrivateMode === (isPrivateMode || false) &&
          Array.isArray(persisted.bars) &&
          persisted.bars.length > 0
        ) {
          setTrendlines(persisted.trendlines || []);
          initFromData(persisted.bars);
          hydratedRef.current = true;
          if (!isPrivateMode) setTimeout(() => startReplay(), 300);
          return;
        }

        const fetched = await fetchYahooSeries(symbol, timeframe, isPrivateMode);
        initFromData(fetched);
        hydratedRef.current = true;

        if (!isPrivateMode) setTimeout(() => startReplay(), 1000);
        scheduleSave();
      } catch {
        // ignore
      }
    })();

    const cleanup = () => {
      if (isDisposedRef.current) return;
      isDisposedRef.current = true;

      if (eventHandlersRef.current.resizeHandler) {
        window.removeEventListener("resize", eventHandlersRef.current.resizeHandler);
      }
      eventHandlersRef.current.resizeHandler = null;

      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      if (dataRef.current.timer) {
        window.clearInterval(dataRef.current.timer);
        dataRef.current.timer = null;
      }

      if (canvasRef.current) {
        try {
          canvasRef.current.remove();
        } catch {}
        canvasRef.current = null;
      }

      try {
        chartsRef.current.mainChart?.remove();
        chartsRef.current.rsiChart?.remove();
        chartsRef.current.macdChart?.remove();
      } catch {}

      chartsRef.current = { mainChart: null, rsiChart: null, macdChart: null };
      seriesRef.current = {
        priceSeries: null,
        volumeSeries: null,
        smaSeries: null,
        emaSeries: null,
        bbUpperSeries: null,
        bbLowerSeries: null,
        bbMiddleSeries: null,
        rsiSeries: null,
        macdLineSeries: null,
      };
    };

    cleanupRef.current = cleanup;
    return cleanup;
    // IMPORTANT: do not depend on trendlines/redraw to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    symbol,
    timeframe,
    isDarkMode,
    showRSI,
    showMACD,
    chartType,
    isPrivateMode,
    loadState,
    scheduleSave,
    enableTrendlineDrawing,
    enableBrushDrawing,
    selectedLine,
  ]);

  /** ========= CANVAS + EVENTS ========= */
  useEffect(() => {
    if (isDisposedRef.current) return;
    const container = containerRef.current;
    const { mainChart } = chartsRef.current;
    if (!container || !mainChart || !chartsReady) return;

    if (!canvasRef.current || !canvasRef.current.parentElement) {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "10";
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      container.style.position = "relative";
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const timeScale = mainChart.timeScale();
    const visibleRangeHandler = () => redrawTrendlines();

    container.addEventListener("click", handleChartClick);
    if (!enableTrendlineDrawing) container.addEventListener("mousedown", handleChartMouseDown);

    mainChart.subscribeCrosshairMove(handleDrawingCrosshairMove);
    timeScale.subscribeVisibleLogicalRangeChange(visibleRangeHandler);

    redrawTrendlines();

    return () => {
      try {
        container.removeEventListener("click", handleChartClick);
        container.removeEventListener("mousedown", handleChartMouseDown);
      } catch {}
      try {
        mainChart.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
      } catch {}
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(visibleRangeHandler);
      } catch {}
    };
  }, [
    chartsReady,
    enableTrendlineDrawing,
    handleChartClick,
    handleChartMouseDown,
    handleDrawingCrosshairMove,
    redrawTrendlines,
    // containerRef stable
  ]);

  // redraw + persist on changes
  useEffect(() => {
    if (chartsReady && canvasRef.current) redrawTrendlines();
    if (hydratedRef.current) scheduleSave();
  }, [chartsReady, trendlines, currentLine, redrawTrendlines, scheduleSave]);

  // cursor
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.style.cursor =
      enableTrendlineDrawing && drawingMode === "drawing"
        ? "crosshair"
        : "default";
    return () => {
      container.style.cursor = "default";
    };
  }, [enableTrendlineDrawing, drawingMode, containerRef]);

  // pan/scroll when tools active
  useEffect(() => {
    const { mainChart } = chartsRef.current;
    if (!mainChart) return;

    const shouldDisablePanScroll =
      enableTrendlineDrawing ||
      enableBrushDrawing ||
      !!selectedLine ||
      activeTool === "text";

    mainChart.applyOptions({
      handleScroll: {
        mouseWheel: !shouldDisablePanScroll,
        pressedMouseMove: !shouldDisablePanScroll,
      },
      handleScale: {
        axisPressedMouseMove: !shouldDisablePanScroll,
        pinch: !shouldDisablePanScroll,
      },
    });
  }, [enableTrendlineDrawing, enableBrushDrawing, selectedLine, activeTool]);

  // mouse up finalize selection + save
  useEffect(() => {
    const handleMouseUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      isMouseDownRef.current = false;
      isDraggingRef.current = false;
      mouseDownPositionRef.current = null;

      setSelectedLine(null);
      originalLineRef.current = null;

      if (hydratedRef.current) scheduleSave();
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [scheduleSave]);

  // drawing control helpers
  const startDrawing = useCallback(() => {
    if (enableTrendlineDrawing) setDrawingMode("drawing");
  }, [enableTrendlineDrawing]);

  const cancelDrawing = useCallback(() => {
    setDrawingMode("none");
    setCurrentLine(null);
  }, []);

  const clearAllTrendlines = useCallback(() => {
    setTrendlines((prev) =>
      prev.filter((t) => t.isPrivate !== (isPrivateMode || false))
    );
    setCurrentLine(null);
    setDrawingMode("none");
    scheduleSave();
  }, [isPrivateMode, scheduleSave]);

  const undoLastTrendline = useCallback(() => {
    setTrendlines((prev) => {
      const idx = prev
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.isPrivate === (isPrivateMode || false))
        .pop()?.i;

      if (idx === undefined) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    scheduleSave();
  }, [isPrivateMode, scheduleSave]);

  return {
    charts: chartsRef.current,
    series: seriesRef.current,
    isReady: chartsReady,
    drawing: {
      isEnabled: enableTrendlineDrawing,
      isDrawing: drawingMode === "drawing",
      trendlines: trendlines.filter(
        (t) => t.isPrivate === (isPrivateMode || false)
      ),
      startDrawing,
      cancelDrawing,
      clearAll: clearAllTrendlines,
      undo: undoLastTrendline,
    },
  };
}
