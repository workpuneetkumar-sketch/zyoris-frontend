// lib/api/assignmentRulesApi.ts
// Lead Assignment Engine
//
// LIVE endpoints (from Swagger):
//   POST /assignment-rules/create
//   GET  /assignment-rules/list   (query: status, strategy)
//
// SCAFFOLDED (backend not yet exposed — wired and ready):
//   PATCH /assignment-rules/:id   — update rule
//   GET   /leads/assignment-history
//   GET   /leads/assignment-analytics

import api from "@/lib/api/api";
import type {
  AssignmentRule,
  AssignmentRulesListResponse,
  AssignmentRulesListFilters,
  CreateAssignmentRulePayload,
  UpdateAssignmentRulePayload,
  AssignmentHistoryResponse,
  AssignmentHistoryFilters,
  AssignmentAnalytics,
  AssignmentAnalyticsFilters,
  AssignmentStrategy,
  AssignmentRuleStatus,
} from "@/types/assignmentRules";

// ── Normaliser ────────────────────────────────────────────────────────────────

function normaliseRule(raw: any): AssignmentRule {
  return {
    id: raw.id ?? raw._id ?? String(Date.now()),
    name: raw.name ?? "Unnamed Rule",
    strategy: (raw.strategy as AssignmentStrategy) ?? "ROUND_ROBIN",
    priority: typeof raw.priority === "number" ? raw.priority : 1,
    status: (raw.status as AssignmentRuleStatus) ?? "ACTIVE",
    territories: Array.isArray(raw.territories) ? raw.territories : [],
    products: Array.isArray(raw.products) ? raw.products : [],
    cities: Array.isArray(raw.cities) ? raw.cities : [],
    states: Array.isArray(raw.states) ? raw.states : [],
    countries: Array.isArray(raw.countries) ? raw.countries : [],
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    pinCodes: Array.isArray(raw.pinCodes) ? raw.pinCodes : [],
    minBudget: raw.minBudget ?? null,
    maxBudget: raw.maxBudget ?? null,
    assigneeIds: Array.isArray(raw.assigneeIds) ? raw.assigneeIds : [],
    organizationId: raw.organizationId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ── LIVE: POST /assignment-rules/create ──────────────────────────────────────
// Exact Swagger schema — no field remapping

export async function createAssignmentRule(
  payload: CreateAssignmentRulePayload
): Promise<AssignmentRule> {
  const res = await api.post("/assignment-rules/create", {
    name: payload.name,
    strategy: payload.strategy,
    priority: payload.priority,
    status: payload.status,
    territories: payload.territories,
    products: payload.products,
    cities: payload.cities,
    states: payload.states,
    countries: payload.countries,
    languages: payload.languages,
    pinCodes: payload.pinCodes,
    minBudget: payload.minBudget ?? null,
    maxBudget: payload.maxBudget ?? null,
    assigneeIds: payload.assigneeIds,
  });
  const raw = res.data?.data ?? res.data?.rule ?? res.data;
  return normaliseRule(raw);
}

// ── LIVE: GET /assignment-rules/list ─────────────────────────────────────────
// Optional query: status=ACTIVE|INACTIVE, strategy=ROUND_ROBIN|EQUAL_DISTRIBUTION

export async function listAssignmentRules(
  filters?: AssignmentRulesListFilters
): Promise<AssignmentRulesListResponse> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.strategy) params.strategy = filters.strategy;

  const res = await api.get("/assignment-rules/list", { params });
  const d = res.data;

  let rules: AssignmentRule[] = [];
  let total = 0;

  if (Array.isArray(d)) {
    rules = d.map(normaliseRule);
    total = d.length;
  } else if (Array.isArray(d?.rules)) {
    rules = d.rules.map(normaliseRule);
    total = d.total ?? d.rules.length;
  } else if (Array.isArray(d?.data)) {
    rules = d.data.map(normaliseRule);
    total = d.total ?? d.data.length;
  }

  return { rules, total };
}

// ── LIVE: GET /assignment-rules/{id} ─────────────────────────────────────────

export async function getAssignmentRule(id: string): Promise<AssignmentRule> {
  const res = await api.get(`/assignment-rules/${id}`);
  const raw = res.data?.data ?? res.data?.rule ?? res.data;
  return normaliseRule(raw);
}

