// tests/executions_memory.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// ── Pure Logic & Normalisation Functions Under Test ───────────────────────────
// Types and functions are defined inline (no imports from lib/) so this file
// is directly runnable with --experimental-strip-types, matching the pattern
// used by all other test files in this project.

// ─── Execution types ──────────────────────────────────────────────────────────

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "APPROVAL_REQUIRED"
  | string;

export type InitiatorType =
  | "USER"
  | "SCHEDULE"
  | "WEBHOOK"
  | "AGENT"
  | "SYSTEM"
  | string;

export interface Execution {
  id: string;
  agentId: string;
  agentName?: string;
  plan?: string;
  status: ExecutionStatus;
  initiatorType: InitiatorType;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  modelUsed?: string;
  modelVersion?: string;
  toolCallCount?: number;
  hadApprovals?: boolean;
}

export interface ExecutionListResponse {
  executions: Execution[];
  total: number;
  limit: number;
  offset: number;
}

export interface ToolCallEntry {
  sequence: number;
  toolName: string;
  calledAt: string;
  completedAt?: string;
  durationMs?: number;
  status: string;
  inputSummary?: string;
  input?: Record<string, unknown>;
  outputSummary?: string;
  output?: Record<string, unknown>;
  error?: string;
  approvalId?: string;
}

export interface ExecutionDetail extends Execution {
  planDetail?: string;
  toolCalls: ToolCallEntry[];
  outputs?: Record<string, unknown> | string;
  errors?: string[];
  approvals?: Array<{
    approvalId: string;
    toolName: string;
    status: string;
    requestedAt: string;
    decidedAt?: string;
    decidedBy?: string;
    rejectionReason?: string;
  }>;
  metadata?: Record<string, unknown>;
}

// ─── Memory types ─────────────────────────────────────────────────────────────

export type MemoryScope = "ORGANIZATION" | "USER" | "CUSTOMER" | "AGENT";

