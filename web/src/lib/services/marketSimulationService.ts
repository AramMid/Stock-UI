import { Order } from "../order-management";

// Types for our market simulation
export interface MarketMakerBot {
  id: string;
  type: "marketMaker";
  symbol: string;
  isActive: boolean;
}

export interface TrendFollowerBot {
  id: string;
  type: "trendFollower";
  symbol: string;
  isActive: boolean;
  trendDirection: "up" | "down" | "neutral";
  trendEndTime: number;
}

export interface NoiseTraderBot {
  id: string;
  type: "noiseTrader";
  symbol: string;
  isActive: boolean;
  nextActionTime: number;
}

export type Bot = MarketMakerBot | TrendFollowerBot | NoiseTraderBot;

export interface MarketDepthLevel {
  price: number;
  quantity: number;
  type: "bid" | "ask" | "marketMaker";
}

export interface SimulatedMarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  bidDepth: MarketDepthLevel[];
  askDepth: MarketDepthLevel[];
  trend: "up" | "down" | "neutral";
}

// Add new interfaces for bot trading behavior
export interface BotOrder {
  id: string;
  botId: string;
  symbol: string;
  type: 'buy' | 'sell';
  orderType: 'Market' | 'Limit';
  quantity: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'filled' | 'cancelled';
}

export interface BotPosition {
  botId: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  realizedPnL: number;
}

// Simulation parameters
const SIMULATION_PARAMS = {
  // Market Maker bots (6 bots)
  MARKET_MAKER_COUNT: 6,
  MARKET_MAKER_BASE_SPREAD: 100, // Base spread in VND
  MARKET_MAKER_QUANTITY_RANGE: [10, 100], // Quantity range for market makers
  
  // Trend Follower bots (3 bots)
  TREND_FOLLOWER_COUNT: 3,
  TREND_DURATION_MIN: 5 * 60 * 1000, // 5 minutes minimum
  TREND_DURATION_MAX: 30 * 60 * 1000, // 30 minutes maximum
  TREND_IMPACT: 0.005, // 0.5% price impact per action
  TREND_REVERSAL_PROBABILITY: 0.3, // 30% chance of trend reversal
  
  // Noise Trader bot (1 bot)
  NOISE_TRADER_COUNT: 1,
  NOISE_ACTION_INTERVAL_MIN: 30, // Seconds
  NOISE_ACTION_INTERVAL_MAX: 120, // Seconds
  NOISE_LARGE_ORDER_MULTIPLIER: [5, 20], // Multiplier for large orders
  NOISE_VOLATILITY_SPIKE: 0.03, // 3% volatility spike
  
  // General parameters
  BASE_PRICE_VOLATILITY: 0.002, // 0.2% base volatility
  BASE_VOLUME: 1000,
  PRICE_UPDATE_INTERVAL: 1000, // 1 second
  VOLATILITY_WINDOW: 20, // Window for calculating dynamic volatility
};

/**
 * Market Simulation Service
 * Implements 3 groups of bots as described:
 * - Market Makers: Provide liquidity
 * - Trend Followers: Create trends
 * - Noise Traders: Create market chaos
 */
export class MarketSimulationService {
  private bots: Bot[] = [];
  private botPositions: Map<string, BotPosition> = new Map(); // Track bot positions
  private botOrders: Map<string, BotOrder> = new Map(); // Track bot orders
  private marketData: Map<string, SimulatedMarketData> = new Map();
  private priceHistory: Map<string, number[]> = new Map(); // For volatility calculations
  private simulationInterval: NodeJS.Timeout | null = null;
  private onUpdateCallback: ((data: SimulatedMarketData) => void) | null = null;
  private isRunning = false;

  constructor() {
    this.initializeBots();
  }

