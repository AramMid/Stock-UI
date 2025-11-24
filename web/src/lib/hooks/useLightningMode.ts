"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export interface RealtimeData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  subscriptionFormat?: "json" | "binary";
}

interface LightningModeState {
  isEnabled: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  lastUpdate: number;
  updateCount: number;
  latency: number;
  subscribedSymbols: Set<string>;
}

interface UseLightningModeReturn {
  // State
  isEnabled: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  latency: number;
  updateCount: number;
  lastUpdate: number;

  // Controls
  enable: () => void;
  disable: () => void;
  toggle: () => void;

  // Subscription management
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  subscribeMultiple: (symbols: string[]) => void;
  unsubscribeAll: () => void;

  // Data access
  getLatestData: (symbol: string) => RealtimeData | null;
  getAllData: () => Record<string, RealtimeData>;

  // Configuration
  updateConfig: (config: Partial<WebSocketConfig>) => void;
  reconnect: () => void;
}

// Default WebSocket configuration
const DEFAULT_CONFIG: WebSocketConfig = {
  url: "wss://ws.finnhub.io?token=demo", // Demo endpoint
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  subscriptionFormat: "json",
};

// Mock WebSocket endpoints for different providers
const WS_PROVIDERS = {
  finnhub: "wss://ws.finnhub.io?token=",
  alpaca: "wss://stream.data.alpaca.markets/v2/stocks",
  yahoo: "wss://streamer.finance.yahoo.com/", // Not real endpoint
  local: "ws://localhost:8080/realtime",
};

/**
 * Custom hook for lightning mode real-time chart updates via WebSocket
 * Provides real-time price data with automatic reconnection and subscription management
 */
