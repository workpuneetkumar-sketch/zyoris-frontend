// types/assignmentRules.ts
// Matches the exact Swagger schema for POST /assignment-rules/create
// and GET /assignment-rules/list

// ── Strategy — exact backend enum values ─────────────────────────────────────
export type AssignmentStrategy =
  | "ROUND_ROBIN"
  | "EQUAL_DISTRIBUTION"
  | "COUNTRY"
  | "LANGUAGE"
  | "PIN_CODE"
  | "AI_RECOMMENDATION"
  | "MANUAL";

// ── Rule status ───────────────────────────────────────────────────────────────
export type AssignmentRuleStatus = "ACTIVE" | "INACTIVE";

// ── Assignment Rule — matches backend response shape ─────────────────────────
export interface AssignmentRule {
  id: string;
  name: string;
  strategy: AssignmentStrategy;
  priority: number;
  status: AssignmentRuleStatus;
  territories: string[];
  products: string[];
  cities: string[];
  states: string[];
  countries?: string[];
  languages?: string[];
  pinCodes?: string[];
  minBudget?: number | null;
  maxBudget?: number | null;
  assigneeIds: string[];
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Create payload — exact Swagger request body ───────────────────────────────
export interface CreateAssignmentRulePayload {
  name: string;
  strategy: AssignmentStrategy;
  priority: number;
  status: AssignmentRuleStatus;
  territories: string[];
  products: string[];
  cities: string[];
  states: string[];
  countries?: string[];
  languages?: string[];
  pinCodes?: string[];
  minBudget?: number | null;
  maxBudget?: number | null;
  assigneeIds: string[];
}

// ── Update payload (PATCH — scaffolded for future endpoint) ───────────────────
export interface UpdateAssignmentRulePayload extends Partial<CreateAssignmentRulePayload> {
  id: string;
}

// ── List response ─────────────────────────────────────────────────────────────
export interface AssignmentRulesListResponse {
  rules: AssignmentRule[];
  total: number;
}

// ── List query filters (matches GET /assignment-rules/list params) ────────────
export interface AssignmentRulesListFilters {
  status?: AssignmentRuleStatus;
  strategy?: AssignmentStrategy;
}

// ── Assignment History ────────────────────────────────────────────────────────
export type ConversionStatus = "CONVERTED" | "NOT_CONVERTED" | "PENDING";
export type AssignmentCurrentStatus = "ACTIVE" | "CLOSED" | "DEAD" | "REASSIGNED";

export interface AssignmentHistoryEntry {
  id: string;
  leadId: string;
  leadName?: string;
  assignedToId: string;
  assignedToName?: string;
  assignedById?: string;
  assignedByName?: string;
  strategy: string;
  assignedAt: string;
  responseTime?: number | null;
  conversionStatus: ConversionStatus;
  currentStatus: AssignmentCurrentStatus | string;
}

export interface AssignmentHistoryFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  userId: string;
  strategy: string;
  status: string;
}

export interface AssignmentHistoryResponse {
  history: AssignmentHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

// ── Analytics (scaffolded — GET /leads/assignment-analytics) ──────────────────
export interface AssignmentDistributionItem {
  assigneeName: string;
  assigneeId: string;
  count: number;
  percentage: number;
}

export interface AssignmentOverTimeItem {
  date: string;
  count: number;
  strategy: string;
}

export interface StrategyBreakdownItem {
  strategy: string;
  count: number;
  percentage: number;
}

export interface TopPerformerItem {
  assigneeId: string;
  assigneeName: string;
  totalAssigned: number;
  converted: number;
  conversionRate: number;
  avgResponseTime: number;
}

export interface RuleEffectivenessItem {
  ruleId: string;
  ruleName: string;
  totalTriggered: number;
  successRate: number;
  avgConversionRate: number;
}

export interface AssignmentAnalytics {
  totalAssignments: number;
  totalConverted: number;
  avgResponseTime: number;
  conversionRate: number;
  activeRules: number;
  distribution: AssignmentDistributionItem[];
  overTime: AssignmentOverTimeItem[];
  byStrategy: StrategyBreakdownItem[];
  topPerformers: TopPerformerItem[];
  ruleEffectiveness: RuleEffectivenessItem[];
  period: { from: string; to: string };
}

export interface AssignmentAnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  strategy: string;
  userId: string;
  groupBy?: "DAY" | "WEEK" | "MONTH" | "USER" | "STRATEGY";
}