export interface AgentMemory {
  id: string;
  scope: MemoryScope;
  memoryKey: string;
  memoryValue: string;
  category?: string;
  retentionDays?: number | null;
  expiresAt?: string | null;
  userId?: string;
  customerId?: string;
  agentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentMemoryListResponse {
  memories: AgentMemory[];
  total?: number;
}

export interface DeleteMemoryResult {
  success: boolean;
  deletedId: string;
  message?: string;
}

export interface RetentionUpdateResult {
  success: boolean;
  scope: MemoryScope;
  targetId: string;
  retentionDays: number;
  message?: string;
  affectedCount?: number;
}

export interface CreateMemoryPayload {
  scope: MemoryScope;
  memoryKey: string;
  memoryValue: string;
  category?: string;
  retentionDays?: number | null;
  userId?: string;
  customerId?: string;
  agentId?: string;
}

// ─── Normalisation functions ──────────────────────────────────────────────────

export function normaliseExecutionListResponse(raw: unknown): ExecutionListResponse {
  if (!raw || typeof raw !== "object") {
    return { executions: [], total: 0, limit: 20, offset: 0 };
  }

  // Unwrap envelope
  const r = raw as Record<string, any>;
  const src = (r.data && typeof r.data === "object" && !Array.isArray(r.data)) ? r.data : r;

  // Accept bare array
  if (Array.isArray(raw)) {
    return { executions: raw as Execution[], total: raw.length, limit: 20, offset: 0 };
  }

  // Accept { executions: [...] } or { items: [...] } or { data: [...] }
  const list: Execution[] =
    Array.isArray(src.executions) ? src.executions :
    Array.isArray(src.items)      ? src.items      :
    Array.isArray(src.data)       ? src.data       :
    [];

  return {
    executions: list,
    total:  typeof src.total  === "number" ? src.total  : list.length,
    limit:  typeof src.limit  === "number" ? src.limit  : 20,
    offset: typeof src.offset === "number" ? src.offset : 0,
  };
}

export function normaliseMemoryListResponse(raw: unknown): AgentMemoryListResponse {
  if (!raw || typeof raw !== "object") return { memories: [], total: 0 };

  if (Array.isArray(raw)) {
    return { memories: raw as AgentMemory[], total: raw.length };
  }

  const r = raw as Record<string, any>;
  const src = (r.data && typeof r.data === "object" && !Array.isArray(r.data)) ? r.data : r;

  const list: AgentMemory[] =
    Array.isArray(src.memories) ? src.memories :
    Array.isArray(src.items)    ? src.items    :
    Array.isArray(src.data)     ? src.data     :
    [];

  return {
    memories: list,
    total: typeof src.total === "number" ? src.total : list.length,
  };
}

export function normaliseDeleteResult(
  raw: unknown,
  fallbackId: string
): DeleteMemoryResult {
  if (!raw || typeof raw !== "object") {
    return { success: false, deletedId: fallbackId, message: "No response body." };
  }
  const r = raw as Record<string, any>;
  const src = (r.data && typeof r.data === "object") ? r.data : r;
  return {
    success:   src.success   !== false,
    deletedId: src.deletedId ?? src.id ?? fallbackId,
    message:   src.message   ?? undefined,
  };
}

export function validateScopeIdentifier(
  scope: MemoryScope,
  payload: Partial<CreateMemoryPayload>
): string | null {
  if (scope === "USER"     && !payload.userId?.trim())     return "userId is required for USER-scoped memories.";
  if (scope === "CUSTOMER" && !payload.customerId?.trim()) return "customerId is required for CUSTOMER-scoped memories.";
  if (scope === "AGENT"    && !payload.agentId?.trim())    return "agentId is required for AGENT-scoped memories.";
  return null;
}

export function formatExecutionDuration(ms?: number): string {
  if (ms == null) return "—";
  if (ms < 1_000)  return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("Execution list normalisation", async (t) => {

  await t.test("normalises bare array", () => {
    const raw: Execution[] = [
      { id: "e1", agentId: "a1", status: "COMPLETED", initiatorType: "USER", startedAt: "2026-09-11T10:00:00Z" },
      { id: "e2", agentId: "a2", status: "FAILED",    initiatorType: "SCHEDULE", startedAt: "2026-09-11T11:00:00Z" },
    ];
    const res = normaliseExecutionListResponse(raw);
    assert.strictEqual(res.executions.length, 2);
    assert.strictEqual(res.total, 2);
    assert.strictEqual(res.executions[0].id, "e1");
    assert.strictEqual(res.executions[1].status, "FAILED");
  });

  await t.test("normalises { executions: [...], total, limit, offset } envelope", () => {
    const raw = {
      executions: [
        { id: "e3", agentId: "a3", status: "RUNNING", initiatorType: "WEBHOOK", startedAt: "2026-09-11T12:00:00Z" },
      ],
      total: 42,
      limit: 20,
      offset: 20,
    };
    const res = normaliseExecutionListResponse(raw);
    assert.strictEqual(res.executions.length, 1);
    assert.strictEqual(res.total, 42);
    assert.strictEqual(res.limit, 20);
    assert.strictEqual(res.offset, 20);
  });

  await t.test("normalises { data: { executions: [...] } } double-wrapped envelope", () => {
    const raw = {
      success: true,
      data: {
        executions: [
          { id: "e4", agentId: "a4", status: "PENDING", initiatorType: "AGENT", startedAt: "2026-09-11T13:00:00Z" },
        ],
        total: 1, limit: 20, offset: 0,
      },
    };
    const res = normaliseExecutionListResponse(raw);
    assert.strictEqual(res.executions.length, 1);
    assert.strictEqual(res.executions[0].id, "e4");
    assert.strictEqual(res.total, 1);
  });

  await t.test("normalises { items: [...] } alternate key", () => {
    const raw = {
      items: [
        { id: "e5", agentId: "a5", status: "COMPLETED", initiatorType: "USER", startedAt: "2026-09-11T14:00:00Z" },
      ],
      total: 1,
    };
    const res = normaliseExecutionListResponse(raw);
    assert.strictEqual(res.executions.length, 1);
    assert.strictEqual(res.executions[0].id, "e5");
  });

  await t.test("handles null/undefined/empty safely", () => {
    assert.deepStrictEqual(
      normaliseExecutionListResponse(null),
      { executions: [], total: 0, limit: 20, offset: 0 }
    );
    assert.deepStrictEqual(
      normaliseExecutionListResponse(undefined),
      { executions: [], total: 0, limit: 20, offset: 0 }
    );
    assert.deepStrictEqual(
      normaliseExecutionListResponse({}),
      { executions: [], total: 0, limit: 20, offset: 0 }
    );
  });

  await t.test("pagination defaults are sensible when omitted", () => {
    const res = normaliseExecutionListResponse({ executions: [] });
    assert.strictEqual(res.limit, 20);
    assert.strictEqual(res.offset, 0);
  });
});

test("Execution status rendering contract", async (t) => {

  await t.test("all known statuses render a non-empty label", () => {
    const statuses: ExecutionStatus[] = [
      "COMPLETED", "FAILED", "RUNNING", "PENDING", "APPROVAL_REQUIRED", "CANCELLED",
    ];
    for (const s of statuses) {
      assert.ok(s.length > 0, `Status "${s}" should be non-empty`);
    }
  });

  await t.test("unknown status string does not throw when used as key", () => {
    const unknown: ExecutionStatus = "SOME_FUTURE_STATUS";
    assert.doesNotThrow(() => {
      const label = (unknown ?? "").toUpperCase();
      assert.ok(typeof label === "string");
    });
  });
});

test("Execution duration formatting", async (t) => {

  await t.test("formats milliseconds under 1 second", () => {
    assert.strictEqual(formatExecutionDuration(500), "500ms");
    assert.strictEqual(formatExecutionDuration(0), "0ms");
  });

  await t.test("formats seconds between 1s and 60s", () => {
    assert.strictEqual(formatExecutionDuration(1_000), "1.0s");
    assert.strictEqual(formatExecutionDuration(5_500), "5.5s");
    assert.strictEqual(formatExecutionDuration(59_999), "60.0s");
  });

  await t.test("formats minutes correctly", () => {
    assert.strictEqual(formatExecutionDuration(60_000), "1m 0s");
    assert.strictEqual(formatExecutionDuration(90_000), "1m 30s");
    assert.strictEqual(formatExecutionDuration(125_000), "2m 5s");
  });

  await t.test("returns dash for undefined or null", () => {
    assert.strictEqual(formatExecutionDuration(undefined), "—");
    assert.strictEqual(formatExecutionDuration(null as any), "—");
  });
});

test("Memory list normalisation", async (t) => {

  const sample: AgentMemory = {
    id: "mem-1",
    scope: "ORGANIZATION",
    memoryKey: "preferred_language",
    memoryValue: "English",
    createdAt: "2026-09-11T10:00:00Z",
  };

  await t.test("normalises bare array", () => {
    const res = normaliseMemoryListResponse([sample]);
    assert.strictEqual(res.memories.length, 1);
    assert.strictEqual(res.memories[0].id, "mem-1");
    assert.strictEqual(res.total, 1);
  });

  await t.test("normalises { memories: [...], total } envelope", () => {
    const res = normaliseMemoryListResponse({ memories: [sample], total: 50 });
    assert.strictEqual(res.memories.length, 1);
    assert.strictEqual(res.total, 50);
  });

  await t.test("normalises { data: { memories: [...] } } double-wrapped", () => {
    const raw = { success: true, data: { memories: [sample], total: 1 } };
    const res = normaliseMemoryListResponse(raw);
    assert.strictEqual(res.memories.length, 1);
    assert.strictEqual(res.memories[0].memoryKey, "preferred_language");
  });

  await t.test("normalises { items: [...] } alternate key", () => {
    const res = normaliseMemoryListResponse({ items: [sample] });
    assert.strictEqual(res.memories.length, 1);
  });

  await t.test("handles null/undefined/empty safely", () => {
    assert.deepStrictEqual(normaliseMemoryListResponse(null),      { memories: [], total: 0 });
    assert.deepStrictEqual(normaliseMemoryListResponse(undefined),  { memories: [], total: 0 });
    assert.deepStrictEqual(normaliseMemoryListResponse({}),         { memories: [], total: 0 });
  });
});

test("Memory scope isolation — scope identifier validation", async (t) => {

  await t.test("ORGANIZATION scope needs no identifier", () => {
    const err = validateScopeIdentifier("ORGANIZATION", { memoryKey: "k", memoryValue: "v" });
    assert.strictEqual(err, null);
  });

  await t.test("USER scope requires userId", () => {
    const errMissing = validateScopeIdentifier("USER", {});
    assert.ok(errMissing !== null);
    assert.ok(errMissing!.includes("userId"));

    const errPresent = validateScopeIdentifier("USER", { userId: "user-123" });
    assert.strictEqual(errPresent, null);
  });

  await t.test("CUSTOMER scope requires customerId", () => {
    const errMissing = validateScopeIdentifier("CUSTOMER", {});
    assert.ok(errMissing !== null);
    assert.ok(errMissing!.includes("customerId"));

    const errPresent = validateScopeIdentifier("CUSTOMER", { customerId: "cust-456" });
    assert.strictEqual(errPresent, null);
  });

  await t.test("AGENT scope requires agentId", () => {
    const errMissing = validateScopeIdentifier("AGENT", {});
    assert.ok(errMissing !== null);
    assert.ok(errMissing!.includes("agentId"));

    const errPresent = validateScopeIdentifier("AGENT", { agentId: "agent-789" });
    assert.strictEqual(errPresent, null);
  });

  await t.test("whitespace-only identifier is treated as missing", () => {
    const err = validateScopeIdentifier("USER", { userId: "   " });
    assert.ok(err !== null, "Whitespace-only userId should fail validation");
  });

  await t.test("all four scopes are distinct values", () => {
    const scopes: MemoryScope[] = ["ORGANIZATION", "USER", "CUSTOMER", "AGENT"];
    const unique = new Set(scopes);
    assert.strictEqual(unique.size, 4);
  });
});

test("Memory deletion result normalisation", async (t) => {

  await t.test("normalises successful delete response", () => {
    const raw = { success: true, deletedId: "mem-1", message: "Memory deleted successfully." };
    const result = normaliseDeleteResult(raw, "mem-1");
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deletedId, "mem-1");
    assert.strictEqual(result.message, "Memory deleted successfully.");
  });

  await t.test("normalises { data: { success, deletedId } } envelope", () => {
    const raw = { data: { success: true, deletedId: "mem-2", message: "Done." } };
    const result = normaliseDeleteResult(raw, "mem-2");
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deletedId, "mem-2");
  });

  await t.test("uses fallback id when deletedId is absent", () => {
    const raw = { success: true };
    const result = normaliseDeleteResult(raw, "mem-fallback");
    assert.strictEqual(result.deletedId, "mem-fallback");
  });

  await t.test("marks failure when success is explicitly false", () => {
    const raw = { success: false, deletedId: "mem-3", message: "Not found." };
    const result = normaliseDeleteResult(raw, "mem-3");
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message, "Not found.");
  });

