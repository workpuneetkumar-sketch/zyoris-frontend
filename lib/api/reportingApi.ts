/**
 * lib/api/reportingApi.ts
 * ─────────────────────────────────────────────────────────────
 * Service layer for the Reporting / Analysis Agent (NL queries).
 *
 * This is separate from the existing reportsApi.ts which handles
 * the filter-based report builder. This module handles natural-language
 * report questions that go to the AI agent.
 *
 * Endpoints:
 *   POST /api/reports/query            — NL question → NLReportResult
 *   GET  /api/reports/:reportId/drilldown — drill-down for a metric
 *
 * Mock flag: NEXT_PUBLIC_USE_MOCKS !== "false"
 */

import api from "@/lib/api/api";
import type {
  NLReportResult,
  NLReportQueryPayload,
  ReportDrilldownData,
  ReportMetric,
} from "@/lib/types/agent-results";

// ─── Mock flag ────────────────────────────────────────────────────────────────

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── Mock data ────────────────────────────────────────────────────────────────

function buildMockReport(question: string): NLReportResult {
  const id = `report-${Date.now()}`;
  return {
    id,
    agentId: "reporting-agent",
    agentName: "Reporting Agent",
    type: "NLReportResult",
    question,
    answerSummary:
      "Your Q3 pipeline is tracking at $2.4M across 67 active deals. " +
      "The largest segment is Enterprise ($1.1M, 12 deals). Conversion from PROPOSAL " +
      "to CLOSED_WON stands at 38%, which is 8 points below your Q2 rate. " +
      "3 deals totalling $440k are at risk due to approaching close dates with no " +
      "recent activity.",
    metrics: [
      {
        label: "Total Pipeline Value",
        value: "$2.4M",
        segment: "All segments",
        drilldownQuery: "pipeline_total",
      },
      {
        label: "Active Deals",
        value: 67,
        segment: "All stages",
        drilldownQuery: "active_deals",
      },
      {
        label: "Enterprise Segment",
        value: "$1.1M",
        segment: "Enterprise",
        drilldownQuery: "enterprise_pipeline",
      },
      {
        label: "PROPOSAL → CLOSED_WON Rate",
        value: "38%",
        segment: "Conversion",
        drilldownQuery: "proposal_conversion",
      },
      {
        label: "At-Risk Deals",
        value: 3,
        segment: "Risk",
        drilldownQuery: "at_risk_deals",
      },
      {
        label: "Avg Deal Size",
        value: "$35.8k",
        // No drilldownQuery — non-interactive
      },
    ],
    drilldownAvailable: true,
    evidence: [
      {
        source: "CRM Pipeline Data",
        label: "Real-time CRM query",
        snippet: "Data as of today. 67 active deals across 6 pipeline stages.",
      },
      {
        source: "Historical Conversion Analysis",
        label: "Q2 vs Q3 comparison",
        snippet: "Q2 PROPOSAL→WIN rate: 46%. Q3 to date: 38%.",
      },
    ],
    confidenceScore: 90,
    createdAt: new Date().toISOString(),
    executionId: `exec-report-${Date.now()}`,
  };
}

function buildMockDrilldown(reportId: string, query: string): ReportDrilldownData {
  const dealRows = [
    { id: "deal-001", name: "Acme Corp — Enterprise Suite", stage: "NEGOTIATION", value: "$220k", closeDate: "2026-10-15", rep: "Alice Chen", daysOpen: 45 },
    { id: "deal-002", name: "BetaTech — Pro Plan", stage: "PROPOSAL", value: "$85k", closeDate: "2026-09-30", rep: "Bob Singh", daysOpen: 22 },
    { id: "deal-003", name: "Gamma Inc — Platform", stage: "QUALIFIED", value: "$310k", closeDate: "2026-11-01", rep: "Carol Wu", daysOpen: 67 },
    { id: "deal-004", name: "Delta Systems — Starter", stage: "CONTACTED", value: "$42k", closeDate: "2026-10-30", rep: "David Park", daysOpen: 18 },
    { id: "deal-005", name: "EpsilonAI — Growth", stage: "PROPOSAL", value: "$175k", closeDate: "2026-09-28", rep: "Alice Chen", daysOpen: 31 },
  ];

  return {
    reportId,
    query,
    columns: ["name", "stage", "value", "closeDate", "rep", "daysOpen"],
    rows: dealRows as unknown as Record<string, unknown>[],
    total: dealRows.length,
    drillDownReferences: {
      "deal-001": "/deals/deal-001",
      "deal-002": "/deals/deal-002",
      "deal-003": "/deals/deal-003",
      "deal-004": "/deals/deal-004",
      "deal-005": "/deals/deal-005",
    },
  };
}

// ─── Normalisation ────────────────────────────────────────────────────────────

function normaliseReport(raw: unknown): NLReportResult {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") return normaliseReport(r.data);
    if (r.result && typeof r.result === "object") return normaliseReport(r.result);
    if (r.output && typeof r.output === "object") return normaliseReport(r.output);
  }
  const report = raw as NLReportResult;
  if (!Array.isArray(report.metrics)) (report as any).metrics = [];
  if (!Array.isArray(report.evidence)) (report as any).evidence = [];
  // Derive drilldownAvailable from metrics if backend didn't set it
  if (typeof report.drilldownAvailable !== "boolean") {
    report.drilldownAvailable = (report.metrics ?? []).some(
      (m: ReportMetric) => !!m.drilldownQuery
    );
  }
  return report;
}

function normalisedrilldown(raw: unknown): ReportDrilldownData {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") return normalisedrilldown(r.data);
  }
  const d = raw as ReportDrilldownData;
  if (!Array.isArray(d.columns)) (d as any).columns = [];
  if (!Array.isArray(d.rows)) (d as any).rows = [];
  if (typeof d.total !== "number") d.total = (d.rows ?? []).length;
  return d;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * POST /api/reports/query
 * Ask a natural-language question; returns a NLReportResult with
 * a structured metric breakdown and optional drill-down tokens.
 */
export async function queryReport(
  payload: NLReportQueryPayload
): Promise<NLReportResult> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 1100));
    return buildMockReport(payload.question);
  }

  try {
    const res = await api.post("/api/reports/query", payload);
    return normaliseReport(res.data);
  } catch (err: any) {
    if (err.response?.status === 403) {
      throw new Error(
        "You are not authorised to run the Reporting Agent. " +
          (err.response?.data?.message ?? "")
      );
    }
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Reporting Agent query failed. Please try again."
    );
  }
}

/**
 * GET /api/reports/:reportId/drilldown?query=<token>
 * Fetch the records behind a specific report metric.
 * The drilldownQuery token is opaque — pass it back as-is.
 */
export async function getReportDrilldown(
  reportId: string,
  drilldownQuery: string
): Promise<ReportDrilldownData> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 500));
    return buildMockDrilldown(reportId, drilldownQuery);
  }

  try {
    const res = await api.get(`/api/reports/${reportId}/drilldown`, {
      params: { query: drilldownQuery },
    });
    return normalisedrilldown(res.data);
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Failed to load drill-down data."
    );
  }
}

// Re-export types
export type {
  NLReportResult,
  NLReportQueryPayload,
  ReportDrilldownData,
  ReportMetric,
} from "@/lib/types/agent-results";
