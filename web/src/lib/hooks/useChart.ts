// File: lib/hooks/useChart.ts - OPTIMIZED & FIXED VERSION
import { useRef, useEffect, MutableRefObject, useState, useCallback } from "react";
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
  enableDrawing?: boolean;
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
  enableDrawing = false,
}: UseChartProps) {
  // refs & state
  const isInitializedRef = useRef<string>("");
  const cleanupRef = useRef<(() => void) | null>(null);
  const isDisposedRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<number | null>(null);
  const chartsRef = useRef<{ mainChart: IChartApi | null; rsiChart: IChartApi | null; macdChart: IChartApi | null }>({
    mainChart: null,
    rsiChart: null,
    macdChart: null,
  });
  const seriesRef = useRef<{
    priceSeries: any | null;
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
  const dataRef = useRef<{ bars: CandlestickWithVolume[]; closes: number[]; lastBar: CandlestickWithVolume | null; timer: number | null }>({
    bars: [],
    closes: [],
    lastBar: null,
    timer: null,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [trendlines, setTrendlines] = useState<TrendLine[]>([]);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [currentLine, setCurrentLine] = useState<Partial<TrendLine> | null>(null);
  const [chartsReady, setChartsReady] = useState(false);

  // helpers
  const chartToCanvas = useCallback((time: number, price: number): { x: number; y: number } | null => {
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
  }, []);

  const redrawTrendlines = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawLine = (line: Partial<TrendLine>) => {
      if (!line.startTime || !line.endTime || !line.startPrice || !line.endPrice) return;
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
    };
    trendlines.forEach((t) => drawLine(t));
    if (currentLine && enableDrawing) {
      // draw dashed current (chỉ khi đang trong chế độ vẽ)
      const start = currentLine.startTime && currentLine.startPrice ? chartToCanvas(currentLine.startTime, currentLine.startPrice) : null;
      const end = currentLine.endTime && currentLine.endPrice ? chartToCanvas(currentLine.endTime, currentLine.endPrice) : null;
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
  }, [trendlines, currentLine, chartToCanvas, enableDrawing]);

  // drawing handlers
  const handleDrawingCrosshairMove = useCallback(
    (param: MouseEventParams) => {
      if (!enableDrawing || drawingMode !== "drawing" || !currentLine) return;
      if (!param.time || param.point === undefined) return;
      const price = seriesRef.current.priceSeries?.coordinateToPrice(param.point.y);
      if (price === undefined || price === null) return;
      setCurrentLine((prev) => ({ ...prev, endTime: param.time as number, endPrice: price }));
    },
    [enableDrawing, drawingMode, currentLine]
  );

  const handleChartClick = useCallback(
    (e: MouseEvent) => {
      if (!enableDrawing || !chartsRef.current.mainChart || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const timeScale = chartsRef.current.mainChart.timeScale();
      const time = timeScale.coordinateToTime(x);
      const price = seriesRef.current.priceSeries?.coordinateToPrice(y);
      if (time === undefined || price === undefined || price === null) return;
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
        });
      } else if (drawingMode === "drawing" && currentLine) {
        // Hoàn thành việc vẽ đường - lưu đường vào danh sách
        const newLine: TrendLine = {
          id: currentLine.id || `line-${Date.now()}`,
          startTime: currentLine.startTime!,
          startPrice: currentLine.startPrice!,
          endTime: time as number,
          endPrice: price,
          color: currentLine.color || (isDarkMode ? "#2196F3" : "#1976D2"),
          width: currentLine.width || 2,
        };
        setTrendlines((prev) => [...prev, newLine]);
        setCurrentLine(null);
        // Tự động thoát chế độ vẽ sau khi vẽ xong
        setDrawingMode("none");
      }
    },
    [enableDrawing, drawingMode, currentLine, containerRef, isDarkMode]
  );

  // keyboard shortcuts for drawing
  useEffect(() => {
    if (!enableDrawing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawingMode === "drawing") {
        setDrawingMode("none");
        setCurrentLine(null);
      }
      if (e.ctrlKey && (e.key === "z" || e.key === "Z") && trendlines.length > 0) {
        e.preventDefault();
        setTrendlines((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableDrawing, drawingMode, trendlines.length]);

  // ---------- MAIN CHART INITIALIZATION ----------
  useEffect(() => {
    const currentKey = `${symbol}-${timeframe}-${isDarkMode}-${showRSI}-${showMACD}-${chartType}`;
    if (isInitializedRef.current === currentKey && !isDisposedRef.current) {
      return;
    }
    // run previous cleanup if exists
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
          grid: { vertLines: { color: "#2a2e39" }, horzLines: { color: "#2a2e39" } },
          crosshair: { mode: CrosshairMode.Normal },
          timeScale: { borderColor: "#2a2e39" },
          rightPriceScale: { borderColor: "#2a2e39" },
        }
      : {
          layout: { background: { color: "#ffffff" }, textColor: "#374151" },
          grid: { vertLines: { color: "#e5e7eb" }, horzLines: { color: "#e5e7eb" } },
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
    const { mainChartHeight, rsiHeight, macdHeight } = createChartsWithDynamicSizing();
    const mainChart = createChart(container, { width: container.clientWidth, height: mainChartHeight, ...chartTheme });
    mainChart.applyOptions({ handleScroll: { mouseWheel: true, pressedMouseMove: true }, handleScale: { axisPressedMouseMove: true, pinch: true } });
    // simple factory for line-like series to reduce repeated code
    const addLineSeries = (opts?: any) => mainChart.addSeries(LineSeries, { lineWidth: 2, ...opts });
    mainChart.resize(container.clientWidth, mainChartHeight);
    // price series selection
    let priceSeries: any = null;
    if (chartType === "candlestick") {
      priceSeries = mainChart.addSeries(CandlestickSeries, { upColor: "#26a69a", downColor: "#ef5350", borderVisible: false, wickUpColor: "#26a69a", wickDownColor: "#ef5350" });
    } else if (chartType === "line") {
      priceSeries = addLineSeries({ color: isDarkMode ? "#2196F3" : "#1976D2" });
    } else {
      priceSeries = mainChart.addSeries(AreaSeries, {
        topColor: isDarkMode ? "rgba(33, 150, 243, 0.56)" : "rgba(25, 118, 210, 0.56)",
        bottomColor: isDarkMode ? "rgba(33, 150, 243, 0.04)" : "rgba(25, 118, 210, 0.04)",
        lineColor: isDarkMode ? "#2196F3" : "#1976D2",
      });
    }
    const volumeSeries = mainChart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "", base: 0, color: isDarkMode ? "#64748b" : "#9ca3af" });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    const smaSeries = addLineSeries({ color: isDarkMode ? "#3b82f6" : "blue" });
    const emaSeries = addLineSeries({ color: isDarkMode ? "#f97316" : "orange" });
    const bbUpperSeries = addLineSeries({ color: isDarkMode ? "#6b7280" : "gray", lineWidth: 1 });
    const bbLowerSeries = addLineSeries({ color: isDarkMode ? "#6b7280" : "gray", lineWidth: 1 });
    const bbMiddleSeries = addLineSeries({ color: isDarkMode ? "#374151" : "black", lineWidth: 1 });
    // optional RSI chart
    let rsiChart: IChartApi | null = null;
    let rsiSeries: ISeriesApi<"Line"> | null = null;
    if (showRSI && rsiHeight > 0) {
      const rsiContainer = document.createElement("div");
      rsiContainer.style.marginTop = "4px";
      rsiContainer.style.height = `${rsiHeight}px`;
      rsiContainer.style.overflow = "hidden";
      container.appendChild(rsiContainer);
      rsiChart = createChart(rsiContainer, { width: container.clientWidth, height: rsiHeight, ...chartTheme });
      rsiSeries = rsiChart.addSeries(LineSeries, { color: isDarkMode ? "#a855f7" : "purple", lineWidth: 2 });
      rsiChart.applyOptions({ rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 } } });
    }
    // optional MACD chart
    let macdChart: IChartApi | null = null;
    let macdLineSeries: ISeriesApi<"Line"> | null = null;
    if (showMACD && macdHeight > 0) {
      const macdContainer = document.createElement("div");
      macdContainer.style.marginTop = "4px";
      macdContainer.style.height = `${macdHeight}px`;
      macdContainer.style.overflow = "hidden";
      container.appendChild(macdContainer);
      macdChart = createChart(macdContainer, { width: container.clientWidth, height: macdHeight, ...chartTheme });
      macdLineSeries = macdChart.addSeries(LineSeries, { color: isDarkMode ? "#10b981" : "green", lineWidth: 2 });
    }
    chartsRef.current = { mainChart, rsiChart, macdChart };
    seriesRef.current = { priceSeries, volumeSeries, smaSeries, emaSeries, bbUpperSeries, bbLowerSeries, bbMiddleSeries, rsiSeries, macdLineSeries };
    setChartsReady(true);
    // Crosshair handler for volume update
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
          const foundBar = dataRef.current.bars.find((bar) => bar.time === param.time);
          if (foundBar && foundBar.volume !== undefined) {
            onVolumeUpdate(foundBar.volume);
          }
        }
      });
    };
    // initialize from fetched data
    const initFromData = (data: CandlestickWithVolume[]) => {
      const { priceSeries, volumeSeries, smaSeries, emaSeries, bbUpperSeries, bbLowerSeries, bbMiddleSeries, rsiSeries, macdLineSeries } = seriesRef.current;
      if (!priceSeries || !volumeSeries || !smaSeries || !emaSeries) return;
      dataRef.current.bars = data.slice();
      dataRef.current.closes = data.map((b) => b.close);
      dataRef.current.lastBar = data[data.length - 1] ?? null;
      const safeMap = (arr: { time: Time; value: number }[]) => arr.filter((p) => !isNaN(p.value));
      priceSeries.setData(
        chartType === "candlestick"
          ? data.map((d) => ({ time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close }))
          : data.map((d) => ({ time: d.time as Time, value: d.close }))
      );
      volumeSeries.setData(data.map((b) => ({ time: b.time as Time, value: b.volume, color: b.close >= b.open ? "#26a69a" : "#ef5350" })));
      if (dataRef.current.lastBar) {
        onPriceUpdate(dataRef.current.lastBar.close);
        if (onVolumeUpdate) onVolumeUpdate(dataRef.current.lastBar.volume);
        if (onOHLCUpdate && data.length > 1) {
          const currentBar = dataRef.current.lastBar!;
          const previousBar = data[data.length - 2];
          const change = currentBar.close - previousBar.close;
          const changePercent = (change / previousBar.close) * 100;
          onOHLCUpdate({ open: currentBar.open, high: currentBar.high, low: currentBar.low, close: currentBar.close, change, changePercent });
        }
      }
      const sma = calculateSMA(dataRef.current.closes, 14);
      const ema = calculateEMA(dataRef.current.closes, 14);
      const rsi = calculateRSI(dataRef.current.closes, 14);
      const macdObj = calculateMACD(dataRef.current.closes);
      const bb = calculateBollingerBands(dataRef.current.closes, 20);
      bbUpperSeries?.setData(safeMap(data.map((b, i) => ({ time: b.time as Time, value: bb.upper[i] }))));
      bbLowerSeries?.setData(safeMap(data.map((b, i) => ({ time: b.time as Time, value: bb.lower[i] }))));
      bbMiddleSeries?.setData(safeMap(data.map((b, i) => ({ time: b.time as Time, value: bb.middle[i] }))));
      smaSeries.setData(safeMap(data.map((b, i) => ({ time: b.time as Time, value: sma[i] }))));
      emaSeries.setData(safeMap(data.map((b, i) => ({ time: b.time as Time, value: ema[i] }))));
      rsiSeries?.setData(safeMap(data.map((b, i) => ({ time: b.time as Time, value: rsi[i] }))));
      macdLineSeries?.setData(safeMap(data.map((b, i) => ({ time: b.time as Time, value: macdObj.macdLine[i] }))));
      setupCrosshairHandler();
    };
    // replay updates every 2s
    const startReplay = () => {
      if (dataRef.current.timer) return;
      dataRef.current.timer = window.setInterval(() => {
        if (isDisposedRef.current) {
          if (dataRef.current.timer) {
            window.clearInterval(dataRef.current.timer);
            dataRef.current.timer = null;
          }
          return;
        }
        const { lastBar, bars, closes } = dataRef.current;
        const { priceSeries, volumeSeries, smaSeries, emaSeries, bbUpperSeries, bbLowerSeries, bbMiddleSeries, rsiSeries, macdLineSeries } = seriesRef.current;
        if (!lastBar || !priceSeries || !volumeSeries) return;
        const next = generateNextBarRealistic(lastBar, closes);
        bars.push(next);
        closes.push(next.close);
        dataRef.current.lastBar = next;
        try {
          if (priceSeries) {
            if (chartType === "candlestick") {
              priceSeries.update({ ...next, time: next.time as Time });
            } else {
              priceSeries.update({ time: next.time as Time, value: next.close });
            }
          }
          volumeSeries.update({ time: next.time as Time, value: next.volume, color: next.close >= next.open ? "#26a69a" : "#ef5350" });
          const sma = calculateSMA(closes, 14);
          const ema = calculateEMA(closes, 14);
          const rsi = calculateRSI(closes, 14);
          const macdObj = calculateMACD(closes);
          const bb = calculateBollingerBands(closes, 20);
          const i = closes.length - 1;
          if (!isNaN(bb.upper[i]) && bbUpperSeries) bbUpperSeries.update({ time: next.time as Time, value: bb.upper[i] });
          if (!isNaN(bb.lower[i]) && bbLowerSeries) bbLowerSeries.update({ time: next.time as Time, value: bb.lower[i] });
          if (!isNaN(bb.middle[i]) && bbMiddleSeries) bbMiddleSeries.update({ time: next.time as Time, value: bb.middle[i] });
          if (!isNaN(sma[i]) && smaSeries) smaSeries.update({ time: next.time as Time, value: sma[i] });
          if (!isNaN(ema[i]) && emaSeries) emaSeries.update({ time: next.time as Time, value: ema[i] });
          if (!isNaN(rsi[i]) && rsiSeries) rsiSeries.update({ time: next.time as Time, value: rsi[i] });
          if (!isNaN(macdObj.macdLine[i]) && macdLineSeries)
            macdLineSeries.update({ time: next.time as Time, value: macdObj.macdLine[i] });
          onPriceUpdate(next.close);
          if (onOHLCUpdate && bars.length > 1) {
            const previousBar = bars[bars.length - 2];
            const change = next.close - previousBar.close;
            const changePercent = (change / previousBar.close) * 100;
            onOHLCUpdate({ open: next.open, high: next.high, low: next.low, close: next.close, change, changePercent });
          }
        } catch (error) {
          console.warn("Chart update error:", error);
        }
      }, 2000);
    };
    const handleChartResize = () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      const { mainChartHeight: newMainHeight, rsiHeight: newRsiHeight, macdHeight: newMacdHeight } = createChartsWithDynamicSizing();
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
        // second pass to ensure layout
        try {
          const { mainChartHeight: nm, rsiHeight: nr, macdHeight: nm2 } = createChartsWithDynamicSizing();
          if (mainChart) mainChart.resize(container.clientWidth, nm);
          if (rsiChart) rsiChart.resize(container.clientWidth, nr);
          if (macdChart) macdChart.resize(container.clientWidth, nm2);
          if (canvasRef.current && mainChart) {
            canvasRef.current.width = container.clientWidth;
            canvasRef.current.height = nm;
            redrawTrendlines();
          }
        } catch {}
      }, 16);
    };
    window.addEventListener("chartResize", handleChartResize);
    window.addEventListener("resize", handleChartResize);
    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => handleChartResize()));
    resizeObserver.observe(container);
    // fetch and init
    (async () => {
      try {
        const data = await fetchYahooSeries(symbol, timeframe);
        initFromData(data);
        if (!isPrivateMode) {
          setTimeout(() => startReplay(), 1000);
        }
      } catch (err) {
        console.error("Fetch Yahoo failed:", err);
      }
    })();
    // cleanup function (store to cleanupRef)
    const cleanup = () => {
      if (isDisposedRef.current) return;
      isDisposedRef.current = true;
      window.removeEventListener("chartResize", handleChartResize);
      window.removeEventListener("resize", handleChartResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      if (dataRef.current.timer) {
        window.clearInterval(dataRef.current.timer);
        dataRef.current.timer = null;
      }
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
        chartsRef.current = { mainChart: null, rsiChart: null, macdChart: null };
      } catch (error) {
        console.warn("Chart cleanup warning:", error);
      }
    };
    cleanupRef.current = cleanup;
    return cleanup;
  }, [symbol, timeframe, isDarkMode, showRSI, showMACD, chartType, isPrivateMode]); // intentionally exclude enableDrawing

  // ---------- SEPARATE EFFECT: DRAWING CANVAS & EVENTS ----------
  useEffect(() => {
    const container = containerRef.current;
    const { mainChart } = chartsRef.current;
    
    // Always create canvas overlay if missing and charts are ready
    if ((!canvasRef.current || !canvasRef.current.parentElement) && container && mainChart && chartsReady) {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none"; // let clicks pass through to container
      canvas.style.zIndex = "10";
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      container.style.position = "relative";
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }
    
    // Subscribe drawing handlers when drawing is enabled
    if (enableDrawing && container && mainChart && chartsReady && canvasRef.current) {
      mainChart.subscribeCrosshairMove(handleDrawingCrosshairMove);
      container.addEventListener("click", handleChartClick);
    } else if (!enableDrawing && container && mainChart && canvasRef.current) {
      // Unsubscribe drawing handlers when drawing is disabled
      mainChart?.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
      container.removeEventListener("click", handleChartClick);
    }
    
    // Always subscribe to visible range changes when canvas exists
    if (mainChart && canvasRef.current) {
      const timeScale = mainChart.timeScale();
      const visibleRangeHandler = () => redrawTrendlines();
      
      try {
        timeScale.subscribeVisibleLogicalRangeChange(visibleRangeHandler);
      } catch {
        // ignore if not implemented
      }
      
      // Redraw once now
      redrawTrendlines();
      
      return () => {
        try {
          timeScale.unsubscribeVisibleLogicalRangeChange(visibleRangeHandler);
        } catch {}
        
        // Also unsubscribe drawing handlers if they were subscribed
        if (enableDrawing && mainChart && container) {
          mainChart.unsubscribeCrosshairMove(handleDrawingCrosshairMove);
          container.removeEventListener("click", handleChartClick);
        }
      };
    }
  }, [enableDrawing, chartsReady, handleChartClick, handleDrawingCrosshairMove, redrawTrendlines, containerRef]);

  // redraw when lines change
  useEffect(() => {
    if (chartsReady && canvasRef.current) {
      redrawTrendlines();
    }
  }, [chartsReady, trendlines, currentLine, redrawTrendlines]);

  // update cursor
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.style.cursor = enableDrawing && drawingMode === "drawing" ? "crosshair" : "default";
    return () => {
      container.style.cursor = "default";
    };
  }, [enableDrawing, drawingMode, containerRef]);

  // drawing control helpers
  const startDrawing = useCallback(() => {
    if (enableDrawing) setDrawingMode("drawing");
  }, [enableDrawing]);
  const cancelDrawing = useCallback(() => {
    setDrawingMode("none");
    setCurrentLine(null);
  }, []);
  const clearAllTrendlines = useCallback(() => {
    setTrendlines([]);
    setCurrentLine(null);
    setDrawingMode("none");
  }, []);
  const undoLastTrendline = useCallback(() => {
    setTrendlines((prev) => prev.slice(0, -1));
  }, []);

  return {
    charts: chartsRef.current,
    series: seriesRef.current,
    isReady: chartsReady,
    drawing: {
      isEnabled: enableDrawing,
      isDrawing: drawingMode === "drawing",
      trendlines,
      startDrawing,
      cancelDrawing,
      clearAll: clearAllTrendlines,
      undo: undoLastTrendline,
    },
  };
}