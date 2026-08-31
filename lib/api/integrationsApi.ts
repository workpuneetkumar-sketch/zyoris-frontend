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
  FieldMapping,
  SchemaMappingPayload,
  SchemaMappingResponse,
  DiscoverSchemaPayload,
  DiscoveredEntity,
} from "@/types/integrations";

/**
 * Retrieve Integration Marketplace connector catalog with live organization
 * connection state and configuration schemas.
 * GET /api/v1/integrations/connectors
 */
export async function getConnectorsApi(): Promise<Connector[]> {
  const response = await api.get("/api/v1/integrations/connectors");
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
 * GET /api/v1/integrations
 */
export async function getIntegrationsApi(): Promise<IntegrationInstance[]> {
  const response = await api.get("/api/v1/integrations");
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
 * Create/connect a new integration instance for current organization with encrypted credentials.
 * POST /api/v1/integrations
 */
export async function createIntegrationApi(
  payload: CreateIntegrationPayload
): Promise<IntegrationInstance> {
  const response = await api.post("/api/v1/integrations", payload);
  return response.data?.data || response.data?.integration || response.data;
}

/**
 * Get single integration details scoped to organization (credentials masked/omitted).
 * GET /api/v1/integrations/{id}
 */
export async function getIntegrationByIdApi(
  id: string
): Promise<IntegrationInstance> {
  const response = await api.get(`/api/v1/integrations/${encodeURIComponent(id)}`);
  return response.data?.data || response.data?.integration || response.data;
}

/**
 * Update configuration, status, display name, or credentials of an integration.
 * PATCH /api/v1/integrations/{id}
 */
export async function updateIntegrationApi(
  id: string,
  payload: UpdateIntegrationPayload
): Promise<IntegrationInstance> {
  const response = await api.patch(
    `/api/v1/integrations/${encodeURIComponent(id)}`,
    payload
  );
  return response.data?.data || response.data?.integration || response.data;
}

/**
 * Disconnect and remove an integration instance.
 * DELETE /api/v1/integrations/{id}
 */
export async function deleteIntegrationApi(
  id: string
): Promise<{ success: boolean; message?: string }> {
  const response = await api.delete(`/api/v1/integrations/${encodeURIComponent(id)}`);
  return response.data;
}

/**
 * Initiate connection or generate OAuth authorization URL for a connector.
 * POST /api/v1/integrations/{provider}/connect
 */
export async function connectOAuthApi(
  provider: string,
  payload?: Record<string, any>
): Promise<OAuthConnectResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(provider)}/connect`,
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
 * GET /api/v1/integrations/{provider}/callback
 */
export async function callbackOAuthApi(
  provider: string,
  params: Record<string, string | string[] | undefined>
): Promise<any> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(provider)}/callback`,
    { params }
  );
  return response.data;
}

/**
 * Reconnect an integration and re-encrypt updated credentials in the vault.
 * POST /api/v1/integrations/{id}/reconnect
 */
export async function reconnectIntegrationApi(
  id: string,
  payload?: ReconnectPayload | Record<string, any>
): Promise<ReconnectResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/reconnect`,
    payload || {}
  );
  return response.data;
}

/**
 * Rotate and encrypt credentials in the vault for an integration.
 * POST /api/v1/integrations/{id}/rotate-credentials
 */
export async function rotateCredentialsApi(
  id: string,
  payload: RotateCredentialsPayload
): Promise<RotateCredentialsResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/rotate-credentials`,
    payload
  );
  return response.data;
}

/**
 * Trigger manual synchronization run for an integration.
 * POST /api/v1/integrations/{id}/sync
 */
