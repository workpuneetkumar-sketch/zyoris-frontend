// lib/api/customersApi.ts
// Typed API client for the Customer 360 page.
//
// Uses the shared axios instance (`@/lib/api/api`) — auth header, token refresh
// and logout redirect are handled there.
//
// Endpoints (see types/customer360.ts for the frozen contracts these mirror):
//   • GET /api/customers/:id                      — Sakshi   (canonical customer record)
//   • GET /api/customers/:id/graph                — Manish   (relationship graph)
//   • GET /api/customers/:id/timeline             — Prashant (Customer Timeline service)
//   • GET /api/customers/:companyId/relationships — Manish   (relationship hierarchy / stakeholders)
//   • GET /crm/communication-intelligence/:leadId — Ayush    (AI communication intelligence)
//
// The customer endpoints live behind the `/api/customers` prefix on the backend
// — the bare `/customers/...` path is not routed (404).
//
// There is NO mock/placeholder data path here: every function returns exactly
// what the backend produced, and a 404 on the graph / timeline sub-resources is
// surfaced as an empty result so the section renders its own empty state.
//
// No domain types are declared here — they live in types/customer360.ts so the
// app has exactly one Customer 360 model.

import { AxiosError } from "axios";
import api from "@/lib/api/api";
import type {
  CommunicationIntelligence,
  CustomerAiInsight,
  CustomerGraph,
  CustomerGraphEdge,
  CustomerGraphNode,
  CustomerGraphNodeType,
  CustomerHealth,
  CustomerStakeholder,
  CustomerSummary,
  CustomerTimelinePage,
  CustomerTimelineQuery,
  HealthBand,
  Provenance,
  RelationshipEdge,
} from "@/types/customer360";
import { STAKEHOLDER_RELATIONSHIP_TYPES } from "@/types/customer360";
import type {
  CanonicalCustomer,
  CustomersFilters,
  CustomersResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  IdentityResolvePayload,
  IdentityResolveResult,
  ConvertLeadPayload,
  ConvertLeadResult,
  ConvertCompanyPayload,
  ConvertCompanyResult,
} from "@/types/customers";
import { CUSTOMERS_PER_PAGE } from "@/types/customers";

const CUSTOMERS_BASE = "/api/customers";

// ── Error model ─────────────────────────────────────────────────────────────

export type CustomerApiErrorKind =
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "network"
  | "server"
  | "unknown";

export class CustomerApiError extends Error {
  readonly kind: CustomerApiErrorKind;
  readonly status?: number;

  constructor(kind: CustomerApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "CustomerApiError";
    this.kind = kind;
    this.status = status;
  }

  get isNotFound(): boolean {
    return this.kind === "not_found";
  }
}

function toCustomerApiError(err: unknown, subject: string): CustomerApiError {
  if (err instanceof CustomerApiError) return err;

  const ax = err as AxiosError<{ message?: string; error?: string }>;
  if (ax?.isAxiosError) {
    const status = ax.response?.status;
    const serverMsg =
      ax.response?.data?.message || ax.response?.data?.error || ax.message;

    if (!ax.response) {
      return new CustomerApiError(
        "network",
        `Couldn't reach the server while loading ${subject}. Check your connection and try again.`
      );
    }
    if (status === 404) {
      return new CustomerApiError("not_found", `${subject} was not found.`, 404);
    }
    if (status === 401) {
      return new CustomerApiError("unauthorized", "Your session has expired. Please sign in again.", 401);
    }
    if (status === 403) {
      return new CustomerApiError("forbidden", `You don't have access to ${subject}.`, 403);
    }
    if (status && status >= 500) {
      return new CustomerApiError("server", `The server had a problem loading ${subject}. Please try again shortly.`, status);
    }
    return new CustomerApiError("unknown", serverMsg || `Failed to load ${subject}.`, status);
  }

  return new CustomerApiError(
    "unknown",
    err instanceof Error ? err.message : `Failed to load ${subject}.`
  );
}

// ── Response normalisation ──────────────────────────────────────────────────
// Backend responses are sometimes wrapped ({ data: ... }) and sometimes not.
// Unwrap defensively without inventing any field values.

function unwrapEnvelope<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    const inner = (raw as Record<string, unknown>).data;
    if (inner && typeof inner === "object") return inner as T;
  }
  return raw as T;
}

