"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import { BookOpen, Plus, ChevronRight, Clock, FileText, Sparkles } from "lucide-react";

export default function WorkspaceKnowledgePage() {
  const { pageTree, isLoading } = useWorkspace();

  // Extract all wiki / knowledge base pages
  const wikiPages = useMemo(() => {
    const list: { id: string; title: string; icon?: string | null; updatedAt?: string }[] = [];
    const seen = new Set<string>();

    const traverse = (nodes: typeof pageTree) => {
      nodes.forEach((n) => {
        if (n.id && n.id !== "[id]" && !n.id.includes("[id]") && !seen.has(n.id)) {
          seen.add(n.id);
          if (n.isWiki) {
            list.push({
              id: n.id,
              title: n.title || "Untitled Wiki",
              icon: n.icon || "📖",
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Knowledge Base
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified team wikis, SOPs, and product documentation.
            </p>
          </div>
        </div>

        <Link
          href="/workspace"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition self-start sm:self-auto"
        >
          <span>Browse All Pages</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : wikiPages.length === 0 ? (
        <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No wiki pages yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Any workspace page can be converted into a verified team wiki by opening the page options menu (&ldquo;...&rdquo;) and selecting &ldquo;Turn into Wiki&rdquo;.
          </p>
          <Link
            href="/workspace"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Go to Workspace Pages</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wikiPages.map((wiki) => (
            <Link
              key={wiki.id}
              href={`/workspace/pages/${wiki.id}`}
              className="group p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:shadow-xs transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span className="text-2xl shrink-0">{wiki.icon || "📖"}</span>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition truncate">
                      {wiki.title}
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                      Wiki
                    </span>
                  </div>
                  {wiki.updatedAt && (
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Updated {new Date(wiki.updatedAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
