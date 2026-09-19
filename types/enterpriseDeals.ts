// types/enterpriseDeals.ts
// Strict OpenAPI contract definitions for BE-2 Day 5 & Day 6 enterprise deal capabilities

export type OpportunityType =
  | "NEW_BUSINESS"
  | "RENEWAL"
  | "EXPANSION"
  | "CROSS_SELL"
  | "UPSELL";

export const OPPORTUNITY_TYPES: { id: OpportunityType; label: string; description: string }[] = [
  {
    id: "NEW_BUSINESS",
    label: "New Business",
    description: "Net-new customer acquisition deal",
  },
  {
    id: "RENEWAL",
    label: "Renewal",
    description: "Contract renewal for existing customer subscription",
  },
  {
    id: "EXPANSION",
    label: "Expansion",
    description: "Adding seats, usage, or increased capacity to existing agreement",
  },
  {
    id: "CROSS_SELL",
    label: "Cross-Sell",
    description: "Selling an additional product module to existing customer",
  },
  {
    id: "UPSELL",
    label: "Upsell",
    description: "Upgrading tier or edition (e.g. Pro to Enterprise)",
  },
];

export interface SharedOwner {
  id?: string;
  dealId?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  splitPercentage: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSharedOwnerPayload {
  userId: string;
  role?: string;
  splitPercentage: number;
}

export interface EnterpriseDealRelationship {
  parentSubscriptionId?: string | null;
  subscriptionRelationship?: "PARENT" | "CHILD" | "ADDON" | "RENEWAL_OF" | string | null;
  productId?: string | null;
  productName?: string | null;
  channel?: "DIRECT" | "PARTNER" | "RESELLER" | "DISTRIBUTOR" | string;
  partnerId?: string | null;
  partnerName?: string | null;
  partnerSplitPercentage?: number | null;
  region?: string | null;
  legalEntity?: string | null;
  currency?: string | null;
}

// ── Manager Inspection Types (Day 6) ──────────────────────────────────────────

export interface ManagerInspectionDeal {
  id: string;
  dealId: string;
  name: string;
  amount: number;
  currency: string;
  stage: string;
  opportunityType?: OpportunityType | string;
  owner?: string | null;
  ownerId?: string | null;
  healthScore?: number | null;
  riskSeverity: "LOW" | "MEDIUM" | "HIGH" | string;
  daysSlipped?: number;
  stageDwellDays?: number;
  closeDate?: string | null;
  keyRisk?: string | null;
  nbaCount?: number;
  score?: number;
}

export interface ManagerInspectionFilters {
  pipelineId?: string;
  stage?: string;
  ownerId?: string;
  minScore?: number;
  maxScore?: number;
  riskSeverity?: "LOW" | "MEDIUM" | "HIGH" | string;
  limit?: number;
}

export interface PipelineSummary {
  totalDeals: number;
  totalPipelineAmount: number;
  currency: string;
  opportunityTypeBreakdown: Array<{
    type: OpportunityType | string;
    count: number;
    amount: number;
    percentage?: number;
  }>;
  riskDrivers: Array<{
    risk: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | string;
    affectedDealsCount: number;
    exposureAmount?: number;
  }>;
  executiveNarrative: string;
  generatedAt?: string;
  timestamp?: string;
}

export interface NbaProposal {
  id: string;
  dealId?: string;
  action: string;
  title?: string;
  rationale: string;
  confidence?: number;
  priority?: "HIGH" | "MEDIUM" | "LOW" | number | string;
  status?: "PENDING" | "ACCEPTED" | "REJECTED" | string;
  suggestedExecution?: string;
  category?: string;
  notes?: string | null;
  decidedAt?: string | null;
  createdAt?: string;
}

export interface ManagerDealSummary {
  dealId: string;
  dealName?: string;
  summaryNarrative: string;
  keySignals: Array<{
    signal: string;
    type?: string;
    sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | string;
    timestamp?: string;
  }>;
  activeRisks: Array<{
    risk: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | string;
    scoreImpact?: number;
    detector?: string;
  }>;
  nbaProposals: NbaProposal[];
  generatedAt?: string;
  timestamp?: string;
}

export interface NbaDecisionPayload {
  action: "ACCEPT" | "REJECT";
  notes?: string;
}
