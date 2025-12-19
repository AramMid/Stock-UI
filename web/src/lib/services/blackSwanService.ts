import { MarketSimulationService } from "./marketSimulationService";
import { NotificationService } from "./notificationService";
import { SimulatedMarketData } from "./marketSimulationService";

export interface BlackSwanEvent {
  id: string;
  symbol: string;
  eventType: "crash" | "delist";
  severity: "severe" | "moderate" | "mild";
  impact: number; // 0-1 scale
  timestamp: number;
  duration: number; // Duration in milliseconds
  endTime: number; // End time of the event
  recoveryTime?: number; // for crashes that eventually recover
  isRecovered?: boolean;
}

export class BlackSwanService {
  private marketSimulation: MarketSimulationService;
  private notificationService: NotificationService | null = null;
  private activeEvents: Map<string, BlackSwanEvent> = new Map();
  private eventHistory: BlackSwanEvent[] = [];
  private scheduledEventTimer: NodeJS.Timeout | null = null;
  private eventEndTimer: NodeJS.Timeout | null = null;
  private cooldownTimer: NodeJS.Timeout | null = null;
  private isScheduledEventActive: boolean = false;

  // Add properties to track user position
  private currentUserSymbol: string = "VIC.VN"; // Default symbol
  private currentUserShares: number = 0; // Default shares

