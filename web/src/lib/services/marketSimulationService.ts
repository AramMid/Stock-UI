import { Order } from "../order-management";
import { WebSocketService } from "./webSocketService";
import { OrderStatus } from "./orderService";
import { CandlestickWithVolume } from "../types";
import { Time } from "lightweight-charts";
import { getExchangeBySymbol, getFluctuationLimit } from "../position-sizing";
import { BlackSwanService } from "./blackSwanService";

export interface MarketMakerBot {
  id: string;
  type: "marketMaker";
  symbol: string;
  isActive: boolean;
  inventory: number;
  targetInventory: number;
  maxPositionSize: number;
  pnlThreshold: number;
}

export interface TrendFollowerBot {
  id: string;
  type: "trendFollower";
  symbol: string;
  isActive: boolean;
  trendDirection: "up" | "down" | "neutral";
  trendStrength: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  trendEndTime: number;
}

export interface NoiseTraderBot {
  id: string;
  type: "noiseTrader";
  symbol: string;
  isActive: boolean;
  nextActionTime: number;
  sentiment: "bullish" | "bearish" | "neutral";
  volatilityMultiplier: number;
}

export interface StatisticalArbBot {
  id: string;
  type: "statArb";
  symbol: string;
  isActive: boolean;
  pairSymbol?: string;
  meanPrice: number;
  stdDev: number;
  zScoreThreshold: number;
  position: number;
}

export interface StabilizerBot {
  id: string;
  type: "stabilizer";
  symbol: string;
  isActive: boolean;
  minBidAskLevels: number;
  maxSpreadMultiplier: number;
  gapFillThreshold: number;
}

export type Bot =
  | MarketMakerBot
  | TrendFollowerBot
  | NoiseTraderBot
  | StatisticalArbBot
  | StabilizerBot;

export interface MarketDepthLevel {
  price: number;
  quantity: number;
  type: "bid" | "ask" | "marketMaker" | "trend" | "noise" | "stabilizer";
  botId?: string;
  expiry?: number;
  createdTime?: number;
}

export interface SimulatedMarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  bidDepth: MarketDepthLevel[];
  askDepth: MarketDepthLevel[];
  trend: "up" | "down" | "neutral";
  volatility: number;
  vwap?: number;
  rsi?: number;
  volumeProfile: Map<number, number>;
}

export interface BotOrder {
  id: string;
  botId: string;
  symbol: string;
  type: "buy" | "sell";
  orderType: "Market" | "Limit";
  quantity: number;
  price: number;
  timestamp: number;
  status: "pending" | "filled" | "cancelled" | "NEW" | "PARTIALLY_FILLED";
  decisionTime?: number;
  expiryTime?: number;
  probability?: number;
}

export interface BotPosition {
  botId: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  realizedPnL: number;
  unrealizedPnL: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
}

export interface MarketMetrics {
  bidAskSpread: number;
  orderImbalance: number;
  marketDepth: number;
  priceMomentum: number;
}

export interface TradeRecord {
  timestamp: number;
  price: number;
  quantity: number;
  buyerBotId?: string;
  sellerBotId?: string;
  userId?: string;
  symbol: string;
}

interface MarketStats {
  totalBots: number;
  activeBots: number;
  totalTrades: number;
  recentTrades: number;
  activeTrends: number;
  marketData: Record<
    string,
    {
      price: number;
      volume: number;
      trend: "up" | "down" | "neutral";
      rsi?: number;
      vwap?: number;
      activeTrends: number;
      bidCount: number;
      askCount: number;
      totalBidVolume: number;
      totalAskVolume: number;
    }
  >;
}

interface ActiveTrend {
  id: string;
  symbol: string;
  direction: "up" | "down";
  strength: number;
  startTime: number;
  endTime: number;
  volumeMultiplier: number;
  participatingBots: string[];
  priceTarget: number;
  currentProgress: number;
  priceStart: number;
}

interface MomentumWave {
  symbol: string;
  direction: "up" | "down";
  strength: number;
  startTime: number;
  endTime: number;
  volumeImpact: number;
}

interface LiquidityCluster {
  symbol: string;
  price: number;
  quantity: number;
  type: "bid" | "ask";
  expiry: number;
}

interface BreakoutLevel {
  symbol: string;
  price: number;
  direction: "breakout" | "breakdown";
  timestamp: number;
  strength: number;
}

// Helper function to calculate volatility (simplified)
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0.01;

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
  }

  const avgChange =
    changes.reduce((sum, change) => sum + change, 0) / changes.length;
  return avgChange;
}

const PARAMS = {
  MARKET_MAKER_COUNT: 15,
  TREND_FOLLOWER_COUNT: 8,
  NOISE_TRADER_COUNT: 8,
  STAT_ARB_COUNT: 3,
  STABILIZER_COUNT: 2,

  MARKET_MAKER_BASE_SPREAD: 50,
  MARKET_MAKER_QUANTITY_RANGE: [100, 500] as [number, number],
  MARKET_MAKER_INVENTORY_RANGE: [-2000, 2000] as [number, number],
  MARKET_MAKER_PNL_THRESHOLD: 50000,

  TREND_GENERATION_PROBABILITY: 0.4,
  MIN_TREND_STRENGTH: 0.5,
  MAX_TREND_STRENGTH: 0.9,
  TREND_VOLUME_MULTIPLIER: 5,
  TREND_SPREAD_COMPRESSION: 0.5,
  TREND_DURATION_MIN: 120,
  TREND_DURATION_MAX: 300,

  TREND_DURATION_MIN_BOT: 5 * 60 * 1000,
  TREND_DURATION_MAX_BOT: 30 * 60 * 1000,
  TREND_IMPACT: 0.008,
  TREND_FOLLOWER_STOP_LOSS: 0.025, // Increased from 0.015 to be less aggressive
  TREND_FOLLOWER_TAKE_PROFIT: 0.025,

  MOMENTUM_WAVE_PROBABILITY: 0.35,
  MOMENTUM_WAVE_DURATION: [30, 90] as [number, number],
  MOMENTUM_WAVE_IMPACT: 0.015,

  LIQUIDITY_CLUSTER_PROBABILITY: 0.25,
  LIQUIDITY_CLUSTER_SIZE_MULTIPLIER: [5, 15] as [number, number],
  LIQUIDITY_CLUSTER_DURATION: 45,

  BREAKOUT_PROBABILITY: 0.2,
  BREAKOUT_THRESHOLD: 0.012,

  NOISE_ACTION_INTERVAL_MIN: 10,
  NOISE_ACTION_INTERVAL_MAX: 30,
  NOISE_LARGE_ORDER_MULTIPLIER: [8, 25] as [number, number],
  NOISE_VOLATILITY_IMPACT: 0.002,

  STAT_ARB_Z_THRESHOLD: 2.0,
  STAT_ARB_MEAN_REVERSION_SPEED: 0.1,

  BASE_PRICE_VOLATILITY: 0.003,
  BASE_VOLUME: 2000,
  PRICE_UPDATE_INTERVAL: 60000,
  VOLATILITY_WINDOW: 20,
  VOLUME_PROFILE_SIZE: 50,

  LIQUIDITY_PROBABILITY: 0.7,
  MARKET_IMPACT_MULTIPLIER: 0.0001,
  ORDER_FILL_PROBABILITY: 0.9,
  MINIMUM_SPREAD: 5,

  MAX_POSITION_SIZE: 20000,
  DAILY_LOSS_LIMIT: 1000000,
  MAX_DRAWDOWN: 0.1,

  // Giải pháp mới cho order book ổn định
  MIN_BID_ASK_LEVELS: 5,
  MAX_SPREAD_MULTIPLIER: 3,
  GAP_FILL_THRESHOLD: 0.02, // 2% gap
  ORDER_REFRESH_THRESHOLD: 0.7, // Refresh orders khi còn 70% thời gian
  STAGGERED_EXPIRY_RANGE: [15000, 45000] as [number, number], // 15-45 giây khác nhau
  STABILIZER_ACTION_INTERVAL: 5000, // Stabilizer kiểm tra mỗi 5 giây
  ORDER_BOOK_STABILITY_CHECK_INTERVAL: 3000, // Kiểm tra độ ổn định mỗi 3 giây
} as const;

const SYMBOLS = {
  "VIC.VN": { price: 0, lotSize: 100, tickSize: 100 }, // No static initial price
  "VHM.VN": { price: 0, lotSize: 100, tickSize: 100 },
  "VCB.VN": { price: 0, lotSize: 100, tickSize: 100 },
  "TCB.VN": { price: 0, lotSize: 100, tickSize: 50 },
  "FPT.VN": { price: 0, lotSize: 100, tickSize: 500 },
  "VNM.VN": { price: 0, lotSize: 100, tickSize: 100 },
  "HPG.VN": { price: 0, lotSize: 100, tickSize: 50 },
  "MSN.VN": { price: 0, lotSize: 100, tickSize: 100 },
};

// ===== Tick/Price helpers =====
const isVnSymbol = (symbol: string) => symbol.includes(".VN");

const getTickSize = (symbol: string): number => {
  const cfg = (SYMBOLS as Record<string, { tickSize: number }>)[symbol];
  if (cfg && Number.isFinite(cfg.tickSize) && cfg.tickSize > 0)
    return cfg.tickSize;
  return isVnSymbol(symbol) ? 100 : 0.01;
};

const roundToTick = (symbol: string, price: number): number => {
  const tick = getTickSize(symbol);
  if (!Number.isFinite(price)) return 0;
  if (tick <= 0) return price;
  const rounded = Math.round(price / tick) * tick;
  // VN: integer ticks; Non-VN: keep 2 decimals by default
  return isVnSymbol(symbol)
    ? Math.max(0, Math.round(rounded))
    : Number(rounded.toFixed(2));
};

const getFallbackInitialPrice = (symbol: string): number => {
  // Choose a reasonable initial band, then round to tick
  if (isVnSymbol(symbol)) {
    const base = 20000 + Math.random() * 80000; // 20k - 100k VND
    return roundToTick(symbol, base);
  }
  return roundToTick(symbol, 100 + Math.random() * 200);
};

export class MarketSimulationService {
  private bots: Bot[] = [];
  private botPositions = new Map<string, BotPosition>();
  private botOrders = new Map<string, BotOrder>();
  private pendingUserOrders = new Map<
    string,
    { order: Order; decisionTime: number }
  >();

  private marketData = new Map<string, SimulatedMarketData>();

  // ✅ Chart anchor prices (provided by UI/chart) to keep simulation aligned with chart display
  private anchorPrices = new Map<
    string,
    { price: number; mode: "hard" | "soft"; updatedAt: number }
  >();

  // ✅ Last valid price (prevents random re-seeding / wild jumps)
  private lastValidPrices = new Map<string, number>();
  private priceHistory = new Map<string, number[]>();
  private volumeHistory = new Map<string, number[]>();
  private simulationInterval: NodeJS.Timeout | null = null;
  private stabilizerInterval: NodeJS.Timeout | null = null;
  private stabilityCheckInterval: NodeJS.Timeout | null = null;
  private updateListeners = new Set<(data: SimulatedMarketData) => void>();
  private isRunning = false;
  private webSocketService: WebSocketService;
  private blackSwanService: BlackSwanService;

  private marketMetrics = new Map<string, MarketMetrics>();
  private correlationMatrix = new Map<string, Map<string, number>>();
  private tradeHistory: TradeRecord[] = [];

