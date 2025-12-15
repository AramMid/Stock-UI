import { OrderBook, OrderBookLevel, OrderBookUpdate, Trade } from "../types";
import { Order } from "../order-management";
import { OrderStatus } from "./orderService";
import { MarketSimulationService } from "./marketSimulationService";
import { MarketDepthLevel, SimulatedMarketData } from "./marketSimulationService";
import { validateOrderQuantity, getExchangeBySymbol, getFluctuationLimit } from "../position-sizing";
import { WebSocketService } from "./webSocketService";

export class OrderBookService {
  private orderBook: OrderBook;
  private trades: Trade[] = [];
  private orders: Map<string, Order> = new Map();
  private marketSimulation: MarketSimulationService;
  private matchingInterval: NodeJS.Timeout | null = null;
  private orderBookUpdateCallbacks: ((orderBook: OrderBook) => void)[] = [];

  constructor() {
    // Initialize with empty order book
    this.orderBook = {
      bids: [],
      asks: [],
      lastTradedPrice: 0, // No default price - will be set by market data
      timestamp: new Date(),
      symbol: "VIC.VN",
      spread: 0,
      totalBidVolume: 0,
      totalAskVolume: 0
    };

    // Initialize market simulation
    this.marketSimulation = new MarketSimulationService();
    
    // Start listening to market simulation updates
    this.startMarketSimulation();
  }

  // Start market simulation and order matching
  private startMarketSimulation(): void {
    // Start the market simulation
    this.marketSimulation.startSimulation((marketData) => {
      this.updateOrderBookFromMarketData(marketData);
    });

    // Start order matching engine
    this.startMatchingEngine();
  }

  // Start the matching engine
  private startMatchingEngine(): void {
    this.matchingInterval = setInterval(() => {
      this.matchOrders();
    }, 1000); // Match every second
  }

  // Stop the matching engine
  private stopMatchingEngine(): void {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
  }

