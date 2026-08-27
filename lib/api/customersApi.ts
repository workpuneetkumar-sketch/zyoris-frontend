// lib/api/customersApi.ts
// Typed API client for the Customer 360 page.
//
// Uses the shared axios instance (`@/lib/api/api`) — auth header, token refresh
// and logout redirect are handled there.
//
// Endpoints (see types/customer360.ts for the contract these mirror):
//   • GET /api/customers/:id                   — Sakshi   (canonical customer summary)
//   • GET /api/customers/:id/graph             — Manish   (relationship graph)
//   • GET /api/customers/:id/timeline          — Prashant (Customer Timeline service, live)
//
// All three live behind the `/api/customers` prefix on the backend — the bare
// `/customers/...` path is not routed (404).
//
// No domain types are declared here — they live in types/customer360.ts so the
// app has exactly one Customer 360 model.

import { AxiosError } from "axios";
import api from "@/lib/api/api";
import type {
  CustomerGraph,
  CustomerGraphEdge,
  CustomerGraphNode,
  CustomerGraphNodeType,
  CustomerSummary,
  CustomerTimelineEvent,
  CustomerTimelinePage,
  CustomerTimelineQuery,
} from "@/types/customer360";
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

export async function fetchCustomerById(id: string): Promise<CustomerSummary> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    const res = await api.get(`${CUSTOMERS_BASE}/${encodeURIComponent(id)}`);
    const customer = unwrapEnvelope<CustomerSummary>(res.data);
    if (!customer || typeof customer !== "object" || !customer.id) {
      throw new CustomerApiError("not_found", "This customer was not found.", 404);
    }
    return customer;
  } catch (err) {
    throw toCustomerApiError(err, "this customer");
  }
}

// ── Graph + Timeline — backend contract normalization + mock fallback ───────
//
// These two endpoints are backed by separate services (Manish / Prashant) and
// may return 404 while still under development. Instead of surfacing the raw
// error and blanking the 360 page, we return a well-shaped mock dataset tagged
// with provenance.source = "BACKEND_PENDING" so the UI renders cleanly and
// provenance badges clearly indicate which records are synthetic placeholders.
// The live API is always attempted first — mocks only fire on 404 / network /
// empty response.
//
// Additionally, the graph backend contract uses `nodeType` / `refId` /
// `fromNodeId` / `toNodeId` (per Swagger) while the frontend types use
// `type` / `label` / `source` / `target`. The normalizer bridge below makes
// both contracts coexist transparently.

const BACKEND_PENDING_PROVENANCE = {
  source: "BACKEND_PENDING",
  channel: "MOCK",
  confidence: 0,
  externalId: null,
  observedAt: new Date().toISOString(),
  details: { note: "Backend endpoint not available yet — placeholder data until /graph and /timeline services are live." },
} as const;

function mockId(prefix: string, salt: string, idx = 0): string {
  const hash = Array.from(salt + String(idx)).reduce(
    (a, c) => (a * 31 + c.charCodeAt(0)) >>> 0,
    7
  );
  return `${prefix}_${hash.toString(36).padStart(10, "0")}`;
}

function normalizeGraphNodes(rawNodes: any[]): CustomerGraphNode[] {
  return rawNodes.map((rn: any) => {
    const nodeType: CustomerGraphNodeType =
      (rn.nodeType ?? rn.type ?? "customer").toLowerCase();
    return {
      id: String(rn.id ?? rn.refId ?? mockId("n", JSON.stringify(rn))),
      type: nodeType,
      label: String(rn.label ?? rn.name ?? nodeType),
      isRoot: Boolean(rn.isRoot),
      meta: rn.meta ?? rn.metadata ?? null,
      provenance: rn.provenance ?? null,
    };
  });
}

function normalizeGraphEdges(rawEdges: any[]): CustomerGraphEdge[] {
  return rawEdges.map((re: any) => ({
    id: String(re.id ?? mockId("e", JSON.stringify(re))),
    source: String(re.source ?? re.fromNodeId ?? ""),
    target: String(re.target ?? re.toNodeId ?? ""),
    label: re.label ?? null,
    kind: re.kind ?? re.relationshipType ?? null,
    provenance: re.provenance ?? null,
  }));
}

