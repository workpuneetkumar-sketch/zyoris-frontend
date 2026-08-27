// types/customer360.ts
// ─────────────────────────────────────────────────────────────────────────────
// Customer 360 — shared DTO types.
//
// SOURCE OF TRUTH: the backend API contract.
//   • GET /api/customers/:id           — owned by Sakshi  (canonical customer summary)
//   • GET /api/customers/:id/graph      — owned by Manish   (relationship graph)
//   • GET /api/customers/:id/timeline   — owned by Prashant (Customer Timeline service)
//
// These interfaces MIRROR that contract. They are the single frontend
// representation of the Customer 360 domain — do NOT introduce a second/parallel
// customer model elsewhere in the app. When the backend publishes a generated
// contract package (e.g. @zyoris/api-contract), replace the hand-written blocks
// below with re-exports from it and keep this file as the import barrel:
//
//   export type { CustomerSummary, CustomerGraph } from "@zyoris/api-contract";
//
// Platform Team alignment rule: every displayed fact that the backend sources
// from an external system MUST carry its provenance. That is modelled by the
// `Provenance` type and the `Sourced<T>` wrapper below. UI must render a
// provenance affordance wherever `provenance` is present.
// ─────────────────────────────────────────────────────────────────────────────

/** Where a value came from, when the backend supplies attribution. */
export interface Provenance {
  /** System of record, e.g. "SALESFORCE", "HUBSPOT", "STRIPE", "INTERNAL". */
  source: string;
  /** Optional delivery channel, e.g. "EMAIL", "API", "IMPORT". */
  channel?: string | null;
  /** Model/pipeline confidence in [0, 1] when the value is inferred. */
  confidence?: number | null;
  /** Identifier of the record in the source system. */
  externalId?: string | null;
  /** ISO-8601 timestamp the value was last observed/synced from the source. */
  observedAt?: string | null;
  /** Free-form extra attribution the backend may attach. */
  details?: Record<string, unknown> | null;
}

/**
 * A value paired with its provenance. The backend returns this shape for any
 * fact that originates outside Zyoris. `provenance` is `null` for facts that are
 * purely internal (no external attribution required).
 */
export interface Sourced<T> {
  value: T;
  provenance: Provenance | null;
}

/** Convenience: a `Sourced<T>` whose value may itself be absent. */
export type SourcedOptional<T> = Sourced<T | null>;

// ── GET /api/customers/:id ───────────────────────────────────────────────────

export type CustomerLifecycleStage =
  | "prospect"
  | "onboarding"
  | "active"
  | "at_risk"
  | "churned"
  | "renewed";

export type HealthBand = "healthy" | "neutral" | "at_risk" | "critical";

export interface CustomerContextSummary {
  /** One-paragraph narrative summary of the account (may be AI-generated). */
  headline?: string | null;
  lifecycleStage?: CustomerLifecycleStage | null;
  accountOwner?: SourcedOptional<{ id: string; name: string; email?: string | null }>;
  segment?: SourcedOptional<string>;
  industry?: SourcedOptional<string>;
  region?: SourcedOptional<string>;
  since?: string | null; // ISO date the account relationship started
  tags?: string[];
}

export interface CustomerHealth {
  score?: SourcedOptional<number>; // 0–100
  band?: HealthBand | null;
  trend?: "up" | "down" | "flat" | null;
  factors?: Array<
    Sourced<{
      label: string;
      impact: "positive" | "negative" | "neutral";
      weight?: number | null;
      detail?: string | null;
    }>
  >;
  lastEvaluatedAt?: string | null;
}

export interface CustomerStakeholder {
  id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: "champion" | "economic_buyer" | "decision_maker" | "influencer" | "user" | "detractor" | null;
  influence?: "high" | "medium" | "low" | null;
  sentiment?: "positive" | "neutral" | "negative" | null;
  lastInteractionAt?: string | null;
  provenance?: Provenance | null;
}

export interface CustomerProduct {
  id: string;
  name: string;
  sku?: string | null;
  status?: "active" | "trial" | "expired" | "cancelled" | "pending" | null;
  seats?: number | null;
  activatedAt?: string | null;
  renewalDate?: string | null;
  provenance?: Provenance | null;
}

export interface CustomerFinancials {
  currency?: string | null;
  arr?: SourcedOptional<number>;
  mrr?: SourcedOptional<number>;
  lifetimeValue?: SourcedOptional<number>;
  openInvoicesTotal?: SourcedOptional<number>;
  overdueInvoicesTotal?: SourcedOptional<number>;
  lastPaymentAt?: string | null;
  lastPaymentAmount?: number | null;
  nextRenewalDate?: string | null;
  nextRenewalAmount?: number | null;
}