export default function useLightningMode(
  initialConfig: Partial<WebSocketConfig> = {},
  onDataUpdate?: (data: RealtimeData) => void
): UseLightningModeReturn {
  const config = { ...DEFAULT_CONFIG, ...initialConfig };

  const [state, setState] = useState<LightningModeState>({
    isEnabled: false,
    connectionStatus: "disconnected",
    lastUpdate: 0,
    updateCount: 0,
    latency: 0,
    subscribedSymbols: new Set(),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const realtimeDataRef = useRef<Record<string, RealtimeData>>({});
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastPingRef = useRef(0);

  // WebSocket message handlers
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const timestamp = Date.now();
        let data: any;

        if (config.subscriptionFormat === "json") {
          data = JSON.parse(event.data);
        } else {
          // Handle binary data if needed
          data = event.data;
        }

        // Handle different message types
        if (data.type === "trade" || data.type === "price") {
          const realtimeData: RealtimeData = {
            symbol: data.s || data.symbol,
            price: data.p || data.price,
            change: data.c || data.change || 0,
            changePercent: data.cp || data.changePercent || 0,
            volume: data.v || data.volume || 0,
            timestamp,
            bid: data.b || data.bid,
            ask: data.a || data.ask,
            high: data.h || data.high,
            low: data.l || data.low,
            open: data.o || data.open,
            close: data.p || data.price,
          };

          // Store data
          realtimeDataRef.current[realtimeData.symbol] = realtimeData;

          // Calculate latency
          const latency = data.t ? timestamp - data.t : 0;

          // Update state
          setState((prev) => ({
            ...prev,
            lastUpdate: timestamp,
            updateCount: prev.updateCount + 1,
            latency: latency > 0 ? latency : prev.latency,
          }));

          // Notify callback
          onDataUpdate?.(realtimeData);
        } else if (data.type === "pong") {
          // Handle heartbeat response
          const latency = timestamp - lastPingRef.current;
          setState((prev) => ({ ...prev, latency }));
        } else if (data.type === "error") {
          console.error("WebSocket error:", data.msg);
          setState((prev) => ({ ...prev, connectionStatus: "error" }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [config.subscriptionFormat, onDataUpdate]
  );

  const handleOpen = useCallback(() => {
    setState((prev) => ({ ...prev, connectionStatus: "connected" }));
    reconnectAttemptsRef.current = 0;

    // Resubscribe to symbols
    if (state.subscribedSymbols.size > 0) {
      const symbols = Array.from(state.subscribedSymbols);
      symbols.forEach((symbol) => {
        wsRef.current?.send(
          JSON.stringify({
            type: "subscribe",
            symbol,
          })
        );
      });
    }

    // Start heartbeat
    if (config.heartbeatInterval && config.heartbeatInterval > 0) {
      startHeartbeat();
    }
  }, [state.subscribedSymbols, config.heartbeatInterval]);

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
    stopHeartbeat();

    // Attempt to reconnect if enabled
    if (
      state.isEnabled &&
      reconnectAttemptsRef.current < (config.maxReconnectAttempts || 5)
    ) {
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (state.isEnabled) {
          connect();
        }
      }, config.reconnectInterval);
    }
  }, [state.isEnabled, config.reconnectInterval, config.maxReconnectAttempts]);

  const handleError = useCallback((error: Event) => {
    console.error("WebSocket error:", error);
    setState((prev) => ({ ...prev, connectionStatus: "error" }));
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        lastPingRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setState((prev) => ({ ...prev, connectionStatus: "connecting" }));

    try {
      wsRef.current = new WebSocket(config.url, config.protocols);
      wsRef.current.onopen = handleOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onclose = handleClose;
      wsRef.current.onerror = handleError;
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setState((prev) => ({ ...prev, connectionStatus: "error" }));
    }
  }, [
    config.url,
    config.protocols,
    handleOpen,
    handleMessage,
    handleClose,
    handleError,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      connectionStatus: "disconnected",
      isEnabled: false,
    }));
  }, [stopHeartbeat]);

  // Enable lightning mode
  const enable = useCallback(() => {
    setState((prev) => ({ ...prev, isEnabled: true }));
    connect();
  }, [connect]);

  // Disable lightning mode
  const disable = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Toggle lightning mode
  const toggle = useCallback(() => {
    if (state.isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [state.isEnabled, enable, disable]);

  // Subscribe to symbol
  const subscribe = useCallback((symbol: string) => {
    setState((prev) => ({
      ...prev,
      subscribedSymbols: new Set([...prev.subscribedSymbols, symbol]),
    }));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "subscribe",
          symbol,
        })
      );
    }
  }, []);

  // Unsubscribe from symbol
  const unsubscribe = useCallback((symbol: string) => {
    setState((prev) => {
      const newSymbols = new Set(prev.subscribedSymbols);
      newSymbols.delete(symbol);
      return {
        ...prev,
        subscribedSymbols: newSymbols,
      };
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "unsubscribe",
          symbol,
        })
      );
    }

    // Remove data for unsubscribed symbol
    delete realtimeDataRef.current[symbol];
  }, []);

  // Subscribe to multiple symbols
  const subscribeMultiple = useCallback(
    (symbols: string[]) => {
      symbols.forEach(subscribe);
    },
    [subscribe]
  );

  // Unsubscribe from all symbols
  const unsubscribeAll = useCallback(() => {
    const symbols = Array.from(state.subscribedSymbols);
    symbols.forEach(unsubscribe);
  }, [state.subscribedSymbols, unsubscribe]);

  // Get latest data for symbol
  const getLatestData = useCallback((symbol: string): RealtimeData | null => {
    return realtimeDataRef.current[symbol] || null;
  }, []);

  // Get all realtime data
  const getAllData = useCallback((): Record<string, RealtimeData> => {
    return { ...realtimeDataRef.current };
  }, []);

  // Update configuration
  const updateConfig = useCallback(
    (newConfig: Partial<WebSocketConfig>) => {
      Object.assign(config, newConfig);

      // Reconnect if currently connected
      if (state.isEnabled) {
        disconnect();
        setTimeout(connect, 100);
      }
    },
    [state.isEnabled, disconnect, connect]
  );

  // Reconnect
  const reconnect = useCallback(() => {
    if (state.isEnabled) {
      disconnect();
      setTimeout(connect, 100);
    }
  }, [state.isEnabled, disconnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    isEnabled: state.isEnabled,
    connectionStatus: state.connectionStatus,
    latency: state.latency,
    updateCount: state.updateCount,
    lastUpdate: state.lastUpdate,

    // Controls
    enable,
    disable,
    toggle,

    // Subscription management
    subscribe,
    unsubscribe,
    subscribeMultiple,
    unsubscribeAll,

    // Data access
    getLatestData,
    getAllData,

    // Configuration
    updateConfig,
    reconnect,
  };
}
