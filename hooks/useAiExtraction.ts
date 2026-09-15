"use client";
// hooks/useAiExtraction.ts
// Manages state for the 6 ad-hoc AI extraction endpoints.
// History is persisted per leadId in localStorage so it survives modal close/re-open.

import { useState, useCallback, useEffect } from "react";
import {
  extractAll,
  AiExtractionBundle,
  AiSourceType,
} from "@/lib/api/aiExtractionApi";

export type ExtractionStatus = "idle" | "loading" | "success" | "error";

export interface ExtractionHistoryEntry {
  id: string;           // timestamp-based unique id
  sourceType: AiSourceType;
  sourceText: string;
  bundle: AiExtractionBundle;
  extractedAt: string;  // ISO string
}

export interface UseAiExtractionReturn {
  sourceText: string;
  setSourceText: (v: string) => void;
  sourceType: AiSourceType;
  setSourceType: (v: AiSourceType) => void;

  status: ExtractionStatus;
  error: string | null;

  // Latest extraction result
  bundle: AiExtractionBundle | null;

  // Full history for this lead
  history: ExtractionHistoryEntry[];

  // Load a past entry back into the active view
  loadHistoryEntry: (entry: ExtractionHistoryEntry) => void;
  clearHistory: () => void;

  run: () => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY_PREFIX = "zyoris-ai-extraction-";
const MAX_HISTORY = 10; // keep last 10 extractions per lead

function storageKey(leadId: string) {
  return `${STORAGE_KEY_PREFIX}${leadId}`;
}

function loadHistory(leadId: string): ExtractionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(leadId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(leadId: string, entries: ExtractionHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep only the most recent MAX_HISTORY entries
    const trimmed = entries.slice(-MAX_HISTORY);
    localStorage.setItem(storageKey(leadId), JSON.stringify(trimmed));
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

export function useAiExtraction(leadId?: string): UseAiExtractionReturn {
  const [sourceText, setSourceText] = useState("");
  const [sourceType, setSourceType] = useState<AiSourceType>("CALL");
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<AiExtractionBundle | null>(null);
  const [history, setHistory] = useState<ExtractionHistoryEntry[]>([]);

  // Load persisted history when the leadId changes (modal opens for a lead)
  useEffect(() => {
    if (!leadId) return;
    const saved = loadHistory(leadId);
    setHistory(saved);
    // If there's a previous result, show it immediately
    if (saved.length > 0) {
      const last = saved[saved.length - 1];
      setBundle(last.bundle);
      setSourceType(last.sourceType);
      setSourceText(last.sourceText);
      setStatus("success");
    } else {
      setBundle(null);
      setStatus("idle");
    }
  }, [leadId]);

  const run = useCallback(async () => {
    const text = sourceText.trim();
    if (!text) {
      setError("Please enter some conversation text first.");
      return;
    }
    setStatus("loading");
    setError(null);

    try {
      const result = await extractAll({ sourceText: text, sourceType });
      setBundle(result);
      setStatus("success");

      // Persist this extraction to history
      if (leadId) {
        const entry: ExtractionHistoryEntry = {
          id: `${Date.now()}`,
          sourceType,
          sourceText: text,
          bundle: result,
          extractedAt: new Date().toISOString(),
        };
        setHistory(prev => {
          const updated = [...prev, entry];
          saveHistory(leadId, updated);
          return updated;
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "AI extraction failed. Please try again.";
      setError(msg);
      setStatus("error");
    }
  }, [sourceText, sourceType, leadId]);

  const reset = useCallback(() => {
    setSourceText("");
    setSourceType("CALL");
    setStatus("idle");
    setError(null);
    setBundle(null);
  }, []);

  const loadHistoryEntry = useCallback((entry: ExtractionHistoryEntry) => {
    setSourceText(entry.sourceText);
    setSourceType(entry.sourceType);
    setBundle(entry.bundle);
    setStatus("success");
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (leadId) {
      localStorage.removeItem(storageKey(leadId));
    }
    reset();
  }, [leadId, reset]);

  return {
    sourceText, setSourceText,
    sourceType, setSourceType,
    status, error,
    bundle,
    history,
    loadHistoryEntry,
    clearHistory,
    run,
    reset,
  };
}
