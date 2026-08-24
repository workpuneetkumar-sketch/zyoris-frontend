"use client";
// hooks/useAiExtraction.ts
// Manages state for the 6 ad-hoc AI extraction endpoints.
// Consumers provide sourceText + sourceType; the hook runs extractAll() and
// exposes per-section results, a unified loading/error state, and a reset.

import { useState, useCallback } from "react";
import {
  extractAll,
  AiExtractionBundle,
  AiSourceType,
} from "@/lib/api/aiExtractionApi";

export type ExtractionStatus = "idle" | "loading" | "success" | "error";

export interface UseAiExtractionReturn {
  // Text the user typed / pasted
  sourceText: string;
  setSourceText: (v: string) => void;

  sourceType: AiSourceType;
  setSourceType: (v: AiSourceType) => void;

  // Extraction lifecycle
  status: ExtractionStatus;
  error: string | null;

  // Results
  bundle: AiExtractionBundle | null;

  // Actions
  run: () => Promise<void>;
  reset: () => void;
}

const EMPTY_BUNDLE: AiExtractionBundle = {
  risks: [],
  timeline: null,
  decisionMaker: null,
  competitors: [],
  requirements: [],
  nextBestAction: null,
};

export function useAiExtraction(): UseAiExtractionReturn {
  const [sourceText, setSourceText] = useState("");
  const [sourceType, setSourceType] = useState<AiSourceType>("EMAIL");
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<AiExtractionBundle | null>(null);

  const run = useCallback(async () => {
    const text = sourceText.trim();
    if (!text) {
      setError("Please enter some conversation text to analyse.");
      return;
    }
    setStatus("loading");
    setError(null);
    setBundle(null);
    try {
      const result = await extractAll({ sourceText: text, sourceType });
      setBundle(result);
      setStatus("success");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "AI extraction failed. Please try again.";
      setError(msg);
      setStatus("error");
    }
  }, [sourceText, sourceType]);

  const reset = useCallback(() => {
    setSourceText("");
    setSourceType("EMAIL");
    setStatus("idle");
    setError(null);
    setBundle(null);
  }, []);

  return {
    sourceText,
    setSourceText,
    sourceType,
    setSourceType,
    status,
    error,
    bundle,
    run,
    reset,
  };
}
