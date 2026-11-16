// hooks/useAssignmentRules.ts
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import type {
  AssignmentRule,
  AssignmentRuleStatus,
  AssignmentStrategy,
  CreateAssignmentRulePayload,
  UpdateAssignmentRulePayload,
} from "@/types/assignmentRules";
import {
  listAssignmentRules,
  createAssignmentRule,
  updateAssignmentRule,
  deleteAssignmentRule,
} from "@/lib/api/assignmentRulesApi";

export function useAssignmentRules(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [strategyFilter, setStrategyFilter] = useState<"all" | AssignmentStrategy>("all");

  const rulesRef = useRef<AssignmentRule[]>(rules);
  rulesRef.current = rules;
  const hasLoadedRef = useRef(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAssignmentRules();
      setRules(res.rules);
      setTotal(res.total);
      hasLoadedRef.current = true;
    } catch (err: any) {
      // 404 = no rules yet — show empty, not error
      if (err?.response?.status === 404) {
        setRules([]);
        setTotal(0);
        hasLoadedRef.current = true;
      } else {
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to load assignment rules");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadRules();
  }, [enabled, loadRules]);

  const createRule = useCallback(
    async (payload: CreateAssignmentRulePayload): Promise<AssignmentRule | null> => {
      setCreating(true);
      try {
        const rule = await createAssignmentRule(payload);
        setRules((prev) => [rule, ...prev]);
        setTotal((prev) => prev + 1);
        toast.success("Assignment rule created successfully");
        return rule;
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? err?.message ?? "Failed to create rule");
        return null;
      } finally {
        setCreating(false);
      }
    },
    []
  );

  const updateRule = useCallback(
    async (payload: UpdateAssignmentRulePayload): Promise<AssignmentRule | null> => {
      setUpdating(true);
      const snapshot = rulesRef.current.slice();
      // Optimistic
      setRules((prev) => prev.map((r) => (r.id === payload.id ? { ...r, ...payload } : r)));
      try {
        const updated = await updateAssignmentRule(payload);
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast.success("Assignment rule updated successfully");
        return updated;
      } catch (err: any) {
        setRules(snapshot); // rollback
        toast.error(err?.response?.data?.message ?? err?.message ?? "Failed to update rule");
        return null;
      } finally {
        setUpdating(false);
      }
    },
    []
  );

  const deleteRule = useCallback(
    async (id: string): Promise<boolean> => {
      setDeleting(true);
      const snapshot = rulesRef.current.slice();
      // Optimistic
      setRules((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      try {
        await deleteAssignmentRule(id);
        toast.success("Assignment rule deleted successfully");
        return true;
      } catch (err: any) {
        setRules(snapshot); // rollback
        toast.error(err?.response?.data?.message ?? err?.message ?? "Failed to delete rule");
        return false;
      } finally {
        setDeleting(false);
      }
    },
    []
  );

  const filteredRules = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rules.filter((r) => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.territories ?? []).some((t) => t.toLowerCase().includes(q)) ||
        (r.cities ?? []).some((c) => c.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchStrategy = strategyFilter === "all" || r.strategy === strategyFilter;
      return matchSearch && matchStatus && matchStrategy;
    });
  }, [rules, searchQuery, statusFilter, strategyFilter]);

  const effectiveLoading = loading || (enabled && !hasLoadedRef.current);

  return {
    rules,
    filteredRules,
    total,
    loading: effectiveLoading,
    error,
    creating,
    updating,
    deleting,
    createRule,
    updateRule,
    deleteRule,
    refresh: loadRules,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    strategyFilter,
    setStrategyFilter,
  };
}
