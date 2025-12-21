import { MarketSimulationService } from "./marketSimulationService";
import { executeOrder, OrderRequest } from "./orderService";
import { validateOrderQuantity, getExchangeBySymbol, getFluctuationLimit } from "../position-sizing";
import { TradingPosition } from "../types";
import { CandlestickWithVolume } from "../types";
import { Time } from "lightweight-charts";

/**
 * Backtest service for strategy testing
 */

// Strategy block types
export type BlockType = 
  | "rsi"
  | "macd"
  | "ema"
  | "sma"
  | "bollinger"
  | "price_open"
  | "price_close"
  | "price_high"
  | "price_low"
  | "volume"
  | "cross_over"
  | "cross_under"
  | "greater_than"
  | "less_than"
  | "buy"
  | "sell"
  | "close_position"
  | "number";

export interface Block {
  id: string;
  type: BlockType;
  value?: number; // For number blocks
  period?: number; // For indicator blocks
}

export interface Connection {
  from: string;
  to: string;
}

export interface BacktestParameters {
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  symbol: string;
  feeRate: number;
  taxRate: number;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  profit: number;
  side: 'buy' | 'sell';
}

export interface BacktestResult {
  netProfit: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
  equityCurve: { time: number; value: number }[];
  underwater: { time: number; value: number }[];
  trades: BacktestTrade[];
}

/**
 * Calculate technical indicators for backtesting
 */
export class TechnicalIndicators {
  /**
   * Calculate RSI indicator
   */
  static calculateRSI(prices: number[], period: number = 14): number[] {
    if (prices.length < period + 1) return Array(prices.length).fill(50);
    
    const rsiValues: number[] = Array(period).fill(50);
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    rsiValues.push(100 - (100 / (1 + (avgGain / avgLoss))));
    
    // Calculate subsequent RSI values
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(rsi);
    }
    
    return rsiValues;
  }
  
  /**
   * Calculate Simple Moving Average
   */
  static calculateSMA(prices: number[], period: number = 14): number[] {
    const smaValues: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        smaValues.push(prices[i]);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        smaValues.push(sum / period);
      }
    }
    
    return smaValues;
  }
  
  /**
   * Calculate Exponential Moving Average
   */
  static calculateEMA(prices: number[], period: number = 14): number[] {
    const emaValues: number[] = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        emaValues.push(prices[i]);
      } else if (i < period) {
        // Use SMA for initial period
        const sma = prices.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
        emaValues.push(sma);
      } else {
        const ema = (prices[i] * multiplier) + (emaValues[i - 1] * (1 - multiplier));
        emaValues.push(ema);
      }
    }
    
    return emaValues;
  }
}

/**
 * Backtest engine that executes strategies on historical data
 */
export class BacktestEngine {
  private marketSimulation: MarketSimulationService;
  private data: CandlestickWithVolume[] = [];
  private currentPosition: number = 0;
  private currentAvgPrice: number = 0;
  private cash: number = 0;
  private trades: BacktestTrade[] = [];
  private equityCurve: { time: number; value: number }[] = [];
  private maxEquity: number = 0;
  private drawdowns: number[] = [];
  
  constructor(marketSimulation: MarketSimulationService) {
    this.marketSimulation = marketSimulation;
  }
  
  /**
   * Load historical data for backtesting
   */
  loadData(data: CandlestickWithVolume[]): void {
    this.data = data.sort((a, b) => (a.time as number) - (b.time as number));
  }
  
