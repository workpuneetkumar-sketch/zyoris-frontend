import api from "@/lib/api/api";
export * from "./webhooksApi";
import {
  Connector,
  IntegrationInstance,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
  TestConnectionResponse,
  OAuthConnectResponse,
  DiscoveredSchemaResponse,
  DiscoveredEntity,
  DiscoveredField,
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
  IntegrationMapping,
  CreateMappingRequest,
  UpdateMappingRequest,
  MappingListResponse,
  PreviewTransformationPayload,
  PreviewTransformationResponse,
  SyncRun,
  SyncRunListResponse,
  SyncRunResponse,
  SyncErrorItem,
  SyncErrorListResponse,
  SyncErrorDetailResponse,
  RetrySyncErrorResponse,
  AllIntegrationsDashboardResponse,
  IntegrationDashboardResponse,
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
 * Trigger manual synchronization run for an integration or provider.
 * POST /integrations/{id}/sync (e.g. POST /integrations/hubspot/sync for Day 5 API)
 */
export async function triggerSyncApi(id: string): Promise<SyncResponse> {
  try {
    const response = await api.post(
      `/integrations/${encodeURIComponent(id)}/sync`
    );
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const fallback = await api.post(
        `/api/v1/integrations/${encodeURIComponent(id)}/sync`
      );
      return fallback.data;
    }
    throw err;
  }
}

/**
 * Explicit Day 5 HubSpot sync API endpoint.
 * POST /integrations/hubspot/sync
 */
export async function syncHubSpotApi(): Promise<SyncResponse> {
  const response = await api.post("/integrations/hubspot/sync");
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
            name: payload.name || "DefaultEntity",
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
 * GET /integrations/{id}/schema
 */
export async function getIntegrationSchemaApi(
  id: string
): Promise<DiscoveredSchemaResponse> {
  try {
    const response = await api.get(
      `/integrations/${encodeURIComponent(id)}/schema`
    );
    return normalizeSchemaResponse(response.data);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const fallback = await api.get(
        `/api/v1/integrations/${encodeURIComponent(id)}/schema`
      );
      return normalizeSchemaResponse(fallback.data);
    }
    throw err;
  }
}

/**
 * Discover and infer schema from live connection or sample payload.
 * POST /integrations/{id}/schema/discover (with fallback to GET /integrations/{id}/schema)
 */
export async function discoverIntegrationSchemaApi(
  id: string,
  payload?: DiscoverSchemaPayload | Record<string, any>
): Promise<DiscoveredSchemaResponse> {
  try {
    const response = await api.post(
      `/integrations/${encodeURIComponent(id)}/schema/discover`,
      payload || {}
    );
    return normalizeSchemaResponse(response.data);
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      return await getIntegrationSchemaApi(id);
    }
    throw err;
  }
}

/**
 * Retrieve saved field mappings for an integration.
 * GET /integrations/{id}/schema/mapping
 */
export async function getSchemaMappingApi(
  id: string
): Promise<SchemaMappingResponse> {
  try {
    const response = await api.get(
      `/integrations/${encodeURIComponent(id)}/schema/mapping`
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
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const fallback = await api.get(
        `/api/v1/integrations/${encodeURIComponent(id)}/mappings`
      );
      const data = fallback.data;
      const list = Array.isArray(data) ? data : data?.mappings || data?.data || [];
      return { mappings: list };
    }
    throw err;
  }
}

/**
 * Save or upsert field mappings for an integration.
 * POST /integrations/{id}/schema/mapping
 */
export async function saveSchemaMappingApi(
  id: string,
  payload: SchemaMappingPayload
): Promise<SchemaMappingResponse> {
  const response = await api.post(
    `/integrations/${encodeURIComponent(id)}/schema/mapping`,
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

/**
 * List all configured field mappings for an integration.
 * GET /api/v1/integrations/{id}/mappings
 */
export async function getIntegrationMappingsApi(
  id: string,
  params?: {
    sourceEntity?: string;
    targetEntity?: string;
    status?: string;
  }
): Promise<IntegrationMapping[]> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/mappings`,
    { params }
  );
  const data = response.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.mappings)) {
    return data.mappings;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

/**
 * Create a new field mapping for an integration.
 * POST /api/v1/integrations/{id}/mappings
 */
export async function createIntegrationMappingApi(
  id: string,
  payload: CreateMappingRequest
): Promise<IntegrationMapping> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/mappings`,
    payload
  );
  return response.data?.mapping || response.data?.data || response.data;
}

/**
 * Get single field mapping by ID.
 * GET /api/v1/integrations/{id}/mappings/{mappingId}
 */