// ── GET /api/customers/:id ──────────────────────────────────────────────────

/**
 * Derive record-level provenance from the canonical customer's `externalSystem`
 * / `externalId`. This is a real fact from the contract (which CRM the record is
 * mastered in), not a synthetic value — when both are absent, provenance is null.
 */
function deriveCustomerProvenance(customer: CustomerSummary): Provenance | null {
  const system = customer.externalSystem?.trim();
  if (!system) return null;
  return {
    source: system.toUpperCase(),
    externalId: customer.externalId ?? null,
    observedAt: customer.updatedAt ?? null,
  };
}

export async function fetchCustomerById(id: string): Promise<CustomerSummary> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    const res = await api.get(`${CUSTOMERS_BASE}/${encodeURIComponent(id)}`);
    const customer = unwrapEnvelope<CustomerSummary>(res.data);
    if (!customer || typeof customer !== "object" || !customer.id) {
      throw new CustomerApiError("not_found", "This customer was not found.", 404);
    }
    return { ...customer, provenance: customer.provenance ?? deriveCustomerProvenance(customer) };
  } catch (err) {
    throw toCustomerApiError(err, "this customer");
  }
}

// ── Graph contract normalisation ───────────────────────────────────────────
//
// The frozen graph contract uses `nodeType` / `refId` / `fromNodeId` /
// `toNodeId` / `relationshipType`; the GraphSection renders `type` / `label` /
// `source` / `target` / `kind`. The bridge below maps one onto the other. There
// is no mock/placeholder path — an unreachable graph is surfaced as empty.

function normalizeGraphNodes(rawNodes: any[]): CustomerGraphNode[] {
  return rawNodes.map((rn: any, i: number) => {
    const nodeType = String(rn.nodeType ?? rn.type ?? "customer").toLowerCase() as CustomerGraphNodeType;
    return {
      id: String(rn.id ?? rn.refId ?? `node-${i}`),
      type: nodeType,
      label: String(rn.label ?? rn.name ?? nodeType),
      isRoot: Boolean(rn.isRoot),
      meta: rn.meta ?? rn.metadata ?? null,
      provenance: rn.provenance ?? (rn.source ? { source: String(rn.source) } : null),
    };
  });
}

function normalizeGraphEdges(rawEdges: any[]): CustomerGraphEdge[] {
  return rawEdges.map((re: any, i: number) => ({
    id: String(re.id ?? `edge-${i}`),
    source: String(re.source ?? re.fromNodeId ?? ""),
    target: String(re.target ?? re.toNodeId ?? ""),
    label: re.label ?? null,
    kind: re.kind ?? re.relationshipType ?? null,
    strength: typeof re.strength === "number" ? re.strength : null,
    provenance: re.provenance ?? (re.edgeSource ? { source: String(re.edgeSource) } : null),
  }));
}

/** A 404 on a 360 sub-resource means "no data for this customer yet", not an error. */
function isSubResourceNotFound(err: unknown): boolean {
  const ax = err as AxiosError;
  return Boolean(ax?.isAxiosError) && ax.response?.status === 404;
}

// ── GET /api/customers/:id/graph ────────────────────────────────────────────
// Frozen contract: { rootNodeId, depth, nodes[], edges[] }. A 404 (no graph for
// this customer yet) resolves to an empty graph so the section shows its empty
// state rather than a page error.

export async function fetchCustomerGraph(id: string): Promise<CustomerGraph> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    const res = await api.get(`${CUSTOMERS_BASE}/${encodeURIComponent(id)}/graph`);
    const raw = unwrapEnvelope<any>(res.data);

    const rawNodes =
      Array.isArray(raw?.nodes) ? raw.nodes :
      Array.isArray(raw?.data?.nodes) ? raw.data.nodes :
      [];

    const rawEdges =
      Array.isArray(raw?.edges) ? raw.edges :
      Array.isArray(raw?.data?.edges) ? raw.data.edges :
      [];

    return {
      customerId: raw?.customerId ?? raw?.rootNodeId ?? id,
      nodes: normalizeGraphNodes(rawNodes),
      edges: normalizeGraphEdges(rawEdges),
      generatedAt: raw?.generatedAt ?? null,
    };
  } catch (err) {
    if (isSubResourceNotFound(err)) {
      return { customerId: id, nodes: [], edges: [], generatedAt: null };
    }
    throw toCustomerApiError(err, "the relationship graph");
  }
}

