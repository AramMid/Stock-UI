"use client";

import React, { useMemo, useState, useEffect } from "react";

export type OrderType = "Market" | "Limit" | "Stop" | "StopLimit";

interface OrderPanelProps {
  symbol: string;
  currentPrice: number;
  side: "buy" | "sell";
  onSideChange: (side: "buy" | "sell") => void;
  onBuy: (
    quantity: number,
    orderType: OrderType,
    opts?: { limitPrice?: number; stopPrice?: number }
  ) => void;
  onSell: (
    quantity: number,
    orderType: OrderType,
    opts?: { limitPrice?: number; stopPrice?: number }
  ) => void;
  isDarkMode?: boolean;
  onClose?: () => void;
}

function roundDownToLotSize(qty: number, lot = 100) {
  const n = Number.isFinite(qty) ? qty : 0;
  return Math.max(lot, Math.floor(n / lot) * lot);
}

export default function OrderPanel({
  symbol,
  currentPrice,
  side,
  onSideChange,
  onBuy,
  onSell,
  isDarkMode = true,
  onClose,
}: OrderPanelProps) {
  // 1. AN TOÀN DỮ LIỆU: Đảm bảo currentPrice luôn là số hợp lệ ngay từ đầu
  const safeCurrentPrice = Number.isFinite(currentPrice) ? currentPrice : 0;

  const [orderType, setOrderType] = useState<OrderType>("Market");
  const [quantity, setQuantity] = useState<number>(100);

  // Limit price
  const [limitPrice, setLimitPrice] = useState<number>(safeCurrentPrice);
  // Stop trigger
  const [stopPrice, setStopPrice] = useState<number>(safeCurrentPrice);

  useEffect(() => {
    // Reset giá khi đổi Symbol
    setLimitPrice(safeCurrentPrice);
    setStopPrice(safeCurrentPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]); 

  // Nếu safeCurrentPrice thay đổi (thị trường nhảy giá), cập nhật lại biến local nếu đang ở chế độ Market? 
  // Không, giữ nguyên logic của bạn là input đứng yên.

  const validQty = useMemo(() => roundDownToLotSize(quantity), [quantity]);
  
  // Tính tradeValue dựa trên currentPrice (để tham khảo)
  const tradeValue = useMemo(() => validQty * safeCurrentPrice, [validQty, safeCurrentPrice]);

  // ✅ KHẮC PHỤC LỖI NaN TẠI ĐÂY
  const submit = () => {
    const opts: { limitPrice?: number; stopPrice?: number } = {};

    // 1. Xử lý giá Limit hoặc Market
    if (orderType === "Limit" || orderType === "StopLimit") {
      // Nếu user nhập rỗng hoặc text bậy bạ, limitPrice có thể là NaN -> fallback về 0 hoặc safeCurrentPrice
      opts.limitPrice = Number.isFinite(limitPrice) ? limitPrice : safeCurrentPrice;
    } else if (orderType === "Market") {
      // QUAN TRỌNG: Với Market, gán giá hiện tại vào limitPrice để Backend/Parent có số để tính toán
      // Thay vì để undefined dẫn đến NaN
      opts.limitPrice = safeCurrentPrice;
    }

    // 2. Xử lý giá Stop
    if (orderType === "Stop" || orderType === "StopLimit") {
      opts.stopPrice = Number.isFinite(stopPrice) ? stopPrice : safeCurrentPrice;
    }

    // Log kiểm tra trước khi gửi
    // console.log("Submitting Order:", { side, validQty, orderType, opts });

    if (side === "buy") {
      onBuy(validQty, orderType, opts);
    } else {
      onSell(validQty, orderType, opts);
    }
  };

  const bg = isDarkMode ? "bg-[#0b0f17] text-white" : "bg-white text-gray-900";
  const card = isDarkMode ? "bg-[#111827] border-gray-800" : "bg-gray-50 border-gray-200";
  const input = isDarkMode
    ? "bg-[#0f1219] border-gray-800 text-gray-100"
    : "bg-white border-gray-200 text-gray-900";

  return (
    <div className={`w-full h-full flex flex-col ${bg}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDarkMode ? "border-gray-800" : "border-gray-200"} flex items-center justify-between`}>
        <div className="font-semibold">{symbol}</div>
        {onClose && (
          <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">Close</button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Side switch */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSideChange("sell")}
            className={`py-2 rounded-lg border ${side === "sell" ? "border-red-500 bg-red-500/10" : "border-transparent"} ${isDarkMode ? "bg-[#111827]" : "bg-gray-100"}`}
          >
            <div className={`font-bold ${side === "sell" ? "text-red-400" : "opacity-70"}`}>SELL</div>
            <div className="text-sm opacity-70">{safeCurrentPrice.toLocaleString("vi-VN")} đ</div>
          </button>

          <button
            onClick={() => onSideChange("buy")}
            className={`py-2 rounded-lg border ${side === "buy" ? "border-green-500 bg-green-500/10" : "border-transparent"} ${isDarkMode ? "bg-[#111827]" : "bg-gray-100"}`}
          >
            <div className={`font-bold ${side === "buy" ? "text-green-400" : "opacity-70"}`}>BUY</div>
            <div className="text-sm opacity-70">{safeCurrentPrice.toLocaleString("vi-VN")} đ</div>
          </button>
        </div>

        {/* Order type */}
        <div className={`p-3 rounded-xl border ${card}`}>
          <div className="text-xs opacity-70 mb-2">Order type</div>
          <div className="grid grid-cols-4 gap-2">
            {(["Market", "Limit", "Stop", "StopLimit"] as OrderType[]).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`py-2 rounded-lg text-xs font-bold border ${
                  orderType === t
                    ? side === "buy"
                      ? "border-green-500 bg-green-500/10 text-green-200"
                      : "border-red-500 bg-red-500/10 text-red-200"
                    : isDarkMode
                    ? "border-gray-800 bg-[#0f1219] opacity-80"
                    : "border-gray-200 bg-white opacity-90"
                }`}
              >
                {t === "Stop" ? "STOP" : t === "StopLimit" ? "STOP-LMT" : t.toUpperCase()}
              </button>
            ))}
          </div>

          {(orderType === "Stop" || orderType === "StopLimit") && (
            <div className="mt-3">
              <div className="text-xs opacity-70 mb-1">Stop (trigger) price</div>
              <input
                className={`w-full px-3 py-2 rounded-lg border ${input}`}
                type="number"
                value={stopPrice}
                // Sửa onChange để tránh NaN khi xóa trắng
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setStopPrice(isNaN(val) ? 0 : val);
                }}
              />
              <div className="mt-1 text-[11px] opacity-60">
                Trigger: {side === "sell" ? "last price ≤ stop" : "last price ≥ stop"}
              </div>
            </div>
          )}

          {(orderType === "Limit" || orderType === "StopLimit") && (
            <div className="mt-3">
              <div className="text-xs opacity-70 mb-1">Limit price</div>
              <input
                className={`w-full px-3 py-2 rounded-lg border ${input}`}
                type="number"
                value={limitPrice}
                // Sửa onChange để tránh NaN khi xóa trắng
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLimitPrice(isNaN(val) ? 0 : val);
                }}
              />
              {orderType === "StopLimit" && (
                <div className="mt-1 text-[11px] opacity-60">
                  After trigger, order becomes LIMIT...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className={`p-3 rounded-xl border ${card}`}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs opacity-70 mb-1">Quantity (shares)</div>
              <input
                className={`w-full px-3 py-2 rounded-lg border ${input}`}
                type="number"
                step={100}
                min={100}
                value={quantity}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setQuantity(isNaN(val) ? 0 : val);
                }}
              />
              <div className="mt-1 text-[11px] opacity-60">Auto lot: {validQty} shares</div>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">Trade value (ref)</div>
              <div className={`w-full px-3 py-2 rounded-lg border ${input} opacity-80 flex items-center`}>
                {/* Hiển thị NaN nếu tradeValue bị lỗi, sửa lại hiển thị 0 */}
                {Number.isFinite(tradeValue) ? tradeValue.toLocaleString("vi-VN") : "0"} đ
              </div>
              <div className="mt-1 text-[11px] opacity-60">Uses current price as reference</div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          className={`w-full py-3 rounded-xl font-bold text-white ${
            side === "buy" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
          }`}
        >
          {side === "buy" ? "BUY" : "SELL"} • {orderType}
        </button>
      </div>
    </div>
  );
}