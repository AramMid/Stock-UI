"use client";
import { useCallback, useState, useRef } from "react";
import { ChartConfiguration } from "./useChartSaveLoad";

export interface CloudSaveProvider {
  name: string;
  id: string;
  apiEndpoint: string;
  authRequired: boolean;
  maxFileSize?: number;
  description: string;
}

export interface CloudSaveCredentials {
  apiKey?: string;
  accessToken?: string;
  userId?: string;
  refreshToken?: string;
}

export interface CloudSaveResponse {
  success: boolean;
  cloudId?: string;
  url?: string;
  error?: string;
  provider: string;
}

export interface CloudChartMetadata {
  cloudId: string;
  provider: string;
  lastSynced: number;
  isPublic: boolean;
  shareUrl?: string;
  collaborators?: string[];
}

interface UseCloudSaveReturn {
  // State
  isConnected: boolean;
  currentProvider: CloudSaveProvider | null;
  syncStatus: "idle" | "syncing" | "error" | "success";

  // Provider management
  setProvider: (
    provider: CloudSaveProvider,
    credentials?: CloudSaveCredentials
  ) => Promise<boolean>;
  disconnect: () => void;
  getAvailableProviders: () => CloudSaveProvider[];

  // Cloud operations
  saveToCloud: (
    chart: ChartConfiguration,
    metadata?: Partial<CloudChartMetadata>
  ) => Promise<CloudSaveResponse>;
  loadFromCloud: (
    cloudId: string,
    provider?: string
  ) => Promise<ChartConfiguration | null>;
  deleteFromCloud: (cloudId: string, provider?: string) => Promise<boolean>;

  // Sync operations
  syncChart: (localId: string, cloudId?: string) => Promise<CloudSaveResponse>;
  syncAllCharts: () => Promise<CloudSaveResponse[]>;

  // Sharing
  shareChart: (chartId: string, isPublic: boolean) => Promise<string | null>;
  getSharedChart: (shareUrl: string) => Promise<ChartConfiguration | null>;

  // Utilities
  getCloudMetadata: (localId: string) => CloudChartMetadata | null;
  setCloudMetadata: (localId: string, metadata: CloudChartMetadata) => void;
  getStorageQuota: () => Promise<{ used: number; total: number } | null>;
}

// Available cloud providers
const CLOUD_PROVIDERS: CloudSaveProvider[] = [
  {
    name: "GitHub Gist",
    id: "github",
    apiEndpoint: "https://api.github.com/gists",
    authRequired: true,
    maxFileSize: 1024 * 1024, // 1MB
    description: "Save charts as GitHub Gists (requires GitHub token)",
  },
  {
    name: "Local Server",
    id: "local-server",
    apiEndpoint: "/api/charts",
    authRequired: false,
    description: "Save to local server (development only)",
  },
  {
    name: "Custom API",
    id: "custom",
    apiEndpoint: "",
    authRequired: true,
    description: "Use custom API endpoint",
  },
];

const METADATA_KEY = "chart_cloud_metadata";

/**
 * Custom hook for cloud save/load functionality
 * Supports multiple providers (GitHub Gists, custom APIs, etc.)
 */
