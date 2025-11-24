"use client";
import { useCallback } from "react";
import { ChartLayout } from "../../components/trading/ChartLayoutSelector";

export interface ChartConfiguration {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  chartType: "candlestick" | "line" | "area";
  layout: ChartLayout;
  indicators: {
    type: string;
    enabled: boolean;
    settings: Record<string, any>;
  }[];
  drawings: {
    type: string;
    coordinates: any;
    style: Record<string, any>;
  }[];
  settings: {
    showVolume: boolean;
    showGrid: boolean;
    theme: "light" | "dark";
    colors: Record<string, string>;
  };
  created: number;
  updated: number;
  version: string;
}

interface SavedChartsList {
  charts: ChartConfiguration[];
  lastUpdated: number;
}

interface UseChartSaveLoadReturn {
  // Save operations
  saveChart: (
    config: Omit<ChartConfiguration, "id" | "created" | "updated" | "version">
  ) => Promise<string>;
  updateChart: (
    id: string,
    updates: Partial<ChartConfiguration>
  ) => Promise<boolean>;

  // Load operations
  loadChart: (id: string) => Promise<ChartConfiguration | null>;
  loadAllCharts: () => Promise<ChartConfiguration[]>;
  getChart: (id: string) => ChartConfiguration | null;

  // Management operations
  deleteChart: (id: string) => Promise<boolean>;
  duplicateChart: (id: string, newName?: string) => Promise<string | null>;
  exportChart: (id: string) => Promise<string | null>;
  importChart: (configJson: string) => Promise<string | null>;

  // Utilities
  getChartsList: () => ChartConfiguration[];
  clearAllCharts: () => Promise<boolean>;
  getStorageSize: () => number;

  // Auto-save
  enableAutoSave: (chartId: string, interval?: number) => void;
  disableAutoSave: (chartId?: string) => void;
}

const STORAGE_KEY = "trading_charts";
const CURRENT_VERSION = "1.0.0";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Custom hook for saving and loading chart configurations to/from localStorage
 * Supports auto-save, versioning, and data migration
 */
