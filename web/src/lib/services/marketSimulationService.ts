// src/lib/services/marketSimulationService.ts

export type TrendType = "up" | "down" | "neutral";

export interface CandleDTO {
  timestamp: number; // ms từ backend
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDepthLevel {
  price: number;
  quantity: number;
  type: "bid" | "ask" | "marketMaker" | "trend" | "noise" | "stabilizer";
  botId?: string | null;
}

export interface SimulatedMarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;

  // 🔹 DỮ LIỆU NẾN TỪ BACKEND
  history: CandleDTO[];           // danh sách các nến đã đóng
  currentCandle?: CandleDTO | null; // nến đang chạy

  bidDepth: MarketDepthLevel[];
  askDepth: MarketDepthLevel[];
  trend: TrendType;
  volatility: number;
  vwap?: number | null;
  rsi?: number | null;

  // BE gửi Dict[float, float] -> JSON key sẽ là string
  volumeProfile: Record<string, number>;
}

export interface OrderResult {
  success: boolean;
  filledPrice?: number | null;
  filledQuantity?: number | null;
}

export type OrderSide = "buy" | "sell";
export type OrderType = "Market" | "Limit";

export interface BasicOrderPayload {
  id: string;
  symbol: string;
  type: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number | null;
}

interface StartSimulationOptions {
  symbol?: string;
  intervalMs?: number;
}

export class MarketSimulationService {
  private baseUrl: string;
  private timer: number | null = null;
  private currentSymbol: string = "VIC.VN";
  private lastData: SimulatedMarketData | null = null;

  constructor(baseUrl?: string) {
    // Ưu tiên env, fallback localhost:8000
    const envBase =
      (typeof import.meta !== "undefined" &&
        (import.meta as any).env?.VITE_MARKET_API_URL) ||
      (typeof window !== "undefined" && (window as any).__MARKET_API_URL);

    this.baseUrl = baseUrl || envBase || "http://localhost:8000";
  }

  /** Lấy dữ liệu market cuối cùng đã fetch cho symbol */
  getMarketData(symbol: string): SimulatedMarketData | null {
    if (this.lastData && this.lastData.symbol === symbol) return this.lastData;
    return null;
  }

  /** Gọi 1 tick mới từ backend: GET /market/{symbol}/next */
  async fetchNextTick(symbol: string): Promise<SimulatedMarketData> {
    const url = `${this.baseUrl}/market/${encodeURIComponent(
      symbol
    )}/next`;

    const res = await fetch(url, {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to fetch next tick (${res.status}): ${
          text || res.statusText
        }`
      );
    }

    const data = (await res.json()) as SimulatedMarketData;
    this.lastData = data;
    return data;
  }

  /** Bắt đầu loop tick liên tục */
  startSimulation(
    onTick: (data: SimulatedMarketData) => void,
    options: StartSimulationOptions = {}
  ) {
    // ❗ SSR: trên server không có window, bỏ qua
    if (typeof window === "undefined") {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[MarketSimulationService] startSimulation called on server, skipping..."
        );
      }
      return;
    }

    const symbol = options.symbol || this.currentSymbol;
    const intervalMs = options.intervalMs ?? 1000;

    this.currentSymbol = symbol;

    // Clear timer cũ nếu có
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    const runTick = () => {
      this.fetchNextTick(symbol)
        .then((data) => {
          onTick(data);
        })
        .catch((err) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("[MarketSimulationService] tick error:", err);
          }
        });
    };

    // Gọi ngay 1 lần
    runTick();

    // Sau đó loop mỗi intervalMs
    this.timer = window.setInterval(runTick, intervalMs);
  }

  /** Dừng loop */
  stopSimulation() {
    if (typeof window === "undefined") {
      this.timer = null;
      return;
    }

    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Gửi lệnh user tới backend: POST /market/orders */
  async processUserOrder(order: BasicOrderPayload): Promise<OrderResult> {
    const url = `${this.baseUrl}/market/orders`;

    const payload: BasicOrderPayload = {
      id: order.id,
      symbol: order.symbol,
      type: order.type,
      orderType: order.orderType,
      quantity: order.quantity,
      price: order.price ?? null,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to post order (${res.status}): ${
          text || res.statusText
        }`
      );
    }

    const data = (await res.json()) as OrderResult;
    return data;
  }
}

// Singleton dùng cho hook và chỗ khác
export const marketSimulationService = new MarketSimulationService();
