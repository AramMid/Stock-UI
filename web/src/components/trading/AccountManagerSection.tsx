"use client";
import { useState, useEffect } from "react";
import { TradingPosition } from "@/lib/types";
import { Order, formatVND } from "@/lib/order-management";
import { orderBookService } from "@/lib/services/orderBookService";
import { OrderBook, OrderBookLevel } from "@/lib/types";
import {
  MarketSimulationService,
  MarketDepthLevel,
  SimulatedMarketData,
} from "@/lib/services/marketSimulationService";

// Suggestion data type
interface SuggestionData {
  price: number;
  quantity: number;
  reason: string;
  winRate: number;
  confidence: number; // 0-100%
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  type: "SCALPING" | "DAY_TRADING" | "SWING";
  stopLoss?: number;
  takeProfit?: number;
  expectedProfit?: number;
  expectedLoss?: number;
  timeFrame: "IMMEDIATE" | "SHORT" | "MEDIUM";
  marketCondition: "BULLISH" | "BEARISH" | "SIDEWAYS";
}

interface MarketAnalysis {
  trendStrength: number;
  volatility: number;
  liquidityScore: number;
  supportLevels: number[];
  resistanceLevels: number[];
  volumeAnalysis: "HIGH" | "NORMAL" | "LOW";
  rsi: number | null;
  vwap: number | null;
}

interface AccountManagerSectionProps {
  tradingPosition: TradingPosition;
  isDarkMode: boolean;
  isDragging: boolean;
  isAccountCollapsed: boolean;
  isAccountMaximized: boolean;
  chartAccountSplit: number;
  onCollapsePanel: () => void;
  onOpenPanel: () => void;
  onMaximizePanel: () => void;
  onRestorePanel: () => void;
  onFullScreenStrategyTester?: () => void;
  orders: Order[];
  marketSimulation: MarketSimulationService | null;
  onOpenOrderPanel?: (orderType: "buy" | "sell", price?: number) => void;
  selectedSymbol?: string;
}

