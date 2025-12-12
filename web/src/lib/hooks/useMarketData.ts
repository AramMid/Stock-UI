import { useState, useEffect, useRef, useMemo } from "react";
import { MarketSimulationService } from "@/lib/services/marketSimulationService";
import { fetchCurrentPrice } from "../api";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trend?: "up" | "down" | "neutral";
}

// No fallback prices - only use real data
const fallbackPrices: Record<string, number> = {};

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

    // Khởi tạo data mặc định - no fallback prices
    const initialData: Record<string, MarketData> = {};
    symbols.forEach((symbol) => {
      initialData[symbol] = {
        symbol,
        price: 0, // No fallback price
        change: 0,
        changePercent: 0,
        volume: 0,
        trend: "neutral",
      };
    });

    setMarketData(initialData);
    marketDataRef.current = initialData;
    setLoading(false);

    // Fetch real prices from Yahoo Finance API
    const fetchPrices = async () => {
      if (!isMounted) return;

      try {
        const updatedData: Record<string, MarketData> = {};

        // Fetch all prices concurrently
        const pricePromises = symbols.map(async (symbol) => {
          try {
            const price = await fetchCurrentPrice(symbol);
            return { symbol, price };
          } catch (error) {
            console.error(`Failed to fetch price for ${symbol}:`, error);
            // No fallback price if API fails
            return { symbol, price: 0 };
          }
        });

        const results = await Promise.all(pricePromises);

        results.forEach(({ symbol, price }) => {
          const previousData = marketDataRef.current[symbol];
          const previousPrice = previousData?.price ?? price;
          const change = price - previousPrice;
          const changePercent =
            previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

          updatedData[symbol] = {
            symbol,
            price,
            change,
            changePercent,
            volume: previousData?.volume || 0,
            trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
          };
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
    };

    // Fetch prices immediately
    fetchPrices();

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbolsKey]); // Use symbolsKey instead of symbols array

  return { marketData, loading, error };
}