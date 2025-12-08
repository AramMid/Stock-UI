import { NextResponse } from 'next/server';

// Define interfaces for our data structures
interface StrategyRuleConditionCompareTo {
  indicator?: string;
  params?: { period?: number };
  value?: number;
}

interface StrategyRuleCondition {
  indicator?: string;
  params?: { period?: number };
  operator: string;
  compare_to?: StrategyRuleConditionCompareTo;
}

interface StrategyRule {
  ruleOrder: number;
  condition: StrategyRuleCondition;
  action: string;
}

interface StrategyDefinition {
  name: string;
  description: string;
  rules: StrategyRule[];
}

interface JobConfig {
  stop_loss: number;
  take_profit: number;
}

interface StrategyData {
  strategy: StrategyDefinition;
  symbol: string;
  dataFrom: string;
  dataTo: string;
  priceSource: string;
  sessionId: null;
  initialCapital: number;
  commissionRate: number;
  jobConfig: JobConfig;
}

interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  profit: number;
  side: 'buy' | 'sell';
}

interface BacktestResult {
  strategyName: string;
  symbol: string;
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
  equityCurve: { time: number; value: number }[];
  underwater: { time: number; value: number }[];
  trades: BacktestTrade[];
}

// Mock backtest processing function
async function processBacktestStrategy(strategyData: StrategyData) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Extract strategy info
  const { strategy, symbol, initialCapital, commissionRate } = strategyData;
  
  // Generate mock results based on strategy
  const mockResults = {
    strategyName: strategy.name,
    symbol: symbol,
    initialCapital: initialCapital,
    finalCapital: initialCapital * (1 + (Math.random() * 0.2 - 0.05)), // Random return between -5% and +15%
    netProfit: 0,
    winRate: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    totalTrades: Math.floor(Math.random() * 50) + 10,
    equityCurve: [] as { time: number; value: number }[],
    underwater: [] as { time: number; value: number }[],
    trades: [] as BacktestTrade[],
  };
  
  // Calculate derived values
  mockResults.netProfit = mockResults.finalCapital - mockResults.initialCapital;
  mockResults.winRate = Math.random() * 100;
  mockResults.maxDrawdown = Math.random() * 20;
  mockResults.profitFactor = Math.random() * 3;
  
  // Generate mock equity curve
  const points = 50;
  for (let i = 0; i < points; i++) {
    mockResults.equityCurve.push({
      time: Date.now() - (points - i) * 24 * 60 * 60 * 1000,
      value: mockResults.initialCapital + (mockResults.netProfit * i / points)
    });
  }
  
  // Generate mock underwater curve
  for (let i = 0; i < points; i++) {
    mockResults.underwater.push({
      time: Date.now() - (points - i) * 24 * 60 * 60 * 1000,
      value: -(Math.random() * mockResults.maxDrawdown)
    });
  }
  
  // Generate mock trades
  for (let i = 0; i < mockResults.totalTrades; i++) {
    const isWin = Math.random() > 0.5;
    const profit = isWin 
      ? Math.random() * (mockResults.netProfit / mockResults.totalTrades) * 2
      : -(Math.random() * (mockResults.netProfit / mockResults.totalTrades));
      
    mockResults.trades.push({
      entryTime: Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
      exitTime: Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000,
      entryPrice: 100 + Math.random() * 50,
      exitPrice: 100 + Math.random() * 50,
      quantity: Math.floor(Math.random() * 100) + 10,
      profit: profit,
      side: Math.random() > 0.5 ? 'buy' : 'sell'
    });
  }
  
  return mockResults;
}

export async function POST(request: Request) {
  try {
    // Parse the incoming JSON data
    const strategyData = await request.json();
    
    console.log('Received backtest request:', strategyData);
    
    // Validate required fields
    if (!strategyData.strategy || !strategyData.symbol) {
      return NextResponse.json(
        { error: 'Missing required fields: strategy and symbol' },
        { status: 400 }
      );
    }
    
    // Process the backtest strategy
    const results = await processBacktestStrategy(strategyData);
    
    // Return the results
    return NextResponse.json({
      success: true,
      data: results,
      message: 'Backtest completed successfully'
    });
  } catch (error) {
    console.error('Backtest API error:', error);
    return NextResponse.json(
      { error: 'Failed to process backtest request', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Backtest API endpoint',
    usage: 'POST strategy data to this endpoint to run a backtest'
  });
}