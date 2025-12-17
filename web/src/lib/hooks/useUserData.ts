import { useState, useEffect } from "react";
import {
  getUserBalance,
  getUserDetail,
  UserBalance,
  UserDetail,
} from "../services/userService";

interface UserData {
  userDetail: UserDetail | null;
  userBalance: UserBalance | null;
  loading: boolean;
  error: string | null;
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData>({
    userDetail: null,
    userBalance: null,
    loading: true,
    error: null,
  });

  const fetchUserData = async () => {
    try {
      setUserData((prev) => ({ ...prev, loading: true, error: null }));

      // Fetch both user detail and balance in parallel
      const [userDetail, userBalance] = await Promise.all([
        getUserDetail(),
        getUserBalance(),
      ]);

      setUserData({
        userDetail,
        userBalance,
        loading: false,
        error: null,
      });
    } catch (error) {
      // Error fetching user data handling
      setUserData((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch user data",
      }));
    }
  };

  useEffect(() => {
    // Only fetch if we have an access token
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchUserData();
    } else {
      setUserData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  return { ...userData, refreshUserData: fetchUserData };
}
