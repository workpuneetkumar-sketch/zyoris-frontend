"use client";

/**
 * FE2-04 · Translation
 *
 * Flow: language selector → loading → preview/diff of translated blocks →
 * "Apply" confirmation → calls workspaceApi.commitPageImport (blocks, replace).
 *
 * The backend preserves code blocks and URLs; the UI must not reformat them.
 * Confirmed endpoint: POST /workspace/pages/:id/translate { targetLanguage }
 *
 * Edge cases handled:
 * - Unsupported language (backend 422 → user-friendly message)
 * - Very long pages (block count warning when > 80 blocks)
 * - Pages heavy in code blocks (preview shows code blocks read-only, no diff)
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Code,
  Link as LinkIcon,
} from "lucide-react";
import { translatePage, getWorkspacePage, normalizeBackendBlock, updateWorkspacePage } from "@/lib/api/workspaceApi";
import type { WorkspaceBlock, TranslatePageResult } from "@/types/workspace";

// ── Supported languages ───────────────────────────────────────────────────────
const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "pt", label: "Portuguese", flag: "🇧🇷" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "nl", label: "Dutch", flag: "🇳🇱" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "pl", label: "Polish", flag: "🇵🇱" },
  { code: "tr", label: "Turkish", flag: "🇹🇷" },
  { code: "sv", label: "Swedish", flag: "🇸🇪" },
];

const BLOCK_COUNT_WARNING = 80;

// ── Props ─────────────────────────────────────────────────────────────────────
interface TranslatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  /** Current page blocks — used to count code blocks for the UX warning */
  currentBlocks: WorkspaceBlock[];
  /** Called after successful apply so parent can reload blocks */
  onApplied: () => void;
}

