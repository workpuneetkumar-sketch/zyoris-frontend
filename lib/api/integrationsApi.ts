import api from "@/lib/api/api";
import {
  Connector,
  IntegrationInstance,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
  TestConnectionResponse,
  OAuthConnectResponse,
  DiscoveredSchemaResponse,
  SyncResponse,
  ReconnectResponse,
  ReconnectPayload,
  StatusToggleResponse,
  RotateCredentialsPayload,
  RotateCredentialsResponse,
} from "@/types/integrations";

/**
 * Retrieve Integration Marketplace connector catalog with live organization
 * connection state and configuration schemas.
 * GET /api/integrations/connectors
 */
export async function getConnectorsApi(): Promise<Connector[]> {
  const response = await api.get("/api/integrations/connectors");
  const data = response.data;
  // Handle both array response and wrapped response ({ data: [...] } or { connectors: [...] })
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.connectors)) {
    return data.connectors;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

/**
 * Retrieve list of connected integration instances for current organization.
 * GET /api/integrations
 */
export async function getIntegrationsApi(): Promise<IntegrationInstance[]> {
  const response = await api.get("/api/integrations");
  const data = response.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.integrations)) {
    return data.integrations;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

/**
 * Create/connect a new integration instance for current organization.
 * POST /api/integrations
 */
export async function createIntegrationApi(
  payload: CreateIntegrationPayload
): Promise<IntegrationInstance> {
  const response = await api.post("/api/integrations", payload);
  return response.data?.data || response.data?.integration || response.data;
}

/**
 * Get single integration details scoped to organization.
 * GET /api/integrations/{id}
 */
export async function getIntegrationByIdApi(
  id: string
): Promise<IntegrationInstance> {
  const response = await api.get(`/api/integrations/${encodeURIComponent(id)}`);
  return response.data?.data || response.data?.integration || response.data;
}

/**
 * Update configuration, status, or display name of an integration.
 * PATCH /api/integrations/{id}
 */
export async function updateIntegrationApi(
  id: string,
  payload: UpdateIntegrationPayload
): Promise<IntegrationInstance> {
  const response = await api.patch(
    `/api/integrations/${encodeURIComponent(id)}`,
    payload
  );
  return response.data?.data || response.data?.integration || response.data;
}

/**
 * Disconnect and remove an integration instance.
 * DELETE /api/integrations/{id}
 */
export async function deleteIntegrationApi(
  id: string
): Promise<{ success: boolean; message?: string }> {
  const response = await api.delete(`/api/integrations/${encodeURIComponent(id)}`);
  return response.data;
}

/**
 * Initiate connection or generate OAuth authorization URL for a connector.
 * POST /api/integrations/{provider}/connect
 */
export async function connectOAuthApi(
  provider: string,
  payload?: Record<string, any>
): Promise<OAuthConnectResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(provider)}/connect`,
    payload || {}
  );
  const data = response.data?.data || response.data;
  const authUrl =
    data?.authorizationUrl ||
    data?.authUrl ||
    data?.url ||
    data?.redirectUrl ||
    data?.redirect_url;
  return {
    ...data,
    authorizationUrl: authUrl,
    authUrl: authUrl,
    url: authUrl,
  };
}

/**
 * Complete OAuth 2.0 authorization callback.
 * GET /api/integrations/{provider}/callback
 */
export async function callbackOAuthApi(
  provider: string,
  params: Record<string, string | string[] | undefined>
): Promise<any> {
  const response = await api.get(
    `/api/integrations/${encodeURIComponent(provider)}/callback`,
    { params }
  );
  return response.data;
}

/**
 * Reconnect an integration and re-encrypt updated credentials in the vault.
 * POST /api/integrations/{id}/reconnect
 */
export async function reconnectIntegrationApi(
  id: string,
  payload?: ReconnectPayload | Record<string, any>
): Promise<ReconnectResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/reconnect`,
    payload || {}
  );
  return response.data;
}

/**
 * Rotate and encrypt credentials in the vault for an integration.
 * POST /api/integrations/{id}/rotate-credentials
 */
