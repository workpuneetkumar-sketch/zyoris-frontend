"use client";

import { useState, useEffect, useCallback } from "react";
import { WorkspacePageNode } from "@/types/workspace";
import { getWorkspacePageTree } from "@/lib/api/workspaceApi";

export function useWorkspace() {
  const [pageTree, setPageTree] = useState<WorkspacePageNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPageTree = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tree = await getWorkspacePageTree();
      setPageTree(tree);
    } catch (err: any) {
      console.error("Failed to load workspace page tree:", err);
      const status = err?.response?.status;
      // Map backend/network errors to user-friendly messages
      let msg = "Unable to load pages. Please try again.";
      if (status === 401 || status === 403) {
        msg = "Session expired. Please refresh the page.";
      } else if (status === 404) {
        msg = "Workspace not found.";
      } else if (status && status >= 500) {
        msg = "Server is temporarily unavailable. Please try again shortly.";
      } else if (!err?.response) {
        // Network error / no response
        msg = "Network error. Check your connection and try again.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageTree();
  }, [fetchPageTree]);

  return {
    pageTree,
    isLoading,
    error,
    refetchTree: fetchPageTree,
  };
}
