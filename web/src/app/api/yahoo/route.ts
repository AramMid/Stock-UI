import { NextRequest, NextResponse } from "next/server";

/**
 * Yahoo Finance API Route Handler
 * Fetches stock data from Yahoo Finance and returns it as JSON
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "AAPL";
    const interval = searchParams.get("interval") || "1d";
    const range = searchParams.get("range") || "1y";

    console.log(
      `API Request - Symbol: ${symbol}, Interval: ${interval}, Range: ${range}`
    );

    // Handle special symbols like FUESSV30.HM
    let yahooSymbol = symbol;
    if (symbol === "FUESSV30.HM") {
      // Use a more accessible symbol for Vietnamese ETF or fallback to mock data
      yahooSymbol = "VNM.HM"; // Vietnam Dairy Products Joint Stock Company as fallback
    }

    // Yahoo Finance API endpoint
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;

    console.log(`Fetching data from Yahoo Finance: ${yahooUrl}`);

    const response = await fetch(yahooUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    // if (!response.ok) {
    //   console.error(
    //     `Yahoo Finance API error: ${response.status} ${response.statusText}`
    //   );

    //   // Return mock data for development instead of error
    //   console.log("Returning mock data due to API error");
    //   const mockData = generateMockData(symbol);
    //   return NextResponse.json(mockData, {
    //     headers: {
    //       "Access-Control-Allow-Origin": "*",
    //       "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    //       "Access-Control-Allow-Headers": "Content-Type, Authorization",
    //     },
    //   });
    // }

    const data = await response.json();

    // // Validate the response structure
    // if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
    //   console.error("Invalid Yahoo Finance response structure:", data);

    //   // Return mock data instead of error
    //   console.log("Returning mock data due to invalid response structure");
    //   const mockData = generateMockData(symbol);
    //   return NextResponse.json(mockData, {
    //     headers: {
    //       "Access-Control-Allow-Origin": "*",
    //       "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    //       "Access-Control-Allow-Headers": "Content-Type, Authorization",
    //     },
    //   });
    // }

    // Add CORS headers for development
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    console.log(`Successfully fetched data for ${symbol}`);
    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error("Yahoo Finance API route error:", error);

    // Return mock data if Yahoo Finance is unavailable
    // const mockData = generateMockData();

    // return NextResponse.json(mockData, {
    //   headers: {
    //     "Access-Control-Allow-Origin": "*",
    //     "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    //     "Access-Control-Allow-Headers": "Content-Type, Authorization",
    //   },
    // });
  }
}


export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}


// function generateMockData(symbol = "MOCK") {
//   const now = Math.floor(Date.now() / 1000);
//   const dayInSeconds = 24 * 60 * 60;
//   const timestamps: number[] = [];
//   const opens: number[] = [];
//   const highs: number[] = [];
//   const lows: number[] = [];
//   const closes: number[] = [];
//   const volumes: number[] = [];

//   // Set different base prices for different symbols
//   let currentPrice = 100;
//   if (symbol === "FUESSV30.HM") {
//     currentPrice = 245.3;
//   } else if (symbol === "AAPL") {
//     currentPrice = 245.5;
//   } else if (symbol === "MSFT") {
//     currentPrice = 517.93;
//   }

//   // Generate 30 days of mock data
//   for (let i = 29; i >= 0; i--) {
//     const timestamp = now - i * dayInSeconds;
//     timestamps.push(timestamp);

//     const open = +(currentPrice + (Math.random() - 0.5) * 2).toFixed(2);
//     const changePercent = (Math.random() - 0.5) * 0.08; // -4% to +4%
//     const close = +(open * (1 + changePercent)).toFixed(2);
//     const high = +(Math.max(open, close) * (1 + Math.random() * 0.03)).toFixed(
//       2
//     );
//     const low = +(Math.min(open, close) * (1 - Math.random() * 0.03)).toFixed(
//       2
//     );
//     const volume = Math.floor(500000 + Math.random() * 2000000);

//     opens.push(open);
//     highs.push(high);
//     lows.push(low);
//     closes.push(close);
//     volumes.push(volume);

//     currentPrice = close;
//   }

//   return {
//     chart: {
//       result: [
//         {
//           meta: {
//             currency: symbol === "FUESSV30.HM" ? "VND" : "USD",
//             symbol: symbol,
//             exchangeName: symbol === "FUESSV30.HM" ? "HCMC" : "NASDAQ",
//             instrumentType: "EQUITY",
//             firstTradeDate: timestamps[0],
//             regularMarketTime: now,
//             gmtoffset: 0,
//             timezone: "GMT",
//             exchangeTimezoneName: "GMT",
//             regularMarketPrice: closes[closes.length - 1],
//             chartPreviousClose: closes[closes.length - 2],
//             currentTradingPeriod: {
//               pre: {
//                 timezone: "GMT",
//                 start: now - 3600,
//                 end: now,
//                 gmtoffset: 0,
//               },
//               regular: {
//                 timezone: "GMT",
//                 start: now,
//                 end: now + 3600,
//                 gmtoffset: 0,
//               },
//               post: {
//                 timezone: "GMT",
//                 start: now + 3600,
//                 end: now + 7200,
//                 gmtoffset: 0,
//               },
//             },
//             dataGranularity: "1d",
//             range: "1mo",
//             validRanges: [
//               "1d",
//               "5d",
//               "1mo",
//               "3mo",
//               "6mo",
//               "1y",
//               "2y",
//               "5y",
//               "10y",
//               "ytd",
//               "max",
//             ],
//           },
//           timestamp: timestamps,
//           indicators: {
//             quote: [
//               {
//                 open: opens,
//                 high: highs,
//                 low: lows,
//                 close: closes,
//                 volume: volumes,
//               },
//             ],
//             adjclose: [
//               {
//                 adjclose: closes,
//               },
//             ],
//           },
//         },
//       ],
//       error: null,
//     },
//   };
// }
