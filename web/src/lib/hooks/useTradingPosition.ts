import { useState, useEffect } from "react";
import { TradingPosition } from "../types";

/**
 * Custom hook for managing trading position state
 * @param initialCash Initial cash amount (default: 10000000)
 * @returns Trading position state and actions
 */
export function useTradingPosition(initialCash = 10000000) {
  const [cash, setCash] = useState<number>(initialCash);
  const [position, setPosition] = useState<number>(0);
  const [avgPrice, setAvgPrice] = useState<number>(0);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [pnl, setPnl] = useState<number>(0);

  // Calculate PnL whenever position or price changes
  useEffect(() => {
    setPnl(position * (lastPrice - avgPrice));
  }, [lastPrice, position, avgPrice]);

  const handleBuy = () => {
    if (lastPrice <= 0) return;
    if (cash < lastPrice) {
      alert("Not enough cash");
      return;
    }

    const newQty = position + 1;
    const newAvg =
      position === 0 ? lastPrice : (avgPrice * position + lastPrice) / newQty;

    setPosition(newQty);
    setAvgPrice(newAvg);
    setCash((prev) => +(prev - lastPrice).toFixed(2));
  };

  const handleSell = () => {
    if (position <= 0) {
      alert("No shares");
      return;
    }

    setPosition((prev) => prev - 1);
    setCash((prev) => +(prev + lastPrice).toFixed(2));

    if (position - 1 <= 0) {
      setAvgPrice(0);
    }
  };

  const updateLastPrice = (price: number) => {
    setLastPrice(price);
  };

  const tradingPosition: TradingPosition = {
    cash,
    position,
    avgPrice,
    lastPrice,
    pnl,
  };

  return {
    tradingPosition,
    handleBuy,
    handleSell,
    updateLastPrice,
  };
}