  private activeTrends: ActiveTrend[] = [];
  private momentumWaves: MomentumWave[] = [];
  private liquidityClusters: LiquidityCluster[] = [];
  private breakoutLevels: BreakoutLevel[] = [];
  private lastTrendGenerationTime = 0;
  private trendCooldown = 30000;
  private lastStabilityCheckTime = 0;
  private userOrderCount = 0;
  constructor() {
    this.webSocketService = WebSocketService.getInstance();
    this.blackSwanService = BlackSwanService.getInstance();
    this.initializeBots();
    this.initializeMarketData();
    this.calculateCorrelations();
    this.lastTrendGenerationTime = Date.now();
    this.lastStabilityCheckTime = Date.now();

    // Listen for Black Swan events
    this.blackSwanService.addEventListener((event) => {
      this.handleBlackSwanEvent(event);
    });
  }
  /**
   * ✅ Sync chart price into the simulation.
   * - mode="hard": force simulation price to exactly match the anchor (best for keeping OrderBook/Signals aligned with chart).
   * - mode="soft": gently mean-revert simulation price towards the anchor.
   */
  public setAnchorPrice(
    symbol: string,
    price: number,
    mode: "hard" | "soft" = "hard"
  ) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return;

    this.anchorPrices.set(symbol, { price: p, mode, updatedAt: Date.now() });
    this.lastValidPrices.set(symbol, p);

