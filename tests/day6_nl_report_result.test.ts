/**
 * tests/day6_nl_report_result.test.ts
 * ─────────────────────────────────────────────────────────────
 * Unit tests for NLReportResultView behavioral logic.
 *
 * Tests:
 * - Metric interactivity classification (drilldownQuery present vs absent)
 * - Drilldown toggle logic (open / close / switch metric)
 * - drilldownAvailable derivation from metrics
 * - ReportDrilldownData normalisation (defensive shape handling)
 * - drillDownReferences link building
 * - Column display name formatting
 */

import test from "node:test";
import assert from "node:assert/strict";
import type {
  NLReportResult,
  ReportMetric,
  ReportDrilldownData,
} from "../lib/types/agent-results.ts";

// ─── Logic extracted from NLReportResultView ─────────────────────────────────

/** Metric cell interactivity — mirrors MetricCell's isClickable check */
function isMetricClickable(metric: ReportMetric): boolean {
  return !!metric.drilldownQuery;
}

/**
 * Drilldown toggle logic — mirrors openDrilldown() in NLReportResultView.
 * Returns null if toggling the currently-active metric (dismiss).
 * Returns the new drilldown if switching to a different metric.
 */
interface ActiveDrilldown { drilldownQuery: string; metricLabel: string }

function toggleDrilldown(
  current: ActiveDrilldown | null,
  metric: ReportMetric
): ActiveDrilldown | null {
  if (!metric.drilldownQuery) return current; // non-interactive, no change
  if (current?.drilldownQuery === metric.drilldownQuery) return null; // toggle off
  return { drilldownQuery: metric.drilldownQuery, metricLabel: metric.label };
}

/** W6 AC: drilldownAvailable is derived from whether any metric has a drilldownQuery */
function derivedrilldownAvailable(metrics: ReportMetric[]): boolean {
  return metrics.some((m) => !!m.drilldownQuery);
}

// ─── Logic extracted from reportingApi.ts ────────────────────────────────────

/** Normalise drilldown data defensively */
function normaliseDrilldownData(raw: unknown): ReportDrilldownData {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.data && typeof r.data === "object") return normaliseDrilldownData(r.data);
  }
  const d = raw as ReportDrilldownData;
  if (!Array.isArray(d?.columns)) (d as any).columns = [];
  if (!Array.isArray(d?.rows))    (d as any).rows    = [];
  if (typeof d?.total !== "number") d.total = (d?.rows ?? []).length;
  return d;
}