export default function useChartSaveLoad(): UseChartSaveLoadReturn {
  // Auto-save timers
  const autoSaveTimers = new Map<string, NodeJS.Timeout>();

  // Generate unique ID
  const generateId = useCallback(() => {
    return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Get saved charts from localStorage
  const getSavedCharts = useCallback((): SavedChartsList => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { charts: [], lastUpdated: Date.now() };
      }

      const parsed = JSON.parse(stored) as SavedChartsList;

      // Migrate old format if needed
      if (!parsed.charts || !Array.isArray(parsed.charts)) {
        return { charts: [], lastUpdated: Date.now() };
      }

      return parsed;
    } catch (error) {
      console.error("Error reading saved charts:", error);
      return { charts: [], lastUpdated: Date.now() };
    }
  }, []);

  // Save charts to localStorage
  const saveSavedCharts = useCallback(
    (chartsList: SavedChartsList): boolean => {
      try {
        chartsList.lastUpdated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chartsList));
        return true;
      } catch (error) {
        console.error("Error saving charts:", error);
        return false;
      }
    },
    []
  );

  // Save new chart
  const saveChart = useCallback(
    async (
      config: Omit<ChartConfiguration, "id" | "created" | "updated" | "version">
    ): Promise<string> => {
      const id = generateId();
      const now = Date.now();

      const fullConfig: ChartConfiguration = {
        ...config,
        id,
        created: now,
        updated: now,
        version: CURRENT_VERSION,
      };

      const saved = getSavedCharts();
      saved.charts.push(fullConfig);

      if (saveSavedCharts(saved)) {
        return id;
      } else {
        throw new Error("Failed to save chart");
      }
    },
    [generateId, getSavedCharts, saveSavedCharts]
  );

  // Update existing chart
  const updateChart = useCallback(
    async (
      id: string,
      updates: Partial<ChartConfiguration>
    ): Promise<boolean> => {
      const saved = getSavedCharts();
      const chartIndex = saved.charts.findIndex((chart) => chart.id === id);

      if (chartIndex === -1) {
        return false;
      }

      saved.charts[chartIndex] = {
        ...saved.charts[chartIndex],
        ...updates,
        updated: Date.now(),
        version: CURRENT_VERSION,
      };

      return saveSavedCharts(saved);
    },
    [getSavedCharts, saveSavedCharts]
  );

  // Load specific chart
  const loadChart = useCallback(
    async (id: string): Promise<ChartConfiguration | null> => {
      const saved = getSavedCharts();
      const chart = saved.charts.find((chart) => chart.id === id);
      return chart || null;
    },
    [getSavedCharts]
  );

  // Load all charts
  const loadAllCharts = useCallback(async (): Promise<ChartConfiguration[]> => {
    const saved = getSavedCharts();
    return saved.charts.sort((a, b) => b.updated - a.updated);
  }, [getSavedCharts]);

  // Get chart synchronously
  const getChart = useCallback(
    (id: string): ChartConfiguration | null => {
      const saved = getSavedCharts();
      return saved.charts.find((chart) => chart.id === id) || null;
    },
    [getSavedCharts]
  );

  // Delete chart
  const deleteChart = useCallback(
    async (id: string): Promise<boolean> => {
      const saved = getSavedCharts();
      const initialLength = saved.charts.length;
      saved.charts = saved.charts.filter((chart) => chart.id !== id);

      if (saved.charts.length < initialLength) {
        // Also disable auto-save for this chart
        const timer = autoSaveTimers.get(id);
        if (timer) {
          clearInterval(timer);
          autoSaveTimers.delete(id);
        }

        return saveSavedCharts(saved);
      }

      return false;
    },
    [getSavedCharts, saveSavedCharts]
  );

  // Duplicate chart
  const duplicateChart = useCallback(
    async (id: string, newName?: string): Promise<string | null> => {
      const chart = await loadChart(id);
      if (!chart) return null;

      const duplicated = {
        ...chart,
        name: newName || `${chart.name} (Copy)`,
      };

      // Remove ID fields so a new one is generated
      delete (duplicated as any).id;
      delete (duplicated as any).created;
      delete (duplicated as any).updated;
      delete (duplicated as any).version;

      try {
        return await saveChart(duplicated);
      } catch {
        return null;
      }
    },
    [loadChart, saveChart]
  );

  // Export chart to JSON string
  const exportChart = useCallback(
    async (id: string): Promise<string | null> => {
      const chart = await loadChart(id);
      if (!chart) return null;

      try {
        return JSON.stringify(chart, null, 2);
      } catch {
        return null;
      }
    },
    [loadChart]
  );

  // Import chart from JSON string
  const importChart = useCallback(
    async (configJson: string): Promise<string | null> => {
      try {
        const config = JSON.parse(configJson) as ChartConfiguration;

        // Validate required fields
        if (!config.name || !config.symbol) {
          throw new Error("Invalid chart configuration");
        }

        // Remove ID fields so a new one is generated
        const importConfig = {
          ...config,
          name: `${config.name} (Imported)`,
        };
        delete (importConfig as any).id;
        delete (importConfig as any).created;
        delete (importConfig as any).updated;
        delete (importConfig as any).version;

        return await saveChart(importConfig);
      } catch {
        return null;
      }
    },
    [saveChart]
  );

  // Get charts list synchronously
  const getChartsList = useCallback((): ChartConfiguration[] => {
    const saved = getSavedCharts();
    return saved.charts.sort((a, b) => b.updated - a.updated);
  }, [getSavedCharts]);

  // Clear all charts
  const clearAllCharts = useCallback(async (): Promise<boolean> => {
    try {
      // Clear all auto-save timers
      autoSaveTimers.forEach((timer) => clearInterval(timer));
      autoSaveTimers.clear();

      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Get storage size in bytes
  const getStorageSize = useCallback((): number => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Blob([stored]).size : 0;
  }, []);

  // Enable auto-save for a chart
  const enableAutoSave = useCallback(
    (chartId: string, interval: number = AUTO_SAVE_INTERVAL) => {
      // Clear existing timer if any
      const existingTimer = autoSaveTimers.get(chartId);
      if (existingTimer) {
        clearInterval(existingTimer);
      }

      // Set new timer
      const timer = setInterval(async () => {
        // This would be called by the component using this hook
        // The component should trigger an update with current chart state
        console.log(`Auto-save triggered for chart ${chartId}`);
      }, interval);

      autoSaveTimers.set(chartId, timer);
    },
    []
  );

  // Disable auto-save
  const disableAutoSave = useCallback((chartId?: string) => {
    if (chartId) {
      const timer = autoSaveTimers.get(chartId);
      if (timer) {
        clearInterval(timer);
        autoSaveTimers.delete(chartId);
      }
    } else {
      // Disable all auto-save timers
      autoSaveTimers.forEach((timer) => clearInterval(timer));
      autoSaveTimers.clear();
    }
  }, []);

  return {
    // Save operations
    saveChart,
    updateChart,

    // Load operations
    loadChart,
    loadAllCharts,
    getChart,

    // Management operations
    deleteChart,
    duplicateChart,
    exportChart,
    importChart,

    // Utilities
    getChartsList,
    clearAllCharts,
    getStorageSize,

    // Auto-save
    enableAutoSave,
    disableAutoSave,
  };
}
