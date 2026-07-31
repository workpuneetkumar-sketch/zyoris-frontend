// hooks/useAssignmentAnalytics.ts
// Hook for Assignment Analytics Dashboard
// Targets GET /leads/assignment-analytics (scaffolded — returns empty state until backend ships)
"use client";

import { useState, useEffect, useCallback } from "react";
import type { AssignmentAnalytics, AssignmentAnalyticsFilters } from "@/types/assignmentRules";
import { getAssignmentAnalytics } from "@/lib/api/assignmentRulesApi";

const DEFAULT_FILTERS: AssignmentAnalyticsFilters = {
  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  dateTo: new Date().toISOString().slice(0, 10),
  strategy: "All",
  userId: "",
};

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
  // Track if backend returned real data vs empty fallback
  const [backendAvailable, setBackendAvailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssignmentAnalytics(filters);
      setAnalytics(data);
      // If backend returned meaningful data, mark as available
      setBackendAvailable(
        data.totalAssignments > 0 ||
        data.totalConverted > 0 ||
        data.distribution.length > 0
      );
    } catch (err: any) {
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
