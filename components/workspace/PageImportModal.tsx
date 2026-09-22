"use client";

/**
 * FE2-08 · Page Import
 *
 * Flow: file picker → format validation → preview (POST /import/preview) →
 * progress/success/error → commit (POST /import/commit).
 *
 * This targets the current PAGE, not a database. Do NOT reuse
 * DatabaseImportWizardModal (components/projects/workspace/DatabaseImportWizardModal.tsx).
 *
 * Confirmed endpoints:
 *   POST /workspace/pages/:id/import/preview  — multipart/form-data { file }
 *   POST /workspace/pages/:id/import/commit   — { blocks, mode }
 *
 * Edge cases:
 * - Unsupported format → blocked before API call with clear message
 * - Large files (>5 MB) → warning shown, user can still proceed
 * - block count > 80 → long-page warning in preview
 * - mode: 'append' (default) or 'replace' — user chooses before committing
 * - Duplicate / re-import: mode='replace' replaces everything; append stacks
 */

import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Eye,
  Code,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { previewPageImport, commitPageImport } from "@/lib/api/workspaceApi";
import type { PageImportPreviewResult, WorkspaceBlock, SupportedImportFormat } from "@/types/workspace";

// ── Supported formats ─────────────────────────────────────────────────────────
const SUPPORTED_FORMATS: SupportedImportFormat[] = ["docx", "md", "txt", "html"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB hard block
const LARGE_FILE_WARNING_BYTES = 5 * 1024 * 1024; // 5 MB soft warning

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface PageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  /** Called after successful commit so parent can reload content */
  onImported: () => void;
}

type Step = "pick" | "previewing" | "preview" | "committing" | "done";

