"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspacePageNode } from "@/types/workspace";
import { CreateMenu } from "./CreateMenu";
import { Menu, LayoutGrid, User as UserIcon, ChevronRight, FileText } from "lucide-react";

interface WorkspaceTopbarProps {
  onToggleMobileSidebar: () => void;
  onOpenCreatePageModal: (parentId?: string | null) => void;
}

export const WorkspaceTopbar: React.FC<WorkspaceTopbarProps> = ({
  onToggleMobileSidebar,
  onOpenCreatePageModal,
}) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const { pageTree } = useWorkspace();

  // Find active page breadcrumbs path from pageTree
  const findBreadcrumbPath = (): { id?: string; title: string; href: string }[] => {
    const currentPath = pathname || "";
    if (currentPath === "/workspace") return [{ title: "Home", href: "/workspace" }];
    if (currentPath.startsWith("/workspace/tasks")) return [{ title: "My Tasks", href: "/workspace/tasks" }];
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
    <header className="h-14 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Left Area: Mobile Menu Toggle + Breadcrumbs */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 min-w-0 overflow-hidden">
          <Link
            href="/workspace"
            className="hover:text-slate-900 dark:hover:text-white transition flex-shrink-0"
          >
            Workspace
          </Link>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href + idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
              <Link
                href={crumb.href}
                className={`truncate max-w-[140px] md:max-w-[200px] transition ${
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

      {/* Right Area: Create Menu & User Context */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        <CreateMenu onOpenCreatePageModal={onOpenCreatePageModal} />

        <Link
          href="/dashboard"
          title="Return to Main Dashboard"
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <LayoutGrid className="w-4 h-4" />
        </Link>

        {/* User Profile Context */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline-block">
              {user.name || "User"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
