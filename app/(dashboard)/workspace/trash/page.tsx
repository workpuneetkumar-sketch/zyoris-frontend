"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkspacePage } from "@/types/workspace";
import {
  getTrashPages,
  restoreWorkspacePage,
  permanentDeleteWorkspacePage,
} from "@/lib/api/workspaceApi";
import { toast } from "react-toastify";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Search,
  FileText,
  Clock,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

export default function WorkspaceTrashPage() {
  const router = useRouter();
  const [trashedPages, setTrashedPages] = useState<WorkspacePage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTrashPages();
      setTrashedPages(data || []);
    } catch (err: any) {
      console.error("Failed to load trash pages:", err);
      toast.error(err?.response?.data?.message || "Failed to load archived pages.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (page: WorkspacePage) => {
    setRestoringId(page.id);
    try {
      const restored = await restoreWorkspacePage(page.id);
      toast.success(`"${page.title || "Page"}" restored to workspace!`);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("zyoris:page-created", { detail: restored })
        );
      }
      await fetchTrash();
    } catch (err: any) {
      console.error("Failed to restore page:", err);
      toast.error(err?.response?.data?.message || "Failed to restore page.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (page: WorkspacePage) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${page.title || "this page"}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(page.id);
    try {
      await permanentDeleteWorkspacePage(page.id);
      toast.success("Page permanently deleted.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("zyoris:page-deleted", { detail: page.id })
        );
      }
      await fetchTrash();
    } catch (err: any) {
      console.error("Failed to permanently delete page:", err);
      toast.error(err?.response?.data?.message || "Failed to delete page permanently.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPages = trashedPages.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (p.title || "Untitled").toLowerCase().includes(q);
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Trash</h1>
            <p className="text-xs text-slate-500">
              Restore archived pages or delete them permanently.
            </p>
          </div>
        </div>

        <Link
          href="/workspace"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </Link>
      </div>

      {/* Search Bar */}
      {trashedPages.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages in trash..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading trash contents...</p>
        </div>
      ) : trashedPages.length === 0 ? (
        <div className="p-12 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
          <Trash2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Trash is empty
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Pages moved to trash will be held here and can be restored anytime.
          </p>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No archived pages match "{searchQuery}".
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
          {filteredPages.map((page) => {
            const isRestoring = restoringId === page.id;
            const isDeleting = deletingId === page.id;

            return (
              <div
                key={page.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition gap-4"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{page.icon || "📄"}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {page.title || "Untitled Page"}
                    </div>
                    {page.updatedAt && (
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Archived {new Date(page.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    type="button"
                    disabled={isRestoring || isDeleting}
                    onClick={() => handleRestore(page)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRestoring || isDeleting}
                    onClick={() => handlePermanentDelete(page)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Delete Permanently</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
