import { Time } from "lightweight-charts";
import { CandlestickWithVolume } from "./types";

/**
 * Generate random number with normal distribution
 * @param mean Mean value (default: 0)
 * @param stdDev Standard deviation (default: 1)
 * @returns Random number following normal distribution
 */
export function randomNormal(mean = 0, stdDev = 1): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return (
    mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  );
}

/**
 * Estimate volatility from recent close prices
 * @param closes Array of close prices
 * @param lookback Number of periods to look back (default: 50)
 * @returns Estimated volatility
 */
export function estimateVolatility(closes: number[], lookback = 50): number {
  if (closes.length < 2) return 0.01;

  const returns: number[] = [];
  const start = Math.max(1, closes.length - lookback);

  for (let i = start; i < closes.length; i++) {
    const r = (closes[i] - closes[i - 1]) / closes[i - 1];
    returns.push(r);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;

  return Math.sqrt(variance);
}

/**
 * Generate next realistic candlestick bar using Gaussian simulation
 * @param last Last candlestick data
 * @param closes Array of recent close prices for volatility estimation
 * @returns New candlestick data
 */
export function generateNextBarRealistic(
  last: CandlestickWithVolume,
  closes: number[]
): CandlestickWithVolume {
  const sigma = estimateVolatility(closes, 50);
  const changePercent = randomNormal(0, sigma);

  const open = last.close;
  const close = +(open * (1 + changePercent)).toFixed(2);
  const high = +(Math.max(open, close) * (1 + Math.random() * sigma)).toFixed(
    2
  );
  const low = +(Math.min(open, close) * (1 - Math.random() * sigma)).toFixed(2);

  return {
    time: Math.floor(Date.now() / 1000) as Time,
    open,
    high,
    low,
    close,
    volume: Math.floor(last.volume * (0.8 + Math.random() * 0.4)),
  };
}
