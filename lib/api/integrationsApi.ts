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
  StatusToggleResponse,
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
 * Reconnect an integration and reset error counters.
 * POST /api/integrations/{id}/reconnect
 */
export async function reconnectIntegrationApi(
  id: string,
  payload?: Record<string, any>
): Promise<ReconnectResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/reconnect`,
    payload || {}
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
    return { entities: data };
  }
  if (Array.isArray(data?.entities)) {
    return data;
  }
  if (data?.data) {
    return Array.isArray(data.data) ? { entities: data.data } : data.data;
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
  return response.data;
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
