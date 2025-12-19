import { OrderStatus } from "./orderService";

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  filledQuantity?: number;
  filledPrice?: number;
  timestamp: number;
}

export interface NotificationMessage {
  type: string;
  message: string;
  timestamp?: number;
}

export type OrderUpdateCallback = (update: OrderUpdate) => void;
export type NotificationCallback = (notification: NotificationMessage) => void;

/**
 * WebSocket Service (in-memory event bus)
 * - Supports replay (avoid missing FILLED if subscribed late)
 * - Supports unsubscribe via returned function
 */
export class WebSocketService {
  private static instance: WebSocketService;

  // orderId -> callbacks
  private subscribers: Map<string, Set<OrderUpdateCallback>> = new Map();

  // orderId -> last update (for replay)
  private lastUpdate: Map<string, OrderUpdate> = new Map();

  // notification callbacks
  private notificationSubscribers: Set<NotificationCallback> = new Set();

  private constructor() {
    // No mock updates here — updates come from MarketSimulationService.sendOrderUpdate()
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Subscribe to order updates.
   * Returns an unsubscribe function.
   * Also replays the last known update (if any).
   */
  public subscribe(orderId: string, callback: OrderUpdateCallback): () => void {
    if (!this.subscribers.has(orderId)) {
      this.subscribers.set(orderId, new Set());
    }

    const set = this.subscribers.get(orderId)!;
    set.add(callback);

    // ✅ Replay last update to avoid missing events when subscribing late
    const cached = this.lastUpdate.get(orderId);
    if (cached) {
      try {
        callback(cached);
      } catch (e) {
        // Error in replayed order update callback handling
      }
    }

    // ✅ Return unsubscribe function
    return () => {
      this.unsubscribe(orderId, callback);
    };
  }

  /**
   * Unsubscribe from order updates
   */
  public unsubscribe(orderId: string, callback: OrderUpdateCallback): void {
    const set = this.subscribers.get(orderId);
    if (!set) return;

    set.delete(callback);

    if (set.size === 0) {
      this.subscribers.delete(orderId);
      // optional: keep lastUpdate for later UI refresh, or clear if you want
      // this.lastUpdate.delete(orderId);
    }
  }

  /**
   * Send notification to subscribers
   */
  public sendNotification(notification: NotificationMessage): void {
    // Add timestamp if not provided
    if (!notification.timestamp) {
      notification.timestamp = Date.now();
    }

    // Send notification to all subscribers
    for (const cb of this.notificationSubscribers) {
      try {
        cb(notification);
      } catch (error) {
        // Error in notification callback
      }
    }
  }

  /**
   * Subscribe to notifications
   */
  public subscribeToNotifications(callback: NotificationCallback): () => void {
    this.notificationSubscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.notificationSubscribers.delete(callback);
    };
  }

  /**
   * Send order update to subscribers (called by simulator)
   */
  public sendOrderUpdate(update: OrderUpdate): void {
    // Cache last update for replay
    this.lastUpdate.set(update.orderId, update);

    const set = this.subscribers.get(update.orderId);

    // Send order update to subscribers

    if (!set || set.size === 0) return;

    for (const cb of set) {
      try {
        cb(update);
      } catch (error) {
        // Error in order update callback
      }
    }
  }

  /**
   * Clear cached updates (optional utility)
   */
  public clearOrderCache(orderId?: string): void {
    if (orderId) this.lastUpdate.delete(orderId);
    else this.lastUpdate.clear();
  }
}
