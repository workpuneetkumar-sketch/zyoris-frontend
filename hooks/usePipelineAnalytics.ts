// hooks/usePipelineAnalytics.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPipelineAnalytics, PipelineAnalyticsSummary } from "@/lib/api/pipelineAnalyticsApi";

export function usePipelineAnalytics() {
  const [data, setData] = useState<PipelineAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"7D" | "30D" | "90D" | "1Y">("30D");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchPipelineAnalytics();
      setData(summary);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    lastRefreshed,
    refetch: load,
  };
}
