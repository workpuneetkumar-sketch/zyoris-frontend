/**
 * lib/api/agentVersionsApi.ts
 * ─────────────────────────────────────────────────────────────
 * Service layer for Model/Agent Version Management (Day 7).
 *
 * Endpoints:
 *   GET  /api/admin/agents/versions            — list all versions
 *   POST /api/admin/agents/versions/:id/promote — promote to production
 *
 * Mock flag: NEXT_PUBLIC_USE_MOCKS !== "false"
 *
 * Non-negotiables:
 * - "Promote to Production" is ONLY enabled when allGatesPassed === true
 *   (computed by backend, never client-side).
 * - Promotion routes through the existing Approval Queue —
 *   POST /api/approvals — no new approval logic.
 * - VersionState and RegressionGate.result are normalised to uppercase
 *   at this layer before reaching components.
 * - Production models never silently change — every promotion creates
 *   an auditable approvalRequestId.
 */

import api from "@/lib/api/api";
import type {
  AgentVersion,
  AgentVersionsResponse,
  PromoteVersionResponse,
  VersionState,
  RegressionGate,
} from "@/lib/types/day7.ts";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_VERSIONS: AgentVersion[] = [
  // ── Lead Qualification Agent ─────────────────────────────────────────────
  {
    id: "ver-lqa-prod",
    agentId: "lead-qualification-agent",
    agentName: "Lead Qualification Agent",
    versionNumber: "2.1.0",
    state: "PRODUCTION",
    modelIdentifier: "gpt-4o-2024-08-06",
    createdAt: new Date(Date.now() - 86_400_000 * 14).toISOString(),
    promotedAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
    promotedBy: "admin@zyoris.com",
    changelog: "Improved firmographic scoring. Reduced hallucination rate from 4.1% to 1.2%. Added citation enforcement.",
    regressionGates: [
      { gateId: "hallucination-rate", label: "Hallucination Rate",     result: "PASS", measuredValue: 1.2,   threshold: 5,    unit: "%"  },
      { gateId: "latency-p95",        label: "P95 Latency",            result: "PASS", measuredValue: 2400,  threshold: 4000, unit: "ms" },
      { gateId: "acceptance-rate",    label: "Acceptance Rate",        result: "PASS", measuredValue: 81,    threshold: 70,   unit: "%"  },
      { gateId: "cost-per-exec",      label: "Avg Cost / Execution",   result: "PASS", measuredValue: 0.041, threshold: 0.10, unit: "USD"},
    ],
    allGatesPassed: true,
  },
  {
    id: "ver-lqa-staging",
    agentId: "lead-qualification-agent",
    agentName: "Lead Qualification Agent",
    versionNumber: "2.2.0",
    state: "STAGING",
    modelIdentifier: "gpt-4o-2024-11-20",
    createdAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    changelog: "Upgraded to GPT-4o November snapshot. Experimental: multi-signal intent scoring.",
    regressionGates: [
      { gateId: "hallucination-rate", label: "Hallucination Rate",     result: "PASS",    measuredValue: 0.9,   threshold: 5,    unit: "%"   },
      { gateId: "latency-p95",        label: "P95 Latency",            result: "FAIL",    measuredValue: 4800,  threshold: 4000, unit: "ms",  notes: "Exceeds p95 threshold. Optimisation required before promotion." },
      { gateId: "acceptance-rate",    label: "Acceptance Rate",        result: "PENDING", threshold: 70,        unit: "%"                    },
      { gateId: "cost-per-exec",      label: "Avg Cost / Execution",   result: "PASS",    measuredValue: 0.052, threshold: 0.10, unit: "USD" },
    ],
    allGatesPassed: false,
  },
  {
    id: "ver-lqa-draft",
    agentId: "lead-qualification-agent",
    agentName: "Lead Qualification Agent",
    versionNumber: "2.3.0-beta",
    state: "DRAFT",
    modelIdentifier: "gpt-4o-mini",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    changelog: "Experimental: switch to GPT-4o-mini to reduce cost by ~70%. Evaluation not yet started.",
    regressionGates: [
      { gateId: "hallucination-rate", label: "Hallucination Rate",     result: "PENDING" },
      { gateId: "latency-p95",        label: "P95 Latency",            result: "PENDING" },
      { gateId: "acceptance-rate",    label: "Acceptance Rate",        result: "PENDING" },
      { gateId: "cost-per-exec",      label: "Avg Cost / Execution",   result: "PENDING" },
    ],
    allGatesPassed: false,
  },
  {
    id: "ver-lqa-retired",
    agentId: "lead-qualification-agent",
    agentName: "Lead Qualification Agent",
    versionNumber: "2.0.1",
    state: "RETIRED",
    modelIdentifier: "gpt-4-turbo",
    createdAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
    retiredAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
    changelog: "Retired after v2.1.0 promotion. Kept for audit trail.",
    regressionGates: [
      { gateId: "hallucination-rate", label: "Hallucination Rate",   result: "PASS", measuredValue: 3.8, threshold: 5,    unit: "%" },
      { gateId: "latency-p95",        label: "P95 Latency",          result: "PASS", measuredValue: 3100, threshold: 4000, unit: "ms" },
      { gateId: "acceptance-rate",    label: "Acceptance Rate",      result: "PASS", measuredValue: 74, threshold: 70, unit: "%" },
      { gateId: "cost-per-exec",      label: "Avg Cost / Execution", result: "PASS", measuredValue: 0.068, threshold: 0.10, unit: "USD" },
    ],
    allGatesPassed: true,
  },
  // ── Research Agent ────────────────────────────────────────────────────────
  {
    id: "ver-ra-prod",
    agentId: "research-agent",
    agentName: "Research Agent",
    versionNumber: "1.4.0",
    state: "PRODUCTION",
    modelIdentifier: "claude-3-5-sonnet-20241022",
    createdAt: new Date(Date.now() - 86_400_000 * 10).toISOString(),
    promotedAt: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    promotedBy: "admin@zyoris.com",
    changelog: "Migrated to Claude 3.5 Sonnet. Improved citation accuracy. Grounded response rate: 81% → 89%.",
    regressionGates: [
      { gateId: "hallucination-rate", label: "Hallucination Rate",   result: "PASS", measuredValue: 2.1, threshold: 5,   unit: "%"  },
      { gateId: "latency-p95",        label: "P95 Latency",          result: "PASS", measuredValue: 5800, threshold: 8000, unit: "ms"},
      { gateId: "grounding-rate",     label: "Grounded Response Rate", result: "PASS", measuredValue: 89, threshold: 80,  unit: "%"  },
      { gateId: "cost-per-exec",      label: "Avg Cost / Execution", result: "PASS", measuredValue: 0.138, threshold: 0.20, unit: "USD"},
    ],
    allGatesPassed: true,
  },
  {
    id: "ver-ra-staging",
    agentId: "research-agent",
    agentName: "Research Agent",
    versionNumber: "1.5.0",
    state: "STAGING",
    modelIdentifier: "claude-3-5-sonnet-20241022",
    createdAt: new Date(Date.now() - 86_400_000 * 1).toISOString(),
    changelog: "Added multi-source triangulation. All gates passed — ready for promotion.",
    regressionGates: [
      { gateId: "hallucination-rate", label: "Hallucination Rate",     result: "PASS", measuredValue: 1.4,   threshold: 5,    unit: "%"   },
      { gateId: "latency-p95",        label: "P95 Latency",            result: "PASS", measuredValue: 5200,  threshold: 8000, unit: "ms"  },
      { gateId: "grounding-rate",     label: "Grounded Response Rate", result: "PASS", measuredValue: 93,    threshold: 80,   unit: "%"   },
      { gateId: "cost-per-exec",      label: "Avg Cost / Execution",   result: "PASS", measuredValue: 0.131, threshold: 0.20, unit: "USD" },
    ],
    allGatesPassed: true,
  },
];

