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
    console.log(`[WebSocketService] Subscribing to order ${orderId}`);
    if (!this.subscribers.has(orderId)) {
      this.subscribers.set(orderId, new Set());
    }

    const set = this.subscribers.get(orderId)!;
    set.add(callback);
    console.log(
      `[WebSocketService] Added subscriber to order ${orderId}. Total subscribers: ${set.size}`
    );

    // ✅ Replay last update to avoid missing events when subscribing late
    const cached = this.lastUpdate.get(orderId);
    if (cached) {
      console.log(
        `[WebSocketService] Replaying cached update for order ${orderId}:`,
        cached
      );
      try {
        callback(cached);
      } catch (e) {
        console.error(
          "[WebSocketService] Error in replayed order update callback:",
          e
        );
      }
    }

    // ✅ Return unsubscribe function
    return () => {
      console.log(`[WebSocketService] Unsubscribing from order ${orderId}`);
      this.unsubscribe(orderId, callback);
    };
  }

  /**
   * Unsubscribe from order updates
   */
  public unsubscribe(orderId: string, callback: OrderUpdateCallback): void {
    console.log(`[WebSocketService] Unsubscribing from order ${orderId}`);
    const set = this.subscribers.get(orderId);
    if (!set) return;

    set.delete(callback);
    console.log(
      `[WebSocketService] Removed subscriber from order ${orderId}. Remaining subscribers: ${set.size}`
    );

    if (set.size === 0) {
      this.subscribers.delete(orderId);
      console.log(
        `[WebSocketService] No more subscribers for order ${orderId}, removing subscription`
      );
      // optional: keep lastUpdate for later UI refresh, or clear if you want
      // this.lastUpdate.delete(orderId);
    }
  }

  /**
   * Send order update to subscribers (called by simulator)
   */
  public sendOrderUpdate(update: OrderUpdate): void {
    console.log(`[WebSocketService] Sending order update:`, update);
    // Cache last update for replay
    this.lastUpdate.set(update.orderId, update);

    const set = this.subscribers.get(update.orderId);

    // Send order update to subscribers
    console.log(
      `[WebSocketService] Found ${set?.size || 0} subscribers for order ${
        update.orderId
      }`
    );

    if (!set || set.size === 0) {
      console.log(
        `[WebSocketService] No subscribers for order ${update.orderId}, update not sent`
      );
      return;
    }

    for (const cb of set) {
      try {
        console.log(
          `[WebSocketService] Calling callback for order ${update.orderId}`
        );
        cb(update);
      } catch (error) {
        console.error(
          "[WebSocketService] Error in order update callback:",
          error
        );
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
