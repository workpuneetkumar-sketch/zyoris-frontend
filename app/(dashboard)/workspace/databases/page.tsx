"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CreatePageModal } from "@/components/workspace/CreatePageModal";
import { Database, Plus, Search, ChevronRight, Clock, FileText } from "lucide-react";

export default function WorkspaceDatabasesPage() {
  const { pageTree, isLoading, refetchTree } = useWorkspace();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Extract all database pages
  const databasePages = useMemo(() => {
    const list: { id: string; title: string; icon?: string | null; updatedAt?: string }[] = [];
    const seen = new Set<string>();

    const traverse = (nodes: typeof pageTree) => {
      nodes.forEach((n) => {
        if (n.id && n.id !== "[id]" && !n.id.includes("[id]") && !seen.has(n.id)) {
          seen.add(n.id);
          if (n.isDatabase) {
            list.push({
              id: n.id,
              title: n.title || "Untitled Database",
              icon: n.icon || "📊",
              updatedAt: n.updatedAt,
            });
          }
        }
        if (n.children && n.children.length > 0) traverse(n.children);
      });
    };
    traverse(pageTree);
    return list;
  }, [pageTree]);

  const filteredDatabases = useMemo(() => {
    if (!searchQuery.trim()) return databasePages;
    const q = searchQuery.toLowerCase().trim();
    return databasePages.filter((d) => d.title.toLowerCase().includes(q));
  }, [databasePages, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Databases
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured tables, custom properties, and record views.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Database</span>
        </button>
      </div>

      {/* Search / Filter if multiple */}
      {databasePages.length > 2 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search databases..."
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : databasePages.length === 0 ? (
        <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-center space-y-3">
          <Database className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No databases yet
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create structured tables with columns, rows, tags, and filters to manage inventories, schemas, and CRM data.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Database</span>
          </button>
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No databases match &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDatabases.map((db) => (
            <Link
              key={db.id}
              href={`/workspace/pages/${db.id}`}
              className="group p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-purple-500/60 dark:hover:border-purple-500/60 hover:shadow-xs transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span className="text-2xl shrink-0">{db.icon || "📊"}</span>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition truncate">
                    {db.title}
                  </h4>
                  {db.updatedAt && (
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(db.updatedAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      <CreatePageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetchTree}
        initialType="database"
        pageTree={pageTree}
      />
    </div>
  );
}
