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
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load workspace page tree";
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
