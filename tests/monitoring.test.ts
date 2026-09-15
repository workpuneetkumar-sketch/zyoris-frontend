import test from "node:test";
import assert from "node:assert/strict";

// 1. Logic Helper: Compute Metrics from Logs and Stats
export function computeDashboardMetrics(
  stats: any,
  logs: any[],
  errors: any[],
  hasActiveJob: boolean
) {
  const fetched =
    stats?.totalFetched ??
    logs.reduce((acc, l) => acc + (l.fetched ?? l.recordsProcessed ?? 0), 0);
  const created =
    stats?.totalCreated ??
    logs.reduce((acc, l) => acc + (l.created ?? l.successfulRecords ?? 0), 0);
  const updated =
    stats?.totalUpdated ??
    logs.reduce((acc, l) => acc + (l.updated ?? 0), 0);
  const skipped =
    stats?.totalSkipped ??
    logs.reduce((acc, l) => acc + (l.skipped ?? 0), 0);
  const failed =
    stats?.totalFailed ??
    stats?.totalRecordsFailed ??
    logs.reduce((acc, l) => acc + (l.failed ?? l.failedRecords ?? 0), 0);

  const lastSuccessful =
    stats?.lastSuccessfulSyncAt ||
    logs.find((l) => l.status === "SUCCESS")?.completedAt ||
    stats?.lastSyncAt ||
    null;

  const nextScheduled =
    stats?.nextScheduledSyncAt ||
    (lastSuccessful
      ? new Date(new Date(lastSuccessful).getTime() + 3600000).toISOString()
      : null);

  let health: "HEALTHY" | "DEGRADED" | "CRITICAL" | "SYNCING" | "IDLE" = "HEALTHY";
  if (hasActiveJob) {
    health = "SYNCING";
  } else if (stats && stats.totalRuns > 0) {
    const failRate =
      stats.failureRate ??
      (stats.totalRuns > 0 ? (stats.totalFailed / stats.totalRuns) * 100 : 0);
    if (failRate > 25) health = "CRITICAL";
    else if (failRate > 5) health = "DEGRADED";
    else health = "HEALTHY";
  } else if (logs.length === 0) {
    health = "IDLE";
  }

  return {
    fetched,
    created,
    updated,
    skipped,
    failed,
    lastSuccessful,
    nextScheduled,
    health,
    recentErrors: stats?.totalErrors ?? errors.length,
  };
}

// 2. Logic Helper: Single Flight Polling Mutex Guard
export class SingleFlightPollingManager {
  private inFlight = false;
  public executions = 0;
  public dropped = 0;

  async triggerPoll(pollFn: () => Promise<void>) {
    if (this.inFlight) {
      this.dropped++;
      return false;
    }
    this.inFlight = true;
    try {
      this.executions++;
      await pollFn();
      return true;
    } finally {
      this.inFlight = false;
    }
  }

  isInFlight() {
    return this.inFlight;
  }
}

// 3. Logic Helper: Job Progress Calculation
export function calculateJobProgress(run: {
  status: string;
  fetched?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  recordsProcessed?: number;
  successfulRecords?: number;
  failedRecords?: number;
}) {
  const fetched = run.fetched ?? run.recordsProcessed ?? 0;
  const created = run.created ?? run.successfulRecords ?? 0;
  const updated = run.updated ?? 0;
  const skipped = run.skipped ?? 0;
  const failed = run.failed ?? run.failedRecords ?? 0;
  const processed = created + updated + skipped + failed;
  const total = Math.max(1, fetched || processed || 1);

  if (run.status === "SUCCESS") return 100;
  if (run.status === "RUNNING") {
    return Math.min(95, Math.max(5, Math.round((processed / total) * 100)));
  }
  return Math.min(100, Math.round((processed / total) * 100));
}

