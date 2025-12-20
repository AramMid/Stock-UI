// File: lib/hooks/useChart.ts - OPTIMIZED & FIXED + SESSION PERSISTENCE (PUBLIC ONLY)
// ✅ FIX: Each symbol/timeframe/chartType has its own session (no data bleeding across symbols)
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

/* =========================================================
   SESSION PERSISTENCE (bars + trendlines) via sessionStorage
   ✅ PUBLIC ONLY (isPrivateMode === false)
   ========================================================= */
const CHART_SESSION_VERSION = 1;
const CHART_SESSION_PREFIX = "sim_chart_session_v1";
const MAX_SAVED_BARS = 1500;

type PersistedBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PersistedChartSession = {
  v: number;
  symbol: string;
  timeframe: string;
  isPrivateMode: boolean;
  chartType: "candlestick" | "line" | "area";
  savedAt: number;
  bars: PersistedBar[];
  trendlines: TrendLine[];
};

const buildSessionKey = (
  symbol: string,
  timeframe: Timeframe,
  chartType: "candlestick" | "line" | "area"
) => `${CHART_SESSION_PREFIX}:${symbol}:${timeframe}:PUBLIC:${chartType}`;

const safeNumber = (n: any) =>
  typeof n === "number" && Number.isFinite(n) ? n : null;

const sanitizeBarsForSave = (bars: CandlestickWithVolume[]): PersistedBar[] => {
  const sliced = bars.slice(-MAX_SAVED_BARS);
  const out: PersistedBar[] = [];
  for (const b of sliced) {
    const time = safeNumber(b.time);
    const open = safeNumber(b.open);
    const high = safeNumber(b.high);
    const low = safeNumber(b.low);
    const close = safeNumber(b.close);
    const volume = safeNumber(b.volume);
    if (
      time === null ||
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      volume === null
    )
      continue;
    out.push({ time, open, high, low, close, volume });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
};

const sanitizeBarsForUse = (bars: PersistedBar[]): CandlestickWithVolume[] => {
  const out: CandlestickWithVolume[] = [];
  for (const b of bars || []) {
    if (
      !Number.isFinite(b.time) ||
      !Number.isFinite(b.open) ||
      !Number.isFinite(b.high) ||
      !Number.isFinite(b.low) ||
      !Number.isFinite(b.close) ||
      !Number.isFinite(b.volume)
    )
      continue;
    out.push({
      time: b.time as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    });
  }
  out.sort((a, b) => (a.time as number) - (b.time as number));
  const dedup: CandlestickWithVolume[] = [];
  let lastT: number | null = null;
  for (const b of out) {
    const t = b.time as number;
    if (lastT === t) continue;
    dedup.push(b);
    lastT = t;
  }
  return dedup;
};

const mergeBarsByTime = (
  a: CandlestickWithVolume[],
  b: CandlestickWithVolume[]
): CandlestickWithVolume[] => {
  const map = new Map<number, CandlestickWithVolume>();
  for (const x of a) map.set(x.time as number, x);
  for (const x of b) map.set(x.time as number, x);
  const merged = Array.from(map.values()).sort(
    (x, y) => (x.time as number) - (y.time as number)
  );
  return merged.slice(-MAX_SAVED_BARS);
};

const loadChartSession = (key: string): PersistedChartSession | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChartSession;
    if (!parsed || parsed.v !== CHART_SESSION_VERSION) return null;
    if (!Array.isArray(parsed.bars)) return null;
    if (!Array.isArray(parsed.trendlines)) parsed.trendlines = [];
    return parsed;
  } catch {
    return null;
  }
};

