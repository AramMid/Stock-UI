/**
 * Service to handle REST API calls for user data
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Define the user data interfaces based on the API responses
export interface UserBalance {
  userId: number;
  balance: {
    availableBalance: number;
    frozenBalance: number;
    totalInvested: number;
    totalPnl: number;
    updatedAt: string;
  };
  portfolios: unknown[];
}

export interface UserDetail {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  email_verified_at: string | null;
  is_active: boolean;
  last_login_at: string | null;
  login_attemps: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to get authorization header
function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Get user balance information
 * @returns Promise with user balance data
 */
export async function getUserBalance(): Promise<UserBalance> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/me/balance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error fetching user balance:", error);
    throw error;
  }
}

/**
 * Get user detail information
 * @returns Promise with user detail data
 */
export async function getUserDetail(): Promise<UserDetail> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/detail`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error fetching user detail:", error);
    throw error;
  }
}