  /**
   * Initialize all bots for the simulation
   */
  private initializeBots() {
    // Create Market Maker bots
    for (let i = 0; i < SIMULATION_PARAMS.MARKET_MAKER_COUNT; i++) {
      const botId = `mm-${i}`;
      this.bots.push({
        id: botId,
        type: "marketMaker",
        symbol: "VIC.VN",
        isActive: true,
      });
      
      // Initialize bot position
      this.botPositions.set(botId, {
        botId: botId,
        symbol: "VIC.VN",
        quantity: 0,
        avgPrice: 0,
        realizedPnL: 0
      });
    }

    // Create Trend Follower bots
    for (let i = 0; i < SIMULATION_PARAMS.TREND_FOLLOWER_COUNT; i++) {
      const botId = `tf-${i}`;
      this.bots.push({
        id: botId,
        type: "trendFollower",
        symbol: "VIC.VN",
        isActive: true,
        trendDirection: "neutral",
        trendEndTime: 0,
      });
      
      // Initialize bot position
      this.botPositions.set(botId, {
        botId: botId,
        symbol: "VIC.VN",
        quantity: 0,
        avgPrice: 0,
        realizedPnL: 0
      });
    }

    // Create Noise Trader bot
    for (let i = 0; i < SIMULATION_PARAMS.NOISE_TRADER_COUNT; i++) {
      const botId = `nt-${i}`;
      this.bots.push({
        id: botId,
        type: "noiseTrader",
        symbol: "VIC.VN",
        isActive: true,
        nextActionTime: Date.now() + this.getRandomInterval(),
      });
      
      // Initialize bot position
      this.botPositions.set(botId, {
        botId: botId,
        symbol: "VIC.VN",
        quantity: 0,
        avgPrice: 0,
        realizedPnL: 0
      });
    }

    // Initialize market data
    this.initializeMarketData();
  }

  /**
   * Initialize market data for symbols
   */
  private initializeMarketData() {
    const initialPrice = 45200; // Starting price for VIC.VN
    const marketData: SimulatedMarketData = {
      symbol: "VIC.VN",
      price: initialPrice,
      volume: SIMULATION_PARAMS.BASE_VOLUME,
      timestamp: Date.now(),
      bidDepth: [],
      askDepth: [],
      trend: "neutral",
    };

    this.marketData.set("VIC.VN", marketData);
    this.priceHistory.set("VIC.VN", [initialPrice]); // Initialize price history
  }

  /**
   * Start the market simulation
   */
  public startSimulation(onUpdate: (data: SimulatedMarketData) => void) {
    if (this.isRunning) return;

    this.onUpdateCallback = onUpdate;
    this.isRunning = true;

    // Start the simulation loop
    this.simulationInterval = setInterval(() => {
      this.updateMarket();
    }, SIMULATION_PARAMS.PRICE_UPDATE_INTERVAL);
  }

  /**
   * Stop the market simulation
   */
  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Update market state
   */
  private updateMarket() {
    const marketData = this.marketData.get("VIC.VN");
    if (!marketData) return;

    // Update timestamp
    marketData.timestamp = Date.now();

    // Calculate dynamic volatility
    const dynamicVolatility = this.calculateDynamicVolatility("VIC.VN");
    
    // Apply GBM price movement
    const drift = 0.0; // Assuming zero drift for simplicity
    marketData.price = this.generateGBMPrice(marketData.price, drift, dynamicVolatility, SIMULATION_PARAMS.PRICE_UPDATE_INTERVAL);

    // Update price history
    const priceHistory = this.priceHistory.get("VIC.VN") || [];
    priceHistory.push(marketData.price);
    
    // Keep only recent history for performance
    if (priceHistory.length > SIMULATION_PARAMS.VOLATILITY_WINDOW * 10) {
      priceHistory.splice(0, priceHistory.length - SIMULATION_PARAMS.VOLATILITY_WINDOW * 10);
    }
    this.priceHistory.set("VIC.VN", priceHistory);

    // Process each bot group
    this.processMarketMakers(marketData, dynamicVolatility);
    this.processTrendFollowers(marketData);
    this.processNoiseTraders(marketData, dynamicVolatility);

    // Process pending bot orders
    this.processPendingBotOrders(marketData);

    // Update market depth based on bot orders
    this.updateMarketDepth(marketData, dynamicVolatility);

    // Notify subscribers of updates
    if (this.onUpdateCallback) {
      this.onUpdateCallback({...marketData});
    }
  }

