"use client";

import React, { useState } from "react";
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const handleOpenCreatePageModal = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="h-full w-full flex bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Persistent Left Sidebar */}
      <WorkspaceSidebar
        pageTree={pageTree}
        isLoadingTree={isLoading}
        treeError={error}
        onRefetchTree={refetchTree}
        onOpenCreatePageModal={handleOpenCreatePageModal}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <WorkspaceTopbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenCreatePageModal={handleOpenCreatePageModal}
        />

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-950">
          {children}
        </main>
      </div>

      {/* Universal Page Creation Dialog */}
      <CreatePageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetchTree}
        initialParentId={createParentId}
        pageTree={pageTree}
      />
    </div>
  );
};
