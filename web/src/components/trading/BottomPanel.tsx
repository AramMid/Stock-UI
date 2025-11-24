"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Position {
  symbol: string;
  side: "Long" | "Short";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface Order {
  id: string;
  symbol: string;
  type: "Buy" | "Sell";
  orderType: "Market" | "Limit";
  size: number;
  price?: number;
  status: "Pending" | "Filled" | "Cancelled";
}

interface BottomPanelProps {
  tradingPosition: any;
  isDarkMode?: boolean;
}

export default function BottomPanel({
  tradingPosition,
  isDarkMode = true,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<"account" | "trade">("account");
  const [activeSubTab, setActiveSubTab] = useState<
    "positions" | "orders" | "summary" | "notifications"
  >("positions");

  // Sample data
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
  const equity = balance + positions.reduce((total, pos) => total + pos.pnl, 0);
  const totalPnL = positions.reduce((total, pos) => total + pos.pnl, 0);

  return (
    <div
      className={`h-full bg-transparent flex flex-col overflow-hidden transition-colors duration-200 ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}
    >
      {/* Tab Navigation */}
      <div
        className={`flex items-center border-b transition-colors duration-200 ${
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

        {/* Account Info */}
        <div className="ml-auto flex items-center space-x-6 px-4">
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Account:
            </span>
            <select
              className={`border rounded px-2 py-1 text-xs transition-colors duration-200 ${
                isDarkMode
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option>Demo Account - $25,000</option>
              <option>Live Account - $50,000</option>
            </select>
          </div>
          <div className="text-sm">
            <span
              className={`text-sm transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Balance:
            </span>
            <span className="font-mono ml-2">${balance.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span
              className={`text-sm transition-colors duration-200 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Equity:
            </span>
            <span className="font-mono ml-2">${equity.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div
        className={`flex items-center space-x-6 px-4 py-2 border-b transition-colors duration-200 ${
          isDarkMode ? "border-gray-800" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setActiveSubTab("positions")}
          className={`text-sm transition-colors ${
            activeSubTab === "positions"
              ? "text-blue-400"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Positions
        </button>
        <button
          onClick={() => setActiveSubTab("orders")}
          className={`text-sm transition-colors ${
            activeSubTab === "orders"
              ? "text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveSubTab("summary")}
          className={`text-sm transition-colors ${
            activeSubTab === "summary"
              ? "text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Account Summary
        </button>
        <button
          onClick={() => setActiveSubTab("notifications")}
          className={`text-sm transition-colors ${
            activeSubTab === "notifications"
              ? "text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Notifications
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto trading-scrollbar">
        {activeSubTab === "positions" && (
          <div className="p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Symbol</th>
                  <th className="text-left py-2">Side</th>
                  <th className="text-right py-2">Size</th>
                  <th className="text-right py-2">Entry Price</th>
                  <th className="text-right py-2">Current Price</th>
                  <th className="text-right py-2">P&L</th>
                  <th className="text-right py-2">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-900 hover:bg-gray-900"
                  >
                    <td className="py-2 font-mono">{position.symbol}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          position.side === "Long"
                            ? "bg-green-900 text-green-400"
                            : "bg-red-900 text-red-400"
                        }`}
                      >
                        {position.side}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono">
                      {position.size}
                    </td>
                    <td className="py-2 text-right font-mono">
                      ${position.entryPrice.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      ${position.currentPrice.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 text-right font-mono ${
                        position.pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      ${position.pnl.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 text-right font-mono ${
                        position.pnlPercent >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {position.pnl >= 0 ? "+" : ""}
                      {position.pnlPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "orders" && (
          <div className="p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Order ID</th>
                  <th className="text-left py-2">Symbol</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Order Type</th>
                  <th className="text-right py-2">Size</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-900 hover:bg-gray-900"
                  >
                    <td className="py-2 font-mono">{order.id}</td>
                    <td className="py-2 font-mono">{order.symbol}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          order.type === "Buy"
                            ? "bg-green-900 text-green-400"
                            : "bg-red-900 text-red-400"
                        }`}
                      >
                        {order.type}
                      </span>
                    </td>
                    <td className="py-2">{order.orderType}</td>
                    <td className="py-2 text-right font-mono">{order.size}</td>
                    <td className="py-2 text-right font-mono">
                      {order.price ? `$${order.price.toFixed(2)}` : "Market"}
                    </td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          order.status === "Filled"
                            ? "bg-green-900 text-green-400"
                            : order.status === "Pending"
                            ? "bg-yellow-900 text-yellow-400"
                            : "bg-red-900 text-red-400"
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

        {activeSubTab === "summary" && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-4 gap-6 text-sm">
              <div>
                <div className="text-gray-400">Total Balance</div>
                <div className="font-mono text-lg">
                  ${balance.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Total Equity</div>
                <div className="font-mono text-lg">
                  ${equity.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Unrealized P&L</div>
                <div
                  className={`font-mono text-lg ${
                    totalPnL >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ${totalPnL.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Margin Used</div>
                <div className="font-mono text-lg">$12,250.00</div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "notifications" && (
          <div className="p-4">
            <div className="space-y-3 text-xs">
              <div className="border-b border-gray-800 pb-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-400">Order Filled</span>
                  <span className="text-gray-400">2 min ago</span>
                </div>
                <div className="text-gray-300">
                  AAPL Buy order for 50 shares filled at $245.50
                </div>
              </div>
              <div className="border-b border-gray-800 pb-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-400">Market Alert</span>
                  <span className="text-gray-400">5 min ago</span>
                </div>
                <div className="text-gray-300">
                  FUESSV30.HM reached your price target of $245.50
                </div>
              </div>
              <div className="border-b border-gray-800 pb-2">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-400">System Notice</span>
                  <span className="text-gray-400">10 min ago</span>
                </div>
                <div className="text-gray-300">
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
