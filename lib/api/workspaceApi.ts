import api from "@/lib/api/api";
import {
  WorkspacePageNode,
  WorkspacePage,
  CreateWorkspacePageDto,
} from "@/types/workspace";

/**
 * Fetch the real page tree hierarchy for the workspace sidebar.
 * GET /workspace/pages/tree
 */
export async function getWorkspacePageTree(): Promise<WorkspacePageNode[]> {
  try {
    const res = await api.get("/workspace/pages/tree");
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    if (data && Array.isArray(data.pages)) {
      return data.pages;
    }
    if (data && Array.isArray(data.tree)) {
      return data.tree;
    }
    return [];
  } catch (error) {
    console.error("Error fetching workspace page tree:", error);
    throw error;
  }
}

/**
 * Fetch specific page metadata + blocks by page ID.
 * GET /workspace/pages/:id
 */
export async function getWorkspacePage(id: string): Promise<WorkspacePage> {
  try {
    const res = await api.get(`/workspace/pages/${id}`);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error fetching workspace page ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new workspace page.
 * POST /workspace/pages
 */
export async function createWorkspacePage(
  payload: CreateWorkspacePageDto
): Promise<WorkspacePage> {
  try {
    const res = await api.post("/workspace/pages", payload);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error("Error creating workspace page:", error);
    throw error;
  }
}
