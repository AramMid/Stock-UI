/**
 * Service to handle REST API calls for orders
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
 * Create a new order via REST API
 * @param orderData The order data to create
 * @returns Promise with the order object from the API
 */
export async function createOrder(
  orderData: CreateOrderDto
): Promise<ApiOrder> {
  // Safety check to prevent "pending" status from being sent to database
  if (orderData.status && orderData.status.toLowerCase() === "pending") {
    console.error("Attempted to send 'pending' status to database. This should not happen.", orderData);
    throw new Error("Invalid status: 'pending' orders should not be sent to database");
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      // Nếu backend chưa bật route / lỗi gì đó
      if (response.status === 404) {
        console.warn(
          "Order API not found (404). Order will be processed locally without backend persistence."
        );
        // Trả về mock cho FE nếu bạn vẫn muốn xử lý local
        const now = new Date().toISOString();
        // Safety check to prevent "pending" status from being sent to database
        const statusToSend = (orderData.status && orderData.status.toLowerCase() !== "pending") 
          ? orderData.status 
          : "LOCAL";
        
        return {
          id: Date.now(),
          stock_symbol: orderData.stockSymbol,
          order_type: orderData.orderType,
          side: orderData.side,
          quantity: orderData.quantity,
          price:
            orderData.price != null ? orderData.price.toString() : null,
          status: statusToSend, // Use provided status or default to "LOCAL", but never "pending"
          created_at: now,
        };
      }
      // For other errors, try to get more details
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorText = await response.text();
        errorMessage += ` - Details: ${errorText}`;
      } catch (e) {
        // If we can't read the error details, just use the status
        console.warn("Could not read error details from response");
      }
      
      throw new Error(errorMessage);
    }

    const raw = (await response.json()) as ApiEnvelope<ApiOrder> | ApiOrder;

    // Backend có thể trả { success, data, timestamp } hoặc trả thẳng order
    const apiOrder =
      (raw as ApiEnvelope<ApiOrder>).data && (raw as ApiEnvelope<ApiOrder>).success
        ? ((raw as ApiEnvelope<ApiOrder>).data as ApiOrder)
        : (raw as ApiOrder);

    return apiOrder;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn(
        "Unable to connect to order API. Order will be processed locally without backend persistence.",
        error
      );
      const now = new Date().toISOString();
      // mock order local
      // Safety check to prevent "pending" status from being sent to database
      const statusToSend = (orderData.status && orderData.status.toLowerCase() !== "pending") 
        ? orderData.status 
        : "LOCAL";
      
      return {
        id: Date.now(),
        stock_symbol: orderData.stockSymbol,
        order_type: orderData.orderType,
        side: orderData.side,
        quantity: orderData.quantity,
        price:
          orderData.price != null ? orderData.price.toString() : null,
        status: statusToSend, // Use provided status or default to "LOCAL", but never "pending"
        created_at: now,
      };
    }

    console.error("Error creating order:", error);
    throw error;
  }
}

/**
 * Get orders via REST API
 * @param queryParams Query parameters for filtering orders
 * @returns Promise with the response from the API mapped to OrderResponse[]
 */
export async function getOrders(
  queryParams: GetOrdersQuery
): Promise<OrderResponse[]> {
  try {
    // Build query string from parameters
    const queryString = new URLSearchParams();

    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString());
      }
    });

    const url =
      `${API_BASE_URL}/api/orders` +
      (queryString.toString() ? `?${queryString.toString()}` : "");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(
          "Order API not found (404). Returning empty order list."
        );
        return [];
      }
      // For other errors, try to get more details
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorText = await response.text();
        errorMessage += ` - Details: ${errorText}`;
      } catch (e) {
        // If we can't read the error details, just use the status
        console.warn("Could not read error details from response");
      }
      
      throw new Error(errorMessage);
    }

    const raw = (await response.json()) as
      | ApiEnvelope<ApiListPayload>
      | ApiListPayload
      | ApiOrder[];

    console.log("getOrders raw response:", raw);

    // 1. unwrap layer { success, data, timestamp } nếu có
    const payload = (raw as ApiEnvelope<ApiListPayload>).data ?? (raw as ApiListPayload);

    // 2. xác định mảng orders
    let list: ApiOrder[] = [];

    if (payload && Array.isArray(payload.data)) {
      // dạng { data: [...], meta: {...} }
      list = payload.data as ApiOrder[];
    } else if (Array.isArray(payload)) {
      // dạng [...orders]
      list = payload as ApiOrder[];
    } else {
      console.warn("getOrders: Unexpected payload shape:", payload);
      return [];
    }

    // 3. map sang OrderResponse cho UI
    const mapped: OrderResponse[] = list.map((order) => ({
      id: order.id.toString(),
      stockSymbol: order.stock_symbol,
      orderType: order.order_type,
      side: order.side === "buy" ? "buy" : "sell",
      quantity: order.quantity,
      price:
        order.price != null
          ? parseFloat(order.price as string)
          : undefined,
      status: order.status.toUpperCase(), // "PENDING" -> "PENDING"
      createdAt: order.created_at,
    }));

    return mapped;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn(
        "Unable to connect to order API. Returning empty order list.",
        error
      );
      return [];
    }

    console.error("Error fetching orders:", error);
    throw error;
  }
}
