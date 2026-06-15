// lib/api/marketingApi.ts

import api from "@/lib/api/api"; // Pre‑configured Axios instance
import { AxiosResponse } from "axios";

// ── Types ────────────────────────────────────────────────

export type CampaignChannel = "Facebook" | "Google Ads" | "LinkedIn" | "Twitter" | "Email" | "Other";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  budget: number;
  spent?: number;
  channel: CampaignChannel;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  budget: number;
  channel: CampaignChannel;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: CampaignStatus;
}

export type UpdateCampaignPayload = Partial<CreateCampaignPayload>;

export interface PerformanceData {
  date?: string;
  spend?: number;
  budget?: number;
  remaining?: number;
}

// ── Helper ──────────────────────────────────────────────

function extractData<T>(res: AxiosResponse<any>): T {
  if (res.data?.data) return res.data.data as T;
  return res.data as T;
}

// ── API Methods ─────────────────────────────────────────

export async function getCampaigns(): Promise<Campaign[]> {
  const res = await api.get("/marketing/campaigns");
  const data = extractData<Campaign[]>(res);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'campaigns' in data) {
    return (data as any).campaigns;
  }
  return [];
}

export async function getCampaignById(id: string): Promise<Campaign> {
  const res = await api.get(`/marketing/campaigns/${id}`);
  return extractData<Campaign>(res);
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const res = await api.post("/marketing/campaigns/create", payload);
  return extractData<Campaign>(res);
}

export async function updateCampaign(
  id: string,
  payload: UpdateCampaignPayload
): Promise<Campaign> {
  const res = await api.patch(`/marketing/campaigns/${id}`, payload);
  return extractData<Campaign>(res);
}

export async function deleteCampaign(id: string): Promise<void> {
  await api.delete(`/marketing/campaigns/${id}`);
}

export async function getCampaignPerformance(id: string): Promise<PerformanceData[]> {
  const res = await api.get(`/marketing/campaigns/${id}/performance`);
  const data = extractData<PerformanceData[]>(res);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'performance' in data) {
    return (data as any).performance;
  }
  return [];
}