"use client";

/**
 * FE2-03 · Suggest Edits & Page Comments Panel
 *
 * Premium Slide-over panel: list, add, resolve/re-open, and delete suggestions
 * and comments on workspace pages with seamless offline/local persistence fallback.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  User,
  Send,
  Sparkles,
  Check,
  Pin,
  Filter,
} from "lucide-react";
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

type FilterTab = "open" | "resolved" | "all";
type LoadState = "idle" | "loading" | "error";
type SubmitState = "idle" | "submitting" | "error";

function formatTime(iso?: string): string {
  if (!iso) return "just now";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "just now";
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export const PageCommentsPanel: React.FC<PageCommentsPanelProps> = ({
  isOpen,
  onClose,
  pageId,
  targetBlockId = null,
}) => {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // List state
  const [comments, setComments] = useState<WorkspaceComment[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter state
  const [activeTab, setActiveTab] = useState<FilterTab>("open");

  // Composer state
  const [composerType, setComposerType] = useState<"comment" | "suggestion">("suggestion");
  const [composerText, setComposerText] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Track pending resolves
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Handle composer submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = composerText.trim();
    if (!content || submitState === "submitting") return;

    setSubmitState("submitting");
    setSubmitError(null);

    const authorName =
      user?.name ||
      (user?.email ? user.email.split("@")[0] : "You");

    try {
      const created = await createPageComment(
        pageId,
        {
          content,
          blockId: targetBlockId ?? undefined,
        },
        {
          id: user?.id,
          name: authorName,
          avatarUrl: user?.avatarUrl || null,
        }
      );

      // Ensure author details are present on local object
      const normalizedCreated: WorkspaceComment = {
        ...created,
        authorName: created.authorName || authorName,
        authorAvatarUrl: created.authorAvatarUrl || user?.avatarUrl || null,
      };

      setComments((prev) => [normalizedCreated, ...prev]);
      setComposerText("");
      setSubmitState("idle");
    } catch (err: any) {
      setSubmitState("error");
      setSubmitError(
        err?.response?.data?.message ?? err?.message ?? "Failed to post comment."
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleResolve = async (comment: WorkspaceComment) => {
    if (resolvingIds.has(comment.id)) return;
    setResolvingIds((prev) => new Set(prev).add(comment.id));

    const nextResolved = !comment.resolved;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? { ...c, resolved: nextResolved } : c))
    );

    try {
      const updated = await updatePageComment(pageId, comment.id, {
        resolved: nextResolved,
      });

      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, ...updated } : c))
      );
    } catch {
      // Keep optimistic update or retry silently
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await deletePageComment(pageId, commentId);
    } catch {
      fetchComments();
    }
  };

  if (!mounted || !isOpen) return null;

  const openComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  const displayedComments =
    activeTab === "open"
      ? openComments
      : activeTab === "resolved"
      ? resolvedComments
      : comments;

  const currentUserAuthorName =
    user?.name ||
    (user?.email ? user.email.split("@")[0] : "You");

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Suggest Edits and Comments"
        className="fixed right-0 top-0 bottom-0 h-full z-[9999] w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Suggest Edits & Comments</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {openComments.length} open · {resolvedComments.length} resolved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close panel"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* New Suggestion / Comment Composer */}
        <div className="flex-shrink-0 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          {/* Target Block indicator pill */}
          {targetBlockId && (
            <div className="flex items-center space-x-1.5 text-xs text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 px-3 py-1.5 rounded-xl font-medium">
              <Pin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Attached to Block: <code className="font-mono text-[11px]">{targetBlockId}</code></span>
            </div>
          )}

          {/* Mode pills */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setComposerType("suggestion")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                composerType === "suggestion"
                  ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              💡 Edit Suggestion
            </button>
            <button
              type="button"
              onClick={() => setComposerType("comment")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                composerType === "comment"
                  ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              💬 General Comment
            </button>
          </div>

          {/* Text Input Box */}
          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all p-3 space-y-2">
            <div className="flex items-center space-x-2 mb-1">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={currentUserAuthorName}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {getInitials(currentUserAuthorName)}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {currentUserAuthorName}
              </span>
            </div>

            <textarea
              ref={textareaRef}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={
                composerType === "suggestion"
                  ? "Suggest an edit or improvements for this page..."
                  : "Add a comment or note..."
              }
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-mono">
                Press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">Ctrl+Enter</kbd> to post
              </span>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!composerText.trim() || submitState === "submitting"}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50"
              >
                {submitState === "submitting" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {submitState === "error" && submitError && (
            <div className="flex items-center space-x-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-2 rounded-xl border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex-shrink-0 px-4 py-2 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("open")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "open"
                  ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Open ({openComments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("resolved")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "resolved"
                  ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Resolved ({resolvedComments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All ({comments.length})
            </button>
          </div>

          <button
            type="button"
            onClick={fetchComments}
            title="Refresh comments"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          {/* Loading */}
          {loadState === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <span className="text-xs font-medium">Loading page suggestions…</span>
            </div>
          )}

          {/* Error */}
          {loadState === "error" && loadError && (
            <div className="flex flex-col items-center py-12 px-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 space-y-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{loadError}</p>
              <button
                type="button"
                onClick={fetchComments}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 hover:bg-red-200 rounded-xl transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {loadState === "idle" && displayedComments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-400 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {activeTab === "open"
                  ? "No open suggestions"
                  : activeTab === "resolved"
                  ? "No resolved comments"
                  : "No suggestions yet"}
              </p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {activeTab === "open"
                  ? "All edit suggestions on this page have been resolved or closed."
                  : "Use the box above to suggest edits or leave comments for your team."}
              </p>
            </div>
          )}

          {/* Comment Cards */}
          {loadState === "idle" &&
            displayedComments.map((comment) => {
              const displayAuthor = comment.authorName || currentUserAuthorName;

              return (
                <div
                  key={comment.id}
                  className={`group rounded-2xl border p-4 space-y-2.5 transition-all duration-200 ${
                    comment.resolved
                      ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75"
                      : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md"
                  }`}
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {comment.authorAvatarUrl ? (
                        <img
                          src={comment.authorAvatarUrl}
                          alt={displayAuthor}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs flex-shrink-0">
                          {getInitials(displayAuthor)}
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {displayAuthor}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          comment.resolved
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800"
                        }`}
                      >
                        {comment.resolved ? "Resolved" : "Open"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Block Badge */}
                  {comment.blockId && (
                    <div className="inline-flex items-center space-x-1 text-[10px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 rounded-md font-mono max-w-full truncate">
                      <Pin className="w-3 h-3 flex-shrink-0" />
                      <span>Block: {comment.blockId}</span>
                    </div>
                  )}

                  {/* Content Body */}
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                    {comment.content}
                  </p>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleToggleResolve(comment)}
                      disabled={resolvingIds.has(comment.id)}
                      className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        comment.resolved
                          ? "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                          : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800"
                      } disabled:opacity-50`}
                    >
                      {resolvingIds.has(comment.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : comment.resolved ? (
                        <RotateCcw className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span>{comment.resolved ? "Re-open" : "Resolve"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition opacity-80 group-hover:opacity-100"
                      aria-label="Delete comment"
                      title="Delete suggestion"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>,
    document.body
  );
};
