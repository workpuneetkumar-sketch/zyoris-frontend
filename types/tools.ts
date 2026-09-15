/**
 * types/tools.ts
 * ─────────────────────────────────────────────────────────────
 * TypeScript types for the Tool Registry and Tool Permission Matrix.
 *
 * The frontend never grants permissions locally — it displays
 * server state and sends intent to the backend. Every PUT round-trips
 * through the API; re-fetch after any mutation.
 */

import type { PermissionLevel, RiskTier } from "@/types/agents";

// Re-export shared enums so downstream can import from one place
export type { PermissionLevel, RiskTier };

// ─── Tool category ────────────────────────────────────────────────────────────

/**
 * Functional category of a tool as returned by the backend.
 * Unknown strings fall back to a neutral style.
 */
export type ToolCategory =
  | "CRM"
  | "COMMUNICATION"
  | "FINANCE"
  | "HR"
  | "ANALYTICS"
  | "AUTOMATION"
  | "INTEGRATION"
  | "SEARCH"
  | "STORAGE"
  | "NOTIFICATION"
  | string;

// ─── Core tool types ──────────────────────────────────────────────────────────

/**
 * Summary of the default policy applied to this tool
 * when no agent-specific override exists.
 */
export interface ToolDefaultPolicy {
  permissionLevel: PermissionLevel;
  requireApproval: boolean;
  maxDailyExecutions?: number;
  allowedActions?: string[];
}

/**
 * Lightweight tool record — returned by GET /api/tools (list endpoint).
 */
export interface Tool {
  /** Unique tool identifier, used as the route param: /api/tools/:name */
  name: string;
  /** Human-readable display label */
  displayName?: string;
  /** Short description of what the tool does */
  description?: string;
  category: ToolCategory;
  riskTier: RiskTier;
  /** Whether the tool is currently enabled in the registry */
  enabled?: boolean;
  /** Default policy when no agent-specific override exists */
  defaultPolicy?: ToolDefaultPolicy;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Per-agent tool policy ────────────────────────────────────────────────────

/**
 * An agent's specific policy for a given tool.
 * Returned as part of the matrix data when listing all
 * agent×tool pairs for a selected tool.
 */
export interface AgentToolPolicy {
  agentId: string;
  agentName?: string;
  /** Which permission level this agent has for this tool */
  permissionLevel: PermissionLevel;
  /** Whether every execution requires an approval request */
  requireApproval: boolean;
  /** 0 = unlimited */
  maxDailyExecutions?: number;
  /** Subset of tool actions this agent may invoke */
  allowedActions?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * The full matrix for a single tool: the tool itself plus
 * all known agent policies for it.
 * Returned by GET /api/tools/:name (detail — assumed shape).
 */
export interface ToolPolicyMatrix {
  tool: Tool;
  agentPolicies: AgentToolPolicy[];
}

// ─── API request / response shapes ───────────────────────────────────────────

/**
 * Query params for GET /api/tools.
 */
export interface ToolListFilters {
  search?: string;
  category?: ToolCategory;
  riskTier?: RiskTier;
}

/**
 * Body for PUT /api/tools/:name/policy
 * Updates a single agent's policy for the named tool.
 */
export interface UpdateToolPolicyPayload {
  agentId: string;
  permissionLevel: PermissionLevel;
  requireApproval: boolean;
  maxDailyExecutions?: number;
  allowedActions?: string[];
}

/**
 * Standard list response shape from GET /api/tools.
 */
export interface ToolListResponse {
  tools: Tool[];
  total?: number;
}
