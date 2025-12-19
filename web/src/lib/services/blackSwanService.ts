/**
 * Black Swan Service - Manages rare, catastrophic market events
 * that can cause massive losses for investors who don't use stop-loss orders
 */

export interface BlackSwanEvent {
  id: string;
  symbol: string;
  type: "crash" | "delist";
  severity: number; // 0.5-0.8 for crash, 1.0 for delist
  startTime: number;
  endTime: number;
  isActive: boolean;
  triggeredByPosition?: boolean;
}

export class BlackSwanService {
  private static instance: BlackSwanService;
  private events: Map<string, BlackSwanEvent> = new Map();
  private activeEvents: Set<string> = new Set();
  private positionCheckerInterval: NodeJS.Timeout | null = null;
  private flashingInterval: NodeJS.Timeout | null = null;
  private autoTriggerInterval: NodeJS.Timeout | null = null;
  private isFlashing = false;
  private listeners: Array<(event: BlackSwanEvent) => void> = [];
  private positionCheckCallback: ((symbol: string) => number) | null = null;

  private constructor() {}

  public static getInstance(): BlackSwanService {
    if (!BlackSwanService.instance) {
      BlackSwanService.instance = new BlackSwanService();
    }
    return BlackSwanService.instance;
  }

  /**
   * Register a callback to check user positions for a symbol
   */
  public registerPositionChecker(callback: (symbol: string) => number): void {
    this.positionCheckCallback = callback;
  }

  /**
   * Start monitoring for Black Swan events
   */
  public startMonitoring(): void {
    // Check for positions that might trigger Black Swan events
    if (!this.positionCheckerInterval) {
      this.positionCheckerInterval = setInterval(() => {
        this.checkUserPositions();
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Stop monitoring for Black Swan events
   */
  public stopMonitoring(): void {
    if (this.positionCheckerInterval) {
      clearInterval(this.positionCheckerInterval);
      this.positionCheckerInterval = null;
    }

    if (this.flashingInterval) {
      clearInterval(this.flashingInterval);
      this.flashingInterval = null;
    }

    if (this.autoTriggerInterval) {
      clearInterval(this.autoTriggerInterval);
      this.autoTriggerInterval = null;
    }

    this.events.clear();
    this.activeEvents.clear();
    this.listeners = [];
  }

  /**
   * Check user positions to see if any qualify for a Black Swan event
   */
  private checkUserPositions(): void {
    if (!this.positionCheckCallback) return;

    // Symbols that can potentially trigger Black Swan events
    const symbols = [
      "VIC.VN",
      "VHM.VN",
      "VCB.VN",
      "TCB.VN",
      "FPT.VN",
      "VNM.VN",
      "HPG.VN",
      "MSN.VN",
    ];

    for (const symbol of symbols) {
      const position = this.positionCheckCallback(symbol);

      // If user holds more than 200 shares, chance for Black Swan event
      if (position > 200 && Math.random() < 0.001) {
        // 0.1% chance per check
        this.triggerBlackSwanEvent(symbol, true);
      }
    }
  }

  /**
   * Trigger a Black Swan event for a symbol
   */
  public triggerBlackSwanEvent(
    symbol: string,
    triggeredByPosition: boolean = false
  ): BlackSwanEvent {
    // Don't trigger if there's already an active event for this symbol
    for (const event of this.events.values()) {
      if (event.symbol === symbol && event.isActive) {
        return event;
      }
    }

    const eventId = `blackswan-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const eventType = Math.random() > 0.5 ? "crash" : "delist";
    const severity = eventType === "delist" ? 1.0 : 0.5 + Math.random() * 0.3; // 50-80% for crash



    const event: BlackSwanEvent = {
      id: eventId,
      symbol,
      type: eventType,
      severity,
      startTime: Date.now(),
      endTime: Date.now() + 120000, // 2 minutes
      isActive: true,
      triggeredByPosition,
    };

    this.events.set(eventId, event);
    this.activeEvents.add(eventId);

    // Notify listeners
    this.listeners.forEach((listener) => listener(event));
    this.startFlashing();
        
    // Auto-deactivate after 2 minutes
    setTimeout(() => {
      this.deactivateEvent(eventId);
      this.stopFlashing(); // Stop flashing when event ends
    }, 120000); // 2 minutes

    return event;
  }

  /**
   * Deactivate a Black Swan event
   */
  private deactivateEvent(eventId: string): void {
    const event = this.events.get(eventId);
    if (event) {
      event.isActive = false;
      this.activeEvents.delete(eventId);
    }
  }

  /**
   * Get all active Black Swan events
   */
  public getActiveEvents(): BlackSwanEvent[] {
    return Array.from(this.activeEvents)
      .map((id) => this.events.get(id))
      .filter((event) => event && event.isActive) as BlackSwanEvent[];
  }

  /**
   * Get active events for a specific symbol
   */
  public getActiveEventsForSymbol(symbol: string): BlackSwanEvent[] {
    return this.getActiveEvents().filter((event) => event.symbol === symbol);
  }

  /**
   * Add event listener for Black Swan events
   */
  public addEventListener(listener: (event: BlackSwanEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: (event: BlackSwanEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Start flashing notification
   */
  public startFlashing(): void {
    if (this.isFlashing) return;

    this.isFlashing = true;

    // Flash continuously (will be stopped when event ends)
    this.flashingInterval = setInterval(() => {
      // Dispatch custom event for UI to handle flashing
      window.dispatchEvent(
        new CustomEvent("blackSwanFlash", {
          detail: { isFlashing: true },
        })
      );

      // After a short delay, send a non-flashing event to create the pulse effect
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("blackSwanFlash", {
            detail: { isFlashing: false },
          })
        );
      }, 150);
    }, 300); // Faster flashing interval for better visibility
  }

  /**
   * Stop flashing notification
   */
  public stopFlashing(): void {
    this.isFlashing = false;

    if (this.flashingInterval) {
      clearInterval(this.flashingInterval);
      this.flashingInterval = null;
    }

    // Dispatch final event to stop flashing
    window.dispatchEvent(
      new CustomEvent("blackSwanFlash", {
        detail: { isFlashing: false },
      })
    );
  }

  /**
   * Check if any Black Swan events are currently active
   */
  public hasActiveEvents(): boolean {
    return this.activeEvents.size > 0;
  }

  /**
   * Manual trigger for testing purposes
   */
  public triggerTestEvent(symbol: string): BlackSwanEvent {
    return this.triggerBlackSwanEvent(symbol, false);
  }

  /**
   * Start automatic triggering every 3 minutes
   */
  public startAutomaticTriggering(selectedSymbol: string = "VIC.VN"): void {
    // Clear any existing interval
    if (this.autoTriggerInterval) {
      clearInterval(this.autoTriggerInterval);
    }



    // Trigger every 3 minutes (180000 ms)
    this.autoTriggerInterval = setInterval(() => {
      // Trigger Black Swan event for the currently selected symbol
      this.triggerBlackSwanEvent(selectedSymbol, true);
    }, 180000); // 3 minutes
  }

  /**
   * Stop automatic triggering
   */
  public stopAutomaticTriggering(): void {
    if (this.autoTriggerInterval) {
      clearInterval(this.autoTriggerInterval);
      this.autoTriggerInterval = null;
    }
  }
}