export async function getIntegrationMappingByIdApi(
  id: string,
  mappingId: string
): Promise<IntegrationMapping> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}`
  );
  return response.data?.mapping || response.data?.data || response.data;
}

/**
 * Update an existing field mapping.
 * PATCH /api/v1/integrations/{id}/mappings/{mappingId}
 */
export async function updateIntegrationMappingApi(
  id: string,
  mappingId: string,
  payload: UpdateMappingRequest
): Promise<IntegrationMapping> {
  const response = await api.patch(
    `/api/v1/integrations/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}`,
    payload
  );
  return response.data?.mapping || response.data?.data || response.data;
}

/**
 * Delete a field mapping.
 * DELETE /api/v1/integrations/{id}/mappings/{mappingId}
 */
export async function deleteIntegrationMappingApi(
  id: string,
  mappingId: string
): Promise<{ success: boolean; message?: string }> {
  const response = await api.delete(
    `/api/v1/integrations/${encodeURIComponent(id)}/mappings/${encodeURIComponent(mappingId)}`
  );
  return response.data;
}

/**
 * Preview transformation execution on sample input value.
 * POST /api/v1/integrations/{id}/mappings/preview
 */
export async function previewTransformationApi(
  id: string,
  payload: PreviewTransformationPayload
): Promise<PreviewTransformationResponse> {
  try {
    const response = await api.post(
      `/api/v1/integrations/${encodeURIComponent(id)}/mappings/preview`,
      payload
    );
    return response.data;
  } catch (err: any) {
    // If 404 on /api/v1, try fallback route /integrations/{id}/transform/preview
    if (err?.response?.status === 404) {
      const fallbackResponse = await api.post(
        `/integrations/${encodeURIComponent(id)}/transform/preview`,
        payload
      );
      return fallbackResponse.data;
    }
    throw err;
  }
}

/**
 * List sync runs for an integration with filtering and pagination.
 * GET /api/v1/integrations/{id}/sync-runs
 */
export async function getSyncRunsApi(
  id: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
  }
): Promise<SyncRunListResponse> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync-runs`,
    { params }
  );
  const data = response.data;
  if (Array.isArray(data)) {
    return { data, total: data.length, page: params?.page || 1, limit: params?.limit || 20 };
  }
  if (Array.isArray(data?.data)) {
    return {
      data: data.data,
      total: data.total ?? data.data.length,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit ?? 20,
      totalPages: data.totalPages,
    };
  }
  if (Array.isArray(data?.runs)) {
    return {
      data: data.runs,
      total: data.total ?? data.runs.length,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit ?? 20,
      totalPages: data.totalPages,
    };
  }
  return { data: [], total: 0, page: 1, limit: 20 };
}

/**
 * Get detailed information for a specific sync run.
 * GET /api/v1/integrations/{id}/sync-runs/{runId}
 */
export async function getSyncRunByIdApi(
  id: string,
  runId: string
): Promise<SyncRun> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync-runs/${encodeURIComponent(runId)}`
  );
  return response.data?.data || response.data?.run || response.data;
}

/**
 * Cancel an ongoing sync run.
 * POST /api/v1/integrations/{id}/sync-runs/{runId}/cancel
 */
export async function cancelSyncRunApi(
  id: string,
  runId: string
): Promise<{ success: boolean; message?: string }> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync-runs/${encodeURIComponent(runId)}/cancel`
  );
  return response.data;
}

/**
 * Start an integration background sync job via BullMQ worker.
 * Day 10 Endpoint: POST /integrations/{id}/sync/start
 * Fallbacks: POST /api/v1/integrations/{id}/sync/start, POST /api/v1/integrations/{id}/sync
 */
export async function startIntegrationSyncJobApi(
  id: string,
  payload?: { entityType?: string }
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    jobId?: string;
    integrationId?: string;
    entityType?: string;
  };
}> {
  try {
    const response = await api.post(
      `/integrations/${encodeURIComponent(id)}/sync/start`,
      payload || { entityType: "contacts" }
    );
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const fallback1 = await api.post(
          `/api/v1/integrations/${encodeURIComponent(id)}/sync/start`,
          payload || { entityType: "contacts" }
        );
        return fallback1.data;
      } catch (fErr: any) {
        if (fErr?.response?.status === 404) {
          const fallback2 = await api.post(
            `/api/v1/integrations/${encodeURIComponent(id)}/sync`,
            payload || {}
          );
          return fallback2.data;
        }
        throw fErr;
      }
    }
    throw err;
  }
}

/**
 * Pre-flight connection test — validate credentials without saving.
 * POST /api/integrations/test-connection
 */
export async function testPreflightConnectionApi(
  payload: import("@/types/integrations").PreflightTestPayload
): Promise<import("@/types/integrations").PreflightTestResponse> {
  try {
    const response = await api.post("/api/integrations/test-connection", payload);
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      // Fallback route without /api prefix
      const fallback = await api.post("/integrations/test-connection", payload);
      return fallback.data;
    }
    throw err;
  }
}