export async function triggerSyncApi(id: string): Promise<SyncResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync`
  );
  return response.data;
}

/**
 * Normalizes raw schema discovery responses into standard DiscoveredSchemaResponse
 */
function normalizeSchemaResponse(data: any): DiscoveredSchemaResponse {
  if (!data) {
    return { entities: [] };
  }
  if (Array.isArray(data)) {
    return { entities: data, recordCount: data.length };
  }
  const payload =
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data) &&
    (data.data.entities || data.data.fields || data.data.schema)
      ? data.data
      : data;

  const rawEntities: DiscoveredEntity[] =
    Array.isArray(payload?.entities) && payload.entities.length > 0
      ? payload.entities
      : Array.isArray(payload?.fields) && payload.fields.length > 0
      ? [
          {
            name: payload.name || payload.provider || "DefaultEntity",
            label: payload.label || payload.name || "Entity",
            fields: payload.fields,
            recordCount: payload.recordCount ?? payload.totalRecords,
            pagination: payload.pagination,
            sampleRecords:
              payload.sampleRecords ?? payload.sampleData ?? payload.records,
          },
        ]
      : [];

  return {
    ...payload,
    entities: rawEntities,
    fields: payload.fields,
    recordCount: payload.recordCount ?? payload.totalRecords ?? payload.total,
    pagination: payload.pagination,
    sampleRecords:
      payload.sampleRecords ?? payload.sampleData ?? payload.records,
    sampledAt: payload.sampledAt ?? payload.discoveredAt,
  };
}

/**
 * Discover schema, entities, and fields available from a connected integration.
 * GET /api/v1/integrations/{id}/schema
 */
export async function getIntegrationSchemaApi(
  id: string
): Promise<DiscoveredSchemaResponse> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/schema`
  );
  return normalizeSchemaResponse(response.data);
}

/**
 * Discover and infer schema from live connection or sample payload.
 * POST /api/integrations/{id}/schema/discover
 */
export async function discoverIntegrationSchemaApi(
  id: string,
  payload?: DiscoverSchemaPayload | Record<string, any>
): Promise<DiscoveredSchemaResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/schema/discover`,
    payload || {}
  );
  return normalizeSchemaResponse(response.data);
}

/**
 * Retrieve saved field mappings for an integration.
 * GET /api/integrations/{id}/schema/mapping
 */
export async function getSchemaMappingApi(
  id: string
): Promise<SchemaMappingResponse> {
  const response = await api.get(
    `/api/integrations/${encodeURIComponent(id)}/schema/mapping`
  );
  const data = response.data;
  if (!data) {
    return { mappings: [] };
  }
  if (Array.isArray(data)) {
    return { mappings: data };
  }
  const payload = data.data || data;
  if (Array.isArray(payload)) {
    return { mappings: payload };
  }
  return {
    ...payload,
    mappings: Array.isArray(payload.mappings) ? payload.mappings : [],
  };
}

/**
 * Save or upsert field mappings for an integration.
 * POST /api/integrations/{id}/schema/mapping
 */
export async function saveSchemaMappingApi(
  id: string,
  payload: SchemaMappingPayload
): Promise<SchemaMappingResponse> {
  const response = await api.post(
    `/api/integrations/${encodeURIComponent(id)}/schema/mapping`,
    payload
  );
  const data = response.data;
  const resPayload = data?.data || data;
  return {
    ...resPayload,
    mappings: Array.isArray(resPayload?.mappings) ? resPayload.mappings : payload.mappings,
  };
}


/**
 * Test live connectivity, authentication, and credentials against external provider.
 * POST /api/v1/integrations/{id}/test
 */
export async function testIntegrationConnectionApi(
  id: string,
  payload?: Record<string, any>
): Promise<TestConnectionResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/test`,
    payload || {}
  );
  const data = response.data;
  if (data && typeof data === "object") {
    if (data.data && typeof data.data === "object") {
      const isSuccess = data.data.success ?? data.success ?? (response.status >= 200 && response.status < 300);
      return {
        ...data.data,
        success: isSuccess,
        statusCode: data.data.statusCode ?? data.data.httpStatus ?? data.statusCode ?? (isSuccess ? response.status : undefined),
      };
    }
    const isSuccess = data.success ?? (response.status >= 200 && response.status < 300);
    return {
      ...data,
      success: isSuccess,
      statusCode: data.statusCode ?? data.httpStatus ?? (isSuccess ? response.status : undefined),
    };
  }
  const isSuccess = response.status >= 200 && response.status < 300;
  return {
    success: isSuccess,
    statusCode: isSuccess ? response.status : undefined,
  };
}

/**
 * Pause synchronization for an integration.
 * POST /api/v1/integrations/{id}/pause
 */
export async function pauseIntegrationApi(
  id: string
): Promise<StatusToggleResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/pause`
  );
  return response.data;
}

/**
 * Resume synchronization for an integration.
 * POST /api/v1/integrations/{id}/resume
 */
export async function resumeIntegrationApi(
  id: string
): Promise<StatusToggleResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/resume`
  );
  return response.data;
}
