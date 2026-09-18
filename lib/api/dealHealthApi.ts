// lib/api/dealHealthApi.ts
// Network calls for Deal Health and Risk Intelligence based on verified BE-2 Swagger specifications.
// Supports both /api/deals/... and /deals/... routes with automatic fallback.

import api from "@/lib/api/api";
import {
  DealHealthResponse,
  DealRisk,
  ResolveRiskPayload,
  RiskDetectorConfig,
  DealRiskFilters,
  OrgRiskFilters,
} from "@/types/dealHealth";

function extractData<T>(raw: any): T {
  if (raw && typeof raw === "object") {
    if (raw.data !== undefined) return raw.data as T;
    if (raw.health !== undefined) return raw.health as T;
    if (raw.risks !== undefined) return raw.risks as T;
    if (raw.risk !== undefined) return raw.risk as T;
    if (raw.configs !== undefined) return raw.configs as T;
  }
  return raw as T;
}

// ── Fallback Helpers for /api/deals vs /deals ──────────────────────────────

async function apiGetFallback<T>(path1: string, path2: string): Promise<T> {
  try {
    const res = await api.get(path1);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res = await api.get(path2);
      return res.data;
    }
    throw err;
  }
}

async function apiPostFallback<T>(path1: string, path2: string, payload: any): Promise<T> {
  try {
    const res = await api.post(path1, payload);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res = await api.post(path2, payload);
      return res.data;
    }
    throw err;
  }
}

async function apiPatchFallback<T>(path1: string, path2: string, payload: any): Promise<T> {
  try {
    const res = await api.patch(path1, payload);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res = await api.patch(path2, payload);
      return res.data;
    }
    throw err;
  }
}

async function apiPutFallback<T>(path1: string, path2: string, payload: any): Promise<T> {
  try {
    const res = await api.put(path1, payload);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res = await api.put(path2, payload);
      return res.data;
    }
    throw err;
  }
}

// ── Deal Health Endpoints ───────────────────────────────────────────────────

/**
 * Get deal health score, status, factor breakdown, and active risks
 * GET /deals/:id/health (or /api/deals/:id/health)
 */
export async function fetchDealHealth(dealId: string): Promise<DealHealthResponse> {
  const data = await apiGetFallback<any>(
    `/api/deals/${dealId}/health`,
    `/deals/${dealId}/health`
  );
  return extractData<DealHealthResponse>(data);
}

/**
 * Force recalculation of deal health score and risk detection
 * POST /deals/:id/health/recalculate (or /api/deals/:id/health/recalculate)
 */
export async function recalculateDealHealth(
  dealId: string,
  asOfDate?: string
): Promise<DealHealthResponse> {
  const payload = asOfDate ? { asOfDate } : {};
  const data = await apiPostFallback<any>(
    `/api/deals/${dealId}/health/recalculate`,
    `/deals/${dealId}/health/recalculate`,
    payload
  );
  return extractData<DealHealthResponse>(data);
}

// ── Deal Risks Endpoints ────────────────────────────────────────────────────

/**
 * List risks for a specific deal with structured evidence
 * GET /deals/:id/risks (or /api/deals/:id/risks)
 */
export async function fetchDealRisks(
  dealId: string,
  filters?: DealRiskFilters
): Promise<DealRisk[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.append("severity", filters.severity);
  if (filters?.riskType) params.append("riskType", filters.riskType);
  if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));

  const qs = params.toString() ? `?${params.toString()}` : "";
  const data = await apiGetFallback<any>(
    `/api/deals/${dealId}/risks${qs}`,
    `/deals/${dealId}/risks${qs}`
  );
  const list = extractData<DealRisk[]>(data);
  return Array.isArray(list) ? list : [];
}

/**
 * Query deal risks across the organization with filtering and pagination
 * GET /deals/risks/all (or /api/deals/risks/all)
 */
export async function fetchOrganizationRisks(
  filters?: OrgRiskFilters
): Promise<{ risks: DealRisk[]; total?: number; page?: number }> {
  const params = new URLSearchParams();
  if (filters?.dealId) params.append("dealId", filters.dealId);
  if (filters?.riskType) params.append("riskType", filters.riskType);
  if (filters?.severity) params.append("severity", filters.severity);
  if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));
  if (filters?.from) params.append("from", filters.from);
  if (filters?.to) params.append("to", filters.to);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));

  const qs = params.toString() ? `?${params.toString()}` : "";
  const raw = await apiGetFallback<any>(
    `/api/deals/risks/all${qs}`,
    `/deals/risks/all${qs}`
  );
  const data = extractData<any>(raw);
  if (Array.isArray(data)) {
    return { risks: data, total: data.length };
  }
  return {
    risks: Array.isArray(data?.risks) ? data.risks : [],
    total: data?.total ?? (Array.isArray(data?.risks) ? data.risks.length : 0),
    page: data?.page ?? 1,
  };
}

/**
 * Get single risk details with structured evidence
 * GET /deals/risks/:riskId (or /api/deals/risks/:riskId)
 */
export async function fetchRiskById(riskId: string): Promise<DealRisk> {
  const data = await apiGetFallback<any>(
    `/api/deals/risks/${riskId}`,
    `/deals/risks/${riskId}`
  );
  return extractData<DealRisk>(data);
}

/**
 * Resolve a detected deal risk (Admin/Manager only, audited)
 * PATCH /deals/risks/:riskId/resolve (or /api/deals/risks/:riskId/resolve)
 */
export async function resolveRisk(
  riskId: string,
  payload: ResolveRiskPayload
): Promise<{ success?: boolean; message?: string; risk?: DealRisk }> {
  return await apiPatchFallback<any>(
    `/api/deals/risks/${riskId}/resolve`,
    `/deals/risks/${riskId}/resolve`,
    payload
  );
}

// ── Risk Detector Configuration Endpoints ───────────────────────────────────

/**
 * Get all risk detector configurations for the organization
 * GET /deals/risk-detectors/config (or /api/deals/risk-detectors/config)
 */
export async function fetchRiskDetectorConfig(): Promise<RiskDetectorConfig[]> {
  const data = await apiGetFallback<any>(
    "/api/deals/risk-detectors/config",
    "/deals/risk-detectors/config"
  );
  const list = extractData<RiskDetectorConfig[]>(data);
  return Array.isArray(list) ? list : [];
}

/**
 * Update risk detector configuration (Admin/Manager only, audited)
 * PUT /deals/risk-detectors/config/:detector (or /api/deals/risk-detectors/config/:detector)
 */
export async function updateRiskDetectorConfig(
  detector: string,
  payload: Partial<RiskDetectorConfig>
): Promise<RiskDetectorConfig> {
  const data = await apiPutFallback<any>(
    `/api/deals/risk-detectors/config/${detector}`,
    `/deals/risk-detectors/config/${detector}`,
    payload
  );
  return extractData<RiskDetectorConfig>(data);
}