export default function useCloudSave(): UseCloudSaveReturn {
  const [currentProvider, setCurrentProvider] =
    useState<CloudSaveProvider | null>(null);
  const [credentials, setCredentials] = useState<CloudSaveCredentials>({});
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "error" | "success"
  >("idle");
  const abortController = useRef<AbortController | null>(null);

  const isConnected = currentProvider !== null;

  // Get cloud metadata from localStorage
  const getCloudMetadataStorage = useCallback((): Record<
    string,
    CloudChartMetadata
  > => {
    try {
      const stored = localStorage.getItem(METADATA_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  // Save cloud metadata to localStorage
  const saveCloudMetadataStorage = useCallback(
    (metadata: Record<string, CloudChartMetadata>) => {
      try {
        localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      } catch (error) {
        console.error("Error saving cloud metadata:", error);
      }
    },
    []
  );

  // Set cloud provider
  const setProvider = useCallback(
    async (
      provider: CloudSaveProvider,
      creds?: CloudSaveCredentials
    ): Promise<boolean> => {
      try {
        setSyncStatus("syncing");

        // Test connection if auth is required
        if (provider.authRequired && creds) {
          const testResponse = await fetch(provider.apiEndpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${creds.accessToken || creds.apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (!testResponse.ok && testResponse.status === 401) {
            setSyncStatus("error");
            return false;
          }
        }

        setCurrentProvider(provider);
        setCredentials(creds || {});
        setSyncStatus("success");

        // Store provider info
        localStorage.setItem(
          "cloud_provider",
          JSON.stringify({ provider, credentials: creds })
        );

        return true;
      } catch {
        setSyncStatus("error");
        return false;
      }
    },
    []
  );

  // Disconnect from cloud provider
  const disconnect = useCallback(() => {
    setCurrentProvider(null);
    setCredentials({});
    setSyncStatus("idle");
    localStorage.removeItem("cloud_provider");

    // Cancel any ongoing requests
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  // Get available providers
  const getAvailableProviders = useCallback(() => CLOUD_PROVIDERS, []);

  // Save chart to cloud
  const saveToCloud = useCallback(
    async (
      chart: ChartConfiguration,
      metadata: Partial<CloudChartMetadata> = {}
    ): Promise<CloudSaveResponse> => {
      if (!currentProvider) {
        return {
          success: false,
          error: "No cloud provider connected",
          provider: "none",
        };
      }

      try {
        setSyncStatus("syncing");
        abortController.current = new AbortController();

        let response: Response;
        const chartData = JSON.stringify(chart, null, 2);

        switch (currentProvider.id) {
          case "github":
            response = await fetch(currentProvider.apiEndpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${credentials.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                description: `Trading Chart: ${chart.name}`,
                public: metadata.isPublic || false,
                files: {
                  [`${chart.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`]: {
                    content: chartData,
                  },
                },
              }),
              signal: abortController.current.signal,
            });
            break;

          case "local-server":
            response = await fetch(currentProvider.apiEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ chart, metadata }),
              signal: abortController.current.signal,
            });
            break;

          default:
            return {
              success: false,
              error: "Unsupported provider",
              provider: currentProvider.id,
            };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const cloudId =
          currentProvider.id === "github"
            ? result.id
            : result.id || result.cloudId;

        // Save metadata
        const cloudMetadata: CloudChartMetadata = {
          cloudId,
          provider: currentProvider.id,
          lastSynced: Date.now(),
          isPublic: metadata.isPublic || false,
          shareUrl:
            currentProvider.id === "github" ? result.html_url : result.shareUrl,
          ...metadata,
        };

        setCloudMetadata(chart.id, cloudMetadata);
        setSyncStatus("success");

        return {
          success: true,
          cloudId,
          url: cloudMetadata.shareUrl,
          provider: currentProvider.id,
        };
      } catch (error) {
        setSyncStatus("error");
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          provider: currentProvider.id,
        };
      }
    },
    [currentProvider, credentials]
  );

  // Load chart from cloud
  const loadFromCloud = useCallback(
    async (
      cloudId: string,
      provider?: string
    ): Promise<ChartConfiguration | null> => {
      const providerToUse = provider
        ? CLOUD_PROVIDERS.find((p) => p.id === provider)
        : currentProvider;

      if (!providerToUse) {
        return null;
      }

      try {
        setSyncStatus("syncing");
        abortController.current = new AbortController();

        let response: Response;

        switch (providerToUse.id) {
          case "github":
            response = await fetch(`${providerToUse.apiEndpoint}/${cloudId}`, {
              headers: credentials.apiKey
                ? {
                    Authorization: `Bearer ${credentials.apiKey}`,
                  }
                : {},
              signal: abortController.current.signal,
            });
            break;

          case "local-server":
            response = await fetch(`${providerToUse.apiEndpoint}/${cloudId}`, {
              signal: abortController.current.signal,
            });
            break;

          default:
            return null;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        let chartData: ChartConfiguration;
        if (providerToUse.id === "github") {
          // GitHub Gist format
          const files = result.files;
          const fileName = Object.keys(files)[0];
          chartData = JSON.parse(files[fileName].content);
        } else {
          chartData = result.chart || result;
        }

        setSyncStatus("success");
        return chartData;
      } catch {
        setSyncStatus("error");
        return null;
      }
    },
    [currentProvider, credentials]
  );

  // Delete chart from cloud
  const deleteFromCloud = useCallback(
    async (cloudId: string, provider?: string): Promise<boolean> => {
      const providerToUse = provider
        ? CLOUD_PROVIDERS.find((p) => p.id === provider)
        : currentProvider;

      if (!providerToUse) {
        return false;
      }

      try {
        setSyncStatus("syncing");
        abortController.current = new AbortController();

        const response = await fetch(
          `${providerToUse.apiEndpoint}/${cloudId}`,
          {
            method: "DELETE",
            headers: credentials.apiKey
              ? {
                  Authorization: `Bearer ${credentials.apiKey}`,
                }
              : {},
            signal: abortController.current.signal,
          }
        );

        setSyncStatus(response.ok ? "success" : "error");
        return response.ok;
      } catch {
        setSyncStatus("error");
        return false;
      }
    },
    [currentProvider, credentials]
  );

  // Sync specific chart
  const syncChart = useCallback(
    async (localId: string, cloudId?: string): Promise<CloudSaveResponse> => {
      // This would need access to the local chart data
      // Implementation depends on integration with useChartSaveLoad
      return {
        success: false,
        error: "Not implemented",
        provider: currentProvider?.id || "none",
      };
    },
    [currentProvider]
  );

  // Sync all charts
  const syncAllCharts = useCallback(async (): Promise<CloudSaveResponse[]> => {
    // This would need access to all local charts
    // Implementation depends on integration with useChartSaveLoad
    return [];
  }, []);

  // Share chart publicly
  const shareChart = useCallback(
    async (chartId: string, isPublic: boolean): Promise<string | null> => {
      const metadata = getCloudMetadata(chartId);
      if (!metadata) {
        return null;
      }

      // Update sharing settings
      metadata.isPublic = isPublic;
      setCloudMetadata(chartId, metadata);

      return metadata.shareUrl || null;
    },
    []
  );

  // Get shared chart
  const getSharedChart = useCallback(
    async (shareUrl: string): Promise<ChartConfiguration | null> => {
      try {
        // Extract cloud ID from share URL
        let cloudId: string;
        let provider: string;

        if (shareUrl.includes("gist.github.com")) {
          provider = "github";
          cloudId = shareUrl.split("/").pop() || "";
        } else {
          // Handle other providers
          return null;
        }

        return await loadFromCloud(cloudId, provider);
      } catch {
        return null;
      }
    },
    [loadFromCloud]
  );

  // Get cloud metadata for chart
  const getCloudMetadata = useCallback(
    (localId: string): CloudChartMetadata | null => {
      const allMetadata = getCloudMetadataStorage();
      return allMetadata[localId] || null;
    },
    [getCloudMetadataStorage]
  );

  // Set cloud metadata for chart
  const setCloudMetadata = useCallback(
    (localId: string, metadata: CloudChartMetadata) => {
      const allMetadata = getCloudMetadataStorage();
      allMetadata[localId] = metadata;
      saveCloudMetadataStorage(allMetadata);
    },
    [getCloudMetadataStorage, saveCloudMetadataStorage]
  );

  // Get storage quota
  const getStorageQuota = useCallback(async (): Promise<{
    used: number;
    total: number;
  } | null> => {
    if (!currentProvider) return null;

    try {
      // This would depend on the provider's API
      return null;
    } catch {
      return null;
    }
  }, [currentProvider]);

  return {
    // State
    isConnected,
    currentProvider,
    syncStatus,

    // Provider management
    setProvider,
    disconnect,
    getAvailableProviders,

    // Cloud operations
    saveToCloud,
    loadFromCloud,
    deleteFromCloud,

    // Sync operations
    syncChart,
    syncAllCharts,

    // Sharing
    shareChart,
    getSharedChart,

    // Utilities
    getCloudMetadata,
    setCloudMetadata,
    getStorageQuota,
  };
}