// ── Block preview item (read-only, code blocks untouched) ─────────────────────
const ImportBlockItem: React.FC<{ block: WorkspaceBlock; index: number }> = ({ block, index }) => {
  const isCode = block.type === "code";
  const isLink = block.type === "link";
  const text =
    typeof block.text === "string" ? block.text
    : typeof block.content === "string" ? block.content
    : JSON.stringify(block.content ?? "");

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
      <div className="flex items-center space-x-1 mb-0.5 opacity-50">
        {isCode && <Code className="w-3 h-3" />}
        {isLink && <LinkIcon className="w-3 h-3" />}
        <span className="text-[9px] uppercase tracking-wider font-semibold">{block.type}</span>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed line-clamp-3">{text || "(empty)"}</p>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
export const PageImportModal: React.FC<PageImportModalProps> = ({
  isOpen,
  onClose,
  pageId,
  onImported,
}) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PageImportPreviewResult | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = useCallback(() => {
    setStep("pick");
    setFile(null);
    setFileError(null);
    setApiError(null);
    setPreview(null);
    setImportMode("append");
    onClose();
  }, [onClose]);

  const validateAndSetFile = (f: File) => {
    setFileError(null);
    const ext = getFileExtension(f.name) as SupportedImportFormat;
    if (!SUPPORTED_FORMATS.includes(ext)) {
      setFileError(
        `Unsupported format ".${ext}". Supported formats: ${SUPPORTED_FORMATS.map((s) => `.${s}`).join(", ")}`
      );
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File is too large (${formatFileSize(f.size)}). Maximum allowed is 10 MB.`);
      return;
    }
    setFile(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handlePreview = async () => {
    if (!file) return;
    setStep("previewing");
    setApiError(null);
    try {
      const data = await previewPageImport(pageId, file);
      setPreview(data);
      setStep("preview");
    } catch (err: any) {
      setStep("pick");
      setApiError(
        err?.response?.status === 422
          ? "The backend could not parse this file. Please check the format and try again."
          : err?.response?.data?.message ??
            err?.message ??
            "Preview failed. Please try again."
      );
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setStep("committing");
    setApiError(null);
    try {
      await commitPageImport(pageId, preview.blocks, importMode);
      setStep("done");
      setTimeout(() => {
        onImported();
        resetAndClose();
      }, 1200);
    } catch (err: any) {
      setStep("preview");
      setApiError(
        err?.response?.data?.message ??
          err?.message ??
          "Import failed during commit. Please try again."
      );
    }
  };

  if (!mounted || !isOpen) return null;

  const isLargeFile = file && file.size > LARGE_FILE_WARNING_BYTES;
  const isLargePage = preview && preview.blockCount > 80;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget && step !== "previewing" && step !== "committing") resetAndClose(); }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4 text-teal-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Import into Page
            </h2>
            {step === "preview" && preview && (
              <span className="text-[10px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300 px-2 py-0.5 rounded-full">
                {preview.blockCount} blocks
              </span>
            )}
          </div>
          <button
            onClick={resetAndClose}
            disabled={step === "previewing" || step === "committing"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
            aria-label="Close import modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Step: pick ─────────────────────────────── */}
          {(step === "pick" || step === "previewing") && (
            <>
              {/* Supported formats */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supported formats: {SUPPORTED_FORMATS.map((f) => <code key={f} className="mx-0.5 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px]">.{f}</code>)}
              </p>

              {/* API error */}
              {apiError && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                aria-label="Click or drop a file to import"
                className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
                  isDragOver
                    ? "border-teal-400 bg-teal-50 dark:bg-teal-950/20"
                    : file
                    ? "border-teal-400 bg-teal-50/50 dark:bg-teal-950/10"
                    : "border-slate-300 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-950/10"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.md,.txt,.html"
                  className="hidden"
                  onChange={handleFileInput}
                />
                {file ? (
                  <>
                    <FileText className="w-10 h-10 text-teal-500 mb-3" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-center truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{formatFileSize(file.size)}</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      .docx, .md, .txt, .html · max 10 MB
                    </p>
                  </>
                )}
              </div>

              {/* File validation error */}
              {fileError && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Large file warning */}
              {isLargeFile && !fileError && (
                <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    This file is {formatFileSize(file!.size)}. Preview and import may
                    take a moment for large files.
                  </span>
                </div>
              )}
            </>
          )}

          {/* ── Step: previewing ─────────────────────────── */}
          {step === "previewing" && (
            <div className="flex flex-col items-center py-8 space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              <p className="text-sm font-medium">Parsing file…</p>
              <p className="text-xs opacity-70">Building block preview.</p>
            </div>
          )}

          {/* ── Step: preview ────────────────────────────── */}
          {step === "preview" && preview && (
            <>
              {/* Format + block count */}
              <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                    Detected format: <code className="font-mono">.{preview.detectedFormat}</code>
                  </p>
                  <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">
                    {preview.blockCount} blocks ready to import
                  </p>
                </div>
                <Eye className="w-5 h-5 text-teal-400" />
              </div>

              {/* Warnings from backend */}
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {preview.warnings.map((w, i) => (
                    <div key={i} className="flex items-start space-x-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Large page warning */}
              {isLargePage && (
                <div className="flex items-start space-x-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    This import has {preview.blockCount} blocks. Applying it may take
                    several seconds.
                  </span>
                </div>
              )}

              {/* API error after failed commit */}
              {apiError && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Import mode selector */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Import Mode
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["append", "replace"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setImportMode(mode)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left text-xs transition ${
                        importMode === mode
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/20"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="font-bold capitalize mb-0.5">{mode}</span>
                      <span className="opacity-70 leading-tight">
                        {mode === "append"
                          ? "Add imported blocks after existing content"
                          : "Replace all existing content with import"}
                      </span>
                    </button>
                  ))}
                </div>
                {importMode === "replace" && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    ⚠ Replace mode will overwrite all current page content. This
                    cannot be undone without restoring a previous version.
                  </p>
                )}
              </div>

              {/* Block preview list */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Block Preview (first 15)
                </p>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                  {preview.blocks.slice(0, 15).map((block, i) => (
                    <ImportBlockItem key={block.id ?? i} block={block} index={i} />
                  ))}
                  {preview.blocks.length > 15 && (
                    <p className="text-xs text-slate-400 italic pl-1">
                      + {preview.blocks.length - 15} more blocks…
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Step: committing ─────────────────────────── */}
          {step === "committing" && (
            <div className="flex flex-col items-center py-8 space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              <p className="text-sm font-medium">Importing content…</p>
            </div>
          )}

          {/* ── Step: done ───────────────────────────────── */}
          {step === "done" && (
            <div className="flex flex-col items-center py-8 space-y-3 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-10 h-10" />
              <p className="text-sm font-semibold">Import complete!</p>
              <p className="text-xs text-slate-400">Reloading page content…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "pick" || step === "preview") && (
          <div className="flex-shrink-0 flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={step === "preview" ? () => { setStep("pick"); setPreview(null); setApiError(null); } : resetAndClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
            >
              {step === "preview" ? "Back" : "Cancel"}
            </button>

            {step === "pick" && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || !!fileError}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition"
              >
                <ChevronRight className="w-4 h-4" />
                <span>Preview Import</span>
              </button>
            )}

            {step === "preview" && (
              <button
                type="button"
                onClick={handleCommit}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition"
              >
                <Upload className="w-4 h-4" />
                <span>Import into Page</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