function buildMockGraph(customerId: string, customerName: string): CustomerGraph {
  const now = new Date();
  const rootId = mockId("n", customerId + "root");
  const companyId = mockId("n", customerId + "co");
  const contact1Id = mockId("n", customerId + "c1");
  const contact2Id = mockId("n", customerId + "c2");
  const dealId = mockId("n", customerId + "d1");
  const ownerId = mockId("n", customerId + "owner");
  const productId = mockId("n", customerId + "prod");

  const nodes: CustomerGraphNode[] = [
    {
      id: rootId,
      type: "customer",
      label: customerName || "Customer account",
      isRoot: true,
      meta: null,
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: companyId,
      type: "company",
      label: customerName ? `${customerName} HQ` : "Parent company",
      meta: null,
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: contact1Id,
      type: "contact",
      label: "Jane Doe",
      meta: { title: "VP of Engineering", email: "jane.doe@example.com" },
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: contact2Id,
      type: "contact",
      label: "Raj Patel",
      meta: { title: "Procurement Manager", email: "raj.patel@example.com" },
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: dealId,
      type: "deal",
      label: "Q3 Enterprise Renewal",
      meta: { amount: 48000, currency: "USD", stage: "Negotiation" },
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: ownerId,
      type: "user",
      label: "Demo User",
      meta: { role: "Account Owner", email: "demo@zyoris.ai" },
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: productId,
      type: "product",
      label: "Zyoris Platform - Enterprise",
      meta: { sku: "ZYR-ENT-ANN", seats: 120 },
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
  ];

  const edges: CustomerGraphEdge[] = [
    {
      id: mockId("e", customerId + "root-co", 1),
      source: rootId,
      target: companyId,
      label: "Belongs to",
      kind: "belongs_to",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: mockId("e", customerId + "root-c1", 2),
      source: rootId,
      target: contact1Id,
      label: "Stakeholder",
      kind: "stakeholder",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: mockId("e", customerId + "root-c2", 3),
      source: rootId,
      target: contact2Id,
      label: "Buyer",
      kind: "buyer",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: mockId("e", customerId + "root-d1", 4),
      source: rootId,
      target: dealId,
      label: "Open deal",
      kind: "has_deal",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: mockId("e", customerId + "root-owner", 5),
      source: rootId,
      target: ownerId,
      label: "Owned by",
      kind: "owned_by",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: mockId("e", customerId + "root-prod", 6),
      source: rootId,
      target: productId,
      label: "Subscribed to",
      kind: "subscribed_to",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: mockId("e", customerId + "c1-co", 7),
      source: contact1Id,
      target: companyId,
      label: "Works at",
      kind: "works_at",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
    {
      id: mockId("e", customerId + "c2-co", 8),
      source: contact2Id,
      target: companyId,
      label: "Works at",
      kind: "works_at",
      provenance: { ...BACKEND_PENDING_PROVENANCE },
    },
  ];

  return {
    customerId,
    nodes,
    edges,
    generatedAt: now.toISOString(),
  };
}

function buildMockTimeline(
  customerId: string,
  customerName: string
): CustomerTimelinePage {
  const now = Date.now();
  const orgId = mockId("org", customerId);

  const eventTypes = [
    { type: "status_changed", channel: "INTERNAL", source: "INTERNAL" },
    { type: "note_added", channel: "EMAIL", source: "INTERNAL" },
    { type: "meeting_scheduled", channel: "CALENDAR", source: "GOOGLE" },
    { type: "invoice_paid", channel: "PAYMENT", source: "STRIPE" },
    { type: "deal_stage_changed", channel: "CRM", source: "HUBSPOT" },
    { type: "email_opened", channel: "EMAIL", source: "SENDGRID" },
    { type: "task_completed", channel: "INTERNAL", source: "INTERNAL" },
    { type: "contract_signed", channel: "SIGNATURE", source: "DOCUSIGN" },
  ];

  const samples: Array<Partial<CustomerTimelineEvent> & { title?: string; detail?: string; hoursAgo?: number }> = [
    {
      eventType: "status_changed",
      source: "INTERNAL",
      channel: null,
      actorName: "Demo User",
      title: "Customer promoted to ACTIVE",
      metadata: { from: "PROSPECT", to: "ACTIVE", reason: "Contract executed" },
      hoursAgo: 1,
    },
    {
      eventType: "contract_signed",
      source: "DOCUSIGN",
      channel: "SIGNATURE",
      actorName: "Jane Doe",
      title: "MS-1234 Enterprise contract signed",
      metadata: { contractId: "MS-1234", value: 48000, currency: "USD", signer: "jane.doe@example.com" },
      hoursAgo: 5,
    },
    {
      eventType: "deal_stage_changed",
      source: "HUBSPOT",
      channel: "CRM",
      actorName: "Demo User",
      title: "Deal moved to Negotiation",
      metadata: { dealName: "Q3 Enterprise Renewal", fromStage: "Proposal", toStage: "Negotiation", probability: 0.75 },
      hoursAgo: 20,
    },
    {
      eventType: "invoice_paid",
      source: "STRIPE",
      channel: "PAYMENT",
      actorName: "Raj Patel",
      title: "Invoice INV-4021 paid in full",
      metadata: { invoiceId: "INV-4021", amount: 12000, currency: "USD", method: "wire_transfer" },
      hoursAgo: 36,
    },
    {
      eventType: "meeting_scheduled",
      source: "GOOGLE",
      channel: "CALENDAR",
      actorName: "Jane Doe",
      title: "Kickoff meeting scheduled",
      metadata: { subject: "Zyoris Platform Kickoff", startTime: new Date(now + 86400000 * 2).toISOString(), attendees: 5 },
      hoursAgo: 48,
    },
    {
      eventType: "email_opened",
      source: "SENDGRID",
      channel: "EMAIL",
      title: "Proposal email opened",
      metadata: { subject: "Proposal - Zyoris Enterprise Plan", emailId: "eml_987654", opens: 3 },
      hoursAgo: 72,
    },
    {
      eventType: "note_added",
      source: "INTERNAL",
      channel: "EMAIL",
      actorName: "Demo User",
      title: "Discovery call notes",
      metadata: {
        summary:
          "Customer has 120 seats across 3 business units. Prioritized integration with Salesforce and Slack. Security review expected in week 2.",
      },
      hoursAgo: 96,
    },
    {
      eventType: "task_completed",
      source: "INTERNAL",
      channel: "INTERNAL",
      actorName: "Demo User",
      title: "Security questionnaire completed",
      metadata: { taskId: "tsk_1092", dueAt: new Date(now - 86400000 * 5).toISOString() },
      hoursAgo: 120,
    },
  ];

  const events: CustomerTimelineEvent[] = samples.map((s, i) => {
    const typeMeta = eventTypes.find((e) => e.type === s.eventType) ?? eventTypes[0];
    const ts = new Date(now - (s.hoursAgo ?? i * 24) * 3600 * 1000);
    return {
      id: mockId("ev", customerId, i),
      organizationId: orgId,
      customerId,
      sourceEventId: mockId("sev", customerId, i),
      idempotencyKey: `mock:${customerId}:${s.eventType}:${ts.getTime()}`,
      eventType: s.eventType!,
      source: s.source ?? typeMeta.source,
      channel: s.channel ?? typeMeta.channel ?? null,
      confidence: 1,
      payloadVersion: "1.0",
      metadata: {
        ...(s.metadata ?? {}),
        __backend_pending_title: s.title ?? null,
      },
      externalId: null,
      provenance: { ...BACKEND_PENDING_PROVENANCE },
      actorId: s.actorName ? mockId("u", s.actorName, i) : null,
      actorName: s.actorName ?? null,
      relatedEntityIds: [
        mockId("ent", customerId + "a", i),
        mockId("ent", customerId + "b", i),
      ],
      timestamp: ts.toISOString(),
      createdAt: ts.toISOString(),
      updatedAt: new Date(ts.getTime() + 60_000).toISOString(),
    };
  });

  return {
    events,
    nextCursor: null,
  };
}

// ── GET /api/customers/:id/graph ────────────────────────────────────────────

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

    // Empty backend response → empty graph, let the UI render its empty state.
    // No mocking here — only 404 / unreachable endpoints fall back to placeholders.
    return {
      customerId: raw?.customerId ?? raw?.rootNodeId ?? id,
      nodes: normalizeGraphNodes(rawNodes),
      edges: normalizeGraphEdges(rawEdges),
      generatedAt: raw?.generatedAt ?? null,
    };
  } catch (err) {
    const ax = err as AxiosError;
    const status = ax?.isAxiosError ? ax.response?.status : undefined;
    const isNotFoundOrUnroutable =
      status === 404 ||
      status === 501 ||
      status === 502 ||
      !ax?.isAxiosError;

    if (isNotFoundOrUnroutable) {
      return buildMockGraph(id, `Customer ${id}`);
    }
    throw toCustomerApiError(err, "the relationship graph");
  }
}