// ── GET /api/customers/:id/timeline ─────────────────────────────────────────
// Cursor-paginated. Filters mirror the backend query contract exactly:
//   cursor  — nextCursor from the previous page
//   types   — comma-separated backend eventType values
//   from/to — ISO-8601 timestamps (inclusive bounds)
// Empty filters are omitted so the backend applies its own defaults. A 404
// resolves to an empty page so the section shows its empty state.

export async function fetchCustomerTimeline(
  id: string,
  query: CustomerTimelineQuery = {}
): Promise<CustomerTimelinePage> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);

  const params: Record<string, string> = {};
  if (query.cursor) params.cursor = query.cursor;
  if (query.types) params.types = query.types;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;

  try {
    const res = await api.get(
      `${CUSTOMERS_BASE}/${encodeURIComponent(id)}/timeline`,
      { params }
    );
    const raw = unwrapEnvelope<any>(res.data);

    const events =
      Array.isArray(raw?.events) ? raw.events :
      Array.isArray(raw?.data?.events) ? raw.data.events :
      [];

    return {
      events,
      nextCursor: raw?.nextCursor ?? null,
    };
  } catch (err) {
    if (isSubResourceNotFound(err)) {
      return { events: [], nextCursor: null };
    }
    throw toCustomerApiError(err, "the customer timeline");
  }
}

// ── GET /api/customers/:companyId/relationships (Stakeholders) ───────────────
// The frozen RelationshipEdge schema has no contact identity fields, so the
// Stakeholders list degrades to role + relationship type when the backend does
// not enrich the edge. Only person→account relationship types are surfaced here.

const RELATIONSHIP_ROLE_LABELS: Record<string, string> = {
  DECISION_MAKER_OF: "Decision maker",
  INFLUENCER_OF: "Influencer",
  BUYING_COMMITTEE_MEMBER_OF: "Buying committee",
};

function influenceLevelToBand(level?: string | null): "high" | "medium" | "low" | null {
  switch (level) {
    case "CRITICAL":
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    case "LOW":
      return "low";
    default:
      return null;
  }
}

function mapRelationshipsToStakeholders(edges: RelationshipEdge[]): CustomerStakeholder[] {
  return edges
    .filter((e) => STAKEHOLDER_RELATIONSHIP_TYPES.includes(e.relationshipType))
    .map((e) => {
      const contact = e.contact ?? null;
      const fallbackName =
        RELATIONSHIP_ROLE_LABELS[e.relationshipType] ??
        e.relationshipType.replace(/_/g, " ").toLowerCase();
      return {
        id: e.id,
        name: contact?.name?.trim() || fallbackName,
        title: contact?.title ?? e.role ?? null,
        email: contact?.email ?? null,
        phone: contact?.phone ?? null,
        role: RELATIONSHIP_ROLE_LABELS[e.relationshipType] ?? e.relationshipType,
        influence: influenceLevelToBand(e.influenceLevel),
        provenance: {
          source: e.source ? String(e.source).toUpperCase() : "RELATIONSHIP_GRAPH",
          confidence: typeof e.strength === "number" ? e.strength : null,
          observedAt: e.updatedAt ?? e.createdAt ?? null,
        },
      };
    });
}

/**
 * GET /api/customers/:companyId/relationships → mapped stakeholder list.
 * The `companyId` join key comes from the canonical customer record. A 404
 * (company has no relationships yet) resolves to an empty list.
 */
export async function fetchCustomerStakeholders(companyId: string): Promise<CustomerStakeholder[]> {
  if (!companyId) return [];
  try {
    const res = await api.get(`${CUSTOMERS_BASE}/${encodeURIComponent(companyId)}/relationships`);
    const raw = unwrapEnvelope<any>(res.data);
    const list: any[] =
      Array.isArray(raw?.relationships) ? raw.relationships :
      Array.isArray(raw?.data?.relationships) ? raw.data.relationships :
      Array.isArray(raw) ? raw :
      [];
    return mapRelationshipsToStakeholders(list as RelationshipEdge[]);
  } catch (err) {
    if (isSubResourceNotFound(err)) return [];
    throw toCustomerApiError(err, "stakeholders for this account");
  }
}

