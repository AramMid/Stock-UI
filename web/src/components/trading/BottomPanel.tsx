"use client";

import React, { useState, useEffect } from "react";
import { getOrders, OrderResponse } from "@/lib/services/orderApiService";
import { TradingPosition } from "@/lib/types";
import { formatVNDCurrency } from "@/lib/order-management";

interface Position {
  symbol: string;
  side: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface Order {
  id: string;
  symbol: string;
  type: string;
  orderType: string;
  size: number;
  price?: number;
  status: string;
}

interface BottomPanelProps {
  tradingPosition: TradingPosition;
  isDarkMode?: boolean;
}

export default function BottomPanel({
  tradingPosition,
  isDarkMode = true,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<"account" | "trade">("account");
  const [activeSubTab, setActiveSubTab] = useState<
    "orders" | "orderHistory" | "summary" | "notifications"
  >("orders");

  // Sample data cho Positions (có thể thay bằng dữ liệu thật sau)
  const positions: Position[] = [
    {
      symbol: "FUESSV30.HM",
      side: "Long",
      size: 100,
      entryPrice: 245.3,
      currentPrice: 245.5,
      pnl: 20.0,
      pnlPercent: 0.08,
    },
    {
      symbol: "AAPL",
      side: "Long",
      size: 50,
      entryPrice: 238.88,
      currentPrice: 245.5,
      pnl: 331.0,
      pnlPercent: 2.77,
    },
  ];

  // Sample data cho tab Orders (open orders mock)
  const orders: Order[] = [
    {
      id: "ORD001",
      symbol: "MSFT",
      type: "Buy",
      orderType: "Limit",
      size: 25,
      price: 515.0,
      status: "Pending",
    },
    {
      id: "ORD002",
      symbol: "GOOGL",
      type: "Sell",
      orderType: "Market",
      size: 10,
      status: "Filled",
    },
  ];

  const balance = 25000.0;
  const equity =
    balance + positions.reduce((total, pos) => total + pos.pnl, 0);
  const totalPnL = positions.reduce(
    (total, pos) => total + pos.pnl,
    0
  );

  // State for order history
  const [orderHistory, setOrderHistory] = useState<OrderResponse[]>([]);
  const [loadingOrderHistory, setLoadingOrderHistory] =
    useState<boolean>(false);

  // Fetch order history from API
  useEffect(() => {
    if (activeSubTab === "orderHistory") {
      setLoadingOrderHistory(true);
      getOrders({ limit: 20, offset: 0 })
        .then((orders) => {
          setOrderHistory(orders);
          setLoadingOrderHistory(false);
        })
        .catch((error) => {
          console.error("Error fetching order history:", error);
          setLoadingOrderHistory(false);
        });
    }
  }, [activeSubTab]);

  return (
    <div
      className={`h-full bg-transparent flex flex-col overflow-hidden transition-colors duration-200 ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}
    >
      {/* Tab Navigation */}
      <div
        className={`flex items-center border-b transition-colors duration-200 px-4 py-2 ${
          isDarkMode ? "border-gray-800" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "account"
              ? "border-blue-500 text-blue-400"
              : isDarkMode
              ? "border-transparent text-gray-400 hover:text-white"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Account Manager
        </button>
        <button
          onClick={() => setActiveTab("trade")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "trade"
              ? "border-blue-500 text-blue-400"
              : isDarkMode
              ? "border-transparent text-gray-400 hover:text-white"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Trade
        </button>

        {/* Account Info with VND */}
        <div className="ml-auto flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Balance:
            </span>
            <span className="font-mono">
              {formatVNDCurrency(balance)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Equity:
            </span>
            <span className="font-mono">
              {formatVNDCurrency(equity)}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div
        className={`flex items-center space-x-6 px-4 py-3 border-b transition-colors duration-200 ${
          isDarkMode ? "border-gray-800" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setActiveSubTab("orders")}
          className={`text-sm transition-colors ${
            activeSubTab === "orders"
              ? "text-blue-400"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveSubTab("orderHistory")}
          className={`text-sm transition-colors ${
            activeSubTab === "orderHistory"
              ? "text-blue-400"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Order History
        </button>
        <button
          onClick={() => setActiveSubTab("summary")}
          className={`text-sm transition-colors ${
            activeSubTab === "summary"
              ? "text-blue-400"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Account Summary
        </button>
        <button
          onClick={() => setActiveSubTab("notifications")}
          className={`text-sm transition-colors ${
            activeSubTab === "notifications"
              ? "text-blue-400"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Notifications
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto trading-scrollbar p-4">
        {/* Orders Tab (sample / open orders mock) */}
        {activeSubTab === "orders" && (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr
                  className={`text-left ${
                    isDarkMode
                      ? "bg-gray-800 text-gray-400"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <th className="py-3 px-4 font-medium">Order ID</th>
                  <th className="py-3 px-4 font-medium">Symbol</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Order Type</th>
                  <th className="py-3 px-4 font-medium text-right">
                    Size
                  </th>
                  <th className="py-3 px-4 font-medium text-right">
                    Price (VND)
                  </th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`border-t ${
                      isDarkMode
                        ? "border-gray-800 hover:bg-gray-800/50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-3 px-4 font-mono">
                      {order.id}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {order.symbol}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          order.type === "Buy"
                            ? "bg-green-900/30 text-green-400"
                            : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {order.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{order.orderType}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {order.size}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {order.price
                        ? formatVNDCurrency(order.price)
                        : "Market"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          order.status === "Filled"
                            ? "bg-green-900/30 text-green-400"
                            : order.status === "Pending"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Order History Tab (from backend) */}
        {activeSubTab === "orderHistory" && (
          <div className="rounded-lg border overflow-hidden">
            {loadingOrderHistory ? (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-500">
                  Loading order history...
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr
                    className={`text-left ${
                      isDarkMode
                        ? "bg-gray-800 text-gray-400"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <th className="py-3 px-4 font-medium">Order ID</th>
                    <th className="py-3 px-4 font-medium">Symbol</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium">
                      Order Type
                    </th>
                    <th className="py-3 px-4 font-medium text-right">
                      Size
                    </th>
                    <th className="py-3 px-4 font-medium text-right">
                      Price (VND)
                    </th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.length === 0 && !loadingOrderHistory ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-gray-500"
                      >
                        No order history found. Place some orders to see
                        them here.
                      </td>
                    </tr>
                  ) : (
                    orderHistory.map((order) => (
                      <tr
                        key={order.id}
                        className={`border-t ${
                          isDarkMode
                            ? "border-gray-800 hover:bg-gray-800/50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono">
                          {order.id}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {order.stockSymbol}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-medium ${
                              order.side === "buy"
                                ? "bg-green-900/30 text-green-400"
                                : "bg-red-900/30 text-red-400"
                            }`}
                          >
                            {order.side === "buy" ? "Buy" : "Sell"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {order.orderType}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {order.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {order.price
                            ? formatVNDCurrency(order.price)
                            : "Market"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-medium ${
                              order.status === "NEW" ||
                              order.status === "PENDING"
                                ? "bg-yellow-900/30 text-yellow-400"
                                : order.status === "FILLED"
                                ? "bg-green-900/30 text-green-400"
                                : order.status === "CANCELED"
                                ? "bg-gray-900/30 text-gray-400"
                                : "bg-red-900/30 text-red-400"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Account Summary Tab */}
        {activeSubTab === "summary" && (
          <div className="space-y-6">
            <div
              className={`rounded-lg p-6 ${
                isDarkMode ? "bg-gray-800/50" : "bg-gray-50"
              }`}
            >
              <h3 className="text-lg font-medium mb-4">
                Account Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total Balance
                  </div>
                  <div className="font-mono text-xl mt-1">
                    {formatVNDCurrency(balance)}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total Equity
                  </div>
                  <div className="font-mono text-xl mt-1">
                    {formatVNDCurrency(equity)}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Unrealized P&L
                  </div>
                  <div
                    className={`font-mono text-xl mt-1 ${
                      totalPnL >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatVNDCurrency(totalPnL)}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Margin Used
                  </div>
                  <div className="font-mono text-xl mt-1">
                    {formatVNDCurrency(12250.0)}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg p-6 ${
                isDarkMode ? "bg-gray-800/50" : "bg-gray-50"
              }`}
            >
              <h3 className="text-lg font-medium mb-4">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Win Rate
                  </div>
                  <div className="font-mono text-xl mt-1">68.5%</div>
                </div>
                <div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Profit Factor
                  </div>
                  <div className="font-mono text-xl mt-1">1.85</div>
                </div>
                <div>
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Max Drawdown
                  </div>
                  <div className="font-mono text-xl mt-1 text-red-400">
                    -12.3%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeSubTab === "notifications" && (
          <div
            className={`rounded-lg border ${
              isDarkMode ? "border-gray-800" : "border-gray-200"
            }`}
          >
            <div className="divide-y divide-gray-800">
              <div
                className={`p-4 ${
                  isDarkMode
                    ? "hover:bg-gray-800/50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-400 font-medium">
                    Order Filled
                  </span>
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    2 min ago
                  </span>
                </div>
                <div
                  className={
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }
                >
                  AAPL Buy order for 50 shares filled at{" "}
                  {formatVNDCurrency(245.5)}
                </div>
              </div>
              <div
                className={`p-4 ${
                  isDarkMode
                    ? "hover:bg-gray-800/50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-blue-400 font-medium">
                    Market Alert
                  </span>
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    5 min ago
                  </span>
                </div>
                <div
                  className={
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }
                >
                  FUESSV30.HM reached your price target of{" "}
                  {formatVNDCurrency(245.5)}
                </div>
              </div>
              <div
                className={`p-4 ${
                  isDarkMode
                    ? "hover:bg-gray-800/50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-yellow-400 font-medium">
                    System Notice
                  </span>
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    10 min ago
                  </span>
                </div>
                <div
                  className={
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }
                >
                  Market will close in 30 minutes
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