  constructor(marketSimulation: MarketSimulationService) {
    this.marketSimulation = marketSimulation;
    // Only initialize notification service in browser environment
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.notificationService = NotificationService.getInstance();
    }
  }

  // Add methods to track user position
  public setCurrentUserSymbol(symbol: string): void {
    this.currentUserSymbol = symbol;
  }

  public setCurrentUserShares(shares: number): void {
    this.currentUserShares = shares;
    // Restart scheduling when shares change
    this.restartScheduling();
  }

  /**
   * Restart scheduling based on current user position
   */
  private restartScheduling(): void {
    // Clear any existing timers
    if (this.scheduledEventTimer) {
      clearTimeout(this.scheduledEventTimer);
      this.scheduledEventTimer = null;
    }
    
    if (this.eventEndTimer) {
      clearTimeout(this.eventEndTimer);
      this.eventEndTimer = null;
    }
    
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    
    // Reset active state
    this.isScheduledEventActive = false;
    
    // Dispatch event to notify UI that event ended
    if (
      typeof window !== "undefined" &&
      typeof CustomEvent !== "undefined"
    ) {
      window.dispatchEvent(
        new CustomEvent("blackSwanEventEnded", {
          detail: { active: false },
        })
      );
    }
    
    // Schedule new events if user has enough shares
    if (this.currentUserShares > 100) {
      this.scheduleRandomBlackSwanEvent();
    }
  }

  /**
   * Trigger a black swan event for a specific symbol
   * @param symbol The stock symbol to affect
   * @param eventType Type of event - crash or delist
   * @param severity Severity level of the event
   * @returns The created BlackSwanEvent
   */
  public triggerBlackSwanEvent(
    symbol: string,
    eventType: "crash" | "delist" = "crash",
    severity: "severe" | "moderate" | "mild" = "severe"
  ): BlackSwanEvent {
    const eventId = `bs-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Get current market data
    const marketData = this.marketSimulation.getMarketData(symbol);
    if (!marketData) {
      throw new Error(`No market data found for symbol ${symbol}`);
    }

    const currentPrice = marketData.price;
    let newPrice = currentPrice;
    let impact = 0;

    if (eventType === "delist") {
      // Delist event - price drops to 0
      newPrice = 0;
      impact = 1.0;
    } else {
      // Crash event - price drops 50-80%
      const crashSeverity = {
        mild: { min: 0.3, max: 0.5 },
        moderate: { min: 0.5, max: 0.7 },
        severe: { min: 0.7, max: 0.9 },
      }[severity];

      const crashAmount =
        crashSeverity.min +
        Math.random() * (crashSeverity.max - crashSeverity.min);
      newPrice = currentPrice * (1 - crashAmount);
      impact = crashAmount;
    }

    // Update the market data with the new price
    this.marketSimulation.updateMarketData(symbol, { price: newPrice });

    // Create the black swan event
    const event: BlackSwanEvent = {
      id: eventId,
      symbol,
      eventType,
      severity,
      impact,
      timestamp: Date.now(),
      duration: 0, // Instant event
      endTime: Date.now(),
    };

    // Store the event
    this.activeEvents.set(eventId, event);
    this.eventHistory.push(event);

    // Log the event
    console.log(
      `BLACK_SWAN: ${symbol} experienced a ${eventType} event with ${severity} severity (${(
        impact * 100
      ).toFixed(1)}% drop)`
    );

    return event;
  }

  /**
   * Schedule a random black swan event to occur within 3-4 minutes
   * Only schedules if user has more than 100 shares in the current symbol
   */
  public scheduleRandomBlackSwanEvent(): void {
    // Clear any existing scheduled event
    if (this.scheduledEventTimer) {
      clearTimeout(this.scheduledEventTimer);
    }

    // Only schedule if user has more than 100 shares in the current symbol
    if (this.currentUserShares > 100) {
      // Schedule within 3-4 minutes (180000-240000 ms)
      const randomDelay = Math.floor(Math.random() * 60000) + 180000; // 3-4 minutes

      this.scheduledEventTimer = setTimeout(() => {
        this.triggerRandomBlackSwanEvent();
        this.isScheduledEventActive = true;

        // Dispatch event to notify UI
        if (
          typeof window !== "undefined" &&
          typeof CustomEvent !== "undefined"
        ) {
          window.dispatchEvent(
            new CustomEvent("blackSwanEventScheduled", {
              detail: { active: true },
            })
          );
        }
        
        // Schedule event end after 2 minutes
        if (this.eventEndTimer) {
          clearTimeout(this.eventEndTimer);
        }
        
        this.eventEndTimer = setTimeout(() => {
          this.isScheduledEventActive = false;
          
          // Dispatch event to notify UI that event ended
          if (
            typeof window !== "undefined" &&
            typeof CustomEvent !== "undefined"
          ) {
            window.dispatchEvent(
              new CustomEvent("blackSwanEventEnded", {
                detail: { active: false },
              })
            );
          }
          
          // Schedule cooldown period of 5 minutes
          if (this.cooldownTimer) {
            clearTimeout(this.cooldownTimer);
          }
          
          this.cooldownTimer = setTimeout(() => {
            // After cooldown, schedule next random event
            this.scheduleRandomBlackSwanEvent();
          }, 300000); // 5 minutes cooldown (300000 ms)
        }, 120000); // End after 2 minutes (120000 ms)
      }, randomDelay);

      console.log(
        `Black Swan event scheduled for ${randomDelay}ms from now on symbol ${this.currentUserSymbol}`
      );
    }
  }

  /**
   * Trigger a random black swan event on the current user symbol
   * @returns The created BlackSwanEvent or null if no event was triggered
   */
  public triggerRandomBlackSwanEvent(): BlackSwanEvent | null {
    // Only trigger if user has more than 100 shares
    if (this.currentUserShares <= 100) {
      return null;
    }

    // Get the current user symbol
    const symbol = this.currentUserSymbol;

    // Randomly choose event type (70% crash, 30% delist)
    const eventType = Math.random() > 0.3 ? "crash" : "delist";

    // Randomly choose severity
    const severityValues: Array<"severe" | "moderate" | "mild"> = [
      "severe",
      "moderate",
      "mild",
    ];
    const severity =
      severityValues[Math.floor(Math.random() * severityValues.length)];

    return this.triggerBlackSwanEvent(symbol, eventType, severity);
  }

  /**
   * Get all active black swan events
   */
  public getActiveEvents(): BlackSwanEvent[] {
    return Array.from(this.activeEvents.values());
  }

  /**
   * Get black swan event history
   */
  public getEventHistory(): BlackSwanEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear an event from active events
   */
  public clearEvent(eventId: string): boolean {
    return this.activeEvents.delete(eventId);
  }
}