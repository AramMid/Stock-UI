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
  trades?: BacktestResult['trades'];
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
  const mockResults: BacktestResult = {
    strategyName: strategy.name,
    symbol: symbol,
    initialCapital: initialCapital,
    finalCapital: initialCapital * (1 + (Math.random() * 0.2 - 0.05)), // Random return between -5% and +15%
    netProfit: 0,
    winRate: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    totalTrades: Math.floor(Math.random() * 50) + 10,
    equityCurve: [],
    underwater: [],
    trades: [],
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



export async function GET(request: Request, { params }: { params: { id: string } }) {
  const jobId = parseInt(params.id);
  
  // Retrieve the job
  const job = backtestJobs.get(jobId);
  
  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }
  
  // Prepare job status and result if available
  const data: BacktestJobResponse = {
    jobId: job.id,
    symbol: job.strategyData.symbol,
    status: job.status,
    dataFrom: job.strategyData.dataFrom,
    dataTo: job.strategyData.dataTo,
    initialCapital: job.strategyData.initialCapital,
  };
  
  // Add result data if job is completed
  if (job.status === 'COMPLETED' && job.result) {
    data.netProfit = job.result.netProfit;
    data.winRate = job.result.winRate;
    data.maxDrawdown = job.result.maxDrawdown;
    data.profitFactor = job.result.profitFactor;
    data.totalTrades = job.result.totalTrades;
    data.profitableTrades = job.result.trades.filter(t => t.profit > 0).length;
    data.equityCurve = job.result.equityCurve;
    data.underwater = job.result.underwater;
    data.trades = job.result.trades;
  }
  
  const responseData = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(responseData);
}