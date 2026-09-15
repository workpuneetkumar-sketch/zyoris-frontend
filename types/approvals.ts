/**
 * types/approvals.ts
 * ─────────────────────────────────────────────────────────────
 * TypeScript types for the Approval Queue and Approval Detail.
 *
 * Non-negotiable rule: the frontend never approves or rejects
 * locally. Every decision is sent to POST /api/approvals/:id/decide
 * and the UI re-fetches to reflect server state.
 */

import type { RiskTier } from "@/types/agents";

export type { RiskTier };

// ─── Approval lifecycle status ────────────────────────────────────────────────

/**
 * All possible backend-authoritative approval statuses.
 * Once APPROVED, REJECTED, or EXPIRED the decide UI must be
 * disabled and the reason shown.
 */
export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

// ─── Core approval types ──────────────────────────────────────────────────────

/**
 * Evidence/reasoning provided by the agent when it requested
 * approval. Rendered in ApprovalDetail.
 */
export interface ApprovalEvidence {
  /** The agent's stated reasoning for why this action is needed */
  reasoning?: string;
  /** Contextual data the agent attached (e.g. lead ID, email draft) */
  context?: Record<string, unknown>;
  /** Confidence score 0-100 if the agent provided one */
  confidenceScore?: number;
  /** Data sources the agent consulted */
  sources?: string[];
}

/**
 * Predicted impact of the action if approved.
 */
export interface ApprovalImpact {
  /** Short human-readable summary */
  summary?: string;
  /** List of entities that would be affected */
  affectedEntities?: string[];
  /** Whether this action is reversible */
  reversible?: boolean;
  /** Estimated scope: how many records/users affected */
  estimatedScope?: string;
}

/**
 * Lightweight approval record — returned by GET /api/approvals (list).
 */
export interface Approval {
  id: string;
  /** Which agent is requesting the action */
  agentId: string;
  agentName?: string;
  /** The tool this action would invoke */
  toolName: string;
  toolDisplayName?: string;
  /** Short description of the action being requested */
  actionSummary: string;
  riskTier: RiskTier;
  status: ApprovalStatus;
  /** ISO-8601 timestamp */
  requestedAt: string;
  /** ISO-8601 timestamp — when the approval request expires */
  expiresAt?: string;
  /** Set when status is APPROVED or REJECTED */
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

/**
 * Full approval record — returned by GET /api/approvals/:id (detail).
 * Extends the list shape with evidence, impact, and full action data.
 */
export interface ApprovalDetail extends Approval {
  /** Full description / preview of what the agent intends to do */
  actionPreview?: string;
  /** Raw action payload the agent would execute (if backend exposes it) */
  actionPayload?: Record<string, unknown>;
  evidence?: ApprovalEvidence;
  impact?: ApprovalImpact;
  /** Any additional metadata the backend includes */
  metadata?: Record<string, unknown>;
}

// ─── API request / response shapes ───────────────────────────────────────────

/**
 * Query params for GET /api/approvals.
 */
export interface ApprovalListFilters {
  status?: ApprovalStatus;
  agentId?: string;
  search?: string;
}

/**
 * Body for POST /api/approvals/:id/decide.
 */
export interface DecideApprovalPayload {
  decision: "APPROVED" | "REJECTED";
  /** Required when decision is REJECTED */
  rejectionReason?: string;
}

/**
 * Standard list response from GET /api/approvals.
 */
export interface ApprovalListResponse {
  approvals: Approval[];
  total?: number;
  pendingCount?: number;
}
