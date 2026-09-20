/**
 * lib/types/agent-results.ts
 * ─────────────────────────────────────────────────────────────
 * Day 6 — Shared type system for all five Operational Agent surfaces:
 *   Support Agent, Data Quality Agent, RevOps Agent,
 *   Workflow-building Agent, Reporting/Analysis Agent.
 *
 * Design rules (carried from Days 1–5):
 * - Evidence is NEVER invented client-side. Components must not render
 *   a finding/issue/insight without the evidence the agent attached.
 * - Status / enum fields arriving from the backend are normalised to a
 *   known casing at the API layer before they reach these types.
 * - Every shape extends AgentResultBase so AgentResultFrame has a
 *   uniform header regardless of which agent produced the result.
 */

import type { AgentEvidenceItem } from "@/lib/api/agentApi";

// Re-export the evidence item type so consumers only need this module.
export type { AgentEvidenceItem };

// ─── Shared base ──────────────────────────────────────────────────────────────

/**
 * Every Day 6 agent result shape extends this base.
 * The AgentResultFrame component only needs this to render its header.
 */
export interface AgentResultBase {
  /** Unique result / job ID */
  id: string;
  /** Which agent produced this result */
  agentId: string;
  agentName?: string;
  /**
   * 0–100 confidence score.
   * When present, AgentResultFrame renders the confidence badge.
   * When absent, the badge is suppressed — never default to 0.
   */
  confidenceScore?: number;
  /**
   * Evidence items.
   * AgentResultFrame's "View Evidence" button is shown only when
   * evidence.length > 0 (same rule as Day 5 W2).
   */
  evidence?: AgentEvidenceItem[];
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /**
   * When present, AgentResultFrame renders a link to the Execution
   * Ledger at /executions/:executionId.
   */
  executionId?: string;
}

// ─── Support Agent ────────────────────────────────────────────────────────────

export interface KnowledgeSource {
  id: string;
  title: string;
  snippet?: string;
  /** When present, render as a clickable link */
  url?: string;
  sourceType: "kb_article" | "case" | "macro";
}

export interface KnowledgeAnswer extends AgentResultBase {
  type: "KnowledgeAnswer";
  /** The original question the user asked */
  question: string;
  /** The agent's answer text */
  answer: string;
  /**
   * Sources that back the answer.
   * An answer with zero sources must show an explicit "no sources"
   * state — not silently hide the absence.
   */
  sources: KnowledgeSource[];
  /** If this answer was informed by a specific case, its ID is here */
  relatedCaseId?: string;
}

// ─── Data Quality Agent ───────────────────────────────────────────────────────

export type DataQualityIssueType =
  | "DUPLICATE"
  | "STALE"
  | "MISSING"
  | "CONFLICTING";

export type DataQualityObjectType =
  | "lead"
  | "deal"
  | "contact"
  | "account";

export type DataQualityIssueSeverity = "LOW" | "MEDIUM" | "HIGH";
export type DataQualityIssueStatus = "OPEN" | "RESOLVED" | "IGNORED";

export interface DataQualityIssue {
  id: string;
  issueType: DataQualityIssueType;
  objectType: DataQualityObjectType;
  severity: DataQualityIssueSeverity;
  status: DataQualityIssueStatus;
  /** Record IDs affected (e.g. both records in a duplicate pair) */
  affectedRecordIds: string[];
  fieldName?: string;
  /** Human-readable description of the conflict */
  conflictDetail?: string;
  /**
   * Evidence MUST be present on drill-down — never show a bare flag
   * without the evidence entries that produced it.
   */
  evidence: AgentEvidenceItem[];
  detectedAt: string;
}

export interface DataQualityIssueListResult extends AgentResultBase {
  type: "DataQualityIssueList";
  issues: DataQualityIssue[];
  totalCount: number;
}

// ─── RevOps Agent ─────────────────────────────────────────────────────────────

export type RevOpsCategory =
  | "COVERAGE"
  | "LEAKAGE"
  | "QUOTA"
  | "FORECAST";