  /**
   * Process Market Maker bots
   */
  private processMarketMakers(marketData: SimulatedMarketData, dynamicVolatility: number) {
    const marketMakers = this.bots.filter(bot => bot.type === "marketMaker" && bot.isActive) as MarketMakerBot[];
    
    // Clear existing market maker orders
    marketData.bidDepth = marketData.bidDepth.filter(level => !level.type || level.type !== "marketMaker");
    marketData.askDepth = marketData.askDepth.filter(level => !level.type || level.type !== "marketMaker");
    
    // Calculate dynamic spread based on volatility
    const volatilityMultiplier = 1 + (dynamicVolatility / SIMULATION_PARAMS.BASE_PRICE_VOLATILITY);
    const dynamicSpread = SIMULATION_PARAMS.MARKET_MAKER_BASE_SPREAD * volatilityMultiplier;
    
    // Each market maker places limit orders
    marketMakers.forEach((bot, index) => {
      // Spread varies slightly between bots
      const spreadAdjustment = (index % 3 - 1) * 50; // -50, 0, or +50 VND
      const spread = dynamicSpread + spreadAdjustment;
      
      // Place limit buy order below current price
      const buyPrice = Math.max(1000, marketData.price - spread);
      
      // Place limit sell order above current price
      const sellPrice = marketData.price + spread;
      
      // Quantity varies randomly within range
      const quantity = Math.floor(
        Math.random() * (SIMULATION_PARAMS.MARKET_MAKER_QUANTITY_RANGE[1] - SIMULATION_PARAMS.MARKET_MAKER_QUANTITY_RANGE[0]) + 
        SIMULATION_PARAMS.MARKET_MAKER_QUANTITY_RANGE[0]
      );
      
      // Add orders to market depth
      marketData.bidDepth.push({
        price: buyPrice,
        quantity: quantity,
        type: "marketMaker"
      });
      
      marketData.askDepth.push({
        price: sellPrice,
        quantity: quantity,
        type: "marketMaker"
      });
    });
  }

  /**
   * Calculate Simple Moving Average
   * @param prices Array of prices
   * @param period Period for MA calculation
   * @returns MA value
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const slice = prices.slice(-period);
    const sum = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * Calculate RSI-like indicator
   * @param prices Array of prices
   * @param period Period for RSI calculation
   * @returns RSI value (0-100)
   */
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50; // Neutral RSI
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Process Trend Follower bots
   */
  private processTrendFollowers(marketData: SimulatedMarketData) {
    const trendFollowers = this.bots.filter(bot => bot.type === "trendFollower" && bot.isActive) as TrendFollowerBot[];
    let trendDirection: "up" | "down" | "neutral" = "neutral";
    
    // Get price history for technical analysis
    const priceHistory = this.priceHistory.get("VIC.VN") || [];
    
    trendFollowers.forEach(bot => {
      const now = Date.now();
      
      // Use technical indicators to determine trend
      const smaShort = this.calculateSMA(priceHistory, 5);
      const smaLong = this.calculateSMA(priceHistory, 20);
      const rsi = this.calculateRSI(priceHistory, 14);
      
      // Check if trend period has ended or if technical conditions have changed
      if (now >= bot.trendEndTime || 
          (smaShort > smaLong && bot.trendDirection !== "up") ||
          (smaShort < smaLong && bot.trendDirection !== "down")) {
        
        // Determine trend based on technical indicators
        if (smaShort > smaLong && rsi < 70) {
          // Bullish trend
          bot.trendDirection = "up";
        } else if (smaShort < smaLong && rsi > 30) {
          // Bearish trend
          bot.trendDirection = "down";
        } else {
          // Neutral/consolidation
          bot.trendDirection = "neutral";
        }
        
        // Set new trend end time
        bot.trendEndTime = now + this.getRandomTrendDuration();
      }
      
      // Execute trend-following behavior
      if (bot.trendDirection === "up") {
        // Push price up by buying - place large buy orders
        const largeBuyQuantity = Math.floor(Math.random() * 200) + 50;
        marketData.bidDepth.push({
          price: marketData.price * 1.01, // Slightly above current price
          quantity: largeBuyQuantity,
          type: "bid"
        });
        
        marketData.price = marketData.price * (1 + SIMULATION_PARAMS.TREND_IMPACT);
        trendDirection = "up";
      } else if (bot.trendDirection === "down") {
        // Push price down by selling - place large sell orders
        const largeSellQuantity = Math.floor(Math.random() * 200) + 50;
        marketData.askDepth.push({
          price: marketData.price * 0.99, // Slightly below current price
          quantity: largeSellQuantity,
          type: "ask"
        });
        
        marketData.price = marketData.price * (1 - SIMULATION_PARAMS.TREND_IMPACT);
        trendDirection = "down";
      }
    });
    
    // Update market trend
    marketData.trend = trendDirection;
  }

