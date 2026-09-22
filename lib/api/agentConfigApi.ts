/**
 * lib/api/agentConfigApi.ts
 * ─────────────────────────────────────────────────────────────
 * Service layer for Agent Configuration (Day 7).
 *
 * Endpoints:
 *   GET  /api/admin/agents/:agentId/config  — fetch current config
 *   POST /api/admin/agents/:agentId/config  — save updated config
 *   GET  /api/admin/agents                  — list agents for the selector
 *
 * Mock flag: NEXT_PUBLIC_USE_MOCKS !== "false"
 *
 * Non-negotiables:
 * - Backend rejections of out-of-scope tools are SURFACED, never hidden.
 *   The SaveAgentConfigResponse.rejectedToolIds field carries these back
 *   to the UI; silently ignoring them is a governance violation.
 * - The UI never grants or enforces permissions — it renders what the
 *   server returns.
 * - Status/enum fields uppercased at this layer (Bug-2).
 * - List responses normalised across multiple key shapes (Bug-1).
 */

import api from "@/lib/api/api";
import type {
  AgentConfig,
  SaveAgentConfigPayload,
  SaveAgentConfigResponse,
  ContentTrustLevel,
} from "@/lib/types/day7.ts";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CONFIGS: Record<string, AgentConfig> = {
  "lead-qualification-agent": {
    agentId: "lead-qualification-agent",
    agentName: "Lead Qualification Agent",
    systemPrompt:
      "You are a lead qualification specialist for Zyoris CRM. Analyse the lead's profile, " +
      "activity history, and firmographic data to produce a qualification score from 0–100. " +
      "Always cite the specific data points that drove your score. " +
      "Never invent data that is not present in the provided context. " +
      "If confidence is below 60%, flag the lead for human review instead of outputting a final score.",
    allowedToolIds: [
      "crm.lead.read",
      "crm.contact.read",
      "enrichment.clearbit",
      "scoring.model",
    ],
    rejectedToolIds: [],
    trustedContentBoundaries: [
      { label: "Internal CRM Data", pattern: "*.zyoris.com", trustLevel: "TRUSTED" },
      { label: "Clearbit Enrichment", pattern: "api.clearbit.com", trustLevel: "VERIFIED" },
      { label: "External Web", pattern: "*", trustLevel: "UNTRUSTED" },
    ],
    maxTokensPerCall: 4096,
    promptInjectionDefenceEnabled: true,
    minConfidenceThreshold: 60,
    riskTier: "MEDIUM",
    permissionLevel: "EXECUTE_WITH_APPROVAL",
    updatedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    updatedBy: "admin@zyoris.com",
  },
  "research-agent": {
    agentId: "research-agent",
    agentName: "Research Agent",
    systemPrompt:
      "You are a market research assistant. Summarise publicly available information about " +
      "the target company and its key stakeholders. Cite every claim with its source URL. " +
      "Do not speculate. If a piece of information cannot be verified, omit it and note the gap.",
    allowedToolIds: [
      "crm.company.read",
      "web.search",
      "enrichment.clearbit",
    ],
    rejectedToolIds: [],
    trustedContentBoundaries: [
      { label: "Internal CRM Data", pattern: "*.zyoris.com", trustLevel: "TRUSTED" },
      { label: "Clearbit", pattern: "api.clearbit.com", trustLevel: "VERIFIED" },
      { label: "LinkedIn Public", pattern: "linkedin.com", trustLevel: "VERIFIED" },
    ],
    maxTokensPerCall: 8192,
    promptInjectionDefenceEnabled: true,
    minConfidenceThreshold: 70,
    riskTier: "LOW",
    permissionLevel: "SUGGEST",
    updatedAt: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    updatedBy: "admin@zyoris.com",
  },
  "support-agent": {
    agentId: "support-agent",
    agentName: "Support Agent",
    systemPrompt:
      "You are a customer support assistant. Answer support questions using only the " +
      "knowledge base articles and case history provided. Do not answer questions outside " +
      "the provided context. Always cite the source article or case number.",
    allowedToolIds: [
      "kb.article.read",
      "crm.case.read",
      "crm.macro.read",
    ],
    rejectedToolIds: [],
    trustedContentBoundaries: [
      { label: "Internal KB", pattern: "kb.zyoris.com", trustLevel: "TRUSTED" },
      { label: "Support Cases", pattern: "cases.zyoris.com", trustLevel: "TRUSTED" },
    ],
    maxTokensPerCall: 2048,
    promptInjectionDefenceEnabled: true,
    minConfidenceThreshold: 75,
    riskTier: "LOW",
    permissionLevel: "READ_ONLY",
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    updatedBy: "admin@zyoris.com",
  },
};

