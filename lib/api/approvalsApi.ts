/**
 * lib/api/approvalsApi.ts
 * ─────────────────────────────────────────────────────────────
 * Typed API service layer for the Approval Queue and
 * Approval Detail.
 *
 * Non-negotiable: every approval decision goes through
 * POST /api/approvals/:id/decide. No local-only state changes.
 * The component re-fetches after every decide call.
 */

import api from "@/lib/api/api";
import type {
  Approval,
  ApprovalDetail,
  ApprovalListFilters,
  ApprovalListResponse,
  DecideApprovalPayload,
} from "@/types/approvals";

const BASE = "/api/approvals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if ("data" in r) return r.data as T;
  }
  return raw as T;
}

function normaliseList(raw: unknown): ApprovalListResponse {
  const u = unwrap<unknown>(raw);

  if (Array.isArray(u)) {
    return { approvals: u as Approval[], total: (u as Approval[]).length };
  }

  if (u && typeof u === "object") {
    const obj = u as Record<string, unknown>;
    if (Array.isArray(obj.approvals)) {
      return {
        approvals: obj.approvals as Approval[],
        total:
          typeof obj.total === "number"
            ? obj.total
            : (obj.approvals as Approval[]).length,
        pendingCount:
          typeof obj.pendingCount === "number" ? obj.pendingCount : undefined,
      };
    }
    if (Array.isArray(obj.items)) {
      return { approvals: obj.items as Approval[], total: (obj.items as Approval[]).length };
    }
  }

  console.warn("[approvalsApi] Unexpected list response shape:", raw);
  return { approvals: [], total: 0 };
}

function buildParams(filters: ApprovalListFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.status)           p.status  = filters.status;
  if (filters.agentId)          p.agentId = filters.agentId;
  if (filters.search?.trim())   p.search  = filters.search.trim();
  return p;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/approvals
 * List all approval requests, optionally filtered.
 * Drives ApprovalQueue + its status tabs, agent filter, and search.
 */
export async function getApprovals(
  filters: ApprovalListFilters = {}
): Promise<ApprovalListResponse> {
  try {
    const res = await api.get(BASE, { params: buildParams(filters) });
    return normaliseList(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || "Failed to load approvals."
    );
  }
}

/**
 * GET /api/approvals/:id
 * Full detail for one approval request.
 * Drives ApprovalDetail — action preview, evidence, impact, expiry.
 */
export async function getApproval(id: string): Promise<ApprovalDetail> {
  try {
    const res = await api.get(`${BASE}/${id}`);
    return unwrap<ApprovalDetail>(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
      err.message ||
      `Failed to load approval "${id}".`
    );
  }
}

/**
 * POST /api/approvals/:id/decide
 * Submit an APPROVED or REJECTED decision.
 *
 * Rules enforced here (in addition to server-side validation):
 * - rejectionReason must be present when decision is REJECTED.
 *   The UI also enforces this, but we guard here too so no
 *   accidental empty-reason call ever reaches the server.
 *
 * After calling this, always re-fetch the approval list and
 * detail — never assume the local status reflects server state.
 */
export async function decideApproval(
  id: string,
  payload: DecideApprovalPayload
): Promise<ApprovalDetail> {
  if (
    payload.decision === "REJECTED" &&
    (!payload.rejectionReason || !payload.rejectionReason.trim())
  ) {
    throw new Error("A rejection reason is required when rejecting an approval.");
  }

  try {
    const res = await api.post(`${BASE}/${id}/decide`, payload);
    return unwrap<ApprovalDetail>(res.data);
  } catch (err: any) {
    // Surface 403 Forbidden clearly — the user isn't authorised to decide
    if (err.response?.status === 403) {
      throw new Error(
        "You are not authorised to decide on this approval. " +
          (err.response?.data?.message ?? "")
      );
    }
    // Surface 409 Conflict — already decided or expired
    if (err.response?.status === 409) {
      throw new Error(
        err.response?.data?.message ||
          "This approval has already been decided or has expired."
      );
    }
    const serverMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      (Array.isArray(err.response?.data?.errors)
        ? (err.response.data.errors as { message: string }[])
            .map((e) => e.message)
            .join("; ")
        : null);
    throw new Error(
      serverMsg || err.message || "Failed to submit decision."
    );
  }
}

