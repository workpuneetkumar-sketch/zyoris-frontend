/**
 * types/agents.ts
 * ─────────────────────────────────────────────────────────────
 * All TypeScript types for the Agentic CRM Agent Registry.
 *
 * Design principle: these types describe what the backend returns.
 * The frontend never derives authorisation logic from them — it
 * renders exactly what the server sends and re-fetches after every
 * mutation rather than assuming success.
 */

// ─── Enumerations ────────────────────────────────────────────────────────────

/**
 * The four possible outcomes of an agent execution request.
 * Not wired to any UI yet (POST /api/agents/execute is Day 4+),
 * but the type lives here so later work slots in without a
 * types refactor.
 */
export type AgentResponseStatus =
  | "SUCCESS"
  | "SUGGESTION_ONLY"
  | "APPROVAL_REQUIRED"
  | "BLOCKED";

/**
 * Backend-authoritative risk classification for an agent.
 * Higher tiers get more prominent visual treatment and narrower
 * default permission sets.
 */
export type RiskTier = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Backend-authoritative capability level for an agent.
 * These map 1-to-1 to the five named levels in the task brief.
 */
export type PermissionLevel =
  | "READ_ONLY"
  | "SUGGEST"
  | "EXECUTE_WITH_APPROVAL"
  | "EXECUTE_WITHIN_LIMITS"
  | "AUTONOMOUS";

/**
 * Lifecycle status of an agent registration.
 * The frontend renders whatever string the backend returns;
 * this union covers the values we know about.  An unknown string
 * falls through to the "neutral" badge style.
 */
export type AgentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT" | string;

// ─── Sub-object types ────────────────────────────────────────────────────────

/**
 * A single version snapshot entry in the agent's changelog history.
 */
export interface AgentVersionEntry {
  /** Semantic version string, e.g. "1.2.0" */
  versionNumber: string;
  /** ISO-8601 timestamp of when this snapshot was created */
  createdAt: string;
  /** Human-readable description of what changed */
  changelog: string;
  /** Optional: who created this snapshot */
  createdBy?: string;
}

/**
 * Policy governing which AI model(s) this agent may use.
 */
export interface ModelPolicy {
  /** Allowlisted model identifiers, e.g. ["gpt-4o", "claude-3-5-sonnet"] */
  allowedModels?: string[];
  /** The default/preferred model identifier */
  defaultModel?: string;
  /** Maximum token budget per invocation */
  maxTokensPerCall?: number;
  /** Any additional freeform notes set by the admin */
  notes?: string;
}

/**
 * Policy governing what the agent is allowed to remember between calls.
 */
export interface MemoryPolicy {
  /** Whether the agent has access to short-term (in-session) memory */
  shortTermEnabled?: boolean;
  /** Whether the agent has access to long-term (cross-session) memory */
  longTermEnabled?: boolean;
  /** Maximum number of memory items the agent may store */
  maxMemoryItems?: number;
  /** TTL in seconds for memory entries, if applicable */
  retentionSeconds?: number;
  /** Any additional freeform notes set by the admin */
  notes?: string;
}

/**
 * Describes what data this agent is allowed to read / write.
 */
export interface DataScope {
  /** CRM entity types this agent may access, e.g. ["leads", "deals"] */
  allowedEntities?: string[];
  /** Whether write access is permitted within those entities */
  writeAccess?: boolean;
  /** Any field-level restrictions */
  restrictedFields?: string[];
  /** Freeform description of the data boundary */
  description?: string;
}

// ─── Core Agent types ────────────────────────────────────────────────────────

/**
 * Lightweight agent record — returned by GET /api/agents (list endpoint).
 * Contains only the fields needed to render a table row + badges.
 */
export interface Agent {
  id: string;
  name: string;
  /** One-sentence description of what the agent does */
  purpose: string;
  status: AgentStatus;
  riskTier: RiskTier;
  permissionLevel: PermissionLevel;
  /** Current semver string, e.g. "1.0.0" */
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Full agent record — returned by GET /api/agents/:id (detail endpoint).
 * Extends the list shape with the full policy set.
 */
export interface AgentDetail extends Agent {
  /** Ordered list of tool identifiers this agent may invoke */
  allowedTools: string[];
  dataScope: DataScope;
  modelPolicy: ModelPolicy;
  memoryPolicy: MemoryPolicy;
  /** Ordered from oldest to newest */
  versionHistory?: AgentVersionEntry[];
  /** Freeform metadata the backend may include */
  metadata?: Record<string, unknown>;
}

// ─── API request / response shapes ──────────────────────────────────────────

/**
 * Query params accepted by GET /api/agents.
 * All fields are optional; omitted fields are not sent.
 */
export interface AgentListFilters {
  search?: string;
  status?: AgentStatus;
  riskTier?: RiskTier;
  permissionLevel?: PermissionLevel;
}

/**
 * Payload for POST /api/agents (register new agent).
 */
export interface RegisterAgentPayload {
  name: string;
  purpose: string;
  riskTier: RiskTier;
  permissionLevel: PermissionLevel;
  allowedTools: string[];
  dataScope: DataScope;
  modelPolicy: ModelPolicy;
  memoryPolicy: MemoryPolicy;
  /** Starting version string, e.g. "1.0.0" */
  initialVersion?: string;
  /** Changelog message for the initial version */
  changelog?: string;
}

/**
 * Payload for PUT /api/agents/:id (update agent metadata / create snapshot).
 */
export interface UpdateAgentPayload {
  purpose?: string;
  riskTier?: RiskTier;
  permissionLevel?: PermissionLevel;
  allowedTools?: string[];
  dataScope?: DataScope;
  modelPolicy?: ModelPolicy;
  memoryPolicy?: MemoryPolicy;
  /** When true, the backend creates a version snapshot */
  createVersionSnapshot?: boolean;
  /** Required when createVersionSnapshot is true */
  versionNumber?: string;
  /** Required when createVersionSnapshot is true */
  changelog?: string;
}

/**
 * Standard envelope that wraps every backend response.
 * The backend may return either `{ data: T }` or the payload directly;
 * agentApi.ts normalises both shapes before returning to callers.
 */
export interface ApiEnvelope<T> {
  data?: T;
  message?: string;
  success?: boolean;
  /** HTTP-level status text from the backend, if provided */
  status?: string;
}

/**
 * Shape of the paginated list response from GET /api/agents.
 * If the backend returns a plain array, agentApi.ts wraps it.
 */
export interface AgentListResponse {
  agents: Agent[];
  total?: number;
  page?: number;
  pageSize?: number;
}