  /**
   * Process Noise Trader bots
   */
  private processNoiseTraders(marketData: SimulatedMarketData, dynamicVolatility: number) {
    const noiseTraders = this.bots.filter(bot => bot.type === "noiseTrader" && bot.isActive) as NoiseTraderBot[];
    const now = Date.now();
    
    // Check if there's a volatility spike (panic/FOMO event)
    const isVolatilitySpike = dynamicVolatility > SIMULATION_PARAMS.BASE_PRICE_VOLATILITY * 3;
    
    noiseTraders.forEach(bot => {
      // Check if it's time for the noise trader to act or if there's a volatility spike
      if (now >= bot.nextActionTime || isVolatilitySpike) {
        // Higher probability of action during volatility spikes
        const actionProbability = isVolatilitySpike ? 0.8 : 0.3;
        
        if (Math.random() < actionProbability) {
          // Place a large order
          const multiplier = Math.floor(
            Math.random() * (SIMULATION_PARAMS.NOISE_LARGE_ORDER_MULTIPLIER[1] - SIMULATION_PARAMS.NOISE_LARGE_ORDER_MULTIPLIER[0]) + 
            SIMULATION_PARAMS.NOISE_LARGE_ORDER_MULTIPLIER[0]
          );
          
          // Larger price movement during volatility spikes
          const volatilityFactor = isVolatilitySpike ? SIMULATION_PARAMS.NOISE_VOLATILITY_SPIKE * 2 : SIMULATION_PARAMS.NOISE_VOLATILITY_SPIKE;
          const priceImpact = (Math.random() - 0.5) * volatilityFactor;
          marketData.price = marketData.price * (1 + priceImpact);
          
          // Place large order in the book
          const largeQuantity = Math.floor(Math.random() * 500) + 100;
          if (Math.random() > 0.5) {
            // Place large buy order
            marketData.bidDepth.push({
              price: marketData.price * (0.99 + Math.random() * 0.02), // Near current price
              quantity: largeQuantity,
              type: "bid"
            });
          } else {
            // Place large sell order
            marketData.askDepth.push({
              price: marketData.price * (0.99 + Math.random() * 0.02), // Near current price
              quantity: largeQuantity,
              type: "ask"
            });
          }
        } else if (Math.random() > 0.5) {
          // Cancel random orders to create volatility
          if (marketData.bidDepth.length > 3) {
            marketData.bidDepth.splice(Math.floor(Math.random() * marketData.bidDepth.length), 1);
          }
          if (marketData.askDepth.length > 3) {
            marketData.askDepth.splice(Math.floor(Math.random() * marketData.askDepth.length), 1);
          }
        }
        
        // Set next action time
        bot.nextActionTime = now + this.getRandomInterval();
      }
    });
  }

  /**
   * Generate bell curve distributed quantity
   * @param maxQuantity Maximum quantity
   * @param distance Distance from center (0 = center)
   * @param spread Spread parameter
   * @returns Quantity following bell curve distribution
   */
  private generateBellCurveQuantity(maxQuantity: number, distance: number, spread: number): number {
    // Normal distribution formula
    const exponent = -0.5 * Math.pow(distance / spread, 2);
    const normalDistribution = Math.exp(exponent);
    return Math.max(1, Math.floor(maxQuantity * normalDistribution));
  }

  /**
   * Update market depth (DOM) based on bot orders
   */
  private updateMarketDepth(marketData: SimulatedMarketData, dynamicVolatility: number) {
    // Preserve existing market maker orders
    const marketMakerBids = marketData.bidDepth.filter(level => level.type === "marketMaker");
    const marketMakerAsks = marketData.askDepth.filter(level => level.type === "marketMaker");
    
    // Clear non-market maker depth
    marketData.bidDepth = marketMakerBids;
    marketData.askDepth = marketMakerAsks;
    
    // Calculate dynamic spread based on volatility
    const volatilityMultiplier = 1 + (dynamicVolatility / SIMULATION_PARAMS.BASE_PRICE_VOLATILITY);
    const dynamicSpread = SIMULATION_PARAMS.MARKET_MAKER_BASE_SPREAD * volatilityMultiplier;
    
    // Generate additional bids (below current price) following bell curve distribution
    const bidLevels = 10;
    for (let i = 1; i <= bidLevels; i++) {
      const price = marketData.price - (i * dynamicSpread * 0.5);
      const distance = i; // Distance from center
      const maxQuantity = 100;
      const quantity = this.generateBellCurveQuantity(maxQuantity, distance, 3); // Spread parameter = 3
      
      marketData.bidDepth.push({
        price: Math.max(1000, price), // Ensure positive price
        quantity,
        type: "bid"
      });
    }
    
    // Generate additional asks (above current price) following bell curve distribution
    const askLevels = 10;
    for (let i = 1; i <= askLevels; i++) {
      const price = marketData.price + (i * dynamicSpread * 0.5);
      const distance = i; // Distance from center
      const maxQuantity = 100;
      const quantity = this.generateBellCurveQuantity(maxQuantity, distance, 3); // Spread parameter = 3
      
      marketData.askDepth.push({
        price,
        quantity,
        type: "ask"
      });
    }
    
    // Sort depth levels
    marketData.bidDepth.sort((a, b) => b.price - a.price); // Highest bid first
    marketData.askDepth.sort((a, b) => a.price - b.price); // Lowest ask first
  }

