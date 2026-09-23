"use client";

/**
 * FE2-07 · Version History
 *
 * Slide-over panel: revision timeline with editor + timestamp per entry,
 * snapshot preview on click, and a restore confirmation flow.
 *
 * TODO (backend — Ayush): Confirm exact endpoints:
 *   GET  /workspace/pages/:id/revisions
 *   POST /workspace/pages/:id/revisions/:revisionId/restore
 *   Response for restore: WorkspacePage (restored state)
 *
 * Edge cases:
 * - Restoring an archived/locked page → blocked with a clear message
 * - Concurrent edits during restore → conflict 409 handled with user message
 * - Empty history → empty state
 * - Auth context preserved through restore (no forced re-login)
 */

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  History,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Lock,
  Eye,
} from "lucide-react";
import { getPageRevisions, restorePageRevision } from "@/lib/api/workspaceApi";
import type { WorkspaceRevision } from "@/types/workspace";

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  /** True if the page is locked — prevents restore */
  isLocked?: boolean;
  /** Called after a successful restore so parent can reload page content */
  onRestored: () => void;
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  isOpen,
  onClose,
  pageId,
  isLocked = false,
  onRestored,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [revisions, setRevisions] = useState<WorkspaceRevision[]>([]);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Preview / restore state
  const [selectedRevision, setSelectedRevision] = useState<WorkspaceRevision | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "confirming" | "restoring" | "success" | "error">("idle");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fetchRevisions = useCallback(async () => {
    if (!pageId) return;
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const data = await getPageRevisions(pageId);
      setRevisions(data);
      setLoadStatus("idle");
    } catch (err: any) {
      setLoadStatus("error");
      setLoadError(
        err?.response?.data?.message ?? err?.message ?? "Failed to load revision history."
      );
    }
  }, [pageId]);

  useEffect(() => {
    if (isOpen) {
      fetchRevisions();
      setSelectedRevision(null);
      setRestoreStatus("idle");
      setRestoreError(null);
    }
  }, [isOpen, fetchRevisions]);

  const handleSelectRevision = (rev: WorkspaceRevision) => {
    setSelectedRevision(rev);
    setRestoreStatus("idle");
    setRestoreError(null);
  };

  const handleRestore = async () => {
    if (!selectedRevision || isLocked) return;
    setRestoreStatus("restoring");
    setRestoreError(null);
    try {
      await restorePageRevision(pageId, selectedRevision.id);
      setRestoreStatus("success");
      setTimeout(() => {
        onRestored();
        onClose();
      }, 1200);
    } catch (err: any) {
      setRestoreStatus("error");
      const httpStatus = err?.response?.status;
      setRestoreError(
        httpStatus === 409
          ? "A conflict occurred — another edit may have been made simultaneously. Please refresh and try again."
          : httpStatus === 403
          ? "You don't have permission to restore this page."
          : httpStatus === 423 // Locked
          ? "This page is locked and cannot be restored."
          : err?.response?.data?.message ??
            err?.message ??
            "Restore failed. Please try again."
      );
    }
  };

  if (!mounted || !isOpen) return null;

  const dt = selectedRevision ? formatDateTime(selectedRevision.createdAt) : null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Version History"
        className="fixed right-0 top-0 h-full z-[9999] w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Version History
            </h2>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={fetchRevisions}
              disabled={loadStatus === "loading"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
              aria-label="Refresh history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadStatus === "loading" ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close version history"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Locked warning */}
        {isLocked && (
          <div className="flex-shrink-0 flex items-center space-x-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Page is locked — restore is disabled.
            </p>
          </div>
        )}

        {/* Split pane: list (left-ish) + preview */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ── Loading ────────────────────────────── */}
          {loadStatus === "loading" && (
            <div className="flex items-center justify-center py-16 space-x-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-sm">Loading history…</span>
            </div>
          )}

          {/* ── Error ─────────────────────────────── */}
          {loadStatus === "error" && (
            <div className="flex flex-col items-center py-12 space-y-3 px-5">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-xs text-red-600 dark:text-red-400 text-center">{loadError}</p>
              <button
                type="button"
                onClick={fetchRevisions}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* ── Empty state ───────────────────────── */}
          {loadStatus === "idle" && revisions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-400 px-5">
              <History className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No history yet</p>
              <p className="text-xs text-center opacity-70">
                Version history is saved automatically when the page is edited.
              </p>
            </div>
          )}

          {/* ── Revision list + detail ─────────────── */}
          {loadStatus === "idle" && revisions.length > 0 && (
            <>
              {/* Revision timeline list */}
              <div className={`overflow-y-auto border-b border-slate-100 dark:border-slate-800 ${selectedRevision ? "max-h-[220px]" : "flex-1"}`}>
                {revisions.map((rev, i) => {
                  const { date, time } = formatDateTime(rev.createdAt);
                  const isSelected = selectedRevision?.id === rev.id;
                  return (
                    <button
                      key={rev.id}
                      type="button"
                      onClick={() => handleSelectRevision(rev)}
                      className={`w-full flex items-center space-x-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left transition ${
                        isSelected
                          ? "bg-orange-50 dark:bg-orange-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            i === 0
                              ? "bg-orange-500"
                              : isSelected
                              ? "bg-orange-400"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        {i < revisions.length - 1 && (
                          <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mt-1" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {rev.editorName}
                          </p>
                          {i === 0 && (
                            <span className="text-[9px] font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {date} · {time} · {relativeTime(rev.createdAt)}
                        </p>
                      </div>

                      <ChevronRight
                        className={`w-3.5 h-3.5 flex-shrink-0 transition ${
                          isSelected ? "text-orange-500" : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Snapshot detail pane */}
              {selectedRevision && (
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {/* Revision metadata */}
                  <div className="flex items-center space-x-2.5 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl">
                    <span className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-orange-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {selectedRevision.editorName}
                      </p>
                      {dt && (
                        <p className="text-[11px] text-slate-400">
                          {dt.date} at {dt.time}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Snapshot preview */}
                  <div>
                    <div className="flex items-center space-x-1.5 mb-2">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Snapshot Preview
                      </p>
                    </div>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {selectedRevision.snapshot.blocks.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Empty snapshot</p>
                      ) : (
                        selectedRevision.snapshot.blocks.slice(0, 12).map((block, i) => {
                          const text =
                            typeof block.text === "string"
                              ? block.text
                              : typeof block.content === "string"
                              ? block.content
                              : "";
                          return (
                            <div
                              key={block.id ?? i}
                              className={`text-xs rounded-lg px-2.5 py-1.5 border ${
                                block.type === "code"
                                  ? "bg-slate-900 border-slate-700 font-mono text-green-400"
                                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              <span className="opacity-40 text-[9px] uppercase mr-1.5">
                                {block.type}
                              </span>
                              <span className="line-clamp-1">{text || "(empty)"}</span>
                            </div>
                          );
                        })
                      )}
                      {selectedRevision.snapshot.blocks.length > 12 && (
                        <p className="text-[11px] text-slate-400 italic pl-1">
                          + {selectedRevision.snapshot.blocks.length - 12} more blocks…
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Restore states */}
                  {restoreStatus === "error" && restoreError && (
                    <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{restoreError}</span>
                    </div>
                  )}

                  {restoreStatus === "success" && (
                    <div className="flex items-center space-x-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Page restored! Reloading…</span>
                    </div>
                  )}

                  {/* Restore CTA */}
                  {!isLocked && restoreStatus !== "success" && (
                    <>
                      {restoreStatus === "confirming" ? (
                        <div className="space-y-2">
                          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                            This will replace all current page content with this snapshot.
                            Current content will be saved as a new revision first.
                          </p>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => setRestoreStatus("idle")}
                              className="flex-1 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleRestore}
                              className="flex-1 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Confirm Restore</span>
                            </button>
                          </div>
                        </div>
                      ) : restoreStatus === "restoring" ? (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRestoreStatus("confirming")}
                          className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore this Version</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};
