// hooks/useLeadFollowUp.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { LeadFollowUpItem, AddFollowUpPayload, LeadNotePayload } from "@/types/leadFollowUp";
import {
  getFollowUpTimeline,
  addFollowUp,
  addLeadNote,
} from "@/lib/api/leadFollowUpService";

export function useLeadFollowUp(leadId: string | null) {
  const [timeline, setTimeline] = useState<LeadFollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const load = useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getFollowUpTimeline(leadId);
      // Sort chronologically (newest first)
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTimeline(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load timeline";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const addFollowUpEntry = useCallback(
    async (payload: AddFollowUpPayload) => {
      if (!leadId) return;
      setIsAdding(true);
      try {
        const created = await addFollowUp(leadId, payload);
        setTimeline((prev) => [created, ...prev]);
        toast.success("Follow-up added.");
        return created;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 403) {
          toast.error("You don't have permission to add a follow-up.");
        } else if (status === 404) {
          toast.error("Lead not found.");
        } else {
          toast.error("Failed to add follow-up.");
        }
        throw err;
      } finally {
        setIsAdding(false);
      }
    },
    [leadId]
  );

  const addNote = useCallback(
    async (payload: LeadNotePayload) => {
      if (!leadId) return;
      setIsAdding(true);
      try {
        const created = await addLeadNote(leadId, payload);
        // Re-fetch to get the note in the timeline
        await load();
        toast.success("Note added.");
        return created;
      } catch (err: any) {
        toast.error("Failed to add note.");
        throw err;
      } finally {
        setIsAdding(false);
      }
    },
    [leadId, load]
  );

  return {
    timeline,
    isLoading,
    error,
    isAdding,
    addFollowUp: addFollowUpEntry,
    addNote,
    retry: load,
  };
}