// Re-export types for convenience
export type {
  Approval,
  ApprovalDetail,
  ApprovalListFilters,
  ApprovalListResponse,
  DecideApprovalPayload,
} from "@/types/approvals";

// ─── Action Agent Execute (Day 5) ─────────────────────────────────────────────

import type {
  AgentApprovalRequest,
  ApprovalExecuteResult,
  AgentApprovalStatus,
} from "@/types/ai-proposals";

const AI_APPROVALS_BASE = "/api/ai/approvals";

/**
 * POST /api/ai/approvals/:id/execute
 *
 * Executes an approved agent action request on the backend.
 * Called when the user clicks "Execute / Approve & Send" on an
 * ActionProposalCard. The button is disabled while this is in-flight
 * and the component re-renders based on the returned status.
 *
 * Never assume optimistic success — always use the returned status
 * to update UI state.
 *
 * @throws Error with a user-friendly message on 400, 403, 409, or 5xx.
 */
export async function executeApproval(id: string): Promise<ApprovalExecuteResult> {
  try {
    const res = await api.post(`${AI_APPROVALS_BASE}/${id}/execute`);

    // Normalise envelope
    const raw: unknown = res.data;
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      const src = (r.data && typeof r.data === "object") ? r.data as Record<string, unknown> : r;
      return {
        success:     src.success   !== false,
        approvalId:  (src.approvalId ?? src.id ?? id) as string,
        status:      (src.status ?? "EXECUTED") as AgentApprovalStatus,
        message:     src.message   as string | undefined,
        executedAt:  src.executedAt as string | undefined,
      };
    }
    return { success: true, approvalId: id, status: "EXECUTED" };
  } catch (err: any) {
    // 403 — caller is not authorised to execute this approval
    if (err.response?.status === 403) {
      throw new Error(
        "You are not authorised to execute this action. " +
          (err.response?.data?.message ?? "")
      );
    }
    // 409 — already executed, rejected, or expired
    if (err.response?.status === 409) {
      throw new Error(
        err.response?.data?.message ??
          "This action has already been executed, rejected, or has expired."
      );
    }
    // 400 — invalid state or validation failure
    if (err.response?.status === 400) {
      throw new Error(
        err.response?.data?.message ??
          "Invalid request. The action may need to be approved before it can be executed."
      );
    }
    const serverMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      (Array.isArray(err.response?.data?.errors)
        ? (err.response.data.errors as { message: string }[])
            .map((e) => e.message)
            .join("; ")
        : null);
    throw new Error(serverMsg || err.message || "Failed to execute action.");
  }
}

/**
 * POST /api/ai/approvals/:id/decide
 *
 * Shortcut decide endpoint scoped to the AI approvals namespace.
 * Wraps the existing decideApproval() pattern for the new
 * /api/ai/approvals route — same payload shape, different base URL.
 */
export async function decideAgentApproval(
  id: string,
  decision: "APPROVED" | "REJECTED",
  rejectionReason?: string
): Promise<AgentApprovalRequest> {
  if (decision === "REJECTED" && (!rejectionReason?.trim())) {
    throw new Error("A rejection reason is required when rejecting an action.");
  }
  try {
    const res = await api.post(`${AI_APPROVALS_BASE}/${id}/decide`, {
      decision,
      ...(rejectionReason?.trim() && { rejectionReason: rejectionReason.trim() }),
    });
    return unwrap<AgentApprovalRequest>(res.data);
  } catch (err: any) {
    if (err.response?.status === 403) {
      throw new Error(
        "You are not authorised to decide on this action. " +
          (err.response?.data?.message ?? "")
      );
    }
    if (err.response?.status === 409) {
      throw new Error(
        err.response?.data?.message ??
          "This action has already been decided or has expired."
      );
    }
    throw new Error(
      err.response?.data?.message || err.message || "Failed to submit decision."
    );
  }
}

export type { AgentApprovalRequest, ApprovalExecuteResult, AgentApprovalStatus } from "@/types/ai-proposals";
