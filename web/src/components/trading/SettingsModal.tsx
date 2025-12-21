import { FormEvent, useEffect, useState } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLogOut,
  FiDollarSign,
  FiX,
  FiCalendar,
  FiMapPin,
  FiBriefcase,
  FiHome,
} from "react-icons/fi";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onAccountUpdate: (userData: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    dob?: string;
    occupation?: string;
  }) => void;
  onMoneyRequest: (amount: number) => void;
  // Update userData prop to match the actual data structure from useUserData
  userData: {
    userDetail: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      is_active?: boolean;
      created_at?: string;
      last_login_at?: string;
      email_verified_at?: string;
    } | null;
    userBalance: {
      balance: {
        availableBalance: number;
      };
    } | null;
  };
}

type TabKey = "profile" | "funds" | "logout";

export default function SettingsModal({
  isOpen,
  onClose,
  onLogout,
  onAccountUpdate,
  onMoneyRequest,
  userData,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Extract user detail and balance data
  const userDetail = userData.userDetail;
  const userBalance = userData.userBalance;

  // Debugging: Log the userData to see what's being passed
  useEffect(() => {
    // Removed debug logging
  }, [userData]);

  const [firstName, setFirstName] = useState(userDetail?.first_name || "");
  const [lastName, setLastName] = useState(userDetail?.last_name || "");
  const [email, setEmail] = useState(userDetail?.email || "");
  const [phone, setPhone] = useState(userDetail?.phone ?? "");
  const [address, setAddress] = useState("123 Nguyễn Huệ, Quận 1, TP.HCM");
  const [dob, setDob] = useState("1995-03-15");
  const [occupation, setOccupation] = useState("Software Developer");

  const [topUpAmount, setTopUpAmount] = useState<number | "">(0);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1000000);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Use real user balance instead of state
  const balance = userBalance?.balance?.availableBalance || 0;

  useEffect(() => {
    // Update state when userData changes
    if (userDetail) {
      setFirstName(userDetail.first_name);
      setLastName(userDetail.last_name);
      setEmail(userDetail.email);
      setPhone(userDetail.phone ?? "");
    }
    // We're now using real user balance directly, so no need to update state here
  }, [userDetail]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  const fullName = `${firstName} ${lastName}`.trim() || "User";

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAccountUpdate({
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || undefined,
      address,
      dob,
      occupation,
    });
    showSuccess("Profile updated successfully.");
  };

  const handleMoneyRequest = () => {
    const amount =
      typeof topUpAmount === "number" && !Number.isNaN(topUpAmount)
        ? topUpAmount
        : 0;

    if (amount === 0) {
      alert("⚠️ Vui lòng chọn hoặc nhập số tiền cần nạp!");
      return;
    }

    if (amount < 10000) {
      alert("⚠️ Số tiền tối thiểu là 10,000₫");
      return;
    }

    // For demo purposes, we'll just show a success message
    // In a real implementation, this would call an API to update the balance
    onMoneyRequest(amount);

    showSuccess(
      `Yêu cầu nạp ${formatCurrency(amount)} đã được gửi thành công!`
    );
    setSelectedPreset(null);
    setTopUpAmount(0);
  };

  const handlePresetSelect = (amount: number) => {
    setSelectedPreset(amount);
    setTopUpAmount(amount);
  };

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      alert("👋 Đã đăng xuất thành công! Hẹn gặp lại bạn!");
      onLogout();
    }
  };

  const overlayClick = () => {
    // Close modal when clicking on overlay (but not on modal content)
    onClose();
  };

  const statusBadge = (isActive: boolean) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? "bg-green-100 text-green-800 border border-green-200"
          : "bg-red-100 text-red-800 border border-red-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          isActive ? "bg-green-500" : "bg-red-500"
        }`}
      ></span>
      {isActive ? "Active" : "Inactive"}
    </span>
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      onClick={overlayClick}
    >
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300 ${
          isOpen ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div>
            <h2 className="text-xl font-bold">Account Settings</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Manage your profile and account preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-100 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-[70vh]">
          {/* LEFT SIDEBAR */}
          <aside className="lg:w-1/4 bg-gray-50 border-r border-gray-200">
            <nav className="p-1">
              {(
                [
                  { key: "profile", label: "👤 Profile", color: "blue" },
                  { key: "funds", label: "💰 Funds", color: "green" },
                  { key: "logout", label: "🚪 Log Out", color: "red" },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all flex items-center ${
                    activeTab === item.key
                      ? "bg-white text-gray-900 font-semibold shadow-sm border-l-4 border-indigo-500"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-3 text-lg">
                    {item.label.split(" ")[0]}
                  </span>
                  <span>{item.label.split(" ").slice(1).join(" ")}</span>
                  {item.key === "profile" && (
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
                {formatCurrency(balance)}
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
          </aside>

          {/* RIGHT CONTENT AREA */}
          <section className="lg:col-span-9">
            {/* --- TAB: PROFILE --- */}
            {activeTab === "profile" && (
              <div className="p-6 h-full overflow-y-auto">
                <div className="max-w-2xl">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Personal Information
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Update your personal details here
                      </p>
                    </div>
                  </div>

                  {/* User Profile Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-5 mb-6 text-white">
                    <div className="flex items-center">
                      <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mr-4">
                        <span className="text-2xl font-bold">
                          {firstName.charAt(0)}
                          {lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">
                          {firstName} {lastName}
                        </h2>
                        <p className="text-blue-100">{email}</p>
                        <div className="flex items-center mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                            Active User
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter first name"
                          />
                        </div>
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="your.email@example.com"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <FiPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="+84 123 456 789"
                          />
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <div className="relative">
                          <FiCalendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Occupation */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Occupation
                        </label>
                        <div className="relative">
                          <FiBriefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={occupation}
                            onChange={(e) => setOccupation(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Your occupation"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <div className="relative">
                        <FiHome className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="123 Street, City, Country"
                        />
                      </div>
                    </div>

                    {/* Account Status */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900">
                            Account Status
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Your account verification status
                          </p>
                        </div>
                        {statusBadge(userDetail?.is_active ?? true)}
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-500">Member Since</p>
                          <p className="font-medium mt-1">
                            {userDetail?.created_at
                              ? new Date(
                                  userDetail.created_at
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-500">Last Login</p>
                          <p className="font-medium mt-1">
                            {userDetail?.last_login_at
                              ? new Date(
                                  userDetail.last_login_at
                                ).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-500">Email Verified</p>
                          <p className="font-medium mt-1">
                            {userDetail?.email_verified_at ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity shadow-md"
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
              <div className="p-6 h-full overflow-y-auto">
                <div className="max-w-2xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Account Funding
                  </h3>

                  {/* Balance Card */}
                  <div
                    className="rounded-xl p-6 text-center text-white mb-8"
                    style={{
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    <h3 className="text-sm font-medium opacity-90 mb-2">
                      Số Dư Tài Khoản
                    </h3>
                    <div className="text-3xl font-bold mb-2">
                      {formatCurrency(balance)}
                    </div>
                    <p className="text-sm opacity-90">
                      Cập nhật lúc: {new Date().toLocaleTimeString("vi-VN")} -{" "}
                      {new Date().toLocaleDateString("vi-VN")}
                    </p>
                  </div>

                  <h4 className="text-md font-semibold text-gray-800 mb-4">
                    Nạp Tiền Vào Tài Khoản
                  </h4>

                  {/* Preset amounts - Grid 2x3 */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[100000, 500000, 1000000, 2000000, 5000000, 10000000].map(
                      (amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => handlePresetSelect(amount)}
                          className={`rounded-lg border-2 p-3 text-center text-sm font-semibold transition-all ${
                            selectedPreset === amount
                              ? "text-white border-[#667eea]"
                              : "text-[#667eea] border-[#e0e0e0] bg-white hover:border-[#667eea]"
                          }`}
                          style={
                            selectedPreset === amount
                              ? {
                                  background:
                                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                }
                              : undefined
                          }
                        >
                          {formatCurrency(amount)}
                        </button>
                      )
                    )}
                  </div>

                  {/* Custom amount */}
                  <div className="space-y-2 mb-8">
                    <label className="block text-sm font-semibold text-gray-700">
                      Hoặc Nhập Số Tiền Khác
                    </label>
                    <input
                      type="number"
                      min={10000}
                      step={1000}
                      value={topUpAmount === "" ? "" : topUpAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedPreset(null);
                        setTopUpAmount(
                          value === "" ? "" : Math.max(0, Number(value))
                        );
                      }}
                      className="w-full rounded-lg border-2 border-[#e0e0e0] px-4 py-3 text-sm focus:outline-none focus:border-[#667eea]"
                      placeholder="Nhập số tiền..."
                    />
                  </div>

                  {/* Submit Button - To hơn */}
                  <button
                    type="button"
                    onClick={handleMoneyRequest}
                    className="w-full rounded-xl py-4 text-sm font-semibold text-white transition hover:shadow-lg hover:-translate-y-0.5 mt-2"
                    style={{
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    Cập Nhật Thông Tin
                  </button>
                </div>
              </div>
            )}

            {/* --- TAB: LOGOUT --- */}
            {activeTab === "logout" && (
              <div className="flex-1 h-full flex items-center justify-center p-10 animate-in zoom-in-95 duration-300">
                <div className="w-full max-w-lg flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300 gap-9">
                  <div className="p-5 bg-gradient-to-br from-red-500 to-orange-400 rounded-full">
                    <FiLogOut className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Ready to Leave?
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Are you sure you want to log out? You&apos;ll need to log
                      back in to access your account.
                    </p>
                  </div>
                  <div className="flex gap-4 w-full max-w-xs">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-orange-400 hover:opacity-90 text-white font-medium rounded-lg transition-opacity shadow-md"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
