// lib/api/dashboardApi.ts
// Typed service functions for all Dashboard endpoints.
// Uses the existing shared Axios instance — auth token, refresh, and retry
// are handled transparently by api.ts interceptors.
// All functions follow the established project pattern:
//   response.data?.data || response.data  (handles { data: T } envelope or flat T)

import api from "@/lib/api/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types — derived from actual backend response shapes, NOT invented
// ─────────────────────────────────────────────────────────────────────────────

/** GET /dashboard/stats */
export interface DashboardStats {
  leadsCount: number;
  totalDealValue: number;
  revenue: number;
  overdueTasks: number;
  emailsSent: number;
  callsToday: number;
}

/** GET /dashboard/briefing (daily) */
export interface DashboardBriefing {
  greeting: string;
  summaryBullets: string[];
  overdueHighlight?: string;
  topPriorityAction?: string;
  confidenceScore?: number;
  fallback?: boolean;
  // weekly fields (when ?weekly=true)
  summary?: string;
  keyAchievements?: string[];
  criticalRisks?: string[];
  strategicPriorities?: string[];
  kpis?: {
    period?: { from: string; to: string; days: number };
    newLeads?: number;
    leadsAssigned?: number;
    dealsCreated?: number;
    dealsWon?: number;
    dealsLost?: number;
    revenueGenerated?: number;
    followUpsCompleted?: number;
    pendingFollowUps?: number;
    teamPerformance?: Array<{
      userId: string;
      name: string;
      dealsWon: number;
      leadsAssigned: number;
    }>;
  };
}

/** GET /dashboard/anomalies */
export interface DashboardAnomalyItem {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  metric: string;
  change: string;
  description: string;
  recommendation: string;
}
export interface DashboardAnomalies {
  anomalies: DashboardAnomalyItem[];
  fallback?: boolean;
}

/** GET /dashboard/ceo */
export interface DashboardCeo {
  kpis: {
    totalRevenue?: number;
    [key: string]: unknown;
  };
  riskIndicators: {
    marginPct?: number;
    demandTrend?: string;
    [key: string]: unknown;
  };
  revenueForecast?: {
    projectedRevenue?: number;
    stats?: { trend: string };
    trend?: string;
  };
}

/** GET /dashboard/cfo */
export interface DashboardCfo {
  marginTrends: {
    margin: number;
    marginPct: number;
  };
  expensesSummary: {
    totalExpenses: number;
    categories?: Array<{ name: string; amount: number }>;
  };
  marketingPerformance: Array<{
    channel: string;
    spend: number;
    attributedRevenue: number;
    roi: number;
  }>;
  approvalWorkflows: {
    pendingApprovals: number;
  };
}

