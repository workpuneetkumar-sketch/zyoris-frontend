// lib/api/savedViewsApi.ts
// Saved Views API calls (Task 4).
//
// Swagger endpoints:
//   POST   /leads/views           — create a saved view
//   GET    /leads/views           — list all saved views
//   PUT    /leads/views/{viewId}  — rename / update a saved view
//   DELETE /leads/views/{viewId}  — delete a saved view
//   GET    /leads/views/{viewId}/apply — apply a saved view (returns filtered leads)

import api from "@/lib/api/api";
import {
  SavedView,
  SavedViewsResponse,
  CreateSavedViewPayload,
  UpdateSavedViewPayload,
} from "@/types/savedViews";
import { Lead, LeadsResponse } from "@/types/leads";

// ── GET /leads/views ──────────────────────────────────────────────────────────

export async function fetchSavedViews(): Promise<SavedViewsResponse> {
  const res = await api.get<SavedViewsResponse | SavedView[]>("/leads/views");
  const raw = res.data;
  if (Array.isArray(raw)) {
    return { views: raw, total: raw.length };
  }
  return {
    views: Array.isArray(raw?.views) ? raw.views : [],
    total: typeof raw?.total === "number" ? raw.total : 0,
  };
}

// ── POST /leads/views ─────────────────────────────────────────────────────────

export async function createSavedView(payload: CreateSavedViewPayload): Promise<SavedView> {
  const res = await api.post<SavedView>("/leads/views", payload);
  return res.data;
}

// ── PUT /leads/views/{viewId} ─────────────────────────────────────────────────

export async function updateSavedView(
  viewId: string,
  payload: UpdateSavedViewPayload
): Promise<SavedView> {
  const res = await api.put<SavedView>(`/leads/views/${viewId}`, payload);
  return res.data;
}

// ── DELETE /leads/views/{viewId} ──────────────────────────────────────────────

export async function deleteSavedView(viewId: string): Promise<void> {
  await api.delete(`/leads/views/${viewId}`);
}

// ── GET /leads/views/{viewId}/apply ──────────────────────────────────────────

export async function applySavedView(viewId: string): Promise<LeadsResponse> {
  const res = await api.get(`/leads/views/${viewId}/apply`);
  const raw = res.data;
  if (Array.isArray(raw)) {
    return { leads: raw as Lead[], total: raw.length };
  }
  return {
    leads: Array.isArray(raw?.leads) ? raw.leads : Array.isArray(raw?.data) ? raw.data : [],
    total: raw?.total ?? 0,
  };
}

// ── GET /leads/filter ─────────────────────────────────────────────────────────

export interface LeadsFilterParams {
  status?: string;
  source?: string;
  owner?: string;
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function filterLeads(params: LeadsFilterParams): Promise<LeadsResponse> {
  const cleanParams: Record<string, string> = {};
  if (params.status && params.status !== "All Status") cleanParams.status = params.status;
  if (params.source && params.source !== "All Sources") cleanParams.source = params.source;
  if (params.owner && params.owner !== "All Owners") cleanParams.owner = params.owner;
  if (params.search) cleanParams.search = params.search;
  if (params.dateFrom) cleanParams.dateFrom = params.dateFrom;
  if (params.dateTo) cleanParams.dateTo = params.dateTo;
  if (params.sortBy) cleanParams.sortBy = params.sortBy;
  if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
  if (params.page) cleanParams.page = String(params.page);
  if (params.limit) cleanParams.limit = String(params.limit);
  if (params.tags && params.tags.length > 0) cleanParams.tags = params.tags.join(",");

  const res = await api.get("/leads/filter", { params: cleanParams });
  const raw = res.data;
  if (Array.isArray(raw)) {
    return { leads: raw as Lead[], total: raw.length };
  }
  return {
    leads: Array.isArray(raw?.leads)
      ? raw.leads
      : Array.isArray(raw?.data)
      ? raw.data
      : [],
    total: raw?.total ?? raw?.pagination?.total ?? 0,
  };
}

// ── GET /leads/search ─────────────────────────────────────────────────────────

export async function searchLeads(query: string): Promise<Lead[]> {
  const res = await api.get("/leads/search", { params: { q: query } });
  const raw = res.data;
  if (Array.isArray(raw)) return raw as Lead[];
  if (Array.isArray(raw?.leads)) return raw.leads;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}
