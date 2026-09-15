// hooks/useAssignmentAnalytics.ts
// Hook for Assignment Analytics Dashboard
// Targets GET /leads/assignment-analytics + fallback calculation from assignment history
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AssignmentAnalytics,
  AssignmentAnalyticsFilters,
  AssignmentHistoryEntry,
} from "@/types/assignmentRules";
import {
  getAssignmentAnalytics,
  getAssignmentHistory,
} from "@/lib/api/assignmentRulesApi";

const DEFAULT_FILTERS: AssignmentAnalyticsFilters = {
  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  dateTo: new Date().toISOString().slice(0, 10),
  strategy: "All",
  userId: "",
};

function computeAnalyticsFromHistory(
  history: AssignmentHistoryEntry[],
  filters: AssignmentAnalyticsFilters
): AssignmentAnalytics {
  const totalAssignments = history.length;
  const converted = history.filter((h) => h.conversionStatus === "CONVERTED").length;
  const conversionRate =
    totalAssignments > 0 ? Math.round((converted / totalAssignments) * 100) : 0;

  const times = history
    .map((h) => h.responseTime)
    .filter((t): t is number => typeof t === "number" && t > 0);
  const avgResponseTime =
    times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60) : 0;

  // Distribution by assignee
  const distMap: Record<string, { name: string; count: number }> = {};
  history.forEach((h) => {
    const key = h.assignedToId || h.assignedToName || "Unassigned";
    const name =
      h.assignedToName && h.assignedToName !== "—" ? h.assignedToName : "Assignee";
    if (!distMap[key]) distMap[key] = { name, count: 0 };
    distMap[key].count++;
  });
  const distribution = Object.entries(distMap).map(([id, val]) => ({
    assigneeId: id,
    assigneeName: val.name,
    count: val.count,
    percentage: totalAssignments > 0 ? Math.round((val.count / totalAssignments) * 100) : 0,
  }));

  // Strategy breakdown
  const stratMap: Record<string, number> = {};
  history.forEach((h) => {
    const s = h.strategy || "AI_RECOMMENDATION";
    stratMap[s] = (stratMap[s] || 0) + 1;
  });
  const byStrategy = Object.entries(stratMap).map(([strat, count]) => ({
    strategy: strat,
    count,
    percentage: totalAssignments > 0 ? Math.round((count / totalAssignments) * 100) : 0,
  }));

  // Over time timeline
  const timeMap: Record<string, number> = {};
  history.forEach((h) => {
    const dateStr = h.assignedAt
      ? h.assignedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    timeMap[dateStr] = (timeMap[dateStr] || 0) + 1;
  });
  const overTime = Object.entries(timeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Top performers
  const topPerformers = distribution.map((d) => ({
    assigneeId: d.assigneeId,
    assigneeName: d.assigneeName,
    totalAssigned: d.count,
    converted: history.filter(
      (h) =>
        (h.assignedToId === d.assigneeId || h.assignedToName === d.assigneeName) &&
        h.conversionStatus === "CONVERTED"
    ).length,
    conversionRate:
      d.count > 0
        ? Math.round(
            (history.filter(
              (h) =>
                (h.assignedToId === d.assigneeId || h.assignedToName === d.assigneeName) &&
                h.conversionStatus === "CONVERTED"
            ).length /
              d.count) *
              100
          )
        : 0,
    avgResponseTime: null,
  }));

  return {
    totalAssignments,
    totalConverted: converted,
    avgResponseTime,
    conversionRate,
    activeRules: 1,
    distribution,
    overTime,
    byStrategy,
    topPerformers,
    ruleEffectiveness: [],
    period: {
      from: filters.dateFrom,
      to: filters.dateTo,
    },
  };
}

interface UseAssignmentAnalyticsReturn {
  analytics: AssignmentAnalytics | null;
  loading: boolean;
  error: string | null;
  filters: AssignmentAnalyticsFilters;
  setFilters: (f: AssignmentAnalyticsFilters) => void;
  refresh: () => Promise<void>;
  backendAvailable: boolean;
}

export function useAssignmentAnalytics(): UseAssignmentAnalyticsReturn {
  const [analytics, setAnalytics] = useState<AssignmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssignmentAnalyticsFilters>(DEFAULT_FILTERS);
  const [backendAvailable, setBackendAvailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await getAssignmentAnalytics(filters);

      // If backend analytics endpoint returned 0 or empty arrays, fallback to calculating from History!
      if (
        data.totalAssignments === 0 &&
        data.distribution.length === 0 &&
        data.overTime.length === 0
      ) {
        try {
          const historyRes = await getAssignmentHistory({ limit: 100 });
          if (historyRes.history && historyRes.history.length > 0) {
            data = computeAnalyticsFromHistory(historyRes.history, filters);
          }
        } catch {
          // ignore history fallback error
        }
      }

      setAnalytics(data);
      setBackendAvailable(
        data.totalAssignments > 0 ||
          data.totalConverted > 0 ||
          data.distribution.length > 0
      );
    } catch (err: any) {
      // If endpoint fails, attempt to calculate directly from History
      try {
        const historyRes = await getAssignmentHistory({ limit: 100 });
        if (historyRes.history && historyRes.history.length > 0) {
          const fallbackData = computeAnalyticsFromHistory(historyRes.history, filters);
          setAnalytics(fallbackData);
          setBackendAvailable(true);
          setError(null);
          return;
        }
      } catch {
        // ignore
      }

      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load analytics";
      setError(msg);
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    analytics,
    loading,
    error,
    filters,
    setFilters,
    refresh: load,
    backendAvailable,
  };
}