// ── GET /crm/communication-intelligence/:leadId (AI Insights + Health) ──────
// Ayush's AI DTO. Keyed by the canonical customer's `leadId`. Returns a 502 when
// the AI provider itself fails — that is surfaced as a section error, not a page
// error. When the customer has no linked lead, the section shows its empty state.

const CI_PROVENANCE_BASE: Provenance = {
  source: "ZYORIS_AI",
  channel: "COMMUNICATION_INTELLIGENCE",
};

export async function fetchCustomerCommunicationIntelligence(
  leadId: string
): Promise<CommunicationIntelligence | null> {
  if (!leadId) return null;
  try {
    const res = await api.get(`/crm/communication-intelligence/${encodeURIComponent(leadId)}`);
    const raw = unwrapEnvelope<CommunicationIntelligence>(res.data);
    if (!raw || typeof raw !== "object") return null;
    return raw;
  } catch (err) {
    if (isSubResourceNotFound(err)) return null;
    throw toCustomerApiError(err, "AI communication intelligence");
  }
}

function healthBandFromScore(score: number | null): HealthBand | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 75) return "healthy";
  if (score >= 50) return "neutral";
  if (score >= 25) return "at_risk";
  return "critical";
}

/** Derive the Health view model from communication intelligence. */
export function toCustomerHealth(ci: CommunicationIntelligence | null): CustomerHealth | null {
  if (!ci) return null;
  const score =
    typeof ci.buyingProbability === "number" ? Math.round(ci.buyingProbability) : null;

  const factors: NonNullable<CustomerHealth["factors"]> = [];
  for (const r of ci.risk ?? []) {
    if (!r?.description) continue;
    factors.push({
      label: r.riskLevel ? `${r.riskLevel} risk` : "Risk",
      impact: "negative",
      detail: r.description,
    });
  }
  if (ci.mood) {
    const positiveMood = ci.mood === "ENTHUSIASTIC" || ci.mood === "SATISFIED";
    factors.push({
      label: `Mood: ${ci.mood.toLowerCase()}`,
      impact: positiveMood ? "positive" : ci.mood === "NEUTRAL" ? "neutral" : "negative",
      detail: ci.moodDrivers ?? null,
    });
  }
  if (ci.urgency) {
    factors.push({
      label: `Urgency: ${ci.urgency.toLowerCase()}`,
      impact: ci.urgency === "CRITICAL" || ci.urgency === "HIGH" ? "negative" : "neutral",
      detail: ci.urgencyTriggers ?? null,
    });
  }

  if (score == null && factors.length === 0) return null;

  return {
    score,
    band: healthBandFromScore(score),
    summary: ci.communicationSummary ?? ci.intentExplanation ?? null,
    factors,
    provenance: { ...CI_PROVENANCE_BASE },
  };
}

/** Derive the AI Insights list from communication intelligence. */
export function toCustomerAiInsights(ci: CommunicationIntelligence | null): CustomerAiInsight[] {
  if (!ci) return [];
  const insights: CustomerAiInsight[] = [];

  if (ci.communicationSummary || ci.intentExplanation) {
    insights.push({
      id: "ci-summary",
      kind: "summary",
      title: ci.intent ? `Intent: ${ci.intent.replace(/_/g, " ").toLowerCase()}` : "Communication summary",
      body: ci.communicationSummary ?? ci.intentExplanation ?? null,
      provenance: { ...CI_PROVENANCE_BASE },
    });
  }

  for (const [i, r] of (ci.risk ?? []).entries()) {
    if (!r?.description) continue;
    insights.push({
      id: `ci-risk-${i}`,
      kind: "risk",
      title: r.riskLevel ? `${r.riskLevel} risk` : "Risk detected",
      body: r.sourceChannel ? `${r.description} (via ${r.sourceChannel})` : r.description,
      provenance: { ...CI_PROVENANCE_BASE },
    });
  }

  const nba = ci.nextBestAction;
  if (nba?.actionTitle) {
    insights.push({
      id: "ci-nba",
      kind: "next_best_action",
      title: nba.actionTitle,
      body: [nba.detailedRationale, nba.recommendedChannel ? `Channel: ${nba.recommendedChannel}` : null]
        .filter(Boolean)
        .join(" · ") || null,
      provenance: { ...CI_PROVENANCE_BASE },
    });
  }

  if (typeof ci.buyingProbability === "number") {
    insights.push({
      id: "ci-opportunity",
      kind: "opportunity",
      title: `Buying probability ${Math.round(ci.buyingProbability)}%`,
      body: (ci.probabilityFactors ?? []).join("; ") || null,
      confidence: ci.buyingProbability <= 1 ? ci.buyingProbability : ci.buyingProbability / 100,
      provenance: { ...CI_PROVENANCE_BASE },
    });
  }

  return insights;
}