    const md = this.marketData.get(symbol);
    if (md) {
      if (mode === "hard") {
        md.price = p;
        // Keep OHLC coherent (avoid “candle vs price” drift)
        md.open = p;
        md.high = Math.max(md.high || p, p);
        md.low = Math.min(md.low || p, p);
        md.close = p;
      }
    }
  }

  public clearAnchorPrice(symbol: string) {
    this.anchorPrices.delete(symbol);
  }

  private getFreshAnchor(
    symbol: string
  ): { price: number; mode: "hard" | "soft" } | null {
    const anchor = this.anchorPrices.get(symbol);
    if (!anchor) return null;

    const ageMs = Date.now() - anchor.updatedAt;
    // If UI stops updating anchor for too long, ignore it
    if (ageMs > 5 * 60 * 1000) return null;

    const p = Number(anchor.price);
    if (!Number.isFinite(p) || p <= 0) return null;

    return { price: p, mode: anchor.mode };
  }
  private applyAnchorPrice(symbol: string, marketData: SimulatedMarketData) {
    const anchor = this.getFreshAnchor(symbol);
    if (!anchor) return;

    const a = anchor.price;

    if (anchor.mode === "hard") {
      marketData.price = a;
      marketData.close = a;
      marketData.open = marketData.open > 0 ? marketData.open : a;
      marketData.high = Math.max(marketData.high || a, a);
      marketData.low = marketData.low > 0 ? Math.min(marketData.low, a) : a;
      return;
    }

    // soft: mean-revert gently towards anchor
    const cur = Number(marketData.price);
    if (!Number.isFinite(cur) || cur <= 0) {
      marketData.price = a;
      marketData.close = a;
      return;
    }

    const deviation = (cur - a) / a;
    // If deviation too large, snap back (prevents 37k vs 96k situations)
    if (Math.abs(deviation) > 0.15) {
      marketData.price = a;
      marketData.close = a;
      return;
    }

    // Otherwise, blend towards anchor
    marketData.price = cur * 0.9 + a * 0.1;
    marketData.close = marketData.price;
  }

  private initializeBots() {
    const symbols = Object.keys(SYMBOLS);

    // MARKET MAKER BOTS
    for (let i = 0; i < PARAMS.MARKET_MAKER_COUNT; i++) {
      const botId = `mm-${i}`;
      const symbol = symbols[i % symbols.length];
      const targetInventory =
        Math.floor(
          Math.random() *
            (PARAMS.MARKET_MAKER_INVENTORY_RANGE[1] -
              PARAMS.MARKET_MAKER_INVENTORY_RANGE[0])
        ) + PARAMS.MARKET_MAKER_INVENTORY_RANGE[0];

      const initialInventory = Math.floor(Math.random() * 1000) - 500;

      this.bots.push({
        id: botId,
        type: "marketMaker",
        symbol,
        isActive: true,
        inventory: initialInventory,
        targetInventory,
        maxPositionSize: PARAMS.MAX_POSITION_SIZE,
        pnlThreshold: PARAMS.MARKET_MAKER_PNL_THRESHOLD,
      });

      this.initializeBotPosition(botId, symbol, initialInventory);
    }

    // TREND FOLLOWER BOTS
    for (let i = 0; i < PARAMS.TREND_FOLLOWER_COUNT; i++) {
      const botId = `tf-${i}`;
      const symbol = symbols[i % symbols.length];

      this.bots.push({
        id: botId,
        type: "trendFollower",
        symbol,
        isActive: true,
        trendDirection: "neutral",
        trendStrength: 0,
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        positionSize: 0,
        trendEndTime: 0,
      });

      this.initializeBotPosition(botId, symbol, 0);
    }

    // NOISE TRADER BOTS
    for (let i = 0; i < PARAMS.NOISE_TRADER_COUNT; i++) {
      const botId = `nt-${i}`;
      const symbol = symbols[i % symbols.length];
      const sentiments: Array<"bullish" | "bearish" | "neutral"> = [
        "bullish",
        "bearish",
        "neutral",
      ];

      this.bots.push({
        id: botId,
        type: "noiseTrader",
        symbol,
        isActive: true,
        nextActionTime: Date.now() + this.getRandomInterval(),
        sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
        volatilityMultiplier: 0.5 + Math.random() * 1.5,
      });

      this.initializeBotPosition(botId, symbol, 0);
    }

    // STATISTICAL ARBITRAGE BOTS
    for (let i = 0; i < PARAMS.STAT_ARB_COUNT; i++) {
      const botId = `sa-${i}`;
      const symbol = symbols[i % symbols.length];
      const pairSymbol = symbols[(i + 1) % symbols.length];

      this.bots.push({
        id: botId,
        type: "statArb",
        symbol,
        isActive: true,
        pairSymbol,
        meanPrice: SYMBOLS[symbol as keyof typeof SYMBOLS].price,
        stdDev: SYMBOLS[symbol as keyof typeof SYMBOLS].price * 0.05,
        zScoreThreshold: PARAMS.STAT_ARB_Z_THRESHOLD,
        position: 0,
      });

      this.initializeBotPosition(botId, symbol, 0);
    }

    // STABILIZER BOTS (GIẢI PHÁP MỚI)
    for (let i = 0; i < PARAMS.STABILIZER_COUNT; i++) {
      const botId = `st-${i}`;
      const symbol = symbols[i % symbols.length];

      this.bots.push({
        id: botId,
        type: "stabilizer",
        symbol,
        isActive: true,
        minBidAskLevels: PARAMS.MIN_BID_ASK_LEVELS,
        maxSpreadMultiplier: PARAMS.MAX_SPREAD_MULTIPLIER,
        gapFillThreshold: PARAMS.GAP_FILL_THRESHOLD,
      });

      this.initializeBotPosition(botId, symbol, 0);
    }
  }

  private initializeBotPosition(
    botId: string,
    symbol: string,
    initialQuantity: number = 0
  ) {
    const initialPrice = SYMBOLS[symbol as keyof typeof SYMBOLS].price;
    this.botPositions.set(botId, {
      botId,
      symbol,
      quantity: initialQuantity,
      avgPrice: initialQuantity > 0 ? initialPrice : 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      profitableTrades: 0,
    });
  }

  private initializeMarketData() {
    Object.entries(SYMBOLS).forEach(([symbol, data]) => {
      const initialPrice =
        Number.isFinite(data.price) && data.price > 0
          ? roundToTick(symbol, data.price)
          : getFallbackInitialPrice(symbol);
      const marketData: SimulatedMarketData = {
        symbol,
        price: initialPrice,
        volume: PARAMS.BASE_VOLUME,
        timestamp: Date.now(),
        bidDepth: [],
        askDepth: [],
        trend: "neutral",
        volatility: PARAMS.BASE_PRICE_VOLATILITY,
        volumeProfile: new Map(),
      };
      this.marketData.set(symbol, marketData);
      this.priceHistory.set(symbol, [initialPrice]);
      this.volumeHistory.set(symbol, [PARAMS.BASE_VOLUME]);

      for (let i = 0; i < PARAMS.VOLUME_PROFILE_SIZE; i++) {
        const priceLevel =
          initialPrice * (1 + (i - PARAMS.VOLUME_PROFILE_SIZE / 2) * 0.001);
        marketData.volumeProfile.set(roundToTick(symbol, priceLevel), 0);
      }

      this.updateMarketDepth(marketData, PARAMS.BASE_PRICE_VOLATILITY);
    });
  }

  private calculateCorrelations() {
    const symbols = Object.keys(SYMBOLS);
    symbols.forEach((symbol1) => {
      const row = new Map<string, number>();
      symbols.forEach((symbol2) => {
        const correlation = symbol1 === symbol2 ? 1 : Math.random() * 1.6 - 0.7;
        row.set(symbol2, correlation);
      });
      this.correlationMatrix.set(symbol1, row);
    });
  }

  public subscribe(listener: (data: SimulatedMarketData) => void) {
    this.updateListeners.add(listener);
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  public startSimulation(onUpdate?: (data: SimulatedMarketData) => void) {
    // Allow multiple listeners. Calling startSimulation again will just attach a new listener.
    const unsubscribe = onUpdate ? this.subscribe(onUpdate) : () => {};
    if (this.isRunning) return unsubscribe;
    this.isRunning = true;

    // Main simulation interval (order book + price update).
    this.simulationInterval = setInterval(
      () => this.updateMarket(),
      PARAMS.PRICE_UPDATE_INTERVAL
    );

    // Stabilizer interval để giữ order book ổn định
    this.stabilizerInterval = setInterval(
      () => this.runStabilizers(),
      PARAMS.STABILIZER_ACTION_INTERVAL
    );

    // Stability check interval
    this.stabilityCheckInterval = setInterval(
      this.performStabilityCheck.bind(this),
      PARAMS.ORDER_BOOK_STABILITY_CHECK_INTERVAL
    );
    return unsubscribe;
  }

  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.stabilizerInterval) {
      clearInterval(this.stabilizerInterval);
      this.stabilizerInterval = null;
    }
    if (this.stabilityCheckInterval) {
      clearInterval(this.stabilityCheckInterval);
      this.stabilityCheckInterval = null;
    }
    this.isRunning = false;
    // Market simulation stopped
  }

  private updateMarket() {
    const now = Date.now();

    if (now - this.lastTrendGenerationTime > this.trendCooldown) {
      this.generateStrongTrendsAndPatterns();
      this.lastTrendGenerationTime = now;
    }

    this.updateActiveTrends();

    this.marketData.forEach((marketData, symbol) => {
      const dynamicVolatility = this.calculateDynamicVolatility(symbol);
      marketData.volatility = dynamicVolatility;
      // ✅ Apply chart anchor BEFORE bots place orders (keeps OrderBook/Signals aligned with chart)
      this.applyAnchorPrice(symbol, marketData);

      const freshAnchor = this.getFreshAnchor(symbol);
      const isHardAnchored = freshAnchor?.mode === "hard";

      // ✅ Safety: never random re-seed unless we have absolutely no reference
      if (!Number.isFinite(marketData.price) || marketData.price <= 0) {
        const last = this.lastValidPrices.get(symbol);
        const anchor = this.anchorPrices.get(symbol)?.price;

        const fallback =
          Number.isFinite(anchor as any) && (anchor as any) > 0
            ? (anchor as number)
            : Number.isFinite(last as any) && (last as any) > 0
            ? (last as number)
            : getFallbackInitialPrice(symbol);

        marketData.price = fallback;
        marketData.close = fallback;
      } else {
        this.lastValidPrices.set(symbol, marketData.price);
      }
      if (!isHardAnchored) this.applyTrendEffects(marketData);

      const symbolBots = this.bots.filter((bot) => bot.symbol === symbol);

      // GIẢI PHÁP 1: Refresh thay vì recreate
      this.refreshExistingOrders(marketData);

      this.processMarketMakers(
        marketData,
        dynamicVolatility,
        symbolBots.filter((b) => b.type === "marketMaker") as MarketMakerBot[]
      );

      this.processTrendFollowers(
        marketData,
        symbolBots.filter(
          (b) => b.type === "trendFollower"
        ) as TrendFollowerBot[]
      );

      this.processNoiseTraders(
        marketData,
        dynamicVolatility,
        symbolBots.filter((b) => b.type === "noiseTrader") as NoiseTraderBot[]
      );

      this.processStatisticalArb(
        marketData,
        symbolBots.filter((b) => b.type === "statArb") as StatisticalArbBot[]
      );

      this.processBotToBotTrading(marketData);

      if (!isHardAnchored) this.updatePriceWithTrends(marketData, symbol);
      // Ensure hard-anchored price is never drifted by other steps
      if (isHardAnchored && freshAnchor) {
        marketData.price = freshAnchor.price;
        marketData.close = freshAnchor.price;
      }

      this.updateTechnicalIndicators(marketData, symbol);

      this.processPendingUserOrders(marketData);

      // GIẢI PHÁP 2: Update market depth với minimum levels guarantee
      this.updateMarketDepthWithStability(marketData, dynamicVolatility);

      this.updateMarketMetrics(marketData);

      // Debug logging
      // console.log('Market data updated for', symbol, {
      //   price: marketData.price,
      //   bidDepth: marketData.bidDepth.length,
      //   askDepth: marketData.askDepth.length,
      //   bestBid: marketData.bidDepth.length > 0 ? Math.max(...marketData.bidDepth.map(l => l.price)) : 'N/A',
      //   bestAsk: marketData.askDepth.length > 0 ? Math.min(...marketData.askDepth.map(l => l.price)) : 'N/A'
      // });

      this.tradeHistory = this.tradeHistory.filter(
        (t) => Date.now() - t.timestamp < 60000
      );

      if (this.updateListeners.size > 0) {
        const snapshot = { ...marketData };
        this.updateListeners.forEach((cb) => {
          try {
            cb(snapshot);
          } catch (err) {
            // Never let a consumer crash the simulation loop
            console.error(
              "[MarketSimulationService] update listener error",
              err
            );
          }
        });
      }
    });
  }

  // GIẢI PHÁP 1: Refresh existing orders thay vì xóa hết
  private refreshExistingOrders(marketData: SimulatedMarketData) {
    const now = Date.now();
    const symbol = marketData.symbol;

    // Refresh bid orders
    marketData.bidDepth = marketData.bidDepth
      .map((level) => {
        if (level.expiry && level.type === "marketMaker") {
          const timeRemaining = level.expiry - now;
          const totalTime =
            level.expiry - (level.createdTime || level.expiry - 30000);

          // Nếu còn 70% thời gian, giữ nguyên, nếu không refresh
          if (timeRemaining / totalTime > PARAMS.ORDER_REFRESH_THRESHOLD) {
            return level;
          } else {
            // Refresh order bằng cách kéo dài expiry
            const newExpiry = now + this.getStaggeredExpiryTime();
            return {
              ...level,
              expiry: newExpiry,
              createdTime: level.createdTime || now,
            };
          }
        }
        return level;
      })
      .filter((level) => !level.expiry || level.expiry > now);

    // Refresh ask orders
    marketData.askDepth = marketData.askDepth
      .map((level) => {
        if (level.expiry && level.type === "marketMaker") {
          const timeRemaining = level.expiry - now;
          const totalTime =
            level.expiry - (level.createdTime || level.expiry - 30000);

          if (timeRemaining / totalTime > PARAMS.ORDER_REFRESH_THRESHOLD) {
            return level;
          } else {
            const newExpiry = now + this.getStaggeredExpiryTime();
            return {
              ...level,
              expiry: newExpiry,
              createdTime: level.createdTime || now,
            };
          }
        }
        return level;
      })
      .filter((level) => !level.expiry || level.expiry > now);
  }

  // GIẢI PHÁP 3: Minimum levels guarantee
  private ensureMinimumLevels(marketData: SimulatedMarketData) {
    const now = Date.now();
    const symbol = marketData.symbol;
    const currentPrice = marketData.price;

    // Use PARAMS but make the order book more flexible by adjusting based on current price
    const spread = PARAMS.MARKET_MAKER_BASE_SPREAD;
    const minLevels = PARAMS.MIN_BID_ASK_LEVELS;
    const quantityRange = [...PARAMS.MARKET_MAKER_QUANTITY_RANGE] as [
      number,
      number
    ];

    // Đảm bảo ít nhất MIN_BID_ASK_LEVELS levels mỗi side
    if (marketData.bidDepth.length < minLevels) {
      const levelsToAdd = minLevels - marketData.bidDepth.length;
      for (let i = 0; i < levelsToAdd; i++) {
        // Make the price step more dynamic based on current price
        const dynamicSpread = symbol.includes(".VN")
          ? Math.max(100, Math.round(currentPrice * 0.001))
          : Math.max(0.01, currentPrice * 0.001);
        const priceStep = dynamicSpread * (i + 1);

        // Round price based on symbol type
        const bidPrice = roundToTick(symbol, currentPrice - priceStep);

        // Make quantity more dynamic based on current price
        const dynamicMinQty = symbol.includes(".VN")
          ? Math.max(100, Math.round(currentPrice * 0.0001))
          : Math.max(1, Math.round(currentPrice * 0.1));
        const dynamicMaxQty = symbol.includes(".VN")
          ? Math.max(1000, Math.round(currentPrice * 0.001))
          : Math.max(10, Math.round(currentPrice * 1));
        const quantity = Math.floor(
          dynamicMinQty + Math.random() * (dynamicMaxQty - dynamicMinQty)
        );

        marketData.bidDepth.push({
          price: bidPrice,
          quantity,
          type: "stabilizer",
          expiry: now + this.getStaggeredExpiryTime(),
          createdTime: now,
        });
      }
    }

    if (marketData.askDepth.length < minLevels) {
      const levelsToAdd = minLevels - marketData.askDepth.length;
      for (let i = 0; i < levelsToAdd; i++) {
        // Make the price step more dynamic based on current price
        const dynamicSpread = symbol.includes(".VN")
          ? Math.max(100, Math.round(currentPrice * 0.001))
          : Math.max(0.01, currentPrice * 0.001);
        const priceStep = dynamicSpread * (i + 1);

        // Round price based on symbol type
        const askPrice = roundToTick(symbol, currentPrice + priceStep);

        // Make quantity more dynamic based on current price
        const dynamicMinQty = symbol.includes(".VN")
          ? Math.max(100, Math.round(currentPrice * 0.0001))
          : Math.max(1, Math.round(currentPrice * 0.1));
        const dynamicMaxQty = symbol.includes(".VN")
          ? Math.max(1000, Math.round(currentPrice * 0.001))
          : Math.max(10, Math.round(currentPrice * 1));
        const quantity = Math.floor(
          dynamicMinQty + Math.random() * (dynamicMaxQty - dynamicMinQty)
        );

        marketData.askDepth.push({
          price: askPrice,
          quantity,
          type: "stabilizer",
          expiry: now + this.getStaggeredExpiryTime(),
          createdTime: now,
        });
      }
    }
  }

  // GIẢI PHÁP 4: Gap filling
  private fillPriceGaps(marketData: SimulatedMarketData) {
    const now = Date.now();
    const symbol = marketData.symbol;

    // Sort depths
    marketData.bidDepth.sort((a, b) => b.price - a.price);
    marketData.askDepth.sort((a, b) => a.price - b.price);

    // Kiểm tra gap ở bid side
    if (marketData.bidDepth.length > 1) {
      for (let i = 0; i < marketData.bidDepth.length - 1; i++) {
        const currentLevel = marketData.bidDepth[i];
        const nextLevel = marketData.bidDepth[i + 1];
        const priceGap = currentLevel.price - nextLevel.price;
        const avgPrice = (currentLevel.price + nextLevel.price) / 2;
        const gapPercentage = priceGap / avgPrice;

        if (gapPercentage > PARAMS.GAP_FILL_THRESHOLD) {
          // Tạo order để lấp khoảng trống
          const fillPrice = (currentLevel.price + nextLevel.price) / 2;
          const fillQuantity = Math.floor(
            (currentLevel.quantity + nextLevel.quantity) / 2
          );

          marketData.bidDepth.splice(i + 1, 0, {
            price: roundToTick(symbol, fillPrice),
            quantity: fillQuantity,
            type: "stabilizer",
            expiry: now + this.getStaggeredExpiryTime(),
            createdTime: now,
          });

          break; // Chỉ fill một gap mỗi lần
        }
      }
    }

    // Kiểm tra gap ở ask side
    if (marketData.askDepth.length > 1) {
      for (let i = 0; i < marketData.askDepth.length - 1; i++) {
        const currentLevel = marketData.askDepth[i];
        const nextLevel = marketData.askDepth[i + 1];
        const priceGap = nextLevel.price - currentLevel.price;
        const avgPrice = (currentLevel.price + nextLevel.price) / 2;
        const gapPercentage = priceGap / avgPrice;

        if (gapPercentage > PARAMS.GAP_FILL_THRESHOLD) {
          // Tạo order để lấp khoảng trống
          const fillPrice = (currentLevel.price + nextLevel.price) / 2;
          const fillQuantity = Math.floor(
            (currentLevel.quantity + nextLevel.quantity) / 2
          );

          marketData.askDepth.splice(i + 1, 0, {
            price: roundToTick(symbol, fillPrice),
            quantity: fillQuantity,
            type: "stabilizer",
            expiry: now + this.getStaggeredExpiryTime(),
            createdTime: now,
          });

          break; // Chỉ fill một gap mỗi lần
        }
      }
    }
  }

  // GIẢI PHÁP 5: Stabilizer bot actions
  private runStabilizers() {
    const now = Date.now();
    const stabilizerBots = this.bots.filter(
      (bot) => bot.type === "stabilizer" && bot.isActive
    ) as StabilizerBot[];

    stabilizerBots.forEach((bot) => {
      const marketData = this.marketData.get(bot.symbol);
      if (!marketData) return;

      // Kiểm tra spread
      const spread = this.calculateBidAskSpread(marketData);
      const currentPrice = marketData.price;
      const maxAllowedSpread =
        PARAMS.MARKET_MAKER_BASE_SPREAD * bot.maxSpreadMultiplier;

      if (spread > maxAllowedSpread) {
        // Spread quá rộng, thêm liquidity
        this.addStabilizerLiquidity(bot, marketData, spread, maxAllowedSpread);
      }

      // Kiểm tra số lượng levels
      if (
        marketData.bidDepth.length < bot.minBidAskLevels ||
        marketData.askDepth.length < bot.minBidAskLevels
      ) {
        this.ensureMinimumLevels(marketData);
      }

      // Kiểm tra và fill gaps
      this.fillPriceGaps(marketData);
    });
  }

  private addStabilizerLiquidity(
    bot: StabilizerBot,
    marketData: SimulatedMarketData,
    currentSpread: number,
    maxSpread: number
  ) {
    const now = Date.now();
    const currentPrice = marketData.price;
    const targetSpread = maxSpread * 0.7; // Nhắm đến 70% của max spread

    // Thêm bid order
    const symbol = bot.symbol;
    const bidPrice = roundToTick(symbol, currentPrice - targetSpread / 2);
    const bidQuantity = Math.floor(PARAMS.MARKET_MAKER_QUANTITY_RANGE[1] * 1.5);

    marketData.bidDepth.push({
      price: bidPrice,
      quantity: bidQuantity,
      type: "stabilizer",
      botId: bot.id,
      expiry: now + this.getStaggeredExpiryTime(),
      createdTime: now,
    });

    // Thêm ask order
    const askPrice = roundToTick(symbol, currentPrice + targetSpread / 2);
    const askQuantity = Math.floor(PARAMS.MARKET_MAKER_QUANTITY_RANGE[1] * 1.5);

    marketData.askDepth.push({
      price: askPrice,
      quantity: askQuantity,
      type: "stabilizer",
      botId: bot.id,
      expiry: now + this.getStaggeredExpiryTime(),
      createdTime: now,
    });

    // STABILIZER: Bot added liquidity to market data
  }

  // Wrapper used by stabilityCheckInterval
  private performStabilityCheck() {
    this.checkOrderBookStability();
  }

  private checkOrderBookStability() {
    const now = Date.now();
    if (
      now - this.lastStabilityCheckTime <
      PARAMS.ORDER_BOOK_STABILITY_CHECK_INTERVAL
    )
      return;

    this.lastStabilityCheckTime = now;

    this.marketData.forEach((marketData, symbol) => {
      const bidCount = marketData.bidDepth.length;
      const askCount = marketData.askDepth.length;
      const spread = this.calculateBidAskSpread(marketData);
      const maxSpread =
        PARAMS.MARKET_MAKER_BASE_SPREAD * PARAMS.MAX_SPREAD_MULTIPLIER;

      // Log stability metrics
      if (
        bidCount < PARAMS.MIN_BID_ASK_LEVELS ||
        askCount < PARAMS.MIN_BID_ASK_LEVELS ||
        spread > maxSpread
      ) {
        // STABILITY: Market data status
      }
    });
  }

  private getStaggeredExpiryTime(): number {
    // GIẢI PHÁP: Stagger expiry times - mỗi order có expiry time khác nhau
    return (
      Math.floor(
        Math.random() *
          (PARAMS.STAGGERED_EXPIRY_RANGE[1] - PARAMS.STAGGERED_EXPIRY_RANGE[0])
      ) + PARAMS.STAGGERED_EXPIRY_RANGE[0]
    );
  }

  // Cập nhật processMarketMakers để sử dụng staggered expiry
  private processMarketMakers(
    marketData: SimulatedMarketData,
    dynamicVolatility: number,
    marketMakers: MarketMakerBot[]
  ) {
    const now = Date.now();
    const symbol = marketData.symbol;

    // Filter logic ít aggressive hơn
    marketData.bidDepth = marketData.bidDepth.filter(
      (level) =>
        level.type !== "marketMaker" ||
        (level.expiry && level.expiry - now > 5000) // Chỉ xóa nếu còn dưới 5 giây
    );

    marketData.askDepth = marketData.askDepth.filter(
      (level) =>
        level.type !== "marketMaker" ||
        (level.expiry && level.expiry - now > 5000)
    );

    const symbolTrends = this.activeTrends.filter(
      (t) => t.symbol === marketData.symbol && t.endTime > now
    );
    const hasStrongTrend = symbolTrends.length > 0;

    let volatilityMultiplier =
      1 + dynamicVolatility / PARAMS.BASE_PRICE_VOLATILITY;
    let baseSpread = Math.max(
      PARAMS.MINIMUM_SPREAD,
      PARAMS.MARKET_MAKER_BASE_SPREAD * volatilityMultiplier
    );

    if (hasStrongTrend) {
      const trend = symbolTrends[0];
      baseSpread *= 1 - trend.strength * PARAMS.TREND_SPREAD_COMPRESSION;
      volatilityMultiplier *= 1 + trend.strength * 0.5;
    }

    marketMakers.forEach((bot, index) => {
      const position = this.botPositions.get(bot.id);
      if (!position) return;

      const marketMakerBot = this.bots.find(
        (b) => b.id === bot.id && b.type === "marketMaker"
      ) as MarketMakerBot;
      if (marketMakerBot) {
        marketMakerBot.inventory = position.quantity;
      }

      const inventorySkew =
        (position.quantity - bot.targetInventory) / bot.maxPositionSize;

      // Chỉ tạo order nếu không có đủ orders hiện tại
      const existingBidOrders = marketData.bidDepth.filter(
        (l) => l.botId === bot.id
      ).length;
      const existingAskOrders = marketData.askDepth.filter(
        (l) => l.botId === bot.id
      ).length;

      if (existingBidOrders < 2 && Math.random() < 0.6) {
        const inventoryAdjustment = inventorySkew * (50 + index * 25);
        const levelSpread = baseSpread * (1 + index * 0.3);

        const buyPrice =
          Math.round(
            Math.max(
              1000,
              marketData.price - levelSpread / 2 - inventoryAdjustment
            ) / 100
          ) * 100;

        const baseQuantity =
          Math.floor(
            Math.random() *
              (PARAMS.MARKET_MAKER_QUANTITY_RANGE[1] -
                PARAMS.MARKET_MAKER_QUANTITY_RANGE[0])
          ) + PARAMS.MARKET_MAKER_QUANTITY_RANGE[0];

        let quantityMultiplier = 1 - index * 0.3;
        if (hasStrongTrend) {
          quantityMultiplier *= symbolTrends[0].volumeMultiplier;
        }

        const quantity = Math.max(
          10,
          Math.floor(baseQuantity * quantityMultiplier)
        );
        const bidExpiry = now + this.getStaggeredExpiryTime();

        marketData.bidDepth.push({
          price: buyPrice,
          quantity,
          type: "marketMaker",
          botId: bot.id,
          expiry: bidExpiry,
          createdTime: now,
        });

        this.createBotOrder(
          bot.id,
          marketData.symbol,
          "buy",
          "Limit",
          quantity,
          buyPrice,
          0.8,
          bidExpiry
        );
      }

      if (existingAskOrders < 2 && Math.random() < 0.6) {
        const inventoryAdjustment = inventorySkew * (50 + index * 25);
        const levelSpread = baseSpread * (1 + index * 0.3);

        const sellPrice =
          Math.round(
            (marketData.price + levelSpread / 2 - inventoryAdjustment) / 100
          ) * 100;

        const baseQuantity =
          Math.floor(
            Math.random() *
              (PARAMS.MARKET_MAKER_QUANTITY_RANGE[1] -
                PARAMS.MARKET_MAKER_QUANTITY_RANGE[0])
          ) + PARAMS.MARKET_MAKER_QUANTITY_RANGE[0];

        let quantityMultiplier = 1 - index * 0.3;
        if (hasStrongTrend) {
          quantityMultiplier *= symbolTrends[0].volumeMultiplier;
        }

        const quantity = Math.max(
          10,
          Math.floor(baseQuantity * quantityMultiplier)
        );
        const askExpiry = now + this.getStaggeredExpiryTime();

        marketData.askDepth.push({
          price: sellPrice,
          quantity,
          type: "marketMaker",
          botId: bot.id,
          expiry: askExpiry,
          createdTime: now,
        });

        this.createBotOrder(
          bot.id,
          marketData.symbol,
          "sell",
          "Limit",
          quantity,
          sellPrice,
          0.8,
          askExpiry
        );
      }
    });
  }

  // Cập nhật updateMarketDepth để đảm bảo stability
  private updateMarketDepthWithStability(
    marketData: SimulatedMarketData,
    dynamicVolatility: number
  ) {
    const now = Date.now();

    // Sắp xếp
    marketData.bidDepth.sort((a, b) => b.price - a.price);
    marketData.askDepth.sort((a, b) => a.price - b.price);

    // Filter ít aggressive hơn
    marketData.bidDepth = marketData.bidDepth.filter(
      (level) => !level.expiry || level.expiry - now > 2000 // Chỉ xóa nếu còn dưới 2 giây
    );

    marketData.askDepth = marketData.askDepth.filter(
      (level) => !level.expiry || level.expiry - now > 2000
    );

    // Đảm bảo minimum levels
    this.ensureMinimumLevels(marketData);

    // Giới hạn số lượng levels
    if (marketData.bidDepth.length > 25) marketData.bidDepth.length = 25;
    if (marketData.askDepth.length > 25) marketData.askDepth.length = 25;

    this.updateVolumeProfile(marketData);
  }

  // ... (các method khác giữ nguyên từ original code) ...

  private generateStrongTrendsAndPatterns() {
    const symbols = Object.keys(SYMBOLS);
    const now = Date.now();

    this.activeTrends = this.activeTrends.filter((t) => t.endTime > now);
    this.momentumWaves = this.momentumWaves.filter((w) => w.endTime > now);
    this.liquidityClusters = this.liquidityClusters.filter(
      (c) => c.expiry > now
    );
    this.breakoutLevels = this.breakoutLevels.filter(
      (b) => now - b.timestamp < 60000
    );

    symbols.forEach((symbol) => {
      const hasActiveTrend = this.activeTrends.some(
        (t) => t.symbol === symbol && t.endTime > now
      );

      if (
        !hasActiveTrend &&
        Math.random() < PARAMS.TREND_GENERATION_PROBABILITY
      ) {
        this.createStrongTrend(symbol);
      }
    });

    if (Math.random() < PARAMS.MOMENTUM_WAVE_PROBABILITY) {
      this.createMomentumWave();
    }

    if (Math.random() < PARAMS.LIQUIDITY_CLUSTER_PROBABILITY) {
      this.createLiquidityClusters();
    }

    if (Math.random() < PARAMS.BREAKOUT_PROBABILITY) {
      this.createBreakoutPattern();
    }
  }

  private createStrongTrend(symbol: string) {
    const direction: "up" | "down" = Math.random() > 0.5 ? "up" : "down";
    const strength =
      PARAMS.MIN_TREND_STRENGTH +
      Math.random() * (PARAMS.MAX_TREND_STRENGTH - PARAMS.MIN_TREND_STRENGTH);

    const duration =
      PARAMS.TREND_DURATION_MIN +
      Math.random() * (PARAMS.TREND_DURATION_MAX - PARAMS.TREND_DURATION_MIN);
    const endTime = Date.now() + duration * 1000;

    const marketData = this.marketData.get(symbol);
    if (!marketData) return;

    const priceTarget =
      direction === "up"
        ? marketData.price * (1 + strength * 0.05)
        : marketData.price * (1 - strength * 0.05);

    const participatingBots = this.bots
      .filter(
        (bot) =>
          bot.symbol === symbol && bot.isActive && bot.type === "trendFollower"
      )
      .slice(0, Math.floor(Math.random() * 4) + 2)
      .map((bot) => bot.id);

    const trend: ActiveTrend = {
      id: `trend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      direction,
      strength,
      startTime: Date.now(),
      endTime,
      volumeMultiplier: PARAMS.TREND_VOLUME_MULTIPLIER,
      participatingBots,
      priceTarget,
      currentProgress: 0,
      priceStart: marketData.price,
    };

    this.activeTrends.push(trend);

    participatingBots.forEach((botId) => {
      const bot = this.bots.find(
        (b) => b.id === botId && b.type === "trendFollower"
      ) as TrendFollowerBot;
      if (bot) {
        bot.trendDirection = direction;
        bot.trendStrength = strength;
        bot.trendEndTime = endTime;

        const positionSize = Math.floor(
          PARAMS.MAX_POSITION_SIZE * 0.2 * strength
        );
        const orderType = direction === "up" ? "buy" : "sell";
        const orderPrice =
          direction === "up"
            ? marketData.price * 0.998
            : marketData.price * 1.002;

        this.createBotOrder(
          botId,
          symbol,
          orderType,
          "Limit",
          positionSize,
          orderPrice,
          0.9,
          endTime
        );

        bot.positionSize = positionSize;
        bot.entryPrice = orderPrice;
        bot.stopLoss =
          direction === "up"
            ? orderPrice * (1 - PARAMS.TREND_FOLLOWER_STOP_LOSS)
            : orderPrice * (1 + PARAMS.TREND_FOLLOWER_STOP_LOSS);
        bot.takeProfit =
          direction === "up"
            ? orderPrice * (1 + PARAMS.TREND_FOLLOWER_TAKE_PROFIT)
            : orderPrice * (1 - PARAMS.TREND_FOLLOWER_TAKE_PROFIT);

        // STRONG_TREND: Created trend for symbol
      }
    });
  }

  private createMomentumWave() {
    const symbols = Object.keys(SYMBOLS);
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const direction: "up" | "down" = Math.random() > 0.5 ? "up" : "down";
    const strength = 0.3 + Math.random() * 0.5;

    const duration =
      PARAMS.MOMENTUM_WAVE_DURATION[0] +
      Math.random() *
        (PARAMS.MOMENTUM_WAVE_DURATION[1] - PARAMS.MOMENTUM_WAVE_DURATION[0]);

    const wave: MomentumWave = {
      symbol,
      direction,
      strength,
      startTime: Date.now(),
      endTime: Date.now() + duration * 1000,
      volumeImpact: 2 + Math.random() * 3,
    };

    this.momentumWaves.push(wave);

    const marketData = this.marketData.get(symbol);
    if (marketData) {
      const orderType = direction === "up" ? "buy" : "sell";
      const price =
        direction === "up"
          ? marketData.price * (1 - 0.001)
          : marketData.price * (1 + 0.001);

      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        const quantity = Math.floor(500 + Math.random() * 1500);

        this.createBotOrder(
          `momentum-${i}`,
          symbol,
          orderType,
          "Market",
          quantity,
          price,
          0.8,
          wave.endTime
        );
      }
    }
  }

  private createLiquidityClusters() {
    const symbols = Object.keys(SYMBOLS);
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    const marketData = this.marketData.get(symbol);
    if (!marketData) return;

    const bidCluster: LiquidityCluster = {
      symbol,
      price: marketData.price * (1 - 0.005),
      quantity: Math.floor(
        PARAMS.MARKET_MAKER_QUANTITY_RANGE[1] *
          PARAMS.LIQUIDITY_CLUSTER_SIZE_MULTIPLIER[0] +
          Math.random() *
            (PARAMS.LIQUIDITY_CLUSTER_SIZE_MULTIPLIER[1] -
              PARAMS.LIQUIDITY_CLUSTER_SIZE_MULTIPLIER[0])
      ),
      type: "bid",
      expiry: Date.now() + PARAMS.LIQUIDITY_CLUSTER_DURATION * 1000,
    };

    const askCluster: LiquidityCluster = {
      symbol,
      price: marketData.price * (1 + 0.005),
      quantity: Math.floor(
        PARAMS.MARKET_MAKER_QUANTITY_RANGE[1] *
          PARAMS.LIQUIDITY_CLUSTER_SIZE_MULTIPLIER[0] +
          Math.random() *
            (PARAMS.LIQUIDITY_CLUSTER_SIZE_MULTIPLIER[1] -
              PARAMS.LIQUIDITY_CLUSTER_SIZE_MULTIPLIER[0])
      ),
      type: "ask",
      expiry: Date.now() + PARAMS.LIQUIDITY_CLUSTER_DURATION * 1000,
    };

    this.liquidityClusters.push(bidCluster, askCluster);
  }

  private createBreakoutPattern() {
    const symbols = Object.keys(SYMBOLS);
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    const marketData = this.marketData.get(symbol);
    if (!marketData) return;

    const direction: "breakout" | "breakdown" =
      Math.random() > 0.5 ? "breakout" : "breakdown";
    const price =
      direction === "breakout"
        ? marketData.price * (1 + PARAMS.BREAKOUT_THRESHOLD)
        : marketData.price * (1 - PARAMS.BREAKOUT_THRESHOLD);

    const breakout: BreakoutLevel = {
      symbol,
      price,
      direction,
      timestamp: Date.now(),
      strength: 0.4 + Math.random() * 0.4,
    };

    this.breakoutLevels.push(breakout);
  }

  private updateActiveTrends() {
    const now = Date.now();

    this.activeTrends.forEach((trend) => {
      if (now > trend.endTime) return;

      const marketData = this.marketData.get(trend.symbol);
      if (!marketData) return;

      const elapsed = now - trend.startTime;
      const total = trend.endTime - trend.startTime;
      trend.currentProgress = Math.min(1, elapsed / total);

      const priceMovement =
        (trend.priceTarget - trend.priceStart) * trend.currentProgress;
      marketData.price = trend.priceStart + priceMovement;

      marketData.volume *= trend.volumeMultiplier;

      marketData.trend = trend.direction;
    });
  }

  private applyTrendEffects(marketData: SimulatedMarketData) {
    const symbol = marketData.symbol;
    const now = Date.now();

    const symbolTrends = this.activeTrends.filter(
      (t) => t.symbol === symbol && t.endTime > now
    );
    if (symbolTrends.length > 0) {
      const mainTrend = symbolTrends[0];
      marketData.trend = mainTrend.direction;
    }

    const symbolWaves = this.momentumWaves.filter(
      (w) => w.symbol === symbol && w.endTime > now
    );
    symbolWaves.forEach((wave) => {
      const progress = (now - wave.startTime) / (wave.endTime - wave.startTime);
      const impact =
        wave.strength * (1 - progress) * PARAMS.MOMENTUM_WAVE_IMPACT;

      if (wave.direction === "up") {
        marketData.price *= 1 + impact;
      } else {
        marketData.price *= 1 - impact;
      }

      marketData.volume *= wave.volumeImpact;
    });

    const symbolClusters = this.liquidityClusters.filter(
      (c) => c.symbol === symbol && c.expiry > now
    );
    symbolClusters.forEach((cluster) => {
      if (cluster.type === "bid") {
        marketData.bidDepth.push({
          price: cluster.price,
          quantity: cluster.quantity,
          type: "marketMaker",
          expiry: cluster.expiry,
        });
      } else {
        marketData.askDepth.push({
          price: cluster.price,
          quantity: cluster.quantity,
          type: "marketMaker",
          expiry: cluster.expiry,
        });
      }
    });
  }

  private updatePriceWithTrends(
    marketData: SimulatedMarketData,
    symbol: string
  ) {
    const symbolBreakouts = this.breakoutLevels.filter(
      (b) => b.symbol === symbol && Date.now() - b.timestamp < 30000
    );

    symbolBreakouts.forEach((breakout) => {
      if (
        breakout.direction === "breakout" &&
        marketData.price >= breakout.price
      ) {
        marketData.price *= 1 + breakout.strength * 0.01;
        marketData.volume *= 2;
      } else if (
        breakout.direction === "breakdown" &&
        marketData.price <= breakout.price
      ) {
        marketData.price *= 1 - breakout.strength * 0.01;
        marketData.volume *= 2;
      }
    });

    // Apply Black Swan event effects
    const blackSwanEvents =
      this.blackSwanService.getActiveEventsForSymbol(symbol);
    blackSwanEvents.forEach((event) => {
      if (event.type === "delist") {
        marketData.price = 0;
      } else if (event.type === "crash") {
        marketData.price *= 1 - event.severity;
      }
    });

    const priceHistory = this.priceHistory.get(symbol) || [];
    priceHistory.push(marketData.price);
    if (priceHistory.length > PARAMS.VOLATILITY_WINDOW * 10) {
      priceHistory.splice(
        0,
        priceHistory.length - PARAMS.VOLATILITY_WINDOW * 10
      );
    }
    this.priceHistory.set(symbol, priceHistory);

    const volumeHistory = this.volumeHistory.get(symbol) || [];
    volumeHistory.push(marketData.volume);
    if (volumeHistory.length > 100) {
      volumeHistory.splice(0, volumeHistory.length - 100);
    }
    this.volumeHistory.set(symbol, volumeHistory);
  }

  private processTrendFollowers(
    marketData: SimulatedMarketData,
    trendFollowers: TrendFollowerBot[]
  ) {
    const now = Date.now();
    const symbol = marketData.symbol;

    const symbolTrends = this.activeTrends.filter(
      (t) => t.symbol === symbol && t.endTime > now
    );
    const hasActiveTrend = symbolTrends.length > 0;

    trendFollowers.forEach((bot) => {
      const position = this.botPositions.get(bot.id);
      if (!position) return;

      if (bot.positionSize > 0) {
        const currentPnL =
          (marketData.price - bot.entryPrice) * bot.positionSize;
        position.unrealizedPnL = currentPnL;

        const drawdown = Math.min(
          0,
          currentPnL / (bot.entryPrice * bot.positionSize)
        );
        position.maxDrawdown = Math.min(position.maxDrawdown, drawdown);

        if (marketData.price <= bot.stopLoss) {
          this.closeTrendPosition(bot, marketData, "stop_loss");
          return;
        }

        if (marketData.price >= bot.takeProfit) {
          this.closeTrendPosition(bot, marketData, "take_profit");
          return;
        }
      }

      if (hasActiveTrend && bot.positionSize === 0) {
        const trend = symbolTrends[0];
        if (
          bot.trendDirection === "neutral" ||
          bot.trendDirection !== trend.direction
        ) {
          this.joinActiveTrend(bot, marketData, trend);
        }
      } else if (bot.positionSize === 0 && Math.random() > 0.9) {
        const trendDetected = this.detectTrend(marketData.symbol);

        if (
          trendDetected.direction !== "neutral" &&
          trendDetected.strength > 0.3
        ) {
          this.createTrendPosition(bot, marketData, trendDetected);
        }
      }

      if (bot.positionSize > 0 && now >= bot.trendEndTime) {
        this.closeTrendPosition(bot, marketData, "trend_expired");
      }
    });
  }

  private joinActiveTrend(
    bot: TrendFollowerBot,
    marketData: SimulatedMarketData,
    trend: ActiveTrend
  ) {
    bot.trendDirection = trend.direction;
    bot.trendStrength = trend.strength;
    bot.trendEndTime = trend.endTime;

    const positionSize = Math.floor(
      PARAMS.MAX_POSITION_SIZE * 0.15 * trend.strength
    );

    if (positionSize > 0) {
      bot.positionSize = positionSize;
      bot.entryPrice = marketData.price;
      bot.stopLoss =
        trend.direction === "up"
          ? marketData.price * (1 - PARAMS.TREND_FOLLOWER_STOP_LOSS)
          : marketData.price * (1 + PARAMS.TREND_FOLLOWER_STOP_LOSS);
      bot.takeProfit =
        trend.direction === "up"
          ? marketData.price * (1 + PARAMS.TREND_FOLLOWER_TAKE_PROFIT)
          : marketData.price * (1 - PARAMS.TREND_FOLLOWER_TAKE_PROFIT);

      const orderType = trend.direction === "up" ? "buy" : "sell";
      const orderPrice =
        trend.direction === "up"
          ? marketData.price * 0.999
          : marketData.price * 1.001;

      if (orderType === "buy") {
        marketData.bidDepth.push({
          price: orderPrice,
          quantity: positionSize,
          type: "trend",
          botId: bot.id,
          expiry: trend.endTime,
        });
      } else {
        marketData.askDepth.push({
          price: orderPrice,
          quantity: positionSize,
          type: "trend",
          botId: bot.id,
          expiry: trend.endTime,
        });
      }

      this.createBotOrder(
        bot.id,
        marketData.symbol,
        orderType,
        "Limit",
        positionSize,
        orderPrice,
        0.85,
        trend.endTime
      );

      // TREND_JOIN: Bot joined trend
    }
  }

  private createTrendPosition(
    bot: TrendFollowerBot,
    marketData: SimulatedMarketData,
    trend: { direction: "up" | "down" | "neutral"; strength: number }
  ) {
    bot.trendDirection = trend.direction;
    bot.trendStrength = trend.strength;
    bot.trendEndTime = Date.now() + this.getRandomTrendDuration();

    const positionSize = Math.floor(
      PARAMS.MAX_POSITION_SIZE * 0.1 * trend.strength
    );

    if (positionSize > 0) {
      bot.positionSize = positionSize;
      bot.entryPrice = marketData.price;
      bot.stopLoss =
        trend.direction === "up"
          ? marketData.price * (1 - PARAMS.TREND_FOLLOWER_STOP_LOSS)
          : marketData.price * (1 + PARAMS.TREND_FOLLOWER_STOP_LOSS);
      bot.takeProfit =
        trend.direction === "up"
          ? marketData.price * (1 + PARAMS.TREND_FOLLOWER_TAKE_PROFIT)
          : marketData.price * (1 - PARAMS.TREND_FOLLOWER_TAKE_PROFIT);

      const orderType = trend.direction === "up" ? "buy" : "sell";

      if (orderType === "buy") {
        marketData.bidDepth.push({
          price: marketData.price * 0.995,
          quantity: positionSize,
          type: "trend",
          botId: bot.id,
          expiry: bot.trendEndTime,
        });
      } else {
        marketData.askDepth.push({
          price: marketData.price * 1.005,
          quantity: positionSize,
          type: "trend",
          botId: bot.id,
          expiry: bot.trendEndTime,
        });
      }

      this.createBotOrder(
        bot.id,
        marketData.symbol,
        orderType,
        "Limit",
        positionSize,
        marketData.price,
        0.7,
        bot.trendEndTime
      );

      // TREND: Bot opened position
    }
  }

  private closeTrendPosition(
    bot: TrendFollowerBot,
    marketData: SimulatedMarketData,
    reason: string
  ) {
    if (bot.positionSize > 0) {
      const orderType: "buy" | "sell" =
        bot.trendDirection === "up" ? "sell" : "buy";
      const orderPrice = marketData.price;

      if (orderType === "sell") {
        marketData.askDepth.push({
          price: orderPrice,
          quantity: bot.positionSize,
          type: "trend",
          botId: bot.id,
          expiry: Date.now() + 60000,
        });
      } else {
        marketData.bidDepth.push({
          price: orderPrice,
          quantity: bot.positionSize,
          type: "trend",
          botId: bot.id,
          expiry: Date.now() + 60000,
        });
      }

      this.createBotOrder(
        bot.id,
        marketData.symbol,
        orderType,
        "Limit",
        bot.positionSize,
        orderPrice,
        0.8,
        Date.now() + 60000
      );

      // TREND_CLOSE: Bot closed position

      bot.positionSize = 0;
      bot.trendDirection = "neutral";
      bot.trendStrength = 0;
      bot.entryPrice = 0;
      bot.stopLoss = 0;
      bot.takeProfit = 0;
    }
  }

  private processNoiseTraders(
    marketData: SimulatedMarketData,
    dynamicVolatility: number,
    noiseTraders: NoiseTraderBot[]
  ) {
    const now = Date.now();

    const symbolTrends = this.activeTrends.filter(
      (t) => t.symbol === marketData.symbol && t.endTime > now
    );
    const hasActiveTrend = symbolTrends.length > 0;

    noiseTraders.forEach((bot) => {
      if (now >= bot.nextActionTime) {
        this.updateNoiseTraderSentiment(bot, marketData);

        if (hasActiveTrend) {
          const trend = symbolTrends[0];
          if (Math.random() < trend.strength * 0.7) {
            bot.sentiment = trend.direction === "up" ? "bullish" : "bearish";
          }
        }

        const actionProbability =
          0.6 + (dynamicVolatility / PARAMS.BASE_PRICE_VOLATILITY) * 0.3;

        if (Math.random() < actionProbability) {
          const position = this.botPositions.get(bot.id);
          if (!position) return;

          let orderType: "buy" | "sell";
          let orderPrice: number;

          if (bot.sentiment === "bullish") {
            orderType = "buy";
            orderPrice =
              marketData.price * (1 - 0.001 * bot.volatilityMultiplier);
          } else if (bot.sentiment === "bearish") {
            orderType = "sell";
            orderPrice =
              marketData.price * (1 + 0.001 * bot.volatilityMultiplier);
          } else {
            orderType = Math.random() > 0.5 ? "buy" : "sell";
            orderPrice = marketData.price * (1 + (Math.random() - 0.5) * 0.003);
          }

          const maxQuantity = PARAMS.MAX_POSITION_SIZE * 0.05;
          const quantity = Math.floor(Math.random() * maxQuantity) + 10;

          const isLargeOrder = hasActiveTrend
            ? Math.random() > 0.85
            : Math.random() > 0.92;
          const finalQuantity = isLargeOrder ? quantity * 15 : quantity;

          if (orderType === "buy") {
            marketData.bidDepth.push({
              price: orderPrice,
              quantity: finalQuantity,
              type: "noise",
              botId: bot.id,
              expiry: now + this.getStaggeredExpiryTime(),
              createdTime: now,
            });
          } else {
            marketData.askDepth.push({
              price: orderPrice,
              quantity: finalQuantity,
              type: "noise",
              botId: bot.id,
              expiry: now + this.getStaggeredExpiryTime(),
              createdTime: now,
            });
          }

          this.createBotOrder(
            bot.id,
            marketData.symbol,
            orderType,
            "Limit",
            finalQuantity,
            orderPrice,
            0.7,
            now + this.getStaggeredExpiryTime()
          );

          if (isLargeOrder) {
            // NOISE: Bot placed large order
          }
        }

        bot.nextActionTime = now + this.getRandomInterval();
      }
    });
  }

  private updateNoiseTraderSentiment(
    bot: NoiseTraderBot,
    marketData: SimulatedMarketData
  ) {
    const priceHistory = this.priceHistory.get(marketData.symbol) || [];
    if (priceHistory.length < 5) return;

    const recentPrices = priceHistory.slice(-5);
    const priceChange =
      (recentPrices[recentPrices.length - 1] - recentPrices[0]) /
      recentPrices[0];

    if (priceChange > 0.02) {
      bot.sentiment = "bullish";
    } else if (priceChange < -0.02) {
      bot.sentiment = "bearish";
    } else if (Math.random() > 0.7) {
      const sentiments: Array<"bullish" | "bearish" | "neutral"> = [
        "bullish",
        "bearish",
        "neutral",
      ];
      bot.sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    }
  }

  private processStatisticalArb(
    marketData: SimulatedMarketData,
    statArbs: StatisticalArbBot[]
  ) {
    statArbs.forEach((bot) => {
      if (!bot.pairSymbol) return;

      const pairData = this.marketData.get(bot.pairSymbol);
      if (!pairData) return;

      const spread = marketData.price - pairData.price;
      const zScore = (spread - bot.meanPrice) / bot.stdDev;

      if (Math.abs(zScore) > bot.zScoreThreshold * 0.7) {
        if (zScore > bot.zScoreThreshold * 0.7 && bot.position <= 0) {
          this.createPairsTrade(bot, marketData, pairData, "sell", "buy");
        } else if (zScore < -bot.zScoreThreshold * 0.7 && bot.position >= 0) {
          this.createPairsTrade(bot, marketData, pairData, "buy", "sell");
        }
      }

      const newMean = bot.meanPrice * 0.99 + spread * 0.01;
      const newStdDev = Math.sqrt(
        0.99 * bot.stdDev * bot.stdDev +
          0.01 * (spread - newMean) * (spread - newMean)
      );

      bot.meanPrice = newMean;
      bot.stdDev = newStdDev;
    });
  }

  private createPairsTrade(
    bot: StatisticalArbBot,
    mainMarket: SimulatedMarketData,
    pairMarket: SimulatedMarketData,
    mainAction: "buy" | "sell",
    pairAction: "buy" | "sell"
  ) {
    const quantity = Math.floor(PARAMS.MAX_POSITION_SIZE * 0.05);

    if (mainAction === "buy") {
      mainMarket.bidDepth.push({
        price: mainMarket.price * 0.995,
        quantity,
        type: "marketMaker",
        botId: bot.id,
        expiry: Date.now() + this.getStaggeredExpiryTime(),
        createdTime: Date.now(),
      });
    } else {
      mainMarket.askDepth.push({
        price: mainMarket.price * 1.005,
        quantity,
        type: "marketMaker",
        botId: bot.id,
        expiry: Date.now() + this.getStaggeredExpiryTime(),
        createdTime: Date.now(),
      });
    }

    this.createBotOrder(
      bot.id,
      mainMarket.symbol,
      mainAction,
      "Limit",
      quantity,
      mainMarket.price,
      0.6,
      Date.now() + this.getStaggeredExpiryTime()
    );

    // STAT_ARB: Bot action

    bot.position = mainAction === "buy" ? quantity : -quantity;
  }

  private processBotToBotTrading(marketData: SimulatedMarketData) {
    const symbol = marketData.symbol;
    const now = Date.now();

    const botOrdersForSymbol = Array.from(this.botOrders.values()).filter(
      (order) =>
        order.symbol === symbol &&
        order.status === "pending" &&
        (!order.expiryTime || order.expiryTime > now)
    );

    if (botOrdersForSymbol.length === 0) return;

    const buyOrders = botOrdersForSymbol
      .filter((order) => order.type === "buy")
      .sort((a, b) => b.price - a.price);

    const sellOrders = botOrdersForSymbol
      .filter((order) => order.type === "sell")
      .sort((a, b) => a.price - b.price);

    for (const buyOrder of buyOrders) {
      if (buyOrder.status !== "pending") continue;

      for (const sellOrder of sellOrders) {
        if (sellOrder.status !== "pending") continue;

        if (buyOrder.price >= sellOrder.price) {
          const matchQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
          const matchPrice = (buyOrder.price + sellOrder.price) / 2;

          if (matchQuantity > 0) {
            this.executeBotToBotTrade(
              buyOrder,
              sellOrder,
              matchPrice,
              matchQuantity,
              marketData
            );

            break;
          }
        }
      }
    }
  }

  private executeBotToBotTrade(
    buyOrder: BotOrder,
    sellOrder: BotOrder,
    price: number,
    quantity: number,
    marketData: SimulatedMarketData
  ) {
    buyOrder.quantity -= quantity;
    sellOrder.quantity -= quantity;

    if (buyOrder.quantity <= 0) {
      buyOrder.status = "filled";
      this.botOrders.delete(buyOrder.id);
    } else {
      this.botOrders.set(buyOrder.id, buyOrder);
    }

    if (sellOrder.quantity <= 0) {
      sellOrder.status = "filled";
      this.botOrders.delete(sellOrder.id);
    } else {
      this.botOrders.set(sellOrder.id, sellOrder);
    }

    this.updateBotPositionFromTrade(
      buyOrder.botId,
      "buy",
      price,
      quantity,
      marketData.symbol
    );
    this.updateBotPositionFromTrade(
      sellOrder.botId,
      "sell",
      price,
      quantity,
      marketData.symbol
    );

    this.tradeHistory.push({
      timestamp: Date.now(),
      price,
      quantity,
      buyerBotId: buyOrder.botId,
      sellerBotId: sellOrder.botId,
      symbol: marketData.symbol,
    });

    marketData.price = price;
    marketData.volume += quantity;
    marketData.timestamp = Date.now();

    const priceHistory = this.priceHistory.get(marketData.symbol) || [];
    priceHistory.push(price);
    if (priceHistory.length > PARAMS.VOLATILITY_WINDOW * 10) {
      priceHistory.splice(
        0,
        priceHistory.length - PARAMS.VOLATILITY_WINDOW * 10
      );
    }
    this.priceHistory.set(marketData.symbol, priceHistory);

    const volumeHistory = this.volumeHistory.get(marketData.symbol) || [];
    volumeHistory.push(quantity);
    if (volumeHistory.length > 100) {
      volumeHistory.splice(0, volumeHistory.length - 100);
    }
    this.volumeHistory.set(marketData.symbol, volumeHistory);

    // BOT_TRADE: Shares traded between bots
  }

  public processUserOrder(order: Order): {
    success: boolean;
    filledPrice?: number;
    filledQuantity?: number;
  } {
    this.userOrderCount += 1; // ✅ ADD
    const delay = Math.floor(Math.random() * 6000) + 2000;
    // USER_ORDER: Order received

    this.pendingUserOrders.set(order.id, {
      order,
      decisionTime: Date.now() + delay,
    });
    return { success: false };
  }

  private processPendingUserOrders(marketData: SimulatedMarketData): void {
    const currentTime = Date.now();

    this.pendingUserOrders.forEach((pendingItem, orderId) => {
      if (currentTime >= pendingItem.decisionTime) {
        const { order } = pendingItem;
        const currentData = this.marketData.get(order.symbol);

        if (!currentData) {
          this.pendingUserOrders.delete(orderId);
          return;
        }

        const botDecision = this.evaluateUserOrder(order, currentData);

        if (botDecision.accepted) {
          const execution = this.executeUserOrderWithBots(order, currentData);

          if (execution.filled) {
            // USER_FILL: Order filled

            this.sendOrderUpdate({
              orderId: order.id,
              status:
                execution.quantity < order.quantity
                  ? "PARTIALLY_FILLED"
                  : "FILLED",
              filledPrice: execution.price,
              filledQuantity: execution.quantity,
              timestamp: Date.now(),
            });

            if (execution.quantity < order.quantity) {
              const remainingOrder = { ...order };
              remainingOrder.quantity -= execution.quantity;
              this.pendingUserOrders.set(orderId, {
                order: remainingOrder,
                decisionTime: currentTime + 2000,
              });
              return;
            }
          } else {
            this.sendOrderUpdate({
              orderId: order.id,
              status: "REJECTED",
              timestamp: Date.now(),
            });
          }
        } else {
          // USER_REJECT: Order rejected
          this.sendOrderUpdate({
            orderId: order.id,
            status: "REJECTED",
            timestamp: Date.now(),
          });
        }

        this.pendingUserOrders.delete(orderId);
      }
    });
  }

  private evaluateUserOrder(
    order: Order,
    marketData: SimulatedMarketData
  ): { accepted: boolean; reason: string } {
    const isBuy = order.type === "buy";
    const currentPrice = marketData.price;
    const orderPrice = order.price || currentPrice;

    const bestBid =
      marketData.bidDepth.length > 0
        ? Math.max(...marketData.bidDepth.map((l) => l.price))
        : currentPrice;
    const bestAsk =
      marketData.askDepth.length > 0
        ? Math.min(...marketData.askDepth.map((l) => l.price))
        : currentPrice;
    const spread = bestAsk - bestBid;

    // Implement decreasing probability logic for first 10 orders
    let acceptanceProbability = 0.7;

    if (this.userOrderCount <= 10) {
      // For first 10 orders, start with 100% and decrease
      acceptanceProbability = Math.max(
        1.0 - (this.userOrderCount - 1) * 0.1,
        0.1
      );
      // USER_ORDER: First 10 orders acceptance probability
    } else {
      // After 10 orders, use normal logic
      if (order.orderType === "Market") {
        acceptanceProbability = 0.9;
      } else if (order.orderType === "Limit") {
        if (isBuy) {
          const priceAdvantage = (orderPrice - bestAsk) / bestAsk;
          acceptanceProbability = 0.6 + Math.min(0.3, priceAdvantage * 10);
        } else {
          const priceAdvantage = (bestBid - orderPrice) / bestBid;
          acceptanceProbability = 0.6 + Math.min(0.3, priceAdvantage * 10);
        }
      }

      const spreadFactor = Math.max(0.5, 1 - spread / (currentPrice * 0.01));
      acceptanceProbability *= spreadFactor;

      const sizeFactor = Math.max(0.3, 1 - order.quantity / 10000);
      acceptanceProbability *= sizeFactor;
    }

    const accepted = Math.random() < acceptanceProbability;

    return {
      accepted,
      reason: accepted
        ? `Bot willing to trade (${Math.round(acceptanceProbability * 100)}%)`
        : `Bot not interested (${Math.round(acceptanceProbability * 100)}%)`,
    };
  }

  private executeUserOrderWithBots(
    order: Order,
    marketData: SimulatedMarketData
  ) {
    const isBuy = order.type === "buy";

    const candidates = this.bots
      .filter(
        (bot) =>
          bot.symbol === order.symbol &&
          bot.isActive &&
          this.canBotTradeWithUser(bot, order, marketData)
      )
      .map((bot) => {
        const pos = this.botPositions.get(bot.id);
        if (!pos) return null;

        const available = isBuy
          ? pos.quantity // bot sells -> must have inventory
          : PARAMS.MAX_POSITION_SIZE - pos.quantity; // bot buys -> capacity

        return { bot, pos, available };
      })
      .filter(
        (x): x is { bot: Bot; pos: BotPosition; available: number } =>
          !!x && x.available > 0
      )
      .sort((a, b) => b.available - a.available); // ưu tiên bot có nhiều khả năng fill

    if (!candidates.length) return { filled: false, price: 0, quantity: 0 };

    const selected = candidates[0]; // ✅ chọn bot tốt nhất (hoặc random trong top N)
    const tradeQty = Math.min(selected.available, order.quantity);

    const price = this.calculateTradePrice(order, marketData, selected.bot);

    // update bot position (bot side opposite user)
    if (isBuy)
      this.updateBotPositionFromTrade(
        selected.bot.id,
        "sell",
        price,
        tradeQty,
        order.symbol
      );
    else
      this.updateBotPositionFromTrade(
        selected.bot.id,
        "buy",
        price,
        tradeQty,
        order.symbol
      );

    // ... push tradeHistory, update marketData ...
    return { filled: true, price, quantity: tradeQty };
  }

  private canBotTradeWithUser(
    bot: Bot,
    order: Order,
    marketData: SimulatedMarketData
  ): boolean {
    const position = this.botPositions.get(bot.id);
    if (!position) return false;

    const isBuy = order.type === "buy";

    if (bot.type === "marketMaker") {
      return true;
    } else if (bot.type === "trendFollower") {
      const trendBot = bot as TrendFollowerBot;
      if (isBuy && trendBot.trendDirection === "up") {
        return true;
      } else if (!isBuy && trendBot.trendDirection === "down") {
        return true;
      }
    } else if (bot.type === "noiseTrader") {
      const noiseBot = bot as NoiseTraderBot;
      if (isBuy && noiseBot.sentiment === "bearish") {
        return true;
      } else if (!isBuy && noiseBot.sentiment === "bullish") {
        return true;
      }
    }

    return false;
  }

  private calculateTradePrice(
    order: Order,
    marketData: SimulatedMarketData,
    bot: Bot
  ): number {
    const isBuy = order.type === "buy";
    const currentPrice = marketData.price;
    const orderPrice = order.price || currentPrice;

    if (order.orderType === "Market") {
      return isBuy
        ? marketData.askDepth.length > 0
          ? Math.min(...marketData.askDepth.map((l) => l.price))
          : currentPrice
        : marketData.bidDepth.length > 0
        ? Math.max(...marketData.bidDepth.map((l) => l.price))
        : currentPrice;
    } else {
      let price = orderPrice;

      if (bot.type === "marketMaker") {
        const marketMakerBot = bot as MarketMakerBot;
        const inventorySkew =
          (marketMakerBot.inventory - marketMakerBot.targetInventory) /
          marketMakerBot.maxPositionSize;
        const spreadAdjustment =
          PARAMS.MARKET_MAKER_BASE_SPREAD * (1 + Math.abs(inventorySkew));

        if (isBuy) {
          price = orderPrice + spreadAdjustment * 0.5;
        } else {
          price = orderPrice - spreadAdjustment * 0.5;
        }
      }

      // Apply Vietnamese exchange fluctuation limits
      const exchange = getExchangeBySymbol(order.symbol);
      const flucLimit = getFluctuationLimit(exchange);
      const ceilingPrice = Math.floor(currentPrice * (1 + flucLimit));
      const floorPrice = Math.ceil(currentPrice * (1 - flucLimit));

      return Math.max(floorPrice, Math.min(price, ceilingPrice));
    }
  }

  private createBotOrder(
    botId: string,
    symbol: string,
    type: "buy" | "sell",
    orderType: "Market" | "Limit",
    quantity: number,
    price: number,
    probability?: number,
    expiryTime?: number
  ): string {
    const orderId = `bot-order-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const order: BotOrder = {
      id: orderId,
      botId,
      symbol,
      type,
      orderType,
      quantity,
      price,
      timestamp: Date.now(),
      status: "pending",
      expiryTime: expiryTime || Date.now() + this.getStaggeredExpiryTime(),
      probability,
    };

    this.botOrders.set(orderId, order);
    return orderId;
  }

  private updateBotPositionFromTrade(
    botId: string,
    type: "buy" | "sell",
    price: number,
    quantity: number,
    symbol: string
  ) {
    const position = this.botPositions.get(botId);
    if (!position) return;

    if (type === "buy") {
      const newQuantity = position.quantity + quantity;
      const newAvgPrice =
        position.quantity > 0
          ? (position.quantity * position.avgPrice + quantity * price) /
            newQuantity
          : price;

      position.quantity = newQuantity;
      position.avgPrice = newAvgPrice;
    } else {
      const realizedPnL = (price - position.avgPrice) * quantity;
      position.realizedPnL += realizedPnL;
      position.quantity = Math.max(0, position.quantity - quantity);

      position.totalTrades++;
      if (realizedPnL > 0) position.profitableTrades++;
      position.winRate =
        position.totalTrades > 0
          ? position.profitableTrades / position.totalTrades
          : 0;
    }

    const bot = this.bots.find((b) => b.id === botId);
    if (bot && bot.type === "marketMaker") {
      (bot as MarketMakerBot).inventory = position.quantity;
    }

    this.botPositions.set(botId, position);
  }

  private detectTrend(symbol: string): {
    direction: "up" | "down" | "neutral";
    strength: number;
  } {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 10) return { direction: "neutral", strength: 0 };

    const recent = prices.slice(-10);
    const startPrice = recent[0];
    const endPrice = recent[recent.length - 1];
    const change = (endPrice - startPrice) / startPrice;

    if (Math.abs(change) < 0.005) return { direction: "neutral", strength: 0 };

    const direction = change > 0 ? "up" : "down";
    const strength = Math.min(1, Math.abs(change) * 20);

    return { direction, strength };
  }

  private calculateDynamicVolatility(symbol: string): number {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 2) return PARAMS.BASE_PRICE_VOLATILITY;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    if (returns.length < 2) return PARAMS.BASE_PRICE_VOLATILITY;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252);

    return Math.max(
      PARAMS.BASE_PRICE_VOLATILITY * 0.5,
      Math.min(PARAMS.BASE_PRICE_VOLATILITY * 2, volatility)
    );
  }

  private updateTechnicalIndicators(
    marketData: SimulatedMarketData,
    symbol: string
  ) {
    const prices = this.priceHistory.get(symbol) || [];
    const volumes = this.volumeHistory.get(symbol) || [];

    if (prices.length < 14) return;

    const recentPrices = prices.slice(-14);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < recentPrices.length; i++) {
      const change = recentPrices[i] - recentPrices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    marketData.rsi = 100 - 100 / (1 + rs);

    if (volumes.length >= 10) {
      const recentVolumes = volumes.slice(-10);
      const recentPricesForVWAP = prices.slice(-10);

      let totalValue = 0;
      let totalVolume = 0;

      for (let i = 0; i < recentPricesForVWAP.length; i++) {
        totalValue += recentPricesForVWAP[i] * recentVolumes[i];
        totalVolume += recentVolumes[i];
      }

      marketData.vwap = totalValue / totalVolume;
    }
  }

  private updateMarketMetrics(marketData: SimulatedMarketData) {
    const spread = this.calculateBidAskSpread(marketData);
    const orderImbalance = this.calculateOrderImbalance(marketData);
    const marketDepth = this.calculateMarketDepth(marketData);
    const priceMomentum = this.calculatePriceMomentum(marketData.symbol);

    this.marketMetrics.set(marketData.symbol, {
      bidAskSpread: spread,
      orderImbalance,
      marketDepth,
      priceMomentum,
    });
  }

  private calculateBidAskSpread(marketData: SimulatedMarketData): number {
    if (marketData.bidDepth.length === 0 || marketData.askDepth.length === 0) {
      return PARAMS.MARKET_MAKER_BASE_SPREAD;
    }

    const bestBid = Math.max(...marketData.bidDepth.map((l) => l.price));
    const bestAsk = Math.min(...marketData.askDepth.map((l) => l.price));

    return bestAsk - bestBid;
  }

  private calculateOrderImbalance(marketData: SimulatedMarketData): number {
    const totalBidVolume = marketData.bidDepth.reduce(
      (sum, level) => sum + level.quantity,
      0
    );
    const totalAskVolume = marketData.askDepth.reduce(
      (sum, level) => sum + level.quantity,
      0
    );

    if (totalBidVolume + totalAskVolume === 0) return 0;

    return (
      (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)
    );
  }

  private calculateMarketDepth(marketData: SimulatedMarketData): number {
    const bidDepth = marketData.bidDepth
      .slice(0, 5)
      .reduce((sum, level) => sum + level.quantity, 0);
    const askDepth = marketData.askDepth
      .slice(0, 5)
      .reduce((sum, level) => sum + level.quantity, 0);

    return (bidDepth + askDepth) / 2;
  }

  private calculatePriceMomentum(symbol: string): number {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 5) return 0;

    const recent = prices.slice(-5);
    const momentum = (recent[recent.length - 1] - recent[0]) / recent[0];

    return momentum;
  }

  private updateMarketDepth(
    marketData: SimulatedMarketData,
    dynamicVolatility: number
  ) {
    // Đã được thay thế bởi updateMarketDepthWithStability
    this.updateMarketDepthWithStability(marketData, dynamicVolatility);
  }

  private updateVolumeProfile(marketData: SimulatedMarketData) {
    const currentPrice = marketData.price;
    const roundedPrice = roundToTick(marketData.symbol, currentPrice);

    const currentVolume = marketData.volumeProfile.get(roundedPrice) || 0;
    marketData.volumeProfile.set(
      roundedPrice,
      currentVolume + marketData.volume
    );

    if (marketData.volumeProfile.size > PARAMS.VOLUME_PROFILE_SIZE) {
      const entries = Array.from(marketData.volumeProfile.entries());
      entries.sort((a, b) => b[1] - a[1]);
      entries.length = PARAMS.VOLUME_PROFILE_SIZE;
      marketData.volumeProfile = new Map(entries);
    }
  }

  private getRandomTrendDuration(): number {
    return (
      Math.floor(
        Math.random() *
          (PARAMS.TREND_DURATION_MAX_BOT - PARAMS.TREND_DURATION_MIN_BOT)
      ) + PARAMS.TREND_DURATION_MIN_BOT
    );
  }

  private getRandomInterval(): number {
    return (
      (Math.random() *
        (PARAMS.NOISE_ACTION_INTERVAL_MAX - PARAMS.NOISE_ACTION_INTERVAL_MIN) +
        PARAMS.NOISE_ACTION_INTERVAL_MIN) *
      1000
    );
  }

  private sendOrderUpdate(update: {
    orderId: string;
    status: OrderStatus;
    filledPrice?: number;
    filledQuantity?: number;
    timestamp: number;
  }) {
    this.webSocketService.sendOrderUpdate(update);
  }

  public getMarketData(symbol: string): SimulatedMarketData | undefined {
    const data = this.marketData.get(symbol);
    // console.log('Getting market data for', symbol, data ? {
    //   bidDepth: data.bidDepth.length,
    //   askDepth: data.askDepth.length,
    //   price: data.price
    // } : 'undefined');
    return data;
  }

  public getBotPositions(): BotPosition[] {
    return Array.from(this.botPositions.values());
  }

  public getActiveBots(): Bot[] {
    return this.bots.filter((bot) => bot.isActive);
  }

  public getTradeHistory(symbol?: string): TradeRecord[] {
    if (symbol) {
      return this.tradeHistory.filter((trade) => trade.symbol === symbol);
    }
    return this.tradeHistory;
  }

  public getActiveTrends(): ActiveTrend[] {
    return this.activeTrends.filter((t) => t.endTime > Date.now());
  }

  public getMarketDepth(symbol: string) {
    const marketData = this.marketData.get(symbol);
    if (!marketData) return { bids: [], asks: [] };

    const aggregateDepth = (depth: MarketDepthLevel[]) => {
      const priceMap = new Map<
        number,
        { quantity: number; orderCount: number }
      >();

      depth.forEach((level) => {
        const existing = priceMap.get(level.price);
        if (existing) {
          existing.quantity += level.quantity;
          existing.orderCount += 1;
        } else {
          priceMap.set(level.price, {
            quantity: level.quantity,
            orderCount: 1,
          });
        }
      });

      return Array.from(priceMap.entries())
        .map(([price, data]) => ({
          price,
          totalQuantity: data.quantity,
          orderCount: data.orderCount,
        }))
        .sort((a, b) => b.price - a.price);
    };

    return {
      bids: aggregateDepth(marketData.bidDepth),
      asks: aggregateDepth(marketData.askDepth).sort(
        (a, b) => a.price - b.price
      ),
    };
  }

  public getMarketStatistics(): MarketStats {
    const stats: MarketStats = {
      totalBots: this.bots.length,
      activeBots: this.bots.filter((b) => b.isActive).length,
      totalTrades: this.tradeHistory.length,
      recentTrades: this.tradeHistory.filter(
        (t) => Date.now() - t.timestamp < 60000
      ).length,
      activeTrends: this.activeTrends.filter((t) => t.endTime > Date.now())
        .length,
      marketData: {},
    };

    this.marketData.forEach((data, symbol) => {
      const activeTrendsForSymbol = this.activeTrends.filter(
        (t) => t.symbol === symbol && t.endTime > Date.now()
      );

      stats.marketData[symbol] = {
        price: data.price,
        volume: data.volume,
        trend: data.trend,
        rsi: data.rsi,
        vwap: data.vwap,
        activeTrends: activeTrendsForSymbol.length,
        bidCount: data.bidDepth.length,
        askCount: data.askDepth.length,
        totalBidVolume: data.bidDepth.reduce(
          (sum, level) => sum + level.quantity,
          0
        ),
        totalAskVolume: data.askDepth.reduce(
          (sum, level) => sum + level.quantity,
          0
        ),
      };
    });

    return stats;
  }

  public getOrderBookStabilityMetrics(symbol: string) {
    const marketData = this.marketData.get(symbol);
    if (!marketData) return null;

    const spread = this.calculateBidAskSpread(marketData);
    const maxAllowedSpread =
      PARAMS.MARKET_MAKER_BASE_SPREAD * PARAMS.MAX_SPREAD_MULTIPLIER;
    const spreadHealth = Math.max(
      0,
      Math.min(100, (1 - spread / maxAllowedSpread) * 100)
    );

    const depthHealth = Math.min(
      100,
      (Math.min(marketData.bidDepth.length, marketData.askDepth.length) /
        PARAMS.MIN_BID_ASK_LEVELS) *
        100
    );

    const now = Date.now();
    const orderAgeHealth =
      marketData.bidDepth.concat(marketData.askDepth).reduce((sum, level) => {
        if (level.createdTime) {
          const age = now - level.createdTime;
          const maxAge = PARAMS.STAGGERED_EXPIRY_RANGE[1];
          return sum + Math.max(0, Math.min(100, (1 - age / maxAge) * 100));
        }
        return sum + 100;
      }, 0) / (marketData.bidDepth.length + marketData.askDepth.length || 1);

    const overallHealth =
      spreadHealth * 0.4 + depthHealth * 0.3 + orderAgeHealth * 0.3;

    return {
      symbol,
      spread,
      maxAllowedSpread,
      spreadHealth: Math.round(spreadHealth),
      bidLevels: marketData.bidDepth.length,
      askLevels: marketData.askDepth.length,
      depthHealth: Math.round(depthHealth),
      orderAgeHealth: Math.round(orderAgeHealth),
      overallHealth: Math.round(overallHealth),
      status:
        overallHealth > 80
          ? "Healthy"
          : overallHealth > 60
          ? "Stable"
          : overallHealth > 40
          ? "Warning"
          : "Critical",
    };
  }

  /**
   * Handle Black Swan event
   * @param event The Black Swan event to handle
   */
  private handleBlackSwanEvent(
    event: import("./blackSwanService").BlackSwanEvent
  ): void {
    // Start flashing notification when a Black Swan event occurs
    this.blackSwanService.startFlashing();

    // Send notification to WebSocket clients
    this.webSocketService.sendNotification({
      type: "blackSwan",
      message: `Black Swan event triggered for ${event.symbol}: ${
        event.type === "delist" ? "Delisted" : "Severe price drop"
      } (${Math.round((1 - event.severity) * 100)}% loss)`,
    });
  }

  /**
   * Get historical data for backtesting
   * @param symbol Stock symbol
   * @param days Number of days of historical data to retrieve
   * @returns Array of candlestick data with volume
   */
  /**
   * Trigger a test Black Swan event for testing purposes
   * @param symbol The stock symbol to trigger the event for
   */
  public triggerTestBlackSwanEvent(
    symbol: string
  ): import("./blackSwanService").BlackSwanEvent {
    return this.blackSwanService.triggerTestEvent(symbol);
  }

  public getHistoricalData(
    symbol: string,
    days: number = 30
  ): CandlestickWithVolume[] {
    const prices = this.priceHistory.get(symbol) || [];
    const volumes = this.volumeHistory.get(symbol) || [];

    if (prices.length === 0) return [];

    // Generate OHLC data from price history
    const candles: CandlestickWithVolume[] = [];
    const now = Math.floor(Date.now() / 1000);
    const interval = 60; // 1 minute candles

    // Group prices into time intervals
    const groupedData: {
      [key: number]: { prices: number[]; volumes: number[] };
    } = {};

    // For simplicity, we'll create synthetic OHLC data
    // In a real implementation, this would use actual open/high/low/close data
    for (let i = 0; i < prices.length; i++) {
      const timeIndex = Math.floor(i / 60); // Group by minute
      const time = now - (prices.length - i) * interval;

      if (!groupedData[timeIndex]) {
        groupedData[timeIndex] = { prices: [], volumes: [] };
      }

      groupedData[timeIndex].prices.push(prices[i]);
      groupedData[timeIndex].volumes.push(volumes[i] || 1000);
    }

    // Convert to candlesticks
    Object.entries(groupedData).forEach(([timeIndex, data]) => {
      if (data.prices.length > 0) {
        const open = data.prices[0];
        const close = data.prices[data.prices.length - 1];
        const high = Math.max(...data.prices);
        const low = Math.min(...data.prices);
        const volume = data.volumes.reduce((sum, v) => sum + v, 0);

        candles.push({
          time: (now - parseInt(timeIndex) * interval) as Time,
          open,
          high,
          low,
          close,
          volume,
        });
      }
    });

    return candles.sort((a, b) => (a.time as number) - (b.time as number));
  }
}
