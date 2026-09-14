/**
 * lib/api/executionsApi.ts
 * ─────────────────────────────────────────────────────────────
 * Typed API service layer for the Execution Ledger (Day 3).
 *
 * Mock fallback: since Ayush's /api/agent-ledger endpoints may
 * not be merged into dev yet, every function catches 404 / 503
 * and returns realistic mock data so the UI can be built and
 * reviewed independently. Set NEXT_PUBLIC_USE_MOCK_LEDGER=false
 * (or remove the env var) once the real endpoints are live.
 *
 * Uses the shared axios instance — auth headers, token refresh,
 * and retry logic are all handled centrally in lib/api/api.ts.
 */

import api from "@/lib/api/api";
import type {
  Execution,
  ExecutionDetail,
  ExecutionListFilters,
  ExecutionListResponse,
  ToolCallEntry,
  ExecutionApprovalRef,
} from "@/types/executions";

const BASE = "/api/agent-ledger";

// ─── Mock flag ────────────────────────────────────────────────────────────────
// Flip to false (or delete the env var) once the real endpoint is live.
const USE_MOCK =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_MOCK_LEDGER !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TOOL_CALLS: ToolCallEntry[] = [
  {
    sequence: 1,
    toolName: "crm_lead_search",
    calledAt: new Date(Date.now() - 120_000).toISOString(),
    completedAt: new Date(Date.now() - 119_200).toISOString(),
    durationMs: 800,
    status: "SUCCESS",
    inputSummary: "query: 'enterprise prospects', limit: 10",
    input: { query: "enterprise prospects", limit: 10 },
    outputSummary: "5 leads returned",
    output: { count: 5, leads: ["lead-1", "lead-2"] },
  },
  {
    sequence: 2,
    toolName: "email_draft",
    calledAt: new Date(Date.now() - 119_000).toISOString(),
    completedAt: new Date(Date.now() - 118_200).toISOString(),
    durationMs: 800,
    status: "SUCCESS",
    inputSummary: "to: john@acme.com, subject: Follow-up",
    input: { to: "john@acme.com", subject: "Follow-up on your inquiry" },
    outputSummary: "Draft created, pending approval",
    output: { draftId: "draft-abc123", status: "PENDING_APPROVAL" },
    approvalId: "approval-xyz",
  },
  {
    sequence: 3,
    toolName: "email_send",
    calledAt: new Date(Date.now() - 60_000).toISOString(),
    completedAt: undefined,
    durationMs: undefined,
    status: "PENDING",
    inputSummary: "Waiting for approval-xyz",
    input: { draftId: "draft-abc123" },
    approvalId: "approval-xyz",
  },
];

const MOCK_APPROVAL: ExecutionApprovalRef = {
  approvalId: "approval-xyz",
  toolName: "email_send",
  status: "PENDING",
  requestedAt: new Date(Date.now() - 90_000).toISOString(),
};

const MOCK_EXECUTIONS: Execution[] = [
  {
    id: "exec-001",
    agentId: "agent-sales-001",
    agentName: "Sales Prospector",
    plan: "Search for enterprise leads and send follow-up emails",
    status: "APPROVAL_REQUIRED",
    initiatorType: "USER",
    startedAt: new Date(Date.now() - 120_000).toISOString(),
    modelUsed: "gpt-4o",
    modelVersion: "2024-11",
    toolCallCount: 3,
    hadApprovals: true,
  },
  {
    id: "exec-002",
    agentId: "agent-support-001",
    agentName: "Support Triage",
    plan: "Classify incoming support tickets and assign to team members",
    status: "COMPLETED",
    initiatorType: "SCHEDULE",
    startedAt: new Date(Date.now() - 3_600_000).toISOString(),
    completedAt: new Date(Date.now() - 3_595_000).toISOString(),
    durationMs: 5_000,
    modelUsed: "gpt-4o-mini",
    modelVersion: "2024-07",
    toolCallCount: 7,
    hadApprovals: false,
  },
  {
    id: "exec-003",
    agentId: "agent-finance-001",
    agentName: "Invoice Processor",
    plan: "Extract and match invoice line items against PO database",
    status: "FAILED",
    initiatorType: "WEBHOOK",
    startedAt: new Date(Date.now() - 7_200_000).toISOString(),
    completedAt: new Date(Date.now() - 7_195_000).toISOString(),
    durationMs: 5_000,
    modelUsed: "claude-3-5-sonnet",
    modelVersion: "20241022",
    toolCallCount: 2,
    hadApprovals: false,
  },
  {
    id: "exec-004",
    agentId: "agent-sales-001",
    agentName: "Sales Prospector",
    plan: "Update deal stage for closed won opportunities",
    status: "COMPLETED",
    initiatorType: "AGENT",
    startedAt: new Date(Date.now() - 86_400_000).toISOString(),
    completedAt: new Date(Date.now() - 86_394_000).toISOString(),
    durationMs: 6_000,
    modelUsed: "gpt-4o",
    modelVersion: "2024-11",
    toolCallCount: 4,
    hadApprovals: false,
  },
  {
    id: "exec-005",
    agentId: "agent-hr-001",
    agentName: "HR Assistant",
    plan: "Send weekly attendance reminders to all employees",
    status: "COMPLETED",
    initiatorType: "SCHEDULE",
    startedAt: new Date(Date.now() - 172_800_000).toISOString(),
    completedAt: new Date(Date.now() - 172_793_000).toISOString(),
    durationMs: 7_000,
    modelUsed: "gpt-4o-mini",
    modelVersion: "2024-07",
    toolCallCount: 12,
    hadApprovals: false,
  },
];

