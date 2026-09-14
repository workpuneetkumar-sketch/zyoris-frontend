/**
 * types/agentMemory.ts
 * ─────────────────────────────────────────────────────────────
 * TypeScript types for the Scoped Memory API (Day 3).
 *
 * Memory must stay strictly scoped — ORGANIZATION, USER,
 * CUSTOMER, or AGENT — and never leak across scope boundaries.
 * The frontend only reflects what the backend returns; it never
 * grants or assumes cross-scope access.
 */

// ─── Memory scope ─────────────────────────────────────────────────────────────

/**
 * The four backend-authoritative memory scopes.
 * Visually distinguishable in every memory list/form view.
 */
export type MemoryScope =
  | "ORGANIZATION"
  | "USER"
  | "CUSTOMER"
  | "AGENT";

// ─── Core memory types ────────────────────────────────────────────────────────

/**
 * A single scoped memory entry as returned by GET /api/agent-memory.
 */
export interface AgentMemory {
  id: string;
  scope: MemoryScope;
  memoryKey: string;
  memoryValue: string;
  /** Optional semantic category (e.g. "preference", "fact", "context") */
  category?: string;
  /** How many days this memory is retained; null = indefinite */
  retentionDays?: number | null;
  /** ISO-8601 — when this memory entry expires, computed from retentionDays */
  expiresAt?: string | null;
  /** Set when scope = USER */
  userId?: string;
  /** Set when scope = CUSTOMER */
  customerId?: string;
  /** Set when scope = AGENT */
  agentId?: string;
  /** ISO-8601 timestamps */
  createdAt: string;
  updatedAt?: string;
}

// ─── API request / response shapes ───────────────────────────────────────────

/**
 * Query params for GET /api/agent-memory.
 * scope + the matching identifier are both required by the backend;
 * the UI enforces providing the relevant ID when a non-ORG scope is selected.
 */
export interface AgentMemoryListFilters {
  scope?: MemoryScope;
  userId?: string;
  customerId?: string;
  agentId?: string;
  category?: string;
}

/**
 * Body for POST /api/agent-memory (create / upsert).
 */
export interface CreateMemoryPayload {
  scope: MemoryScope;
  memoryKey: string;
  memoryValue: string;
  category?: string;
  retentionDays?: number | null;
  /** Required when scope = USER */
  userId?: string;
  /** Required when scope = CUSTOMER */
  customerId?: string;
  /** Required when scope = AGENT */
  agentId?: string;
}

/**
 * Body for PUT /api/agent-memory/retention.
 */
export interface UpdateRetentionPayload {
  scope: MemoryScope;
  /** The specific entity ID — userId / customerId / agentId depending on scope.
   *  For ORGANIZATION scope this is the org-level target ID. */
  targetId: string;
  retentionDays: number;
}

/**
 * Standard list response from GET /api/agent-memory.
 */
export interface AgentMemoryListResponse {
  memories: AgentMemory[];
  total?: number;
}

/**
 * Response from DELETE /api/agent-memory/:id.
 * Backend must return a confirmation — never assume success silently.
 */
export interface DeleteMemoryResult {
  success: boolean;
  deletedId: string;
  message?: string;
}

/**
 * Response from PUT /api/agent-memory/retention.
 */
export interface RetentionUpdateResult {
  success: boolean;
  scope: MemoryScope;
  targetId: string;
  retentionDays: number;
  message?: string;
  affectedCount?: number;
}
