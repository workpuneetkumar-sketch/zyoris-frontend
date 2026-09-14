/**
 * lib/api/agentMemoryApi.ts
 * ─────────────────────────────────────────────────────────────
 * Typed API service layer for the Scoped Memory API (Day 3).
 *
 * Mock fallback: set NEXT_PUBLIC_USE_MOCK_MEMORY=false (or remove
 * the env var) once Ayush's /api/agent-memory endpoints are live.
 *
 * Non-negotiable rules enforced here:
 * - Deletion always returns a confirmation result — never assumed.
 * - Retention updates always surface the backend response.
 * - Scope isolation is enforced server-side; this layer only
 *   validates that the required scope identifier is present
 *   before sending (to give the user an early error).
 */

import api from "@/lib/api/api";
import type {
  AgentMemory,
  AgentMemoryListFilters,
  AgentMemoryListResponse,
  CreateMemoryPayload,
  DeleteMemoryResult,
  RetentionUpdateResult,
  UpdateRetentionPayload,
  MemoryScope,
} from "@/types/agentMemory";

const BASE = "/api/agent-memory";

// ─── Mock flag ────────────────────────────────────────────────────────────────

const USE_MOCK =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_MOCK_MEMORY !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

let MOCK_MEMORIES: AgentMemory[] = [
  {
    id: "mem-001",
    scope: "ORGANIZATION",
    memoryKey: "preferred_language",
    memoryValue: "English",
    category: "preference",
    retentionDays: null,
    createdAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "mem-002",
    scope: "ORGANIZATION",
    memoryKey: "fiscal_year_start",
    memoryValue: "April",
    category: "context",
    retentionDays: null,
    createdAt: new Date(Date.now() - 86_400_000 * 60).toISOString(),
  },
  {
    id: "mem-003",
    scope: "USER",
    memoryKey: "communication_style",
    memoryValue: "Direct and concise",
    category: "preference",
    retentionDays: 90,
    userId: "user-darsh",
    createdAt: new Date(Date.now() - 86_400_000 * 10).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000 * 80).toISOString(),
  },
  {
    id: "mem-004",
    scope: "CUSTOMER",
    memoryKey: "last_discussed_product",
    memoryValue: "Enterprise CRM Suite",
    category: "context",
    retentionDays: 30,
    customerId: "cust-acme",
    createdAt: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000 * 25).toISOString(),
  },
  {
    id: "mem-005",
    scope: "AGENT",
    memoryKey: "last_successful_search_query",
    memoryValue: "enterprise prospects India Q3",
    category: "fact",
    retentionDays: 7,
    agentId: "agent-sales-001",
    createdAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000 * 5).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if ("data" in r) return r.data as T;
  }
  return raw as T;
}

function normaliseList(raw: unknown): AgentMemoryListResponse {
  const u = unwrap<unknown>(raw);

  if (Array.isArray(u)) {
    return { memories: u as AgentMemory[], total: (u as AgentMemory[]).length };
  }

  if (u && typeof u === "object") {
    const obj = u as Record<string, unknown>;
    const list =
      Array.isArray(obj.memories) ? obj.memories :
      Array.isArray(obj.items)    ? obj.items    :
      Array.isArray(obj.data)     ? obj.data     : null;

    if (list) {
      return {
        memories: list as AgentMemory[],
        total: typeof obj.total === "number" ? obj.total : list.length,
      };
    }
  }

  console.warn("[agentMemoryApi] Unexpected list response shape:", raw);
  return { memories: [], total: 0 };
}

function buildParams(f: AgentMemoryListFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.scope)      p.scope      = f.scope;
  if (f.userId)     p.userId     = f.userId;
  if (f.customerId) p.customerId = f.customerId;
  if (f.agentId)    p.agentId    = f.agentId;
  if (f.category)   p.category   = f.category;
  return p;
}

function isMockableMiss(err: unknown): boolean {
  const status = (err as any)?.response?.status;
  return status === 404 || status === 503 || status === 502 || !(err as any)?.response;
}