export async function rotateCredentialsApi(
  id: string,
  payload: RotateCredentialsPayload
): Promise<RotateCredentialsResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/rotate-credentials`,
    payload
  );
  return response.data;
}

/**
 * Trigger manual synchronization run for an integration.
 * POST /api/integrations/{id}/sync
 */
export async function triggerSyncApi(id: string): Promise<SyncResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/sync`
  );
  return response.data;
}

/**
 * Discover schema, entities, and fields available from a connected integration.
 * GET /api/integrations/{id}/schema
 */
export async function getIntegrationSchemaApi(
  id: string
): Promise<DiscoveredSchemaResponse> {
  const response = await api.get(
    `/api/integrations/${encodeURIComponent(id)}/schema`
  );
  const data = response.data;
  if (Array.isArray(data)) {
    return { entities: data, recordCount: data.length };
  }
  if (Array.isArray(data?.entities)) {
    return {
      ...data,
      entities: data.entities,
      recordCount: data.recordCount ?? data.totalRecords ?? data.total,
      pagination: data.pagination,
      sampleRecords: data.sampleRecords ?? data.sampleData ?? data.records,
    };
  }
  if (data?.data) {
    if (Array.isArray(data.data)) {
      return { entities: data.data, recordCount: data.data.length };
    }
    if (Array.isArray(data.data?.entities)) {
      return {
        ...data.data,
        entities: data.data.entities,
        recordCount:
          data.data.recordCount ??
          data.data.totalRecords ??
          data.recordCount ??
          data.totalRecords,
        pagination: data.data.pagination ?? data.pagination,
        sampleRecords:
          data.data.sampleRecords ??
          data.data.sampleData ??
          data.data.records ??
          data.sampleRecords,
      };
    }
    if (Array.isArray(data.data?.fields)) {
      return {
        entities: [
          {
            name: data.data.name || "DefaultEntity",
            label: data.data.label || data.data.name || "Entity",
            fields: data.data.fields,
            recordCount: data.data.recordCount ?? data.data.totalRecords,
            pagination: data.data.pagination,
            sampleRecords:
              data.data.sampleRecords ??
              data.data.sampleData ??
              data.data.records,
          },
        ],
        recordCount: data.data.recordCount ?? data.data.totalRecords,
        pagination: data.data.pagination,
        sampleRecords:
          data.data.sampleRecords ??
          data.data.sampleData ??
          data.data.records,
      };
    }
    return data.data;
  }
  if (Array.isArray(data?.fields)) {
    return {
      entities: [
        {
          name: data.name || "DefaultEntity",
          label: data.label || data.name || "Entity",
          fields: data.fields,
          recordCount: data.recordCount ?? data.totalRecords,
          pagination: data.pagination,
          sampleRecords: data.sampleRecords ?? data.sampleData ?? data.records,
        },
      ],
      recordCount: data.recordCount ?? data.totalRecords,
      pagination: data.pagination,
      sampleRecords: data.sampleRecords ?? data.sampleData ?? data.records,
    };
  }
  return { entities: [] };
}

/**
 * Test live connectivity and credentials for an integration.
 * POST /api/integrations/{id}/test
 */
export async function testIntegrationConnectionApi(
  id: string,
  payload?: Record<string, any>
): Promise<TestConnectionResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/test`,
    payload || {}
  );
  const data = response.data;
  if (data && typeof data === "object") {
    if (data.data && typeof data.data === "object") {
      return {
        ...data.data,
        success: data.data.success ?? data.success ?? (response.status >= 200 && response.status < 300),
        statusCode: data.data.statusCode ?? data.statusCode ?? response.status,
      };
    }
    return {
      ...data,
      success: data.success ?? (response.status >= 200 && response.status < 300),
      statusCode: data.statusCode ?? response.status,
    };
  }
  return {
    success: response.status >= 200 && response.status < 300,
    statusCode: response.status,
  };
}

/**
 * Pause synchronization for an integration.
 * POST /api/integrations/{id}/pause
 */
export async function pauseIntegrationApi(
  id: string
): Promise<StatusToggleResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/pause`
  );
  return response.data;
}

/**
 * Resume synchronization for an integration.
 * POST /api/integrations/{id}/resume
 */
export async function resumeIntegrationApi(
  id: string
): Promise<StatusToggleResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/resume`
  );
  return response.data;
}
