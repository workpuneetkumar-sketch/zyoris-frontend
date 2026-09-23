"use client";

/**
 * FE2-06 · Updates & Analytics Panel
 *
 * Slide-over panel showing: total views/edits/comments, unique viewers,
 * last activity timestamps, and a recent activity feed.
 *
 * TODO (backend — Ayush): Confirm exact endpoint:
 *   GET /workspace/pages/:id/analytics
 *   Response: WorkspaceAnalytics
 *
 * States handled: loading, error (with retry), empty (no data yet),
 * unauthorized (403), and success.
 */

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  BarChart2,
  Eye,
  Edit3,
  MessageSquare,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
  Lock,
} from "lucide-react";
import { getPageAnalytics } from "@/lib/api/workspaceApi";
import type { WorkspaceAnalytics, WorkspaceAnalyticsActivity } from "@/types/workspace";

interface PageAnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
}

function formatTime(iso: string): string {
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
  return d.toLocaleDateString();
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  view:    <Eye className="w-3 h-3 text-blue-400" />,
  edit:    <Edit3 className="w-3 h-3 text-green-400" />,
  comment: <MessageSquare className="w-3 h-3 text-violet-400" />,
  restore: <RefreshCw className="w-3 h-3 text-amber-400" />,
};

const ACTION_LABEL: Record<string, string> = {
  view:    "viewed",
  edit:    "edited",
  comment: "commented",
  restore: "restored a version",
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${color} space-y-1`}>
    <div className="flex items-center space-x-1.5 text-current opacity-70">{icon}</div>
    <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</span>
    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</span>
  </div>
);

export const PageAnalyticsPanel: React.FC<PageAnalyticsPanelProps> = ({
  isOpen,
  onClose,
  pageId,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "unauthorized">("idle");
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!pageId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await getPageAnalytics(pageId);
      setAnalytics(data);
      setStatus("idle");
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setStatus("unauthorized");
      } else {
        setStatus("error");
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to load analytics."
        );
      }
    }
  }, [pageId]);

  useEffect(() => {
    if (isOpen) fetch();
  }, [isOpen, fetch]);

  if (!mounted || !isOpen) return null;

  const isEmpty =
    status === "idle" &&
    analytics &&
    analytics.totalViews === 0 &&
    analytics.totalEdits === 0 &&
    analytics.totalComments === 0 &&
    analytics.recentActivity.length === 0;

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
        aria-label="Page Analytics"
        className="fixed right-0 top-0 h-full z-[9999] w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Updates & Analytics
            </h2>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={fetch}
              disabled={status === "loading"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
              aria-label="Refresh analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === "loading" ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close analytics panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Loading */}
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
              <p className="text-sm">Loading analytics…</p>
            </div>
          )}

          {/* Unauthorized */}
          {status === "unauthorized" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-400">
              <Lock className="w-10 h-10 opacity-40" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No access
              </p>
              <p className="text-xs text-center opacity-70">
                You don't have permission to view analytics for this page.
              </p>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex flex-col items-center py-12 space-y-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>
              <button
                type="button"
                onClick={fetch}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Empty */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-400">
              <BarChart2 className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No analytics yet</p>
              <p className="text-xs text-center opacity-70">
                Analytics will appear once the page has been viewed or edited.
              </p>
            </div>
          )}

          {/* Analytics content */}
          {status === "idle" && analytics && !isEmpty && (
            <>
              {/* Stats grid */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    icon={<Eye className="w-4 h-4" />}
                    label="Views"
                    value={analytics.totalViews}
                    color="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                  />
                  <StatCard
                    icon={<Edit3 className="w-4 h-4" />}
                    label="Edits"
                    value={analytics.totalEdits}
                    color="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400"
                  />
                  <StatCard
                    icon={<MessageSquare className="w-4 h-4" />}
                    label="Comments"
                    value={analytics.totalComments}
                    color="bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                  />
                  <StatCard
                    icon={<Users className="w-4 h-4" />}
                    label="Viewers"
                    value={analytics.uniqueViewers}
                    color="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                  />
                </div>
              </section>

              {/* Last activity metadata */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Last Activity
                </h3>
                {analytics.lastViewedAt && (
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center space-x-1.5 text-slate-400">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Last viewed</span>
                    </span>
                    <span className="font-medium">{formatTime(analytics.lastViewedAt)}</span>
                  </div>
                )}
                {analytics.lastEditedAt && (
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center space-x-1.5 text-slate-400">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Last edited</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {analytics.lastEditedBy && (
                        <span className="text-[10px] text-slate-400">
                          by {analytics.lastEditedBy}
                        </span>
                      )}
                      <span className="font-medium">{formatTime(analytics.lastEditedAt)}</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Recent activity feed */}
              {analytics.recentActivity.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Recent Activity
                  </h3>
                  <div className="space-y-2">
                    {analytics.recentActivity.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-400" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                            <span className="font-semibold">{item.userName}</span>
                            {" "}{ACTION_LABEL[item.action] ?? item.action}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            {ACTION_ICONS[item.action]}
                            <span>{formatTime(item.timestamp)}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};
