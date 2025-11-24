"use client";
import { useState } from "react";
import { X, ChevronDown } from "lucide-react";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  orderType: "buy" | "sell";
  onSubmitOrder: (order: OrderData) => void;
  isDarkMode?: boolean;
}

interface OrderData {
  symbol: string;
  type: "buy" | "sell";
  orderType: "Market" | "Limit" | "Stop";
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfitEnabled: boolean;
  takeProfitPrice?: number;
  stopLossEnabled: boolean;
  stopLossPrice?: number;
}

export default function OrderModal({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  orderType,
  onSubmitOrder,
  isDarkMode = true,
}: OrderModalProps) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">(orderType);
  const [selectedOrderType, setSelectedOrderType] = useState<
    "Market" | "Limit" | "Stop"
  >("Market");
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(currentPrice);
  const [stopPrice, setStopPrice] = useState(currentPrice);
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState(currentPrice * 1.05);
  const [takeProfitTicks, setTakeProfitTicks] = useState(75);
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [stopLossPrice, setStopLossPrice] = useState(currentPrice * 0.95);
  const [stopLossTicks, setStopLossTicks] = useState(25);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const orderData: OrderData = {
      symbol,
      type: activeTab,
      orderType: selectedOrderType,
      quantity,
      price: selectedOrderType === "Limit" ? limitPrice : undefined,
      stopPrice: selectedOrderType === "Stop" ? stopPrice : undefined,
      takeProfitEnabled,
      takeProfitPrice: takeProfitEnabled ? takeProfitPrice : undefined,
      stopLossEnabled,
      stopLossPrice: stopLossEnabled ? stopLossPrice : undefined,
    };
    onSubmitOrder(orderData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`${
          isDarkMode
            ? "bg-slate-900 border-slate-700 text-white"
            : "bg-white border-gray-200 text-gray-900"
        } border rounded-2xl shadow-2xl w-96 transition-colors duration-200`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDarkMode ? "border-slate-700" : "border-gray-200"
          }`}
        >
          <h2 className="text-lg font-semibold">{symbol}</h2>
          <button
            onClick={onClose}
            className={`text-${
              isDarkMode
                ? "slate-400 hover:text-white"
                : "gray-500 hover:text-gray-900"
            } transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Buy/Sell Tabs */}
          <div className="grid grid-cols-2 mb-4">
            <button
              onClick={() => setActiveTab("buy")}
              className={`py-3 px-4 text-center font-semibold transition-colors rounded-tl-lg ${
                activeTab === "buy"
                  ? "bg-green-600 text-white"
                  : isDarkMode
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab("sell")}
              className={`py-3 px-4 text-center font-semibold transition-colors rounded-tr-lg ${
                activeTab === "sell"
                  ? "bg-red-600 text-white"
                  : isDarkMode
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Sell
            </button>
          </div>

          {/* Current Price Display */}
          <div className="mb-4 text-center">
            <div className="text-2xl font-bold text-white">
              {currentPrice.toFixed(2)}
            </div>
            <div className="text-green-400 text-sm">0.00</div>
          </div>

          {/* Order Type Selection */}
          <div className="mb-4">
            <div className="flex space-x-2">
              {["Market", "Limit", "Stop"].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedOrderType(type as any)}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    selectedOrderType === type
                      ? "bg-slate-700 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity and Risk Settings */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1">Units</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min="1"
              />
              <div className="flex items-center mt-1">
                <button className="text-xs text-slate-400 hover:text-white">
                  1/2
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">
                Risk, currency
              </label>
              <div className="relative">
                <select className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm appearance-none focus:border-blue-500 focus:outline-none">
                  <option>0.25</option>
                  <option>0.50</option>
                  <option>1.00</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Price Input for Limit Orders */}
          {selectedOrderType === "Limit" && (
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-1">Price</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) =>
                  setLimitPrice(parseFloat(e.target.value) || currentPrice)
                }
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                step="0.01"
              />
            </div>
          )}

          {/* Exits Section */}
          <div className="mb-6">
            <h3 className="text-slate-300 font-semibold mb-3">Exits</h3>

            {/* Take Profit */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 text-sm">Take profit</label>
                <input
                  type="checkbox"
                  checked={takeProfitEnabled}
                  onChange={(e) => setTakeProfitEnabled(e.target.checked)}
                  className="accent-green-500"
                />
              </div>
              {takeProfitEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      value={takeProfitPrice}
                      onChange={(e) =>
                        setTakeProfitPrice(
                          parseFloat(e.target.value) || currentPrice * 1.05
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Ticks
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={takeProfitTicks}
                        onChange={(e) =>
                          setTakeProfitTicks(parseInt(e.target.value) || 75)
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stop Loss */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 text-sm">Stop loss</label>
                <input
                  type="checkbox"
                  checked={stopLossEnabled}
                  onChange={(e) => setStopLossEnabled(e.target.checked)}
                  className="accent-red-500"
                />
              </div>
              {stopLossEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      value={stopLossPrice}
                      onChange={(e) =>
                        setStopLossPrice(
                          parseFloat(e.target.value) || currentPrice * 0.95
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Ticks
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={stopLossTicks}
                        onChange={(e) =>
                          setStopLossTicks(parseInt(e.target.value) || 25)
                        }
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Info */}
          <div className="mb-4">
            <p className="text-slate-400 text-xs">Order info</p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className={`w-full py-3 rounded font-semibold transition-colors ${
              activeTab === "buy"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {activeTab === "buy" ? "Buy" : "Sell"} {quantity} {symbol} MKT
          </button>
        </div>
      </div>
    </div>
  );
}