// ── LIVE: PATCH /assignment-rules/{id} ───────────────────────────────────

export async function updateAssignmentRule(
  payload: UpdateAssignmentRulePayload
): Promise<AssignmentRule> {
  const { id, ...rest } = payload;
  const res = await api.patch(`/assignment-rules/${id}`, rest);
  const raw = res.data?.data ?? res.data?.rule ?? res.data;
  return normaliseRule(raw);
}

// ── LIVE: DELETE /assignment-rules/{id} ─────────────────────────────────

export async function deleteAssignmentRule(id: string): Promise<void> {
  await api.delete(`/assignment-rules/${id}`);
}

// ── LIVE: GET /leads/assignment-history ──────────────────────────────────────

export async function getAssignmentHistory(
  filters: Partial<AssignmentHistoryFilters> & { page?: number; limit?: number }
): Promise<AssignmentHistoryResponse> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  };
  if (filters.search) params.search = filters.search;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.userId) params.userId = filters.userId;
  if (filters.strategy && filters.strategy !== "All") params.strategy = filters.strategy;
  if (filters.status && filters.status !== "All") params.status = filters.status;

  const res = await api.get("/leads/assignment-history", { params });
  const d = res.data;

  const raw: any[] = Array.isArray(d)
    ? d
    : Array.isArray(d?.history)
    ? d.history
    : Array.isArray(d?.data)
    ? d.data
    : [];

  const history = raw.map((item: any) => ({
    id: item.id ?? String(Math.random()),
    leadId: item.leadId ?? item.lead_id ?? "",
    leadName: item.leadName ?? item.lead_name ?? item.lead?.name ?? "—",
    assignedToId: item.assignedToId ?? item.assigned_to_id ?? "",
    assignedToName: item.assignedToName ?? item.assigned_to_name ?? item.assignedTo?.name ?? "—",
    assignedById: item.assignedById ?? item.assigned_by_id ?? null,
    assignedByName: item.assignedByName ?? item.assigned_by_name ?? item.assignedBy?.name ?? "—",
    strategy: item.strategy ?? item.assignmentStrategy ?? "MANUAL",
    assignedAt: item.assignedAt ?? item.assigned_at ?? item.createdAt ?? new Date().toISOString(),
    responseTime: item.responseTime ?? item.response_time ?? null,
    conversionStatus: item.conversionStatus ?? item.conversion_status ?? "PENDING",
    currentStatus: item.currentStatus ?? item.current_status ?? item.status ?? "ACTIVE",
  }));

  return {
    history,
    total: d?.total ?? d?.pagination?.total ?? raw.length,
    page: d?.page ?? d?.pagination?.page ?? filters.page ?? 1,
    limit: d?.limit ?? d?.pagination?.limit ?? filters.limit ?? 20,
  };
}

