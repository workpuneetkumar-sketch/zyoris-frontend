// types/customer360.ts
// ─────────────────────────────────────────────────────────────────────────────
// Customer 360 — shared DTO types.
//
// SOURCE OF TRUTH: the frozen Platform API contracts published at
// https://zyoris.onrender.com/docs/ . These interfaces MIRROR that contract —
// do NOT introduce a second/parallel customer model elsewhere in the app.
//
//   • GET /api/customers/:id                         — Sakshi   (canonical customer record)
//   • GET /api/customers/:id/graph                   — Manish   (relationship graph)
//   • GET /api/customers/:id/timeline                — Prashant (Customer Timeline service)
//   • GET /api/customers/:companyId/relationships    — Manish   (relationship hierarchy / stakeholders)
//   • GET /crm/communication-intelligence/:leadId    — Ayush    (AI communication intelligence)
//
// Contract gaps tracked for the Platform team (see PR description):
//   • GET /api/customers/:id has no documented response schema — the canonical
//     fields below are taken from the create/list payloads.
//   • RelationshipEdge carries no contact identity fields (name/title/email), so
//     the Stakeholders list can only show the role + relationship type.
//   • No customer-scoped contract exists for Health, Products, Financials or
//     Service — those sections render an explicit "not available yet" state.
//
// Platform Team alignment rule: every displayed fact that the backend sources
// from an external system MUST carry its provenance. That is modelled by the
// `Provenance` type and the `Sourced<T>` wrapper below. UI must render a
// provenance affordance wherever `provenance` is present.
// ─────────────────────────────────────────────────────────────────────────────

import type { CanonicalType, LifecycleState } from "@/types/customers";

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

// ── GET /api/customers/:id (canonical customer record) ───────────────────────

/**
 * Canonical response of GET /api/customers/:id.
 *
 * The frozen contract returns the canonical customer record only — it does NOT
 * embed health, products, financials, service or AI sections. Those surfaces are
 * loaded from their own endpoints (or shown as unavailable where no contract
 * exists yet).
 */
export interface CustomerSummary {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
  externalSystem?: string | null;
  canonicalType?: CanonicalType | null;
  lifecycleState?: LifecycleState | null;
  ownerId?: string | null;
  owner?: {
    id: string;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  /** Linked source records — the join keys for the other 360 sections. */
  companyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  /**
   * Provenance for the record as a whole — derived from `externalSystem` /
   * `externalId` when the customer is mastered in an external CRM.
   */
  provenance?: Provenance | null;
}

// ── GET /api/customers/:id/graph ─────────────────────────────────────────────
// Backend contract (Swagger) uses nodeType / refId / fromNodeId / toNodeId /
// relationshipType; the normaliser in customersApi.ts bridges those onto the
// type / label / source / target shape the GraphSection renders.

export type CustomerGraphNodeType =
  | "customer"
  | "company"
  | "contact"
  | "person"
  | "stakeholder"
  | "deal"
  | "user"
  | "product"
  | "subscription"
  | "interaction"
  | "document"
  | "payment"
  | "ai_action"
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
  kind?: string | null; // e.g. "WORKS_AT", "HAS_DEAL", "STAKEHOLDER_OF"
  strength?: number | null;
  provenance?: Provenance | null;
}

/** Canonical response of GET /api/customers/:id/graph */
export interface CustomerGraph {
  customerId: string;
  nodes: CustomerGraphNode[];
  edges: CustomerGraphEdge[];
  generatedAt?: string | null;
}

// ── GET /api/customers/:companyId/relationships (Stakeholders) ────────────────

export type RelationshipType =
  | "PARENT_OF"
  | "SUBSIDIARY_OF"
  | "PARTNER_OF"
  | "RELATED_ACCOUNT_OF"
  | "DECISION_MAKER_OF"
  | "INFLUENCER_OF"
  | "BUYING_COMMITTEE_MEMBER_OF";

export type InfluenceLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** One edge of GET /api/customers/:companyId/relationships → { relationships } */
export interface RelationshipEdge {
  id: string;
  fromNodeId?: string | null;
  toNodeId?: string | null;
  relationshipType: RelationshipType;
  influenceLevel?: InfluenceLevel | null;
  role?: string | null;
  strength?: number | null;
  source?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /**
   * Contact identity is NOT part of the frozen RelationshipEdge schema. Read it
   * defensively in case the backend enriches the edge — the Stakeholders
   * section degrades to role + relationship type when it is absent.
   */
  contact?: {
    id?: string | null;
    name?: string | null;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

/** Stakeholder-relevant relationship types (person → account). */
export const STAKEHOLDER_RELATIONSHIP_TYPES: RelationshipType[] = [
  "DECISION_MAKER_OF",
  "INFLUENCER_OF",
  "BUYING_COMMITTEE_MEMBER_OF",
];

/** UI view model for the Stakeholders section — mapped from RelationshipEdge. */
export interface CustomerStakeholder {
  id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  influence?: "high" | "medium" | "low" | null;
  provenance?: Provenance | null;
}

// ── GET /crm/communication-intelligence/:leadId (AI Insights + Health) ───────

export type CommIntelIntent =
  | "HIGH_INTENT"
  | "EXPLORATORY"
  | "PRICE_SHOPPING"
  | "STALLED";

export type CommIntelMood =
  | "ENTHUSIASTIC"
  | "SATISFIED"
  | "NEUTRAL"
  | "FRUSTRATED"
  | "ANXIOUS";

export type CommIntelUrgency = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type CommIntelRiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface CommunicationIntelligence {
  intent?: CommIntelIntent | null;
  intentExplanation?: string | null;
  mood?: CommIntelMood | null;
  moodDrivers?: string | null;
  /** 0–100 buying probability / lead score. */
  buyingProbability?: number | null;
  probabilityFactors?: string[];
  urgency?: CommIntelUrgency | null;
  urgencyTriggers?: string | null;
  risk?: Array<{
    riskLevel?: CommIntelRiskLevel | null;
    description?: string | null;
    sourceChannel?: string | null;
  }>;
  nextBestAction?: {
    actionTitle?: string | null;
    detailedRationale?: string | null;
    recommendedChannel?: string | null;
    priority?: string | null;
  } | null;
  suggestedFollowUp?: { date?: string | null; reason?: string | null } | null;
  communicationSummary?: string | null;
}

export type HealthBand = "healthy" | "neutral" | "at_risk" | "critical";

/** UI view model for the Health section — derived from CommunicationIntelligence. */
export interface CustomerHealth {
  /** 0–100. */
  score?: number | null;
  band?: HealthBand | null;
  summary?: string | null;
  factors?: Array<{
    label: string;
    impact: "positive" | "negative" | "neutral";
    detail?: string | null;
  }>;
  provenance?: Provenance | null;
}

export interface CustomerAiInsight {
  id: string;
  kind: "risk" | "opportunity" | "next_best_action" | "summary";
  title: string;
  body?: string | null;
  confidence?: number | null;
  generatedAt?: string | null;
  model?: string | null;
  provenance?: Provenance | null;
}

// ── Sections with no frozen customer-scoped contract yet ─────────────────────
// Products / Financials / Service render an explicit "not available from the
// Platform Customer 360 API yet" state. The view models are kept so the sections
// compile and can be wired the moment a contract ships.

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
  csat?: SourcedOptional<number>;
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
