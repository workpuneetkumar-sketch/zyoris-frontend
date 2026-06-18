// hooks/useDeals.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Deal, DealsFilters, DEFAULT_DEALS_FILTERS, DealStage, DEFAULT_DEAL_STAGES } from "@/types/deals";
import {
    fetchDeals,
    createDeal,
    updateDealStage as updateDealStageAPI,
    CreateDealPayload,
} from "@/lib/api/dealsApi";

export function useDeals() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<DealsFilters>(DEFAULT_DEALS_FILTERS);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Create modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [defaultStage, setDefaultStage] = useState<string>("NEW");

    // ── Fetch ──────────────────────────────────────────────────────────────
    const loadDeals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDeals();
            setDeals(Array.isArray(data) ? data : []);
        } catch (err) {
            // 404 = no deals yet for this org — show empty state, not error
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                setDeals([]);
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch deals.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDeals();
    }, [loadDeals]);

    // ── Client-side filtering ──────────────────────────────────────────────
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

        return result;
    }, [deals, filters]);

    // ── Derived KPIs ───────────────────────────────────────────────────────
    const totalPipeline = useMemo(
        () => filteredDeals.reduce((sum, d) => sum + d.amount, 0),
        [filteredDeals]
    );

    const avgDealSize = useMemo(
        () => filteredDeals.length === 0 ? 0 : Math.round(totalPipeline / filteredDeals.length),
        [filteredDeals, totalPipeline]
    );

    const winRate = useMemo(() => {
        const closed = filteredDeals.filter((d) => ["WON", "LOST"].includes(d.stage.toUpperCase()));
        const won    = filteredDeals.filter((d) => d.stage.toUpperCase() === "WON");
        return closed.length === 0 ? 0 : Math.round((won.length / closed.length) * 100);
    }, [filteredDeals]);

    const conversionRate = useMemo(() => {
        if (filteredDeals.length === 0) return 0;
        const avg = filteredDeals.reduce((sum, d) => sum + d.conversionProbability, 0) / filteredDeals.length;
        return Math.round(avg * 100 * 10) / 10;
    }, [filteredDeals]);

    // ── Deals grouped by stage (Kanban) ───────────────────────────────────
    const dealsByStage = useMemo(() => {
        const map = new Map<string, Deal[]>();
        // Initialize default stages to empty arrays
        for (const stage of DEFAULT_DEAL_STAGES) {
            map.set(stage, []);
        }
        // Add all deals to the map, creating stages as needed
        for (const d of filteredDeals) {
            const stage = d.stage.toUpperCase(); // Normalize to uppercase to match default stages!
            console.log(`[useDeals] Processing deal:`, { dealId: d.dealId, name: d.name, originalStage: d.stage, normalizedStage: stage });
            if (!map.has(stage)) {
                map.set(stage, []);
            }
            const arr = map.get(stage)!;
            arr.push(d);
        }
        console.log(`[useDeals] Final dealsByStage:`, Array.from(map.entries()));
        return map;
    }, [filteredDeals]);

    // ── Create deal ────────────────────────────────────────────────────────
    const handleOpenCreate = useCallback((stage?: string) => {
        setDefaultStage(stage ?? "NEW");
        setCreateError(null);
        setIsCreateOpen(true);
    }, []);

    const handleCloseCreate = useCallback(() => {
        setIsCreateOpen(false);
        setCreateError(null);
    }, []);

    const handleCreate = useCallback(async (data: CreateDealPayload): Promise<boolean> => {
        setCreating(true);
        setCreateError(null);
        try {
            await createDeal(data);
            await loadDeals();
            setIsCreateOpen(false);
            return true;
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.error ?? err.response?.data?.message ?? err.message
                : err instanceof Error ? err.message : "Failed to create deal.";
            setCreateError(msg);
            return false;
        } finally {
            setCreating(false);
        }
    }, [loadDeals]);

    // ── Update deal stage (optimistic) ─────────────────────────────────────
    const updateDealStage = useCallback(
        async (dealId: string, newStage: DealStage | string): Promise<boolean> => {
            setUpdateError(null);
            const originalDeal = deals.find((d) => d.dealId === dealId);
            if (!originalDeal) { setUpdateError("Deal not found"); return false; }

            // Optimistic update
            setDeals((prev) => prev.map((d) => d.dealId === dealId ? { ...d, stage: newStage } : d));

            try {
                await updateDealStageAPI(dealId, newStage);
                return true;
            } catch (err) {
                // Rollback
                setDeals((prev) => prev.map((d) => d.dealId === dealId ? originalDeal : d));
                const msg = err instanceof Error ? err.message : "Failed to update deal stage";
                setUpdateError(msg);
                return false;
            }
        },
        [deals]
    );

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
        // Create
        isCreateOpen,
        creating,
        createError,
        defaultStage,
        // KPIs
        totalPipeline,
        avgDealSize,
        winRate,
        conversionRate,
        // Handlers
        handleFiltersChange,
        handleOpenCreate,
        handleCloseCreate,
        handleCreate,
        updateDealStage,
        retry: loadDeals,
    };
}