export default function AccountManagerSection({
  tradingPosition,
  isDarkMode,
  isDragging,
  isAccountCollapsed,
  isAccountMaximized,
  chartAccountSplit,
  onCollapsePanel,
  onOpenPanel,
  onMaximizePanel,
  onRestorePanel,
  onFullScreenStrategyTester,
  orders,
  marketSimulation,
  onOpenOrderPanel,
  selectedSymbol = "VIC.VN",
}: AccountManagerSectionProps) {
  const [activeTab, setActiveTab] = useState("Order Book");
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [marketAnalysis, setMarketAnalysis] =
    useState<MarketAnalysis | null>(null);

  // Suggestion state
  const [suggestedOrders, setSuggestedOrders] = useState<{
    buy: SuggestionData | null;
    sell: SuggestionData | null;
  }>({ buy: null, sell: null });

  // Suggestion history
  const [suggestionHistory, setSuggestionHistory] = useState<SuggestionData[]>(
    []
  );

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    const analyzeMarket = (
      marketData: SimulatedMarketData,
      bids: OrderBookLevel[],
      asks: OrderBookLevel[]
    ) => {
      const priceHistory = bids.concat(asks).map((l) => l.price);
      const trendStrength = calculateTrendStrength(priceHistory);
      const volatility = calculateVolatility(priceHistory);

      const totalBidVol = bids.reduce(
        (acc, level) => acc + level.totalQuantity,
        0
      );
      const totalAskVol = asks.reduce(
        (acc, level) => acc + level.totalQuantity,
        0
      );
      const liquidityScore = Math.min(100, (totalBidVol + totalAskVol) / 100);

      const supportLevels = identifySupportLevels(bids);
      const resistanceLevels = identifyResistanceLevels(asks);
      const volumeAnalysis = analyzeVolume(totalBidVol + totalAskVol);

      return {
        trendStrength,
        volatility,
        liquidityScore,
        supportLevels,
        resistanceLevels,
        volumeAnalysis,
        rsi: marketData.rsi || null,
        vwap: marketData.vwap || null,
      };
    };

    const generateSmartSuggestion = (
      analysis: MarketAnalysis,
      marketData: SimulatedMarketData,
      bids: OrderBookLevel[],
      asks: OrderBookLevel[]
    ): { buy: SuggestionData | null; sell: SuggestionData | null } => {
      const currentPrice = marketData.price;
      const bestAsk = asks.length > 0 ? asks[0] : null;
      const bestBid = bids.length > 0 ? bids[0] : null;

      if (!bestAsk || !bestBid) {
        setDebugInfo("No bid/ask data available");
        return { buy: null, sell: null };
      }

      const marketCondition = determineMarketCondition(analysis, currentPrice);

      const rsi = analysis.rsi || 50;
      const isOversold = rsi < 35;
      const isOverbought = rsi > 65;
      const vwap = analysis.vwap || currentPrice;
      const vwapDiff = ((currentPrice - vwap) / vwap) * 100;

      let buySuggestion: SuggestionData | null = null;
      let sellSuggestion: SuggestionData | null = null;

      // BUY logic (long)
      const buyCondition =
        analysis.trendStrength > 0.2 || isOversold || vwapDiff < -0.5;

      if (buyCondition) {
        const supportLevel =
          analysis.supportLevels.length > 0
            ? Math.max(...analysis.supportLevels)
            : bestBid.price * 0.995;

        const entryPrice = calculateOptimalEntryPrice(
          "buy",
          supportLevel,
          currentPrice,
          analysis
        );
        const stopLoss = entryPrice * 0.99; // -1%
        const takeProfit = entryPrice * 1.02; // +2%

        const winProbability = calculateWinProbability(
          "buy",
          analysis,
          rsi,
          vwapDiff
        );
        const confidence = calculateConfidence(analysis, winProbability);
        const riskLevel = determineRiskLevel(
          analysis.volatility,
          winProbability
        );

        const expectedProfit = (takeProfit - entryPrice) * 100;
        const expectedLoss = (entryPrice - stopLoss) * 100;
        const riskRewardRatio = expectedProfit / expectedLoss;

        if (riskRewardRatio > 1.2 && winProbability > 45) {
          buySuggestion = {
            price: Math.round(entryPrice / 100) * 100,
            quantity: calculatePositionSize(
              entryPrice,
              tradingPosition.cash,
              riskLevel
            ),
            reason: generateBuyReason(analysis, rsi, vwapDiff),
            winRate: Math.round(winProbability),
            confidence: Math.round(confidence),
            riskLevel,
            type: determineTradeType(analysis.trendStrength),
            stopLoss: Math.round(stopLoss / 100) * 100,
            takeProfit: Math.round(takeProfit / 100) * 100,
            expectedProfit: Math.round(expectedProfit),
            expectedLoss: Math.round(expectedLoss),
            timeFrame: determineTimeFrame(analysis.trendStrength),
            marketCondition,
          };

          setDebugInfo(
            `Created BUY signal: RRR=${riskRewardRatio
              .toFixed(2)
              .toString()}, Win=${winProbability}%`
          );
        } else {
          setDebugInfo(
            `BUY rejected: RRR=${riskRewardRatio
              .toFixed(2)
              .toString()}, Win=${winProbability}%`
          );
        }
      }

      // SELL logic (short)
      const sellCondition =
        analysis.trendStrength < -0.15 || isOverbought || vwapDiff > 0.3;

      if (sellCondition) {
        const resistanceLevel =
          analysis.resistanceLevels.length > 0
            ? Math.min(...analysis.resistanceLevels)
            : bestAsk.price * 1.005;

        const entryPrice = Math.max(resistanceLevel, currentPrice * 1.002);
        const stopLoss = entryPrice * 1.015; // +1.5%
        const takeProfit = entryPrice * 0.985; // -1.5%

        const winProbability = calculateWinProbability(
          "sell",
          analysis,
          rsi,
          vwapDiff
        );
        const confidence = calculateConfidence(analysis, winProbability);
        const riskLevel = determineRiskLevel(
          analysis.volatility,
          winProbability
        );

        const expectedProfit = (entryPrice - takeProfit) * 100;
        const expectedLoss = (stopLoss - entryPrice) * 100;
        const riskRewardRatio = expectedProfit / expectedLoss;

        if (riskRewardRatio > 1.1 && winProbability > 40) {
          sellSuggestion = {
            price: Math.round(entryPrice / 100) * 100,
            quantity: calculatePositionSize(
              entryPrice,
              tradingPosition.cash,
              riskLevel
            ),
            reason: generateSellReason(analysis, rsi, vwapDiff),
            winRate: Math.round(winProbability),
            confidence: Math.round(confidence),
            riskLevel,
            type: determineTradeType(analysis.trendStrength),
            stopLoss: Math.round(stopLoss / 100) * 100,
            takeProfit: Math.round(takeProfit / 100) * 100,
            expectedProfit: Math.round(expectedProfit),
            expectedLoss: Math.round(expectedLoss),
            timeFrame: determineTimeFrame(analysis.trendStrength),
            marketCondition,
          };

          setDebugInfo(
            `Created SELL signal: RRR=${riskRewardRatio
              .toFixed(2)
              .toString()}, Win=${winProbability}%`
          );
        } else {
          setDebugInfo(
            `SELL rejected: RRR=${riskRewardRatio
              .toFixed(2)
              .toString()}, Win=${winProbability}%`
          );
        }
      }

      // Fallback basic signals from trend
      if (!buySuggestion && !sellSuggestion && Math.abs(analysis.trendStrength) > 0.1) {
        if (analysis.trendStrength > 0.1) {
          buySuggestion = {
            price: Math.round((currentPrice * 0.998) / 100) * 100,
            quantity: 100,
            reason: "Mild uptrend – potential long scalp",
            winRate: 55,
            confidence: 60,
            riskLevel: "MEDIUM",
            type: "SCALPING",
            stopLoss: Math.round((currentPrice * 0.98) / 100) * 100,
            takeProfit: Math.round((currentPrice * 1.02) / 100) * 100,
            expectedProfit: 2000,
            expectedLoss: 1000,
            timeFrame: "IMMEDIATE",
            marketCondition: "BULLISH",
          };
          setDebugInfo("Created basic BUY signal from mild uptrend");
        } else if (analysis.trendStrength < -0.1) {
          sellSuggestion = {
            price: Math.round((currentPrice * 1.002) / 100) * 100,
            quantity: 100,
            reason: "Mild downtrend – potential short scalp",
            winRate: 55,
            confidence: 60,
            riskLevel: "MEDIUM",
            type: "SCALPING",
            stopLoss: Math.round((currentPrice * 1.02) / 100) * 100,
            takeProfit: Math.round((currentPrice * 0.98) / 100) * 100,
            expectedProfit: 2000,
            expectedLoss: 1000,
            timeFrame: "IMMEDIATE",
            marketCondition: "BEARISH",
          };
          setDebugInfo("Created basic SELL signal from mild downtrend");
        }
      }

      return { buy: buySuggestion, sell: sellSuggestion };
    };

    const interval = setInterval(() => {
      if (marketSimulation) {
        const marketData = marketSimulation.getMarketData(selectedSymbol);
        if (marketData) {
          const aggregateLevels = (depth: MarketDepthLevel[]) => {
            const priceMap: {
              [price: number]: { totalQuantity: number; orderCount: number };
            } = {};
            depth.forEach((level) => {
              if (priceMap[level.price]) {
                priceMap[level.price].totalQuantity += level.quantity;
                priceMap[level.price].orderCount += 1;
              } else {
                priceMap[level.price] = {
                  totalQuantity: level.quantity,
                  orderCount: 1,
                };
              }
            });

            return Object.entries(priceMap)
              .map(([price, data]) => ({
                price: parseFloat(price),
                totalQuantity: data.totalQuantity,
                orderCount: data.orderCount,
              }))
              .slice(0, 20);
          };

          const bids = aggregateLevels(marketData.bidDepth).sort(
            (a, b) => b.price - a.price
          );
          const asks = aggregateLevels(marketData.askDepth).sort(
            (a, b) => a.price - b.price
          );

          setOrderBook({
            bids: bids.map((bid) => ({
              price: bid.price,
              totalQuantity: bid.totalQuantity,
              orderCount: bid.orderCount,
            })),
            asks: asks.map((ask) => ({
              price: ask.price,
              totalQuantity: ask.totalQuantity,
              orderCount: ask.orderCount,
            })),
            lastTradedPrice: marketData.price,
            timestamp: new Date(),
          });

          const analysis = analyzeMarket(marketData, bids, asks);
          setMarketAnalysis(analysis);

          const suggestions = generateSmartSuggestion(
            analysis,
            marketData,
            bids,
            asks
          );
          setSuggestedOrders(suggestions);

          if (suggestions.buy) {
            setSuggestionHistory((prev) => [
              suggestions.buy!,
              ...prev.slice(0, 9),
            ]);
          }
          if (suggestions.sell) {
            setSuggestionHistory((prev) => [
              suggestions.sell!,
              ...prev.slice(0, 9),
            ]);
          }

          setLastUpdateTime(new Date());
        } else {
          setDebugInfo(`No market data for symbol ${selectedSymbol}`);
        }
      } else {
        setDebugInfo("Market simulation is not initialized");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [marketSimulation, tradingPosition.cash, selectedSymbol]);

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  const calculateTrendStrength = (prices: number[]): number => {
    if (prices.length < 5) return 0;
    const recentPrices = prices.slice(-5);
    const slope =
      (recentPrices[recentPrices.length - 1] - recentPrices[0]) /
      recentPrices[0];
    return Math.max(-1, Math.min(1, slope * 20));
  };

  const calculateVolatility = (prices: number[]): number => {
    if (prices.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      returns.length;
    return Math.sqrt(variance * 252);
  };

  const identifySupportLevels = (bids: OrderBookLevel[]): number[] => {
    if (bids.length < 3) return [];
    const levels: number[] = [];

    const topBids = [...bids]
      .sort((a, b) => b.price - a.price)
      .slice(0, 3);
    topBids.forEach((bid) => {
      if (bid.totalQuantity > 1000) {
        levels.push(bid.price);
      }
    });

    return levels;
  };

  const identifyResistanceLevels = (asks: OrderBookLevel[]): number[] => {
    if (asks.length < 3) return [];
    const levels: number[] = [];

    const topAsks = [...asks]
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
    topAsks.forEach((ask) => {
      if (ask.totalQuantity > 1000) {
        levels.push(ask.price);
      }
    });

    return levels;
  };

  const analyzeVolume = (
    totalVolume: number
  ): "HIGH" | "NORMAL" | "LOW" => {
    if (totalVolume > 20000) return "HIGH";
    if (totalVolume > 5000) return "NORMAL";
    return "LOW";
  };

  const determineMarketCondition = (
    analysis: MarketAnalysis,
    currentPrice: number
  ): "BULLISH" | "BEARISH" | "SIDEWAYS" => {
    if (analysis.trendStrength > 0.1) return "BULLISH";
    if (analysis.trendStrength < -0.1) return "BEARISH";
    return "SIDEWAYS";
  };

  const calculateOptimalEntryPrice = (
    type: "buy" | "sell",
    level: number,
    currentPrice: number,
    analysis: MarketAnalysis
  ): number => {
    if (type === "buy") {
      return Math.min(level, currentPrice * 0.999);
    } else {
      return Math.max(level, currentPrice * 1.001);
    }
  };

  const calculateWinProbability = (
    type: "buy" | "sell",
    analysis: MarketAnalysis,
    rsi: number,
    vwapDiff: number
  ): number => {
    let baseProbability = 50;

    baseProbability +=
      type === "buy" ? analysis.trendStrength * 20 : -analysis.trendStrength * 20;

    if (type === "buy" && rsi < 35) baseProbability += 10;
    if (type === "sell" && rsi > 65) baseProbability += 10;

    if (type === "buy" && vwapDiff < -0.3) baseProbability += 8;
    if (type === "sell" && vwapDiff > 0.3) baseProbability += 8;

    if (analysis.liquidityScore > 30) baseProbability += 5;

    return Math.max(30, Math.min(90, baseProbability));
  };

  const calculateConfidence = (
    analysis: MarketAnalysis,
    winProbability: number
  ): number => {
    let confidence = winProbability;

    if (analysis.trendStrength > 0.3 || analysis.trendStrength < -0.3)
      confidence += 10;
    if (analysis.volatility < 0.03) confidence += 5;
    if (analysis.liquidityScore > 20) confidence += 5;

    return Math.min(95, confidence);
  };

  const determineRiskLevel = (
    volatility: number,
    winProbability: number
  ): "LOW" | "MEDIUM" | "HIGH" => {
    const riskScore = volatility * 100 + (100 - winProbability) * 0.3;

    if (riskScore < 40) return "LOW";
    if (riskScore < 70) return "MEDIUM";
    return "HIGH";
  };

  const calculatePositionSize = (
    price: number,
    availableCash: number,
    riskLevel: "LOW" | "MEDIUM" | "HIGH"
  ): number => {
    const riskMultiplier = {
      LOW: 0.08,
      MEDIUM: 0.05,
      HIGH: 0.02,
    };

    const maxInvestment = availableCash * riskMultiplier[riskLevel];
    const positionSize = Math.floor(maxInvestment / price / 100) * 100;

    return Math.max(100, Math.min(1000, positionSize));
  };

  const generateBuyReason = (
    analysis: MarketAnalysis,
    rsi: number,
    vwapDiff: number
  ): string => {
    const reasons: string[] = [];

    if (analysis.trendStrength > 0.2) reasons.push("Uptrend momentum");
    if (rsi < 35) reasons.push("RSI in oversold zone");
    if (vwapDiff < -0.5) reasons.push("Price trading below VWAP");
    if (analysis.supportLevels.length > 0)
      reasons.push("Strong support level nearby");
    if (analysis.volumeAnalysis === "HIGH")
      reasons.push("High volume confirming demand");

    if (reasons.length === 0) return "Potential long opportunity based on technical confluence";
    return reasons.slice(0, 3).join(" • ");
  };

  const generateSellReason = (
    analysis: MarketAnalysis,
    rsi: number,
    vwapDiff: number
  ): string => {
    const reasons: string[] = [];

    if (analysis.trendStrength < -0.1) reasons.push("Downtrend momentum");
    if (rsi > 60) reasons.push("RSI in overbought zone");
    if (vwapDiff > 0.2) reasons.push("Price trading above VWAP");
    if (analysis.resistanceLevels.length > 0)
      reasons.push("Key resistance zone overhead");
    if (analysis.volumeAnalysis === "HIGH")
      reasons.push("High volume confirming selling pressure");
    if (analysis.volatility > 0.02)
      reasons.push("Elevated volatility – good short environment");

    if (reasons.length === 0)
      return "Potential short opportunity based on technical confluence";
    return reasons.slice(0, 3).join(" • ");
  };

  const determineTradeType = (
    trendStrength: number
  ): "SCALPING" | "DAY_TRADING" | "SWING" => {
    const absStrength = Math.abs(trendStrength);

    if (absStrength > 0.3) return "SWING";
    if (absStrength > 0.15) return "DAY_TRADING";
    return "SCALPING";
  };

  const determineTimeFrame = (
    trendStrength: number
  ): "IMMEDIATE" | "SHORT" | "MEDIUM" => {
    const absStrength = Math.abs(trendStrength);

    if (absStrength > 0.2) return "MEDIUM";
    if (absStrength > 0.08) return "SHORT";
    return "IMMEDIATE";
  };

  const getRiskColor = (riskLevel: "LOW" | "MEDIUM" | "HIGH") => {
    const colors = {
      LOW: isDarkMode
        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        : "text-emerald-600 bg-emerald-100 border-emerald-200",
      MEDIUM: isDarkMode
        ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
        : "text-amber-600 bg-amber-100 border-amber-200",
      HIGH: isDarkMode
        ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
        : "text-rose-600 bg-rose-100 border-rose-200",
    };
    return colors[riskLevel];
  };

  const getTimeFrameColor = (
    timeFrame: "IMMEDIATE" | "SHORT" | "MEDIUM"
  ) => {
    const colors = {
      IMMEDIATE: isDarkMode
        ? "text-sky-400 bg-sky-400/10 border-sky-400/20"
        : "text-sky-600 bg-sky-100 border-sky-200",
      SHORT: isDarkMode
        ? "text-violet-400 bg-violet-400/10 border-violet-400/20"
        : "text-violet-600 bg-violet-100 border-violet-200",
      MEDIUM: isDarkMode
        ? "text-indigo-400 bg-indigo-400/10 border-indigo-400/20"
        : "text-indigo-600 bg-indigo-100 border-indigo-200",
    };
    return colors[timeFrame];
  };

  const getMarketConditionColor = (
    condition: "BULLISH" | "BEARISH" | "SIDEWAYS"
  ) => {
    const colors = {
      BULLISH: isDarkMode
        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        : "text-emerald-600 bg-emerald-100 border-emerald-200",
      BEARISH: isDarkMode
        ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
        : "text-rose-600 bg-rose-100 border-rose-200",
      SIDEWAYS: isDarkMode
        ? "text-slate-400 bg-slate-400/10 border-slate-400/20"
        : "text-slate-600 bg-slate-100 border-slate-200",
    };
    return colors[condition];
  };

  const tabs = ["Orders", "Order Book", "Order History", "AI Insights"];

  const metrics = [
    { label: "Account Balance", value: formatVND(tradingPosition.cash) },
    {
      label: "Equity",
      value: formatVND(tradingPosition.cash + tradingPosition.pnl),
    },
    { label: "Realized P&L", value: formatVND(0) },
    { label: "Unrealized P&L", value: formatVND(tradingPosition.pnl) },
    {
      label: "Available Funds",
      value: formatVND(tradingPosition.cash),
      info: true,
    },
  ];

  return (
    <div
      className={`border rounded overflow-hidden relative flex flex-col transition-colors duration-200 ${
        isDarkMode
          ? "bg-[#0f1219] border-[#1e222d]"
          : "bg-white border-gray-200"
      }`}
      style={{
        willChange: isDragging ? "height" : "auto",
        transform: "translateZ(0)",
        height: "100%",
      }}
    >
      {/* HEADER */}
      <div
        className={`flex-none flex items-center justify-between px-4 py-3 border-b select-none ${
          isDarkMode
            ? "border-[#1e222d] text-gray-300"
            : "border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <span className="font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              AI TRADING ASSISTANT
            </span>
            <span className="text-gray-500">•</span>
            <span>vuvuihoc123</span>
            <span className="text-xs text-gray-500 ml-2">
              ({selectedSymbol})
            </span>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          {!isAccountCollapsed && chartAccountSplit < 90 && (
            <button
              onClick={onCollapsePanel}
              className={`p-1.5 rounded hover:bg-gray-700/50 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
          )}
          {isAccountCollapsed && (
            <button
              onClick={onOpenPanel}
              className={`p-1.5 rounded hover:bg-gray-700/50 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="18,15 12,9 6,15"></polyline>
              </svg>
            </button>
          )}
          {activeTab === "Strategy Tester" && onFullScreenStrategyTester && (
            <button
              onClick={onFullScreenStrategyTester}
              className={`p-1.5 rounded hover:bg-gray-700/50 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            </button>
          )}
          <button
            onClick={isAccountMaximized ? onRestorePanel : onMaximizePanel}
            className={`p-1.5 rounded hover:bg-gray-700/50 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {isAccountMaximized ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="4,14 10,14 10,20"></polyline>
                <polyline points="20,10 14,10 14,4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15,3 21,3 21,9"></polyline>
                <polyline points="9,21 3,21 3,15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      {!isAccountCollapsed && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Metrics Row */}
          <div
            className={`flex-none px-4 py-4 border-b ${
              isDarkMode ? "border-[#1e222d]" : "border-gray-200"
            }`}
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {metrics.map((metric, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div
                    className={`flex items-center gap-1 text-xs font-normal ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {metric.label}
                    {metric.info && (
                      <span className="cursor-help opacity-70">ⓘ</span>
                    )}
                  </div>
                  <div
                    className={`font-medium text-[14px] tracking-wide ${
                      isDarkMode ? "text-gray-200" : "text-gray-900"
                    }`}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Debug info */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-2 text-xs text-gray-500">
                <div>Last update: {lastUpdateTime.toLocaleTimeString()}</div>
                <div>Debug: {debugInfo}</div>
                {marketAnalysis && (
                  <div className="mt-1">
                    Trend: {marketAnalysis.trendStrength.toFixed(3)} | RSI:{" "}
                    {marketAnalysis.rsi?.toFixed(1) || "--"} | Vol:{" "}
                    {(marketAnalysis.volatility * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div
            className={`flex-none flex items-center px-4 border-b gap-6 ${
              isDarkMode ? "border-[#1e222d]" : "border-gray-200"
            }`}
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative py-3 text-sm font-medium transition-colors select-none ${
                  activeTab === tab
                    ? isDarkMode
                      ? "text-blue-400"
                      : "text-blue-600"
                    : isDarkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div
                    className={`absolute bottom-0 left-0 w-full h-[2px] ${
                      isDarkMode ? "bg-blue-400" : "bg-blue-600"
                    }`}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Main Tab Content */}
          <div className="flex-1 overflow-hidden relative">
            {/* ORDERS TAB */}
            {activeTab === "Orders" && (
              <div className="h-full overflow-auto trading-scrollbar p-4">
                <div
                  className={`rounded-lg border overflow-hidden ${
                    isDarkMode
                      ? "bg-[#0f1219] border-gray-800"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        className={`text-left ${
                          isDarkMode
                            ? "bg-[#1a1d29] text-gray-400"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <th className="py-3 px-4 font-medium">Symbol</th>
                        <th className="py-3 px-4 font-medium">Side</th>
                        <th className="py-3 px-4 font-medium text-right">
                          Size
                        </th>
                        <th className="py-3 px-4 font-medium text-right">
                          Price
                        </th>
                        <th className="py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter((order) =>
                        ["NEW", "PARTIALLY_FILLED"].includes(order.status)
                      ).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-gray-500"
                          >
                            No open orders
                          </td>
                        </tr>
                      )}
                      {orders
                        .filter((order) =>
                          ["NEW", "PARTIALLY_FILLED"].includes(order.status)
                        )
                        .map((order) => (
                          <tr
                            key={order.id}
                            className={`border-t ${
                              isDarkMode
                                ? "border-gray-800 hover:bg-gray-800/50"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-gray-200">
                              {order.symbol}
                            </td>
                            <td
                              className={`py-3 px-4 ${
                                order.type === "buy"
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {order.type.toUpperCase()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-gray-300">
                              {order.quantity}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-gray-300">
                              {formatVND(order.price || 0)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-amber-900/30 text-amber-400 px-2 py-1 rounded text-[10px]">
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ORDER BOOK + AI TRADING SIGNALS */}
            {activeTab === "Order Book" && (
              <div className="h-full overflow-auto trading-scrollbar">
                {/* AI Trading Signals Section */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                          }`}
                        >
                          <svg
                            className="w-5 h-5 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <h3
                            className={`font-bold text-lg ${
                              isDarkMode ? "text-gray-200" : "text-gray-900"
                            }`}
                          >
                            AI Trading Signals
                          </h3>
                          <p
                            className={`text-xs mt-0.5 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Real-time market companion – refreshed every second
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {new Date().toLocaleTimeString()}
                        </span>
                        {process.env.NODE_ENV === "development" && (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                            Debug
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compact market snapshot */}
                    {marketAnalysis && (
                      <div className="grid grid-cols-3 gap-3 mt-2 mb-4">
                        <div
                          className={`rounded-lg px-3 py-2 text-xs border ${
                            isDarkMode
                              ? "bg-gray-900/60 border-gray-800"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }
                          >
                            Trend
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span
                              className={`font-semibold text-sm ${
                                marketAnalysis.trendStrength > 0
                                  ? "text-emerald-400"
                                  : marketAnalysis.trendStrength < 0
                                  ? "text-rose-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {marketAnalysis.trendStrength > 0 ? "+" : ""}
                              {marketAnalysis.trendStrength.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {marketAnalysis.trendStrength > 0.2
                                ? "Strong uptrend"
                                : marketAnalysis.trendStrength < -0.2
                                ? "Strong downtrend"
                                : "Sideways"}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 text-xs border ${
                            isDarkMode
                              ? "bg-gray-900/60 border-gray-800"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }
                          >
                            Volatility
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="font-semibold text-sm text-sky-400">
                              {(marketAnalysis.volatility * 100).toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {marketAnalysis.volatility > 0.03
                                ? "High"
                                : marketAnalysis.volatility > 0.01
                                ? "Medium"
                                : "Low"}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 text-xs border ${
                            isDarkMode
                              ? "bg-gray-900/60 border-gray-800"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }
                          >
                            Liquidity
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="font-semibold text-sm text-violet-400">
                              {Math.round(marketAnalysis.liquidityScore)}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {marketAnalysis.volumeAnalysis === "HIGH"
                                ? "High volume"
                                : marketAnalysis.volumeAnalysis === "NORMAL"
                                ? "Normal volume"
                                : "Low volume"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Signal cards row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* BUY SIGNAL CARD */}
                    {suggestedOrders.buy ? (
                      <div
                        onClick={() =>
                          suggestedOrders.buy &&
                          onOpenOrderPanel &&
                          onOpenOrderPanel("buy", suggestedOrders.buy.price)
                        }
                        className={`relative overflow-hidden rounded-xl border p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                          isDarkMode
                            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-900/10 to-gray-900/30 hover:border-emerald-500/50"
                            : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-300"
                        }`}
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                          <svg
                            viewBox="0 0 100 100"
                            className="w-full h-full text-emerald-500"
                          >
                            <path
                              d="M20,20 L80,20 L80,80 L20,80 Z"
                              fill="currentColor"
                            />
                          </svg>
                        </div>

                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                                    isDarkMode
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  LONG • {suggestedOrders.buy.type}
                                </span>
                                <span
                                  className={`text-xs font-bold px-2 py-1 rounded-full border ${getRiskColor(
                                    suggestedOrders.buy.riskLevel
                                  )}`}
                                >
                                  {suggestedOrders.buy.riskLevel} RISK
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={`px-2 py-0.5 rounded border ${getTimeFrameColor(
                                    suggestedOrders.buy.timeFrame
                                  )}`}
                                >
                                  {suggestedOrders.buy.timeFrame}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded border ${getMarketConditionColor(
                                    suggestedOrders.buy.marketCondition
                                  )}`}
                                >
                                  {suggestedOrders.buy.marketCondition}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">
                                Confidence
                              </div>
                              <div className="relative w-14 h-14">
                                <svg
                                  className="w-full h-full"
                                  viewBox="0 0 36 36"
                                >
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={isDarkMode ? "#2a2e39" : "#e5e7eb"}
                                    strokeWidth="3"
                                  />
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="3"
                                    strokeDasharray={`${suggestedOrders.buy.confidence}, 100`}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-sm font-bold text-emerald-500">
                                    {suggestedOrders.buy.confidence}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-xs text-gray-500 mb-1">
                              Entry price
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`text-3xl font-bold ${
                                  isDarkMode
                                    ? "text-gray-200"
                                    : "text-gray-900"
                                }`}
                              >
                                {formatVND(suggestedOrders.buy.price)}
                              </span>
                              <span className="text-sm text-gray-400">
                                VND
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div
                              className={`text-center p-2 rounded-lg border ${
                                isDarkMode
                                  ? "bg-gray-800/50 border-gray-700"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="text-xs text-gray-500">
                                Win rate
                              </div>
                              <div className="text-lg font-bold text-emerald-500">
                                {suggestedOrders.buy.winRate}%
                              </div>
                            </div>
                            <div
                              className={`text-center p-2 rounded-lg border ${
                                isDarkMode
                                  ? "bg-gray-800/50 border-gray-700"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="text-xs text-gray-500">
                                Position size
                              </div>
                              <div className="text-lg font-bold text-blue-500">
                                {suggestedOrders.buy.quantity}
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-xs text-gray-500 mb-2">
                              Risk / reward
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div
                                className={`p-2 rounded-lg border ${
                                  isDarkMode
                                    ? "border-emerald-500/30"
                                    : "border-emerald-200"
                                }`}
                              >
                                <div className="text-xs text-gray-500">
                                  Take profit
                                </div>
                                <div className="text-sm font-bold text-emerald-500">
                                  {formatVND(
                                    suggestedOrders.buy.takeProfit!
                                  )}
                                </div>
                                <div className="text-xs text-emerald-400">
                                  +
                                  {suggestedOrders.buy.expectedProfit?.toLocaleString()}{" "}
                                  VND
                                </div>
                              </div>
                              <div
                                className={`p-2 rounded-lg border ${
                                  isDarkMode
                                    ? "border-rose-500/30"
                                    : "border-rose-200"
                                }`}
                              >
                                <div className="text-xs text-gray-500">
                                  Stop loss
                                </div>
                                <div className="text-sm font-bold text-rose-500">
                                  {formatVND(suggestedOrders.buy.stopLoss!)}
                                </div>
                                <div className="text-xs text-rose-400">
                                  -
                                  {suggestedOrders.buy.expectedLoss?.toLocaleString()}{" "}
                                  VND
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-xs text-gray-500 mb-1">
                              Signal explanation
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {suggestedOrders.buy.reason}
                            </p>
                          </div>

                          <button className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                            Open BUY order • Qty:{" "}
                            {suggestedOrders.buy.quantity}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center ${
                          isDarkMode
                            ? "border-gray-700 bg-gray-900/30"
                            : "border-gray-300 bg-gray-50"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-full mb-4 ${
                            isDarkMode ? "bg-gray-800" : "bg-gray-200"
                          }`}
                        >
                          <svg
                            className="w-8 h-8 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h4
                          className={`font-bold mb-2 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Waiting for long signal
                        </h4>
                        <p className="text-xs text-gray-500">
                          AI is scanning the order book for a high-quality long
                          opportunity.
                        </p>
                        {process.env.NODE_ENV === "development" &&
                          debugInfo && (
                            <p className="text-xs text-yellow-600 mt-2">
                              {debugInfo}
                            </p>
                          )}
                      </div>
                    )}

                    {/* SELL SIGNAL CARD */}
                    {suggestedOrders.sell ? (
                      <div
                        onClick={() =>
                          suggestedOrders.sell &&
                          onOpenOrderPanel &&
                          onOpenOrderPanel("sell", suggestedOrders.sell.price)
                        }
                        className={`relative overflow-hidden rounded-xl border p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                          isDarkMode
                            ? "border-rose-500/30 bg-gradient-to-br from-rose-900/10 to-gray-900/30 hover:border-rose-500/50"
                            : "border-rose-200 bg-gradient-to-br from-rose-50 to-white hover:border-rose-300"
                        }`}
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                          <svg
                            viewBox="0 0 100 100"
                            className="w-full h-full text-rose-500"
                          >
                            <path
                              d="M20,20 L80,20 L80,80 L20,80 Z"
                              fill="currentColor"
                            />
                          </svg>
                        </div>

                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                                    isDarkMode
                                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                      : "bg-rose-100 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  SHORT • {suggestedOrders.sell.type}
                                </span>
                                <span
                                  className={`text-xs font-bold px-2 py-1 rounded-full border ${getRiskColor(
                                    suggestedOrders.sell.riskLevel
                                  )}`}
                                >
                                  {suggestedOrders.sell.riskLevel} RISK
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={`px-2 py-0.5 rounded border ${getTimeFrameColor(
                                    suggestedOrders.sell.timeFrame
                                  )}`}
                                >
                                  {suggestedOrders.sell.timeFrame}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded border ${getMarketConditionColor(
                                    suggestedOrders.sell.marketCondition
                                  )}`}
                                >
                                  {suggestedOrders.sell.marketCondition}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">
                                Confidence
                              </div>
                              <div className="relative w-14 h-14">
                                <svg
                                  className="w-full h-full"
                                  viewBox="0 0 36 36"
                                >
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={isDarkMode ? "#2a2e39" : "#e5e7eb"}
                                    strokeWidth="3"
                                  />
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth="3"
                                    strokeDasharray={`${suggestedOrders.sell.confidence}, 100`}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-sm font-bold text-rose-500">
                                    {suggestedOrders.sell.confidence}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-xs text-gray-500 mb-1">
                              Entry price
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`text-3xl font-bold ${
                                  isDarkMode
                                    ? "text-gray-200"
                                    : "text-gray-900"
                                }`}
                              >
                                {formatVND(suggestedOrders.sell.price)}
                              </span>
                              <span className="text-sm text-gray-400">
                                VND
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div
                              className={`text-center p-2 rounded-lg border ${
                                isDarkMode
                                  ? "bg-gray-800/50 border-gray-700"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="text-xs text-gray-500">
                                Win rate
                              </div>
                              <div className="text-lg font-bold text-rose-500">
                                {suggestedOrders.sell.winRate}%
                              </div>
                            </div>
                            <div
                              className={`text-center p-2 rounded-lg border ${
                                isDarkMode
                                  ? "bg-gray-800/50 border-gray-700"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="text-xs text-gray-500">
                                Position size
                              </div>
                              <div className="text-lg font-bold text-blue-500">
                                {suggestedOrders.sell.quantity}
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-xs text-gray-500 mb-2">
                              Risk / reward
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div
                                className={`p-2 rounded-lg border ${
                                  isDarkMode
                                    ? "border-rose-500/30"
                                    : "border-rose-200"
                                }`}
                              >
                                <div className="text-xs text-gray-500">
                                  Take profit
                                </div>
                                <div className="text-sm font-bold text-rose-500">
                                  {formatVND(
                                    suggestedOrders.sell.takeProfit!
                                  )}
                                </div>
                                <div className="text-xs text-rose-400">
                                  +
                                  {suggestedOrders.sell.expectedProfit?.toLocaleString()}{" "}
                                  VND
                                </div>
                              </div>
                              <div
                                className={`p-2 rounded-lg border ${
                                  isDarkMode
                                    ? "border-emerald-500/30"
                                    : "border-emerald-200"
                                }`}
                              >
                                <div className="text-xs text-gray-500">
                                  Stop loss
                                </div>
                                <div className="text-sm font-bold text-emerald-500">
                                  {formatVND(suggestedOrders.sell.stopLoss!)}
                                </div>
                                <div className="text-xs text-emerald-400">
                                  -
                                  {suggestedOrders.sell.expectedLoss?.toLocaleString()}{" "}
                                  VND
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-xs text-gray-500 mb-1">
                              Signal explanation
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {suggestedOrders.sell.reason}
                            </p>
                          </div>

                          <button className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                            Open SELL order • Qty:{" "}
                            {suggestedOrders.sell.quantity}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center ${
                          isDarkMode
                            ? "border-gray-700 bg-gray-900/30"
                            : "border-gray-300 bg-gray-50"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-full mb-4 ${
                            isDarkMode ? "bg-gray-800" : "bg-gray-200"
                          }`}
                        >
                          <svg
                            className="w-8 h-8 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h4
                          className={`font-bold mb-2 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Waiting for short signal
                        </h4>
                        <p className="text-xs text-gray-500">
                          AI is monitoring for a potential short setup with
                          attractive risk/reward.
                        </p>
                        {process.env.NODE_ENV === "development" &&
                          debugInfo && (
                            <p className="text-xs text-yellow-600 mt-2">
                              {debugInfo}
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ORDER BOOK DEPTH TABLES */}
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-1">
                    {/* BIDS */}
                    <div
                      className={`rounded-t-lg border-x border-t overflow-hidden ${
                        isDarkMode
                          ? "bg-[#0f1219] border-gray-800"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div
                        className={`px-3 py-2 text-[10px] font-bold uppercase flex justify-between ${
                          isDarkMode
                            ? "bg-[#1a1d29] text-emerald-400"
                            : "bg-gray-50 text-emerald-700"
                        }`}
                      >
                        <span>BID (Buy orders)</span>
                        <span>Price - Volume - Orders</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr
                            className={`text-left ${
                              isDarkMode
                                ? "bg-[#1a1d29] text-gray-400"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <th className="py-2 px-3 font-medium">Price</th>
                            <th className="py-2 px-3 font-medium text-right">
                              Volume
                            </th>
                            <th className="py-2 px-3 font-medium text-right">
                              Order count
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderBook?.bids.map((level, i) => {
                            const maxVol = Math.max(
                              ...(orderBook?.bids.map(
                                (b) => b.totalQuantity
                              ) || [1])
                            );
                            const widthPercent =
                              (level.totalQuantity / maxVol) * 100;
                            return (
                              <tr
                                key={i}
                                onClick={() =>
                                  onOpenOrderPanel &&
                                  onOpenOrderPanel("buy", level.price)
                                }
                                className="cursor-pointer relative hover:opacity-90 transition-all group"
                              >
                                <td
                                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 z-0 group-hover:bg-emerald-500/20"
                                  style={{ width: `${widthPercent}%` }}
                                ></td>
                                <td className="relative z-10 py-1.5 px-3 font-mono text-emerald-400 font-medium">
                                  {formatVND(level.price)}
                                </td>
                                <td className="relative z-10 py-1.5 px-3 text-right font-mono text-gray-300">
                                  {level.totalQuantity.toLocaleString()}
                                </td>
                                <td className="relative z-10 py-1.5 px-3 text-right font-mono text-gray-300">
                                  {level.orderCount}
                                </td>
                              </tr>
                            );
                          })}
                          {(!orderBook || orderBook.bids.length === 0) && (
                            <tr>
                              <td
                                colSpan={3}
                                className="py-4 text-center text-xs text-gray-500"
                              >
                                No buy orders
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* ASKS */}
                    <div
                      className={`rounded-b-lg border overflow-hidden ${
                        isDarkMode
                          ? "bg-[#0f1219] border-gray-800"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div
                        className={`px-3 py-2 text-[10px] font-bold uppercase flex justify-between ${
                          isDarkMode
                            ? "bg-[#1a1d29] text-rose-400"
                            : "bg-gray-50 text-rose-700"
                        }`}
                      >
                        <span>ASK (Sell orders)</span>
                        <span>Price - Volume - Orders</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr
                            className={`text-left ${
                              isDarkMode
                                ? "bg-[#1a1d29] text-gray-400"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <th className="py-2 px-3 font-medium">Price</th>
                            <th className="py-2 px-3 font-medium text-right">
                              Volume
                            </th>
                            <th className="py-2 px-3 font-medium text-right">
                              Order count
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderBook?.asks.map((level, i) => {
                            const maxVol = Math.max(
                              ...(orderBook?.asks.map(
                                (b) => b.totalQuantity
                              ) || [1])
                            );
                            const widthPercent =
                              (level.totalQuantity / maxVol) * 100;
                            return (
                              <tr
                                key={i}
                                onClick={() =>
                                  onOpenOrderPanel &&
                                  onOpenOrderPanel("sell", level.price)
                                }
                                className="cursor-pointer relative hover:opacity-90 transition-all group"
                              >
                                <td
                                  className="absolute right-0 top-0 bottom-0 bg-rose-500/10 z-0 group-hover:bg-rose-500/20"
                                  style={{ width: `${widthPercent}%` }}
                                ></td>
                                <td className="relative z-10 py-1.5 px-3 font-mono text-rose-400 font-medium">
                                  {formatVND(level.price)}
                                </td>
                                <td className="relative z-10 py-1.5 px-3 text-right font-mono text-gray-300">
                                  {level.totalQuantity.toLocaleString()}
                                </td>
                                <td className="relative z-10 py-1.5 px-3 text-right font-mono text-gray-300">
                                  {level.orderCount}
                                </td>
                              </tr>
                            );
                          })}
                          {(!orderBook || orderBook.asks.length === 0) && (
                            <tr>
                              <td
                                colSpan={3}
                                className="py-4 text-center text-xs text-gray-500"
                              >
                                No sell orders
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ORDER HISTORY TAB */}
            {activeTab === "Order History" && (
              <div className="h-full overflow-auto trading-scrollbar p-4">
                <div
                  className={`rounded-lg border overflow-hidden ${
                    isDarkMode
                      ? "bg-[#0f1219] border-gray-800"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        className={`text-left ${
                          isDarkMode
                            ? "bg-[#1a1d29] text-gray-400"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <th className="py-3 px-4 font-medium">Time</th>
                        <th className="py-3 px-4 font-medium">Symbol</th>
                        <th className="py-3 px-4 font-medium">Side</th>
                        <th className="py-3 px-4 font-medium text-right">
                          Filled Price
                        </th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr
                          key={order.id}
                          className={`border-t ${
                            isDarkMode
                              ? "border-gray-800 hover:bg-gray-800/50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <td className="py-3 px-4 text-gray-500">
                            {order.timestamp.toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-200">
                            {order.symbol}
                          </td>
                          <td
                            className={`py-3 px-4 ${
                              order.type === "buy"
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {order.type.toUpperCase()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-300">
                            {formatVND(order.price || 0)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                order.status === "FILLED"
                                  ? "bg-emerald-900/30 text-emerald-400"
                                  : "bg-gray-700 text-gray-400"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AI INSIGHTS TAB */}
            {activeTab === "AI Insights" && (
              <div className="h-full overflow-auto trading-scrollbar p-4">
                {/* Market Analysis Overview */}
                {marketAnalysis && (
                  <div
                    className={`rounded-xl p-5 mb-6 ${
                      isDarkMode
                        ? "bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800"
                        : "bg-gradient-to-br from-gray-50 to-white border border-gray-200"
                    }`}
                  >
                    <h3
                      className={`text-lg font-bold mb-4 ${
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      📊 Market analysis
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div
                        className={`text-center p-3 rounded-lg border ${
                          isDarkMode
                            ? "bg-gray-800/50 border-gray-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          Trend strength
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            marketAnalysis.trendStrength > 0
                              ? "text-emerald-500"
                              : "text-rose-500"
                          }`}
                        >
                          {marketAnalysis.trendStrength > 0 ? "+" : ""}
                          {marketAnalysis.trendStrength.toFixed(2)}
                        </div>
                        <div className="text-xs mt-1">
                          {marketAnalysis.trendStrength > 0.2
                            ? "Strong uptrend"
                            : marketAnalysis.trendStrength < -0.2
                            ? "Strong downtrend"
                            : "Sideways / range"}
                        </div>
                      </div>

                      <div
                        className={`text-center p-3 rounded-lg border ${
                          isDarkMode
                            ? "bg-gray-800/50 border-gray-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          Volatility
                        </div>
                        <div className="text-lg font-bold text-sky-500">
                          {(marketAnalysis.volatility * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs mt-1">
                          {marketAnalysis.volatility > 0.03
                            ? "High"
                            : marketAnalysis.volatility > 0.01
                            ? "Medium"
                            : "Low"}
                        </div>
                      </div>

                      <div
                        className={`text-center p-3 rounded-lg border ${
                          isDarkMode
                            ? "bg-gray-800/50 border-gray-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          Liquidity
                        </div>
                        <div className="text-lg font-bold text-violet-500">
                          {Math.round(marketAnalysis.liquidityScore)}
                        </div>
                        <div className="text-xs mt-1">
                          {marketAnalysis.volumeAnalysis === "HIGH"
                            ? "High volume"
                            : marketAnalysis.volumeAnalysis === "NORMAL"
                            ? "Normal volume"
                            : "Low volume"}
                        </div>
                      </div>

                      <div
                        className={`text-center p-3 rounded-lg border ${
                          isDarkMode
                            ? "bg-gray-800/50 border-gray-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">RSI</div>
                        <div
                          className={`text-lg font-bold ${
                            marketAnalysis.rsi === null
                              ? "text-gray-500"
                              : marketAnalysis.rsi < 35
                              ? "text-emerald-500"
                              : marketAnalysis.rsi > 65
                              ? "text-rose-500"
                              : "text-sky-500"
                          }`}
                        >
                          {marketAnalysis.rsi?.toFixed(1) || "--"}
                        </div>
                        <div className="text-xs mt-1">
                          {marketAnalysis.rsi === null
                            ? "N/A"
                            : marketAnalysis.rsi < 35
                            ? "Oversold"
                            : marketAnalysis.rsi > 65
                            ? "Overbought"
                            : "Neutral"}
                        </div>
                      </div>
                    </div>

                    {/* Support & Resistance */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4
                          className={`text-sm font-bold mb-2 ${
                            isDarkMode ? "text-emerald-400" : "text-emerald-700"
                          }`}
                        >
                          🛡️ Key support levels
                        </h4>
                        <div className="space-y-1">
                          {marketAnalysis.supportLevels
                            .slice(0, 3)
                            .map((level, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-sm"
                              >
                                <span
                                  className={
                                    isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }
                                >
                                  Level {idx + 1}
                                </span>
                                <span className="font-mono font-bold text-emerald-500">
                                  {formatVND(level)}
                                </span>
                              </div>
                            ))}
                          {marketAnalysis.supportLevels.length === 0 && (
                            <div className="text-xs text-gray-500">
                              No strong support detected
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4
                          className={`text-sm font-bold mb-2 ${
                            isDarkMode ? "text-rose-400" : "text-rose-700"
                          }`}
                        >
                          🚧 Key resistance levels
                        </h4>
                        <div className="space-y-1">
                          {marketAnalysis.resistanceLevels
                            .slice(0, 3)
                            .map((level, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-sm"
                              >
                                <span
                                  className={
                                    isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }
                                >
                                  Level {idx + 1}
                                </span>
                                <span className="font-mono font-bold text-rose-500">
                                  {formatVND(level)}
                                </span>
                              </div>
                            ))}
                          {marketAnalysis.resistanceLevels.length === 0 && (
                            <div className="text-xs text-gray-500">
                              No strong resistance detected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestion History */}
                <div
                  className={`rounded-xl p-5 ${
                    isDarkMode
                      ? "bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-800"
                      : "bg-gradient-to-br from-gray-50 to-white border border-gray-200"
                  }`}
                >
                  <h3
                    className={`text-lg font-bold mb-4 ${
                      isDarkMode ? "text-gray-200" : "text-gray-900"
                    }`}
                  >
                    📈 Recent AI suggestions
                  </h3>

                  {suggestionHistory.length > 0 ? (
                    <div className="space-y-3">
                      {suggestionHistory.slice(0, 5).map((suggestion, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] border ${
                            suggestion.winRate > 50
                              ? isDarkMode
                                ? "bg-emerald-900/20 border-emerald-800/50"
                                : "bg-emerald-50 border-emerald-200"
                              : isDarkMode
                              ? "bg-rose-900/20 border-rose-800/50"
                              : "bg-rose-50 border-rose-200"
                          }`}
                          onClick={() =>
                            onOpenOrderPanel &&
                            onOpenOrderPanel(
                              suggestion.winRate > 50 ? "buy" : "sell",
                              suggestion.price
                            )
                          }
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  suggestion.winRate > 50
                                    ? isDarkMode
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : isDarkMode
                                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                    : "bg-rose-100 text-rose-700 border-rose-200"
                                }`}
                              >
                                {suggestion.winRate > 50 ? "BUY" : "SELL"}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${getRiskColor(
                                  suggestion.riskLevel
                                )}`}
                              >
                                {suggestion.riskLevel}
                              </span>
                            </div>
                            <span className="text-sm font-bold">
                              {formatVND(suggestion.price)}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {suggestion.reason}
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs">
                              <span
                                className={
                                  isDarkMode
                                    ? "text-gray-400"
                                    : "text-gray-600"
                                }
                              >
                                Win rate:{" "}
                              </span>
                              <span
                                className={`font-bold ${
                                  suggestion.winRate > 60
                                    ? "text-emerald-500"
                                    : suggestion.winRate > 40
                                    ? "text-amber-500"
                                    : "text-rose-500"
                                }`}
                              >
                                {suggestion.winRate}%
                              </span>
                            </div>
                            <div className="text-xs">
                              <span
                                className={
                                  isDarkMode
                                    ? "text-gray-400"
                                    : "text-gray-600"
                                }
                              >
                                Confidence:{" "}
                              </span>
                              <span className="font-bold">
                                {suggestion.confidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p>No AI suggestions recorded yet</p>
                      <p className="text-sm mt-1">
                        AI will display suggestions as soon as strong signals
                        appear.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STRATEGY TESTER TAB */}
          </div>
        </div>
      )}
    </div>
  );
}
