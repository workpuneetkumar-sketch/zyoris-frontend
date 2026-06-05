// lib/api/dealsApi.ts
// Wraps the deals-related backend endpoints.
//
// Endpoints confirmed against deployed Swagger at https://zyoris.onrender.com/docs
// Section: Deals  — /api/deals/*
// Section: Analytics — /analytics/conversion/scores  (still used for deal list)

import api from "@/lib/api/api";
import { Deal, DealStage } from "@/types/deals";

interface BackendDeal {
  id: string;
  organizationId?: string;
  externalId: string | null;
  sourceSystem: string;
  name: string;
  stage: string;
  amount: number;
  currency: string;
  closeDate?: string | null;
  owner?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all deals for the authenticated user's organisation.
 * Swagger: GET /analytics/conversion/scores
 */
export async function fetchDeals(): Promise<Deal[]> {
  const res = await api.get<Deal[]>("/analytics/conversion/scores");
  return res.data;
}

/**
 * Map backend deal shape to frontend Deal interface.
 */
function mapBackendDeal(backendDeal: BackendDeal): Deal {
  return {
    dealId: backendDeal.id,
    externalId: backendDeal.externalId,
    name: backendDeal.name,
    stage: backendDeal.stage,
    amount: backendDeal.amount,
    conversionProbability: 0.5,
    owner: backendDeal.owner || undefined,
    closeDate: backendDeal.closeDate,
    createdAt: backendDeal.createdAt,
    updatedAt: backendDeal.updatedAt,
  };
}

/**
 * Fetch a single deal by ID.
 * Swagger: GET /api/deals/get-deal/{id}
 */
export async function fetchDealById(dealId: string): Promise<Deal> {
  const res = await api.get<BackendDeal>(`/api/deals/get-deal/${dealId}`);
  return mapBackendDeal(res.data);
}

/**
 * Update a deal (stage, etc.).
 * Swagger: PATCH /api/deals/update-deal/{id}
 */
export async function updateDealStage(
  dealId: string,
  stage: DealStage | string
): Promise<Deal> {
  const res = await api.patch<BackendDeal>(`/api/deals/update-deal/${dealId}`, {
    stage,
  });
  return mapBackendDeal(res.data);
}
