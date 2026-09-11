"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspacePageNode } from "@/types/workspace";
import { PageTree } from "./PageTree";
import {
  Home,
  CheckSquare,
  FolderKanban,
  FileText,
  Database,
  BookOpen,
  Folder,
  Trash2,
  Plus,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

interface WorkspaceSidebarProps {
  pageTree: WorkspacePageNode[];
  isLoadingTree: boolean;
  treeError: string | null;
  onRefetchTree: () => void;
  onOpenCreatePageModal: (parentId?: string | null) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  pageTree,
  isLoadingTree,
  treeError,
  onRefetchTree,
  onOpenCreatePageModal,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { href: "/workspace", label: "Home", icon: Home },
    { href: "/workspace/tasks", label: "My Tasks", icon: CheckSquare },
    { href: "/workspace/projects", label: "Projects", icon: FolderKanban },
    { href: "/workspace/databases", label: "Databases", icon: Database },
    { href: "/workspace/knowledge", label: "Knowledge", icon: BookOpen },
    { href: "/workspace/files", label: "Files", icon: Folder },
    { href: "/workspace/trash", label: "Trash", icon: Trash2 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-50 dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
              Z
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                Zyoris Workspace
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Notion Docs & Tasks</span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Nav Links */}
        <div className="p-3 space-y-0.5 border-b border-slate-200/60 dark:border-slate-800">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = (pathname || "") === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-200/80 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Page Tree Hierarchy Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pages / Docs
            </span>
            <button
              onClick={() => onOpenCreatePageModal(null)}
              title="Create Root Page"
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingTree ? (
            <div className="px-3 py-4 space-y-2 animate-pulse">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded ml-3"></div>
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          ) : treeError ? (
            <div className="px-3 py-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-lg text-xs text-amber-700 dark:text-amber-400 space-y-2">
              <div className="flex items-start space-x-2">
                <span className="mt-0.5 flex-shrink-0 text-amber-500">⚠</span>
                <p className="leading-snug">{treeError}</p>
              </div>
              <button
                onClick={onRefetchTree}
                className="inline-flex items-center space-x-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 rounded text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <PageTree
              nodes={pageTree}
              onAddSubpage={(parentId) => onOpenCreatePageModal(parentId)}
              onRefreshTree={onRefetchTree}
            />
          )}
        </div>

        {/* Footer Create Action */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800">
          <button
            onClick={() => onOpenCreatePageModal(null)}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Add new page</span>
          </button>
        </div>
      </aside>
    </>
  );
};
