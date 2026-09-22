/**
 * lib/types/day7.ts
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Enterprise Agent Configuration, Observability, and
 * Version Promotion type system.
 *
 * Design rules:
 * - All shapes describe what the backend returns; the frontend
 *   never derives authorisation logic from them.
 * - Status / enum fields are normalised to uppercase at the API
 *   layer before reaching components (Bug-2 discipline).
 * - Every API response that lists items has a normalised list
 *   handler in the service module (Bug-1 discipline).
 */

import type { RiskTier, PermissionLevel } from "@/types/agents";

// ─── Re-exports for convenience ───────────────────────────────────────────────
export type { RiskTier, PermissionLevel };

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AGENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Trust classification for a content source.
 * TRUSTED  — content from this source may be used without additional grounding.
 * VERIFIED — content is used but each claim is citation-checked.
 * UNTRUSTED — content is blocked or flagged for review before use.
 */
export type ContentTrustLevel = "TRUSTED" | "VERIFIED" | "UNTRUSTED";

/** A single entry in the trusted-content boundary allowlist */
export interface TrustedContentBoundary {
  /** Human-readable label, e.g. "Internal KB", "Zendesk Articles" */
  label: string;
  /** The domain or URL pattern, e.g. "*.zyoris.com" */
  pattern: string;
  trustLevel: ContentTrustLevel;
}

/**
 * Full agent configuration shape — returned by GET /api/admin/agents/:id/config
 * and submitted to POST /api/admin/agents/:id/config.
 */
export interface AgentConfig {
  agentId: string;
  agentName: string;
  /**
   * The system prompt sent to the model on every invocation.
   * Admins may edit this; changes are versioned server-side.
   */
  systemPrompt: string;
  /**
   * Tool identifiers this agent is scoped to use.
   * The backend validates this list against the Tool Registry — the UI
   * must reflect any rejection rather than silently applying partial lists.
   */
  allowedToolIds: string[];
  /**
   * Tools the admin tried to add that the backend rejected as out-of-scope.
   * Populated from the backend's 422 response body; never computed client-side.
   */
  rejectedToolIds?: string[];
  /** Trusted-content boundary rules for prompt injection defence */
  trustedContentBoundaries: TrustedContentBoundary[];
  /**
   * Maximum number of tokens the agent may consume per invocation.
   * Backend enforces this; UI shows the value and lets admins edit it.
   */
  maxTokensPerCall: number;
  /** Whether prompt injection detection is enabled */
  promptInjectionDefenceEnabled: boolean;
  /** Minimum confidence score (0-100) required before an action is surfaced */
  minConfidenceThreshold: number;
  riskTier: RiskTier;
  permissionLevel: PermissionLevel;
  updatedAt: string;
  updatedBy?: string;
}

/** Payload for POST /api/admin/agents/:id/config */
export interface SaveAgentConfigPayload {
  systemPrompt: string;
  allowedToolIds: string[];
  trustedContentBoundaries: TrustedContentBoundary[];
  maxTokensPerCall: number;
  promptInjectionDefenceEnabled: boolean;
  minConfidenceThreshold: number;
}

/** Response when config is saved — may include backend-rejected tool IDs */
export interface SaveAgentConfigResponse {
  config: AgentConfig;
  /**
   * Present when the backend rejected one or more requested tool IDs.
   * The UI must surface these — never silently hide a rejection.
   */
  rejectedToolIds?: string[];
  message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. OBSERVABILITY & METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A single time-series data point for trend charts.
 */
export interface MetricDataPoint {
  /** ISO date string or short label (e.g. "2026-09-01") */
  date: string;
  value: number;
}

/**
 * Aggregate observability metrics for one agent over a time window.
 * These are the four pillars: useful, grounded, safe, affordable.
 */
export interface AgentObservabilityMetrics {
  agentId: string;
  agentName: string;
  /** ISO period boundaries */
  periodStart: string;
  periodEnd: string;

  // ── Usefulness ──────────────────────────────────────────────────────────
  /** % of agent recommendations that were accepted by a human */
  recommendationAcceptanceRate: number;
  /** % of approved actions that completed successfully */
  actionSuccessRate: number;
  /** Trend data for acceptance rate (last N periods) */
  acceptanceTrend: MetricDataPoint[];
  /** Trend data for action success rate */
  successTrend: MetricDataPoint[];

  // ── Groundedness / Safety ────────────────────────────────────────────────
  /** Count of hallucination / grounding-failure events in the period */
  hallucinationCount: number;
  /** Count of prompt-injection attempts detected and blocked */
  injectionAttemptsBlocked: number;
  /** % of responses that cited at least one verifiable source */
  groundedResponseRate: number;