/**
 * A proposed action coming from a RevOps insight.
 * This is preview-only on the RevOps screen — it must never be
 * executed directly. "Send to Approval Queue" routes it through the
 * existing approvals API.
 */
export interface ProposedAction {
  label: string;
  type: string;
  description?: string;
  /** Opaque payload forwarded to the approvals API when sending to queue */
  payload?: Record<string, unknown>;
  /**
   * Approval request ID, set after "Send to Approval Queue" succeeds.
   * When present, render a link to /approvals/:approvalRequestId.
   */
  approvalRequestId?: string;
}

export interface RevOpsInsight extends AgentResultBase {
  type: "RevOpsInsight";
  category: RevOpsCategory;
  metricLabel: string;
  metricValue: number;
  metricUnit?: string;
  benchmarkValue?: number;
  severity: DataQualityIssueSeverity;
  /**
   * Preview only — this screen never executes the action.
   * Presence of this field enables the "Send to Approval Queue" button.
   */
  proposedAction?: ProposedAction;
}

// ─── Workflow-building Agent ──────────────────────────────────────────────────

export interface WorkflowDraftStep {
  order: number;
  actionLabel: string;
  actionType: string;
  targetEntity?: string;
  params?: Record<string, unknown>;
}

export type WorkflowValidationStatus =
  | "VALID"
  | "INVALID"
  | "NEEDS_REVIEW";

export interface WorkflowDraftReview extends AgentResultBase {
  type: "WorkflowDraftReview";
  workflowName: string;
  trigger: {
    label: string;
    conditions?: Record<string, unknown>;
  };
  steps: WorkflowDraftStep[];
  validationStatus: WorkflowValidationStatus;
  validationIssues?: string[];
  /**
   * Set after "Send for Approval" succeeds.
   * When present, render a link to /approvals/:approvalRequestId.
   */
  approvalRequestId?: string;
  /**
   * Always "DRAFT" — this UI has no other value.
   * The presence of this field makes it impossible to mistake
   * this surface for an active/running workflow.
   */
  draftState: "DRAFT";
}

// ─── Reporting / Analysis Agent ───────────────────────────────────────────────

export interface ReportMetric {
  label: string;
  value: number | string;
  segment?: string;
  /**
   * Opaque token passed back to GET /api/reports/:id/drilldown.
   * When present, the metric cell is clickable and opens a drilldown panel.
   * When absent, the cell is non-interactive.
   */
  drilldownQuery?: string;
}

export interface NLReportResult extends AgentResultBase {
  type: "NLReportResult";
  /** The original natural-language question */
  question: string;
  /** The agent's human-readable answer paragraph */
  answerSummary: string;
  /** Structured metric breakdown backing the summary */
  metrics: ReportMetric[];
  /** True when at least one metric has a drilldownQuery */
  drilldownAvailable: boolean;
}

/**
 * The data returned by GET /api/reports/:id/drilldown.
 * Rendered by ReportDrilldownPanel.
 */
export interface ReportDrilldownData {
  reportId: string;
  query: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  /** Optional: links from row IDs to CRM entity detail pages */
  drillDownReferences?: Record<string, string>;
}

// ─── API request shapes ───────────────────────────────────────────────────────

export interface SupportQueryPayload {
  question: string;
  /** Optional context (e.g. current page entity ID / type) */
  context?: Record<string, unknown>;
}

export interface DataQualityListFilters {
  issueType?: DataQualityIssueType;
  objectType?: DataQualityObjectType;
  severity?: DataQualityIssueSeverity;
  status?: DataQualityIssueStatus;
  search?: string;
}

export interface DataQualityListResponse {
  issues: DataQualityIssue[];
  totalCount: number;
}

export interface RevOpsInsightsResponse {
  insights: RevOpsInsight[];
}

export interface NLReportQueryPayload {
  question: string;
}

export interface NLReportDrilldownResponse {
  data: ReportDrilldownData;
}

export interface WorkflowSubmitResponse {
  approvalRequestId: string;
  message?: string;
}