  /**
   * Get random interval for noise trader actions
   */
  private getRandomInterval(): number {
    const min = SIMULATION_PARAMS.NOISE_ACTION_INTERVAL_MIN;
    const max = SIMULATION_PARAMS.NOISE_ACTION_INTERVAL_MAX;
    return (Math.random() * (max - min) + min) * 1000; // Convert to milliseconds
  }

  /**
   * Get random trend duration
   */
  private getRandomTrendDuration(): number {
    const min = SIMULATION_PARAMS.TREND_DURATION_MIN;
    const max = SIMULATION_PARAMS.TREND_DURATION_MAX;
    return Math.random() * (max - min) + min;
  }

  /**
   * Get current market data
   */
  public getMarketData(symbol: string): SimulatedMarketData | undefined {
    return this.marketData.get(symbol);
  }

  /**
   * Update bot positions based on filled orders
   * @param botId Bot identifier
   * @param order Filled order details
   */
  private updateBotPosition(botId: string, order: BotOrder): void {
    const position = this.botPositions.get(botId);
    if (!position) return;

    if (order.type === 'buy') {
      // Update average price for new purchases
      const newQuantity = position.quantity + order.quantity;
      const newAvgPrice = (position.quantity * position.avgPrice + order.quantity * order.price) / newQuantity;
      
      position.quantity = newQuantity;
      position.avgPrice = newAvgPrice;
    } else {
      // Calculate realized PnL for sells
      const sellQuantity = Math.min(order.quantity, position.quantity);
      const realizedPnL = sellQuantity * (order.price - position.avgPrice);
      
      position.realizedPnL += realizedPnL;
      position.quantity = Math.max(0, position.quantity - order.quantity);
      
      // Reset average price if all shares sold
      if (position.quantity === 0) {
        position.avgPrice = 0;
      }
    }
    
    this.botPositions.set(botId, position);
  }

  /**
   * Bot decision making based on user orders
   * @param userOrder User's order
   * @param marketData Current market data
   */
  private processBotResponseToUserOrder(userOrder: Order, marketData: SimulatedMarketData): void {
    const bots = this.bots.filter(bot => bot.isActive);
    
    // Use market price if order price is not defined
    const orderPrice = userOrder.price || marketData.price;
    
    bots.forEach(bot => {
      // Only market makers and trend followers respond to user orders
      if (bot.type === "marketMaker" || bot.type === "trendFollower") {
        // Calculate potential profit/loss for this bot
        let potentialPnL = 0;
        const botPosition = this.botPositions.get(bot.id);
        
        if (botPosition) {
          if (userOrder.type === 'buy') {
            // User buying - bots might sell if they have inventory
            if (botPosition.quantity > 0) {
              potentialPnL = userOrder.quantity * (orderPrice - botPosition.avgPrice);
            }
          } else {
            // User selling - bots might buy
            potentialPnL = userOrder.quantity * (botPosition.avgPrice - orderPrice);
          }
        }
        
        // Bots will act if there's potential profit or to provide liquidity
        const shouldAct = potentialPnL > 0 || bot.type === "marketMaker";
        
        if (shouldAct) {
          // Create bot order
          const botOrder: BotOrder = {
            id: `BOT-${bot.id}-${Date.now()}`,
            botId: bot.id,
            symbol: userOrder.symbol,
            type: userOrder.type === 'buy' ? 'sell' : 'buy', // Opposite to user order
            orderType: "Market",
            quantity: Math.min(userOrder.quantity, Math.floor(Math.random() * 100) + 10), // Partial fill
            price: orderPrice,
            timestamp: Date.now(),
            status: "pending"
          };
          
          // Add to pending orders
          this.botOrders.set(botOrder.id, botOrder);
        }
      }
    });
  }

