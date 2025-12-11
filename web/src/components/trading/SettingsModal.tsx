"use client";

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
  userData: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    balance: number;
    is_active: boolean;
    address?: string;
    dob?: string;
    occupation?: string;
    email_verified_at?: string | Date | null;
    last_login_at?: string | Date | null;
    created_at?: string | Date | null;
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

  const [firstName, setFirstName] = useState(userData.first_name);
  const [lastName, setLastName] = useState(userData.last_name);
  const [email, setEmail] = useState(userData.email);
  const [phone, setPhone] = useState(userData.phone ?? "");
  const [address, setAddress] = useState(userData.address ?? "123 Nguyễn Huệ, Quận 1, TP.HCM");
  const [dob, setDob] = useState(userData.dob ?? "1995-03-15");
  const [occupation, setOccupation] = useState(userData.occupation ?? "Software Developer");
  
  const [topUpAmount, setTopUpAmount] = useState<number | "">(0);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1000000);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState(userData.balance || 5250000);

  useEffect(() => {
    setFirstName(userData.first_name);
    setLastName(userData.last_name);
    setEmail(userData.email);
    setPhone(userData.phone ?? "");
    setAddress(userData.address ?? "123 Nguyễn Huệ, Quận 1, TP.HCM");
    setDob(userData.dob ?? "1995-03-15");
    setOccupation(userData.occupation ?? "Software Developer");
    setBalance(userData.balance || 5250000);
  }, [userData]);

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

    const newBalance = balance + amount;
    setBalance(newBalance);
    onMoneyRequest(amount);
    
    showSuccess(`Yêu cầu nạp ${formatCurrency(amount)} đã được gửi thành công!`);
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
    onClose();
  };

  const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  // Format date từ yyyy-mm-dd sang dd/mm/yyyy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={overlayClick}
    >
      <div
        className="w-full max-w-sm overflow-auto rounded-2xl bg-white shadow-2xl shadow-black/40"
        onClick={stopPropagation}
        style={{ maxHeight: "90vh" }}
      >
        {/* HEADER */}
        <div
          className="px-4 py-3 text-center text-white"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          <h1 className="text-lg font-semibold mb-1">
            🎯 My Account Dashboard
          </h1>
          <p className="text-xs opacity-90">
            Quản lý thông tin cá nhân và tài khoản của bạn
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-[#f8f9fa] border-b border-[#e0e0e0]">
          <button
            className={`flex-1 py-3 text-center text-sm font-semibold transition ${activeTab === "profile" ? "bg-white text-[#667eea] border-b-3 border-[#667eea]" : "text-gray-600 hover:bg-[#667eea]/10 hover:text-[#667eea]"}`}
            onClick={() => setActiveTab("profile")}
          >
            👤 Profile
          </button>
          <button
            className={`flex-1 py-3 text-center text-sm font-semibold transition ${activeTab === "funds" ? "bg-white text-[#667eea] border-b-3 border-[#667eea]" : "text-gray-600 hover:bg-[#667eea]/10 hover:text-[#667eea]"}`}
            onClick={() => setActiveTab("funds")}
          >
            💰 Funds
          </button>
          <button
            className={`flex-1 py-3 text-center text-sm font-semibold transition ${activeTab === "logout" ? "bg-white text-[#667eea] border-b-3 border-[#667eea]" : "text-gray-600 hover:bg-[#667eea]/10 hover:text-[#667eea]"}`}
            onClick={() => setActiveTab("logout")}
          >
            🚪 Log Out
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4">
          {successMessage && (
            <div className="mb-3 rounded-xl bg-[#d4edda] text-[#155724] px-3 py-2 text-xs">
              ✓ {successMessage}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div>
              <h2 className="mb-3 text-base font-semibold text-gray-800">
                Thông Tin Cá Nhân
              </h2>

              <form onSubmit={handleProfileSubmit} className="space-y-3">
                {/* Họ và Tên */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Họ và Tên
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        const names = e.target.value.split(" ");
                        setFirstName(names[0] || "");
                        setLastName(names.slice(1).join(" ") || "");
                      }}
                      className="w-full rounded-lg border-2 border-[#e0e0e0] pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea]"
                      placeholder="Họ và tên"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Email
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border-2 border-[#e0e0e0] pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea]"
                      placeholder="doc@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Số Điện Thoại */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Số Điện Thoại
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border-2 border-[#e0e0e0] pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea]"
                      placeholder="123 456 789"
                      required
                    />
                  </div>
                </div>

                {/* Ngày Sinh */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Ngày Sinh
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formatDate(dob)}
                      onChange={(e) => {
                        // Convert from dd/mm/yyyy to yyyy-mm-dd
                        const parts = e.target.value.split('/');
                        if (parts.length === 3) {
                          const [day, month, year] = parts;
                          setDob(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                        }
                      }}
                      className="w-full rounded-lg border-2 border-[#e0e0e0] pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea]"
                      placeholder="15/03/1995"
                      required
                    />
                  </div>
                </div>

                {/* Địa Chỉ */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Địa Chỉ
                  </label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-lg border-2 border-[#e0e0e0] pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea]"
                      placeholder="Nguyễn Huệ, Quận I, TP.HCM"
                      required
                    />
                  </div>
                </div>

                {/* Nghề Nghiệp */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Nghề Nghiệp
                  </label>
                  <div className="relative">
                    <FiBriefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="w-full rounded-lg border-2 border-[#e0e0e0] pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea]"
                      placeholder="Software Developer"
                      required
                    />
                  </div>
                </div>

                {/* Trạng Thái Tài Khoản */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Trạng Thái Tài Khoản
                  </label>
                  <select
                    className="w-full rounded-lg border-2 border-[#e0e0e0] px-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea] bg-white"
                    value={userData.is_active ? "active" : "inactive"}
                    disabled
                  >
                    <option value="active">Đang Hoạt Động</option>
                    <option value="inactive">Tạm Ngừng</option>
                  </select>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-2"></div>

                {/* Nút Save - To hơn */}
                <button
                  type="submit"
                  className="w-full rounded-xl py-4 text-sm font-semibold text-white transition hover:shadow-lg hover:-translate-y-0.5 mt-2"
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  Cập Nhật Thông Tin
                </button>
              </form>
            </div>
          )}

          {/* FUNDS TAB */}
          {activeTab === "funds" && (
            <div className="space-y-4">
              {/* Balance card */}
              <div
                className="rounded-xl p-4 text-center text-white"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <h3 className="text-xs font-medium opacity-90 mb-1">Số Dư Tài Khoản</h3>
                <div className="text-2xl font-bold mb-1">{formatCurrency(balance)}</div>
                <p className="text-xs opacity-90">Cập nhật lúc: 11:30 AM, 11/12/2025</p>
              </div>

              <h3 className="text-sm font-semibold text-gray-800">
                Nạp Tiền Vào Tài Khoản
              </h3>

              {/* Preset amounts - Grid 2x3 */}
              <div className="grid grid-cols-2 gap-2">
                {[100000, 500000, 1000000, 2000000, 5000000, 10000000].map(
                  (amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handlePresetSelect(amount)}
                      className={`rounded-lg border-2 p-2 text-center text-xs font-semibold transition-all ${
                        selectedPreset === amount
                          ? "text-white border-[#667eea]"
                          : "text-[#667eea] border-[#e0e0e0] bg-white hover:border-[#667eea]"
                      }`}
                      style={
                        selectedPreset === amount
                          ? {
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
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
                  className="w-full rounded-lg border-2 border-[#e0e0e0] px-3 py-2.5 text-sm focus:outline-none focus:border-[#667eea]"
                  placeholder="Nhập số tiền..."
                />
              </div>

              {/* Nút Submit - To hơn */}
              <button
                type="button"
                onClick={handleMoneyRequest}
                className="w-full rounded-xl py-4 text-sm font-semibold text-white transition hover:shadow-lg hover:-translate-y-0.5 mt-2"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                ✓ Gửi Yêu Cầu Nạp Tiền
              </button>

              {/* Provider info */}
              <div className="rounded-lg bg-[#f8f9fa] p-3 text-xs text-gray-700">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  📋 Thông Tin Nhà Cung Cấp
                </h3>
                <div className="space-y-1">
                  <p><strong>Công ty:</strong> FinTech Solutions Vietnam</p>
                  <p><strong>Mã số thuế:</strong> 0123456789</p>
                  <p><strong>Địa chỉ:</strong> 456 Lê Lợi, Quận 3, TP.HCM</p>
                  <p><strong>Hotline:</strong> 1900 xxxx (8:00 - 22:00)</p>
                  <p><strong>Email hỗ trợ:</strong> support@fintech.vn</p>
                </div>
                <p className="mt-2 text-[10px] text-gray-500">
                  💡 Yêu cầu nạp tiền sẽ được xử lý trong vòng 5-10 phút làm việc. 
                  Vui lòng kiểm tra email để nhận thông báo xác nhận.
                </p>
              </div>
            </div>
          )}

          {/* LOGOUT TAB */}
          {activeTab === "logout" && (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="text-6xl mb-4">👋</div>
              <h2 className="text-base font-semibold text-gray-800 mb-2">
                Đăng Xuất Tài Khoản
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?
              </p>
              {/* Nút Logout - To hơn */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl py-4 text-sm font-semibold text-white transition hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                }}
              >
                🚪 Xác Nhận Đăng Xuất
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}