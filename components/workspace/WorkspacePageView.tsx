"use client";

import React, { useEffect, useState } from "react";
import { WorkspacePage, WorkspaceBlock } from "@/types/workspace";
import { getWorkspacePage } from "@/lib/api/workspaceApi";
import { BlockRenderer } from "./BlockRenderer";
import { FileText, AlertCircle, RefreshCw, Plus, Clock, User } from "lucide-react";

interface WorkspacePageViewProps {
  pageId: string;
}

export const WorkspacePageView: React.FC<WorkspacePageViewProps> = ({ pageId }) => {
  const [page, setPage] = useState<WorkspacePage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPageData = async () => {
    if (!pageId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWorkspacePage(pageId);
      setPage(data);
    } catch (err: any) {
      console.error(`Failed to load page ${pageId}:`, err);
      const msg =
        err?.response?.status === 404
          ? "Workspace page not found or has been deleted."
          : err?.response?.data?.message || err?.message || "Failed to load page content.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [pageId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-6 animate-pulse">
        <div className="h-10 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded"></div>
        <div className="space-y-4 pt-6">
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-4/6 bg-slate-100 dark:bg-slate-800 rounded"></div>
          <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Unable to Load Page</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{error}</p>
        <button
          onClick={fetchPageData}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg font-medium text-sm hover:bg-slate-800 transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500">
        No page data returned from backend.
      </div>
    );
  }

  // Sort blocks by position if position numeric field is available
  const sortedBlocks = Array.isArray(page.blocks)
    ? [...page.blocks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [];

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-8 md:py-12">
      {/* Cover Image if present */}
      {page.coverImage && (
        <div className="h-48 w-full rounded-xl overflow-hidden mb-8 shadow-sm">
          <img
            src={page.coverImage}
            alt={page.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header Info */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-3 text-3xl">
          {page.icon ? (
            <span>{page.icon}</span>
          ) : (
            <FileText className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {page.title || "Untitled Page"}
        </h1>

        {/* Page Meta details */}
        <div className="flex items-center space-x-4 mt-4 text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
          {page.updatedAt && (
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Updated {new Date(page.updatedAt).toLocaleDateString()}</span>
            </span>
          )}
        </div>
      </div>

      {/* Blocks Rendering */}
      <div className="space-y-3 min-h-[300px]">
        {sortedBlocks.length > 0 ? (
          sortedBlocks.map((block, index) => (
            <BlockRenderer key={block.id || index} block={block} />
          ))
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Start building this page
            </h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              This page is empty. Blocks added to this page via the workspace backend will be rendered here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
