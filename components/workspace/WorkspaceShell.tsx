"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceTopbar } from "./WorkspaceTopbar";
import { CreatePageModal } from "./CreatePageModal";

interface WorkspaceShellProps {
  children: React.ReactNode;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ children }) => {
  const { pageTree, isLoading, error, refetchTree } = useWorkspace();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createPageType, setCreatePageType] = useState<"document" | "folder" | "database">("document");

  // Load user sidebar preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("zyoris-workspace-sidebar-collapsed");
      if (stored === "true") {
        setIsSidebarCollapsed(true);
      }
    } catch {
      // ignore in non-browser or storage restricted environments
    }
  }, []);

  const handleToggleDesktopSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("zyoris-workspace-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleOpenCreatePageModal = (
    parentId: string | null = null,
    type: "document" | "folder" | "database" = "document"
  ) => {
    setCreateParentId(parentId);
    setCreatePageType(type);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Topbar & Sub-Navigation Header */}
      <WorkspaceTopbar
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onToggleDesktopSidebar={handleToggleDesktopSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenCreatePageModal={handleOpenCreatePageModal}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex w-full items-start gap-4">
        {/* Desktop Collapsible Workspace Sidebar */}
        {!isSidebarCollapsed && (
          <div className="hidden md:block shrink-0">
            <WorkspaceSidebar
              pageTree={pageTree}
              isLoadingTree={isLoading}
              treeError={error}
              onRefetchTree={refetchTree}
              onOpenCreatePageModal={handleOpenCreatePageModal}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        )}

        {/* Mobile Slide-Out Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
              <WorkspaceSidebar
                pageTree={pageTree}
                isLoadingTree={isLoading}
                treeError={error}
                onRefetchTree={refetchTree}
                onOpenCreatePageModal={(parentId, type) => {
                  setIsMobileSidebarOpen(false);
                  handleOpenCreatePageModal(parentId, type);
                }}
                isMobileView
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Page Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Universal Page Creation Dialog */}
      <CreatePageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetchTree}
        initialParentId={createParentId}
        initialType={createPageType}
        pageTree={pageTree}
      />
    </div>
  );
};
