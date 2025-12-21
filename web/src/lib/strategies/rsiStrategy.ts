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
 * RSI Strategy - Buy when RSI < 30 (oversold), Sell when RSI > 70 (overbought)
 */
export const rsiStrategy = {
  name: "RSI Strategy",
  description: "Buy when RSI < 30 (oversold), Sell when RSI > 70 (overbought)",
  blocks: [
    { id: "rsi", type: "rsi", x: 50, y: 50, period: 14 },
    { id: "oversold", type: "number", x: 200, y: 50, value: 30 },
    { id: "overbought", type: "number", x: 200, y: 150, value: 70 },
    { id: "lt", type: "less_than", x: 350, y: 50 },
    { id: "gt", type: "greater_than", x: 350, y: 150 },
    { id: "buy", type: "buy", x: 500, y: 50 },
    { id: "sell", type: "sell", x: 500, y: 150 }
  ] as UIBlock[],
  connections: [
    { from: "rsi", to: "lt" },
    { from: "oversold", to: "lt" },
    { from: "lt", to: "buy" },
    { from: "rsi", to: "gt" },
    { from: "overbought", to: "gt" },
    { from: "gt", to: "sell" }
  ] as Connection[]
};