const saveChartSession = (key: string, payload: PersistedChartSession) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
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
  // ===== callback refs to avoid re-init loops =====
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onOHLCUpdateRef = useRef(onOHLCUpdate);
  const onVolumeUpdateRef = useRef(onVolumeUpdate);

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);
  useEffect(() => {
    onOHLCUpdateRef.current = onOHLCUpdate;
  }, [onOHLCUpdate]);
  useEffect(() => {
    onVolumeUpdateRef.current = onVolumeUpdate;
  }, [onVolumeUpdate]);

  // refs & state
  const isInitializedRef = useRef<string>("");
  const cleanupRef = useRef<(() => void) | null>(null);
  const isDisposedRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<number | null>(null);

  const chartsRef = useRef<{
    mainChart: IChartApi | null;
    rsiChart: IChartApi | null;
    macdChart: IChartApi | null;
  }>({ mainChart: null, rsiChart: null, macdChart: null });

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

  const lastClickTimeRef = useRef<number>(0);

  // Store references to event handlers for proper cleanup
  const eventHandlersRef = useRef<{
    chartResizeHandler: (() => void) | null;
    resizeHandler: (() => void) | null;
  }>({ chartResizeHandler: null, resizeHandler: null });

  const crosshairSubscribedRef = useRef(false);

  // ============= Persist Layer (PUBLIC ONLY) =============
  const persistKeyRef = useRef<string>(""); // empty means disabled
  const persistTimerRef = useRef<number | null>(null);

  const persistMetaRef = useRef<{
    symbol: string;
    timeframe: Timeframe;
    chartType: "candlestick" | "line" | "area";
  }>({ symbol, timeframe, chartType });

  useEffect(() => {
    persistMetaRef.current = { symbol, timeframe, chartType };
  }, [symbol, timeframe, chartType]);

  const flushPersist = useCallback(() => {
    // ✅ Only persist for PUBLIC
    if (isPrivateMode) return;

    const key = persistKeyRef.current;
    if (!key) return;

    const meta = persistMetaRef.current;
    const bars = sanitizeBarsForSave(dataRef.current.bars);

    // ✅ Only save PUBLIC trendlines
    const publicTrendlines = (trendlinesRef.current || []).filter(
      (t) => !t.isPrivate
    );

    const payload: PersistedChartSession = {
      v: CHART_SESSION_VERSION,
      symbol: meta.symbol,
      timeframe: meta.timeframe,
      isPrivateMode: false,
      chartType: meta.chartType,
      savedAt: Date.now(),
      bars,
      trendlines: publicTrendlines,
    };

    saveChartSession(key, payload);
  }, [isPrivateMode]);

  const schedulePersist = useCallback(() => {
    // ✅ Only persist for PUBLIC
    if (isPrivateMode) return;
    if (!persistKeyRef.current) return;

    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      flushPersist();
    }, 250);
  }, [flushPersist, isPrivateMode]);

  // helpers
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
        !line.startTime ||
        !line.endTime ||
        !line.startPrice ||
        !line.endPrice
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
        currentLine.startTime && currentLine.startPrice
          ? chartToCanvas(currentLine.startTime, currentLine.startPrice)
          : null;
      const end =
        currentLine.endTime && currentLine.endPrice
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
    chartToCanvas,
    trendlines,
    isPrivateMode,
    currentLine,
    enableTrendlineDrawing,
    selectedLine,
  ]);

  // IMPORTANT: use ref to avoid putting redrawTrendlines into init effect deps
  const redrawTrendlinesRef = useRef(redrawTrendlines);
  useEffect(() => {
    redrawTrendlinesRef.current = redrawTrendlines;
  }, [redrawTrendlines]);

  // drawing handlers (same logic)
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
      } else if (
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

        if (isDraggingRef.current) {
          const originalLine = originalLineRef.current.line;

          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
          }

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
                    } else {
                      return {
                        ...t,
                        endTime: param.time as number,
                        endPrice: price,
                      };
                    }
                  }
                  return t;
                })
              );
            }

            rafIdRef.current = null;
          });
        }
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

        const distanceToLine = distancePointToLine(
          x,
          y,
          start.x,
          start.y,
          end.x,
          end.y
        );

        if (distanceToLine <= 5) {
          const distanceToStart = Math.sqrt(
            Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2)
          );
          const distanceToEnd = Math.sqrt(
            Math.pow(x - end.x, 2) + Math.pow(y - end.y, 2)
          );

          const threshold = 10;
          let pointType: "start" | "end" | "body" = "body";

          if (
            distanceToStart <= threshold &&
            distanceToStart <= distanceToEnd
          ) {
            pointType = "start";
          } else if (distanceToEnd <= threshold) {
            pointType = "end";
          }

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
    [
      containerRef,
      enableTrendlineDrawing,
      trendlines,
      isPrivateMode,
      chartToCanvas,
    ]
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
        } else if (drawingMode === "drawing" && currentLine) {
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

          // ✅ persist only if PUBLIC line
          schedulePersist();
        }
      } else {
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

            const dist = distancePointToLine(
              x,
              y,
              start.x,
              start.y,
              end.x,
              end.y
            );
            if (dist <= 5) {
              setTrendlines((prev) => prev.filter((t) => t.id !== line.id));
              setSelectedLine(null);
              originalLineRef.current = null;

              schedulePersist();
              break;
            }
          }
          lastClickTimeRef.current = 0;
        } else {
          lastClickTimeRef.current = now;
        }
      }
    },
    [
      containerRef,
      enableTrendlineDrawing,
      drawingMode,
      currentLine,
      isDarkMode,
      isPrivateMode,
      trendlines,
      chartToCanvas,
      onDrawingComplete,
      schedulePersist,
    ]
  );

  // ✅ persist when trendlines change (PUBLIC ONLY inside schedulePersist)
  useEffect(() => {
    if (!persistKeyRef.current) return;
    schedulePersist();
  }, [trendlines, schedulePersist]);

  // ---------- MAIN CHART INITIALIZATION (ONLY stable deps) ----------
  useEffect(() => {
    const currentKey = `${symbol}-${timeframe}-${isDarkMode}-${showRSI}-${showMACD}-${chartType}-${isPrivateMode}`;
    if (isInitializedRef.current === currentKey && !isDisposedRef.current)
      return;

    if (cleanupRef.current && !isDisposedRef.current) {
      try {
        cleanupRef.current();
      } catch {}
      cleanupRef.current = null;
    }

    isDisposedRef.current = false;
    isInitializedRef.current = currentKey;
    setChartsReady(false);

    const container = containerRef.current;
    if (!container) return;

    try {
      if (container.parentNode) container.innerHTML = "";
    } catch {
      return;
    }

    crosshairSubscribedRef.current = false;

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
      priceSeries = addLineSeries({
        color: isDarkMode ? "#2196F3" : "#1976D2",
      });
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

    // ✅ FIX: reset dataRef (ref keeps old symbol's data if not cleared)
    dataRef.current.bars = [];
    dataRef.current.closes = [];
    dataRef.current.volumes = [];
    dataRef.current.lastBar = null;

    // ✅ FIX: clear series so old symbol data won't flash/bleed
    try {
      seriesRef.current.priceSeries?.setData([]);
      seriesRef.current.volumeSeries?.setData([]);
      seriesRef.current.smaSeries?.setData([]);
      seriesRef.current.emaSeries?.setData([]);
      seriesRef.current.bbUpperSeries?.setData([]);
      seriesRef.current.bbMiddleSeries?.setData([]);
      seriesRef.current.bbLowerSeries?.setData([]);
      seriesRef.current.rsiSeries?.setData([]);
      seriesRef.current.macdLineSeries?.setData([]);
    } catch {}

    const setupCrosshairHandler = () => {
      const onVol = onVolumeUpdateRef.current;
      if (!onVol) return;
      if (crosshairSubscribedRef.current) return;
      crosshairSubscribedRef.current = true;

      mainChart.subscribeCrosshairMove((param) => {
        if (!param.time || dataRef.current.bars.length === 0) return;
        const found = dataRef.current.bars.find((b) => b.time === param.time);
        if (found) onVol(found.volume);
      });
    };

    const initFromData = (data: CandlestickWithVolume[]) => {
      const {
        priceSeries,
        volumeSeries,
        smaSeries,
        emaSeries,
        bbUpperSeries,
        bbLowerSeries,
        bbMiddleSeries,
        rsiSeries,
        macdLineSeries,
      } = seriesRef.current;

      if (!priceSeries || !volumeSeries || !smaSeries || !emaSeries) return;

      dataRef.current.bars = data.slice();
      dataRef.current.closes = data.map((b) => b.close);
      dataRef.current.volumes = data.map((b) => b.volume);
      dataRef.current.lastBar = data[data.length - 1] ?? null;

      const safeMap = (arr: { time: Time; value: number }[]) =>
        arr.filter((p) => !isNaN(p.value));

      priceSeries.setData(
        chartType === "candlestick"
          ? data.map((d) => ({
              time: d.time as Time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            }))
          : data.map((d) => ({ time: d.time as Time, value: d.close }))
      );

      volumeSeries.setData(
        data.map((b) => ({
          time: b.time as Time,
          value: b.volume,
          color: b.close >= b.open ? "#26a69a" : "#ef5350",
        }))
      );

      const last = dataRef.current.lastBar;
      if (last) {
        onPriceUpdateRef.current?.(last.close);
        onVolumeUpdateRef.current?.(last.volume);

        if (onOHLCUpdateRef.current && data.length > 1) {
          const prev = data[data.length - 2];
          const change = last.close - prev.close;
          const changePercent = (change / prev.close) * 100;
          onOHLCUpdateRef.current({
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

      bbUpperSeries?.setData(
        safeMap(
          data.map((b, i) => ({ time: b.time as Time, value: bb.upper[i] }))
        )
      );
      bbLowerSeries?.setData(
        safeMap(
          data.map((b, i) => ({ time: b.time as Time, value: bb.lower[i] }))
        )
      );
      bbMiddleSeries?.setData(
        safeMap(
          data.map((b, i) => ({ time: b.time as Time, value: bb.middle[i] }))
        )
      );

      smaSeries.setData(
        safeMap(data.map((b, i) => ({ time: b.time as Time, value: sma[i] })))
      );
      emaSeries.setData(
        safeMap(data.map((b, i) => ({ time: b.time as Time, value: ema[i] })))
      );

      rsiSeries?.setData(
        safeMap(data.map((b, i) => ({ time: b.time as Time, value: rsi[i] })))
      );
      macdLineSeries?.setData(
        safeMap(
          data.map((b, i) => ({
            time: b.time as Time,
            value: macdObj.macdLine[i],
          }))
        )
      );

      setupCrosshairHandler();
      schedulePersist(); // PUBLIC only
    };

    const startReplay = () => {
      if (dataRef.current.timer) return;

      let currentBar: CandlestickWithVolume | null = dataRef.current.lastBar
        ? { ...dataRef.current.lastBar }
        : null;
      let lastCandleTime = Date.now();

      dataRef.current.timer = window.setInterval(() => {
        if (isDisposedRef.current) {
          if (dataRef.current.timer) {
            window.clearInterval(dataRef.current.timer);
            dataRef.current.timer = null;
          }
          return;
        }

        const { bars, closes, lastBar } = dataRef.current;
        const { priceSeries, volumeSeries } = seriesRef.current;
        if (!lastBar || !priceSeries || !volumeSeries || !currentBar) return;

        const now = Date.now();
        if (now - lastCandleTime >= 3000) {
          const next: CandlestickWithVolume = {
            time: Math.floor(now / 1000) as Time,
            open: currentBar.open,
            high: currentBar.high,
            low: currentBar.low,
            close: currentBar.close,
            volume: currentBar.volume,
          };

          bars.push(next);
          closes.push(next.close);
          dataRef.current.lastBar = next;

          // ===== UPDATE INDICATORS REAL-TIME =====
          const closesArr = dataRef.current.closes;

          // SMA / EMA
          const smaArr = calculateSMA(closesArr, 14);
          const emaArr = calculateEMA(closesArr, 14);

          // RSI
          const rsiArr = calculateRSI(closesArr, 14);

          // MACD
          const macdObj = calculateMACD(closesArr);

          // Bollinger Bands
          const bb = calculateBollingerBands(closesArr, 20);

          const idx = closesArr.length - 1;
          const t = next.time as Time;

          // --- SMA / EMA ---
          seriesRef.current.smaSeries?.update({
            time: t,
            value: smaArr[idx],
          });

          seriesRef.current.emaSeries?.update({
            time: t,
            value: emaArr[idx],
          });

          // --- RSI ---
          if (seriesRef.current.rsiSeries && rsiArr[idx] !== undefined) {
            seriesRef.current.rsiSeries.update({
              time: t,
              value: rsiArr[idx],
            });
          }

          // --- MACD ---
          if (
            seriesRef.current.macdLineSeries &&
            macdObj.macdLine[idx] !== undefined
          ) {
            seriesRef.current.macdLineSeries.update({
              time: t,
              value: macdObj.macdLine[idx],
            });
          }

          // --- Bollinger Bands ---
          seriesRef.current.bbUpperSeries?.update({
            time: t,
            value: bb.upper[idx],
          });
          seriesRef.current.bbMiddleSeries?.update({
            time: t,
            value: bb.middle[idx],
          });
          seriesRef.current.bbLowerSeries?.update({
            time: t,
            value: bb.lower[idx],
          });

          try {
            if (chartType === "candlestick") {
              priceSeries.update({ ...next, time: next.time as Time });
            } else {
              priceSeries.update({ time: next.time as Time, value: next.close });
            }
            volumeSeries.update({
              time: next.time as Time,
              value: next.volume,
              color: next.close >= next.open ? "#26a69a" : "#ef5350",
            });

            onPriceUpdateRef.current?.(next.close);

            const ohlcCb = onOHLCUpdateRef.current;
            if (ohlcCb && bars.length > 1) {
              const prev = bars[bars.length - 2];
              const change = next.close - prev.close;
              const changePercent = (change / prev.close) * 100;
              ohlcCb({
                open: next.open,
                high: next.high,
                low: next.low,
                close: next.close,
                change,
                changePercent,
              });
            }

            currentBar = { ...next };
            lastCandleTime = now;
            schedulePersist(); // PUBLIC only
          } catch {}
        } else {
          const volumes = bars.map((b) => b.volume);
          const tempBar = generateNextBarRealistic(currentBar, closes, volumes);
          currentBar = { ...tempBar };
          onPriceUpdateRef.current?.(tempBar.close);
        }
      }, 2000);
    };

    const handleChartResize = () => {
      if (isDisposedRef.current) return;
      if (typeof window === "undefined") return;
      if (!container || !document.contains(container)) return;

      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);

      const {
        mainChartHeight: newMainHeight,
        rsiHeight: newRsi,
        macdHeight: newMacd,
      } = createChartsWithDynamicSizing();

      try {
        mainChart.resize(container.clientWidth, newMainHeight);
        if (rsiChart) rsiChart.resize(container.clientWidth, newRsi);
        if (macdChart) macdChart.resize(container.clientWidth, newMacd);

        if (canvasRef.current) {
          canvasRef.current.width = container.clientWidth;
          canvasRef.current.height = newMainHeight;
          redrawTrendlinesRef.current();
        }
      } catch {}

      resizeTimeoutRef.current = window.setTimeout(() => {
        if (isDisposedRef.current) return;
        if (!container || !document.contains(container)) return;

        try {
          const { mainChartHeight: nm, rsiHeight: nr, macdHeight: nm2 } =
            createChartsWithDynamicSizing();

          mainChart.resize(container.clientWidth, nm);
          if (rsiChart) rsiChart.resize(container.clientWidth, nr);
          if (macdChart) macdChart.resize(container.clientWidth, nm2);

          if (canvasRef.current) {
            canvasRef.current.width = container.clientWidth;
            canvasRef.current.height = nm;
            redrawTrendlinesRef.current();
          }
        } catch {}
      }, 16);
    };

    const handleChartResizeWrapper = () => {
      if (!isDisposedRef.current) handleChartResize();
    };

    eventHandlersRef.current.chartResizeHandler = handleChartResizeWrapper;
    eventHandlersRef.current.resizeHandler = handleChartResizeWrapper;

    window.addEventListener("chartResize", handleChartResizeWrapper);
    window.addEventListener("resize", handleChartResizeWrapper);

    let resizeObserver: ResizeObserver | null = null;
    try {
      resizeObserver = new ResizeObserver(() => {
        if (isDisposedRef.current) return;
        requestAnimationFrame(() => {
          if (!isDisposedRef.current) handleChartResize();
        });
      });
      resizeObserver.observe(container);
    } catch {}

    // ===== RESTORE SESSION BEFORE FETCH (PUBLIC ONLY) =====
    // ✅ FIX: do NOT use dataRef.current.bars.length to decide merge (it may contain previous symbol)
    let restoredUsed = false;

    if (!isPrivateMode) {
      persistKeyRef.current = buildSessionKey(symbol, timeframe, chartType);
      const restored = loadChartSession(persistKeyRef.current);

      if (restored) {
        // restore ONLY public trendlines
        if (Array.isArray(restored.trendlines)) {
          const restoredPublic = restored.trendlines
            .filter((t) => !t.isPrivate)
            .map((t) => ({ ...t, isPrivate: false }));
          setTrendlines((prev) => {
            const keepPrivate = prev.filter((t) => t.isPrivate);
            return [...keepPrivate, ...restoredPublic];
          });
        }

        const restoredBars = sanitizeBarsForUse(restored.bars);
        if (restoredBars.length > 0) {
          restoredUsed = true;
          initFromData(restoredBars);
          setTimeout(() => startReplay(), 300);
        }
      }
    } else {
      // PRIVATE: disable persist completely
      persistKeyRef.current = "";
    }

    (async () => {
      try {
        const fetched = await fetchYahooSeries(symbol, timeframe, isPrivateMode);

        // ✅ Only merge if THIS symbol actually restored from its own session
        initFromData(
          restoredUsed ? mergeBarsByTime(dataRef.current.bars, fetched) : fetched
        );

        // Replay only for PUBLIC
        if (!isPrivateMode) setTimeout(() => startReplay(), 1000);
      } catch {}
    })();

    const cleanup = () => {
      if (isDisposedRef.current) return;
      isDisposedRef.current = true;

      try {
        if (persistTimerRef.current) {
          window.clearTimeout(persistTimerRef.current);
          persistTimerRef.current = null;
        }
        flushPersist(); // PUBLIC only
      } catch {}

      if (eventHandlersRef.current.chartResizeHandler) {
        window.removeEventListener(
          "chartResize",
          eventHandlersRef.current.chartResizeHandler
        );
      }
      if (eventHandlersRef.current.resizeHandler) {
        window.removeEventListener("resize", eventHandlersRef.current.resizeHandler);
      }
      eventHandlersRef.current.chartResizeHandler = null;
      eventHandlersRef.current.resizeHandler = null;

      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch {}
      }

      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }

      if (dataRef.current.timer) {
        window.clearInterval(dataRef.current.timer);
        dataRef.current.timer = null;
      }

      if (canvasRef.current) {
        try {
          if (canvasRef.current.parentNode) canvasRef.current.remove();
        } catch {}
        canvasRef.current = null;
      }

      try {
        const { mainChart, rsiChart, macdChart } = chartsRef.current;

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

        if (mainChart) mainChart.remove();
        if (rsiChart) rsiChart.remove();
        if (macdChart) macdChart.remove();

        chartsRef.current = {
          mainChart: null,
          rsiChart: null,
          macdChart: null,
        };
      } catch {}
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [
    symbol,
    timeframe,
    isDarkMode,
    showRSI,
    showMACD,
    chartType,
    isPrivateMode,
    containerRef,
    flushPersist,
    schedulePersist,
  ]);

  // ---------- CANVAS & EVENTS ----------
  useEffect(() => {
    if (isDisposedRef.current) return;

    const container = containerRef.current;
    const { mainChart } = chartsRef.current;

    if (!container || !mainChart || !chartsReady) return;

    // create canvas once
    if (!canvasRef.current || !canvasRef.current.parentElement) {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "10";

      container.style.position = "relative";
      canvas.width = container.clientWidth;
      // IMPORTANT: canvas should match MAIN chart height, not full container height (which includes subcharts)
      canvas.height = (mainChart as any)?._height ?? container.clientHeight;

      container.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const timeScale = mainChart.timeScale();
    const visibleRangeHandler = () => redrawTrendlinesRef.current();

    container.addEventListener("click", handleChartClick);
    if (!enableTrendlineDrawing)
      container.addEventListener("mousedown", handleChartMouseDown);

    timeScale.subscribeVisibleLogicalRangeChange(visibleRangeHandler);

    // If you use custom crosshair handler for drawing:
    mainChart.subscribeCrosshairMove(handleDrawingCrosshairMove);

    redrawTrendlinesRef.current();

    return () => {
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(visibleRangeHandler);
      } catch {}
      try {
        mainChart.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
      } catch {}
      container.removeEventListener("click", handleChartClick);
      container.removeEventListener("mousedown", handleChartMouseDown);
    };
  }, [
    containerRef,
    chartsReady,
    handleChartClick,
    handleChartMouseDown,
    enableTrendlineDrawing,
    handleDrawingCrosshairMove,
  ]);

  // redraw on changes
  useEffect(() => {
    if (chartsReady && canvasRef.current) redrawTrendlinesRef.current();
  }, [chartsReady, trendlines, currentLine, isPrivateMode]);

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

  // update chart scroll/scale options when drawing/selection changes (NO re-init)
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

  // mouse up -> stop dragging + deselect
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

      schedulePersist(); // PUBLIC only
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [schedulePersist]);

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
    schedulePersist(); // PUBLIC only
  }, [isPrivateMode, schedulePersist]);

  const undoLastTrendline = useCallback(() => {
    setTrendlines((prev) => {
      const lastIndex = prev
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.isPrivate === (isPrivateMode || false))
        .pop()?.i;

      if (lastIndex === undefined) return prev;
      const next = [...prev];
      next.splice(lastIndex, 1);
      return next;
    });
    schedulePersist(); // PUBLIC only
  }, [isPrivateMode, schedulePersist]);

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
