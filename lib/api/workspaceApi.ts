import api from "@/lib/api/api";
import {
  WorkspacePageNode,
  WorkspacePage,
  WorkspaceBlock,
  CreateWorkspacePageDto,
  UpdateWorkspacePageDto,
  CreateBlockDto,
  UpdateBlockDto,
  ReorderBlockItem,
  WorkspaceDatabase,
  WorkspaceDatabaseProperty,
  WorkspaceDatabaseRow,
  WorkspaceDatabaseView,
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
  } catch (error: any) {
    console.error("Error fetching workspace page tree:", error);
    // For 5xx server errors, surface a typed error so callers can distinguish
    // backend unavailability from auth/network issues
    if (error?.response?.status && error.response.status >= 500) {
      const serverError = new Error("Server error") as any;
      serverError.response = error.response;
      throw serverError;
    }
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

/**
 * Update a workspace page title, icon, cover, or parentId.
 * PATCH /workspace/pages/:id
 */
export async function updateWorkspacePage(
  id: string,
  payload: UpdateWorkspacePageDto
): Promise<WorkspacePage> {
  try {
    const res = await api.patch(`/workspace/pages/${id}`, payload);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error updating workspace page ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a workspace page.
 * DELETE /workspace/pages/:id
 */
export async function deleteWorkspacePage(id: string): Promise<void> {
  try {
    await api.delete(`/workspace/pages/${id}`);
  } catch (error) {
    console.error(`Error deleting workspace page ${id}:`, error);
    throw error;
  }
}

/* ============================================================================
 * BLOCK CRUD APIs
 * ============================================================================ */

/**
 * Create a new block inside a page.
 * POST /workspace/pages/:pageId/blocks
 */
export async function createWorkspaceBlock(
  pageId: string,
  payload: CreateBlockDto
): Promise<WorkspaceBlock> {
  try {
    const res = await api.post(`/workspace/pages/${pageId}/blocks`, payload);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error creating block on page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Update an existing block. Used for debounced autosave.
 * PATCH /workspace/pages/:pageId/blocks/:blockId
 */
export async function updateWorkspaceBlock(
  pageId: string,
  blockId: string,
  payload: UpdateBlockDto
): Promise<WorkspaceBlock> {
  try {
    const res = await api.patch(
      `/workspace/pages/${pageId}/blocks/${blockId}`,
      payload
    );
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(
      `Error updating block ${blockId} on page ${pageId}:`,
      error
    );
    throw error;
  }
}

/**
 * Delete a block from a page.
 * DELETE /workspace/pages/:pageId/blocks/:blockId
 */
export async function deleteWorkspaceBlock(
  pageId: string,
  blockId: string
): Promise<void> {
  try {
    await api.delete(`/workspace/pages/${pageId}/blocks/${blockId}`);
  } catch (error) {
    console.error(
      `Error deleting block ${blockId} on page ${pageId}:`,
      error
    );
    throw error;
  }
}

/**
 * Persist block reordering / drag & drop.
 * PATCH /workspace/pages/:pageId/blocks/reorder
 * Payload accepts array of block IDs and Float positions format.
 */
export async function reorderWorkspaceBlocks(
  pageId: string,
  blocks: ReorderBlockItem[]
): Promise<void> {
  try {
    await api.patch(`/workspace/pages/${pageId}/blocks/reorder`, { blocks });
  } catch (error) {
    console.error(`Error reordering blocks on page ${pageId}:`, error);
    throw error;
  }
}

/* ============================================================================
 * DATABASE APIs
 * ============================================================================ */

/**
 * Create a database associated with a page.
 * POST /workspace/pages/:pageId/database
 */
export async function createWorkspaceDatabase(
  pageId: string,
  payload: { title?: string }
): Promise<WorkspaceDatabase> {
  try {
    const res = await api.post(`/workspace/pages/${pageId}/database`, payload);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error creating database for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Add dynamic database column/property.
 * POST /workspace/databases/:databaseId/properties
 */
export async function addDatabaseProperty(
  databaseId: string,
  payload: { name: string; type: string; options?: string[] }
): Promise<WorkspaceDatabaseProperty> {
  try {
    const res = await api.post(
      `/workspace/databases/${databaseId}/properties`,
      payload
    );
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error adding property to database ${databaseId}:`, error);
    throw error;
  }
}

/**
 * Create database row.
 * POST /workspace/databases/:databaseId/rows
 */
export async function createDatabaseRow(
  databaseId: string,
  dataPayload: Record<string, any>
): Promise<WorkspaceDatabaseRow> {
  try {
    const res = await api.post(`/workspace/databases/${databaseId}/rows`, {
      data: dataPayload,
    });
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error creating row in database ${databaseId}:`, error);
    throw error;
  }
}

/**
 * Update database row.
 * PATCH /workspace/databases/:databaseId/rows/:rowId
 */
export async function updateDatabaseRow(
  databaseId: string,
  rowId: string,
  dataPayload: Record<string, any>
): Promise<WorkspaceDatabaseRow> {
  try {
    const res = await api.patch(
      `/workspace/databases/${databaseId}/rows/${rowId}`,
      { data: dataPayload }
    );
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(
      `Error updating row ${rowId} in database ${databaseId}:`,
      error
    );
    throw error;
  }
}

/**
 * Create database view.
 * POST /workspace/databases/:databaseId/views
 */
export async function createDatabaseView(
  databaseId: string,
  payload: { name: string; type: string; query?: Record<string, any> }
): Promise<WorkspaceDatabaseView> {
  try {
    const res = await api.post(
      `/workspace/databases/${databaseId}/views`,
      payload
    );
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error creating view in database ${databaseId}:`, error);
    throw error;
  }
}