// 4. Test Suites
test("computeDashboardMetrics", async (t) => {
  await t.test("aggregates live counters accurately from logs when stats are empty", () => {
    const logs = [
      { id: "run-1", status: "SUCCESS", fetched: 100, created: 80, updated: 15, skipped: 5, failed: 0, completedAt: "2026-09-03T12:00:00.000Z" },
      { id: "run-2", status: "FAILED", fetched: 50, created: 20, updated: 10, skipped: 0, failed: 20 },
    ];
    const metrics = computeDashboardMetrics(null, logs, [], false);

    assert.strictEqual(metrics.fetched, 150);
    assert.strictEqual(metrics.created, 100);
    assert.strictEqual(metrics.updated, 25);
    assert.strictEqual(metrics.skipped, 5);
    assert.strictEqual(metrics.failed, 20);
    assert.strictEqual(metrics.lastSuccessful, "2026-09-03T12:00:00.000Z");
    assert.ok(metrics.nextScheduled);
  });

  await t.test("prioritizes stats total counters over local log sum when provided", () => {
    const stats = {
      totalFetched: 5000,
      totalCreated: 4200,
      totalUpdated: 600,
      totalSkipped: 150,
      totalFailed: 50,
      totalRuns: 20,
      failureRate: 5.0,
      lastSuccessfulSyncAt: "2026-09-03T14:00:00.000Z",
    };
    const logs = [{ id: "run-1", fetched: 10, created: 8, updated: 1, skipped: 1, failed: 0 }];
    const metrics = computeDashboardMetrics(stats, logs, [], false);

    assert.strictEqual(metrics.fetched, 5000);
    assert.strictEqual(metrics.created, 4200);
    assert.strictEqual(metrics.updated, 600);
    assert.strictEqual(metrics.skipped, 150);
    assert.strictEqual(metrics.failed, 50);
    assert.strictEqual(metrics.health, "HEALTHY");
  });

  await t.test("determines health as SYNCING when an active job is in-flight", () => {
    const stats = { totalRuns: 10, totalFailed: 0, failureRate: 0 };
    const metrics = computeDashboardMetrics(stats, [], [], true);
    assert.strictEqual(metrics.health, "SYNCING");
  });

  await t.test("determines health as DEGRADED when failure rate is between 5% and 25%", () => {
    const stats = { totalRuns: 10, totalFailed: 2, failureRate: 20.0 };
    const metrics = computeDashboardMetrics(stats, [], [], false);
    assert.strictEqual(metrics.health, "DEGRADED");
  });

  await t.test("determines health as CRITICAL when failure rate exceeds 25%", () => {
    const stats = { totalRuns: 10, totalFailed: 4, failureRate: 40.0 };
    const metrics = computeDashboardMetrics(stats, [], [], false);
    assert.strictEqual(metrics.health, "CRITICAL");
  });

  await t.test("determines health as IDLE when no runs have occurred", () => {
    const metrics = computeDashboardMetrics(null, [], [], false);
    assert.strictEqual(metrics.health, "IDLE");
  });
});

test("SingleFlightPollingManager", async (t) => {
  await t.test("prevents request storms by dropping overlapping poll triggers", async () => {
    const manager = new SingleFlightPollingManager();
    let slowResolve: () => void = () => {};
    const slowTask = () =>
      new Promise<void>((resolve) => {
        slowResolve = resolve;
      });

    // Fire first poll
    const pollPromise1 = manager.triggerPoll(slowTask);
    assert.strictEqual(manager.isInFlight(), true);

    // Fire overlapping second and third polls while first is in-flight
    const poll2Result = await manager.triggerPoll(slowTask);
    const poll3Result = await manager.triggerPoll(slowTask);

    assert.strictEqual(poll2Result, false);
    assert.strictEqual(poll3Result, false);
    assert.strictEqual(manager.dropped, 2);
    assert.strictEqual(manager.executions, 1);

    // Complete the first poll
    slowResolve();
    const poll1Result = await pollPromise1;
    assert.strictEqual(poll1Result, true);
    assert.strictEqual(manager.isInFlight(), false);

    // Now a subsequent poll is accepted
    const poll4Result = await manager.triggerPoll(async () => {});
    assert.strictEqual(poll4Result, true);
    assert.strictEqual(manager.executions, 2);
  });
});

test("calculateJobProgress", async (t) => {
  await t.test("returns 100 for SUCCESS status regardless of records", () => {
    assert.strictEqual(calculateJobProgress({ status: "SUCCESS", fetched: 50, created: 25 }), 100);
  });

  await t.test("caps RUNNING progress at 95% while still executing", () => {
    const progress = calculateJobProgress({
      status: "RUNNING",
      fetched: 100,
      created: 100,
      updated: 0,
      skipped: 0,
      failed: 0,
    });
    assert.strictEqual(progress, 95);
  });

  await t.test("guarantees a minimum 5% progress for started RUNNING jobs", () => {
    const progress = calculateJobProgress({
      status: "RUNNING",
      fetched: 1000,
      created: 0,
    });
    assert.strictEqual(progress, 5);
  });

  await t.test("calculates proportional progress accurately", () => {
    const progress = calculateJobProgress({
      status: "RUNNING",
      fetched: 100,
      created: 40,
      updated: 10,
    });
    assert.strictEqual(progress, 50);
  });
});
