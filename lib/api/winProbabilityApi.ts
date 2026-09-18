// lib/api/winProbabilityApi.ts
// Network calls for Win Probability and Prediction Snapshots based on BE-2 Swagger specifications.
// Supports both /api/deals/... and /deals/... routes with automatic fallback.

import api from "@/lib/api/api";
import {
  WinProbabilityResponse,
  WinProbabilitySnapshotsResponse,
} from "@/types/winProbability";

function extractData<T>(raw: any): T {
  if (raw && typeof raw === "object") {
    if (raw.data !== undefined) return raw.data as T;
    if (raw.probabilityDetails !== undefined) return raw.probabilityDetails as T;
  }
  return raw as T;
}

async function apiGetFallback<T>(path1: string, path2: string, params?: Record<string, any>): Promise<T> {
  try {
    const res = await api.get(path1, { params });
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res = await api.get(path2, { params });
      return res.data;
    }
    throw err;
  }
}

/**
 * Get deal win probability, confidence, model version, and historical factor evidence
 * GET /deals/:id/win-probability (or /api/deals/:id/win-probability)
 */
export async function fetchDealWinProbability(
  dealId: string,
  asOfDate?: string
): Promise<WinProbabilityResponse> {
  const params: Record<string, any> = {};
  if (asOfDate) params.asOfDate = asOfDate;

  const data = await apiGetFallback<any>(
    `/api/deals/${dealId}/win-probability`,
    `/deals/${dealId}/win-probability`,
    params
  );
  return extractData<WinProbabilityResponse>(data);
}

/**
 * Get historical win probability prediction snapshots for a deal
 * GET /deals/:id/win-probability/snapshots (or /api/deals/:id/win-probability/snapshots)
 */
export async function fetchDealWinProbabilitySnapshots(
  dealId: string,
  limit: number = 50
): Promise<WinProbabilitySnapshotsResponse> {
  const data = await apiGetFallback<any>(
    `/api/deals/${dealId}/win-probability/snapshots`,
    `/deals/${dealId}/win-probability/snapshots`,
    { limit }
  );

  // Normalize if backend returned a plain array or { snapshots: [...] }
  if (Array.isArray(data)) {
    return {
      dealId,
      count: data.length,
      snapshots: data,
    };
  }

  const extracted = extractData<any>(data);
  if (Array.isArray(extracted)) {
    return {
      dealId,
      count: extracted.length,
      snapshots: extracted,
    };
  }

  return {
    dealId: extracted.dealId || dealId,
    count: typeof extracted.count === "number" ? extracted.count : (extracted.snapshots?.length || 0),
    snapshots: extracted.snapshots || [],
  };
}
