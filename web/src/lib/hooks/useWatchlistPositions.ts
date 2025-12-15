"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchShares } from "@/lib/api/orderApi";

/**
 * BE response (bạn gửi):
 * {
 *   success: true,
 *   data: {
 *     userId: number,
 *     shares: Record<string, number>,
 *     data: Array<{ stock_symbol: string; quantity: number; ... }>
 *   }
 * }
 */

type SharesMap = Record<string, number>;

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildPositionsMapFromResponse(
  res: any,
  symbols: string[]
): Map<string, number> {
  // normalize root
  const root = res?.data ?? res;

  const sharesObj: SharesMap = root?.shares ?? {};
  const rows: any[] = Array.isArray(root?.data) ? root.data : [];

  // Prefer array rows (chi tiết) nếu có
  const byRows = new Map<string, number>();
  for (const r of rows) {
    const sym = String(r?.stock_symbol ?? r?.symbol ?? "").trim();
    if (!sym) continue;
    byRows.set(sym, safeNumber(r?.quantity ?? r?.shares ?? 0));
  }

  // Build final map for all requested symbols, preserve order
  const next = new Map<string, number>();
  for (const sym of symbols) {
    const key = String(sym).trim();
    if (!key) continue;

    const val =
      byRows.has(key) ? byRows.get(key)! : safeNumber(sharesObj?.[key] ?? 0);

    next.set(key, val);
  }

  return next;
}

export function useWatchlistPositions(symbols: string[]) {
  const [positions, setPositions] = useState<Map<string, number>>(
    () => new Map()
  );
  const [loadingPositions, setLoadingPositions] = useState(false);

  // Stable key to avoid callback changing every render
  const symbolsKey = useMemo(
    () => (symbols || []).map((s) => s.trim()).filter(Boolean).join(","),
    [symbols]
  );

  const refreshWatchlistPositions = useCallback(async () => {
    const list = symbolsKey
      ? symbolsKey.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (!list.length) {
      setPositions(new Map());
      return;
    }

    setLoadingPositions(true);
    try {
      const res = await fetchShares(list);

      // IMPORTANT: fetchShares có thể return raw json hoặc res.data tuỳ bạn,
      // hàm buildPositionsMapFromResponse đã normalize cả 2.
      const next = buildPositionsMapFromResponse(res, list);

      setPositions(next);
    } catch (error) {
      console.error("[useWatchlistPositions] Error fetching shares:", error);
      // Optional: reset to 0 to avoid stale UI
      const fallback = new Map<string, number>();
      for (const s of list) fallback.set(s, 0);
      setPositions(fallback);
    } finally {
      setLoadingPositions(false);
    }
  }, [symbolsKey]);

  // Optional: auto refresh when symbols change
  useEffect(() => {
    refreshWatchlistPositions();
  }, [refreshWatchlistPositions]);

  return {
    positions, // Map<symbol, shares>
    loadingPositions,
    refreshWatchlistPositions,
  };
}