  // Add a new order to the order book
// Add a new order to the order book
addOrder(order: Order): { success: boolean; message: string } {
  console.log(`[ORDER_BOOK] Adding order: ${order.id}, type: ${order.type}, price: ${order.price}, quantity: ${order.quantity}`);
  
  // Validate order
  const validation = this.validateOrder(order);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  // ✅ TRƯỚC KHI gửi vào simulation: Kiểm tra marketable limit order
  const marketData = this.marketSimulation.getMarketData(order.symbol);
  const isLimitOrder = order.orderType === "Limit" || order.orderType === "StopLimit";
  const orderPrice = order.price || 0;
  
  if (isLimitOrder && marketData && orderPrice > 0) {
    const currentPrice = marketData.price;
    const bestBid = marketData.bidDepth.length > 0 ? 
      Math.max(...marketData.bidDepth.map(l => l.price)) : 0;
    const bestAsk = marketData.askDepth.length > 0 ? 
      Math.min(...marketData.askDepth.map(l => l.price)) : Infinity;
    
    // ✅ KIỂM TRA MARKETABLE
    let isMarketable = false;
    let executionPrice = orderPrice;
    
    if (order.type === "buy") {
      // BUY LIMIT: Giá đặt >= bestAsk (có thể mua ngay)
      if (orderPrice >= bestAsk) {
        isMarketable = true;
        executionPrice = Math.min(orderPrice, bestAsk); // Ưu tiên giá tốt hơn
        console.log(`[MARKETABLE] Buy limit ${orderPrice} ≥ bestAsk ${bestAsk}`);
      }
      // Hoặc giá đặt >= currentPrice (thị trường đang cao hơn)
      else if (orderPrice >= currentPrice) {
        isMarketable = true;
        executionPrice = currentPrice;
        console.log(`[MARKETABLE] Buy limit ${orderPrice} ≥ market ${currentPrice}`);
      }
    } else {
      // SELL LIMIT: Giá đặt <= bestBid (có thể bán ngay)
      if (orderPrice <= bestBid) {
        isMarketable = true;
        executionPrice = Math.max(orderPrice, bestBid); // Ưu tiên giá tốt hơn
        console.log(`[MARKETABLE] Sell limit ${orderPrice} ≤ bestBid ${bestBid}`);
      }
      // Hoặc giá đặt <= currentPrice (thị trường đang thấp hơn)
      else if (orderPrice <= currentPrice) {
        isMarketable = true;
        executionPrice = currentPrice;
        console.log(`[MARKETABLE] Sell limit ${orderPrice} ≤ market ${currentPrice}`);
      }
    }
    
    // ✅ NẾU MARKETABLE: Khớp ngay không cần chờ simulation
    if (isMarketable) {
      console.log(`[IMMEDIATE_FILL] Marketable limit order ${order.id} filled immediately at ${executionPrice}`);
      
      // 1. Cập nhật order status
      order.status = "FILLED";
      order.filledQuantity = order.quantity;
      order.filledPrice = executionPrice;
      order.timestamp = new Date();
      
      // 2. Thêm vào danh sách orders (để tracking)
      this.orders.set(order.id, order);
      
      // 3. Tạo trade record
      this.addTrade({
        id: `TRADE-${Date.now()}-${order.id}`,
        price: executionPrice,
        quantity: order.quantity,
        timestamp: new Date(),
        side: order.type,
        symbol: order.symbol
      });
      
      // 4. Gửi WebSocket update ngay lập tức
      const ws = WebSocketService.getInstance();
      ws.sendOrderUpdate({
        orderId: order.id,
        status: "FILLED",
        filledPrice: executionPrice,
        filledQuantity: order.quantity,
        timestamp: Date.now()
      });
      
      // 5. Cập nhật order book
      this.updateOrderBook();
      
      // 6. Cập nhật market simulation với trade mới
      this.marketSimulation.getTradeHistory().push({
        timestamp: Date.now(),
        price: executionPrice,
        quantity: order.quantity,
        symbol: order.symbol,
        buyerBotId: order.type === "buy" ? undefined : "user",
        sellerBotId: order.type === "sell" ? undefined : "user",
        userId: order.id
      });
      
      return {
        success: true,
        message: `Marketable limit order filled immediately at ${executionPrice}`
      };
    }
  }

  // ✅ NẾU KHÔNG MARKETABLE: Gửi vào simulation như bình thường
  const simulationResult = this.marketSimulation.processUserOrder(order);
  
  if (simulationResult.success) {
    // Order was immediately matched by simulation
    order.status = "FILLED";
    order.filledQuantity = simulationResult.filledQuantity;
    order.filledPrice = simulationResult.filledPrice;
    order.timestamp = new Date();
    
    // Add to orders map
    this.orders.set(order.id, order);
    
    // Add trade record
    this.addTrade({
      id: `TRADE-${Date.now()}-${order.id}`,
      price: order.filledPrice!,
      quantity: order.filledQuantity!,
      timestamp: new Date(),
      side: order.type,
      symbol: order.symbol
    });

    // Update order book
    this.updateOrderBook();
    
    return { 
      success: true, 
      message: `Order filled immediately at ${order.filledPrice}` 
    };
  } else {
    // Order is pending, add to order book
    order.status = "NEW";
    order.timestamp = new Date();
    this.orders.set(order.id, order);
    
    // Update order book
    this.updateOrderBook();
    
    return { 
      success: true, 
      message: "Order added to order book" 
    };
  }
}

  // Validate order before adding
  private validateOrder(order: Order): { valid: boolean; message: string } {
    // Check required fields
    if (!order.symbol || !order.type || !order.quantity || order.quantity <= 0) {
      return { valid: false, message: "Invalid order parameters" };
    }

    // Check price for limit orders
    if (order.orderType === "Limit" && (!order.price || order.price <= 0)) {
      return { valid: false, message: "Limit orders require a valid price" };
    }

    // Check quantity limits according to Vietnamese exchange rules
    const validation = validateOrderQuantity(order.quantity);
    if (!validation.isValid) {
      return { valid: false, message: validation.message };
    }

    // Check price limits according to Vietnamese exchange fluctuation bands
    const marketData = this.marketSimulation.getMarketData(order.symbol);
    if (marketData && order.orderType === "Limit") {
      const currentPrice = marketData.price;
      const exchange = getExchangeBySymbol(order.symbol);
      const flucLimit = getFluctuationLimit(exchange);
      
      // Calculate ceiling and floor prices with proper rounding
      const ceilingPrice = Math.floor(currentPrice * (1 + flucLimit));
      const floorPrice = Math.ceil(currentPrice * (1 - flucLimit));

      if (order.price! > ceilingPrice || order.price! < floorPrice) {
        return { valid: false, message: `Price out of fluctuation band (Trần/Sàn). Valid range: ${floorPrice} - ${ceilingPrice}` };
      }
    }

    return { valid: true, message: "Order validated" };
  }