export async function getAssignmentAnalytics(
  filters?: Partial<AssignmentAnalyticsFilters>
): Promise<AssignmentAnalytics> {
  try {
    const params: Record<string, string | undefined> = {};
    if (filters?.dateFrom) {
      try {
        params.from = new Date(filters.dateFrom).toISOString();
      } catch {
        params.from = filters.dateFrom;
      }
    }
    if (filters?.dateTo) {
      try {
        params.to = new Date(filters.dateTo).toISOString();
      } catch {
        params.to = filters.dateTo;
      }
    }
    if (filters?.strategy && filters.strategy !== "All") params.strategy = filters.strategy;
    if (filters?.userId) params.userId = filters.userId;
    if (filters?.groupBy) params.groupBy = filters.groupBy;

    const res = await api.get("/leads/assignment-analytics", { params });
    // Backend shape: { success, data: { overview, distribution, conversionRate, strategyBreakdown,
    //   strategyPerformance, summary, timeLine, topAssignees } }
    const d = res.data?.data ?? res.data;

    // Pull from overview sub-object (actual backend shape)
    const overview = d?.overview ?? {};
    const summary  = d?.summary  ?? {};

    // Strategy data: try strategyBreakdown first, then strategyPerformance
    const rawStrategy: any[] = Array.isArray(d?.strategyBreakdown)
      ? d.strategyBreakdown
      : Array.isArray(d?.strategyPerformance)
      ? d.strategyPerformance
      : Array.isArray(d?.byStrategy)
      ? d.byStrategy
      : [];

    // Timeline: backend sends timeline, timeLine, or overTime
    const rawTimeline: any[] = Array.isArray(d?.timeline)
      ? d.timeline
      : Array.isArray(d?.timeLine)
      ? d.timeLine
      : Array.isArray(d?.overTime)
      ? d.overTime
      : [];

    // Top assignees: backend sends topAssignees or topPerformers
    const rawTop: any[] = Array.isArray(d?.topAssignees)
      ? d.topAssignees
      : Array.isArray(d?.topPerformers)
      ? d.topPerformers
      : [];

    // conversionRate may live at d.conversionRate (top level array) or overview.conversionRate (number)
    const conversionRateNum: number =
      typeof overview.conversionRate === "number"
        ? overview.conversionRate
        : typeof summary.conversionRate === "number"
        ? summary.conversionRate
        : typeof d?.conversionRate === "number"
        ? d.conversionRate
        : 0;

    return {
      // Primary KPIs
      totalAssignments: overview.totalAssignments ?? summary.totalAssignments ?? d?.totalAssignments ?? 0,
      totalConverted:   overview.totalConverted   ?? summary.totalConverted   ?? d?.totalConverted   ?? 0,
      conversionRate:   conversionRateNum,
      // averageResponseTimeSeconds → convert to minutes
      avgResponseTime:  overview.averageResponseTimeSeconds != null
        ? Math.round(overview.averageResponseTimeSeconds / 60)
        : summary.avgResponseTime != null
        ? Math.round(summary.avgResponseTime / 60)
        : (d?.avgResponseTime ?? 0),
      activeRules: d?.activeRules ?? 0,

      // Distribution (pie chart) — backend distribution sends 'assignments' instead of 'count'
      distribution: (Array.isArray(d?.distribution) ? d.distribution : []).map((item: any) => ({
        assigneeId: item.userId ?? item.id ?? "",
        assigneeName: item.name ?? item.userName ?? "—",
        count: item.assignments ?? item.count ?? 0,
        percentage: item.percentage ?? 0,
      })),

      // Timeline (line/area chart) — map timeline entries (using 'assignments' or 'count')
      overTime: rawTimeline.map((item: any) => ({
        date:  item.date ?? item.label ?? item.period ?? item.day ?? item.week ?? item.month ?? "",
        count: item.assignments ?? item.count ?? item.totalAssignments ?? item.total ?? 0,
      })),

      // Strategies (bar chart)
      byStrategy: rawStrategy.map((item: any) => ({
        strategy:   item.strategy   ?? item.name   ?? "",
        count:      item.count      ?? item.total  ?? item.totalAssignments ?? 0,
        percentage: item.percentage ?? 0,
      })),

      // Top performers leaderboard — map topAssignees fields
      topPerformers: rawTop.map((item: any) => ({
        assigneeId:     item.assigneeId ?? item.userId ?? item.id ?? "",
        assigneeName:   item.assigneeName ?? item.name ?? item.userName ?? "—",
        totalAssigned:  item.totalAssigned ?? item.count ?? item.totalAssignments ?? 0,
        converted:      item.converted ?? item.totalConverted ?? 0,
        conversionRate: item.conversionRate ?? 0,
        avgResponseTime: item.avgResponseTime != null
          ? Math.round(item.avgResponseTime / 60)
          : null,
      })),

      ruleEffectiveness: Array.isArray(d?.ruleEffectiveness) ? d.ruleEffectiveness : [],
      period: d?.period ?? { from: "", to: "" },
    };
  } catch {
    return {
      totalAssignments: 0,
      totalConverted:   0,
      avgResponseTime:  0,
      conversionRate:   0,
      activeRules:      0,
      distribution:     [],
      overTime:         [],
      byStrategy:       [],
      topPerformers:    [],
      ruleEffectiveness:[],
      period: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        to:   new Date().toISOString().slice(0, 10),
      },
    };
  }
}
