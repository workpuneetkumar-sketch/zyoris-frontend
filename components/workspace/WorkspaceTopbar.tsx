"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CreateMenu } from "./CreateMenu";
import { Menu, Search, Bell, User as UserIcon, LayoutGrid } from "lucide-react";

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

  // Compute breadcrumbs title from path
  const getBreadcrumbs = () => {
    const currentPath = pathname || "";
    if (currentPath === "/workspace") return "Home";
    if (currentPath.startsWith("/workspace/pages/")) return "Page Details";
    if (currentPath.startsWith("/workspace/tasks")) return "My Tasks";
    if (currentPath.startsWith("/workspace/projects")) return "Projects";
    if (currentPath.startsWith("/workspace/databases")) return "Databases";
    if (currentPath.startsWith("/workspace/knowledge")) return "Knowledge Base";
    if (currentPath.startsWith("/workspace/files")) return "Files";
    if (currentPath.startsWith("/workspace/trash")) return "Trash";
    return "Workspace";
  };

  return (
    <header className="h-14 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Left Area: Mobile Menu Toggle + Breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400 h-full">
          <Link href="/workspace" className="hover:text-slate-900 dark:hover:text-white transition">
            Workspace
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-semibold">{getBreadcrumbs()}</span>
        </div>
      </div>

      {/* Right Area: Search, Create Menu & User Context */}
      <div className="flex items-center space-x-3">
        <CreateMenu onOpenCreatePageModal={onOpenCreatePageModal} />

        <Link
          href="/dashboard"
          title="Return to Main CRM Dashboard"
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <LayoutGrid className="w-4 h-4" />
        </Link>

        {/* User Context */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline-block">
              {user.name || "Employee"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
