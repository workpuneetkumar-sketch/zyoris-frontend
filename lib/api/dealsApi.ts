// lib/api/dealsApi.ts
// Wraps the deals-related backend endpoints.
// GET /analytics/conversion/scores  → returns Deal[] (all deals for the org)
// GET /deals/:id                    → gets a single deal
// PATCH /deals/update-deal/:id      → updates a deal's stage

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
 * Endpoint: GET /analytics/conversion/scores
 */
export async function fetchDeals(): Promise<Deal[]> {
  const res = await api.get<Deal[]>("/analytics/conversion/scores");
  return res.data;
}

/**
 * Map backend deal to frontend deal interface
 */
function mapBackendDeal(backendDeal: BackendDeal): Deal {
  return {
    dealId: backendDeal.id,
    externalId: backendDeal.externalId,
    name: backendDeal.name,
    stage: backendDeal.stage,
    amount: backendDeal.amount,
    conversionProbability: 0.5, // Default value, can be computed from analytics
    owner: backendDeal.owner || undefined,
    closeDate: backendDeal.closeDate,
    createdAt: backendDeal.createdAt,
    updatedAt: backendDeal.updatedAt,
  };
}

/**
 * Fetch a single deal by ID.
 * Endpoint: GET /deals/:id
 */
export async function fetchDealById(dealId: string): Promise<Deal> {
  const res = await api.get<BackendDeal>(`/deals/${dealId}`);
  return mapBackendDeal(res.data);
}

/**
 * Update a deal's stage.
 * Endpoint: PATCH /deals/update-deal/:id
 */
export async function updateDealStage(
  dealId: string,
  stage: DealStage | string
): Promise<Deal> {
  const res = await api.patch<BackendDeal>(`/deals/update-deal/${dealId}`, {
    stage,
  });
  return mapBackendDeal(res.data);
}
