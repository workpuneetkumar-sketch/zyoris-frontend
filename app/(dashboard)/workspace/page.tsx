"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CreatePageModal } from "@/components/workspace/CreatePageModal";
import {
  FileText,
  Plus,
  Sparkles,
  BookOpen,
  FolderKanban,
  CheckSquare,
  Clock,
  ArrowRight,
  Database,
  Search,
} from "lucide-react";

export default function WorkspaceHomePage() {
  const { pageTree, isLoading, refetchTree } = useWorkspace();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract recent pages flat list
  const getRecentPages = () => {
    let pages: { id: string; title: string; icon?: string | null; updatedAt?: string }[] = [];
    const traverse = (nodes: typeof pageTree) => {
      nodes.forEach((n) => {
        pages.push({ id: n.id, title: n.title, icon: n.icon, updatedAt: n.updatedAt });
        if (n.children && n.children.length > 0) traverse(n.children);
      });
    };
    traverse(pageTree);
    return pages.slice(0, 6);
  };

  const recentPages = getRecentPages();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      {/* Hero Welcome Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs font-semibold text-blue-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Notion-Style Collaborative Workspace</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Welcome to your Workspace
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Organize documents, pages, tasks, and project databases in one centralized place.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Page</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl w-fit">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pages & Docs</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Create nested pages and docs with block-based content rendering.
          </p>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit">
            <CheckSquare className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tasks & Projects</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage your personal action items and project tasks seamlessly.
          </p>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl w-fit">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Databases</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Structure customer knowledge, schemas, and asset inventories.
          </p>
        </div>
      </div>

      {/* Pages Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspace Pages</h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentPages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPages.map((page) => (
              <Link
                key={page.id}
                href={`/workspace/pages/${page.id}`}
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-md transition"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">
                    {page.icon || "📄"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition">
                      {page.title || "Untitled Page"}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                      <span>Click to view page</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No pages yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first page to start documenting notes, specs, and knowledge.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Page</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreatePageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetchTree}
        pageTree={pageTree}
      />
    </div>
  );
}
