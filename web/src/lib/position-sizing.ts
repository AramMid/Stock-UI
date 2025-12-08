/**
 * Position Sizing Utilities for Vietnamese Stock Market
 * 
 * This module provides functions to calculate valid position sizes according to
 * Vietnamese stock exchange regulations:
 * 1. LOT_SIZE = 100 shares per lot
 * 2. Maximum order quantity limits (HOSE: 500,000 shares per order)
 * 3. Buying power constraints based on available cash
 */

// Constants for Vietnamese stock exchanges
export const LOT_SIZE = 100; // Standard lot size in Vietnam
export const MAX_HOSE_ORDER_QUANTITY = 500000; // 500,000 shares per order on HOSE
export const MAX_HNX_UPCOM_ORDER_QUANTITY = 1000000; // 1,000,000 shares per order on HNX/UPCOM

// Fluctuation limits for Vietnamese stock exchanges
export const FLUCTUATION_LIMIT_HOSE = 0.07; // ±7% for HOSE
export const FLUCTUATION_LIMIT_HNX = 0.10; // ±10% for HNX
export const FLUCTUATION_LIMIT_UPCOM = 0.15; // ±15% for UPCOM

/**
 * Calculate maximum position size based on available cash and price
 * @param availableCash Available cash balance
 * @param pricePerShare Current price per share
 * @param exchange Exchange where the stock is traded (defaults to HOSE)
 * @returns Maximum number of shares that can be bought
 */
export function calculateMaxPositionSize(
  availableCash: number,
  pricePerShare: number,
  exchange: 'HOSE' | 'HNX' | 'UPCOM' = 'HOSE'
): number {
  if (pricePerShare <= 0) return 0;

  // Calculate maximum shares based on available cash
  const maxSharesByCash = Math.floor(availableCash / pricePerShare);

  // Apply exchange-specific quantity limits
  const maxOrderQuantity = exchange === 'HOSE' 
    ? MAX_HOSE_ORDER_QUANTITY 
    : MAX_HNX_UPCOM_ORDER_QUANTITY;

  // Return the minimum of cash-constrained quantity and exchange limit
  return Math.min(maxSharesByCash, maxOrderQuantity);
}

/**
 * Convert shares to lots (rounded down to nearest lot)
 * @param shares Number of shares
 * @returns Number of complete lots
 */
export function sharesToLots(shares: number): number {
  return Math.floor(shares / LOT_SIZE);
}

/**
 * Convert lots to shares
 * @param lots Number of lots
 * @returns Number of shares
 */
export function lotsToShares(lots: number): number {
  return lots * LOT_SIZE;
}

/**
 * Round down shares to nearest lot size
 * @param shares Number of shares
 * @returns Number of shares rounded down to nearest lot
 */
export function roundDownToLotSize(shares: number): number {
  return Math.floor(shares / LOT_SIZE) * LOT_SIZE;
}

/**
 * Split large order into multiple smaller orders to comply with exchange limits
 * @param totalQuantity Total quantity to order
 * @param exchange Exchange where the stock is traded
 * @returns Array of order quantities that comply with exchange limits
 */
export function splitOrderForExchangeLimit(
  totalQuantity: number,
  exchange: 'HOSE' | 'HNX' | 'UPCOM' = 'HOSE'
): number[] {
  const maxOrderQuantity = exchange === 'HOSE' 
    ? MAX_HOSE_ORDER_QUANTITY 
    : MAX_HNX_UPCOM_ORDER_QUANTITY;

  if (totalQuantity <= maxOrderQuantity) {
    return [totalQuantity];
  }

  const orders: number[] = [];
  let remainingQuantity = totalQuantity;

  while (remainingQuantity > 0) {
    const orderQuantity = Math.min(remainingQuantity, maxOrderQuantity);
    orders.push(orderQuantity);
    remainingQuantity -= orderQuantity;
  }

  return orders;
}

/**
 * Determine exchange based on stock symbol
 * @param symbol Stock symbol
 * @returns Exchange name
 */
export function getExchangeBySymbol(symbol: string): 'HOSE' | 'HNX' | 'UPCOM' {
  // Based on the data in StockInfoSection.tsx, all .VN stocks are on HOSE
  // In a real implementation, this would be more sophisticated
  if (symbol.endsWith('.VN')) {
    return 'HOSE';
  }
  
  // For non-Vietnamese stocks, default to HOSE for simulation purposes
  return 'HOSE';
}

/**
 * Get fluctuation limit for an exchange
 * @param exchange Exchange name
 * @returns Fluctuation limit as a decimal (e.g., 0.07 for 7%)
 */
export function getFluctuationLimit(exchange: 'HOSE' | 'HNX' | 'UPCOM'): number {
  switch (exchange) {
    case 'HOSE':
      return FLUCTUATION_LIMIT_HOSE;
    case 'HNX':
      return FLUCTUATION_LIMIT_HNX;
    case 'UPCOM':
      return FLUCTUATION_LIMIT_UPCOM;
    default:
      return FLUCTUATION_LIMIT_HOSE;
  }
}

/**
 * Calculate reference, ceiling, and floor prices for a stock
 * @param referencePrice Reference price (usually yesterday's closing price)
 * @param exchange Exchange where the stock is traded
 * @returns Object containing reference, ceiling, and floor prices
 */
export function calculatePriceBands(
  referencePrice: number,
  exchange: 'HOSE' | 'HNX' | 'UPCOM' = 'HOSE'
): { reference: number; ceiling: number; floor: number } {
  const flucLimit = getFluctuationLimit(exchange);
  
  // Calculate ceiling and floor prices with proper rounding
  const ceiling = Math.floor(referencePrice * (1 + flucLimit));
  const floor = Math.ceil(referencePrice * (1 - flucLimit));
  
  return {
    reference: referencePrice,
    ceiling,
    floor
  };
}

/**
 * Validate if an order quantity is valid according to exchange rules
 * @param quantity Order quantity in shares
 * @param exchange Exchange where the stock is traded
 * @returns Object containing validation result and details
 */
export function validateOrderQuantity(
  quantity: number,
  exchange: 'HOSE' | 'HNX' | 'UPCOM' = 'HOSE'
): { isValid: boolean; message: string; maxAllowed?: number } {
  // Check if quantity is positive
  if (quantity <= 0) {
    return {
      isValid: false,
      message: "Quantity must be positive"
    };
  }

  // Check if quantity is a multiple of lot size
  if (quantity % LOT_SIZE !== 0) {
    return {
      isValid: false,
      message: `Quantity must be a multiple of ${LOT_SIZE} (lot size)`
    };
  }

  // Check exchange-specific limits
  const maxOrderQuantity = exchange === 'HOSE' 
    ? MAX_HOSE_ORDER_QUANTITY 
    : MAX_HNX_UPCOM_ORDER_QUANTITY;

  if (quantity > maxOrderQuantity) {
    return {
      isValid: false,
      message: `Quantity ${quantity} exceeds maximum limit of ${maxOrderQuantity} shares per order`,
      maxAllowed: maxOrderQuantity
    };
  }

  return {
    isValid: true,
    message: "Order quantity is valid"
  };
}