/** Column display name formatting — mirrors toDisplayName in ReportDrilldownPanel */
function toDisplayName(col: string): string {
  return col
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

/** Build a CRM deep-link from drillDownReferences */
function getCrmLink(
  rowId: string,
  refs: Record<string, string> | undefined
): string | undefined {
  return refs?.[rowId];
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMetric(overrides: Partial<ReportMetric> = {}): ReportMetric {
  return {
    label: "Test Metric",
    value: 42,
    ...overrides,
  };
}

function makeReport(overrides: Partial<NLReportResult> = {}): NLReportResult {
  return {
    id: "report-test",
    agentId: "reporting-agent",
    type: "NLReportResult",
    question: "What is our pipeline coverage?",
    answerSummary: "Pipeline is at 2.1x — below the 3x benchmark.",
    metrics: [
      makeMetric({ label: "Total Pipeline",  value: "$2.4M",  drilldownQuery: "pipeline_total" }),
      makeMetric({ label: "Active Deals",    value: 67,       drilldownQuery: "active_deals"   }),
      makeMetric({ label: "Avg Deal Size",   value: "$35k"    /* no drilldownQuery */           }),
    ],
    drilldownAvailable: true,
    createdAt: new Date().toISOString(),
    evidence: [{ source: "CRM", label: "Pipeline data" }],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("NLReportResultView — metric interactivity classification", async (t) => {
  await t.test("metric with drilldownQuery is clickable", () => {
    const m = makeMetric({ drilldownQuery: "pipeline_total" });
    assert.ok(isMetricClickable(m));
  });

  await t.test("metric without drilldownQuery is NOT clickable", () => {
    const m = makeMetric({ drilldownQuery: undefined });
    assert.ok(!isMetricClickable(m));
  });

  await t.test("metric with empty string drilldownQuery is NOT clickable", () => {
    const m = makeMetric({ drilldownQuery: "" });
    assert.ok(!isMetricClickable(m));
  });

  await t.test("report fixture: first two metrics are clickable, third is not", () => {
    const report = makeReport();
    assert.ok(isMetricClickable(report.metrics[0]));
    assert.ok(isMetricClickable(report.metrics[1]));
    assert.ok(!isMetricClickable(report.metrics[2]));
  });
});

test("NLReportResultView — drilldown toggle logic", async (t) => {
  const metricA = makeMetric({ label: "Pipeline", drilldownQuery: "pipeline_total" });
  const metricB = makeMetric({ label: "Deals",    drilldownQuery: "active_deals"   });
  const metricC = makeMetric({ label: "Avg Size"  /* no drilldownQuery */          });

  await t.test("clicking a metric opens its drilldown (null → active)", () => {
    const result = toggleDrilldown(null, metricA);
    assert.ok(result !== null);
    assert.strictEqual(result!.drilldownQuery, "pipeline_total");
    assert.strictEqual(result!.metricLabel, "Pipeline");
  });

  await t.test("clicking the same metric again closes the drilldown (toggle off)", () => {
    const current: ActiveDrilldown = { drilldownQuery: "pipeline_total", metricLabel: "Pipeline" };
    const result = toggleDrilldown(current, metricA);
    assert.strictEqual(result, null);
  });

  await t.test("clicking a different metric switches to that drilldown", () => {
    const current: ActiveDrilldown = { drilldownQuery: "pipeline_total", metricLabel: "Pipeline" };
    const result = toggleDrilldown(current, metricB);
    assert.ok(result !== null);
    assert.strictEqual(result!.drilldownQuery, "active_deals");
    assert.strictEqual(result!.metricLabel, "Deals");
  });

  await t.test("clicking a non-interactive metric leaves drilldown unchanged", () => {
    const current: ActiveDrilldown = { drilldownQuery: "pipeline_total", metricLabel: "Pipeline" };
    const result = toggleDrilldown(current, metricC);
    assert.deepStrictEqual(result, current);
  });

  await t.test("clicking a non-interactive metric when nothing is open stays null", () => {
    const result = toggleDrilldown(null, metricC);
    assert.strictEqual(result, null);
  });
});

test("NLReportResultView — drilldownAvailable derivation", async (t) => {
  await t.test("true when at least one metric has a drilldownQuery", () => {
    const metrics = [
      makeMetric({ drilldownQuery: "q1" }),
      makeMetric({ /* no query */ }),
    ];
    assert.ok(derivedrilldownAvailable(metrics));
  });

  await t.test("false when no metrics have a drilldownQuery", () => {
    const metrics = [makeMetric(), makeMetric(), makeMetric()];
    assert.ok(!derivedrilldownAvailable(metrics));
  });

  await t.test("false when metrics array is empty", () => {
    assert.ok(!derivedrilldownAvailable([]));
  });

  await t.test("true when all metrics have drilldownQuery", () => {
    const metrics = [
      makeMetric({ drilldownQuery: "q1" }),
      makeMetric({ drilldownQuery: "q2" }),
    ];
    assert.ok(derivedrilldownAvailable(metrics));
  });
});

test("NLReportResultView — drilldown data normalisation", async (t) => {
  await t.test("strips { data: ... } envelope", () => {
    const wrapped = { data: { reportId: "r1", query: "q", columns: ["a"], rows: [{ a: 1 }], total: 1 } };
    const result = normaliseDrilldownData(wrapped);
    assert.strictEqual(result.reportId, "r1");
    assert.strictEqual(result.total, 1);
  });

  await t.test("defaults columns to [] when missing", () => {
    const result = normaliseDrilldownData({ reportId: "r1", query: "q", rows: [], total: 0 });
    assert.deepStrictEqual(result.columns, []);
  });

  await t.test("defaults rows to [] when missing", () => {
    const result = normaliseDrilldownData({ reportId: "r1", query: "q", columns: [], total: 0 });
    assert.deepStrictEqual(result.rows, []);
  });

  await t.test("derives total from rows.length when total is missing", () => {
    const result = normaliseDrilldownData({
      reportId: "r1",
      query: "q",
      columns: ["id"],
      rows: [{ id: "1" }, { id: "2" }],
    });
    assert.strictEqual(result.total, 2);
  });
});

test("NLReportResultView — drillDownReferences link building", async (t) => {
  const refs: Record<string, string> = {
    "deal-001": "/deals/deal-001",
    "deal-002": "/deals/deal-002",
  };

  await t.test("returns the CRM link for a known row ID", () => {
    assert.strictEqual(getCrmLink("deal-001", refs), "/deals/deal-001");
  });

  await t.test("returns undefined for an unknown row ID", () => {
    assert.strictEqual(getCrmLink("deal-999", refs), undefined);
  });

  await t.test("returns undefined when refs object is undefined", () => {
    assert.strictEqual(getCrmLink("deal-001", undefined), undefined);
  });
});

test("NLReportResultView — column display name formatting", async (t) => {
  await t.test("camelCase becomes title case with spaces", () => {
    assert.strictEqual(toDisplayName("closeDate"), "Close Date");
    assert.strictEqual(toDisplayName("daysOpen"),  "Days Open");
  });

  await t.test("snake_case is converted to spaced title case", () => {
    assert.strictEqual(toDisplayName("close_date"), "Close date");
  });

  await t.test("single-word column is capitalised", () => {
    assert.strictEqual(toDisplayName("name"),  "Name");
    assert.strictEqual(toDisplayName("stage"), "Stage");
  });

  await t.test("already-spaced columns are unchanged (leading space trimmed)", () => {
    const result = toDisplayName("rep");
    assert.strictEqual(result, "Rep");
  });
});