// Available tools for the tool scope selector
export const AVAILABLE_TOOLS = [
  { id: "crm.lead.read",       label: "CRM — Read Leads",       category: "CRM",           riskTier: "LOW"    },
  { id: "crm.lead.write",      label: "CRM — Write Leads",      category: "CRM",           riskTier: "HIGH"   },
  { id: "crm.deal.read",       label: "CRM — Read Deals",       category: "CRM",           riskTier: "LOW"    },
  { id: "crm.deal.write",      label: "CRM — Write Deals",      category: "CRM",           riskTier: "HIGH"   },
  { id: "crm.contact.read",    label: "CRM — Read Contacts",    category: "CRM",           riskTier: "LOW"    },
  { id: "crm.company.read",    label: "CRM — Read Companies",   category: "CRM",           riskTier: "LOW"    },
  { id: "crm.case.read",       label: "CRM — Read Cases",       category: "CRM",           riskTier: "LOW"    },
  { id: "crm.macro.read",      label: "CRM — Read Macros",      category: "CRM",           riskTier: "LOW"    },
  { id: "kb.article.read",     label: "KB — Read Articles",     category: "KNOWLEDGE",     riskTier: "LOW"    },
  { id: "enrichment.clearbit", label: "Clearbit Enrichment",    category: "INTEGRATION",   riskTier: "MEDIUM" },
  { id: "scoring.model",       label: "Scoring Model",          category: "ANALYTICS",     riskTier: "MEDIUM" },
  { id: "web.search",          label: "Web Search",             category: "SEARCH",        riskTier: "MEDIUM" },
  { id: "email.send",          label: "Send Email",             category: "COMMUNICATION", riskTier: "HIGH"   },
  { id: "workflow.trigger",    label: "Trigger Workflow",       category: "AUTOMATION",    riskTier: "CRITICAL"},
  { id: "finance.read",        label: "Finance — Read",         category: "FINANCE",       riskTier: "HIGH"   },
] as const;

// ─── Normalisation ────────────────────────────────────────────────────────────

function normaliseConfig(raw: AgentConfig): AgentConfig {
  return {
    ...raw,
    riskTier:        (typeof raw.riskTier        === "string" ? raw.riskTier.toUpperCase()        : raw.riskTier)        as AgentConfig["riskTier"],
    permissionLevel: (typeof raw.permissionLevel === "string" ? raw.permissionLevel.toUpperCase() : raw.permissionLevel) as AgentConfig["permissionLevel"],
    trustedContentBoundaries: (raw.trustedContentBoundaries ?? []).map((b) => ({
      ...b,
      trustLevel: (typeof b.trustLevel === "string" ? b.trustLevel.toUpperCase() : b.trustLevel) as ContentTrustLevel,
    })),
    allowedToolIds:  Array.isArray(raw.allowedToolIds)  ? raw.allowedToolIds  : [],
    rejectedToolIds: Array.isArray(raw.rejectedToolIds) ? raw.rejectedToolIds : [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/agents/:agentId/config
 * Fetch the current configuration for a specific agent.
 */
export async function getAgentConfig(agentId: string): Promise<AgentConfig> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 500));
    const config = MOCK_CONFIGS[agentId];
    if (!config) {
      // Return a blank config for unknown agents so the form can be populated
      return normaliseConfig({
        agentId,
        agentName: agentId,
        systemPrompt: "",
        allowedToolIds: [],
        rejectedToolIds: [],
        trustedContentBoundaries: [],
        maxTokensPerCall: 4096,
        promptInjectionDefenceEnabled: true,
        minConfidenceThreshold: 60,
        riskTier: "LOW",
        permissionLevel: "SUGGEST",
        updatedAt: new Date().toISOString(),
      });
    }
    return normaliseConfig({ ...config });
  }

  try {
    const res = await api.get(`/api/admin/agents/${agentId}/config`);
    const raw = res.data?.data ?? res.data;
    return normaliseConfig(raw as AgentConfig);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || `Failed to load config for agent "${agentId}".`
    );
  }
}