  // ── Cost / Latency ───────────────────────────────────────────────────────
  /** Total USD cost for all executions in the period */
  totalCostUsd: number;
  /** Average cost per execution in USD */
  avgCostPerExecutionUsd: number;
  /** Average end-to-end latency in milliseconds */
  avgLatencyMs: number;
  /** P95 latency in milliseconds */
  p95LatencyMs: number;
  /** Total number of executions in the period */
  totalExecutions: number;
  /** Trend data for cost per execution */
  costTrend: MetricDataPoint[];
  /** Trend data for latency */
  latencyTrend: MetricDataPoint[];
}

/** Response shape from GET /api/admin/agents/observability */
export interface ObservabilityResponse {
  metrics: AgentObservabilityMetrics[];
  generatedAt: string;
}

// ── Audit / Business-Outcome Events ──────────────────────────────────────────

export type AuditEventOutcome = "SUCCESS" | "FAILURE" | "PENDING" | "REJECTED" | "APPROVED";
export type AuditEventCategory =
  | "EXECUTION"
  | "APPROVAL"
  | "CONFIG_CHANGE"
  | "PROMOTION"
  | "SECURITY"
  | "DATA_ACCESS";

/**
 * A single auditable business-outcome event.
 * Every entry must have evidence — the UI renders a "View Evidence" link
 * when evidenceSnippet is present.
 */
export interface AuditEvent {
  id: string;
  agentId: string;
  agentName?: string;
  category: AuditEventCategory;
  /** Human-readable description of what happened */
  description: string;
  outcome: AuditEventOutcome;
  /** ISO-8601 timestamp */
  occurredAt: string;
  /** ID of the execution that produced this event, if applicable */
  executionId?: string;
  /** ID of the approval request related to this event, if applicable */
  approvalId?: string;
  /** The user or system that triggered this event */
  initiatedBy?: string;
  /**
   * Short evidence snippet — always required for EXECUTION and SECURITY
   * events. The UI renders a "View Evidence" chip when present.
   */
  evidenceSnippet?: string;
  /** Full evidence detail (shown in EvidenceModal) */
  evidenceDetail?: string;
  /** Cost of the execution in USD, if applicable */
  costUsd?: number;
  /** Latency of the execution in ms, if applicable */
  latencyMs?: number;
}

export interface AuditEventsResponse {
  events: AuditEvent[];
  totalCount: number;
}

export interface AuditEventFilters {
  agentId?: string;
  category?: AuditEventCategory;
  outcome?: AuditEventOutcome;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MODEL VERSIONS & PROMOTION
// ═══════════════════════════════════════════════════════════════════════════════

export type VersionState =
  | "PRODUCTION"   // currently live
  | "STAGING"      // candidate for promotion
  | "DRAFT"        // in development
  | "RETIRED"      // replaced, kept for audit
  | "FAILED";      // failed regression gate, not promotable

/**
 * Regression / evaluation gate result.
 * A gate must PASS before a version can be promoted to PRODUCTION.
 */
export interface RegressionGate {
  /** Short gate identifier, e.g. "hallucination-rate", "latency-p95" */
  gateId: string;
  label: string;
  /** PASS or FAIL — normalised to uppercase at API layer */
  result: "PASS" | "FAIL" | "PENDING";
  /** The measured value, e.g. 3.2 */
  measuredValue?: number;
  /** The threshold that must be met to pass */
  threshold?: number;
  unit?: string;
  /** Any notes from the evaluation run */
  notes?: string;
}

/**
 * A single model/agent version with its regression gate results.
 */
export interface AgentVersion {
  id: string;
  agentId: string;
  agentName?: string;
  /** Semantic version, e.g. "2.1.0" */
  versionNumber: string;
  state: VersionState;
  modelIdentifier: string;
  /** ISO-8601 */
  createdAt: string;
  promotedAt?: string;
  promotedBy?: string;
  retiredAt?: string;
  changelog: string;
  regressionGates: RegressionGate[];
  /**
   * True only when ALL regressionGates are PASS.
   * Computed by the backend — never client-side.
   * Controls whether the Promote button is enabled.
   */
  allGatesPassed: boolean;
  /**
   * Set after the "Promote to Production" action succeeds.
   * When present, a link to /approvals/:approvalRequestId is shown
   * (promotion routes through the existing Approval Queue).
   */
  approvalRequestId?: string;
}

export interface AgentVersionsResponse {
  versions: AgentVersion[];
}

/** Response from POST /api/admin/agents/versions/:id/promote */
export interface PromoteVersionResponse {
  approvalRequestId: string;
  message?: string;
}
