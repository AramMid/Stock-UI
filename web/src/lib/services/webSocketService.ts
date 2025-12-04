import { Order } from "../order-management";
import { OrderStatus } from "./orderService";

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  filledQuantity?: number;
  filledPrice?: number;
  timestamp: number;
}

export type OrderUpdateCallback = (update: OrderUpdate) => void;

/**
 * WebSocket Service for real-time order updates
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private subscribers: Map<string, OrderUpdateCallback[]> = new Map();
  private mockInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMockUpdates();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Subscribe to order updates
   * @param orderId The order ID to subscribe to
   * @param callback Function to call when updates arrive
   */
  public subscribe(orderId: string, callback: OrderUpdateCallback): void {
    if (!this.subscribers.has(orderId)) {
      this.subscribers.set(orderId, []);
    }
    this.subscribers.get(orderId)?.push(callback);
  }

  /**
   * Unsubscribe from order updates
   * @param orderId The order ID to unsubscribe from
   * @param callback The callback function to remove
   */
  public unsubscribe(orderId: string, callback: OrderUpdateCallback): void {
    const callbacks = this.subscribers.get(orderId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.subscribers.delete(orderId);
      }
    }
  }

  /**
   * Simulate real-time order updates
   * In a real implementation, this would connect to a WebSocket server
   */
  private startMockUpdates(): void {
    // Clear any existing interval
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }

    // Simulate order updates every 2 seconds
    this.mockInterval = setInterval(() => {
      this.simulateOrderUpdates();
    }, 2000);
  }

  /**
   * Simulate order updates for demonstration
   */
  private simulateOrderUpdates(): void {
    // In a real implementation, this would receive actual updates from the server
    // For now, we'll just simulate some updates
  }

  /**
   * Send order update to subscribers
   * @param update The order update to send
   */
  public sendOrderUpdate(update: OrderUpdate): void {
    console.log(`Sending order update: ${update.orderId}, status: ${update.status}`);
    const callbacks = this.subscribers.get(update.orderId);
    if (callbacks) {
      console.log(`Found ${callbacks.length} subscribers for order ${update.orderId}`);
      callbacks.forEach((callback, index) => {
        try {
          console.log(`Calling callback ${index} for order ${update.orderId}`);
          callback(update);
        } catch (error) {
          console.error("Error in order update callback:", error);
        }
      });
    } else {
      console.log(`No subscribers found for order ${update.orderId}`);
    }
  }

  /**
   * Stop the mock updates
   */
  public stopMockUpdates(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }
}