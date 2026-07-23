// hooks/useAssignmentHistory.ts
// Hook for Lead Assignment History
"use client";

import { useState, useEffect, useCallback } from "react";
import type { AssignmentHistoryEntry, AssignmentHistoryFilters } from "@/types/assignmentRules";
import { getAssignmentHistory } from "@/lib/api/assignmentRulesApi";

const DEFAULT_FILTERS: AssignmentHistoryFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  userId: "",
  strategy: "All",
  status: "All",
};

const PAGE_SIZE = 20;

interface UseAssignmentHistoryReturn {
  history: AssignmentHistoryEntry[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  filters: AssignmentHistoryFilters;
  setFilters: (f: AssignmentHistoryFilters) => void;
  setPage: (p: number) => void;
  refresh: () => Promise<void>;
}

export function useAssignmentHistory(): UseAssignmentHistoryReturn {
  const [history, setHistory] = useState<AssignmentHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AssignmentHistoryFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAssignmentHistory({ ...filters, page, limit: PAGE_SIZE });
      setHistory(res.history);
      setTotal(res.total);
    } catch (err: any) {
      const status = err?.response?.status;
      // 404 means no history yet or endpoint not available — treat as empty, not error
      if (status === 404) {
        setHistory([]);
        setTotal(0);
      } else {
        const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load assignment history";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSetFilters = useCallback((f: AssignmentHistoryFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  return {
    history,
    total,
    page,
    loading,
    error,
    filters,
    setFilters: handleSetFilters,
    setPage,
    refresh: load,
  };
}