  /**
   * Process pending bot orders
   * @param marketData Current market data
   */
  private processPendingBotOrders(marketData: SimulatedMarketData): void {
    this.botOrders.forEach((order, orderId) => {
      if (order.status === "pending") {
        // Simple matching logic - bots fill orders immediately
        order.status = "filled";
        this.botOrders.set(orderId, order);
        
        // Update bot position
        this.updateBotPosition(order.botId, order);
      }
    });
  }

  /**
   * Process a user order against the simulated market
   */
  public processUserOrder(order: Order): { success: boolean; filledPrice?: number; filledQuantity?: number } {
    const marketData = this.marketData.get(order.symbol);
    if (!marketData) {
      return { success: false };
    }

    // For market orders, match against existing depth
    let filledPrice: number | undefined;
    let filledQuantity: number | undefined;

    if (order.orderType === "Market") {
      if (order.type === "buy") {
        // Match against best ask (lowest ask price)
        const bestAsk = marketData.askDepth
          .filter(ask => ask.type === "ask" || ask.type === "marketMaker")
          .sort((a, b) => a.price - b.price)[0];
        
        if (bestAsk) {
          filledPrice = bestAsk.price;
          filledQuantity = order.quantity;
        }
      } else {
        // Match against best bid (highest bid price)
        const bestBid = marketData.bidDepth
          .filter(bid => bid.type === "bid" || bid.type === "marketMaker")
          .sort((a, b) => b.price - a.price)[0];
        
        if (bestBid) {
          filledPrice = bestBid.price;
          filledQuantity = order.quantity;
        }
      }
    } else if (order.orderType === "Limit") {
      // For limit orders, check if price crosses market
      if (order.type === "buy" && order.price && order.price >= marketData.price) {
        filledPrice = order.price;
        filledQuantity = order.quantity;
      } else if (order.type === "sell" && order.price && order.price <= marketData.price) {
        filledPrice = order.price;
        filledQuantity = order.quantity;
      }
    }

    // If order can be filled
    if (filledPrice !== undefined && filledQuantity !== undefined) {
      // Bots respond to user orders
      this.processBotResponseToUserOrder(order, marketData);
      
      // Process pending bot orders
      this.processPendingBotOrders(marketData);
      
      return { success: true, filledPrice, filledQuantity };
    }

    // Order didn't immediately fill - set to pending
    return { success: false };
  }

  /**
   * Generate price movement using Geometric Brownian Motion
   * @param currentPrice Current price
   * @param drift Drift term (expected return)
   * @param volatility Volatility parameter
   * @param timeStep Time step
   * @returns New price
   */
  private generateGBMPrice(currentPrice: number, drift: number, volatility: number, timeStep: number = 1): number {
    // Generate standard normal random variable using Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // GBM formula: S(t+dt) = S(t) * exp((drift - 0.5 * volatility^2) * dt + volatility * sqrt(dt) * Z)
    const dt = timeStep / (252 * 24 * 60 * 60); // Convert to years (assuming 252 trading days)
    const exponent = (drift - 0.5 * volatility * volatility) * dt + volatility * Math.sqrt(dt) * z;
    return currentPrice * Math.exp(exponent);
  }

  /**
   * Calculate dynamic volatility based on recent price history
   * @param symbol Trading symbol
   * @returns Dynamic volatility value
   */
  private calculateDynamicVolatility(symbol: string): number {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length < 2) {
      return SIMULATION_PARAMS.BASE_PRICE_VOLATILITY;
    }

    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      returns.push(Math.log(history[i] / history[i - 1]));
    }

    // Calculate standard deviation of returns (volatility)
    if (returns.length < 2) {
      return SIMULATION_PARAMS.BASE_PRICE_VOLATILITY;
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    // Annualize volatility (assuming 252 trading days)
    const annualizedVolatility = stdDev * Math.sqrt(252);
    
    // Ensure volatility is within reasonable bounds
    return Math.max(0.001, Math.min(0.1, annualizedVolatility));
  }
}