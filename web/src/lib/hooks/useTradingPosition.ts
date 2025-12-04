import { useState, useEffect } from "react";
import { TradingPosition } from "../types";
import { AccountState, executeBuyOrder, executeSellOrder, calculatePnL } from "../order-management";

interface SymbolPosition extends AccountState {
  symbol: string;
}

/**
 * Custom hook for managing trading position state
 * @param initialCash Initial cash amount (default: 200000000 - 200 million VND)
 * @returns Trading position state and actions
 */
export function useTradingPosition(initialCash = 200000000) {
  const [cash, setCash] = useState<number>(initialCash);
  const [positions, setPositions] = useState<Map<string, SymbolPosition>>(new Map());

  const handleBuy = (symbol: string, quantity: number, price: number) => {
    // Get current position for this symbol
    const currentPosition = positions.get(symbol) || {
      symbol,
      cash: 0,
      position: 0,
      avgPrice: 0,
      lastPrice: 0,
      pnl: 0
    };

    const result = executeBuyOrder(currentPosition, cash, quantity, price);
    if (result.success) {
      // Update symbol position
      const updatedPosition: SymbolPosition = {
        ...result.updatedAccount,
        symbol
      };
      
      setPositions(prev => {
        const newPositions = new Map(prev);
        newPositions.set(symbol, updatedPosition);
        return newPositions;
      });
      
      // Update cash
      setCash(prev => prev - (quantity * price));
    } else {
      alert(result.errorMessage);
    }
    return result.success;
  };

  const handleSell = (symbol: string, quantity: number, price: number) => {
    // Get current position for this symbol
    const currentPosition = positions.get(symbol);
    if (!currentPosition) {
      alert("No shares to sell");
      return false;
    }

    const result = executeSellOrder(currentPosition, cash, quantity, price);
    if (result.success) {
      // Update symbol position
      if (result.updatedAccount.position <= 0) {
        // Remove position if no shares left
        setPositions(prev => {
          const newPositions = new Map(prev);
          newPositions.delete(symbol);
          return newPositions;
        });
      } else {
        const updatedPosition: SymbolPosition = {
          ...result.updatedAccount,
          symbol
        };
        
        setPositions(prev => {
          const newPositions = new Map(prev);
          newPositions.set(symbol, updatedPosition);
          return newPositions;
        });
      }
      
      // Update cash
      setCash(prev => prev + (quantity * price));
    } else {
      alert(result.errorMessage);
    }
    return result.success;
  };

  const getPosition = (symbol: string): SymbolPosition | undefined => {
    return positions.get(symbol);
  };

  const getAllPositions = (): SymbolPosition[] => {
    return Array.from(positions.values());
  };

  const getTotalPositionValue = (): number => {
    let total = 0;
    positions.forEach(position => {
      total += position.position * position.lastPrice;
    });
    return total;
  };

  const getTotalPnL = (): number => {
    let total = 0;
    positions.forEach(position => {
      total += position.pnl;
    });
    return total;
  };

  const updateLastPrice = (symbol: string, price: number) => {
    const currentPosition = positions.get(symbol);
    if (currentPosition) {
      const updatedPosition: SymbolPosition = {
        ...currentPosition,
        lastPrice: price,
        pnl: calculatePnL(currentPosition.position, currentPosition.avgPrice, price)
      };
      
      setPositions(prev => {
        const newPositions = new Map(prev);
        newPositions.set(symbol, updatedPosition);
        return newPositions;
      });
    }
  };

  // Overall trading position
  const tradingPosition: TradingPosition = {
    cash,
    position: 0, // Not used in multi-symbol implementation
    avgPrice: 0, // Not used in multi-symbol implementation
    lastPrice: 0, // Not used in multi-symbol implementation
    pnl: getTotalPnL(),
  };

  return {
    tradingPosition,
    handleBuy,
    handleSell,
    getPosition,
    getAllPositions,
    updateLastPrice,
  };
}