/**
 * POST /api/admin/agents/:agentId/config
 * Save updated configuration. Returns the saved config and any
 * tool IDs that were rejected by the backend as out-of-scope.
 *
 * The caller MUST inspect rejectedToolIds and surface them to the user —
 * never silently discard a backend rejection.
 */
export async function saveAgentConfig(
  agentId: string,
  payload: SaveAgentConfigPayload
): Promise<SaveAgentConfigResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 700));

    // Simulate: finance.read and workflow.trigger require CRITICAL tier
    const highRiskTools = ["finance.read", "workflow.trigger"];
    const rejectedToolIds = payload.allowedToolIds.filter(
      (id) => highRiskTools.includes(id)
    );
    const accepted = payload.allowedToolIds.filter(
      (id) => !highRiskTools.includes(id)
    );

    const updated: AgentConfig = {
      ...(MOCK_CONFIGS[agentId] ?? {}),
      agentId,
      agentName: MOCK_CONFIGS[agentId]?.agentName ?? agentId,
      ...payload,
      allowedToolIds: accepted,
      rejectedToolIds,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin@zyoris.com",
      riskTier: MOCK_CONFIGS[agentId]?.riskTier ?? "LOW",
      permissionLevel: MOCK_CONFIGS[agentId]?.permissionLevel ?? "SUGGEST",
    };
    if (MOCK_CONFIGS[agentId]) {
      MOCK_CONFIGS[agentId] = updated;
    }
    return {
      config: normaliseConfig(updated),
      rejectedToolIds: rejectedToolIds.length > 0 ? rejectedToolIds : undefined,
      message: rejectedToolIds.length > 0
        ? `Config saved. ${rejectedToolIds.length} tool(s) were rejected as out-of-scope for this agent's permission tier.`
        : "Configuration saved successfully.",
    };
  }

  try {
    const res = await api.post(`/api/admin/agents/${agentId}/config`, payload);
    const data = res.data?.data ?? res.data;
    return {
      config: normaliseConfig(data.config ?? data),
      rejectedToolIds: data.rejectedToolIds,
      message: data.message,
    };
  } catch (err: any) {
    // 422 = backend rejected specific tools — surface the detail
    if (err.response?.status === 422) {
      throw new Error(
        err.response.data?.message ||
        "Some requested tools were rejected as out-of-scope. Check the tool scope configuration."
      );
    }
    if (err.response?.status === 403) {
      throw new Error("You are not authorised to modify this agent's configuration.");
    }
    throw new Error(
      err.response?.data?.message || err.message || "Failed to save agent configuration."
    );
  }
}

/**
 * GET /api/admin/agents — list of agents for the config page selector.
 * Returns a minimal shape — just id + name.
 */
export async function listConfigurableAgents(): Promise<{ id: string; name: string }[]> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 300));
    return Object.values(MOCK_CONFIGS).map((c) => ({ id: c.agentId, name: c.agentName }));
  }

  try {
    const res = await api.get("/api/agents");
    const raw = res.data?.data ?? res.data;
    const list: any[] =
      Array.isArray(raw)        ? raw :
      Array.isArray(raw.agents) ? raw.agents :
      Array.isArray(raw.items)  ? raw.items  : [];
    return list.map((a: any) => ({ id: a.id, name: a.name }));
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || "Failed to load agents list."
    );
  }
}

export type { AgentConfig, SaveAgentConfigPayload, SaveAgentConfigResponse } from "@/lib/types/day7.ts";
export { type ContentTrustLevel } from "@/lib/types/day7.ts";
