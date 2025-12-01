import { Time } from "lightweight-charts";
import { YahooQuoteData, Timeframe } from "./types";
import { apiCache } from "./cache";


export async function fetchYahooSeries(
  symbol = "FUESSV30.HM",
  timeframe: Timeframe = "1D",
  isPrivateMode: boolean = false
): Promise<YahooQuoteData[]> {
  // Create cache key - include private mode in cache key to separate data
  const cacheKey = `${symbol}-${timeframe}-${isPrivateMode ? 'private' : 'public'}`;

  // Check cache first
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    console.log(`Using cached data for ${cacheKey}`);
    return cachedData;
  }

  let interval = "1d";
  let range = "max"; // Default to max for private mode

  // For public mode, use a more recent date range (November 2025)
  if (!isPrivateMode) {
    // Use a shorter range for public mode
    switch (timeframe) {
      case "1m":
        range = "5d";
        interval = "1m";
        break;
      case "5m":
        range = "1mo";
        interval = "5m";
        break;
      case "15m":
        range = "1mo";
        interval = "15m";
        break;
      case "30m":
        range = "1mo";
        interval = "30m";
        break;
      case "1H":
        range = "1mo";
        interval = "1h";
        break;
      case "4H":
        range = "6mo";
        interval = "1h"; // Yahoo Finance doesn't have 4H, using 1H
        break;
      case "1D":
        range = "6mo"; // Recent 6 months for public mode
        interval = "1d";
        break;
      case "5D":
        range = "1mo";
        interval = "1d";
        break;
      case "1W":
        range = "6mo"; // Recent 6 months for public mode
        interval = "1wk";
        break;
      case "1M":
        range = "1y"; // Recent 1 year for public mode
        interval = "1mo";
        break;
      case "3M":
        range = "3mo";
        interval = "1d";
        break;
      case "6M":
        range = "6mo";
        interval = "1d";
        break;
      case "1Y":
        range = "1y";
        interval = "1d";
        break;
      case "5Y":
        range = "5y";
        interval = "1d";
        break;
      default:
        range = "6mo";
        interval = "1d";
    }
  } else {
    // For private mode, use full historical data
    switch (timeframe) {
      case "1m":
        range = "5d";
        interval = "1m";
        break;
      case "5m":
        range = "1mo";
        interval = "5m";
        break;
      case "15m":
        range = "1mo";
        interval = "15m";
        break;
      case "30m":
        range = "1mo";
        interval = "30m";
        break;
      case "1H":
        range = "1mo";
        interval = "1h";
        break;
      case "4H":
        range = "6mo";
        interval = "1h"; // Yahoo Finance doesn't have 4H, using 1H
        break;
      case "1D":
        range = "max"; // Full historical data for private mode
        interval = "1d";
        break;
      case "5D":
        range = "1mo";
        interval = "1d";
        break;
      case "1W":
        range = "max"; // Full historical data for private mode
        interval = "1wk";
        break;
      case "1M":
        range = "max"; // Full historical data for private mode
        interval = "1mo";
        break;
      case "3M":
        range = "3mo";
        interval = "1d";
        break;
      case "6M":
        range = "6mo";
        interval = "1d";
        break;
      case "1Y":
        range = "1y";
        interval = "1d";
        break;
      case "5Y":
        range = "5y";
        interval = "1d";
        break;
      default:
        range = "max";
        interval = "1d";
    }
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

    let data = timestamps
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

    // For public mode, filter data to only include recent data (from November 2025 onwards)
    if (!isPrivateMode) {
      // Filter data to only include dates from November 2025 onwards
      // Note: This is a simplified approach. In practice, you might want to adjust this based on your needs.
      const november2025Timestamp = new Date('2025-11-01').getTime() / 1000;
      data = data.filter(d => (d.time as number) >= november2025Timestamp);
    }

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