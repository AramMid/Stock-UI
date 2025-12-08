import { Block as ServiceBlock, Connection } from "../services/backtestService";

// Define a compatible Block type for the UI
interface UIBlock {
  id: string;
  type: ServiceBlock['type'];
  x: number;
  y: number;
  value?: number;
  period?: number;
}

/**
 * Moving Average Crossover Strategy
 * Buy when fast EMA crosses above slow EMA
 * Sell when fast EMA crosses below slow EMA
 */
export const movingAverageCrossoverStrategy = {
  name: "Moving Average Crossover",
  description: "Buy when 10-period EMA crosses above 20-period EMA, Sell when opposite",
  blocks: [
    { id: "ema10", type: "ema", x: 50, y: 50, period: 10 },
    { id: "ema20", type: "ema", x: 50, y: 150, period: 20 },
    { id: "crossover", type: "cross_over", x: 200, y: 100 },
    { id: "crossunder", type: "cross_under", x: 200, y: 200 },
    { id: "buy", type: "buy", x: 350, y: 100 },
    { id: "sell", type: "sell", x: 350, y: 200 }
  ] as UIBlock[],
  connections: [
    { from: "ema10", to: "crossover" },
    { from: "ema20", to: "crossover" },
    { from: "crossover", to: "buy" },
    { from: "ema10", to: "crossunder" },
    { from: "ema20", to: "crossunder" },
    { from: "crossunder", to: "sell" }
  ] as Connection[]
};