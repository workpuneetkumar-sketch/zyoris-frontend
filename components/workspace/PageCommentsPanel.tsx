"use client";

/**
 * FE2-03 · Suggest Edits / Comments Panel
 *
 * Slide-over panel: list all comments on a page, add new ones (with optional
 * block target), resolve/re-open, and delete. Uses the existing ComposeField
 * component for the composer.
 *
 * TODO (backend — Ayush): Confirm these endpoints:
 *   GET    /workspace/pages/:id/comments
 *   POST   /workspace/pages/:id/comments          { content, blockId? }
 *   PATCH  /workspace/pages/:pageId/comments/:id  { resolved?, content? }
 *   DELETE /workspace/pages/:pageId/comments/:id
 */

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MessageSquare,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  User,
} from "lucide-react";
import { ComposeField } from "@/components/ui/ComposeField";
import {
  getPageComments,
  createPageComment,
  updatePageComment,
  deletePageComment,
} from "@/lib/api/workspaceApi";
import type { WorkspaceComment } from "@/types/workspace";
import { useAuth } from "@/context/AuthContext";

interface PageCommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  /** Optional — pre-select a block target when opened from a block menu */
  targetBlockId?: string | null;
}

type LoadState = "idle" | "loading" | "error";
type SubmitState = "idle" | "submitting" | "error";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

export const PageCommentsPanel: React.FC<PageCommentsPanelProps> = ({
  isOpen,
  onClose,
  pageId,
  targetBlockId = null,
}) => {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  // List state
  const [comments, setComments] = useState<WorkspaceComment[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Composer state
  const [composerText, setComposerText] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Resolve optimistic update tracking — commentId → pending
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  // Filter toggle
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchComments = useCallback(async () => {
    if (!pageId) return;
    setLoadState("loading");
    setLoadError(null);
    try {
      const data = await getPageComments(pageId);
      setComments(data);
      setLoadState("idle");
    } catch (err: any) {
      setLoadState("error");
      setLoadError(
        err?.response?.data?.message ?? err?.message ?? "Failed to load comments."
      );
    }
  }, [pageId]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      setComposerText("");
      setSubmitError(null);
    }
  }, [isOpen, fetchComments]);

  const handleSubmit = async () => {
    const content = composerText.trim();
    if (!content) return;
    setSubmitState("submitting");
    setSubmitError(null);
    try {
      const created = await createPageComment(pageId, {
        content,
        blockId: targetBlockId ?? undefined,
      });
      setComments((prev) => [created, ...prev]);
      setComposerText("");
      setSubmitState("idle");
    } catch (err: any) {
      setSubmitState("error");
      setSubmitError(
        err?.response?.data?.message ?? err?.message ?? "Failed to post comment."
      );
    }
  };

  const handleToggleResolve = async (comment: WorkspaceComment) => {
    if (resolvingIds.has(comment.id)) return; // guard race condition
    setResolvingIds((prev) => new Set(prev).add(comment.id));
    // Optimistic update
    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
    );
    try {
      const updated = await updatePageComment(pageId, comment.id, {
        resolved: !comment.resolved,
      });
      setComments((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err: any) {
      // Roll back optimistic update on failure
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, resolved: comment.resolved } : c))
      );
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    // Optimistic remove
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await deletePageComment(pageId, commentId);
    } catch {
      // Re-fetch on failure to restore consistent state
      fetchComments();
    }
  };

  if (!mounted || !isOpen) return null;

  const visible = comments.filter((c) => showResolved || !c.resolved);
  const resolvedCount = comments.filter((c) => c.resolved).length;
  const openCount = comments.filter((c) => !c.resolved).length;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Page Comments"
        className="fixed right-0 top-0 h-full z-[9999] w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Suggest Edits
            </h2>
            {openCount > 0 && (
              <span className="text-[10px] font-bold bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-full">
                {openCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close comments panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Composer */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
          {targetBlockId && (
            <p className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 truncate">
              📌 Commenting on block: <code className="font-mono">{targetBlockId}</code>
            </p>
          )}
          <ComposeField
            placeholder="Add a suggestion or comment…"
            value={composerText}
            onChange={setComposerText}
            onSubmit={handleSubmit}
            isSubmitting={submitState === "submitting"}
          />
          {submitState === "error" && submitError && (
            <p className="flex items-center space-x-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{submitError}</span>
            </p>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500">
            {openCount} open · {resolvedCount} resolved
          </span>
          <button
            type="button"
            onClick={() => setShowResolved((v) => !v)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Loading */}
          {loadState === "loading" && (
            <div className="flex items-center justify-center py-12 text-slate-400 space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading comments…</span>
            </div>
          )}

          {/* Error */}
          {loadState === "error" && loadError && (
            <div className="flex flex-col items-center py-10 space-y-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-xs text-red-600 dark:text-red-400 text-center">{loadError}</p>
              <button
                type="button"
                onClick={fetchComments}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Empty state */}
          {loadState === "idle" && visible.length === 0 && (
            <div className="flex flex-col items-center py-12 space-y-2 text-slate-400">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs text-center opacity-70">
                {showResolved
                  ? "This page has no comments."
                  : "All comments are resolved, or none have been added."}
              </p>
            </div>
          )}

          {/* Comment cards */}
          {loadState === "idle" &&
            visible.map((comment) => (
              <div
                key={comment.id}
                className={`group rounded-xl border px-3 py-2.5 space-y-1.5 transition ${
                  comment.resolved
                    ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/50 opacity-60"
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* Author + timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {comment.authorAvatarUrl ? (
                      <img
                        src={comment.authorAvatarUrl}
                        alt={comment.authorName}
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-violet-500" />
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {comment.authorName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {formatTime(comment.createdAt)}
                  </span>
                </div>

                {/* Block target badge */}
                {comment.blockId && (
                  <p className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700/50 rounded px-1.5 py-0.5 inline-block font-mono truncate max-w-full">
                    Block: {comment.blockId}
                  </p>
                )}

                {/* Content */}
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleToggleResolve(comment)}
                    disabled={resolvingIds.has(comment.id)}
                    className={`inline-flex items-center space-x-1 text-[11px] font-semibold transition ${
                      comment.resolved
                        ? "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        : "text-green-600 dark:text-green-400 hover:text-green-700"
                    } disabled:opacity-50`}
                    aria-label={comment.resolved ? "Re-open comment" : "Resolve comment"}
                  >
                    {resolvingIds.has(comment.id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : comment.resolved ? (
                      <Circle className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    <span>{comment.resolved ? "Re-open" : "Resolve"}</span>
                  </button>

                  {/* Only show delete to the author */}
                  {user?.id === comment.authorId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </>,
    document.body
  );
};
