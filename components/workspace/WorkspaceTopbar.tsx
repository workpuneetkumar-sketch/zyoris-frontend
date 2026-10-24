"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspacePageNode } from "@/types/workspace";
import { CreateMenu } from "./CreateMenu";
import { GlobalSearchModal } from "./GlobalSearchModal";
import {
  Menu,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react";

interface WorkspaceTopbarProps {
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenCreatePageModal: (parentId?: string | null, type?: "document" | "folder" | "database") => void;
}

export const WorkspaceTopbar: React.FC<WorkspaceTopbarProps> = ({
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isSidebarCollapsed = false,
  onOpenCreatePageModal,
}) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const { pageTree } = useWorkspace();
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Find active page breadcrumbs path from pageTree
  const findBreadcrumbPath = (): { id?: string; title: string; href: string }[] => {
    const currentPath = pathname || "";
    if (currentPath === "/workspace") return [{ title: "Home", href: "/workspace" }];
    if (currentPath.startsWith("/workspace/tasks")) {
      const isAll = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "all";
      return [{ title: isAll ? "Team Tasks / Board" : "My Tasks", href: isAll ? "/workspace/tasks?tab=all" : "/workspace/tasks?tab=my" }];
    }
    if (currentPath.startsWith("/workspace/projects")) return [{ title: "Projects", href: "/workspace/projects" }];
    if (currentPath.startsWith("/workspace/databases")) return [{ title: "Databases", href: "/workspace/databases" }];
    if (currentPath.startsWith("/workspace/knowledge")) return [{ title: "Knowledge", href: "/workspace/knowledge" }];
    if (currentPath.startsWith("/workspace/files")) return [{ title: "Files", href: "/workspace/files" }];
    if (currentPath.startsWith("/workspace/trash")) return [{ title: "Trash", href: "/workspace/trash" }];

    if (currentPath.startsWith("/workspace/pages/")) {
      const targetId = currentPath.split("/")[3];
      if (targetId && targetId !== "[id]") {
        const pathNodes: WorkspacePageNode[] = [];
        const findNodePath = (nodes: WorkspacePageNode[], currentAncestors: WorkspacePageNode[]): boolean => {
          for (const node of nodes) {
            const pathWithSelf = [...currentAncestors, node];
            if (node.id === targetId) {
              pathNodes.push(...pathWithSelf);
              return true;
            }
            if (node.children && node.children.length > 0) {
              if (findNodePath(node.children, pathWithSelf)) return true;
            }
          }
          return false;
        };

        if (findNodePath(pageTree, [])) {
          return pathNodes.map((n) => {
            const safeId = n.id && n.id !== "[id]" && !n.id.includes("[id]") ? n.id : "";
            return {
              id: n.id,
              title: n.title || "Untitled Page",
              href: safeId ? `/workspace/pages/${safeId}` : "/workspace",
            };
          });
        }
      }
      return [{ title: "Page Details", href: currentPath }];
    }

    return [{ title: "Workspace", href: "/workspace" }];
  };

  const breadcrumbs = findBreadcrumbPath();

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Header Row */}
      <header className="h-12 w-full px-3 md:px-5 flex items-center justify-between z-30 shrink-0">
        {/* Left Area: Sidebar Toggles + Breadcrumbs */}
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            title="Open workspace menu"
            aria-label="Open workspace menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Desktop Sidebar Toggle Button */}
          {onToggleDesktopSidebar && (
            <button
              onClick={onToggleDesktopSidebar}
              className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}

          <nav className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 min-w-0 overflow-hidden">
            <Link
              href="/workspace"
              className="hover:text-slate-900 dark:hover:text-white transition shrink-0 font-medium"
            >
              Workspace
            </Link>

            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href + idx}>
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                <Link
                  href={crumb.href}
                  className={`truncate max-w-[130px] md:max-w-[200px] transition ${
                    idx === breadcrumbs.length - 1
                      ? "text-slate-900 dark:text-white font-semibold"
                      : "hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {crumb.title}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right Area: Search & Create Menu */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-medium transition cursor-pointer"
            title="Search workspace (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          <CreateMenu onOpenCreatePageModal={onOpenCreatePageModal} />
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