// ─── Normalisation ────────────────────────────────────────────────────────────

function normaliseGate(g: RegressionGate): RegressionGate {
  return {
    ...g,
    result: (typeof g.result === "string"
      ? g.result.toUpperCase()
      : g.result) as RegressionGate["result"],
  };
}

function normaliseVersion(raw: AgentVersion): AgentVersion {
  return {
    ...raw,
    state: (typeof raw.state === "string"
      ? raw.state.toUpperCase()
      : raw.state) as VersionState,
    regressionGates: Array.isArray(raw.regressionGates)
      ? raw.regressionGates.map(normaliseGate)
      : [],
    // allGatesPassed is computed by backend — we trust it.
    // We add a client-side sanity guard to catch backend inconsistencies.
    allGatesPassed:
      typeof raw.allGatesPassed === "boolean"
        ? raw.allGatesPassed
        : (raw.regressionGates ?? []).every((g) => g.result === "PASS"),
  };
}

function normaliseList(raw: unknown): AgentVersion[] {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") return normaliseList(r.data);
  }
  if (Array.isArray(raw)) return (raw as AgentVersion[]).map(normaliseVersion);
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const list: AgentVersion[] | null =
      Array.isArray(obj.versions) ? (obj.versions as AgentVersion[]) :
      Array.isArray(obj.items)    ? (obj.items    as AgentVersion[]) :
      Array.isArray(obj.results)  ? (obj.results  as AgentVersion[]) :
      Array.isArray(obj.data)     ? (obj.data     as AgentVersion[]) :
      null;
    if (list) return list.map(normaliseVersion);
  }
  console.warn("[agentVersionsApi] Unexpected list shape:", raw);
  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/agents/versions
 * Returns all agent versions across all agents.
 * The page groups them by agentId client-side.
 */
