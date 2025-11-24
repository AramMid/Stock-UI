"use client";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

interface OrderPanelProps {
  symbol: string;
  currentPrice: number;
  onBuy: (quantity: number, price: number) => void;
  onSell: (quantity: number, price: number) => void;
  onClose?: () => void;
  isDarkMode?: boolean;
}

type OrderType = "Market" | "Limit" | "Stop";

export default function OrderPanel({
  symbol,
  currentPrice,
  onBuy,
  onSell,
  onClose,
  isDarkMode = true,
}: OrderPanelProps) {
  const [orderType, setOrderType] = useState<OrderType>("Market");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(currentPrice);
  const [stopPrice, setStopPrice] = useState(currentPrice);
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState(currentPrice * 1.05);
  const [stopLossPrice, setStopLossPrice] = useState(currentPrice * 0.95);

  const handleBuyClick = () => {
    const orderPrice = orderType === "Market" ? currentPrice : price;
    onBuy(quantity, orderPrice);
  };

  const handleSellClick = () => {
    const orderPrice = orderType === "Market" ? currentPrice : price;
    onSell(quantity, orderPrice);
  };

  return (
    <div
      className={`w-full h-full ${
        isDarkMode
          ? "bg-slate-900 border-slate-700 text-white"
          : "bg-white border-gray-200 text-gray-900"
      } text-sm transition-colors duration-200 flex flex-col`}
    >
      {/* Header with Close Button */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? "border-slate-700" : "border-gray-200"
        }`}
      >
        <h3 className="font-semibold text-lg">Place Order</h3>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDarkMode
                ? "hover:bg-slate-700 text-slate-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Symbol Header */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg">{symbol}</h3>
          <p className="text-green-400 text-lg font-mono">
            ${currentPrice.toFixed(2)}
          </p>
          <p className="text-green-400 text-xs">+7.62 +3.20%</p>
          <p
            className={`${
              isDarkMode ? "text-slate-400" : "text-gray-500"
            } text-xs`}
          >
            Market closed
          </p>
        </div>

        {/* Buy/Sell Tabs */}
        <div className="grid grid-cols-2 mb-4">
          <button className="bg-green-600 hover:bg-green-700 py-2 px-4 text-center font-semibold transition-colors">
            Buy
          </button>
          <button className="bg-red-600 hover:bg-red-700 py-2 px-4 text-center font-semibold transition-colors">
            Sell
          </button>
        </div>

        {/* Order Type Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="relative flex-1">
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                className={`${
                  isDarkMode
                    ? "bg-slate-800 border-slate-600"
                    : "bg-gray-100 border-gray-300"
                } rounded-lg px-3 py-2 pr-8 appearance-none focus:border-blue-500 focus:outline-none transition-colors`}
              >
                <option value="Market">Market</option>
                <option value="Limit">Limit</option>
                <option value="Stop">Stop</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="mb-4">
          <label
            className={`block ${
              isDarkMode ? "text-slate-300" : "text-gray-700"
            } mb-1`}
          >
            Units
          </label>
          <div className="flex items-center">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
              min="1"
            />
            <button
              className={`ml-2 px-3 py-2 ${
                isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600"
                  : "bg-gray-200 hover:bg-gray-300"
              } rounded-lg transition-colors`}
            >
              1/2
            </button>
          </div>
        </div>

        {/* Price Input (for Limit orders) */}
        {orderType === "Limit" && (
          <div className="mb-4">
            <label
              className={`block ${
                isDarkMode ? "text-slate-300" : "text-gray-700"
              } mb-1`}
            >
              Price
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={price}
                onChange={(e) =>
                  setPrice(parseFloat(e.target.value) || currentPrice)
                }
                className={`flex-1 ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-600"
                    : "bg-gray-100 border-gray-300"
                } rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors`}
                step="0.01"
              />
              <span
                className={`ml-2 ${
                  isDarkMode ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Ticks
              </span>
              <ChevronDown className="w-4 h-4 ml-1" />
            </div>
          </div>
        )}

        {/* Take Profit */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-300">Take profit</label>
            <input
              type="checkbox"
              checked={takeProfitEnabled}
              onChange={(e) => setTakeProfitEnabled(e.target.checked)}
              className="accent-green-500"
            />
          </div>
          {takeProfitEnabled && (
            <div className="flex items-center">
              <input
                type="number"
                value={takeProfitPrice}
                onChange={(e) =>
                  setTakeProfitPrice(
                    parseFloat(e.target.value) || currentPrice * 1.05
                  )
                }
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
                step="0.01"
              />
              <span className="ml-2 text-slate-400 text-sm">75</span>
            </div>
          )}
        </div>

        {/* Stop Loss */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-300">Stop loss</label>
            <input
              type="checkbox"
              checked={stopLossEnabled}
              onChange={(e) => setStopLossEnabled(e.target.checked)}
              className="accent-red-500"
            />
          </div>
          {stopLossEnabled && (
            <div className="flex items-center">
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) =>
                  setStopLossPrice(
                    parseFloat(e.target.value) || currentPrice * 0.95
                  )
                }
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
                step="0.01"
              />
              <span className="ml-2 text-slate-400 text-sm">25</span>
            </div>
          )}
        </div>

        {/* Order Info */}
        <div className="mb-4 text-xs text-slate-400">
          <p>Order info</p>
        </div>

        {/* Buy Button */}
        <button
          onClick={handleBuyClick}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-semibold transition-colors"
        >
          Buy 1 {symbol} MKT
        </button>
      </div>
    </div>
  );
}
