// hooks/useDuplicates.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { fetchDuplicates, mergeLeads } from "@/lib/api/duplicatesApi";
import {
  DuplicateGroup,
  FieldConflict,
  MergePayload,
  MergeStep,
} from "@/types/duplicates";
import { Lead } from "@/types/leads";

const MERGE_FIELDS: Array<{ key: keyof Lead; label: string }> = [
  { key: "name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "source", label: "Lead Source" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
  { key: "estimatedValue", label: "Estimated Value" },
  { key: "note", label: "Note" },
];

export function useDuplicates() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Workflow state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<MergeStep>("select");
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryLeadId, setPrimaryLeadId] = useState<string | null>(null);
  const [fieldResolutions, setFieldResolutions] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // ── Fetch duplicates ────────────────────────────────────────────────────────

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDuplicates();
      setGroups(data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch duplicates.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Field conflicts computation ─────────────────────────────────────────────

  const fieldConflicts = useMemo<FieldConflict[]>(() => {
    if (!selectedGroup) return [];
    const leads = selectedGroup.leads;

    return MERGE_FIELDS.map((field) => {
      const values = leads.map((lead) => ({
        leadId: lead.id,
        value: lead[field.key] as string | number | null | undefined,
      }));

      // Find the best default winner: prefer primary lead, then highest score
      const primaryLead = leads.find((l) => l.id === primaryLeadId);
      const defaultWinnerId =
        primaryLeadId ??
        leads.reduce((best, l) => ((l.score ?? 0) > (best.score ?? 0) ? l : best), leads[0])?.id ??
        null;

      return {
        field: field.key as string,
        label: field.label,
        values,
        winningLeadId: fieldResolutions[field.key as string] ?? defaultWinnerId,
      };
    }).filter(
      // Only show conflicting fields (different non-empty values)
      (conflict) => {
        const uniqueValues = new Set(
          conflict.values
            .map((v) => String(v.value ?? "").trim())
            .filter((v) => v !== "" && v !== "undefined" && v !== "null")
        );
        return uniqueValues.size > 1;
      }
    );
  }, [selectedGroup, primaryLeadId, fieldResolutions]);

  // ── Merged preview ──────────────────────────────────────────────────────────

  const mergedPreview = useMemo<Partial<Lead>>(() => {
    if (!selectedGroup || !primaryLeadId) return {};
    const leads = selectedGroup.leads;
    const preview: Partial<Lead> = {};

    MERGE_FIELDS.forEach((field) => {
      const winnerLeadId = fieldResolutions[field.key as string] ?? primaryLeadId;
      const winner = leads.find((l) => l.id === winnerLeadId);
      if (winner) {
        (preview as Record<string, unknown>)[field.key as string] = winner[field.key];
      }
    });

    return preview;
  }, [selectedGroup, primaryLeadId, fieldResolutions]);

  // ── Step handlers ───────────────────────────────────────────────────────────

  function handleSelectGroup(group: DuplicateGroup) {
    setSelectedGroup(group);
    // Default primary = highest score
    const bestLead = [...group.leads].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    setPrimaryLeadId(bestLead?.id ?? null);
    setFieldResolutions({});
    setStep("compare");
  }

  function handleSetPrimaryLead(leadId: string) {
    setPrimaryLeadId(leadId);
    // Reset field resolutions to use new primary
    setFieldResolutions({});
  }

  function handleResolveField(field: string, leadId: string) {
    setFieldResolutions((prev) => ({ ...prev, [field]: leadId }));
  }

  function handleAutoResolve() {
    if (!selectedGroup || !primaryLeadId) return;
    const resolutions: Record<string, string> = {};
    fieldConflicts.forEach((conflict) => {
      resolutions[conflict.field] = primaryLeadId;
    });
    setFieldResolutions(resolutions);
  }

  function handleContinueToPreview() {
    setStep("preview");
  }

  function handleBackToCompare() {
    setStep("compare");
  }

  function handleBackToList() {
    setStep("select");
    setSelectedGroup(null);
    setPrimaryLeadId(null);
    setFieldResolutions({});
    setMergeError(null);
  }

  // ── Execute merge ───────────────────────────────────────────────────────────

  async function handleExecuteMerge() {
    if (!selectedGroup || !primaryLeadId) return;

    const duplicateIds = selectedGroup.leads
      .filter((l) => l.id !== primaryLeadId)
      .map((l) => l.id);

    const payload: MergePayload = {
      primaryLeadId,
      duplicateLeadIds: duplicateIds,
      fieldResolutions,
    };

    setMerging(true);
    setMergeError(null);

    try {
      await mergeLeads(payload);

      // Optimistic update — remove the group from list
      setGroups((prev) => prev.filter((g) => g.groupId !== selectedGroup.groupId));
      setMergeSuccess(true);
      setStep("success");
      toast.success("Leads merged successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Merge failed. Please try again.";
      setMergeError(msg);
      toast.error(msg);
    } finally {
      setMerging(false);
    }
  }

  function handleMergeAnother() {
    setStep("select");
    setSelectedGroup(null);
    setPrimaryLeadId(null);
    setFieldResolutions({});
    setMergeSuccess(false);
    setMergeError(null);
  }

  return {
    // Data
    groups,
    loading,
    error,
    // Workflow
    step,
    selectedGroup,
    primaryLeadId,
    fieldConflicts,
    fieldResolutions,
    mergedPreview,
    merging,
    mergeSuccess,
    mergeError,
    // Actions
    loadDuplicates,
    handleSelectGroup,
    handleSetPrimaryLead,
    handleResolveField,
    handleAutoResolve,
    handleContinueToPreview,
    handleBackToCompare,
    handleBackToList,
    handleExecuteMerge,
    handleMergeAnother,
    retry: loadDuplicates,
  };
}
