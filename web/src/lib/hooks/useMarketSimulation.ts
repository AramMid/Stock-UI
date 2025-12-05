// src/lib/hooks/useMarketSimulation.ts
import { useEffect, useState } from "react";
import {
  marketSimulationService,
  SimulatedMarketData,
} from "@/lib/services/marketSimulationService";

interface UseMarketSimulationOptions {
  symbol?: string;
  intervalMs?: number;
  autoStart?: boolean;
}

export function useMarketSimulation(
  options: UseMarketSimulationOptions = {}
) {
  const { symbol = "VIC.VN", intervalMs = 1000, autoStart = true } = options;
  const [data, setData] = useState<SimulatedMarketData | null>(null);
  const [loading, setLoading] = useState<boolean>(autoStart);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoStart) return;

    setLoading(true);
    setError(null);

    marketSimulationService.startSimulation(
      (d) => {
        setData(d);
        setLoading(false);
      },
      { symbol, intervalMs }
    );

    return () => {
      marketSimulationService.stopSimulation();
    };
  }, [symbol, intervalMs, autoStart]);

  return {
    data,
    loading,
    error,
    refresh: async () => {
      try {
        const d = await marketSimulationService.fetchNextTick(symbol);
        setData(d);
        setError(null);
        return d;
      } catch (e: any) {
        const msg = e?.message ?? "Error refreshing market data";
        setError(msg);
        throw e;
      }
    },
  };
}
