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
  CustomerSummary,
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

// ── GET /api/customers/:id/graph ────────────────────────────────────────────

export async function fetchCustomerGraph(id: string): Promise<CustomerGraph> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    const res = await api.get(`${CUSTOMERS_BASE}/${encodeURIComponent(id)}/graph`);
    const graph = unwrapEnvelope<CustomerGraph>(res.data);
    return {
      customerId: graph?.customerId ?? id,
      nodes: Array.isArray(graph?.nodes) ? graph.nodes : [],
      edges: Array.isArray(graph?.edges) ? graph.edges : [],
      generatedAt: graph?.generatedAt ?? null,
    };
  } catch (err) {
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
    const page = unwrapEnvelope<CustomerTimelinePage>(res.data);
    return {
      events: Array.isArray(page?.events) ? page.events : [],
      nextCursor: page?.nextCursor ?? null,
    };
  } catch (err) {
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