// ── GET /api/customers/:id/timeline ─────────────────────────────────────────
// Cursor-paginated. Filters mirror the backend query contract exactly:
//   cursor  — nextCursor from the previous page
//   types   — comma-separated backend eventType values
//   from/to — ISO-8601 timestamps (inclusive bounds)
// Empty filters are omitted so the backend applies its own defaults.

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

    // Empty backend response → empty array, let the UI render its empty state.
    // Filters (types/from/to) are handled server-side; we only need to pass
    // through what comes back.
    return {
      events,
      nextCursor: raw?.nextCursor ?? null,
    };
  } catch (err) {
    const ax = err as AxiosError;
    const status = ax?.isAxiosError ? ax.response?.status : undefined;
    const isNotFoundOrUnroutable =
      status === 404 ||
      status === 501 ||
      status === 502 ||
      !ax?.isAxiosError;

    if (isNotFoundOrUnroutable) {
      let all = buildMockTimeline(id, `Customer ${id}`).events;
      if (query.types) {
        const include = new Set(query.types.split(",").map((t) => t.trim()).filter(Boolean));
        all = all.filter((e) => include.has(e.eventType));
      }
      if (query.from) {
        const fromTs = new Date(query.from).getTime();
        if (!Number.isNaN(fromTs)) all = all.filter((e) => new Date(e.timestamp).getTime() >= fromTs);
      }
      if (query.to) {
        const toTs = new Date(query.to).getTime();
        if (!Number.isNaN(toTs)) all = all.filter((e) => new Date(e.timestamp).getTime() <= toTs);
      }
      return { events: all, nextCursor: null };
    }
    throw toCustomerApiError(err, "the customer timeline");
  }
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
    const res = await api.post(`${CUSTOMERS_BASE}/convert-lead`, payload);
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
    const res = await api.post(`${CUSTOMERS_BASE}/convert-company`, payload);
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