// ── Canonical Customer CRUD + Identity endpoints ────────────────────────────
// These mirror the backend /api/customers endpoints documented in the
// customer/identity management section of the API spec.

// ── GET /api/customers ───────────────────────────────────────────────────────

export async function fetchCustomers(
  page: number = 1,
  filters: CustomersFilters,
  limit: number = CUSTOMERS_PER_PAGE
): Promise<CustomersResponse> {
  const params: Record<string, string | number> = {
    page,
    limit,
  };
  if (filters.search) params.search = filters.search;
  if (filters.lifecycleState !== "All States") params.lifecycleState = filters.lifecycleState;
  if (filters.canonicalType !== "All Types") params.canonicalType = filters.canonicalType;
  if (filters.ownerId !== "All Owners") params.ownerId = filters.ownerId;

  try {
    const res = await api.get(CUSTOMERS_BASE, { params });
    const raw = unwrapEnvelope<any>(res.data);

    let customers: CanonicalCustomer[] =
      Array.isArray(raw?.data)      ? raw.data :
      Array.isArray(raw?.customers) ? raw.customers :
      Array.isArray(raw)            ? raw :
      [];

    const total: number =
      typeof raw?.total === "number" ? raw.total :
      typeof raw?.pagination?.total === "number" ? raw.pagination.total :
      typeof raw?.meta?.total === "number" ? raw.meta.total :
      customers.length;

    const resolvedLimit: number =
      typeof raw?.limit === "number" ? raw.limit :
      typeof raw?.pagination?.limit === "number" ? raw.pagination.limit :
      limit;

    const resolvedPage: number =
      typeof raw?.page === "number" ? raw.page :
      typeof raw?.pagination?.page === "number" ? raw.pagination.page :
      page;

    const totalPages: number =
      typeof raw?.totalPages === "number" ? raw.totalPages :
      typeof raw?.pagination?.totalPages === "number" ? raw.pagination.totalPages :
      Math.ceil(total / resolvedLimit);

    return {
      customers,
      total,
      page: resolvedPage,
      limit: resolvedLimit,
      totalPages,
    };
  } catch (err) {
    throw toCustomerApiError(err, "customers list");
  }
}

// ── POST /api/customers ──────────────────────────────────────────────────────

export async function createCustomer(
  payload: CreateCustomerPayload
): Promise<CanonicalCustomer> {
  try {
    const res = await api.post(CUSTOMERS_BASE, payload);
    const data = unwrapEnvelope<CanonicalCustomer>(res.data);
    if (!data || typeof data !== "object" || !(data as any).id) {
      throw new CustomerApiError("unknown", "Failed to create customer — invalid response.");
    }
    return data as CanonicalCustomer;
  } catch (err: any) {
    const ax = err as AxiosError;
    if (ax?.isAxiosError && ax.response?.status === 409) {
      throw new CustomerApiError(
        "unknown",
        (ax.response?.data as any)?.message || "Duplicate customer — a record with these identifiers already exists.",
        409
      );
    }
    throw toCustomerApiError(err, "creating customer");
  }
}

// ── GET /api/customers/:id (canonical, non-360) ──────────────────────────────

export async function fetchCanonicalCustomerById(
  id: string
): Promise<CanonicalCustomer> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    const res = await api.get(`${CUSTOMERS_BASE}/${encodeURIComponent(id)}`);
    const data = unwrapEnvelope<CanonicalCustomer>(res.data);
    if (!data || typeof data !== "object" || !(data as any).id) {
      throw new CustomerApiError("not_found", "This customer was not found.", 404);
    }
    return data as CanonicalCustomer;
  } catch (err) {
    throw toCustomerApiError(err, "this customer");
  }
}

