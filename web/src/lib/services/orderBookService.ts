import { OrderBook, OrderBookLevel, OrderBookUpdate, Trade } from "../types";
import { Order } from "../order-management";
import { OrderStatus } from "./orderService";

export class OrderBookService {
  private orderBook: OrderBook;
  private trades: Trade[] = [];
  private orders: Map<string, Order> = new Map();

  constructor() {
    // Initialize with empty order book
    this.orderBook = {
      bids: [],
      asks: [],
      lastTradedPrice: 0,
      timestamp: new Date()
    };
  }

  // Add a new order to the order book
  addOrder(order: Order): void {
    this.orders.set(order.id, order);
    
    // In a real implementation, this would update the order book levels
    // For now, we'll just simulate
    this.simulateOrderBookUpdate();
  }

  // Cancel an order
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    order.status = "CANCELED";
    this.orders.set(orderId, order);
    
    // In a real implementation, this would remove the order from the order book
    this.simulateOrderBookUpdate();
    return true;
  }

  // Update an order
  updateOrder(orderId: string, updates: Partial<Order>): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    const updatedOrder = { ...order, ...updates };
    this.orders.set(orderId, updatedOrder);
    
    // In a real implementation, this would update the order book
    this.simulateOrderBookUpdate();
    return true;
  }

  // Get current order book
  getOrderBook(): OrderBook {
    return { ...this.orderBook };
  }

  // Get recent trades
  getRecentTrades(limit: number = 50): Trade[] {
    return [...this.trades].slice(-limit);
  }

  // Get order by ID
  getOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  // Get all orders
  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  // Simulate order book updates (in a real implementation, this would come from WebSocket)
  private simulateOrderBookUpdate(): void {
    // Generate random order book data for demonstration
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    
    // Generate bid levels (buy orders) - prices from high to low
    for (let i = 0; i < 10; i++) {
      bids.push({
        price: 100000 - i * 500,
        totalQuantity: Math.floor(Math.random() * 1000) + 100,
        orderCount: Math.floor(Math.random() * 20) + 1
      });
    }
    
    // Generate ask levels (sell orders) - prices from low to high
    for (let i = 0; i < 10; i++) {
      asks.push({
        price: 100500 + i * 500,
        totalQuantity: Math.floor(Math.random() * 1000) + 100,
        orderCount: Math.floor(Math.random() * 20) + 1
      });
    }
    
    this.orderBook = {
      bids,
      asks,
      lastTradedPrice: 100000 + (Math.random() * 1000 - 500),
      timestamp: new Date()
    };
    
    // Add a random trade
    if (Math.random() > 0.7) {
      this.trades.push({
        id: `TRADE${Date.now()}`,
        price: this.orderBook.lastTradedPrice,
        quantity: Math.floor(Math.random() * 100) + 10,
        timestamp: new Date(),
        side: Math.random() > 0.5 ? 'buy' : 'sell'
      });
      
      // Keep only last 100 trades
      if (this.trades.length > 100) {
        this.trades = this.trades.slice(-100);
      }
    }
  }

  // Matching engine logic
  matchOrders(): void {
    // In a real implementation, this would implement the matching logic:
    // 1. Price priority (best prices first)
    // 2. Time priority (first come first served for same price)
    // 3. Partial fills
    // 4. Market order handling
    
    // For now, we'll just simulate some matches
    this.orders.forEach((order, id) => {
      // Randomly match some orders for demonstration
      if (order.status === "NEW" && Math.random() > 0.8) {
        const filledQuantity = Math.random() > 0.5 ? order.quantity : Math.floor(order.quantity * Math.random());
        const status: OrderStatus = filledQuantity === order.quantity ? "FILLED" : "PARTIALLY_FILLED";
        
        const updatedOrder: Order = {
          ...order,
          status,
          filledQuantity,
          filledPrice: order.price || this.orderBook.lastTradedPrice
        };
        
        this.orders.set(id, updatedOrder);
      }
    });
    
    this.simulateOrderBookUpdate();
  }
}

// Create a singleton instance
export const orderBookService = new OrderBookService();