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
    <div className="w-full space-y-4">
      {/* Topbar & Sub-Navigation Header */}
      <WorkspaceTopbar
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onOpenCreatePageModal={handleOpenCreatePageModal}
      />

      {/* Main Page Content */}
      <div>
        {children}
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
