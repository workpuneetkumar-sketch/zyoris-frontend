// hooks/useDeals.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Deal, DealsFilters, DEFAULT_DEALS_FILTERS, DealStage } from "@/types/deals";
import { fetchDeals, updateDealStage as updateDealStageAPI } from "@/lib/api/dealsApi";

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DealsFilters>(DEFAULT_DEALS_FILTERS);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeals();
      setDeals(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch deals."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // ── Client-side filtering ──────────────────────────────────────────────────
  // The /analytics/conversion/scores endpoint returns all deals — filter locally.
  const filteredDeals = useMemo<Deal[]>(() => {
    let result = deals;

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    }

    if (filters.stage !== "All Stages") {
      result = result.filter(
        (d) => d.stage.toLowerCase() === filters.stage.toLowerCase()
      );
    }

    // owner is not present in API response — filter is a no-op unless
    // we later enrich data; kept for UI completeness.
    // date filters are also not in the API response for this endpoint.

    return result;
  }, [deals, filters]);

  // ── Derived KPIs ───────────────────────────────────────────────────────────
  const totalPipeline = useMemo(
    () => filteredDeals.reduce((sum, d) => sum + d.amount, 0),
    [filteredDeals]
  );

  const avgDealSize = useMemo(
    () =>
      filteredDeals.length === 0
        ? 0
        : Math.round(totalPipeline / filteredDeals.length),
    [filteredDeals, totalPipeline]
  );

  const winRate = useMemo(() => {
    const closed = filteredDeals.filter((d) =>
      ["WON", "LOST"].includes(d.stage.toUpperCase())
    );
    const won = filteredDeals.filter((d) =>
      d.stage.toUpperCase() === "WON"
    );
    return closed.length === 0
      ? 0
      : Math.round((won.length / closed.length) * 100);
  }, [filteredDeals]);

  const conversionRate = useMemo(() => {
    if (filteredDeals.length === 0) return 0;
    const avg =
      filteredDeals.reduce((sum, d) => sum + d.conversionProbability, 0) /
      filteredDeals.length;
    return Math.round(avg * 100 * 10) / 10;
  }, [filteredDeals]);

  // ── Deals grouped by stage (for Kanban columns) ────────────────────────────
  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const d of filteredDeals) {
      const key = d.stage;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return map;
  }, [filteredDeals]);

  // ── Update deal stage with optimistic updates ──────────────────────────────
  const updateDealStage = useCallback(
    async (dealId: string, newStage: DealStage | string): Promise<boolean> => {
      setUpdateError(null);
      
      // Find the deal to rollback if needed
      const originalDeal = deals.find(d => d.dealId === dealId);
      if (!originalDeal) {
        setUpdateError("Deal not found");
        return false;
      }

      // Optimistically update UI
      setDeals(prevDeals =>
        prevDeals.map(d =>
          d.dealId === dealId ? { ...d, stage: newStage } : d
        )
      );

      try {
        // Call API
        await updateDealStageAPI(dealId, newStage);
        return true;
      } catch (err) {
        // Rollback on failure
        setDeals(prevDeals =>
          prevDeals.map(d =>
            d.dealId === dealId ? originalDeal : d
          )
        );
        
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update deal stage";
        setUpdateError(errorMessage);
        return false;
      }
    },
    [deals]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleFiltersChange(next: DealsFilters) {
    setFilters(next);
  }

  return {
    deals: filteredDeals,
    allDeals: deals,
    dealsByStage,
    loading,
    error,
    updateError,
    filters,
    // KPIs
    totalPipeline,
    avgDealSize,
    winRate,
    conversionRate,
    // handlers
    handleFiltersChange,
    updateDealStage,
    retry: loadDeals,
  };
}