export interface CustomerServiceSummary {
  openTickets?: SourcedOptional<number>;
  breachedSlas?: SourcedOptional<number>;
  csat?: SourcedOptional<number>; // 0–100 or 0–5 depending on source; render as supplied
  lastTicketAt?: string | null;
  recentTickets?: Array<{
    id: string;
    subject: string;
    status: string;
    priority?: string | null;
    updatedAt?: string | null;
    provenance?: Provenance | null;
  }>;
}

export interface CustomerAiInsight {
  id: string;
  kind: "risk" | "opportunity" | "next_best_action" | "summary";
  title: string;
  body?: string | null;
  confidence?: number | null;
  generatedAt?: string | null;
  model?: string | null;
  /** Facts/events the insight was derived from. */
  provenance?: Provenance | null;
}

/** Canonical response of GET /api/customers/:id */
export interface CustomerSummary {
  id: string;
  name: string;
  /** Optional external/human-facing account number. */
  accountNumber?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  context: CustomerContextSummary;
  health?: CustomerHealth | null;
  stakeholders?: CustomerStakeholder[];
  products?: CustomerProduct[];
  financials?: CustomerFinancials | null;
  service?: CustomerServiceSummary | null;
  aiInsights?: CustomerAiInsight[];

  /** Provenance for the record as a whole (which CRM it is mastered in). */
  provenance?: Provenance | null;
}

// ── GET /api/customers/:id/graph ─────────────────────────────────────────────

export type CustomerGraphNodeType =
  | "customer"
  | "company"
  | "contact"
  | "deal"
  | "user"
  | "product"
  | "parent_account"
  | "subsidiary";

export interface CustomerGraphNode {
  id: string;
  type: CustomerGraphNodeType;
  label: string;
  /** True for the customer this page is about. */
  isRoot?: boolean;
  meta?: Record<string, unknown> | null;
  provenance?: Provenance | null;
}

export interface CustomerGraphEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  label?: string | null;
  kind?: string | null; // e.g. "reports_to", "owns", "parent_of"
  provenance?: Provenance | null;
}

/** Canonical response of GET /api/customers/:id/graph */
export interface CustomerGraph {
  customerId: string;
  nodes: CustomerGraphNode[];
  edges: CustomerGraphEdge[];
  generatedAt?: string | null;
}

// ── GET /api/customers/:id/timeline (Customer Timeline service — Prashant) ────

export interface CustomerTimelineEvent {
  id: string;
  organizationId: string;
  customerId: string;
  sourceEventId: string;
  idempotencyKey: string;
  eventType: string; // e.g. "status_changed", "note_added", "invoice_paid"
  source: string; // "INTERNAL" or an external system id
  channel?: string | null;
  confidence?: number | null;
  payloadVersion: string;
  metadata?: Record<string, unknown> | null;
  externalId?: string | null;
  provenance?: Record<string, unknown> | null;
  actorId?: string | null;
  actorName?: string | null;
  relatedEntityIds: string[];
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTimelinePage {
  events: CustomerTimelineEvent[];
  nextCursor: string | null;
}

/** Wire query for GET /api/customers/:id/timeline — mirrors the backend 1:1. */
export interface CustomerTimelineQuery {
  cursor?: string;
  /** Comma-separated backend `eventType` values. */
  types?: string;
  /** ISO-8601 lower bound (inclusive). */
  from?: string;
  /** ISO-8601 upper bound (inclusive). */
  to?: string;
}

/**
 * UI-side filter state for the Timeline section. `types` holds the exact
 * backend `eventType` strings (no re-mapping) so it serialises straight into
 * `CustomerTimelineQuery.types`.
 */
export interface CustomerTimelineFilters {
  types: string[];
  from: string | null;
  to: string | null;
}

export const EMPTY_TIMELINE_FILTERS: CustomerTimelineFilters = {
  types: [],
  from: null,
  to: null,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Narrow a `Sourced<T>` (or plain value) to its underlying value. */
export function unwrap<T>(v: Sourced<T> | T | null | undefined): T | null {
  if (v == null) return null;
  if (typeof v === "object" && v !== null && "value" in (v as object)) {
    return (v as Sourced<T>).value ?? null;
  }
  return v as T;
}

/** Extract provenance from a `Sourced<T>` or an object that carries `provenance`. */
export function provenanceOf(
  v: Sourced<unknown> | { provenance?: Provenance | null } | null | undefined
): Provenance | null {
  if (!v || typeof v !== "object") return null;
  return ("provenance" in v ? v.provenance : null) ?? null;
}
