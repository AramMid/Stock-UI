import { NextResponse } from 'next/server';
import { backtestJobs, StrategyData, BacktestResult } from '@/lib/services/backtestJobs';

interface BacktestJobResponse {
  jobId: number;
  symbol: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  dataFrom: string;
  dataTo: string;
  initialCapital: number;
  netProfit?: number;
  winRate?: number;
  maxDrawdown?: number;
  profitFactor?: number;
  totalTrades?: number;
  profitableTrades?: number;
  equityCurve?: { time: number; value: number }[];
  underwater?: { time: number; value: number }[];
  trades?: {
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    profit: number;
    side: 'buy' | 'sell';
  }[];
}



// Mock backtest processing function
async function processBacktestStrategy(strategyData: StrategyData, jobId: number) {
  // Update job status to RUNNING
  const job = backtestJobs.get(jobId);
  if (job) {
    job.status = 'RUNNING';
    backtestJobs.set(jobId, job);
  }
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
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
    trades: [] as BacktestResult['trades'],
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
      time: Math.floor((Date.now() - (points - i) * 24 * 60 * 60 * 1000) / 1000), // Unix timestamp in seconds
      value: mockResults.initialCapital + (mockResults.netProfit * i / points)
    });
  }
  
  // Generate mock underwater curve
  for (let i = 0; i < points; i++) {
    mockResults.underwater.push({
      time: Math.floor((Date.now() - (points - i) * 24 * 60 * 60 * 1000) / 1000), // Unix timestamp in seconds
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
      entryTime: Math.floor((Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) / 1000), // Unix timestamp in seconds
      exitTime: Math.floor((Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000) / 1000), // Unix timestamp in seconds
      entryPrice: 100 + Math.random() * 50,
      exitPrice: 100 + Math.random() * 50,
      quantity: Math.floor(Math.random() * 100) + 10,
      profit: profit,
      side: Math.random() > 0.5 ? 'buy' : 'sell'
    });
  }
  
  // Update job status to COMPLETED and store result
  const completedJob = backtestJobs.get(jobId);
  if (completedJob) {
    completedJob.status = 'COMPLETED';
    completedJob.result = mockResults;
    backtestJobs.set(jobId, completedJob);
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
    
    // Create a new job
    const jobId = Date.now(); // Simple ID generation (in a real app, use a proper ID generator)
    const newJob = {
      id: jobId,
      status: 'PENDING' as const,
      strategyData,
      createdAt: new Date(),
    };
    
    // Store the job
    backtestJobs.set(jobId, newJob);
    
    // Start processing the backtest strategy in the background
    processBacktestStrategy(strategyData, jobId).catch(error => {
      console.error('Background backtest processing error:', error);
      // Update job status to FAILED
      const failedJob = backtestJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'FAILED';
        backtestJobs.set(jobId, failedJob);
      }
    });
    
    // Return job ID immediately
    return NextResponse.json({
      success: true,
      data: {
        job_id: jobId,
        status: 'PENDING'
      },
      timestamp: new Date().toISOString()
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
  // General endpoint info
  return NextResponse.json({
    message: 'Backtest API endpoint',
    usage: 'POST strategy data to this endpoint to run a backtest, or GET /api/backtests/{jobId} to retrieve results'
  });
}