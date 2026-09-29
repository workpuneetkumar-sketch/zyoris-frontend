"use client";

import { useState, useEffect, useCallback } from "react";
import { WorkspacePageNode, WorkspacePage } from "@/types/workspace";
import { getWorkspacePageTree } from "@/lib/api/workspaceApi";

const LOCAL_PAGES_KEY = "zyoris_workspace_local_pages";

export function getStoredLocalPages(): WorkspacePageNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_PAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredLocalPage(page: Partial<WorkspacePage> & { id: string; title: string }) {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredLocalPages();
    const isNew = !existing.some((p) => p.id === page.id);
    const existingNode = existing.find((p) => p.id === page.id);
    const filtered = existing.filter((p) => p.id !== page.id);
    
    const newNode: WorkspacePageNode = {
      id: page.id,
      title: page.title || "Untitled",
      icon: page.icon || existingNode?.icon || "📄",
      parentId: page.parentId !== undefined ? page.parentId : (existingNode?.parentId || null),
      isFolder: page.isFolder !== undefined ? page.isFolder : (existingNode?.isFolder || false),
      isDatabase: page.isDatabase !== undefined ? page.isDatabase : (existingNode?.isDatabase || false),
      children: existingNode?.children || [],
      createdAt: page.createdAt || existingNode?.createdAt || new Date().toISOString(),
      updatedAt: page.updatedAt || new Date().toISOString(),
    };
    const updated = isNew ? [newNode, ...filtered] : existing.map((p) => (p.id === page.id ? newNode : p));
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(updated));

    const eventName = isNew ? "zyoris:page-created" : "zyoris:page-updated";
    window.dispatchEvent(new CustomEvent(eventName, { detail: newNode }));
  } catch (e) {
    console.error("Failed to save local page:", e);
  }
}

export function removeStoredLocalPage(pageId: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredLocalPages();
    const updated = existing.filter((p) => p.id !== pageId);
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("zyoris:page-deleted", { detail: pageId }));
  } catch (e) {
    console.error("Failed to remove local page:", e);
  }
}

// Build nested tree structure from flat list of nodes
function buildTreeFromFlatNodes(flatNodes: WorkspacePageNode[]): WorkspacePageNode[] {
  const nodeMap = new Map<string, WorkspacePageNode>();
  const roots: WorkspacePageNode[] = [];

  flatNodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: node.children ? [...node.children] : [] });
  });

  flatNodes.forEach((node) => {
    const current = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      if (!parent.children) parent.children = [];
      if (!parent.children.some((c) => c.id === current.id)) {
        parent.children.push(current);
      }
    } else {
      roots.push(current);
    }
  });

  // Sort roots by most recent first so new and duplicated pages appear at the top
  roots.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return roots;
}

export function useWorkspace() {
  const [pageTree, setPageTree] = useState<WorkspacePageNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPageTree = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const remoteTree = await getWorkspacePageTree();
      const localPages = getStoredLocalPages();

      // Merge remote tree & local pages: retain latest metadata & timestamps
      const nodeMap = new Map<string, WorkspacePageNode>();

      localPages.forEach((lp) => {
        if (lp.id) {
          nodeMap.set(lp.id, {
            ...lp,
            createdAt: lp.createdAt || new Date().toISOString(),
            updatedAt: lp.updatedAt || new Date().toISOString(),
          });
        }
      });

      const addRecursively = (nodes: WorkspacePageNode[]) => {
        nodes.forEach((n) => {
          if (n.id) {
            const existing = nodeMap.get(n.id);
            nodeMap.set(n.id, {
              ...existing,
              ...n,
              icon: n.icon || existing?.icon || "📄",
              createdAt: n.createdAt || existing?.createdAt || new Date().toISOString(),
              updatedAt: n.updatedAt || existing?.updatedAt || n.createdAt || new Date().toISOString(),
            });
            if (n.children && n.children.length > 0) {
              addRecursively(n.children);
            }
          }
        });
      };

      addRecursively(remoteTree);
      const allFlatNodes = Array.from(nodeMap.values());
      const mergedTree = buildTreeFromFlatNodes(allFlatNodes);
      setPageTree(mergedTree);
    } catch (err: any) {
      console.error("Failed to load workspace page tree:", err);
      const localPages = getStoredLocalPages();
      if (localPages.length > 0) {
        setPageTree(buildTreeFromFlatNodes(localPages));
      } else {
        const status = err?.response?.status;
        let msg = "Unable to load pages. Please try again.";
        if (status === 401 || status === 403) {
          msg = "Session expired. Please refresh the page.";
        } else if (status === 404) {
          msg = "Workspace not found.";
        } else if (status && status >= 500) {
          msg = "Server is temporarily unavailable. Please try again shortly.";
        } else if (!err?.response) {
          msg = "Network error. Check your connection and try again.";
        } else if (err?.response?.data?.message) {
          msg = err.response.data.message;
        }
        setError(msg);
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchPageTree(true);

    const handlePageEvent = () => {
      fetchPageTree(false);
    };

    window.addEventListener("zyoris:page-created", handlePageEvent);
    window.addEventListener("zyoris:page-updated", handlePageEvent);
    window.addEventListener("zyoris:page-deleted", handlePageEvent);
    return () => {
      window.removeEventListener("zyoris:page-created", handlePageEvent);
      window.removeEventListener("zyoris:page-updated", handlePageEvent);
      window.removeEventListener("zyoris:page-deleted", handlePageEvent);
    };
  }, [fetchPageTree]);

  return {
    pageTree,
    isLoading,
    error,
    refetchTree: () => fetchPageTree(false),
  };
}
