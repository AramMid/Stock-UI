// File: lib/hooks/useChart.ts - CLEANED & INTEGRATED WITH BACKEND
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
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from "../indicators";
import {
  marketSimulationService,
  SimulatedMarketData,
} from "@/lib/services/marketSimulationService";

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
    lastBar: CandlestickWithVolume | null;
    timer: number | null;
  }>({
    bars: [],
    closes: [],
    lastBar: null,
    timer: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [trendlines, setTrendlines] = useState<TrendLine[]>([]);
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
  const lastClickPositionRef = useRef<{ x: number; y: number } | null>(null);
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

  // ---------- HELPERS: coordinate chuyển đổi ----------
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

      // Vẽ highlight nếu dòng đang được chọn
      if (selectedLine && selectedLine.line.id === line.id) {
        ctx.fillStyle = "#ff0000";
        if (selectedLine.point === "start") {
          ctx.fillRect(start.x - 6, start.y - 6, 12, 12);
        } else if (selectedLine.point === "end") {
          ctx.fillRect(end.x - 6, end.y - 6, 12, 12);
        } else if (selectedLine.point === "body") {
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          ctx.fillRect(midX - 6, midY - 6, 12, 12);
        }
      }
    };

    // Chỉ vẽ trendlines thuộc chế độ hiện tại (public/private)
    trendlines
      .filter((t) => t.isPrivate === (isPrivateMode || false))
      .forEach((t) => drawLine(t));

    // Vẽ line đang vẽ (dashed)
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
    trendlines,
    currentLine,
    chartToCanvas,
    enableTrendlineDrawing,
    isPrivateMode,
    selectedLine,
  ]);

  // ---------- DRAWING: crosshair move ----------
  const handleDrawingCrosshairMove = useCallback(
    (param: MouseEventParams) => {
      if (!param.time || param.point === undefined) return;

      // Đang vẽ trendline
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
      }
      // Đang kéo / chỉnh sửa trendline
      else if (
        selectedLine &&
        !enableTrendlineDrawing &&
        isMouseDownRef.current &&
        originalLineRef.current
      ) {
        const price = seriesRef.current.priceSeries?.coordinateToPrice(
          param.point.y
        );
        if (price === undefined || price === null) return;

        // Xác định xem có phải đang kéo (drag) hay chỉ click
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
            if (distance > 5) {
              isDraggingRef.current = true;
            }
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
                prev.map((t) =>
                  t.id === selectedLine.line.id
                    ? {
                        ...t,
                        startTime: originalLine.startTime + deltaTime,
                        startPrice: originalLine.startPrice + deltaPrice,
                        endTime: originalLine.endTime + deltaTime,
                        endPrice: originalLine.endPrice + deltaPrice,
                      }
                    : t
                )
              );
            } else if (
              selectedLine.point === "start" ||
              selectedLine.point === "end"
            ) {
              setTrendlines((prev) =>
                prev.map((t) => {
                  if (t.id !== selectedLine.line.id) return t;
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

  // ---------- DRAWING: distance helper ----------
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

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

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

  // ---------- DRAWING: mousedown chọn line ----------
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

      if (enableTrendlineDrawing) {
        // đang vẽ thì không xử lý select
        return;
      }

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

          const selectedData = {
            line: { ...line },
            point: pointType,
          };
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
      enableTrendlineDrawing,
      trendlines,
      isPrivateMode,
      chartToCanvas,
      containerRef,
    ]
  );

  // ---------- DRAWING: click (vẽ + double click xóa) ----------
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

      // Chế độ vẽ trendline
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
        }
      } else {
        // Double click để xóa line
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTimeRef.current;
        const isDoubleClick =
          timeSinceLastClick < 300 && timeSinceLastClick > 0;

        if (isDoubleClick) {
          let lineDeleted = false;
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
              setTrendlines((prev) => prev.filter((t) => t.id !== line.id));
              setSelectedLine(null);
              originalLineRef.current = null;
              lineDeleted = true;
              break;
            }
          }

          lastClickTimeRef.current = 0;
          lastClickPositionRef.current = null;
        } else {
          lastClickTimeRef.current = now;
          lastClickPositionRef.current = { x, y };

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
              clickedOnLine = true;
              break;
            }
          }

          if (!clickedOnLine) {
            setSelectedLine(null);
            originalLineRef.current = null;
          }
        }
      }
    },
    [
      enableTrendlineDrawing,
      drawingMode,
      currentLine,
      containerRef,
      isDarkMode,
      trendlines,
      isPrivateMode,
      chartToCanvas,
      onDrawingComplete,
    ]
  );

  // ---------- SHORTCUT: ESC hủy vẽ, Ctrl+Z undo ----------
  useEffect(() => {
    if (!enableTrendlineDrawing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawingMode === "drawing") {
        setDrawingMode("none");
        setCurrentLine(null);
      }
      if (
        e.ctrlKey &&
        (e.key === "z" || e.key === "Z") &&
        trendlines.length > 0
      ) {
        e.preventDefault();
        setTrendlines((prev) => {
          const lastIndex = prev
            .map((t, i) => ({ t, i }))
            .filter(({ t }) => t.isPrivate === (isPrivateMode || false))
            .pop()?.i;

          if (lastIndex === undefined) return prev;

          const newTrendlines = [...prev];
          newTrendlines.splice(lastIndex, 1);
          return newTrendlines;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableTrendlineDrawing, drawingMode, trendlines.length, isPrivateMode]);

  // ---------- MAIN CHART INIT ----------
  useEffect(() => {
    const currentKey = `${symbol}-${timeframe}-${isDarkMode}-${showRSI}-${showMACD}-${chartType}`;
    if (isInitializedRef.current === currentKey && !isDisposedRef.current) {
      return;
    }

    // cleanup cũ
    if (cleanupRef.current && !isDisposedRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    isDisposedRef.current = false;
    isInitializedRef.current = currentKey;
    setChartsReady(false);

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

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

      return { mainChartHeight, rsiHeight, macdHeight, containerHeight };
    };

    const { mainChartHeight, rsiHeight, macdHeight } =
      createChartsWithDynamicSizing();

    const mainChart = createChart(container, {
      width: container.clientWidth,
      height: mainChartHeight,
      ...chartTheme,
    });

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addLineSeries = (opts?: any) =>
      mainChart.addSeries(LineSeries, { lineWidth: 2, ...opts });

    mainChart.resize(container.clientWidth, mainChartHeight);

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

    // RSI chart
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

    // MACD chart
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

    // ---------- Crosshair volume ----------
    const setupCrosshairHandler = () => {
      if (!onVolumeUpdate) return;
      mainChart.subscribeCrosshairMove((param) => {
        if (!param.time || dataRef.current.bars.length === 0) return;

        if (param.logical !== undefined && param.logical >= 0) {
          const barIndex = Math.floor(param.logical);
          if (barIndex >= 0 && barIndex < dataRef.current.bars.length) {
            const barData = dataRef.current.bars[barIndex];
            if (barData && barData.volume !== undefined) {
              onVolumeUpdate(barData.volume);
              return;
            }
          }
        }

        if (param.time) {
          const foundBar = dataRef.current.bars.find(
            (bar) => bar.time === param.time
          );
          if (foundBar && foundBar.volume !== undefined) {
            onVolumeUpdate(foundBar.volume);
          }
        }
      });
    };

    // ---------- Chuẩn hoá time ----------
    const normalizeTime = (t: Time): Time => {
      if (typeof t === "number") return t;
      const anyT: any = t;
      if (anyT.year != null && anyT.month != null && anyT.day != null) {
        const ts = Date.UTC(anyT.year, anyT.month - 1, anyT.day) / 1000;
        return ts as Time;
      }
      return t;
    };

    // ---------- Hàm chung applyBars cho cả Yahoo + BE ----------
    const applyBars = (data: CandlestickWithVolume[]) => {
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

      const normalized = data.map((b) => ({
        ...b,
        time: normalizeTime(b.time),
      }));

      dataRef.current.bars = normalized.slice();
      dataRef.current.closes = normalized.map((b) => b.close);
      dataRef.current.lastBar = normalized[normalized.length - 1] ?? null;

      const safeMap = (arr: { time: Time; value: number }[]) =>
        arr.filter((p) => !isNaN(p.value));

      // Giá / chart chính
      if (chartType === "candlestick") {
        priceSeries.setData(
          normalized.map((d) => ({
            time: d.time as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        );
      } else {
        priceSeries.setData(
          normalized.map((d) => ({
            time: d.time as Time,
            value: d.close,
          }))
        );
      }

      // Volume
      volumeSeries.setData(
        normalized.map((b) => ({
          time: b.time as Time,
          value: b.volume,
          color: b.close >= b.open ? "#26a69a" : "#ef5350",
        }))
      );

      // Callbacks
      const last = dataRef.current.lastBar;
      if (last) {
        onPriceUpdate(last.close);
        if (onVolumeUpdate) onVolumeUpdate(last.volume);
        if (onOHLCUpdate && normalized.length > 1) {
          const prev = normalized[normalized.length - 2];
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

      // Indicators
      const closes = dataRef.current.closes;
      const sma = calculateSMA(closes, 14);
      const ema = calculateEMA(closes, 14);
      const rsi = calculateRSI(closes, 14);
      const macdObj = calculateMACD(closes);
      const bb = calculateBollingerBands(closes, 20);

      bbUpperSeries?.setData(
        safeMap(
          normalized.map((b, i) => ({
            time: b.time as Time,
            value: bb.upper[i],
          }))
        )
      );
      bbLowerSeries?.setData(
        safeMap(
          normalized.map((b, i) => ({
            time: b.time as Time,
            value: bb.lower[i],
          }))
        )
      );
      bbMiddleSeries?.setData(
        safeMap(
          normalized.map((b, i) => ({
            time: b.time as Time,
            value: bb.middle[i],
          }))
        )
      );
      smaSeries.setData(
        safeMap(
          normalized.map((b, i) => ({
            time: b.time as Time,
            value: sma[i],
          }))
        )
      );
      emaSeries.setData(
        safeMap(
          normalized.map((b, i) => ({
            time: b.time as Time,
            value: ema[i],
          }))
        )
      );
      rsiSeries?.setData(
        safeMap(
          normalized.map((b, i) => ({
            time: b.time as Time,
            value: rsi[i],
          }))
        )
      );
      macdLineSeries?.setData(
        safeMap(
          normalized.map((b, i) => ({
            time: b.time as Time,
            value: macdObj.macdLine[i],
          }))
        )
      );
    };

    // Init từ Yahoo (history)
    const initFromData = (data: CandlestickWithVolume[]) => {
      applyBars(data);
      setupCrosshairHandler();
    };

    // Streaming từ BE (history + currentCandle)
    const startReplay = () => {
      if (dataRef.current.timer) return;
      dataRef.current.timer = 1 as any;

      const handleTick = (sim: SimulatedMarketData) => {
        if (isDisposedRef.current) {
          marketSimulationService.stopSimulation();
          dataRef.current.timer = null;
          return;
        }

        const candles = [
          ...(sim.history ?? []),
          ...(sim.currentCandle ? [sim.currentCandle] : []),
        ];

        if (!candles.length) return;

        const mapped: CandlestickWithVolume[] = candles.map((c) => ({
          time: Math.floor(c.timestamp / 1000) as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        applyBars(mapped);
        // nếu muốn auto-scroll:
        // chartsRef.current.mainChart?.timeScale().scrollToRealTime();
      };

      marketSimulationService.startSimulation(handleTick, {
        symbol,
        intervalMs: 1000, // FE gọi mỗi giây, BE tự throttle 12s/tick
      });
    };

    // Resize handler
    const handleChartResize = () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }

      const {
        mainChartHeight: newMainHeight,
        rsiHeight: newRsiHeight,
        macdHeight: newMacdHeight,
      } = createChartsWithDynamicSizing();

      try {
        if (mainChart) {
          mainChart.resize(container.clientWidth, newMainHeight);
          if (canvasRef.current) {
            canvasRef.current.width = container.clientWidth;
            canvasRef.current.height = newMainHeight;
            redrawTrendlines();
          }
        }
        if (rsiChart) rsiChart.resize(container.clientWidth, newRsiHeight);
        if (macdChart) macdChart.resize(container.clientWidth, newMacdHeight);
      } catch (error) {
        console.warn("Chart resize error:", error);
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        try {
          const {
            mainChartHeight: nm,
            rsiHeight: nr,
            macdHeight: nm2,
          } = createChartsWithDynamicSizing();
          if (mainChart) mainChart.resize(container.clientWidth, nm);
          if (rsiChart) rsiChart.resize(container.clientWidth, nr);
          if (macdChart) macdChart.resize(container.clientWidth, nm2);
          if (canvasRef.current && mainChart) {
            canvasRef.current.width = container.clientWidth;
            canvasRef.current.height = nm;
            redrawTrendlines();
          }
        } catch {
          // ignore
        }
      }, 16);
    };

    window.addEventListener("chartResize", handleChartResize);
    window.addEventListener("resize", handleChartResize);

    const resizeObserver = new ResizeObserver(() =>
      requestAnimationFrame(() => handleChartResize())
    );
    resizeObserver.observe(container);

    // fetch Yahoo + start simulation
    (async () => {
      try {
        const data = await fetchYahooSeries(symbol, timeframe, isPrivateMode);
        initFromData(data);
        if (!isPrivateMode) {
          setTimeout(() => startReplay(), 1000);
        }
      } catch (err) {
        console.error("Fetch Yahoo failed:", err);
      }
    })();

    // cleanup
    const cleanup = () => {
      if (isDisposedRef.current) return;
      isDisposedRef.current = true;

      window.removeEventListener("chartResize", handleChartResize);
      window.removeEventListener("resize", handleChartResize);
      resizeObserver.disconnect();

      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }

      marketSimulationService.stopSimulation();
      dataRef.current.timer = null;

      if (canvasRef.current) {
        canvasRef.current.remove();
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
      } catch (error) {
        console.warn("Chart cleanup warning:", error);
      }
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
    onPriceUpdate,
    onOHLCUpdate,
    onVolumeUpdate,
  ]);

  // ---------- EFFECT: Canvas overlay + event subscriptions ----------
  useEffect(() => {
    const container = containerRef.current;
    const { mainChart } = chartsRef.current;

    if (
      (!canvasRef.current || !canvasRef.current.parentElement) &&
      container &&
      mainChart &&
      chartsReady
    ) {
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

    if (container && mainChart && chartsReady && canvasRef.current) {
      container.addEventListener("click", handleChartClick);

      if (!enableTrendlineDrawing) {
        container.addEventListener("mousedown", handleChartMouseDown);
      }

      if (enableTrendlineDrawing || selectedLine || isMouseDownRef.current) {
        mainChart.subscribeCrosshairMove(handleDrawingCrosshairMove);
      } else {
        mainChart.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
      }
    }

    if (mainChart && canvasRef.current) {
      const timeScale = mainChart.timeScale();
      const visibleRangeHandler = () => redrawTrendlines();

      try {
        timeScale.subscribeVisibleLogicalRangeChange(visibleRangeHandler);
      } catch {
        // ignore
      }

      redrawTrendlines();

      return () => {
        try {
          timeScale.unsubscribeVisibleLogicalRangeChange(visibleRangeHandler);
        } catch {}

        if (mainChart && container) {
          mainChart.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
          container.removeEventListener("click", handleChartClick);
          container.removeEventListener("mousedown", handleChartMouseDown);
        }
      };
    }
  }, [
    enableTrendlineDrawing,
    chartsReady,
    handleChartClick,
    handleChartMouseDown,
    handleDrawingCrosshairMove,
    redrawTrendlines,
    containerRef,
    selectedLine,
  ]);

  // ---------- Redraw trendlines khi state thay đổi ----------
  useEffect(() => {
    if (chartsReady && canvasRef.current) {
      redrawTrendlines();
    }
  }, [chartsReady, trendlines, currentLine, redrawTrendlines]);

  // ---------- Cursor khi vẽ ----------
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

  // ---------- Khi chế độ vẽ / tool thay đổi: tắt pan/scroll ----------
  useEffect(() => {
    const { mainChart } = chartsRef.current;
    if (mainChart) {
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
    }
  }, [enableTrendlineDrawing, enableBrushDrawing, selectedLine, activeTool]);

  // ---------- Mouse up: kết thúc drag ----------
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
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // ---------- Re-subscribe crosshair khi selectedLine đổi ----------
  useEffect(() => {
    const container = containerRef.current;
    const { mainChart } = chartsRef.current;

    if (container && mainChart && canvasRef.current) {
      if (enableTrendlineDrawing || selectedLine || isMouseDownRef.current) {
        mainChart.subscribeCrosshairMove(handleDrawingCrosshairMove);
      } else if (!enableTrendlineDrawing) {
        mainChart.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
      }
    }

    return () => {
      if (mainChart && !enableTrendlineDrawing) {
        mainChart.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
      }
    };
  }, [
    selectedLine,
    enableTrendlineDrawing,
    handleDrawingCrosshairMove,
    containerRef,
  ]);

  // ---------- Redraw khi đổi private/public ----------
  useEffect(() => {
    if (chartsReady) {
      redrawTrendlines();
    }
  }, [isPrivateMode, chartsReady, redrawTrendlines]);

  // ---------- Drawing control helpers ----------
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
  }, [isPrivateMode]);

  const undoLastTrendline = useCallback(() => {
    setTrendlines((prev) => {
      const lastIndex = prev
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.isPrivate === (isPrivateMode || false))
        .pop()?.i;

      if (lastIndex === undefined) return prev;

      const newTrendlines = [...prev];
      newTrendlines.splice(lastIndex, 1);
      return newTrendlines;
    });
  }, [isPrivateMode]);

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