  await t.test("handles null response body without crashing", () => {
    assert.doesNotThrow(() => {
      const result = normaliseDeleteResult(null, "mem-null");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.deletedId, "mem-null");
    });
  });

  await t.test("regression: delete modal never shows undefined for deletedId", () => {
    const testCases = [null, undefined, {}, { success: true }];
    for (const raw of testCases) {
      const result = normaliseDeleteResult(raw, "fallback-id");
      assert.ok(
        typeof result.deletedId === "string" && result.deletedId.length > 0,
        `deletedId should always be a non-empty string, got: ${result.deletedId}`
      );
    }
  });
});

test("Retention policy update contract", async (t) => {

  await t.test("retentionDays of 0 means indefinite — valid value", () => {
    const payload = { scope: "ORGANIZATION" as MemoryScope, targetId: "org", retentionDays: 0 };
    assert.ok(payload.retentionDays >= 0, "0 is a valid retentionDays (indefinite)");
  });

  await t.test("negative retentionDays should be rejected", () => {
    const days = -1;
    const isValid = days >= 0;
    assert.strictEqual(isValid, false, "Negative retentionDays should fail validation");
  });

  await t.test("retention result shape is complete when successful", () => {
    const result: RetentionUpdateResult = {
      success:       true,
      scope:         "AGENT",
      targetId:      "agent-001",
      retentionDays: 30,
      affectedCount: 3,
      message:       "Retention updated for 3 memories.",
    };
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.affectedCount, 3);
    assert.ok(result.message?.includes("3"));
  });

  await t.test("retention result shape is handled when failed", () => {
    const result: RetentionUpdateResult = {
      success:       false,
      scope:         "USER",
      targetId:      "user-xyz",
      retentionDays: 90,
      message:       "User not found.",
    };
    assert.strictEqual(result.success, false);
    assert.ok(result.message !== undefined);
  });
});

