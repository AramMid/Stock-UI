import { CandlestickData, Time } from "lightweight-charts";

export interface CandlestickWithVolume extends CandlestickData {
  volume: number;
}

export type Timeframe =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1H"
  | "4H"
  | "1D"
  | "1W"
  | "1M"
  | "5D"
  | "3M"
  | "6M"
  | "1Y"
  | "5Y";

export interface TradingPosition {
  cash: number;
  position: number;
  avgPrice: number;
  lastPrice: number;
  pnl: number;
}

export interface YahooQuoteData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResults {
  sma: number[];
  ema: number[];
  rsi: number[];
  macd: {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    lower: number[];
    middle: number[];
  };
}