// ── PATCH /api/customers/:id ─────────────────────────────────────────────────

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload
): Promise<CanonicalCustomer> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    const res = await api.patch(`${CUSTOMERS_BASE}/${encodeURIComponent(id)}`, payload);
    const data = unwrapEnvelope<CanonicalCustomer>(res.data);
    return data as CanonicalCustomer;
  } catch (err: any) {
    const ax = err as AxiosError;
    if (ax?.isAxiosError && ax.response?.status === 409) {
      throw new CustomerApiError(
        "unknown",
        (ax.response?.data as any)?.message || "Identifier conflict — another customer uses these identifiers.",
        409
      );
    }
    throw toCustomerApiError(err, "updating customer");
  }
}

// ── DELETE /api/customers/:id ────────────────────────────────────────────────

export async function deleteCustomer(
  id: string
): Promise<{ success: boolean; message: string }> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    await api.delete(`${CUSTOMERS_BASE}/${encodeURIComponent(id)}`);
    return { success: true, message: "Customer deleted successfully." };
  } catch (err) {
    throw toCustomerApiError(err, "deleting customer");
  }
}

// ── POST /api/customers/resolve ──────────────────────────────────────────────

export async function resolveCustomerIdentity(
  payload: IdentityResolvePayload
): Promise<IdentityResolveResult> {
  try {
    const res = await api.post(`${CUSTOMERS_BASE}/resolve`, payload);
    const data = unwrapEnvelope<any>(res.data);
    return {
      resolved: Boolean(data?.resolved),
      customer: data?.customer ?? null,
      confidence: typeof data?.confidence === "number" ? data.confidence : null,
      matches: Array.isArray(data?.matches) ? data.matches : [],
      metadata: data?.metadata ?? null,
    } as IdentityResolveResult;
  } catch (err) {
    throw toCustomerApiError(err, "identity resolution");
  }
}

// ── POST /api/customers/convert-lead ─────────────────────────────────────────

export async function convertLeadToCustomer(
  payload: ConvertLeadPayload
): Promise<ConvertLeadResult> {
  try {
    const cleanedPayload: Record<string, any> = { ...payload };
    Object.keys(cleanedPayload).forEach((key) => {
      if (cleanedPayload[key] === "" || cleanedPayload[key] === null || cleanedPayload[key] === undefined) {
        delete cleanedPayload[key];
      }
    });

    const res = await api.post(`${CUSTOMERS_BASE}/convert-lead`, cleanedPayload);
    const data = unwrapEnvelope<any>(res.data);
    return {
      success: true,
      customerId: data?.customerId ?? data?.customer?.id ?? undefined,
      contactId: data?.contactId ?? data?.contact?.id ?? undefined,
      dealId: data?.dealId ?? data?.deal?.id ?? undefined,
      message: data?.message ?? "Lead converted successfully.",
    };
  } catch (err) {
    throw toCustomerApiError(err, "converting lead");
  }
}

// ── POST /api/customers/convert-company ──────────────────────────────────────

export async function convertCompanyToCustomer(
  payload: ConvertCompanyPayload
): Promise<ConvertCompanyResult> {
  try {
    const cleanedPayload: Record<string, any> = { ...payload };
    Object.keys(cleanedPayload).forEach((key) => {
      if (cleanedPayload[key] === "" || cleanedPayload[key] === null || cleanedPayload[key] === undefined) {
        delete cleanedPayload[key];
      }
    });

    const res = await api.post(`${CUSTOMERS_BASE}/convert-company`, cleanedPayload);
    const data = unwrapEnvelope<any>(res.data);
    return {
      success: true,
      customerId: data?.customerId ?? data?.customer?.id ?? undefined,
      message: data?.message ?? "Company converted successfully.",
    };
  } catch (err) {
    throw toCustomerApiError(err, "converting company");
  }
}

// ── Team members (for owner selects) ─────────────────────────────────────────

export async function fetchCustomerOwners(): Promise<Array<{ id: string; name: string; email?: string }>> {
  try {
    const res = await api.get("/organizations/team-members");
    const raw = unwrapEnvelope<any>(res.data);
    const list =
      Array.isArray(raw)           ? raw :
      Array.isArray(raw?.data)     ? raw.data :
      Array.isArray(raw?.members)  ? raw.members :
      [];
    return list.map((m: any) => ({
      id: m.id || m.userId,
      name: m.name || m.fullName || `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Unnamed",
      email: m.email,
    })).filter((m: { id: string }) => m.id);
  } catch {
    return [];
  }
}
