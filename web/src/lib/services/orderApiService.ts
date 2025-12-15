/**
 * Service to handle REST API calls for orders
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Helper function to get authorization header
function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Define the CreateOrderDto interface based on the sample JSON
// CreateOrderDto interface matching NestJS DTO
export interface CreateOrderDto {
  stockSymbol: string;
  orderType: string; // 'limit' | 'market' | etc.
  side: "buy" | "sell";
  quantity: number;
  price?: number; // Optional for market orders
  status?: string; // Optional status field
  filledQuantity?: number;
  filledPrice?: number;
  commission?: number;
  filledAt?: string;
}

// Define the query parameters interface for getting orders
export interface GetOrdersQuery {
  limit?: number;
  offset?: number;
  status?: string;
  stockSymbol?: string;
}

// Define the response interface for orders used in UI
export interface OrderResponse {
  id: string;
  stockSymbol: string;
  orderType: string;
  side: "buy" | "sell";
  quantity: number;
  price?: number;
  status: string; // PENDING / FILLED / CANCELED / ...
  createdAt: string;
}

// =====================
// Types cho API backend
// =====================

interface ApiOrder {
  id: number;
  stock_symbol: string;
  order_type: string;
  side: string;
  quantity: number;
  price: string | null;
  status: string;
  created_at: string;
  // có thể còn field khác (session_id, user_id, ...) nhưng UI không cần
}

interface ApiListPayload {
  data: ApiOrder[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Create a new order
 * @param order Order data to create
 * @returns Promise resolving to the created order
 */
export async function createOrder(order: CreateOrderDto): Promise<ApiOrder> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      throw new Error(`Failed to create order: ${response.statusText}`);
    }

    const result: ApiEnvelope<ApiOrder> = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
}

/**
 * Fetch orders with optional query parameters
 * @param query Optional query parameters
 * @returns Promise resolving to array of orders
 */
export async function getOrders(query?: GetOrdersQuery): Promise<OrderResponse[]> {
  try {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/orders?${params.toString()}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }

    const result: ApiEnvelope<ApiListPayload> = await response.json();
    return result.data.data.map((order: ApiOrder) => ({
      id: String(order.id),
      stockSymbol: order.stock_symbol,
      orderType: order.order_type,
      side: order.side as "buy" | "sell",
      quantity: order.quantity,
      price: order.price ? parseFloat(order.price) : undefined,
      status: order.status,
      createdAt: order.created_at,
    }));
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

/**
 * Fetch user's share positions for specified stocks
 * @param stocks Array of stock symbols to fetch positions for
 * @returns Promise resolving to a map of symbol -> quantity
 */
export async function fetchSharePositions(stocks: string[]): Promise<Map<string, number>> {
  try {
    // Filter to only include Vietnamese stocks (ending with .VN)
    const vnStocks = stocks.filter(symbol => symbol.endsWith('.VN'));
    
    console.log('Fetching share positions for stocks:', vnStocks);
    
    const response = await fetch(`${API_BASE_URL}/api/orders/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        stocks: vnStocks
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch share positions: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Share positions API response:', result);
    
    // Convert the shares object to a Map
    const positions = new Map<string, number>();
    if (result.data && result.data.shares && typeof result.data.shares === 'object') {
      Object.entries(result.data.shares).forEach(([symbol, quantity]) => {
        positions.set(symbol, Number(quantity) || 0);
      });
    }
    
    console.log('Processed positions map:', positions);
    return positions;
  } catch (error) {
    console.error('Error fetching share positions:', error);
    return new Map(); // Return empty map on error
  }
}