const MOCK_DETAIL: ExecutionDetail = {
  ...MOCK_EXECUTIONS[0],
  planDetail:
    "1. Search CRM for enterprise leads created in the last 7 days.\n2. For each lead without a follow-up email, draft a personalised outreach.\n3. Queue emails for send — each requires approval before dispatch.",
  toolCalls: MOCK_TOOL_CALLS,
  outputs: { summary: "3 tool calls made. 1 email draft queued for approval." },
  errors: [],
  approvals: [MOCK_APPROVAL],
  metadata: { triggeredBy: "user-darsh", workspaceId: "ws-zyoris" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if ("data" in r) return r.data as T;
  }
  return raw as T;
}

function normaliseList(raw: unknown): ExecutionListResponse {
  const u = unwrap<unknown>(raw);

  if (Array.isArray(u)) {
    return { executions: u as Execution[], total: (u as Execution[]).length, limit: 20, offset: 0 };
  }

  if (u && typeof u === "object") {
    const obj = u as Record<string, unknown>;
    const list =
      Array.isArray(obj.executions) ? obj.executions :
      Array.isArray(obj.items)      ? obj.items      :
      Array.isArray(obj.data)       ? obj.data       : null;

    if (list) {
      return {
        executions: list as Execution[],
        total:  typeof obj.total  === "number" ? obj.total  : list.length,
        limit:  typeof obj.limit  === "number" ? obj.limit  : 20,
        offset: typeof obj.offset === "number" ? obj.offset : 0,
      };
    }
  }

  console.warn("[executionsApi] Unexpected list response shape:", raw);
  return { executions: [], total: 0, limit: 20, offset: 0 };
}

function buildParams(f: ExecutionListFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.agentId)        p.agentId       = f.agentId;
  if (f.status)         p.status        = f.status;
  if (f.initiatorType)  p.initiatorType = f.initiatorType;
  if (f.limit  != null) p.limit         = String(f.limit);
  if (f.offset != null) p.offset        = String(f.offset);
  return p;
}

function isMockableMiss(err: unknown): boolean {
  const status = (err as any)?.response?.status;
  return status === 404 || status === 503 || status === 502 || !(err as any)?.response;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/agent-ledger
 * Paginated list of execution ledger entries.
 * Falls back to mock data if the endpoint is not yet live.
 */
export async function getExecutions(
  filters: ExecutionListFilters = {}
): Promise<ExecutionListResponse> {
  if (USE_MOCK) {
    // Lightweight mock filter so the UI filters work during development
    let results = [...MOCK_EXECUTIONS];
    if (filters.agentId)       results = results.filter((e) => e.agentId === filters.agentId || e.agentName?.toLowerCase().includes(filters.agentId!.toLowerCase()));
    if (filters.status)        results = results.filter((e) => e.status === filters.status);
    if (filters.initiatorType) results = results.filter((e) => e.initiatorType === filters.initiatorType);
    const offset = filters.offset ?? 0;
    const limit  = filters.limit  ?? 20;
    const page   = results.slice(offset, offset + limit);
    return { executions: page, total: results.length, limit, offset };
  }

  try {
    const res = await api.get(BASE, { params: buildParams(filters) });
    return normaliseList(res.data);
  } catch (err: any) {
    if (isMockableMiss(err)) {
      console.warn("[executionsApi] Endpoint not reachable, using mock data.");
      return { executions: MOCK_EXECUTIONS, total: MOCK_EXECUTIONS.length, limit: 20, offset: 0 };
    }
    throw new Error(
      err.response?.data?.message || err.message || "Failed to load execution ledger."
    );
  }
}

/**
 * GET /api/agent-ledger/:id
 * Full detail for a single execution.
 */
export async function getExecution(id: string): Promise<ExecutionDetail> {
  if (USE_MOCK) {
    const found = MOCK_EXECUTIONS.find((e) => e.id === id);
    if (!found) throw new Error(`Execution "${id}" not found.`);
    return { ...MOCK_DETAIL, ...found, toolCalls: MOCK_TOOL_CALLS, approvals: [MOCK_APPROVAL] };
  }

  try {
    const res = await api.get(`${BASE}/${id}`);
    return unwrap<ExecutionDetail>(res.data);
  } catch (err: any) {
    if (isMockableMiss(err)) {
      console.warn("[executionsApi] Endpoint not reachable, using mock data.");
      return MOCK_DETAIL;
    }
    throw new Error(
      err.response?.data?.message || err.message || `Failed to load execution "${id}".`
    );
  }
}

// Re-export types for convenience
export type {
  Execution,
  ExecutionDetail,
  ExecutionListFilters,
  ExecutionListResponse,
  ToolCallEntry,
  ExecutionApprovalRef,
} from "@/types/executions";