/** GET /dashboard/operations */
export interface DashboardOperations {
  inventoryRisks?: Array<{
    id?: string;
    item?: string;
    risk?: string;
    level?: "HIGH" | "MEDIUM" | "LOW";
    [key: string]: unknown;
  }>;
  optimizationSuggestions?: Array<{
    id?: string;
    suggestion?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/** GET /dashboard (hub) */
export interface DashboardHub {
  tasks?: unknown[];
  projects?: unknown[];
  crm?: Record<string, unknown>;
  salesExecution?: Record<string, unknown>;
  activities?: unknown[];
  notifications?: unknown[];
  modules?: unknown[];
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Unwrap { data: T } envelope or return flat T */
function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in (raw as object)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/** GET /dashboard/stats — KPI counts */
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get("/dashboard/stats");
  const data = unwrap<DashboardStats>(res.data);
  return {
    leadsCount:     typeof data?.leadsCount     === "number" ? data.leadsCount     : 0,
    totalDealValue: typeof data?.totalDealValue  === "number" ? data.totalDealValue  : 0,
    revenue:        typeof data?.revenue         === "number" ? data.revenue         : 0,
    overdueTasks:   typeof data?.overdueTasks    === "number" ? data.overdueTasks    : 0,
    emailsSent:     typeof data?.emailsSent      === "number" ? data.emailsSent      : 0,
    callsToday:     typeof data?.callsToday      === "number" ? data.callsToday      : 0,
  };
}

/** GET /dashboard/briefing — daily AI briefing */
export async function getDashboardBriefing(weekly = false): Promise<DashboardBriefing> {
  const res = await api.get("/dashboard/briefing", weekly ? { params: { weekly: true } } : undefined);
  return unwrap<DashboardBriefing>(res.data);
}

/** GET /dashboard/anomalies */
export async function getDashboardAnomalies(): Promise<DashboardAnomalies> {
  const res = await api.get("/dashboard/anomalies");
  const data = unwrap<DashboardAnomalies>(res.data);
  return {
    anomalies: Array.isArray(data?.anomalies) ? data.anomalies : [],
    fallback: data?.fallback,
  };
}

/** GET /dashboard/ceo */
export async function getDashboardCeo(): Promise<DashboardCeo> {
  const res = await api.get("/dashboard/ceo");
  return unwrap<DashboardCeo>(res.data);
}

/** GET /dashboard/cfo */
export async function getDashboardCfo(): Promise<DashboardCfo> {
  const res = await api.get("/dashboard/cfo");
  return unwrap<DashboardCfo>(res.data);
}

/** GET /dashboard/operations */
export async function getDashboardOperations(): Promise<DashboardOperations> {
  const res = await api.get("/dashboard/operations");
  return unwrap<DashboardOperations>(res.data);
}

/** GET /dashboard — hub endpoint */
export async function getDashboardHub(): Promise<DashboardHub> {
  const res = await api.get("/dashboard");
  return unwrap<DashboardHub>(res.data);
}

/** GET /activities/timeline — recent org activity feed */
export interface TimelineActivity {
  id: string;
  type: string;       // "CALL" | "EMAIL" | "MEETING" | "NOTE" | "LEAD" | "TASK"
  message?: string;
  title?: string;
  description?: string;
  timestamp?: string;
  createdAt?: string;
  createdBy?: { name?: string; id?: string };
  metadata?: Record<string, unknown>;
}
export async function getActivityTimeline(limit = 20): Promise<TimelineActivity[]> {
  const res = await api.get("/activities/timeline", { params: { limit } });
  const raw = res.data;
  const items = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.items)
    ? raw.items
    : [];
  return items.slice(0, limit);
}

/** GET /api/deals/pipeline-stats — stage distribution
 *  Backend returns: { data: [{ stage, count, totalAmount }] }
 *  We normalise to { stages: PipelineStageStat[] } so widgets have a stable shape.
 */
export interface PipelineStageStat {
  stage: string;
  count?: number;
  totalAmount?: number;
  // legacy field names some backends use
  amount?: number;
  value?: number;
}
export interface PipelineStatsData {
  stages: PipelineStageStat[];   // always present after normalisation
  totalValue?: number;
}
export async function getPipelineStats(): Promise<PipelineStatsData> {
  const res = await api.get("/api/deals/pipeline-stats");
  const raw = res.data;

  if (process.env.NODE_ENV !== "production") {
    console.log("[getPipelineStats] raw response:", JSON.stringify(raw)?.slice(0, 300));
  }

  // Backend returns { data: [...] } — unwrap all known envelope shapes
  let items: PipelineStageStat[] = [];
  if (Array.isArray(raw))                    items = raw;
  else if (Array.isArray(raw?.data))         items = raw.data;
  else if (Array.isArray(raw?.stages))       items = raw.stages;
  else if (Array.isArray(raw?.pipeline))     items = raw.pipeline;

  const totalValue = typeof raw?.totalValue === "number"
    ? raw.totalValue
    : items.reduce((s, st) => s + (st.totalAmount ?? st.amount ?? st.value ?? 0), 0);

  return { stages: items, totalValue };
}

/** GET /activities/get-activities — safe fallback for general activity feed (no required params) */
export async function getActivitiesFeed(limit = 10): Promise<TimelineActivity[]> {
  // Try /activities/timeline first; fall back to /activities/get-activities which has no required params
  try {
    const res = await api.get("/activities/timeline", { params: { limit } });
    const raw = res.data;
    const items = Array.isArray(raw) ? raw
      : Array.isArray(raw?.data) ? raw.data
      : Array.isArray(raw?.items) ? raw.items : [];
    if (items.length > 0) return items.slice(0, limit);
  } catch {
    // fall through to secondary
  }
  const res = await api.get("/activities/get-activities", { params: { limit } });
  const raw = res.data;
  const items = Array.isArray(raw) ? raw
    : Array.isArray(raw?.activities) ? raw.activities
    : Array.isArray(raw?.data) ? raw.data : [];
  return items.slice(0, limit);
}

/** GET /hr/employees/get-employees — for HR widget */
export interface HREmployee {
  id: string;
  name?: string;
  department?: string;
  status?: string;
  isOnLeave?: boolean;
  [key: string]: unknown;
}
export async function getHREmployees(): Promise<HREmployee[]> {
  const res = await api.get("/hr/employees/get-employees");
  const raw = res.data;
  return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
}

/** GET /dashboard/stats enriched — for revenue/conversion reuse */
// getDashboardStats already covers this; re-export alias for clarity in widgets
export { getDashboardStats as getDashboardStatsForWidgets };

/** GET /analytics/conversion/scores — for ConversionRateWidget */
export interface ConversionScore {
  dealId: string;
  name: string;
  stage: string;
  amount: number;
  conversionProbability: number;
}
export async function getConversionScores(): Promise<ConversionScore[]> {
  const res = await api.get("/analytics/conversion/scores");
  const raw = unwrap<ConversionScore[]>(res.data);
  return Array.isArray(raw) ? raw : [];
}

/** GET /analytics/revenue/forecast — for RevenueWidget / CashFlowWidget */
export interface ForecastDatapoint {
  label: string;
  forecast: number;
  upper?: number;
  lower?: number;
}
export interface RevenueForeCastData {
  datapoints: ForecastDatapoint[];
  currency?: string;
  period_days?: number;
}
export async function getRevenueForecast(): Promise<RevenueForeCastData> {
  const res = await api.get("/analytics/revenue/forecast");
  const raw = unwrap<any>(res.data);
  // backend returns { forecast: [{date, value}], historical: [{date, value}] }
  const pts = (raw?.forecast ?? []).map((d: any) => ({
    label:    d.date ?? d.label ?? "",
    forecast: d.value ?? d.forecast ?? 0,
    upper:    typeof d.upper === "number" ? d.upper : undefined,
    lower:    typeof d.lower === "number" ? d.lower : undefined,
  }));
  return {
    datapoints:  pts,
    currency:    raw?.currency ?? "USD",
    period_days: typeof raw?.period_days === "number" ? raw.period_days : undefined,
  };
}

/** GET /analytics/demand/trends — for AnalyticsWidget visitors/conversions */
export interface DemandTrendsData {
  overallTrend?: string;
  inventoryRisk?: Array<{
    date?: string;
    month?: string;
    demand?: number;
    inventory?: number;
    visitors?: number;
    conversions?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}
export async function getDemandTrends(): Promise<DemandTrendsData> {
  const res = await api.get("/analytics/demand/trends");
  return unwrap<DemandTrendsData>(res.data);
}

/** GET /dashboard/sales — for MarketingWidget / CommunicationsWidget */
export interface DashboardSales {
  [key: string]: unknown;
}
export async function getDashboardSales(): Promise<DashboardSales> {
  const res = await api.get("/dashboard/sales");
  return unwrap<DashboardSales>(res.data);
}
