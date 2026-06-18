// types/deals.ts
// Reflects the exact shape returned by GET /analytics/conversion/scores

export interface Deal {
  dealId: string;
  externalId: string | null;
  name: string;
  stage: string;
  amount: number;
  conversionProbability: number;
  owner?: string;
  companyName?: string;
  closeDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  leadId?: string;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: "CREATED" | "ASSIGNED" | "UPDATED" | "STAGE_CHANGED" | "NOTE_ADDED";
  description: string;
  createdAt: string;
  createdBy?: string;
}

export interface DealNote {
  id: string;
  dealId: string;
  content: string;
  createdAt: string;
  createdBy?: string;
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

export const DEFAULT_DEAL_STAGES = [
    "NEW",
    "HOT",
    "WARM",
    "WON",
    "LOST",
    "DEAD",
] as const;

// Use a flexible type for DealStage to allow any string
export type DealStage = string;

// Stage configuration interface (actual config is in lib/dealConfig.ts)
export interface StageConfigEntry {
  label: string;
  color: string;
  borderColor: string;
  icon?: React.ReactNode;
}
