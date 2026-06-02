// lib/api/dealsApi.ts
// Wraps the deals-related backend endpoints.
// GET /analytics/conversion/scores  → returns Deal[] (all deals for the org)

import api from "@/lib/api/api";
import { Deal } from "@/types/deals";

/**
 * Fetch all deals for the authenticated user's organisation.
 * Endpoint: GET /analytics/conversion/scores
 */
export async function fetchDeals(): Promise<Deal[]> {
  const res = await api.get<Deal[]>("/analytics/conversion/scores");
  return res.data;
}