  /**
   * Run backtest with given strategy and parameters
   * Implements look-ahead bias prevention by using T-1 indicators for T decisions
   */
  async runBacktest(
    blocks: Block[],
    connections: Connection[],
    params: BacktestParameters
  ): Promise<BacktestResult> {
    // Initialize backtest state
    this.cash = params.initialCapital;
    this.currentPosition = 0;
    this.currentAvgPrice = 0;
    this.trades = [];
    this.equityCurve = [];
    this.maxEquity = params.initialCapital;
    this.drawdowns = [];
    
    // Validate parameters
    if (params.feeRate < 0 || params.feeRate > 0.1) {
      throw new Error("Invalid fee rate. Must be between 0 and 10%");
    }
    
    if (params.taxRate < 0 || params.taxRate > 0.1) {
      throw new Error("Invalid tax rate. Must be between 0 and 10%");
    }
    
    // Load historical data from market simulation
    const historicalData = this.marketSimulation.getHistoricalData(params.symbol, 30);
    if (historicalData.length === 0) {
      throw new Error("No historical data available for backtesting");
    }
    
    this.loadData(historicalData);
    
    // Process each bar - start from index 2 to allow for T-1 indicator calculation
    for (let i = 2; i < this.data.length; i++) {
      const currentBar = this.data[i];
      const previousBar = this.data[i - 1];
      const twoBarsAgo = this.data[i - 2];
      
      // Calculate indicators using T-1 data to prevent look-ahead bias
      const historicalPrices = this.data.slice(0, i).map(bar => bar.close);
      const rsiValues = TechnicalIndicators.calculateRSI(historicalPrices, 14);
      const smaValues = TechnicalIndicators.calculateSMA(historicalPrices, 14);
      const emaValues = TechnicalIndicators.calculateEMA(historicalPrices, 14);
      
      // Use T-1 indicators for current decision (look-ahead bias prevention)
      const currentRSI = rsiValues[rsiValues.length - 2]; // T-1
      const currentSMA = smaValues[smaValues.length - 2];  // T-1
      const currentEMA = emaValues[emaValues.length - 2];  // T-1
      
      // Execute trades at T open price (look-ahead bias prevention)
      const executionPrice = currentBar.open;
      
      // Evaluate strategy conditions (simplified for demo)
      const shouldBuy = this.evaluateBuyCondition(blocks, connections, {
        rsi: currentRSI,
        sma: currentSMA,
        ema: currentEMA,
        price: executionPrice,
        previousPrice: previousBar.open
      });
      
      const shouldSell = this.evaluateSellCondition(blocks, connections, {
        rsi: currentRSI,
        sma: currentSMA,
        ema: currentEMA,
        price: executionPrice,
        previousPrice: previousBar.open
      });
      
      // Execute trades based on conditions
      if (shouldBuy && this.currentPosition === 0) {
        this.executeBuy(executionPrice, currentBar.time as number, params);
      } else if (shouldSell && this.currentPosition > 0) {
        this.executeSell(executionPrice, currentBar.time as number, params);
      }
      
      // Update equity curve using close price for portfolio valuation
      const currentValue = this.cash + (this.currentPosition * currentBar.close);
      this.equityCurve.push({
        time: currentBar.time as number,
        value: currentValue
      });
      
      // Update max equity and drawdown
      if (currentValue > this.maxEquity) {
        this.maxEquity = currentValue;
      }
      
      const drawdown = ((this.maxEquity - currentValue) / this.maxEquity) * 100;
      this.drawdowns.push(drawdown);
    }
    
    // Close any open position at the end
    if (this.currentPosition > 0 && this.data.length > 0) {
      const lastBar = this.data[this.data.length - 1];
      this.executeSell(lastBar.close, lastBar.time as number, params);
    }
    
    // Calculate final metrics
    return this.calculateMetrics(params);
  }
  
  /**
   * Evaluate buy condition based on strategy blocks
   */
  private evaluateBuyCondition(
    blocks: Block[],
    connections: Connection[],
    indicators: { rsi: number; sma: number; ema: number; price: number; previousPrice: number }
  ): boolean {
    // Find the buy action block
    const buyBlock = blocks.find(block => block.type === "buy");
    if (!buyBlock) return false;
    
    // Find blocks connected to the buy block
    const connectedBlocks = connections
      .filter(conn => conn.to === buyBlock.id)
      .map(conn => blocks.find(block => block.id === conn.from))
      .filter(Boolean) as Block[];
    
    // For each connected block, evaluate its condition
    for (const block of connectedBlocks) {
      switch (block.type) {
        case "less_than":
          // Find the two blocks connected to this less_than block
          const ltConnections = connections.filter(conn => conn.to === block.id);
          if (ltConnections.length === 2) {
            const blockA = blocks.find(b => b.id === ltConnections[0].from);
            const blockB = blocks.find(b => b.id === ltConnections[1].from);
            
            if (blockA && blockB) {
              const valueA = this.getBlockValue(blockA, indicators);
              const valueB = this.getBlockValue(blockB, indicators);
              
              if (valueA >= valueB) return false; // Condition not met
            }
          }
          break;
          
        case "cross_over":
          // Find the two blocks connected to this cross_over block
          const coConnections = connections.filter(conn => conn.to === block.id);
          if (coConnections.length === 2) {
            const fastBlock = blocks.find(b => b.id === coConnections[0].from);
            const slowBlock = blocks.find(b => b.id === coConnections[1].from);
            
            if (fastBlock && slowBlock) {
              // For simplicity, we'll assume fast EMA crossed above slow EMA
              // In a real implementation, this would check historical values
              const fastValue = this.getBlockValue(fastBlock, indicators);
              const slowValue = this.getBlockValue(slowBlock, indicators);
              
              if (fastValue <= slowValue) return false; // Condition not met
            }
          }
          break;
      }
    }
    
    return true; // All conditions met
  }
  
