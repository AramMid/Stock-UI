"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- SVG ICONS ---
const Icons = {
  User: () => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Wallet: () => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Logout: () => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Back: () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

export default function SettingsPage() {
  const router = useRouter();

  // Mock Data
  const [userData, setUserData] = useState({
    id: 12345,
    email: "trader@finance.vn",
    first_name: "Alex",
    last_name: "Nguyen",
    phone: "+84 912 345 678",
    balance: 200000000,
    is_active: true,
    address: "Saigon Centre, Dist 1, HCMC",
    dob: "1995-08-15",
    occupation: "Senior Quant Trader",
    email_verified_at: new Date("2024-01-15"),
    last_login_at: new Date(),
    created_at: new Date("2023-05-20"),
  });

  const [activeTab, setActiveTab] = useState<"profile" | "funds" | "logout">("profile");

  const [firstName, setFirstName] = useState(userData.first_name);
  const [lastName, setLastName] = useState(userData.last_name);
  const [email, setEmail] = useState(userData.email);
  const [phone, setPhone] = useState(userData.phone ?? "");
  const [address, setAddress] = useState(userData.address ?? "");
  const [dob, setDob] = useState(userData.dob ?? "");
  const [occupation, setOccupation] = useState(userData.occupation ?? "");

  const [topUpAmount, setTopUpAmount] = useState<number | string>(10000000);
  const [selectedPreset, setSelectedPreset] = useState(10000000);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setFirstName(userData.first_name);
    setLastName(userData.last_name);
    setEmail(userData.email);
    setPhone(userData.phone ?? "");
    setAddress(userData.address ?? "");
    setDob(userData.dob ?? "");
    setOccupation(userData.occupation ?? "");
  }, [userData]);

  const initials = `${userData.first_name?.[0] || ""}${userData.last_name?.[0] || ""}`.toUpperCase();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserData((prev) => ({
      ...prev,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      dob,
      occupation,
    }));
    showSuccess("Profile updated successfully");
  };

  const handleMoneyRequest = () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return;
    setUserData((prev) => ({ ...prev, balance: prev.balance + amount }));
    showSuccess(`Deposited ${formatCurrency(amount)}`);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleLogout = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[#181c24] text-gray-200 font-sans selection:bg-blue-500/30 flex flex-col items-center">
      
      {/* HEADER */}
      {/* FIX: Thêm w-full để background trải dài, nhưng nội dung bên trong sẽ dùng max-w-6xl để căn giữa */}
      <header className="sticky top-0 z-50 bg-[#181c24]/95 backdrop-blur-md border-b border-[#343b4d] w-full flex justify-center shadow-sm">
        {/* FIX: Sử dụng max-w-6xl giống hệt phần Main để thẳng hàng */}
        <div className="w-full max-w-6xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#222736] transition-all"
            >
              <Icons.Back />
            </button>
            <div className="h-8 w-[1px] bg-[#343b4d]"></div>
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
      {/* FIX: Thêm mt-8 để đẩy nội dung xuống xa header hơn */}
      <main className="w-full max-w-6xl px-6 pb-12 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-3">
            <div className="bg-[#222736] rounded-3xl border border-[#343b4d] p-3 sticky top-28">
              <nav className="space-y-2">
                {[
                  { id: "profile", label: "Profile Settings", icon: Icons.User, color: "blue" },
                  { id: "funds", label: "Wallet & Funds", icon: Icons.Wallet, color: "emerald" },
                  { id: "logout", label: "Log Out", icon: Icons.Logout, color: "red" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-medium transition-all duration-200 ${
                      activeTab === item.id
                        ? `bg-[#181c24] text-white shadow-inner`
                        : "text-gray-400 hover:bg-[#181c24]/60 hover:text-gray-200"
                    }`}
                  >
                    <span
                      className={`${
                        activeTab === item.id
                          ? `text-${item.color}-400`
                          : "text-gray-500 group-hover:text-gray-400"
                      }`}
                    >
                      <item.icon />
                    </span>
                    {item.label}
                    {activeTab === item.id && (
                      <div
                        className={`ml-auto w-2 h-2 rounded-full bg-${item.color}-500 shadow-[0_0_8px_currentColor]`}
                      ></div>
                    )}
                  </button>
                ))}
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
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
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
                            <InputGroup
                              label="Date of Birth"
                              value={dob}
                              onChange={setDob}
                              type="date"
                            />
                            <InputGroup
                              label="Occupation"
                              value={occupation}
                              onChange={setOccupation}
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
                            <div className="md:col-span-2">
                              <InputGroup
                                label="Residential Address"
                                value={address}
                                onChange={setAddress}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center mt-6">
                        <button
                          type="submit"
                          className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-2xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all transform hover:-translate-y-0.5 active:scale-95 min-w-[260px]"
                        >
                          Save Changes
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
                      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all duration-700"></div>
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
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
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
                            onClick={() => {
                              setSelectedPreset(amount);
                              setTopUpAmount(amount);
                            }}
                            className={`py-5 px-4 rounded-2xl text-sm font-mono font-medium transition-all border h-14 ${
                              selectedPreset === amount
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "bg-[#181c24] border-[#343b4d] text-gray-400 hover:border-gray-500 hover:text-white"
                            }`}
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
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className="w-full bg-[#222736] border border-[#343b4d] rounded-2xl py-5 text-center text-white text-2xl font-mono focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-600 shadow-inner"
                      />
                    </div>

                    <div className="mt-18 flex justify-center h-14">
                      <button
                        onClick={handleMoneyRequest}
                        className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold rounded-2xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] transition-all transform hover:-translate-y-0.5 active:scale-95 min-w-[260px] "
                      >
                        Confirm Deposit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB: LOGOUT --- */}
              {activeTab === "logout" && (
                <div className="flex-1 h-full flex items-center justify-center p-10 animate-in zoom-in-95 duration-300">
                  <div className="w-full max-w-lg flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300 gap-9">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)] animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="text-red-500 scale-150 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Icons.Logout />
                      </div>
                    </div>
                    <h2 className=" text-2xl font-bold text-white mb-12">
                      Sign Out
                    </h2>
                    <p className="text-gray-400 max-w-sm mb-10 text-base leading-relaxed">
                      Are you sure you want to log out? Your active simulation
                      sessions will be paused until you return.
                    </p>
                    <div className="flex gap-6 justify-center w-full">
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

// --- Input Component (FIXED: pl-12) ---
const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="group w-full">
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 group-focus-within:text-blue-400 transition-colors ml-1">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#181c24] border border-[#343b4d] text-gray-100 text-lg rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 shadow-inner"
      />
    </div>
  </div>
);