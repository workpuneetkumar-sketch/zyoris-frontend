// types/deals.ts
// Reflects the exact shape returned by GET /analytics/conversion/scores

export interface Deal {
  dealId: string;
  externalId: string | null;
  name: string;
  stage: string;
  amount: number;
  conversionProbability: number;
}

export interface DealsFilters {
  search: string;
  stage: string;
  owner: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_DEALS_FILTERS: DealsFilters = {
  search: "",
  stage: "All Stages",
  owner: "All Owners",
  dateFrom: "",
  dateTo: "",
};

export const DEAL_STAGES = [
  "Qualification",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];
