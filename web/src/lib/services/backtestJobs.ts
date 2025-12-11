// Shared backtest jobs storage

export interface StrategyRuleConditionCompareTo {
  indicator?: string;
  params?: { period?: number };
  value?: number;
}

export interface StrategyRuleCondition {
  indicator?: string;
  params?: { period?: number };
  operator: string;
  compare_to?: StrategyRuleConditionCompareTo;
}

export interface StrategyRule {
  ruleOrder: number;
  condition: StrategyRuleCondition;
  action: string;
}

export interface StrategyDefinition {
  name: string;
  description: string;
  rules: StrategyRule[];
}

export interface JobConfig {
  stop_loss: number;
  take_profit: number;
}

export interface StrategyData {
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

export interface BacktestResult {
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
  trades: {
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    profit: number;
    side: 'buy' | 'sell';
  }[];
}

export const backtestJobs = new Map<number, {
  id: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  strategyData: StrategyData;
  result?: BacktestResult;
  createdAt: Date;
}>();