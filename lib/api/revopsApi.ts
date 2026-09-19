/**
 * lib/api/revopsApi.ts
 * ─────────────────────────────────────────────────────────────
 * Service layer for the RevOps Analytics Agent.
 *
 * Endpoints:
 *   GET  /api/revops/insights — insights grouped by category
 *   POST /api/approvals       — reused (not new) when "Send to Approval Queue"
 *
 * Mock flag: NEXT_PUBLIC_USE_MOCKS !== "false"
 *
 * Non-negotiable: the proposed action on an insight is preview-only
 * from this screen. Sending to the Approval Queue routes through
 * the existing POST /api/approvals endpoint — no new approval logic.
 */

import api from "@/lib/api/api";
import type {
  RevOpsInsight,
  RevOpsInsightsResponse,
  RevOpsCategory,
  DataQualityIssueSeverity,
  ProposedAction,
} from "@/lib/types/agent-results";

// ─── Mock flag ────────────────────────────────────────────────────────────────

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_INSIGHTS: RevOpsInsight[] = [
  {
    id: "revops-001",
    agentId: "revops-agent",
    agentName: "RevOps Analytics Agent",
    type: "RevOpsInsight",
    category: "COVERAGE",
    metricLabel: "Pipeline Coverage Ratio",
    metricValue: 2.1,
    metricUnit: "x",
    benchmarkValue: 3.0,
    severity: "HIGH",
    confidenceScore: 91,
    evidence: [
      {
        source: "CRM Pipeline Data",
        label: "Q3 open deals",
        snippet: "Total pipeline value: $840k vs quarterly quota of $400k (2.1x).",
      },
      {
        source: "Historical Benchmark",
        label: "Industry standard: 3x+",
        snippet: "SaaS companies at this ARR band target ≥3x pipeline coverage.",
      },
    ],
    proposedAction: {
      label: "Launch pipeline gap campaign",
      type: "CAMPAIGN_TRIGGER",
      description:
        "Trigger an automated outbound campaign targeting 45 warm leads in the CONTACTED stage to build pipeline coverage.",
      payload: {
        campaignType: "pipeline_gap",
        targetSegment: "CONTACTED_LEADS",
        count: 45,
      },
    },
    createdAt: new Date().toISOString(),
    executionId: "exec-revops-001",
  },
  {
    id: "revops-002",
    agentId: "revops-agent",
    agentName: "RevOps Analytics Agent",
    type: "RevOpsInsight",
    category: "LEAKAGE",
    metricLabel: "Deal Leakage Rate (Last 90 Days)",
    metricValue: 34,
    metricUnit: "%",
    benchmarkValue: 20,
    severity: "HIGH",
    confidenceScore: 88,
    evidence: [
      {
        source: "Closed-Lost Analysis",
        label: "34% of deals lost in PROPOSAL stage",
        snippet: "17 of 50 deals entered PROPOSAL and exited as CLOSED_LOST within 30 days.",
      },
      {
        source: "Loss Reason Tagging",
        label: "Top reason: pricing",
        snippet: "64% of CLOSED_LOST deals cited 'price too high' as primary reason.",
      },
    ],
    proposedAction: {
      label: "Enable discount approval workflow",
      type: "WORKFLOW_ACTIVATION",
      description:
        "Activate a fast-track discount approval workflow for deals ≥$10k where pricing is cited as a blocker.",
      payload: { workflowId: "wf-discount-approval", threshold: 10000 },
    },
    createdAt: new Date().toISOString(),
    executionId: "exec-revops-002",
  },
  {
    id: "revops-003",
    agentId: "revops-agent",
    agentName: "RevOps Analytics Agent",
    type: "RevOpsInsight",
    category: "QUOTA",
    metricLabel: "Rep Quota Attainment (Q3)",
    metricValue: 67,
    metricUnit: "%",
    benchmarkValue: 80,
    severity: "MEDIUM",
    confidenceScore: 79,
    evidence: [
      {
        source: "Sales Performance Data",
        label: "Team average: 67%",
        snippet: "3 of 8 reps are below 60%. 2 are above 90%. High variance.",
      },
      {
        source: "Activity Correlation",
        label: "Low-attainment reps show fewer discovery calls",
        snippet: "Reps below 60% average 1.8 discovery calls/week vs 3.4 for top performers.",
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "revops-004",
    agentId: "revops-agent",
    agentName: "RevOps Analytics Agent",
    type: "RevOpsInsight",
    category: "FORECAST",
    metricLabel: "Forecast Accuracy (Last 2 Quarters)",
    metricValue: 71,
    metricUnit: "%",
    benchmarkValue: 85,
    severity: "MEDIUM",
    confidenceScore: 83,
    evidence: [
      {
        source: "Commit vs. Actual Comparison",
        label: "Q2 commit: $1.2M, actual: $854k",
        snippet: "29% shortfall in Q2. Over-optimistic commit across 3 reps.",
      },
      {
        source: "Stage Progression Analysis",
        label: "High PROPOSAL-to-CLOSED_LOST rate",
        snippet: "Deals often move from PROPOSAL to CLOSED_LOST without a NEGOTIATION step.",
      },
    ],
    proposedAction: {
      label: "Enforce commit validation gate",
      type: "PROCESS_GATE",
      description:
        "Add a forecast validation checkpoint requiring manager sign-off before a deal enters Commit category.",
      payload: { gateType: "forecast_commit", requiredApproverRole: "SALES_HEAD" },
    },
    createdAt: new Date().toISOString(),
    executionId: "exec-revops-004",
  },
  {
    id: "revops-005",
    agentId: "revops-agent",
    agentName: "RevOps Analytics Agent",
    type: "RevOpsInsight",
    category: "COVERAGE",
    metricLabel: "Enterprise Segment Pipeline",
    metricValue: 1.4,
    metricUnit: "x",
    benchmarkValue: 4.0,
    severity: "HIGH",
    confidenceScore: 94,
    evidence: [
      {
        source: "Segment Analysis",
        label: "Enterprise deals: only 7 active",
        snippet: "Enterprise pipeline ($250k+ ACV) has 7 open deals worth $1.75M vs $1.25M quota.",
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

// ─── Normalisation ────────────────────────────────────────────────────────────

function normaliseInsight(raw: RevOpsInsight): RevOpsInsight {
  return {
    ...raw,
    category: (typeof raw.category === "string"
      ? raw.category.toUpperCase()
      : raw.category) as RevOpsCategory,
    severity: (typeof raw.severity === "string"
      ? raw.severity.toUpperCase()
      : raw.severity) as DataQualityIssueSeverity,
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
  };
}

function normaliseInsightList(raw: unknown): RevOpsInsightsResponse {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") {
      return normaliseInsightList(r.data);
    }
  }

  if (Array.isArray(raw)) {
    return { insights: (raw as RevOpsInsight[]).map(normaliseInsight) };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const list: RevOpsInsight[] | null =
      Array.isArray(obj.insights) ? (obj.insights as RevOpsInsight[]) :
      Array.isArray(obj.items)    ? (obj.items as RevOpsInsight[])    :
      Array.isArray(obj.results)  ? (obj.results as RevOpsInsight[])  :
      Array.isArray(obj.data)     ? (obj.data as RevOpsInsight[])     :
      null;

    if (list !== null) {
      return { insights: list.map(normaliseInsight) };
    }
  }

  console.warn("[revopsApi] Unexpected response shape:", raw);
  return { insights: [] };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/revops/insights
 * Returns RevOps insights grouped by category. The page component
 * groups them client-side so the API returns a flat list.
 */
export async function getRevOpsInsights(): Promise<RevOpsInsightsResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 700));
    return { insights: MOCK_INSIGHTS };
  }

  try {
    const res = await api.get("/api/revops/insights");
    return normaliseInsightList(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Failed to load RevOps insights."
    );
  }
}

/**
 * Send a RevOps proposed action to the existing Approval Queue.
 * This calls POST /api/approvals — no new approval logic.
 * Returns the created approval's ID so the UI can link to it.
 */
export async function sendRevOpsActionToApproval(
  insight: RevOpsInsight
): Promise<{ approvalRequestId: string }> {
  if (!insight.proposedAction) {
    throw new Error("This insight has no proposed action to send.");
  }

  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 600));
    return { approvalRequestId: `mock-approval-${Date.now()}` };
  }

  try {
    const res = await api.post("/api/approvals", {
      agentId: insight.agentId,
      toolName: insight.proposedAction.type,
      toolDisplayName: insight.proposedAction.label,
      actionSummary: insight.proposedAction.description ?? insight.proposedAction.label,
      actionPayload: insight.proposedAction.payload,
      evidence: {
        reasoning: `RevOps insight: ${insight.metricLabel} = ${insight.metricValue}${insight.metricUnit ?? ""}`,
        sources: (insight.evidence ?? []).map((e) => e.label ?? e.source ?? ""),
        confidenceScore: insight.confidenceScore,
      },
      riskTier: insight.severity === "HIGH" ? "HIGH" : "MEDIUM",
    });
    const data = res.data?.data ?? res.data;
    return {
      approvalRequestId: data.id ?? data.approvalRequestId ?? data.approvalId,
    };
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Failed to send action to Approval Queue."
    );
  }
}

// Re-export types
export type {
  RevOpsInsight,
  RevOpsInsightsResponse,
  ProposedAction,
} from "@/lib/types/agent-results";
