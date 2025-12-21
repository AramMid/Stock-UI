"use client";

import { JSX, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserBalance, getUserDetail } from "@/lib/services/userService";

import styles from "./settings.scope.module.css";

// --- SVG ICONS ---
const Icons = {
  User: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  Wallet: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  Logout: () => (
    <svg
      width="22"
      height="22"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  ),
  Back: () => (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
  Check: () => (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Shield: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
};

type TabId = "profile" | "funds" | "logout";

type UserData = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  balance: number;
  is_active: boolean;
  address: string;
  dob: string;
  occupation: string;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  created_at: Date | null;
};

const colorMap = {
  blue: { iconActive: "text-blue-400", dot: "bg-blue-500" },
  emerald: { iconActive: "text-emerald-400", dot: "bg-emerald-500" },
  red: { iconActive: "text-red-400", dot: "bg-red-500" },
} as const;

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  icon: () => JSX.Element;
  color: keyof typeof colorMap;
}> = [
  { id: "profile", label: "Profile Settings", icon: Icons.User, color: "blue" },
  { id: "funds", label: "Wallet & Funds", icon: Icons.Wallet, color: "emerald" },
  { id: "logout", label: "Log Out", icon: Icons.Logout, color: "red" },
];

// =========================
// CHART SESSION CLEANUP
// =========================
// Must match useChart.ts prefix
const CHART_SESSION_PREFIX = "sim_chart_session_v1";

