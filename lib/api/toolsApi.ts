/**
 * lib/api/toolsApi.ts
 * ─────────────────────────────────────────────────────────────
 * Typed API service layer for the Tool Registry and Tool
 * Permission Matrix.
 *
 * Design notes:
 * - Uses the shared axios instance so auth, token-refresh, and
 *   retry logic are all handled centrally.
 * - Never infers or enforces permissions client-side. Every
 *   policy write goes to PUT /api/tools/:name/policy and the
 *   component re-fetches after the call rather than assuming
 *   the server accepted the update.
 * - Response normalisation lives here; callers always get
 *   typed, unwrapped values.
 */

import api from "@/lib/api/api";
import type {
  Tool,
  ToolListFilters,
  ToolListResponse,
  ToolPolicyMatrix,
  UpdateToolPolicyPayload,
  AgentToolPolicy,
} from "@/types/tools";

const BASE = "/api/tools";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if ("data" in r) return r.data as T;
  }
  return raw as T;
}

function normaliseToolList(raw: unknown): ToolListResponse {
  const u = unwrap<unknown>(raw);

  if (Array.isArray(u)) {
    return { tools: u as Tool[], total: (u as Tool[]).length };
  }

  if (u && typeof u === "object") {
    const obj = u as Record<string, unknown>;
    if (Array.isArray(obj.tools)) {
      return {
        tools: obj.tools as Tool[],
        total: typeof obj.total === "number" ? obj.total : (obj.tools as Tool[]).length,
      };
    }
    if (Array.isArray(obj.items)) {
      return { tools: obj.items as Tool[], total: (obj.items as Tool[]).length };
    }
  }

  console.warn("[toolsApi] Unexpected list response shape:", raw);
  return { tools: [], total: 0 };
}

function buildParams(filters: ToolListFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.search?.trim()) p.search    = filters.search.trim();
  if (filters.category)       p.category  = filters.category;
  if (filters.riskTier)       p.riskTier  = filters.riskTier;
  return p;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/tools
 * List all registered tools, optionally filtered.
 * Drives ToolRegistry + its filter bar.
 */
export async function getTools(
  filters: ToolListFilters = {}
): Promise<ToolListResponse> {
  try {
    const res = await api.get(BASE, { params: buildParams(filters) });
    return normaliseToolList(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || "Failed to load tools."
    );
  }
}

/**
 * GET /api/tools/:name
 * Fetch a single tool with all agent-policy rows for the matrix.
 * Assumed shape: { tool: Tool, agentPolicies: AgentToolPolicy[] }
 */
export async function getToolPolicyMatrix(name: string): Promise<ToolPolicyMatrix> {
  try {
    const res = await api.get(`${BASE}/${encodeURIComponent(name)}`);
    const u = unwrap<unknown>(res.data);

    // Backend may return the matrix directly or just the tool without policies
    if (u && typeof u === "object") {
      const obj = u as Record<string, unknown>;
      if (obj.tool && Array.isArray(obj.agentPolicies)) {
        return u as ToolPolicyMatrix;
      }
      // If backend returns just the tool, wrap it
      if ("name" in obj) {
        return { tool: obj as unknown as Tool, agentPolicies: [] };
      }
    }
    return u as ToolPolicyMatrix;
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || `Failed to load tool "${name}".`
    );
  }
}

/**
 * PUT /api/tools/:name/policy
 * Update a single agent's policy for the named tool.
 * Drives ToolPermissionMatrix save action.
 *
 * The backend is the authority. Re-fetch the matrix after this call —
 * never assume the local row reflects server state.
 */
export async function updateToolPolicy(
  toolName: string,
  payload: UpdateToolPolicyPayload
): Promise<AgentToolPolicy> {
  try {
    const res = await api.put(
      `${BASE}/${encodeURIComponent(toolName)}/policy`,
      payload
    );
    return unwrap<AgentToolPolicy>(res.data);
  } catch (err: any) {
    const serverMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      (Array.isArray(err.response?.data?.errors)
        ? (err.response.data.errors as { message: string }[])
            .map((e) => e.message)
            .join("; ")
        : null);
    throw new Error(
      serverMsg || err.message || `Failed to update policy for tool "${toolName}".`
    );
  }
}

// Re-export types for convenience
export type {
  Tool,
  ToolListFilters,
  ToolListResponse,
  ToolPolicyMatrix,
  UpdateToolPolicyPayload,
  AgentToolPolicy,
} from "@/types/tools";
