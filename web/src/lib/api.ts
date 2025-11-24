import { Time } from "lightweight-charts";
import { YahooQuoteData, Timeframe } from "./types";
import { apiCache } from "./cache";


export async function fetchYahooSeries(
  symbol = "FUESSV30.HM",
  timeframe: Timeframe = "1D"
): Promise<YahooQuoteData[]> {
  // Create cache key
  const cacheKey = `${symbol}-${timeframe}`;

  // Check cache first
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log(`Using cached data for ${cacheKey}`);
    return cachedData;
  }

  let interval = "1d";
  let range = "6mo";

  if (timeframe === "1W") {
    interval = "1wk";
    range = "2y";
  } else if (timeframe === "1M") {
    interval = "1mo";
    range = "10y";
  }

  console.log(`Fetching fresh data for ${cacheKey}`);

  try {
    const res = await fetch(
      `/api/yahoo?symbol=${encodeURIComponent(
        symbol
      )}&interval=${interval}&range=${range}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      console.error(`API request failed: ${res.status} ${res.statusText}`);
  
      let errorMessage = `Failed to fetch data: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {

      }
      throw new Error(errorMessage);
    }

    const json = await res.json();

    if (!json.chart?.result?.[0]) {
      throw new Error("Invalid Yahoo response");
    }

    const result = json.chart.result[0];
    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];

    if (!timestamps.length || !quotes) {
      throw new Error("No quotes in Yahoo result");
    }

    const data = timestamps
      .map((ts, i) => ({
        time: ts as Time,
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i],
      }))
      .filter(
        (d) =>
          d.open != null && d.high != null && d.low != null && d.close != null
      );

    // Cache the result
    apiCache.set(cacheKey, data);

    return data;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);

    // Return cached data if available, even if stale
    const staleData = apiCache.get(cacheKey);
    if (staleData) {
      console.log(`Using stale cached data for ${cacheKey}`);
      return staleData;
    }

    // If no cached data, re-throw the error
    throw error;
  }
}
