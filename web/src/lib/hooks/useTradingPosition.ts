import { useState, useEffect } from "react";
import { TradingPosition } from "../types";
import { AccountState, executeBuyOrder, executeSellOrder, calculatePnL } from "../order-management";

/**
 * Custom hook for managing trading position state
 * @param initialCash Initial cash amount (default: 200000000 - 200 million VND)
 * @returns Trading position state and actions
 */
export function useTradingPosition(initialCash = 200000000) {
  const [accountState, setAccountState] = useState<AccountState>({
    cash: initialCash,
    position: 0,
    avgPrice: 0,
    lastPrice: 0,
    pnl: 0
  });

  // Calculate PnL whenever position or price changes
  useEffect(() => {
    setAccountState(prev => ({
      ...prev,
      pnl: calculatePnL(prev.position, prev.avgPrice, prev.lastPrice)
    }));
  }, [accountState.lastPrice, accountState.position, accountState.avgPrice]);

  const handleBuy = (quantity: number, price: number) => {
    const result = executeBuyOrder(accountState, quantity, price);
    if (result.success) {
      setAccountState(result.updatedAccount);
    } else {
      alert(result.errorMessage);
    }
    return result.success;
  };

  const handleSell = (quantity: number, price: number) => {
    const result = executeSellOrder(accountState, quantity, price);
    if (result.success) {
      setAccountState(result.updatedAccount);
    } else {
      alert(result.errorMessage);
    }
    return result.success;
  };

  const updateLastPrice = (price: number) => {
    setAccountState(prev => ({
      ...prev,
      lastPrice: price
    }));
  };

  const tradingPosition: TradingPosition = {
    cash: accountState.cash,
    position: accountState.position,
    avgPrice: accountState.avgPrice,
    lastPrice: accountState.lastPrice,
    pnl: accountState.pnl,
  };

  return {
    tradingPosition,
    handleBuy,
    handleSell,
    updateLastPrice,
  };
}