const clearChartSessions = () => {
  // remove chart sessions stored in sessionStorage
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith(CHART_SESSION_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
};

export default function SettingsPage() {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData>({
    id: 0,
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    balance: 0,
    is_active: false,
    address: "",
    dob: "",
    occupation: "",
    email_verified_at: null,
    last_login_at: null,
    created_at: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [occupation, setOccupation] = useState("");

  const [topUpAmount, setTopUpAmount] = useState<number | string>(10_000_000);
  const [selectedPreset, setSelectedPreset] = useState(10_000_000);
  const [successMessage, setSuccessMessage] = useState("");

  // ✅ NEW: Profile Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // =========================
  // WAITING / DEPOSIT FLOW
  // =========================
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositCountdown, setDepositCountdown] = useState(0); // seconds remaining
  const [depositError, setDepositError] = useState<string | null>(null);
  const apiCalledRef = useRef(false);

  const intervalRef = useRef<number | null>(null);
  const timeout30Ref = useRef<number | null>(null);
  const timeout32Ref = useRef<number | null>(null);

  const safeParseAmount = (v: number | string): number => {
    const n = typeof v === "number" ? v : Number(String(v).replaceAll(",", ""));
    if (!Number.isFinite(n)) return 0;
    return Math.floor(n);
  };

  const clearDepositTimers = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeout30Ref.current) {
      window.clearTimeout(timeout30Ref.current);
      timeout30Ref.current = null;
    }
    if (timeout32Ref.current) {
      window.clearTimeout(timeout32Ref.current);
      timeout32Ref.current = null;
    }
  };

  const patchBalanceUpdate = async (available_balance: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Not authenticated. Please log in.");

    const res = await fetch("http://localhost:3001/api/user/balance-update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ available_balance }),
    });

    if (!res.ok) {
      let msg = `Balance update failed (${res.status})`;
      try {
        const data = await res.json();
        msg =
          data?.message ||
          data?.error ||
          (typeof data === "string" ? data : msg);
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  // ✅ NEW: PATCH /api/user/update helper
  const patchUserUpdate = async (payload: Record<string, any>) => {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Not authenticated. Please log in.");

    const res = await fetch("http://localhost:3001/api/user/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = `Update failed (${res.status})`;
      try {
        const data = await res.json();
        msg = data?.message || data?.error || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [userDetail, userBalance] = await Promise.all([
          getUserDetail(),
          getUserBalance(),
        ]);

        const userDataObj: UserData = {
          id: userDetail.id,
          email: userDetail.email,
          first_name: userDetail.first_name,
          last_name: userDetail.last_name,
          phone: userDetail.phone ?? "",
          balance: Number(userBalance?.balance?.availableBalance ?? 0) || 0,
          is_active: userDetail.is_active,
          address: "",
          dob: "",
          occupation: "",
          email_verified_at: userDetail.email_verified_at
            ? new Date(userDetail.email_verified_at)
            : null,
          last_login_at: userDetail.last_login_at
            ? new Date(userDetail.last_login_at)
            : null,
          created_at: userDetail.created_at
            ? new Date(userDetail.created_at)
            : null,
        };

        setUserData(userDataObj);

        setFirstName(userDetail.first_name);
        setLastName(userDetail.last_name);
        setEmail(userDetail.email);
        setPhone(userDetail.phone ?? "");
        setAddress("");
        setDob("");
        setOccupation("");
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem("access_token");
    if (token) fetchUserData();
    else {
      setLoading(false);
      setError("Not authenticated. Please log in.");
    }
  }, []);

  useEffect(() => {
    setFirstName(userData.first_name);
    setLastName(userData.last_name);
    setEmail(userData.email);
    setPhone(userData.phone ?? "");
    setAddress(userData.address ?? "");
    setDob(userData.dob ?? "");
    setOccupation(userData.occupation ?? "");
  }, [userData]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearDepositTimers();
    };
  }, []);

  const initials = `${userData.first_name?.[0] || ""}${userData.last_name?.[0] || ""}`.toUpperCase();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // ✅ UPDATED: Save Changes will call PATCH /api/user/update with ONLY changed fields
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setSaveError(null);

    const clean = (v: string) => (v ?? "").trim();

    const nextFirst = clean(firstName);
    const nextLast = clean(lastName);
    const nextEmail = clean(email);
    const nextPhone = clean(phone);

    // Build payload with only changed fields
    const payload: Record<string, any> = {};
    if (nextFirst !== clean(userData.first_name)) payload.first_name = nextFirst;
    if (nextLast !== clean(userData.last_name)) payload.last_name = nextLast;
    if (nextEmail !== clean(userData.email)) payload.email = nextEmail;

    // phone: backend expects "phone" (string). If user clears -> send "" (or null if your backend wants null)
    const currentPhone = clean(userData.phone ?? "");
    if (nextPhone !== currentPhone) payload.phone = nextPhone;

    // If nothing changed
    if (Object.keys(payload).length === 0) {
      showSuccess("No changes to save");
      return;
    }

    try {
      setIsSaving(true);

      // Call API
      await patchUserUpdate(payload);

      // Update local UI state after success
      setUserData((prev) => ({
        ...prev,
        ...(payload.first_name !== undefined
          ? { first_name: payload.first_name }
          : {}),
        ...(payload.last_name !== undefined ? { last_name: payload.last_name } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        // keep address/dob/occupation in UI as you had (not sent to backend)
        address,
        dob,
        occupation,
      }));

      showSuccess("Profile updated successfully");
    } catch (err: any) {
      console.error("Profile update error:", err);
      setSaveError(err?.message || "Update failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Confirm Deposit -> wait 32s, call API at second 30
  const handleMoneyRequest = () => {
    if (isDepositing) return;

    setDepositError(null);

    const amount = safeParseAmount(topUpAmount);
    if (!amount || amount <= 0) {
      setDepositError("Invalid amount. Please enter a positive number.");
      return;
    }

    // Start waiting UI
    setIsDepositing(true);
    apiCalledRef.current = false;
    setDepositCountdown(32);

    clearDepositTimers();

    // Tick countdown every second
    intervalRef.current = window.setInterval(() => {
      setDepositCountdown((prev) => {
        const next = Math.max(0, prev - 1);
        return next;
      });
    }, 1000);

    // At 30 seconds (elapsed), i.e. after 30000ms -> call API once
    timeout30Ref.current = window.setTimeout(async () => {
      if (apiCalledRef.current) return;
      apiCalledRef.current = true;

      try {
        await patchBalanceUpdate(amount);

        // Refresh balance from backend (source of truth)
        const latest = await getUserBalance();
        const newBalance = Number(latest?.balance?.availableBalance ?? 0) || 0;
        setUserData((prev) => ({ ...prev, balance: newBalance }));
      } catch (err: any) {
        console.error("Deposit API error:", err);
        setDepositError(err?.message || "Deposit failed. Please try again.");
      }
    }, 30_000);

    // Finish after 32 seconds
    timeout32Ref.current = window.setTimeout(() => {
      clearDepositTimers();
      setIsDepositing(false);

      // If API failed, keep error visible
      if (!depositError) {
        showSuccess(`Deposit request submitted: ${formatCurrency(amount)}`);
      }
      // Reset countdown
      setDepositCountdown(0);
    }, 32_000);
  };

  // ✅ UPDATED: Logout clears token + chart sessions
  const handleLogout = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("sessionId");

      // clear chart-related sessions (PUBLIC chart sessions stored in sessionStorage)
      clearChartSessions();
    } finally {
      router.push("/login");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`${styles.scope} min-h-screen flex items-center justify-center selection:bg-blue-500/30`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-200">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`${styles.scope} min-h-screen flex items-center justify-center selection:bg-blue-500/30`}
      >
        <div className="text-center max-w-md p-6 bg-[#222736] rounded-2xl border border-[#343b4d]">
          <div className="text-red-500 text-2xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.scope} min-h-screen flex flex-col items-center selection:bg-blue-500/30`}
    >
      {/* WAITING OVERLAY (32s) */}
      {isDepositing && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-[#222736] border border-[#343b4d] rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Processing deposit
                </h3>
                <p className="text-sm text-gray-400">
                  Please wait… system is simulating settlement.
                </p>
              </div>
            </div>

            <div className="bg-[#181c24] border border-[#343b4d] rounded-2xl p-5">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>Time remaining</span>
                <span className="font-mono text-emerald-400">
                  {depositCountdown}s
                </span>
              </div>

              <div className="mt-3 h-2 w-full rounded-full bg-[#0f1219] overflow-hidden border border-[#343b4d]">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, ((32 - depositCountdown) / 32) * 100)
                    )}%`,
                    transition: "width 250ms linear",
                  }}
                />
              </div>

              <div className="mt-4 text-xs text-gray-400 leading-relaxed">
                • Waiting for admin acceptable:{" "}
                <span className="text-gray-200 font-mono">...is loading</span>
                <br />
                • Amount:{" "}
                <span className="text-emerald-400 font-mono">
                  {formatCurrency(safeParseAmount(topUpAmount))}
                </span>
              </div>

              {depositError && (
                <div className="mt-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  {depositError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#181c24]/95 backdrop-blur-md border-b border-[#343b4d] w-full flex justify-center shadow-sm">
        <div className="w-full max-w-6xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#222736] transition-all"
              aria-label="Back"
            >
              <Icons.Back />
            </button>
            <div className="h-8 w-[1px] bg-[#343b4d]" />
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">
                SETTINGS
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-200">
                {firstName} {lastName}
              </div>
              <div className="text-xs text-gray-500 font-mono">
                ID: {userData.id}
              </div>
            </div>

            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-[1px] shadow-lg shadow-blue-500/20">
              <div className="h-full w-full rounded-xl bg-[#222736] flex items-center justify-center text-sm font-bold text-blue-400">
                {initials}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SUCCESS TOAST */}
      <div
        className={`fixed top-24 right-6 z-50 transform transition-all duration-500 ${
          successMessage
            ? "translate-x-0 opacity-100"
            : "translate-x-10 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-[#222736] border border-green-500/30 text-green-400 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
          <div className="bg-green-500/10 p-1.5 rounded-full">
            <Icons.Check />
          </div>
          <span className="text-base font-medium">{successMessage}</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="w-full max-w-6xl px-6 pb-12 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-3">
            <div className="bg-[#222736] rounded-3xl border border-[#343b4d] p-3 sticky top-28">
              <nav className="space-y-2">
                {NAV_ITEMS.map((item) => {
                  const palette = colorMap[item.color];
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#181c24] text-white shadow-inner"
                          : "text-gray-400 hover:bg-[#181c24]/60 hover:text-gray-200"
                      }`}
                    >
                      <span
                        className={`${
                          isActive
                            ? palette.iconActive
                            : "text-gray-500 group-hover:text-gray-400"
                        }`}
                      >
                        <item.icon />
                      </span>

                      {item.label}

                      {isActive && (
                        <div
                          className={`ml-auto w-2 h-2 rounded-full ${palette.dot} shadow-[0_0_8px_currentColor]`}
                        />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 mx-3 p-5 rounded-2xl bg-gradient-to-b from-[#181c24] to-[#222736] border border-[#343b4d]">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                  Total Equity
                </p>
                <p className="mt-2 text-xl font-mono font-medium text-white">
                  {formatCurrency(userData.balance)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-emerald-500 font-medium">
                    System Online
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT AREA */}
          <section className="lg:col-span-9">
            <div className="bg-[#222736] rounded-3xl border border-[#343b4d] min-h-[600px] overflow-hidden relative flex flex-col">
              {/* --- TAB: PROFILE --- */}
              {activeTab === "profile" && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="border-b border-[#343b4d] bg-[#181c24]/30 px-10 py-8 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        General Information
                      </h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Update your personal details and public profile
                      </p>
                    </div>
                    <div className="text-sm px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-2">
                      <Icons.Shield /> Verified
                    </div>
                  </div>

                  <div className="p-10">
                    <form
                      onSubmit={handleProfileSubmit}
                      className="flex flex-col gap-12"
                    >
                      <div className="space-y-10">
                        {/* Identity Section */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 pl-3 border-l-4 border-blue-500">
                            Identity
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            <InputGroup
                              label="First Name"
                              value={firstName}
                              onChange={setFirstName}
                            />
                            <InputGroup
                              label="Last Name"
                              value={lastName}
                              onChange={setLastName}
                            />
                          </div>
                        </div>

                        {/* Contact Section */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 pl-3 border-l-4 border-blue-500">
                            Contact
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            <InputGroup
                              label="Email Address"
                              value={email}
                              onChange={setEmail}
                              type="email"
                            />
                            <InputGroup
                              label="Phone Number"
                              value={phone}
                              onChange={setPhone}
                              type="tel"
                            />
                          </div>
                        </div>

                        {/* Save error */}
                        {saveError && (
                          <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-center">
                            {saveError}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-center mt-6">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className={`px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-2xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all transform hover:-translate-y-0.5 active:scale-95 min-w-[260px] ${
                            isSaving
                              ? "opacity-60 cursor-not-allowed hover:translate-y-0"
                              : ""
                          }`}
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* --- TAB: FUNDS --- */}
              {activeTab === "funds" && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="border-b border-[#343b4d] bg-[#181c24]/30 px-10 py-8">
                    <h2 className="text-xl font-bold text-white">
                      Wallet Management
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Simulated funds for paper trading environment
                    </p>
                  </div>

                  <div className="p-10 flex-1 flex flex-col gap-9">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e293b] via-[#2d3748] to-[#1e293b] border border-[#475569] p-10 mb-10 group shadow-2xl">
                      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all duration-700" />
                      <div className="relative z-10 flex justify-between items-start">
                        <div>
                          <p className="text-sm text-emerald-400 font-medium tracking-widest uppercase mb-3">
                            Available Balance
                          </p>
                          <h3 className="text-5xl font-mono font-bold text-white">
                            {formatCurrency(userData.balance)}
                          </h3>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-3 rounded-2xl text-white">
                          <Icons.Wallet />
                        </div>
                      </div>
                      <div className="relative z-10 mt-10 flex justify-between items-end">
                        <div className="text-sm text-gray-300 font-mono tracking-widest">
                          **** **** **** 8888
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm text-gray-200 font-medium">
                            Sandbox Mode
                          </span>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-medium text-white mb-6 pl-1">
                      Quick Deposit
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 gap-y-6 gap-x-6">
                      {[10_000_000, 50_000_000, 100_000_000, 500_000_000].map(
                        (amount) => (
                          <button
                            key={amount}
                            disabled={isDepositing}
                            onClick={() => {
                              setSelectedPreset(amount);
                              setTopUpAmount(amount);
                            }}
                            className={`py-5 px-4 rounded-2xl text-sm font-mono font-medium transition-all border h-14 ${
                              selectedPreset === amount
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "bg-[#181c24] border-[#343b4d] text-gray-400 hover:border-gray-500 hover:text-white"
                            } ${isDepositing ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {formatCurrency(amount)}
                          </button>
                        )
                      )}
                    </div>

                    <div className="bg-[#181c24] rounded-3xl p-8 border border-[#343b4d]">
                      <label className="block text-center text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">
                        Or Enter Custom Amount
                      </label>
                      <input
                        type="number"
                        value={topUpAmount}
                        disabled={isDepositing}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className={`w-full bg-[#222736] border border-[#343b4d] rounded-2xl py-5 text-center text-white text-2xl font-mono focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-600 shadow-inner ${
                          isDepositing ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      />
                      {depositError && (
                        <div className="mt-4 text-sm text-rose-400 text-center">
                          {depositError}
                        </div>
                      )}
                    </div>

                    <div className="mt-18 flex justify-center h-14">
                      <button
                        onClick={handleMoneyRequest}
                        disabled={isDepositing}
                        className={`px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold rounded-2xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] transition-all transform hover:-translate-y-0.5 active:scale-95 min-w-[260px] ${
                          isDepositing
                            ? "opacity-60 cursor-not-allowed hover:translate-y-0"
                            : ""
                        }`}
                      >
                        {isDepositing
                          ? `Processing… (${depositCountdown}s)`
                          : "Confirm Deposit"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB: LOGOUT --- */}
              {activeTab === "logout" && (
                <div className="flex-1 h-full flex items-center justify-center p-10 animate-in zoom-in-95 duration-300">
                  <div className="w-full max-w-lg flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300 gap-9">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                      <div className="text-red-500 scale-150">
                        <Icons.Logout />
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                      Sign Out
                    </h2>

                    <p className="text-gray-400 max-w-sm text-base leading-relaxed">
                      Are you sure you want to log out? Your active simulation
                      sessions will be paused until you return.
                    </p>

                    <div className="flex gap-6 justify-center w-full mt-4">
                      <button
                        onClick={() => setActiveTab("profile")}
                        className="flex-1 py-4 rounded-2xl bg-[#343b4d] hover:bg-[#40485c] text-white font-medium text-lg transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-medium text-lg shadow-lg shadow-red-900/20 transition-transform active:scale-95"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 font-mono">
                SECURE CONNECTION · SSL ENCRYPTED
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// --- Input Component ---
function InputGroup({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="group w-full">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 group-focus-within:text-blue-400 transition-colors ml-1">
        {label}
      </label>

      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#181c24] border border-[#343b4d] text-gray-100 text-lg rounded-2xl py-4 pl-6 pr-6 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 shadow-inner"
        />
      </div>
    </div>
  );
}
