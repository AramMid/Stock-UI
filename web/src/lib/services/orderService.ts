import { Order } from "../order-management";
import { TradingPosition } from "../types";

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
  
  if (order.type === 'buy' && account.cash < cost) {
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