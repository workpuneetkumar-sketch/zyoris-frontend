"use client";

/**
 * FE2-05 · Turn into Wiki
 *
 * Confirmation modal before calling POST /workspace/pages/:id/wiki.
 * Idempotent: if the page is already a wiki, shows a "revert" confirmation.
 * If the page is archived/locked, shows a clear error instead of calling the API.
 *
 * After success, calls onConverted(isWiki) so the parent can update its state.
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { togglePageWiki } from "@/lib/api/workspaceApi";

interface TurnIntoWikiModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageTitle: string;
  /** Current wiki state of the page */
  isWiki: boolean;
  /** True when the page is archived or locked — prevents conversion */
  isLocked?: boolean;
  /** Called with the new isWiki value after successful toggle */
  onConverted: (newIsWiki: boolean) => void;
}

export const TurnIntoWikiModal: React.FC<TurnIntoWikiModalProps> = ({
  isOpen,
  onClose,
  pageId,
  pageTitle,
  isWiki,
  isLocked = false,
  onConverted,
}) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStatus("idle");
    setError(null);
  };

  const handleClose = () => {
    if (status === "loading") return;
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (isLocked) return; // Safety guard
    setStatus("loading");
    setError(null);
    try {
      const result = await togglePageWiki(pageId);
      setStatus("success");
      setTimeout(() => {
        onConverted(result.isWiki);
        handleClose();
      }, 900);
    } catch (err: any) {
      setStatus("error");
      const status = err?.response?.status;
      setError(
        status === 409
          ? "This page is already in the requested state."
          : status === 403
          ? "You don't have permission to change this page's wiki mode."
          : err?.response?.data?.message ??
            err?.message ??
            "Failed to update wiki mode. Please try again."
      );
    }
  };

  if (!mounted || !isOpen) return null;

  const action = isWiki ? "revert" : "convert";
  const actionLabel = isWiki ? "Revert from Wiki" : "Turn into Wiki";
  const actionColor = isWiki ? "amber" : "violet";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <BookOpen className={`w-4 h-4 text-${actionColor}-500`} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {actionLabel}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={status === "loading"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Locked page guard */}
          {isLocked && (
            <div className="flex items-start space-x-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
              <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Page is locked
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Unlock this page before converting to or from wiki mode.
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="flex flex-col items-center py-6 space-y-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-10 h-10" />
              <p className="text-sm font-semibold">
                {isWiki ? "Reverted from Wiki mode!" : "Page is now a Wiki!"}
              </p>
            </div>
          )}

          {/* Error */}
          {status === "error" && error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Confirmation copy (shown when not locked, not success) */}
          {!isLocked && status !== "success" && (
            <>
              <div
                className={`p-4 rounded-xl border ${
                  isWiki
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    : "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800"
                }`}
              >
                <p className={`text-sm font-semibold mb-1 ${isWiki ? "text-amber-700 dark:text-amber-300" : "text-violet-700 dark:text-violet-300"}`}>
                  {isWiki ? "Reverting wiki mode for:" : "Converting to Wiki:"}
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {pageTitle || "Untitled"}
                </p>
              </div>

              {!isWiki && (
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start space-x-2">
                    <span className="text-violet-500 flex-shrink-0">✦</span>
                    <span>Adds a Wiki badge to the page title and sidebar.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-violet-500 flex-shrink-0">✦</span>
                    <span>
                      Existing content and blocks are preserved — only the metadata
                      changes.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-violet-500 flex-shrink-0">✦</span>
                    <span>You can revert this at any time from the page menu.</span>
                  </li>
                </ul>
              )}

              {isWiki && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The page will return to normal document mode. All content remains
                  intact.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isLocked && status !== "success" && (
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={status === "loading"}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={status === "loading"}
              className={`inline-flex items-center space-x-1.5 px-5 py-2 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50 ${
                isWiki
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-violet-600 hover:bg-violet-700"
              }`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating…</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>{actionLabel}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer when locked */}
        {isLocked && (
          <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ── Wiki badge (reused in WorkspacePageView header + sidebar node) ─────────────
export const WikiBadge: React.FC<{ className?: string }> = ({ className = "" }) => (
  <span
    className={`inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-700 ${className}`}
    title="This page is a Wiki"
  >
    <BookOpen className="w-2.5 h-2.5" />
    <span>Wiki</span>
  </span>
);
