"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Connector,
  IntegrationInstance,
  ConnectorCategory,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
  TestConnectionResponse,
  OAuthConnectResponse,
  DiscoveredSchemaResponse,
  RotateCredentialsPayload,
  RotateCredentialsResponse,
  ReconnectPayload,
  FieldMapping,
  SchemaMappingPayload,
  SchemaMappingResponse,
  DiscoverSchemaPayload,
} from "@/types/integrations";
import {
  getConnectorsApi,
  getIntegrationsApi,
  createIntegrationApi,
  updateIntegrationApi,
  deleteIntegrationApi,
  reconnectIntegrationApi,
  rotateCredentialsApi,
  triggerSyncApi,
  getIntegrationSchemaApi,
  discoverIntegrationSchemaApi,
  getSchemaMappingApi,
  saveSchemaMappingApi,
  testIntegrationConnectionApi,
  pauseIntegrationApi,
  resumeIntegrationApi,
  connectOAuthApi,
} from "@/lib/api/integrationsApi";

export type StatusFilter =
  | "ALL"
  | "CONNECTED"
  | "NOT_CONNECTED"
  | "ACTIVE"
  | "PAUSED"
  | "ERROR";

export function useIntegrations() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationInstance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<
    ConnectorCategory | "ALL"
  >("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [connectorsData, integrationsData] = await Promise.allSettled([
        getConnectorsApi(),
        getIntegrationsApi(),
      ]);

      let loadedConnectors: Connector[] = [];
      let loadedIntegrations: IntegrationInstance[] = [];

      if (connectorsData.status === "fulfilled") {
        loadedConnectors = connectorsData.value || [];
      } else {
        console.error("Failed to load connectors:", connectorsData.reason);
      }

      if (integrationsData.status === "fulfilled") {
        loadedIntegrations = integrationsData.value || [];
      } else {
        console.error("Failed to load integrations:", integrationsData.reason);
      }

      if (
        connectorsData.status === "rejected" &&
        integrationsData.status === "rejected"
      ) {
        const errorMsg =
          connectorsData.reason?.response?.data?.message ||
          connectorsData.reason?.message ||
          "Failed to load integration marketplace connectors";
        setError(errorMsg);
      }

      // Merge connection state with strict, individual matching
      const mappedConnectors = loadedConnectors.map((c) => {
        const matchingInstance = loadedIntegrations.find((i) => {
          if (!i) return false;
          // Match by explicit connectorId
          if (
            i.connectorId &&
            c.id &&
            String(i.connectorId).toLowerCase() === String(c.id).toLowerCase()
          ) {
            return true;
          }
          // Match by connectionId
          if (c.connectionId && i.id && String(c.connectionId) === String(i.id)) {
            return true;
          }
          // Match by connectionState.id
          if (
            c.connectionState?.id &&
            i.id &&
            String(c.connectionState.id) === String(i.id)
          ) {
            return true;
          }
          // Match by provider if and only if both are non-empty strings
          if (
            typeof i.provider === "string" &&
            typeof c.provider === "string" &&
            i.provider.trim() !== "" &&
            c.provider.trim() !== "" &&
            i.provider.trim().toLowerCase() === c.provider.trim().toLowerCase()
          ) {
            return true;
          }
          if (
            typeof i.provider === "string" &&
            typeof c.id === "string" &&
            i.provider.trim() !== "" &&
            c.id.trim() !== "" &&
            i.provider.trim().toLowerCase() === c.id.trim().toLowerCase()
          ) {
            return true;
          }
          return false;
        });

        if (matchingInstance) {
          const statusUpper = (matchingInstance.status || "").toUpperCase();
          const isConnected =
            statusUpper === "ACTIVE" ||
            statusUpper === "CONNECTED" ||
            statusUpper === "PAUSED" ||
            statusUpper === "ERROR";

          return {
            ...c,
            isConnected,
            connectionId: matchingInstance.id,
            status: matchingInstance.status || (isConnected ? "ACTIVE" : "NOT_CONNECTED"),
            connectionState: {
              id: matchingInstance.id,
              status: matchingInstance.status,
              lastSyncAt: matchingInstance.lastSyncAt,
              errorCount: matchingInstance.errorCount,
              lastError: matchingInstance.lastError,
              displayName:
                matchingInstance.displayName || matchingInstance.name,
            },
          };
        }

        // If connector returned its own individual connectionId from backend
        if (c.connectionId || c.connectionState?.id) {
          return {
            ...c,
            isConnected: c.isConnected ?? true,
            status: c.status || "ACTIVE",
          };
        }

        // Not connected
        return {
          ...c,
          isConnected: false,
          connectionId: undefined,
          status: "NOT_CONNECTED",
        };
      });

      setConnectors(mappedConnectors);
      setIntegrations(loadedIntegrations);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "An unexpected error occurred while fetching connectors.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived filtered list of connectors
  const filteredConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      // 1. Category Filter
      if (selectedCategory !== "ALL") {
        const connCat = (connector.category || "").toUpperCase();
        const selCat = selectedCategory.toUpperCase();
        if (connCat !== selCat) return false;
      }

      // 2. Status Filter
      if (selectedStatus !== "ALL") {
        const isConnected = !!connector.isConnected;
        const statusUpper = (
          connector.status || (isConnected ? "CONNECTED" : "NOT_CONNECTED")
        ).toUpperCase();

        if (selectedStatus === "CONNECTED" && !isConnected) return false;
        if (selectedStatus === "NOT_CONNECTED" && isConnected) return false;
        if (selectedStatus === "ACTIVE" && statusUpper !== "ACTIVE") return false;
        if (selectedStatus === "PAUSED" && statusUpper !== "PAUSED") return false;
        if (selectedStatus === "ERROR" && statusUpper !== "ERROR") return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = connector.name?.toLowerCase().includes(query);
        const descMatch = connector.description?.toLowerCase().includes(query);
        const providerMatch = connector.provider?.toLowerCase().includes(query);
        const catMatch = connector.category?.toLowerCase().includes(query);
        const capMatch = connector.capabilities?.some((cap) =>
          cap.toLowerCase().includes(query)
        );

        if (
          !nameMatch &&
          !descMatch &&
          !providerMatch &&
          !catMatch &&
          !capMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [connectors, selectedCategory, selectedStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = connectors.length;
    const connected = connectors.filter((c) => c.isConnected).length;
    const active = connectors.filter(
      (c) => c.isConnected && (c.status === "ACTIVE" || c.status === "CONNECTED")
    ).length;
    const errors = connectors.filter(
      (c) =>
        c.status === "ERROR" ||
        (c.connectionState?.errorCount && c.connectionState.errorCount > 0)
    ).length;

    return { total, connected, active, errors };
  }, [connectors]);

  // Actions with targeted optimistic state updates
  const createIntegration = async (
    payload: CreateIntegrationPayload
  ): Promise<IntegrationInstance> => {
    const newIntegration = await createIntegrationApi(payload);
    await fetchData();
    return newIntegration;
  };

  const updateIntegration = async (
    id: string,
    payload: UpdateIntegrationPayload
  ): Promise<IntegrationInstance> => {
    const updated = await updateIntegrationApi(id, payload);
    setConnectors((prev) =>
      prev.map((c) => {
        if (c.connectionId === id || c.id === id || c.connectionState?.id === id) {
          return {
            ...c,
            status: payload.status || c.status,
            connectionState: c.connectionState
              ? {
                  ...c.connectionState,
                  displayName: payload.displayName || c.connectionState.displayName,
                  status: payload.status || c.connectionState.status,
                }
              : undefined,
          };
        }
        return c;
      })
    );
    await fetchData();
    return updated;
  };

  const deleteIntegration = async (id: string): Promise<void> => {
    // Optimistic update for targeted connector only
    setConnectors((prev) =>
      prev.map((c) => {
        if (
          c.connectionId === id ||
          c.id === id ||
          c.connectionState?.id === id
        ) {
          return {
            ...c,
            isConnected: false,
            status: "NOT_CONNECTED",
            connectionId: undefined,
            connectionState: undefined,
          };
        }
        return c;
      })
    );
    setIntegrations((prev) => prev.filter((i) => i.id !== id));

    try {
      await deleteIntegrationApi(id);
    } catch (e) {
      console.warn("Backend delete completed or fallback", e);
    }
    await fetchData();
  };

  const reconnectIntegration = async (
    id: string,
    payload?: ReconnectPayload | Record<string, any>
  ) => {
    const res = await reconnectIntegrationApi(id, payload);
    setConnectors((prev) =>
      prev.map((c) => {
        if (c.connectionId === id || c.id === id || c.connectionState?.id === id) {
          return {
            ...c,
            status: "ACTIVE",
            connectionState: c.connectionState
              ? { ...c.connectionState, status: "ACTIVE", errorCount: 0, lastError: undefined }
              : undefined,
          };
        }
        return c;
      })
    );
    await fetchData();
    return res;
  };

  const rotateCredentials = async (
    id: string,
    payload: RotateCredentialsPayload
  ): Promise<RotateCredentialsResponse> => {
    const res = await rotateCredentialsApi(id, payload);
    await fetchData();
    return res;
  };

  const triggerSync = async (id: string) => {
    const res = await triggerSyncApi(id);
    await fetchData();
    return res;
  };

  const pauseIntegration = async (id: string) => {
    // Optimistically pause ONLY the targeted connector
    setConnectors((prev) =>
      prev.map((c) => {
        if (c.connectionId === id || c.id === id || c.connectionState?.id === id) {
          return {
            ...c,
            status: "PAUSED",
            connectionState: c.connectionState
              ? { ...c.connectionState, status: "PAUSED" }
              : undefined,
          };
        }
        return c;
      })
    );
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "PAUSED" } : i))
    );

    try {
      await pauseIntegrationApi(id);
    } catch (e) {
      console.warn("Pause API response handled", e);
    }
    await fetchData();
  };

  const resumeIntegration = async (id: string) => {
    // Optimistically resume ONLY the targeted connector
    setConnectors((prev) =>
      prev.map((c) => {
        if (c.connectionId === id || c.id === id || c.connectionState?.id === id) {
          return {
            ...c,
            status: "ACTIVE",
            connectionState: c.connectionState
              ? { ...c.connectionState, status: "ACTIVE" }
              : undefined,
          };
        }
        return c;
      })
    );
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "ACTIVE" } : i))
    );

    try {
      await resumeIntegrationApi(id);
    } catch (e) {
      console.warn("Resume API response handled", e);
    }
    await fetchData();
  };

  const testConnection = async (
    id: string,
    payload?: Record<string, any>
  ): Promise<TestConnectionResponse> => {
    return await testIntegrationConnectionApi(id, payload);
  };

  const fetchSchema = async (id: string): Promise<DiscoveredSchemaResponse> => {
    return await getIntegrationSchemaApi(id);
  };

  const discoverSchema = async (
    id: string,
    payload?: DiscoverSchemaPayload | Record<string, any>
  ): Promise<DiscoveredSchemaResponse> => {
    return await discoverIntegrationSchemaApi(id, payload);
  };

  const getSchemaMapping = async (
    id: string
  ): Promise<SchemaMappingResponse> => {
    return await getSchemaMappingApi(id);
  };

  const saveSchemaMapping = async (
    id: string,
    payload: SchemaMappingPayload
  ): Promise<SchemaMappingResponse> => {
    return await saveSchemaMappingApi(id, payload);
  };

  const initiateOAuth = async (
    provider: string,
    payload?: Record<string, any>
  ): Promise<OAuthConnectResponse> => {
    return await connectOAuthApi(provider, payload);
  };

  return {
    connectors,
    integrations,
    filteredConnectors,
    stats,
    isLoading,
    isError: !!error,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    refresh: fetchData,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    reconnectIntegration,
    rotateCredentials,
    triggerSync,
    pauseIntegration,
    resumeIntegration,
    testConnection,
    fetchSchema,
    discoverSchema,
    getSchemaMapping,
    saveSchemaMapping,
    initiateOAuth,
  };
}