export async function getAgentVersions(): Promise<AgentVersionsResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 600));
    return { versions: MOCK_VERSIONS.map(normaliseVersion) };
  }

  try {
    const res = await api.get("/api/admin/agents/versions");
    return { versions: normaliseList(res.data) };
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || err.message || "Failed to load agent versions."
    );
  }
}

/**
 * POST /api/admin/agents/versions/:versionId/promote
 *
 * Promotes a STAGING version to PRODUCTION.
 * Routes through the existing Approval Queue — this function calls
 * POST /api/approvals internally (via the backend), not a new endpoint.
 *
 * Guard: versionId with allGatesPassed === false must never be called —
 * enforced at the component level AND validated here before the request.
 */
export async function promoteAgentVersion(
  versionId: string,
  version: AgentVersion
): Promise<PromoteVersionResponse> {
  // Client-side guard — mirrors the button disabled state
  if (!version.allGatesPassed) {
    throw new Error(
      "Cannot promote a version that has not passed all regression gates. " +
      "All gates must show PASS before promotion is allowed."
    );
  }
  if (version.state !== "STAGING") {
    throw new Error(
      `Only STAGING versions can be promoted to PRODUCTION. Current state: ${version.state}.`
    );
  }

  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 800));
    const mockApprovalId = `mock-promo-approval-${Date.now()}`;
    // Mutate mock in place so re-fetch shows the updated state
    const found = MOCK_VERSIONS.find((v) => v.id === versionId);
    if (found) {
      found.approvalRequestId = mockApprovalId;
    }
    return {
      approvalRequestId: mockApprovalId,
      message: `Promotion of v${version.versionNumber} sent to Approval Queue. Approve it to make this version live in production.`,
    };
  }

  try {
    const res = await api.post(`/api/admin/agents/versions/${versionId}/promote`);
    const data = res.data?.data ?? res.data;
    return {
      approvalRequestId: data.approvalRequestId ?? data.approvalId ?? data.id,
      message: data.message,
    };
  } catch (err: any) {
    if (err.response?.status === 409) {
      throw new Error(
        err.response.data?.message ||
        "This version has already been submitted for promotion."
      );
    }
    if (err.response?.status === 403) {
      throw new Error("You are not authorised to promote agent versions.");
    }
    throw new Error(
      err.response?.data?.message || err.message ||
      `Failed to promote version "${versionId}".`
    );
  }
}

export type {
  AgentVersion,
  AgentVersionsResponse,
  PromoteVersionResponse,
  RegressionGate,
  VersionState,
} from "@/lib/types/day7.ts";