type Step = "select" | "previewing" | "preview" | "applying" | "done";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Render a single translated block for the preview (read-only, no diff) */
const BlockPreviewItem: React.FC<{ block: WorkspaceBlock; index: number }> = ({
  block,
}) => {
  const isCode = block.type === "code";
  const isLink = block.type === "link";

  // Extract readable text — handle all backend content shapes:
  // 1. block.text (string) — set by normalizeBackendBlock
  // 2. block.content.text (object with .text field)
  // 3. block.content (plain string)
  // Never fall through to JSON.stringify
  const contentObj =
    block.content && typeof block.content === "object" ? block.content : null;
  const text =
    typeof block.text === "string" && block.text.trim() !== ""
      ? block.text
      : typeof contentObj?.text === "string" && contentObj.text.trim() !== ""
      ? contentObj.text
      : typeof block.content === "string" && block.content.trim() !== ""
      ? block.content
      : "(empty block)";

  return (
    <div
      className={`text-xs rounded-lg px-3 py-2 border ${
        isCode
          ? "bg-slate-900 dark:bg-black border-slate-700 font-mono text-green-400"
          : isLink
          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
      }`}
    >
      <div className="flex items-center space-x-1.5 mb-1 opacity-60">
        {isCode ? (
          <Code className="w-3 h-3" />
        ) : isLink ? (
          <LinkIcon className="w-3 h-3" />
        ) : null}
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          {isCode ? "Code (preserved)" : isLink ? "Link (preserved)" : block.type}
        </span>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed line-clamp-4">{text}</p>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
export const TranslatePageModal: React.FC<TranslatePageModalProps> = ({
  isOpen,
  onClose,
  pageId,
  currentBlocks,
  onApplied,
}) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [selectedLang, setSelectedLang] = useState<string>("");
  const [step, setStep] = useState<Step>("select");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslatePageResult | null>(null);

  // Live blocks — fetched fresh when the modal opens so we always
  // reflect content the user just typed (BlockEditor owns its own
  // state and doesn't propagate changes back to WorkspacePageView).
  const [liveBlocks, setLiveBlocks] = useState<WorkspaceBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);

  // Fetch live blocks every time the modal opens
  useEffect(() => {
    if (!isOpen || !pageId) return;
    setBlocksLoading(true);
    getWorkspacePage(pageId)
      .then((data) => {
        setLiveBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
      })
      .catch(() => {
        // Non-fatal: fall back to the prop passed in
        setLiveBlocks(Array.isArray(currentBlocks) ? currentBlocks : []);
      })
      .finally(() => setBlocksLoading(false));
  }, [isOpen, pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard: use liveBlocks (fresh from API) not the stale prop
  const safeBlocks: WorkspaceBlock[] = liveBlocks;
  const isEmpty = !blocksLoading && safeBlocks.length === 0;
  const codeBlockCount = safeBlocks.filter((b) => b.type === "code").length;
  const isLargePage = safeBlocks.length > BLOCK_COUNT_WARNING;

  const resetAndClose = () => {
    setStep("select");
    setSelectedLang("");
    setError(null);
    setResult(null);
    setLiveBlocks([]);
    onClose();
  };

  const handlePreview = async () => {
    if (!selectedLang) return;

    // Guard: empty page — nothing to translate
    if (isEmpty) {
      setError("This page has no content to translate yet. Add some text blocks first.");
      return;
    }

    setStep("previewing");
    setError(null);
    try {
      const data = await translatePage(pageId, selectedLang);

      // Normalise: backend may return blocks under a different key or as undefined
      // Also run normalizeBackendBlock so .text is always populated correctly
      const rawBlocks: any[] = Array.isArray(data?.translatedBlocks)
        ? data.translatedBlocks
        : Array.isArray((data as any)?.blocks)
        ? (data as any).blocks
        : [];

      const translatedBlocks: WorkspaceBlock[] = rawBlocks.map(normalizeBackendBlock);

      setResult({ ...data, translatedBlocks });
      setStep("preview");
    } catch (err: any) {
      setStep("select");
      const status = err?.response?.status;
      if (status === 422) {
        setError("This language is not supported by the translation service.");
      } else {
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Translation failed. Please try again."
        );
      }
    }
  };

  const handleApply = async () => {
    if (!result) return;
    // Guard: nothing to apply if translatedBlocks is empty
    const blocksToApply = Array.isArray(result.translatedBlocks)
      ? result.translatedBlocks
      : [];
    if (blocksToApply.length === 0) {
      setError("No translated blocks to apply. The translation result was empty.");
      return;
    }
    setStep("applying");
    setError(null);
    try {
      // Use confirmed PATCH /workspace/pages/:id with content field.
      // POST /workspace/pages/:id/import/commit is not yet live on backend.
      // Build proper backend-shaped block payloads before persisting.
      const { buildBackendBlockPayload } = await import("@/lib/api/workspaceApi");
      const backendBlocks = blocksToApply.map((b, idx) =>
        buildBackendBlockPayload({
          type: b.type,
          text: b.text ?? "",
          content: b.content,
          properties: b.properties,
          position: idx,
          parentBlockId: b.parentBlockId ?? undefined,
        })
      );
      await updateWorkspacePage(pageId, { content: { blocks: backendBlocks } });
      setStep("done");
      setTimeout(() => {
        onApplied();
        resetAndClose();
      }, 1200);
    } catch (err: any) {
      setStep("preview");
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to apply translation."
      );
    }
  };

  if (!mounted || !isOpen) return null;

  const selectedLangLabel =
    LANGUAGES.find((l) => l.code === selectedLang)?.label ?? selectedLang;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) resetAndClose(); }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Translate Page
            </h2>
            {step === "preview" && result && (
              <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded-full">
                Preview
              </span>
            )}
          </div>
          <button
            onClick={resetAndClose}
            disabled={step === "previewing" || step === "applying"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Step: select ───────────────────────────────── */}
          {(step === "select" || step === "previewing") && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a target language. Code blocks and URLs will be preserved
                exactly as-is by the backend.
              </p>

              {/* Fetching live blocks spinner */}
              {blocksLoading && (
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking page content…</span>
                </div>
              )}

              {/* Empty page notice — only show once we know blocks are loaded */}
              {!blocksLoading && isEmpty && (
                <div className="flex items-start space-x-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                  <span>
                    This page has no content yet. Add some text blocks before
                    translating.
                  </span>
                </div>
              )}

              {/* Warnings */}
              {isLargePage && (
                <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    This page has {safeBlocks.length} blocks, which may cause
                    translation to take longer than usual.
                  </span>
                </div>
              )}
              {codeBlockCount > 0 && (
                <div className="flex items-start space-x-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                  <Code className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                  <span>
                    {codeBlockCount} code block{codeBlockCount > 1 ? "s" : ""} detected —
                    {" "}these will not be translated.
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Language grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    disabled={step === "previewing"}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-medium transition ${
                      selectedLang === lang.code
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    } disabled:opacity-50`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span className="truncate">{lang.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Step: previewing ───────────────────────────── */}
          {step === "previewing" && (
            <div className="flex flex-col items-center py-8 space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
              <p className="text-sm font-medium">Translating to {selectedLangLabel}…</p>
              <p className="text-xs opacity-70">This may take a moment for long pages.</p>
            </div>
          )}

          {/* ── Step: preview ──────────────────────────────── */}
          {step === "preview" && result && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Preview — {selectedLangLabel}
                </p>
                <span className="text-[11px] text-slate-400">
                  {result.translatedBlocks?.length ?? 0} blocks
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Review the translation below. Click <strong>Apply</strong> to replace
                the current page content, or <strong>Cancel</strong> to discard.
              </p>
              {error && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Empty translated result — backend returned no blocks */}
              {(!result.translatedBlocks || result.translatedBlocks.length === 0) ? (
                <div className="flex flex-col items-center py-8 space-y-2 text-slate-400">
                  <Globe className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">No translated content returned</p>
                  <p className="text-xs text-center opacity-70">
                    The page may have no translatable text, or the service returned an
                    empty result. Try again or check with backend.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {result.translatedBlocks.map((block, i) => (
                    <BlockPreviewItem key={block.id ?? i} block={block} index={i} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step: applying ─────────────────────────────── */}
          {step === "applying" && (
            <div className="flex flex-col items-center py-8 space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
              <p className="text-sm font-medium">Applying translation…</p>
            </div>
          )}

          {/* ── Step: done ─────────────────────────────────── */}
          {step === "done" && (
            <div className="flex flex-col items-center py-8 space-y-3 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-10 h-10" />
              <p className="text-sm font-semibold">Translation applied!</p>
              <p className="text-xs text-slate-400">Reloading page content…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "select" || step === "previewing" || step === "preview" || step === "applying") && (
          <div className="flex-shrink-0 flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={step === "preview" ? () => { setStep("select"); setResult(null); } : resetAndClose}
              disabled={step === "previewing" || step === "applying"}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition"
            >
              {step === "preview" ? "Back" : "Cancel"}
            </button>

            {step !== "preview" && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={!selectedLang || step === "previewing" || isEmpty}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition"
              >
                {step === "previewing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Translating…</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span>Preview Translation</span>
                  </>
                )}
              </button>
            )}

            {step === "preview" && (
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Translation</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