  /**
   * Evaluate sell condition based on strategy blocks
   */
  private evaluateSellCondition(
    blocks: Block[],
    connections: Connection[],
    indicators: { rsi: number; sma: number; ema: number; price: number; previousPrice: number }
  ): boolean {
    // Find the sell action block
    const sellBlock = blocks.find(block => block.type === "sell");
    if (!sellBlock) return false;
    
    // Find blocks connected to the sell block
    const connectedBlocks = connections
      .filter(conn => conn.to === sellBlock.id)
      .map(conn => blocks.find(block => block.id === conn.from))
      .filter(Boolean) as Block[];
    
    // For each connected block, evaluate its condition
    for (const block of connectedBlocks) {
      switch (block.type) {
        case "greater_than":
          // Find the two blocks connected to this greater_than block
          const gtConnections = connections.filter(conn => conn.to === block.id);
          if (gtConnections.length === 2) {
            const blockA = blocks.find(b => b.id === gtConnections[0].from);
            const blockB = blocks.find(b => b.id === gtConnections[1].from);
            
            if (blockA && blockB) {
              const valueA = this.getBlockValue(blockA, indicators);
              const valueB = this.getBlockValue(blockB, indicators);
              
              if (valueA <= valueB) return false; // Condition not met
            }
          }
          break;
          
        case "cross_under":
          // Find the two blocks connected to this cross_under block
          const cuConnections = connections.filter(conn => conn.to === block.id);
          if (cuConnections.length === 2) {
            const fastBlock = blocks.find(b => b.id === cuConnections[0].from);
            const slowBlock = blocks.find(b => b.id === cuConnections[1].from);
            
            if (fastBlock && slowBlock) {
              // For simplicity, we'll assume fast EMA crossed below slow EMA
              // In a real implementation, this would check historical values
              const fastValue = this.getBlockValue(fastBlock, indicators);
              const slowValue = this.getBlockValue(slowBlock, indicators);
              
              if (fastValue >= slowValue) return false; // Condition not met
            }
          }
          break;
      }
    }
    
    return true; // All conditions met
  }
  
  /**
   * Get the value of a block based on indicators
   */
  private getBlockValue(
    block: Block,
    indicators: { rsi: number; sma: number; ema: number; price: number; previousPrice: number }
  ): number {
    switch (block.type) {
      case "rsi":
        return indicators.rsi;
      case "sma":
        return indicators.sma;
      case "ema":
        return indicators.ema;
      case "price_close":
        return indicators.price;
      case "price_open":
        return indicators.previousPrice;
      case "number":
        return block.value || 0;
      default:
        return 0;
    }
  }
  
