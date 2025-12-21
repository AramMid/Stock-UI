import { OrderStatus } from "./services/orderService";
import { roundDownToLotSize } from "./position-sizing";

export interface Order {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  timestamp: Date;
  canceledTime?: Date;
  updatedTime?: Date;
  takeProfitEnabled?: boolean;
  takeProfitPrice?: number;
  stopLossEnabled?: boolean;
  stopLossPrice?: number;
  filledQuantity?: number;
  filledPrice?: number;
}

export interface AccountState {
  cash: number;
  position: number;
  avgPrice: number;
  lastPrice: number;
  pnl: number;
}

/**
 * Execute a buy order
 * @param account Current account state
 * @param cash Available cash balance
 * @param quantity Number of shares to buy
 * @param price Price per share
 * @returns Updated account state and success status
 */
export function executeBuyOrder(account: AccountState, cash: number, quantity: number, price: number): { 
  updatedAccount: AccountState; 
  success: boolean;
  errorMessage?: string;
} {
  if (price <= 0) {
    return {
      updatedAccount: account,
      success: false,
      errorMessage: "Invalid price"
    };
  }
  
  // Ensure quantity is rounded to lot size
  const validQuantity = roundDownToLotSize(quantity);
  const cost = validQuantity * price;
  if (cash < cost) {
    return {
      updatedAccount: account,
      success: false,
      errorMessage: "Not enough cash"
    };
  }

  const newQty = account.position + validQuantity;
  const newAvg = account.position === 0 
    ? price 
    : (account.avgPrice * account.position + cost) / newQty;

  const updatedAccount: AccountState = {
    ...account,
    // cash field will be updated separately in the trading hook
    position: newQty,
    avgPrice: newAvg
  };

  return {
    updatedAccount,
    success: true
  };
}

/**
 * Execute a sell order
 * @param account Current account state
 * @param cash Available cash balance (for consistency with buy order)
 * @param quantity Number of shares to sell
 * @param price Price per share
 * @returns Updated account state and success status
 */
export function executeSellOrder(account: AccountState, cash: number, quantity: number, price: number): { 
  updatedAccount: AccountState; 
  success: boolean;
  errorMessage?: string;
} {
  // Ensure quantity is rounded to lot size
  const validQuantity = roundDownToLotSize(quantity);
  
  if (account.position < validQuantity) {
    return {
      updatedAccount: account,
      success: false,
      errorMessage: "Not enough shares"
    };
  }

  const proceeds = validQuantity * price;
  const newPosition = account.position - validQuantity;
  
  const updatedAccount: AccountState = {
    ...account,
    // cash field will be updated separately in the trading hook
    position: newPosition,
    avgPrice: newPosition <= 0 ? 0 : account.avgPrice
  };

  return {
    updatedAccount,
    success: true
  };
}

/**
 * Format currency in VND
 * @param value Amount to format
 * @returns Formatted VND string
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Format currency in VND with currency symbol
 * @param value Amount to format
 * @returns Formatted VND string with currency symbol
 */
export function formatVNDCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Calculate PnL based on current position and price
 * @param position Number of shares held
 * @param avgPrice Average purchase price
 * @param currentPrice Current market price
 * @returns Profit/Loss value
 */
export function calculatePnL(position: number, avgPrice: number, currentPrice: number): number {
  return position * (currentPrice - avgPrice);
}