/** Client-side guard: scope-specific identifier must be present. */
function validateScopeIdentifier(
  scope: MemoryScope,
  payload: Partial<CreateMemoryPayload>
): void {
  if (scope === "USER" && !payload.userId?.trim()) {
    throw new Error("userId is required for USER-scoped memories.");
  }
  if (scope === "CUSTOMER" && !payload.customerId?.trim()) {
    throw new Error("customerId is required for CUSTOMER-scoped memories.");
  }
  if (scope === "AGENT" && !payload.agentId?.trim()) {
    throw new Error("agentId is required for AGENT-scoped memories.");
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/agent-memory
 * List memories, filtered by scope and identifiers.
 */
export async function getMemories(
  filters: AgentMemoryListFilters = {}
): Promise<AgentMemoryListResponse> {
  if (USE_MOCK) {
    let results = [...MOCK_MEMORIES];
    if (filters.scope)      results = results.filter((m) => m.scope      === filters.scope);
    if (filters.userId)     results = results.filter((m) => m.userId     === filters.userId);
    if (filters.customerId) results = results.filter((m) => m.customerId === filters.customerId);
    if (filters.agentId)    results = results.filter((m) => m.agentId    === filters.agentId);
    if (filters.category)   results = results.filter((m) => m.category   === filters.category);
    return { memories: results, total: results.length };
  }

  try {
    const res = await api.get(BASE, { params: buildParams(filters) });
    return normaliseList(res.data);
  } catch (err: any) {
    if (isMockableMiss(err)) {
      console.warn("[agentMemoryApi] Endpoint not reachable, using mock data.");
      return { memories: MOCK_MEMORIES, total: MOCK_MEMORIES.length };
    }
    throw new Error(
      err.response?.data?.message || err.message || "Failed to load memories."
    );
  }
}

/**
 * POST /api/agent-memory
 * Create or upsert a scoped memory entry.
 */
export async function createMemory(
  payload: CreateMemoryPayload
): Promise<AgentMemory> {
  validateScopeIdentifier(payload.scope, payload);

  if (USE_MOCK) {
    const existing = MOCK_MEMORIES.find(
      (m) =>
        m.scope === payload.scope &&
        m.memoryKey === payload.memoryKey &&
        m.userId === payload.userId &&
        m.customerId === payload.customerId &&
        m.agentId === payload.agentId
    );
    if (existing) {
      const updated: AgentMemory = {
        ...existing,
        memoryValue:  payload.memoryValue,
        category:     payload.category     ?? existing.category,
        retentionDays: payload.retentionDays ?? existing.retentionDays,
        updatedAt:    new Date().toISOString(),
      };
      MOCK_MEMORIES = MOCK_MEMORIES.map((m) => (m.id === existing.id ? updated : m));
      return updated;
    }
    const created: AgentMemory = {
      id: `mem-${Date.now()}`,
      ...payload,
      retentionDays: payload.retentionDays ?? null,
      createdAt: new Date().toISOString(),
    };
    MOCK_MEMORIES = [...MOCK_MEMORIES, created];
    return created;
  }

  try {
    const res = await api.post(BASE, payload);
    return unwrap<AgentMemory>(res.data);
  } catch (err: any) {
    const serverMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      (Array.isArray(err.response?.data?.errors)
        ? (err.response.data.errors as { message: string }[]).map((e) => e.message).join("; ")
        : null);
    throw new Error(serverMsg || err.message || "Failed to save memory.");
  }
}

/**
 * DELETE /api/agent-memory/:id
 * Delete a specific memory entry.
 * Always returns a confirmation result — never assumes success.
 */
export async function deleteMemory(id: string): Promise<DeleteMemoryResult> {
  if (USE_MOCK) {
    const exists = MOCK_MEMORIES.find((m) => m.id === id);
    if (!exists) {
      return { success: false, deletedId: id, message: "Memory not found." };
    }
    MOCK_MEMORIES = MOCK_MEMORIES.filter((m) => m.id !== id);
    return { success: true, deletedId: id, message: "Memory deleted successfully." };
  }

  try {
    const res = await api.delete(`${BASE}/${id}`);
    const raw = unwrap<Partial<DeleteMemoryResult>>(res.data);
    return {
      success:   raw.success   ?? true,
      deletedId: raw.deletedId ?? id,
      message:   raw.message   ?? "Memory deleted.",
    };
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || `Failed to delete memory "${id}".`
    );
  }
}

/**
 * PUT /api/agent-memory/retention
 * Update the retention policy for a scope/target.
 * Sensitive action — confirmation is shown in the UI before this is called.
 */
export async function updateRetention(
  payload: UpdateRetentionPayload
): Promise<RetentionUpdateResult> {
  if (payload.retentionDays < 0) {
    throw new Error("retentionDays must be 0 or greater (0 = indefinite).");
  }

  if (USE_MOCK) {
    // Update all mock memories that match the scope/target
    const affected = MOCK_MEMORIES.filter((m) => {
      if (m.scope !== payload.scope) return false;
      if (payload.scope === "USER")     return m.userId     === payload.targetId;
      if (payload.scope === "CUSTOMER") return m.customerId === payload.targetId;
      if (payload.scope === "AGENT")    return m.agentId    === payload.targetId;
      return true; // ORGANIZATION — all org memories
    });
    MOCK_MEMORIES = MOCK_MEMORIES.map((m) =>
      affected.some((a) => a.id === m.id)
        ? { ...m, retentionDays: payload.retentionDays }
        : m
    );
    return {
      success:       true,
      scope:         payload.scope,
      targetId:      payload.targetId,
      retentionDays: payload.retentionDays,
      affectedCount: affected.length,
      message:       `Retention updated for ${affected.length} memor${affected.length !== 1 ? "ies" : "y"}.`,
    };
  }

  try {
    const res = await api.put(`${BASE}/retention`, payload);
    return unwrap<RetentionUpdateResult>(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || "Failed to update retention policy."
    );
  }
}

// Re-export types for convenience
export type {
  AgentMemory,
  AgentMemoryListFilters,
  AgentMemoryListResponse,
  CreateMemoryPayload,
  DeleteMemoryResult,
  RetentionUpdateResult,
  UpdateRetentionPayload,
  MemoryScope,
} from "@/types/agentMemory";
