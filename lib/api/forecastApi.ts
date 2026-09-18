// lib/api/forecastApi.ts
// Network calls for Forecast rollups, snapshots, and deal forecast details based on BE-2 Swagger specifications.
// Supports both /api/deals/... and /deals/... routes with automatic fallback.

import api from "@/lib/api/api";
import {
  ForecastRollupResponse,
  ForecastSnapshot,
  DealForecastResponse,
  ForecastFilterParams,
} from "@/types/forecast";

function extractData<T>(raw: any): T {
  if (raw && typeof raw === "object") {
    if (raw.data !== undefined) return raw.data as T;
    if (raw.forecast !== undefined) return raw.forecast as T;
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
 * Get current organization forecast rollups with multi-currency conversion
 * GET /deals/forecast (or /api/deals/forecast)
 */
export async function fetchForecastRollups(
  filters?: ForecastFilterParams
): Promise<ForecastRollupResponse> {
  const params: Record<string, any> = {};
  if (filters?.reportingCurrency) params.reportingCurrency = filters.reportingCurrency;
  if (filters?.asOfDate) params.asOfDate = filters.asOfDate;

  const data = await apiGetFallback<any>(
    "/api/deals/forecast",
    "/deals/forecast",
    params
  );
  return extractData<ForecastRollupResponse>(data);
}

/**
 * Get historical forecast snapshots with preserved exchange rates and converted amounts
 * GET /deals/forecast/snapshots (or /api/deals/forecast/snapshots)
 */
export async function fetchForecastSnapshots(
  limit: number = 50
): Promise<ForecastSnapshot[]> {
  const data = await apiGetFallback<any>(
    "/api/deals/forecast/snapshots",
    "/deals/forecast/snapshots",
    { limit }
  );

  if (Array.isArray(data)) return data;
  const extracted = extractData<any>(data);
  if (Array.isArray(extracted)) return extracted;
  if (Array.isArray(extracted?.snapshots)) return extracted.snapshots;
  return [];
}

/**
 * Get selected deal forecast details, aging, stage velocity, and slippage
 * GET /deals/:id/forecast (or /api/deals/:id/forecast)
 */
export async function fetchDealForecast(
  dealId: string,
  params?: { reportingCurrency?: string; asOfDate?: string }
): Promise<DealForecastResponse> {
  const query: Record<string, any> = {};
  if (params?.reportingCurrency) query.reportingCurrency = params.reportingCurrency;
  if (params?.asOfDate) query.asOfDate = params.asOfDate;

  const data = await apiGetFallback<any>(
    `/api/deals/${dealId}/forecast`,
    `/deals/${dealId}/forecast`,
    query
  );
  return extractData<DealForecastResponse>(data);
}