  // Cancel an order
  cancelOrder(orderId: string): { success: boolean; message: string } {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, message: "Order not found" };
    }

    // Check if order can be cancelled
    if (order.status === "FILLED" || order.status === "CANCELED") {
      return { success: false, message: `Order is already ${order.status}` };
    }

    // Update order status
    order.status = "CANCELED";
    order.canceledTime = new Date();
    this.orders.set(orderId, order);

    console.log(`[ORDER_BOOK] Canceled order: ${orderId}`);

    // Update order book
    this.updateOrderBook();

    return { success: true, message: "Order canceled successfully" };
  }

  // Update an order
  updateOrder(orderId: string, updates: Partial<Order>): { success: boolean; message: string } {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, message: "Order not found" };
    }

    // Check if order can be updated
    if (order.status === "FILLED" || order.status === "CANCELED") {
      return { success: false, message: `Cannot update ${order.status} order` };
    }

    // Don't allow changing critical fields
    const allowedUpdates = ["quantity", "price"];
    const filteredUpdates: Partial<Order> = {};

    for (const key in updates) {
      if (allowedUpdates.includes(key)) {
        if (key in filteredUpdates && updates[key as keyof Order] !== undefined) {
          // Type-safe assignment for allowed update fields
          if (key === "quantity") {
            filteredUpdates.quantity = updates.quantity;
          } else if (key === "price") {
            filteredUpdates.price = updates.price;
          }
        }
      }
    }

    // Validate new values
    if (filteredUpdates.quantity !== undefined && filteredUpdates.quantity <= 0) {
      return { success: false, message: "Quantity must be positive" };
    }

    if (filteredUpdates.price !== undefined && filteredUpdates.price <= 0) {
      return { success: false, message: "Price must be positive" };
    }

    // Update order
    const updatedOrder = { ...order, ...filteredUpdates, updatedTime: new Date() };
    this.orders.set(orderId, updatedOrder);

    console.log(`[ORDER_BOOK] Updated order: ${orderId}`, filteredUpdates);

    // Update order book
    this.updateOrderBook();

    return { success: true, message: "Order updated successfully" };
  }

  // Get current order book
  getOrderBook(symbol?: string): OrderBook {
    if (symbol) {
      // Get market depth for specific symbol
      const depth = this.marketSimulation.getMarketDepth(symbol);
      const marketData = this.marketSimulation.getMarketData(symbol);
      
      if (!marketData) {
        return this.orderBook;
      }

      const spread = this.calculateSpread(depth.bids, depth.asks);
      
      return {
        bids: depth.bids,
        asks: depth.asks,
        lastTradedPrice: marketData.price,
        timestamp: new Date(),
        symbol: symbol,
        spread: spread,
        totalBidVolume: depth.bids.reduce((sum, bid) => sum + bid.totalQuantity, 0),
        totalAskVolume: depth.asks.reduce((sum, ask) => sum + ask.totalQuantity, 0)
      };
    }
    
    return { ...this.orderBook };
  }

  // Get recent trades
  getRecentTrades(limit: number = 50, symbol?: string): Trade[] {
    const allTrades = this.marketSimulation.getTradeHistory(symbol);
    
    return allTrades
      .map(trade => ({
        id: `TRADE-${trade.timestamp}`,
        price: trade.price,
        quantity: trade.quantity,
        timestamp: new Date(trade.timestamp),
        side: trade.buyerBotId ? 'buy' : ('sell' as 'buy' | 'sell'),
        symbol: trade.symbol
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get order by ID
  getOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  // Get all orders
  getAllOrders(filters?: {
    status?: OrderStatus;
    type?: 'buy' | 'sell';
    symbol?: string;
  }): Order[] {
    let orders = Array.from(this.orders.values());

    if (filters) {
      if (filters.status) {
        orders = orders.filter(order => order.status === filters.status);
      }
      if (filters.type) {
        orders = orders.filter(order => order.type === filters.type);
      }
      if (filters.symbol) {
        orders = orders.filter(order => order.symbol === filters.symbol);
      }
    }

    return orders.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  // Register callback for order book updates
  onOrderBookUpdate(callback: (orderBook: OrderBook) => void): void {
    this.orderBookUpdateCallbacks.push(callback);
  }

  // Unregister callback
  offOrderBookUpdate(callback: (orderBook: OrderBook) => void): void {
    this.orderBookUpdateCallbacks = this.orderBookUpdateCallbacks.filter(cb => cb !== callback);
  }

  // Notify all callbacks of order book update
  private notifyOrderBookUpdate(orderBook: OrderBook): void {
    this.orderBookUpdateCallbacks.forEach(callback => {
      try {
        callback(orderBook);
      } catch (error) {
        console.error('Error in order book update callback:', error);
      }
    });
  }

  // Update order book from market simulation data
  private updateOrderBookFromMarketData(marketData: SimulatedMarketData): void {
    if (!marketData) return;

    const bids: OrderBookLevel[] = marketData.bidDepth
      .map((level: MarketDepthLevel) => ({
        price: level.price,
        totalQuantity: level.quantity,
        orderCount: 1,
        type: level.type
      }))
      .sort((a: OrderBookLevel, b: OrderBookLevel) => b.price - a.price);

    const asks: OrderBookLevel[] = marketData.askDepth
      .map((level: MarketDepthLevel) => ({
        price: level.price,
        totalQuantity: level.quantity,
        orderCount: 1,
        type: level.type
      }))
      .sort((a: OrderBookLevel, b: OrderBookLevel) => a.price - b.price);

    const spread = this.calculateSpread(bids, asks);

    this.orderBook = {
      bids: bids.slice(0, 20), // Top 20 bids
      asks: asks.slice(0, 20), // Top 20 asks
      lastTradedPrice: marketData.price,
      timestamp: new Date(marketData.timestamp),
      symbol: marketData.symbol,
      spread: spread,
      totalBidVolume: bids.reduce((sum, bid) => sum + bid.totalQuantity, 0),
      totalAskVolume: asks.reduce((sum, ask) => sum + ask.totalQuantity, 0)
    };

    // Notify subscribers
    this.notifyOrderBookUpdate(this.orderBook);
  }

  // Calculate spread between best bid and ask
  private calculateSpread(bids: OrderBookLevel[], asks: OrderBookLevel[]): number {
    if (bids.length === 0 || asks.length === 0) return 0;
    
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    
    return bestAsk - bestBid;
  }

  // Update order book based on actual orders
  private updateOrderBook(): void {
    // Group orders by price level
    const bidLevels = new Map<number, { totalQuantity: number; orderCount: number }>();
    const askLevels = new Map<number, { totalQuantity: number; orderCount: number }>();
    
    // Process all orders to build order book levels
    this.orders.forEach(order => {
      // Only include active orders in the order book
      if (order.status === "NEW" || order.status === "PARTIALLY_FILLED") {
        const price = order.price || 0;
        if (price > 0) {
          const remainingQuantity = order.quantity - (order.filledQuantity || 0);
          
          if (remainingQuantity > 0) {
            if (order.type === "buy") {
              // Add to bid levels
              const existing = bidLevels.get(price) || { totalQuantity: 0, orderCount: 0 };
              bidLevels.set(price, {
                totalQuantity: existing.totalQuantity + remainingQuantity,
                orderCount: existing.orderCount + 1
              });
            } else {
              // Add to ask levels
              const existing = askLevels.get(price) || { totalQuantity: 0, orderCount: 0 };
              askLevels.set(price, {
                totalQuantity: existing.totalQuantity + remainingQuantity,
                orderCount: existing.orderCount + 1
              });
            }
          }
        }
      }
    });
    
    // Convert maps to arrays and sort
    const bids: OrderBookLevel[] = Array.from(bidLevels.entries())
      .map(([price, data]) => ({
        price,
        totalQuantity: data.totalQuantity,
        orderCount: data.orderCount,
        type: 'limit'
      }))
      .sort((a, b) => b.price - a.price); // Highest price first for bids
      
    const asks: OrderBookLevel[] = Array.from(askLevels.entries())
      .map(([price, data]) => ({
        price,
        totalQuantity: data.totalQuantity,
        orderCount: data.orderCount,
        type: 'limit'
      }))
      .sort((a, b) => a.price - b.price); // Lowest price first for asks

    // Get market data for last traded price
    const marketData = this.marketSimulation.getMarketData(this.orderBook.symbol ?? 'VIC.VN');
    const lastTradedPrice = marketData?.price || this.orderBook.lastTradedPrice;
    const spread = this.calculateSpread(bids, asks);
    
    this.orderBook = {
      bids,
      asks,
      lastTradedPrice,
      timestamp: new Date(),
      symbol: this.orderBook.symbol,
      spread: spread,
      totalBidVolume: bids.reduce((sum, bid) => sum + bid.totalQuantity, 0),
      totalAskVolume: asks.reduce((sum, ask) => sum + ask.totalQuantity, 0)
    };

    // Notify subscribers
    this.notifyOrderBookUpdate(this.orderBook);
  }

  // Matching engine logic
  private matchOrders(): void {
    const ordersToMatch = this.getAllOrders({ status: "NEW" });
    
    if (ordersToMatch.length === 0) return;

    // Group orders by symbol
    const ordersBySymbol = new Map<string, Order[]>();
    ordersToMatch.forEach(order => {
      if (!ordersBySymbol.has(order.symbol)) {
        ordersBySymbol.set(order.symbol, []);
      }
      ordersBySymbol.get(order.symbol)!.push(order);
    });

    // Match orders for each symbol
    ordersBySymbol.forEach((orders, symbol) => {
      this.matchOrdersForSymbol(orders, symbol);
    });
  }

  // Match orders for a specific symbol
  private matchOrdersForSymbol(orders: Order[], symbol: string): void {
    // Separate buy and sell orders
    const buyOrders = orders
      .filter(order => order.type === "buy" && order.status === "NEW")
      .sort((a, b) => {
        // Price-time priority: higher price first, then earlier timestamp
        const priceDiff = (b.price || 0) - (a.price || 0);
        if (priceDiff !== 0) return priceDiff;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

    const sellOrders = orders
      .filter(order => order.type === "sell" && order.status === "NEW")
      .sort((a, b) => {
        // Price-time priority: lower price first, then earlier timestamp
        const priceDiff = (a.price || 0) - (b.price || 0);
        if (priceDiff !== 0) return priceDiff;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

    // Try to match orders
    for (const buyOrder of buyOrders) {
      if (buyOrder.status !== "NEW") continue;

      for (const sellOrder of sellOrders) {
        if (sellOrder.status !== "NEW") continue;

        // Check if prices match (for limit orders)
        const canMatch = this.canOrdersMatch(buyOrder, sellOrder);
        
        if (canMatch) {
          this.executeMatch(buyOrder, sellOrder, symbol);
          break; // Move to next buy order
        }
      }
    }
  }

  // Check if two orders can match
  private canOrdersMatch(buyOrder: Order, sellOrder: Order): boolean {
    // Market orders always match
    if (buyOrder.orderType === "Market" || sellOrder.orderType === "Market") {
      return true;
    }

    // Limit orders: buy price must be >= sell price
    const buyPrice = buyOrder.price || 0;
    const sellPrice = sellOrder.price || 0;
    
    return buyPrice >= sellPrice;
  }

  // Execute a match between two orders
  private executeMatch(buyOrder: Order, sellOrder: Order, symbol: string): void {
    const buyRemaining = buyOrder.quantity - (buyOrder.filledQuantity || 0);
    const sellRemaining = sellOrder.quantity - (sellOrder.filledQuantity || 0);
    const matchQuantity = Math.min(buyRemaining, sellRemaining);
    
    if (matchQuantity <= 0) return;

    // Determine match price
    const matchPrice = this.determineMatchPrice(buyOrder, sellOrder);
    
    // Update buy order
    const newBuyFilled = (buyOrder.filledQuantity || 0) + matchQuantity;
    const buyStatus: OrderStatus = newBuyFilled === buyOrder.quantity ? "FILLED" : "PARTIALLY_FILLED";
    
    const updatedBuyOrder: Order = {
      ...buyOrder,
      status: buyStatus,
      filledQuantity: newBuyFilled,
      filledPrice: matchPrice,
      updatedTime: new Date()
    };
    this.orders.set(buyOrder.id, updatedBuyOrder);

    // Update sell order
    const newSellFilled = (sellOrder.filledQuantity || 0) + matchQuantity;
    const sellStatus: OrderStatus = newSellFilled === sellOrder.quantity ? "FILLED" : "PARTIALLY_FILLED";
    
    const updatedSellOrder: Order = {
      ...sellOrder,
      status: sellStatus,
      filledQuantity: newSellFilled,
      filledPrice: matchPrice,
      updatedTime: new Date()
    };
    this.orders.set(sellOrder.id, updatedSellOrder);

    // Add trade record
    this.addTrade({
      id: `TRADE-${Date.now()}-${buyOrder.id}-${sellOrder.id}`,
      price: matchPrice,
      quantity: matchQuantity,
      timestamp: new Date(),
      side: 'buy', // The buy side initiated the match
      symbol: symbol,
      // buyOrderId and sellOrderId are not part of Trade interface
      // side: 'buy', // The buy side initiated the match
    });

    console.log(`[ORDER_MATCH] Matched ${matchQuantity} shares at ${matchPrice} between ${buyOrder.id} and ${sellOrder.id}`);

    // Update order book
    this.updateOrderBook();
  }

  // Determine match price based on order types
  private determineMatchPrice(buyOrder: Order, sellOrder: Order): number {
    // Get market data for reference
    const marketData = this.marketSimulation.getMarketData(buyOrder.symbol);
    const currentPrice = marketData?.price || this.orderBook.lastTradedPrice;

    // Price determination rules:
    if (buyOrder.orderType === "Market" && sellOrder.orderType === "Market") {
      // Both market orders: use current market price
      return currentPrice;
    } else if (buyOrder.orderType === "Market") {
      // Buy is market, sell is limit: use sell price
      return sellOrder.price || currentPrice;
    } else if (sellOrder.orderType === "Market") {
      // Sell is market, buy is limit: use buy price
      return buyOrder.price || currentPrice;
    } else {
      // Both limit orders: use midpoint or whichever came first
      const buyPrice = buyOrder.price || currentPrice;
      const sellPrice = sellOrder.price || currentPrice;
      
      // If buy price >= sell price, use the price of the order that was placed first
      if (buyOrder.timestamp < sellOrder.timestamp) {
        return buyPrice;
      } else {
        return sellPrice;
      }
    }
  }

  // Add a trade to the history
  private addTrade(trade: Trade): void {
    this.trades.push(trade);
    
    // Keep only last 1000 trades
    if (this.trades.length > 1000) {
      this.trades = this.trades.slice(-1000);
    }

    // Update last traded price in order book
    this.orderBook.lastTradedPrice = trade.price;
  }

  // Get market statistics
  getMarketStatistics(): ReturnType<typeof MarketSimulationService.prototype.getMarketStatistics> {
    return this.marketSimulation.getMarketStatistics();
  }

  // Get order book stability metrics
  getOrderBookStability(symbol: string): ReturnType<typeof MarketSimulationService.prototype.getOrderBookStabilityMetrics> {
    return this.marketSimulation.getOrderBookStabilityMetrics(symbol);
  }

  // Cleanup
  cleanup(): void {
    this.stopMatchingEngine();
    this.marketSimulation.stopSimulation();
    this.orderBookUpdateCallbacks = [];
  }
}

// Create a singleton instance
export const orderBookService = new OrderBookService();