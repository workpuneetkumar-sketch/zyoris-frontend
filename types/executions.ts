/**
 * types/executions.ts
 * ─────────────────────────────────────────────────────────────
 * TypeScript types for the Execution Ledger (Day 3).
 *
 * Design principle: these types describe exactly what
 * GET /api/agent-ledger returns. The frontend never infers
 * permission or authorization logic from them — it renders
 * what the server sends and re-fetches on every action.
 */

import type { RiskTier, PermissionLevel } from "@/types/agents";

export type { RiskTier, PermissionLevel };

// ─── Enumerations ─────────────────────────────────────────────────────────────

/**
 * Lifecycle status of an agent execution.
 */
export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "APPROVAL_REQUIRED"
  | string;

/**
 * Who / what initiated the execution.
 */
export type InitiatorType =
  | "USER"
  | "SCHEDULE"
  | "WEBHOOK"
  | "AGENT"
  | "SYSTEM"
  | string;

// ─── Tool-call timeline ───────────────────────────────────────────────────────

/**
 * A single tool invocation within an execution.
 * Displayed as a chronological timeline entry in ExecutionDetail.
 */
export interface ToolCallEntry {
  /** Sequential index within this execution */
  sequence: number;
  toolName: string;
  /** ISO-8601 timestamp when the call was dispatched */
  calledAt: string;
  /** ISO-8601 timestamp when the call returned (may be null if still running) */
  completedAt?: string;
  /** Wall-clock duration in milliseconds */
  durationMs?: number;
  /** Status of this specific tool call */
  status: "SUCCESS" | "FAILED" | "PENDING" | "SKIPPED" | string;
  /** Condensed summary of inputs (to show at-a-glance without expanding) */
  inputSummary?: string;
  /** Full input payload — shown on expand */
  input?: Record<string, unknown>;
  /** Condensed summary of output */
  outputSummary?: string;
  /** Full output — shown on expand */
  output?: Record<string, unknown>;
  /** Error message if the tool call failed */
  error?: string;
  /** Whether this call triggered an approval request */
  approvalId?: string;
}

/**
 * An approval state embedded within an execution.
 */
export interface ExecutionApprovalRef {
  approvalId: string;
  toolName: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | string;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

/**
 * Lightweight execution record returned by GET /api/agent-ledger (list).
 * Contains the minimum fields needed for a table row.
 */
export interface Execution {
  id: string;
  agentId: string;
  agentName?: string;
  /** Short description of what was executed */
  plan?: string;
  status: ExecutionStatus;
  initiatorType: InitiatorType;
  /** ISO-8601 */
  startedAt: string;
  /** ISO-8601 — null if still running */
  completedAt?: string;
  durationMs?: number;
  /** Model/version used for this execution */
  modelUsed?: string;
  modelVersion?: string;
  /** Number of tool calls made */
  toolCallCount?: number;
  /** Whether any approval was needed */
  hadApprovals?: boolean;
}

/**
 * Full execution record returned by GET /api/agent-ledger/:id.
 * Extends the list shape with the full lifecycle detail.
 */
export interface ExecutionDetail extends Execution {
  /** Full execution plan / intent as produced by the agent */
  planDetail?: string;
  /** Ordered chronological list of tool invocations */
  toolCalls: ToolCallEntry[];
  /** Final output produced by the execution */
  outputs?: Record<string, unknown> | string;
  /** Any top-level error (may also be surfaced per-tool-call) */
  errors?: string[];
  /** All approval requests raised during this execution */
  approvals?: ExecutionApprovalRef[];
  /** Raw metadata/context the backend includes */
  metadata?: Record<string, unknown>;
}

// ─── API request / response shapes ───────────────────────────────────────────

/**
 * Query params for GET /api/agent-ledger.
 */
export interface ExecutionListFilters {
  agentId?: string;
  status?: ExecutionStatus;
  initiatorType?: InitiatorType;
  limit?: number;
  offset?: number;
}

/**
 * Paginated list response from GET /api/agent-ledger.
 */
export interface ExecutionListResponse {
  executions: Execution[];
  total: number;
  limit: number;
  offset: number;
}
