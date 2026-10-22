"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspacePageNode } from "@/types/workspace";
import { PageTree } from "./PageTree";
import {
  Home,
  CheckSquare,
  KanbanSquare,
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
  onOpenCreatePageModal: (parentId?: string | null, type?: "document" | "folder" | "database") => void;
  isMobileOpen?: boolean;
  isMobileView?: boolean;
  onCloseMobile?: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  pageTree,
  isLoadingTree,
  treeError,
  onRefetchTree,
  onOpenCreatePageModal,
  isMobileOpen = false,
  isMobileView = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const NAV_ITEMS_PRIMARY = [
    { href: "/workspace", label: "Home", icon: Home, exact: true },
    { href: "/workspace/tasks?tab=my", label: "My Tasks", icon: CheckSquare, key: "my-tasks" },
    { href: "/workspace/tasks?tab=all", label: "Team Tasks / Board", icon: KanbanSquare, key: "team-tasks" },
    { href: "/workspace/projects", label: "Projects", icon: FolderKanban },
  ];

  const NAV_ITEMS_SECONDARY = [
    { href: "/workspace/databases", label: "Databases", icon: Database },
    { href: "/workspace/knowledge", label: "Knowledge", icon: BookOpen },
    { href: "/workspace/files", label: "Files", icon: Folder },
    { href: "/workspace/trash", label: "Trash", icon: Trash2 },
  ];

  // Calculate active state supporting tab query parameters
  const isItemActive = (href: string, key?: string) => {
    if (href === "/workspace") {
      return pathname === "/workspace";
    }
    if (key === "my-tasks") {
      if (pathname !== "/workspace/tasks") return false;
      if (typeof window !== "undefined") {
        const tab = new URLSearchParams(window.location.search).get("tab");
        return tab !== "all";
      }
      return true;
    }
    if (key === "team-tasks") {
      if (pathname !== "/workspace/tasks") return false;
      if (typeof window !== "undefined") {
        const tab = new URLSearchParams(window.location.search).get("tab");
        return tab === "all";
      }
      return false;
    }
    return pathname?.startsWith(href);
  };

  // Calculate total pages in tree
  const totalPagesCount = React.useMemo(() => {
    let count = 0;
    const countNodes = (nodes: WorkspacePageNode[]) => {
      nodes.forEach((n) => {
        if (n.id && n.id !== "[id]" && !n.id.includes("[id]")) {
          count++;
        }
        if (n.children && n.children.length > 0) countNodes(n.children);
      });
    };
    countNodes(pageTree || []);
    return count;
  }, [pageTree]);

  const containerClasses = isMobileView
    ? "h-full w-full bg-white dark:bg-slate-900 flex flex-col overflow-hidden"
    : "w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col max-h-[calc(100vh-7.5rem)] sticky top-3 overflow-hidden select-none";

  return (
    <aside className={containerClasses}>
      {/* Mobile Header (close button & title) */}
      {isMobileView && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white">Workspace</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Primary Workspace Navigation Links */}
      <div className="p-2 space-y-0.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        {NAV_ITEMS_PRIMARY.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.href, item.key);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Page Tree Hierarchy Section */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pages
            </span>
            {totalPagesCount > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {totalPagesCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-0.5">
            <button
              onClick={onRefetchTree}
              title="Refresh pages"
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => onOpenCreatePageModal(null, "document")}
              title="New root page"
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isLoadingTree ? (
          <div className="px-3 py-4 space-y-2 animate-pulse">
            <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded ml-3"></div>
            <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        ) : treeError ? (
          <div className="px-3 py-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-xl text-xs text-amber-700 dark:text-amber-400 space-y-2">
            <div className="flex items-start space-x-2">
              <span className="mt-0.5 flex-shrink-0 text-amber-500">⚠</span>
              <p className="leading-snug">{treeError}</p>
            </div>
            <button
              onClick={onRefetchTree}
              className="inline-flex items-center space-x-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 rounded-lg text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <PageTree
            nodes={pageTree}
            onAddSubpage={(parentId) => onOpenCreatePageModal(parentId, "document")}
            onRefreshTree={onRefetchTree}
          />
        )}
      </div>

      {/* Secondary Workspace Tools: Databases, Knowledge, Files, Trash */}
      <div className="p-2 space-y-0.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
        {NAV_ITEMS_SECONDARY.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Quick Action */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
        <button
          onClick={() => onOpenCreatePageModal(null, "document")}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Add new page</span>
        </button>
      </div>
    </aside>
  );
};
