import { Order } from "../order-management";
import { TradingPosition } from "../types";
import { validateOrderQuantity, roundDownToLotSize, getExchangeBySymbol, getFluctuationLimit } from "../position-sizing";

export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';

export interface OrderRequest {
  symbol: string;
  type: 'buy' | 'sell';
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfitEnabled?: boolean;
  takeProfitPrice?: number;
  stopLossEnabled?: boolean;
  stopLossPrice?: number;
}

export interface ExecutionReport {
  orderId: string;
  status: OrderStatus;
  filledQuantity: number;
  filledPrice?: number;
  errorMessage?: string;
}

/**
 * Simulate order execution
 * @param order The order to execute
 * @param account The current account state
 * @returns Execution report with status and details
 */
export function executeOrder(order: OrderRequest, account: TradingPosition): ExecutionReport {
  // Validate order
  if (order.quantity <= 0) {
    return {
      orderId: `ORD${Date.now()}`,
      status: 'REJECTED',
      filledQuantity: 0,
      errorMessage: 'Invalid quantity'
    };
  }

  // Validate order quantity according to Vietnamese exchange rules
  const validation = validateOrderQuantity(order.quantity);
  if (!validation.isValid) {
    return {
      orderId: `ORD${Date.now()}`,
      status: 'REJECTED',
      filledQuantity: 0,
      errorMessage: validation.message
    };
  }
  const FEE_RATE = 0.0015;
const TAX_RATE = 0.001;

type Side = "buy" | "sell";

type PositionLot = {
  qty: number;
  avgCost: number; // giá vốn /1 cp, đã bao gồm phí BUY
};

type PnlState = {
  cash: number;
  realized: number;
  positions: Record<string, PositionLot>; // key = symbol
};

function applyFill(
  prev: PnlState,
  fill: { symbol: string; side: Side; qty: number; price: number }
): PnlState {
  const { symbol, side, qty, price } = fill;
  if (!Number.isFinite(qty) || qty <= 0) return prev;
  if (!Number.isFinite(price) || price <= 0) return prev;

  const positions = { ...prev.positions };
  const pos = positions[symbol] ?? { qty: 0, avgCost: 0 };

  const gross = price * qty;

  if (side === "buy") {
    const fee = gross * FEE_RATE;
    const totalCost = gross + fee;

    const newQty = pos.qty + qty;
    const newAvgCost =
      newQty > 0 ? (pos.qty * pos.avgCost + totalCost) / newQty : 0;

    positions[symbol] = { qty: newQty, avgCost: newAvgCost };

    return {
      cash: prev.cash - totalCost,
      realized: prev.realized,
      positions,
    };
  }

  // sell
  const fee = gross * FEE_RATE;
  const tax = gross * TAX_RATE;
  const proceeds = gross - fee - tax;

  const sellQty = Math.min(qty, pos.qty); // long-only guard
  const realizedDelta = proceeds - pos.avgCost * sellQty;
  const newQty = pos.qty - sellQty;

  positions[symbol] = newQty > 0 ? { qty: newQty, avgCost: pos.avgCost } : { qty: 0, avgCost: 0 };

  return {
    cash: prev.cash + proceeds,
    realized: prev.realized + realizedDelta,
    positions,
  };
}

function computeUnrealized(positions: Record<string, PositionLot>, lastPrices: Record<string, number>) {
  let u = 0;
  for (const [sym, p] of Object.entries(positions)) {
    if (p.qty <= 0) continue;
    const last = lastPrices[sym];
    if (!Number.isFinite(last) || last <= 0) continue; // ✅ chống NaN
    u += (last - p.avgCost) * p.qty;
  }
  return u;
}


  // For market orders, use current price
  // For StopLimit orders, we need both stopPrice and price
  let executionPrice = 0;
  if (order.orderType === 'Market') {
    executionPrice = order.price || 0;
  } else if (order.orderType === 'StopLimit') {
    // For StopLimit, we would check if stopPrice is hit, then place limit order at price
    // For simulation, we'll just use the limit price if both are provided
    executionPrice = (order.price && order.stopPrice) ? order.price : (order.price || order.stopPrice || 0);
  } else {
    executionPrice = order.price || 0;
  }

  if (executionPrice <= 0) {
    return {
      orderId: `ORD${Date.now()}`,
      status: 'REJECTED',
      filledQuantity: 0,
      errorMessage: 'Invalid price'
    };
  }

  // Check if order can be filled
  const cost = order.quantity * executionPrice;

  let totalCost = cost;
if (order.type === 'buy') {
    totalCost = cost * (1 + FEE_RATE);
  } else if (order.type === 'sell') {
    totalCost = cost * (1 + FEE_RATE + TAX_RATE);
  }
  
  if (order.type === 'buy' && account.cash < totalCost) {
    return {
      orderId: `ORD${Date.now()}`,
      status: 'REJECTED',
      filledQuantity: 0,
      errorMessage: 'Insufficient funds'
    };
  }
  
  if (order.type === 'sell' && account.position < order.quantity) {
    return {
      orderId: `ORD${Date.now()}`,
      status: 'REJECTED',
      filledQuantity: 0,
      errorMessage: 'Insufficient shares'
    };
  }

  // Order is valid and can be filled
  return {
    orderId: `ORD${Date.now()}`,
    status: 'FILLED',
    filledQuantity: order.quantity,
    filledPrice: executionPrice
  };
}

/**
 * Create a new order from request
 * @param orderRequest The order request details
 * @returns New order object
 */
export function createOrder(orderRequest: OrderRequest): Order {
  const order: Order = {
    id: `ORD${Date.now()}`,
    symbol: orderRequest.symbol,
    type: orderRequest.type,
    orderType: orderRequest.orderType,
    quantity: orderRequest.quantity,
    price: orderRequest.price,
    stopPrice: orderRequest.stopPrice,
    status: 'NEW',
    timestamp: new Date(),
    takeProfitEnabled: orderRequest.takeProfitEnabled,
    takeProfitPrice: orderRequest.takeProfitPrice,
    stopLossEnabled: orderRequest.stopLossEnabled,
    stopLossPrice: orderRequest.stopLossPrice
  };
  
  return order;
}

/**
 * Update order status
 * @param order The order to update
 * @param status New status
 * @param filledQuantity Quantity filled (if applicable)
 * @param filledPrice Price filled at (if applicable)
 * @returns Updated order
 */
export function updateOrderStatus(
  order: Order, 
  status: OrderStatus, 
  filledQuantity?: number, 
  filledPrice?: number
): Order {
  const updatedOrder = { ...order };
  updatedOrder.status = status;
  
  if (filledQuantity !== undefined) {
    updatedOrder.filledQuantity = filledQuantity;
  }
  
  if (filledPrice !== undefined) {
    updatedOrder.filledPrice = filledPrice;
  }
  
  return updatedOrder;
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