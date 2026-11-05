"use client";
// hooks/useDashboard.ts
// One hook per dashboard endpoint — all follow the project's existing pattern:
//   useState + useEffect + useCallback (no React Query / SWR).
// Auth token is handled transparently by the Axios interceptors in lib/api/api.ts.
// Each hook is isolated: a failure in one never propagates to another.

import { useState, useEffect, useCallback } from "react";
import {
  getDashboardStats,       DashboardStats,
  getDashboardBriefing,    DashboardBriefing,
  getDashboardAnomalies,   DashboardAnomalies,
  getDashboardCeo,         DashboardCeo,
  getDashboardCfo,         DashboardCfo,
  getDashboardOperations,  DashboardOperations,
  getActivityTimeline,     TimelineActivity,
  getActivitiesFeed,
  getPipelineStats,        PipelineStatsData,
  getHREmployees,          HREmployee,
  getConversionScores,     ConversionScore,
  getRevenueForecast,      RevenueForeCastData,
  getDemandTrends,         DemandTrendsData,
  getDashboardSales,       DashboardSales,
} from "@/lib/api/dashboardApi";
import { fetchMyTasks } from "@/lib/api/tasksApi";
import { getProjects, Project } from "@/lib/api/projectsApi";
import type { Task, TaskQueryParams } from "@/lib/api/tasksApi";

// ─── Shared shape ─────────────────────────────────────────────────────────────
interface HookState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApiData<T>(fetcher: () => Promise<T>, enabled: boolean = true): HookState<T> {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [fetcher, enabled]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

// ─── Individual hooks ─────────────────────────────────────────────────────────

export function useDashboardStats(enabled: boolean = true): HookState<DashboardStats> {
  const fetcher = useCallback(() => getDashboardStats(), []);
  return useApiData(fetcher, enabled);
}

export function useDashboardBriefing(enabled: boolean = true): HookState<DashboardBriefing> {
  const fetcher = useCallback(() => getDashboardBriefing(false), []);
  return useApiData(fetcher, enabled);
}

export function useWeeklyBriefing(enabled: boolean = true): HookState<DashboardBriefing> {
  const fetcher = useCallback(() => getDashboardBriefing(true), []);
  return useApiData(fetcher, enabled);
}

export function useDashboardAnomalies(enabled: boolean = true): HookState<DashboardAnomalies> {
  const fetcher = useCallback(() => getDashboardAnomalies(), []);
  return useApiData(fetcher, enabled);
}

export function useDashboardCeo(enabled: boolean = true): HookState<DashboardCeo> {
  const fetcher = useCallback(() => getDashboardCeo(), []);
  return useApiData(fetcher, enabled);
}

export function useDashboardCfo(enabled: boolean = true): HookState<DashboardCfo> {
  const fetcher = useCallback(() => getDashboardCfo(), []);
  return useApiData(fetcher, enabled);
}

export function useDashboardOperations(enabled: boolean = true): HookState<DashboardOperations> {
  const fetcher = useCallback(() => getDashboardOperations(), []);
  return useApiData(fetcher, enabled);
}

/** Recent org activity feed — uses safe fallback if /activities/timeline returns 400 */
export function useActivityFeed(limit = 20, enabled: boolean = true): HookState<TimelineActivity[]> {
  const fetcher = useCallback(() => getActivitiesFeed(limit), [limit]);
  return useApiData(fetcher, enabled);
}

export function usePipelineStats(enabled: boolean = true): HookState<PipelineStatsData> {
  const fetcher = useCallback(() => getPipelineStats(), []);
  return useApiData(fetcher, enabled);
}

/** HR employees — total count, by-department breakdown, on-leave count */
export function useHREmployees(enabled: boolean = true): HookState<HREmployee[]> {
  const fetcher = useCallback(() => getHREmployees(), []);
  return useApiData(fetcher, enabled);
}

/** Conversion scores per deal */
export function useConversionScores(enabled: boolean = true): HookState<ConversionScore[]> {
  const fetcher = useCallback(() => getConversionScores(), []);
  return useApiData(fetcher, enabled);
}

/** Revenue forecast time-series */
export function useRevenueForecast(enabled: boolean = true): HookState<RevenueForeCastData> {
  const fetcher = useCallback(() => getRevenueForecast(), []);
  return useApiData(fetcher, enabled);
}

/** Demand trends (visitors/conversions proxy) */
export function useDemandTrends(enabled: boolean = true): HookState<DemandTrendsData> {
  const fetcher = useCallback(() => getDemandTrends(), []);
  return useApiData(fetcher, enabled);
}

/** Dashboard sales endpoint */
export function useDashboardSales(enabled: boolean = true): HookState<DashboardSales> {
  const fetcher = useCallback(() => getDashboardSales(), []);
  return useApiData(fetcher, enabled);
}

/** Tasks assigned to the current user */
interface UseMyTasksState extends HookState<Task[]> { total: number; }
export function useMyTasks(params?: TaskQueryParams, enabled: boolean = true): UseMyTasksState {
  const [data, setData]       = useState<Task[] | null>(null);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMyTasks(params);
      setData(res.tasks);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params), enabled]);

  useEffect(() => { load(); }, [load]);
  return { data, total, loading, error, refetch: load };
}

/** Projects list */
export function useProjects(enabled: boolean = true): HookState<Project[]> {
  const fetcher = useCallback(() => getProjects(), []);
  return useApiData(fetcher, enabled);
}

// ─── end of file
