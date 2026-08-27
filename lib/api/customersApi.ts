// lib/api/customersApi.ts
// Typed API client for the Customer 360 page.
//
// Uses the shared axios instance (`@/lib/api/api`) — auth header, token refresh
// and logout redirect are handled there.
//
// Endpoints (see types/customer360.ts for the contract these mirror):
//   • GET /api/customers/:id          — Sakshi  (canonical customer summary)
//   • GET /api/customers/:id/graph    — Manish  (relationship graph)
//   • GET /customers/:id/timeline     — Customer Timeline service (live)
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

const CUSTOMERS_BASE = "/api/customers";
const TIMELINE_BASE = "/customers";

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

// ── GET /customers/:id/timeline ─────────────────────────────────────────────

export async function fetchCustomerTimeline(
  id: string,
  query: CustomerTimelineQuery = {}
): Promise<CustomerTimelinePage> {
  if (!id) throw new CustomerApiError("not_found", "No customer id was provided.", 404);
  try {
    const res = await api.get(`${TIMELINE_BASE}/${encodeURIComponent(id)}/timeline`, {
      params: query,
    });
    const page = unwrapEnvelope<CustomerTimelinePage>(res.data);
    return {
      events: Array.isArray(page?.events) ? page.events : [],
      nextCursor: page?.nextCursor ?? null,
    };
  } catch (err) {
    throw toCustomerApiError(err, "the customer timeline");
  }
}