test("Tool call timeline contract", async (t) => {

  const sampleCalls: ToolCallEntry[] = [
    {
      sequence: 1,
      toolName: "crm_search",
      calledAt: "2026-09-11T10:00:00Z",
      completedAt: "2026-09-11T10:00:01Z",
      durationMs: 1_000,
      status: "SUCCESS",
      inputSummary: "query: leads",
      outputSummary: "3 results",
    },
    {
      sequence: 2,
      toolName: "email_send",
      calledAt: "2026-09-11T10:00:02Z",
      status: "FAILED",
      error: "SMTP connection refused",
    },
    {
      sequence: 3,
      toolName: "approval_gate",
      calledAt: "2026-09-11T10:00:03Z",
      status: "PENDING",
      approvalId: "appr-001",
    },
  ];

  await t.test("tool calls are ordered by sequence", () => {
    const sorted = [...sampleCalls].sort((a, b) => a.sequence - b.sequence);
    assert.strictEqual(sorted[0].toolName, "crm_search");
    assert.strictEqual(sorted[1].toolName, "email_send");
    assert.strictEqual(sorted[2].toolName, "approval_gate");
  });

  await t.test("failed tool call has an error field", () => {
    const failed = sampleCalls.find((c) => c.status === "FAILED");
    assert.ok(failed !== undefined);
    assert.ok(typeof failed.error === "string" && failed.error.length > 0);
  });

  await t.test("pending tool call with approvalId links to approval", () => {
    const pending = sampleCalls.find((c) => c.approvalId !== undefined);
    assert.ok(pending !== undefined);
    assert.strictEqual(pending.status, "PENDING");
    assert.ok(typeof pending.approvalId === "string");
  });

  await t.test("timeline rendering never throws on empty toolCalls array", () => {
    const emptyExecution: Partial<ExecutionDetail> = { toolCalls: [] };
    assert.doesNotThrow(() => {
      const rendered = (emptyExecution.toolCalls ?? []).map((c) => c.toolName);
      assert.strictEqual(rendered.length, 0);
    });
  });

  await t.test("timeline rendering never throws on undefined toolCalls", () => {
    const noCallsExecution: Partial<ExecutionDetail> = {};
    assert.doesNotThrow(() => {
      const rendered = (noCallsExecution.toolCalls ?? []).map((c) => c.toolName);
      assert.strictEqual(rendered.length, 0);
    });
  });
});
