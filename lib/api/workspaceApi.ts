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
 * Map frontend block types to backend upper-case enum values.
 * Expected backend enums: 'TEXT' | 'HEADING' | 'BULLET_LIST' | 'NUMBERED_LIST' | 'TODO' | 'IMAGE' | 'CODE' | 'QUOTE' | 'DIVIDER' | 'TABLE' | 'EMBED' | 'DATABASE'
 */
export function mapFrontendTypeToBackend(type: string): string {
  if (!type) return "TEXT";
  const lower = type.toLowerCase();
  switch (lower) {
    case "paragraph":
    case "p":
    case "text":
      return "TEXT";
    case "h1":
    case "h2":
    case "h3":
    case "heading":
      return "HEADING";
    case "bulleted":
    case "bulleted_list":
    case "bullet":
      return "BULLET_LIST";
    case "numbered":
    case "numbered_list":
    case "number":
      return "NUMBERED_LIST";
    case "checklist":
    case "todo":
    case "to_do":
      return "TODO";
    case "quote":
      return "QUOTE";
    case "divider":
      return "DIVIDER";
    case "code":
      return "CODE";
    case "link":
    case "image":
    case "embed":
      return "TEXT";
    default:
      if (type === type.toUpperCase() && type.length > 1) return type;
      return "TEXT";
  }
}

/**
 * Map backend upper-case enum values to frontend block types.
 */
export function mapBackendTypeToFrontend(type: string, content?: any): string {
  const upper = (type || "").toUpperCase();
  switch (upper) {
    case "TEXT":
      return "paragraph";
    case "HEADING": {
      const level = content?.level || content?.properties?.level;
      if (level === 2) return "h2";
      if (level === 3) return "h3";
      return "h1";
    }
    case "BULLET_LIST":
      return "bulleted";
    case "NUMBERED_LIST":
      return "numbered";
    case "TODO":
      return "checklist";
    case "QUOTE":
      return "quote";
    case "DIVIDER":
      return "divider";
    case "CODE":
      return "code";
    default:
      return type?.toLowerCase() || "paragraph";
  }
}

/**
 * Normalize backend block payload into a clean WorkspaceBlock with .text and frontend .type.
 */
export function normalizeBackendBlock(block: any): WorkspaceBlock {
  if (!block) return block;

  const contentObj = block.content && typeof block.content === "object" ? block.content : {};
  const contentText = contentObj.text ?? (typeof block.content === "string" ? block.content : "");
  const text = block.text !== undefined && block.text !== null && block.text !== "" ? block.text : contentText;

  const frontendType = mapBackendTypeToFrontend(block.type, block.content);

  const properties = {
    ...(block.properties || {}),
    ...(contentObj.properties || {}),
    checked: contentObj.checked ?? block.properties?.checked ?? false,
    url: contentObj.url ?? block.properties?.url ?? null,
  };

  return {
    ...block,
    id: block.id,
    pageId: block.pageId,
    type: frontendType,
    text: text || "",
    content: contentObj,
    properties,
    position: block.position ?? 0,
    parentBlockId: block.parentBlockId ?? block.parentId ?? null,
  };
}

/**
 * Build a valid backend block request body with enum type and content object.
 */
export function buildBackendBlockPayload(
  payload: CreateBlockDto | UpdateBlockDto
): any {
  const backendType = mapFrontendTypeToBackend(payload.type || "paragraph");

  const contentObj: any = {
    ...(typeof payload.content === "object" && payload.content ? payload.content : {}),
    text: payload.text !== undefined ? payload.text : payload.content?.text || "",
  };

  if (payload.type === "h1") contentObj.level = 1;
  if (payload.type === "h2") contentObj.level = 2;
  if (payload.type === "h3") contentObj.level = 3;

  if (payload.properties) {
    contentObj.properties = payload.properties;
    if (payload.properties.checked !== undefined) contentObj.checked = payload.properties.checked;
    if (payload.properties.url !== undefined) contentObj.url = payload.properties.url;
  }

  const result: any = {
    type: backendType,
    content: contentObj,
  };

  if (payload.position !== undefined) result.position = payload.position;
  if (payload.parentBlockId !== undefined) result.parentBlockId = payload.parentBlockId;

  return result;
}

/**
 * Fetch specific page metadata + blocks by page ID.
 * GET /workspace/pages/:id
 */
export async function getWorkspacePage(id: string): Promise<WorkspacePage> {
  try {
    const res = await api.get(`/workspace/pages/${id}`);
    const data = res.data?.data ?? res.data;
    if (data && Array.isArray(data.blocks)) {
      data.blocks = data.blocks.map(normalizeBackendBlock);
    }
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
    const backendPayload = buildBackendBlockPayload(payload);
    const res = await api.post(`/workspace/pages/${pageId}/blocks`, backendPayload);
    const data = res.data?.data ?? res.data;
    return normalizeBackendBlock(data);
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
    const backendPayload = buildBackendBlockPayload(payload);
    const res = await api.patch(
      `/workspace/pages/${pageId}/blocks/${blockId}`,
      backendPayload
    );
    const data = res.data?.data ?? res.data;
    return normalizeBackendBlock(data);
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
 * Fetch database associated with a page.
 * GET /workspace/pages/:pageId/database
 */
export async function getWorkspacePageDatabase(
  pageId: string
): Promise<WorkspaceDatabase> {
  try {
    const res = await api.get(`/workspace/pages/${pageId}/database`);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error fetching database for page ${pageId}:`, error);
    throw error;
  }
}

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
 * Delete database row.
 * DELETE /workspace/databases/:databaseId/rows/:rowId
 */
export async function deleteDatabaseRow(
  databaseId: string,
  rowId: string
): Promise<void> {
  try {
    await api.delete(`/workspace/databases/${databaseId}/rows/${rowId}`);
  } catch (error) {
    console.error(
      `Error deleting row ${rowId} in database ${databaseId}:`,
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