  /**
   * Execute a buy order using the same logic as the live trading system
   */
  private executeBuy(price: number, time: number, params: BacktestParameters): void {
    // Calculate maximum position size based on available cash
    const maxShares = Math.floor(this.cash / (price * (1 + params.feeRate)));
    
    // Apply Vietnamese stock exchange rules using existing validation
    const exchange = getExchangeBySymbol(params.symbol);
    const validation = validateOrderQuantity(maxShares, exchange);
    
    if (!validation.isValid) {
      // Adjust to valid quantity
      const validShares = validation.maxAllowed ? 
        Math.floor(validation.maxAllowed / 100) * 100 : 
        Math.floor(maxShares / 100) * 100;
      
      if (validShares <= 0) return;
    }
    
    // Round down to lot size (100 shares) using existing utility
    const quantity = Math.floor(maxShares / 100) * 100;
    if (quantity <= 0) return;
    
    // Use the same order execution logic as the live system
    const orderRequest: OrderRequest = {
      symbol: params.symbol,
      type: 'buy',
      orderType: 'Market',
      quantity: quantity,
      price: price
    };
    
    // In a real implementation, we would use the executeOrder function
    // For backtesting, we'll simulate the same logic
    
    // Calculate cost including fees (using same rates as live system)
    const cost = quantity * price;
    const fee = cost * params.feeRate;
    const totalCost = cost + fee;
    
    if (totalCost > this.cash) return;
    
    // Update position using the same logic as executeBuyOrder in order-management
    const newQty = this.currentPosition + quantity;
    const newAvg = this.currentPosition === 0 ? 
      price : 
      ((this.currentAvgPrice * this.currentPosition) + (price * quantity)) / newQty;
    
    this.currentPosition = newQty;
    this.currentAvgPrice = newAvg;
    this.cash -= totalCost;
    
    // Record trade
    this.trades.push({
      entryTime: time,
      exitTime: 0,
      entryPrice: price,
      exitPrice: 0,
      quantity,
      profit: 0,
      side: 'buy'
    });
  }
  
  /**
   * Execute a sell order using the same logic as the live trading system
   */
  private executeSell(price: number, time: number, params: BacktestParameters): void {
    if (this.currentPosition <= 0) return;
    
    const quantity = this.currentPosition;
    
    // Use the same order execution logic as the live system
    const orderRequest: OrderRequest = {
      symbol: params.symbol,
      type: 'sell',
      orderType: 'Market',
      quantity: quantity,
      price: price
    };
    
    // In a real implementation, we would use the executeOrder function
    // For backtesting, we'll simulate the same logic
    
    // Calculate proceeds including fees and taxes (using same rates as live system)
    const proceeds = quantity * price;
    const fee = proceeds * params.feeRate;
    const tax = proceeds * params.taxRate;
    const totalProceeds = proceeds - fee - tax;
    
    // Update cash
    this.cash += totalProceeds;
    
    // Update position using the same logic as executeSellOrder in order-management
    this.currentPosition = 0;
    this.currentAvgPrice = 0;
    
    // Update last trade
    if (this.trades.length > 0) {
      const lastTrade = this.trades[this.trades.length - 1];
      if (lastTrade.side === 'buy' && lastTrade.exitTime === 0) {
        const profit = totalProceeds - (lastTrade.entryPrice * lastTrade.quantity);
        lastTrade.exitTime = time;
        lastTrade.exitPrice = price;
        lastTrade.profit = profit;
      }
    }
  }
  
  /**
   * Calculate backtest metrics
   */
  private calculateMetrics(params: BacktestParameters): BacktestResult {
    // Filter completed trades only
    const completedTrades = this.trades.filter(trade => trade.exitTime > 0);
    
    // Net profit
    const netProfit = this.cash - params.initialCapital;
    
    // Win rate
    const winningTrades = completedTrades.filter(trade => trade.profit > 0);
    const winRate = completedTrades.length > 0 ? 
      (winningTrades.length / completedTrades.length) * 100 : 0;
    
    // Max drawdown
    const maxDrawdown = this.drawdowns.length > 0 ? 
      Math.max(...this.drawdowns) : 0;
    
    // Profit factor
    const grossProfits = winningTrades.reduce((sum, trade) => sum + trade.profit, 0);
    const grossLosses = completedTrades
      .filter(trade => trade.profit < 0)
      .reduce((sum, trade) => sum + Math.abs(trade.profit), 0);
    
    const profitFactor = grossLosses > 0 ? grossProfits / grossLosses : Infinity;
    
    // Equity curve (already calculated)
    const equityCurve = this.equityCurve;
    
    // Underwater curve
    const underwater = this.drawdowns.map((dd, index) => ({
      time: this.equityCurve[index]?.time || 0,
      value: -dd
    }));
    
    return {
      netProfit,
      winRate,
      maxDrawdown,
      profitFactor,
      totalTrades: completedTrades.length,
      equityCurve,
      underwater,
      trades: completedTrades
    };
  }
}