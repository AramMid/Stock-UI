import { useState, useEffect, useRef, useMemo } from "react";
import { MarketSimulationService } from "@/lib/services/marketSimulationService";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trend?: "up" | "down" | "neutral";
}

// Fallback nếu Yahoo/backend lỗi
const fallbackPrices: Record<string, number> = {
  "VIC.VN": 45200,
  "VHM.VN": 55500,
  "VCB.VN": 82700,
  "TCB.VN": 22950,
  "FPT.VN": 123500,
  "VNM.VN": 48200,
  "HPG.VN": 18850,
  "MSN.VN": 67800,
};

export function useMarketData(
  symbols: string[] = [],
  marketSimulationGetter?: () => MarketSimulationService | null
) {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const marketDataRef = useRef<Record<string, MarketData>>({});
  const getterRef = useRef<typeof marketSimulationGetter>(undefined);

  // Create a stable string representation of symbols for useEffect dependencies
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  // luôn giữ getter mới nhất
  useEffect(() => {
    getterRef.current = marketSimulationGetter;
  }, [marketSimulationGetter]);

  useEffect(() => {
    let isMounted = true;

    // Khởi tạo data mặc định
    const initialData: Record<string, MarketData> = {};
    symbols.forEach((symbol) => {
      initialData[symbol] = {
        symbol,
        price: fallbackPrices[symbol] || 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        trend: "neutral",
      };
    });

    setMarketData(initialData);
    marketDataRef.current = initialData;
    setLoading(false);

    // Nếu không có getter thì không subscribe
    if (!getterRef.current) {
      return;
    }

    const interval = setInterval(() => {
      if (!isMounted) return;

      try {
        const getter = getterRef.current;
        if (!getter) return;

        const marketSimulation = getter();
        if (!marketSimulation) return;

        const updatedData: Record<string, MarketData> = {};

        symbols.forEach((symbol) => {
          const data = marketSimulation.getMarketData(symbol);
          if (data) {
            const previousData = marketDataRef.current[symbol];
            const previousPrice = previousData?.price ?? data.price;
            const change = data.price - previousPrice;
            const changePercent =
              previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

            updatedData[symbol] = {
              symbol: data.symbol,
              price: data.price,
              change,
              changePercent,
              volume: data.volume,
              trend: data.trend || "neutral",
            };
          } else {
            updatedData[symbol] =
              marketDataRef.current[symbol] || {
                symbol,
                price: fallbackPrices[symbol] || 0,
                change: 0,
                changePercent: 0,
                volume: 0,
                trend: "neutral",
              };
          }
        });

        if (isMounted) {
          setMarketData(updatedData);
          marketDataRef.current = updatedData;
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to fetch market data");
          console.error("Market data fetch error:", err);
        }
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbolsKey]); // Use symbolsKey instead of symbols array

  return { marketData, loading, error };
}