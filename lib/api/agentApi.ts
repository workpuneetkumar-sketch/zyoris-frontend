/**
 * lib/api/agentApi.ts
 * ─────────────────────────────────────────────────────────────
 * Typed API service layer for the Agentic CRM Agent Registry.
 *
 * Design notes:
 * - Every function calls the shared axios instance (`api`) so auth
 *   headers, token refresh, and retry logic are handled centrally.
 * - Response normalisation lives here, not in components. If the
 *   backend wraps payloads in `{ data: ... }` or returns them bare,
 *   callers always get the unwrapped, typed value.
 * - POST /api/agents/execute is intentionally NOT implemented here
 *   (Day 4+ scope). The AgentResponseStatus type already exists in
 *   types/agents.ts so that work slots in without a refactor.
 * - Never infer or hard-code permission logic. Surface exactly what
 *   the server returns and let components render it.
 */

import api from "@/lib/api/api";
import type {
  Agent,
  AgentDetail,
  AgentListFilters,
  AgentListResponse,
  RegisterAgentPayload,
  UpdateAgentPayload,
  ApiEnvelope,
} from "@/types/agents";

// ─── Base path ───────────────────────────────────────────────────────────────

const BASE = "/api/agents";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Unwrap a backend envelope that may be `{ data: T }` or plain `T`.
 * Also tolerates `{ data: { agents: [...] } }` for list endpoints.
 */
function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if ("data" in r) return r.data as T;
  }
  return raw as T;
}

/**
 * Normalise the list response into a consistent AgentListResponse
 * regardless of whether the backend returns:
 *   - `{ agents: [...], total: N }`
 *   - `[...]`  (plain array)
 *   - `{ data: { agents: [...] } }`
 *   - `{ data: [...] }`
 */
function normaliseListResponse(raw: unknown): AgentListResponse {
  const unwrapped = unwrap<unknown>(raw);

  if (Array.isArray(unwrapped)) {
    return { agents: unwrapped as Agent[], total: (unwrapped as Agent[]).length };
  }

  if (unwrapped && typeof unwrapped === "object") {
    const u = unwrapped as Record<string, unknown>;

    if (Array.isArray(u.agents)) {
      return {
        agents: u.agents as Agent[],
        total: typeof u.total === "number" ? u.total : (u.agents as Agent[]).length,
        page: typeof u.page === "number" ? u.page : undefined,
        pageSize: typeof u.pageSize === "number" ? u.pageSize : undefined,
      };
    }

    // Some backends return { items: [...] }
    if (Array.isArray(u.items)) {
      return {
        agents: u.items as Agent[],
        total: typeof u.total === "number" ? u.total : (u.items as Agent[]).length,
      };
    }
  }

  // Fallback: empty list so callers don't crash
  console.warn("[agentApi] Unexpected list response shape:", raw);
  return { agents: [], total: 0 };
}

// ─── Query-param builder ──────────────────────────────────────────────────────

function buildParams(filters: AgentListFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.search?.trim())       params.search          = filters.search.trim();
  if (filters.status)               params.status          = filters.status;
  if (filters.riskTier)             params.riskTier        = filters.riskTier;
  if (filters.permissionLevel)      params.permissionLevel = filters.permissionLevel;
  return params;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/agents
 *
 * Fetch the list of registered agents, optionally filtered.
 * Drives AgentList + its filter bar.
 *
 * @param filters - Optional query params: search, status, riskTier, permissionLevel
 * @returns Normalised AgentListResponse with agents array + optional pagination info
 * @throws Error with a user-friendly message on failure
 */
export async function getAgents(
  filters: AgentListFilters = {}
): Promise<AgentListResponse> {
  try {
    const response = await api.get<ApiEnvelope<AgentListResponse> | Agent[] | AgentListResponse>(
      BASE,
      { params: buildParams(filters) }
    );
    return normaliseListResponse(response.data);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Failed to load agents. Please try again."
    );
  }
}

/**
 * GET /api/agents/:id
 *
 * Fetch the full policy detail for a single agent.
 * Drives AgentDetail.
 *
 * @param id - Agent UUID / identifier
 * @returns AgentDetail with full policy set, tools, data scope, and version history
 * @throws Error with a user-friendly message on failure
 */
export async function getAgent(id: string): Promise<AgentDetail> {
  try {
    const response = await api.get<ApiEnvelope<AgentDetail> | AgentDetail>(
      `${BASE}/${id}`
    );
    return unwrap<AgentDetail>(response.data);
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      `Failed to load agent "${id}". Please try again.`
    );
  }
}

/**
 * POST /api/agents
 *
 * Register a new agent.
 * Stretch goal for Day 1.
 *
 * The backend is the authority on whether the registration is allowed.
 * Surface any validation errors returned by the server; never assume
 * success until the server confirms it.
 *
 * @param payload - RegisterAgentPayload
 * @returns The newly created AgentDetail as returned by the backend
 * @throws Error with a user-friendly message on failure
 */
export async function registerAgent(
  payload: RegisterAgentPayload
): Promise<AgentDetail> {
  try {
    const response = await api.post<ApiEnvelope<AgentDetail> | AgentDetail>(
      BASE,
      payload
    );
    return unwrap<AgentDetail>(response.data);
  } catch (error: any) {
    // Surface structured validation errors from the backend when present
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (Array.isArray(error.response?.data?.errors)
        ? (error.response.data.errors as { message: string }[])
            .map((e) => e.message)
            .join("; ")
        : null);

    throw new Error(
      serverMessage || error.message || "Failed to register agent. Please try again."
    );
  }
}

/**
 * PUT /api/agents/:id
 *
 * Update agent metadata and/or create a version snapshot.
 * Stretch goal for Day 1.
 *
 * When `createVersionSnapshot` is true the backend creates a snapshot
 * and appends an entry to `versionHistory`. Re-fetch the detail after
 * calling this — never assume the local state reflects the new server
 * state.
 *
 * @param id      - Agent UUID / identifier
 * @param payload - UpdateAgentPayload (all fields optional)
 * @returns The updated AgentDetail as returned by the backend
 * @throws Error with a user-friendly message on failure
 */
export async function updateAgent(
  id: string,
  payload: UpdateAgentPayload
): Promise<AgentDetail> {
  try {
    const response = await api.put<ApiEnvelope<AgentDetail> | AgentDetail>(
      `${BASE}/${id}`,
      payload
    );
    return unwrap<AgentDetail>(response.data);
  } catch (error: any) {
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (Array.isArray(error.response?.data?.errors)
        ? (error.response.data.errors as { message: string }[])
            .map((e) => e.message)
            .join("; ")
        : null);

    throw new Error(
      serverMessage || error.message || `Failed to update agent "${id}". Please try again.`
    );
  }
}

// ─── Re-exports for convenience ───────────────────────────────────────────────
// Consumers can import both the functions and the types from this single module.

export type {
  Agent,
  AgentDetail,
  AgentListFilters,
  AgentListResponse,
  RegisterAgentPayload,
  UpdateAgentPayload,
} from "@/types/agents";