/**
 * List sync run history logs for production monitoring.
 * GET /integrations/logs
 */
export async function getIntegrationLogsApi(
  query?: import("@/types/integrations").SyncLogsQuery
): Promise<import("@/types/integrations").SyncLogsResponse> {
  const response = await api.get("/integrations/logs", { params: query });
  return response.data;
}

/**
 * List sync error records for production monitoring and root cause analysis.
 * GET /integrations/errors
 */
export async function getIntegrationErrorsApi(
  query?: import("@/types/integrations").SyncErrorsQuery
): Promise<import("@/types/integrations").SyncErrorsResponse> {
  const response = await api.get("/integrations/errors", { params: query });
  return response.data;
}

/**
 * Get aggregate dashboard statistics for production monitoring.
 * GET /integrations/stats
 */
export async function getIntegrationStatsApi(
  integrationId?: string
): Promise<import("@/types/integrations").IntegrationMonitoringStatsResponse> {
  const response = await api.get("/integrations/stats", {
    params: integrationId ? { integrationId } : undefined,
  });
  return response.data;
}

/**
 * List record-level sync errors for a specific run.
 * GET /api/v1/integrations/{id}/sync-runs/{runId}/errors
 */
export async function getSyncRunErrorsApi(
  id: string,
  runId: string,
  params?: {
    retryable?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<SyncErrorListResponse> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync-runs/${encodeURIComponent(runId)}/errors`,
    { params }
  );
  const data = response.data;
  if (Array.isArray(data)) {
    return { data, total: data.length, page: params?.page || 1, limit: params?.limit || 20 };
  }
  if (Array.isArray(data?.data)) {
    return {
      data: data.data,
      total: data.total ?? data.data.length,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit ?? 20,
      totalPages: data.totalPages,
    };
  }
  if (Array.isArray(data?.errors)) {
    return {
      data: data.errors,
      total: data.total ?? data.errors.length,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit ?? 20,
      totalPages: data.totalPages,
    };
  }
  return { data: [], total: 0, page: 1, limit: 20 };
}

/**
 * List all sync errors across an integration.
 * GET /api/v1/integrations/{id}/sync-errors
 */
export async function getIntegrationSyncErrorsApi(
  id: string,
  params?: {
    retryable?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<SyncErrorListResponse> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync-errors`,
    { params }
  );
  const data = response.data;
  if (Array.isArray(data)) {
    return { data, total: data.length, page: params?.page || 1, limit: params?.limit || 20 };
  }
  if (Array.isArray(data?.data)) {
    return {
      data: data.data,
      total: data.total ?? data.data.length,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit ?? 20,
      totalPages: data.totalPages,
    };
  }
  if (Array.isArray(data?.errors)) {
    return {
      data: data.errors,
      total: data.total ?? data.errors.length,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit ?? 20,
      totalPages: data.totalPages,
    };
  }
  return { data: [], total: 0, page: 1, limit: 20 };
}

/**
 * Retrieve detail of a specific sync error with retryability classification.
 * GET /api/v1/integrations/{id}/sync-errors/{errorId}
 */
export async function getSyncErrorByIdApi(
  id: string,
  errorId: string
): Promise<SyncErrorDetailResponse | SyncErrorItem> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync-errors/${encodeURIComponent(errorId)}`
  );
  return response.data?.data || response.data?.error || response.data;
}

/**
 * Retry a sync error with strict backend retryability verification.
 * POST /api/v1/integrations/{id}/sync-errors/{errorId}/retry
 */
export async function retrySyncErrorApi(
  id: string,
  errorId: string
): Promise<RetrySyncErrorResponse> {
  const response = await api.post(
    `/api/v1/integrations/${encodeURIComponent(id)}/sync-errors/${encodeURIComponent(errorId)}/retry`
  );
  return response.data;
}

/**
 * Retrieve organization-wide integration health and aggregate sync counters.
 * GET /api/v1/integrations/dashboard
 */
export async function getIntegrationsDashboardApi(): Promise<AllIntegrationsDashboardResponse> {
  const response = await api.get("/api/v1/integrations/dashboard");
  return response.data?.data || response.data;
}

/**
 * Retrieve health, aggregate counters, and recent history for an integration.
 * GET /api/v1/integrations/{id}/dashboard
 */
export async function getIntegrationDashboardByIdApi(
  id: string
): Promise<IntegrationDashboardResponse> {
  const response = await api.get(
    `/api/v1/integrations/${encodeURIComponent(id)}/dashboard`
  );
  return response.data?.data || response.data;
}



