export type SharesResponse = {
  userId: number;
  shares: Record<string, number>;
  data?: Array<{
    stock_symbol: string;
    quantity: number;
    avg_price: string;
    total_value: string;
    unrealized_pnl: string;
    updated_at: string;
  }>;
};

function getAccessToken() {
  // bạn có thể đổi key nếu localStorage bạn đang dùng key khác
  return typeof window !== "undefined"
    ? localStorage.getItem("access_token")
    : null;
}

export async function fetchShares(stocks: string[]): Promise<SharesResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Missing access_token in localStorage");

  // Filter to only include Vietnamese stocks (ending with .VN)
  const vnStocks = stocks.filter((symbol) => symbol.endsWith(".VN"));

  if (vnStocks.length === 0) {
    return {
      userId: 0,
      shares: {},
    };
  }

  const res = await fetch("http://localhost:3001/api/orders/shares", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ stocks: vnStocks }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fetchShares failed: ${res.status} ${text}`);
  }

  const result = await res.json();

  return result;
}
