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
import {
  AssignableScopesResponse,
  AssignPageAsTaskPayload,
  AssignmentResult,
} from "@/types/workspaceAssignment";

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

/* Helper functions for local block persistence */
function getLocalBlocks(pageId: string): WorkspaceBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`zyoris_page_blocks_${pageId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalBlock(pageId: string, block: WorkspaceBlock) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalBlocks(pageId);
    const filtered = existing.filter((b) => b.id !== block.id);
    const updated = [...filtered, block].sort((a, b) => (a.position || 0) - (b.position || 0));
    localStorage.setItem(`zyoris_page_blocks_${pageId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save local block:", e);
  }
}

function removeLocalBlock(pageId: string, blockId: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalBlocks(pageId);
    const updated = existing.filter((b) => b.id !== blockId);
    localStorage.setItem(`zyoris_page_blocks_${pageId}`, JSON.stringify(updated));
  } catch (e) { }
}

/**
 * Fetch specific page metadata + blocks by page ID.
 * GET /workspace/pages/:id
 */
export async function getWorkspacePage(id: string): Promise<WorkspacePage> {
  // If ID is client-generated (e.g. page-1789...), check localStorage first
  if (id.startsWith("page-") || id.startsWith("local-")) {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("zyoris_workspace_local_pages");
        if (raw) {
          const list = JSON.parse(raw);
          const match = list.find((p: any) => p.id === id);
          if (match) {
            return {
              id: match.id,
              title: match.title || "Untitled Page",
              icon: match.icon || "📄",
              parentId: match.parentId || null,
              isFolder: !!match.isFolder,
              isDatabase: !!match.isDatabase,
              blocks: getLocalBlocks(id),
              createdAt: match.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    } catch (e) {
      console.warn("Local page read notice:", e);
    }
    return {
      id,
      title: "Untitled Page",
      icon: "📄",
      blocks: getLocalBlocks(id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const res = await api.get(`/workspace/pages/${id}`);
    const data = res.data?.data ?? res.data;
    if (data && Array.isArray(data.blocks)) {
      data.blocks = data.blocks.map(normalizeBackendBlock);
    }
    return data;
  } catch (error: any) {
    console.error(`Error fetching workspace page ${id}:`, error);
    // If backend returns 400 Bad Request (invalid CUID validation) or 404, fallback to local storage
    if (error?.response?.status === 400 || error?.response?.status === 404) {
      try {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("zyoris_workspace_local_pages");
          if (raw) {
            const list = JSON.parse(raw);
            const match = list.find((p: any) => p.id === id);
            if (match) {
              return {
                id: match.id,
                title: match.title || "Untitled Page",
                icon: match.icon || "📄",
                parentId: match.parentId || null,
                isFolder: !!match.isFolder,
                isDatabase: !!match.isDatabase,
                blocks: getLocalBlocks(id),
                createdAt: match.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }
          }
        }
      } catch (e) { }
    }
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
  if (id.startsWith("page-") || id.startsWith("local-")) {
    return {
      id,
      title: payload.title || "Untitled Page",
      icon: payload.icon || "📄",
      coverImage: payload.coverImage,
      parentId: payload.parentId || null,
      updatedAt: new Date().toISOString(),
    };
  }

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
  if (id.startsWith("local-") || id.startsWith("page-")) {
    return;
  }
  const res = await api.delete(`/workspace/pages/${id}`);
  return res.data;
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
  if (pageId.startsWith("page-") || pageId.startsWith("local-")) {
    const newBlock: WorkspaceBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      pageId,
      type: payload.type || "paragraph",
      text: payload.text || "",
      position: payload.position || 10,
      createdAt: new Date().toISOString(),
    };
    saveLocalBlock(pageId, newBlock);
    return newBlock;
  }

  try {
    const backendPayload = buildBackendBlockPayload(payload);
    const res = await api.post(`/workspace/pages/${pageId}/blocks`, backendPayload);
    const data = res.data?.data ?? res.data;
    return normalizeBackendBlock(data);
  } catch (error: any) {
    console.error(`Error creating block on page ${pageId}:`, error);
    const fallbackBlock: WorkspaceBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      pageId,
      type: payload.type || "paragraph",
      text: payload.text || "",
      position: payload.position || 10,
      createdAt: new Date().toISOString(),
    };
    saveLocalBlock(pageId, fallbackBlock);
    return fallbackBlock;
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
  if (pageId.startsWith("page-") || pageId.startsWith("local-") || blockId.startsWith("block-") || blockId.startsWith("temp-")) {
    const updatedBlock: WorkspaceBlock = {
      id: blockId,
      pageId,
      type: payload.type || "paragraph",
      text: payload.text || "",
      content: payload.content,
      properties: payload.properties,
      position: payload.position || 10,
      updatedAt: new Date().toISOString(),
    };
    saveLocalBlock(pageId, updatedBlock);
    return updatedBlock;
  }

  try {
    const backendPayload = buildBackendBlockPayload(payload);
    const res = await api.patch(
      `/workspace/pages/${pageId}/blocks/${blockId}`,
      backendPayload
    );
    const data = res.data?.data ?? res.data;
    return normalizeBackendBlock(data);
  } catch (error: any) {
    console.error(
      `Error updating block ${blockId} on page ${pageId}:`,
      error
    );
    const fallbackBlock: WorkspaceBlock = {
      id: blockId,
      pageId,
      type: payload.type || "paragraph",
      text: payload.text || "",
      content: payload.content,
      properties: payload.properties,
      position: payload.position || 10,
      updatedAt: new Date().toISOString(),
    };
    saveLocalBlock(pageId, fallbackBlock);
    return fallbackBlock;
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
  payload: { name?: string; title?: string }
): Promise<WorkspaceDatabase> {
  try {
    const body = {
      name: payload.name || payload.title || "Inline Database",
    };
    const res = await api.post(`/workspace/pages/${pageId}/database`, body);
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
 * BE-1 OpenAPI strictly expects uppercase enum:
 * 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTI_SELECT' | 'DATE' | 'CHECKBOX' | 'URL' | 'EMAIL' | 'PHONE' | 'RELATION' | 'FORMULA'
 */
export async function addDatabaseProperty(
  databaseId: string,
  payload: { name: string; type: string; options?: any }
): Promise<WorkspaceDatabaseProperty> {
  try {
    const backendPayload: { name: string; type: string; options?: any } = {
      name: payload.name.trim(),
      type: (payload.type || "TEXT").toUpperCase(),
    };
    if (payload.options !== undefined) {
      backendPayload.options = payload.options;
    }

    const res = await api.post(
      `/workspace/databases/${databaseId}/properties`,
      backendPayload
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
 * PATCH /workspace/databases/rows/:rowId
 */
export async function updateDatabaseRow(
  databaseId: string,
  rowId: string,
  dataPayload: Record<string, any>
): Promise<WorkspaceDatabaseRow> {
  try {
    try {
      const res = await api.patch(
        `/workspace/databases/rows/${rowId}`,
        { data: dataPayload }
      );
      return res.data?.data ?? res.data;
    } catch (err: any) {
      if (err?.response?.status === 404 && databaseId) {
        const fallbackRes = await api.patch(
          `/workspace/databases/${databaseId}/rows/${rowId}`,
          { data: dataPayload }
        );
        return fallbackRes.data?.data ?? fallbackRes.data;
      }
      throw err;
    }
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
 * DELETE /workspace/databases/rows/:rowId
 */
export async function deleteDatabaseRow(
  databaseId: string,
  rowId: string
): Promise<void> {
  try {
    try {
      await api.delete(`/workspace/databases/rows/${rowId}`);
    } catch (err: any) {
      if (err?.response?.status === 404 && databaseId) {
        await api.delete(`/workspace/databases/${databaseId}/rows/${rowId}`);
        return;
      }
      throw err;
    }
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

/**
 * Preview import to automatically infer schema types.
 * POST /workspace/databases/:databaseId/import/preview
 * Reads first incoming rows and returns inferred types (e.g. { Name: "TEXT", Budget: "NUMBER", Date: "DATE" })
 */
export async function previewDatabaseImport(
  databaseId: string,
  sampleRows: Record<string, any>[]
): Promise<Record<string, string>> {
  try {
    const res = await api.post(
      `/workspace/databases/${databaseId}/import/preview`,
      { data: sampleRows }
    );
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error previewing import for database ${databaseId}:`, error);
    throw error;
  }
}

/**
 * Commit bulk import of schema and rows to database.
 * POST /workspace/databases/:databaseId/import/commit
 * Bulk creates database properties and batch inserts rows.
 */
export async function commitDatabaseImport(
  databaseId: string,
  schema: Record<string, string>,
  rows: Record<string, any>[]
): Promise<{ success: boolean; rowsInserted: number }> {
  try {
    const res = await api.post(
      `/workspace/databases/${databaseId}/import/commit`,
      { schema, rows }
    );
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error) {
    console.error(`Error committing import for database ${databaseId}:`, error);
    throw error;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// FE2 — Workspace Page Feature APIs
// ─────────────────────────────────────────────────────────────────────────────

import type {
  WorkspacePageSettings,
  WorkspaceComment,
  CreateCommentDto,
  WorkspaceRevision,
  WorkspaceAnalytics,
  PageImportPreviewResult,
  TranslatePageResult,
} from "@/types/workspace";

// ── FE2-01 · Customize Page Settings ──────────────────────────────────────────

/**
 * Save page appearance settings (icon, cover, layout, smallText, fullWidth).
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: PATCH /workspace/pages/:id/settings
 * Request:  { icon?, coverImage?, layoutWidth?, smallText?, fullWidth? }
 * Response: { id, icon, coverImage, layoutWidth, smallText, fullWidth, updatedAt }
 */
export async function savePageSettings(
  pageId: string,
  settings: Partial<WorkspacePageSettings>
): Promise<WorkspacePageSettings> {
  try {
    const res = await api.patch(`/workspace/pages/${pageId}/settings`, settings);
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error saving page settings for ${pageId}:`, error);
    throw error;
  }
}

// ── FE2-02 · Use with AI ──────────────────────────────────────────────────────

/**
 * Fetch clean Markdown context for the Zii AI assistant.
 * GET /workspace/pages/:id/ai-context
 * Response: { markdown: string, title: string }
 */
export async function getPageAIContext(
  pageId: string
): Promise<{ markdown: string; title: string }> {
  try {
    const res = await api.get(`/workspace/pages/${pageId}/ai-context`);
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error fetching AI context for page ${pageId}:`, error);
    throw error;
  }
}

// ── FE2-03 · Comments / Suggest Edits ────────────────────────────────────────

/**
 * List all comments on a page.
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: GET /workspace/pages/:id/comments
 * Response: WorkspaceComment[]
 */
export async function getPageComments(pageId: string): Promise<WorkspaceComment[]> {
  try {
    const res = await api.get(`/workspace/pages/${pageId}/comments`);
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  } catch (error) {
    console.error(`Error fetching comments for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Create a comment on a page.
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: POST /workspace/pages/:id/comments
 * Request:  { content: string, blockId?: string }
 * Response: WorkspaceComment
 */
export async function createPageComment(
  pageId: string,
  dto: CreateCommentDto
): Promise<WorkspaceComment> {
  try {
    const res = await api.post(`/workspace/pages/${pageId}/comments`, dto);
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error creating comment on page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Resolve (or re-open) a comment.
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: PATCH /workspace/pages/:pageId/comments/:commentId
 * Request:  { resolved: boolean }
 * Response: WorkspaceComment
 */
export async function updatePageComment(
  pageId: string,
  commentId: string,
  patch: { resolved?: boolean; content?: string }
): Promise<WorkspaceComment> {
  try {
    const res = await api.patch(
      `/workspace/pages/${pageId}/comments/${commentId}`,
      patch
    );
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error updating comment ${commentId}:`, error);
    throw error;
  }
}

/**
 * Delete a comment.
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: DELETE /workspace/pages/:pageId/comments/:commentId
 */
export async function deletePageComment(
  pageId: string,
  commentId: string
): Promise<void> {
  try {
    await api.delete(`/workspace/pages/${pageId}/comments/${commentId}`);
  } catch (error) {
    console.error(`Error deleting comment ${commentId}:`, error);
    throw error;
  }
}

// ── FE2-04 · Translate ────────────────────────────────────────────────────────

/**
 * Translate page text while preserving layout, URLs, and code blocks.
 * POST /workspace/pages/:id/translate
 * Request:  { targetLanguage: string }
 * Response: { translatedBlocks: WorkspaceBlock[], targetLanguage: string }
 */
export async function translatePage(
  pageId: string,
  targetLanguage: string
): Promise<TranslatePageResult> {
  try {
    const res = await api.post(`/workspace/pages/${pageId}/translate`, {
      targetLanguage,
    });
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error translating page ${pageId}:`, error);
    throw error;
  }
}

// ── FE2-05 · Turn into Wiki ───────────────────────────────────────────────────

/**
 * Toggle a page into Wiki mode.
 * POST /workspace/pages/:id/wiki
 * Response: { id, isWiki: boolean, updatedAt: string }
 */
export async function togglePageWiki(
  pageId: string
): Promise<{ id: string; isWiki: boolean; updatedAt: string }> {
  try {
    const res = await api.post(`/workspace/pages/${pageId}/wiki`);
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error toggling wiki mode for page ${pageId}:`, error);
    throw error;
  }
}

// ── FE2-06 · Analytics ───────────────────────────────────────────────────────

/**
 * Fetch usage analytics and activity data for a page.
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: GET /workspace/pages/:id/analytics
 * Response: WorkspaceAnalytics
 */
export async function getPageAnalytics(pageId: string): Promise<WorkspaceAnalytics> {
  try {
    const res = await api.get(`/workspace/pages/${pageId}/analytics`);
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error fetching analytics for page ${pageId}:`, error);
    throw error;
  }
}

// ── FE2-07 · Version History ──────────────────────────────────────────────────

/**
 * List revisions for a page.
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: GET /workspace/pages/:id/revisions
 * Response: WorkspaceRevision[]
 */
export async function getPageRevisions(pageId: string): Promise<WorkspaceRevision[]> {
  try {
    const res = await api.get(`/workspace/pages/${pageId}/revisions`);
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : data?.items ?? [];
  } catch (error) {
    console.error(`Error fetching revisions for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Restore a specific revision.
 * TODO: Confirm exact endpoint with backend (Ayush).
 * Expected: POST /workspace/pages/:id/revisions/:revisionId/restore
 * Response: WorkspacePage (the restored state)
 */
export async function restorePageRevision(
  pageId: string,
  revisionId: string
): Promise<WorkspacePage> {
  try {
    const res = await api.post(
      `/workspace/pages/${pageId}/revisions/${revisionId}/restore`
    );
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error restoring revision ${revisionId} for page ${pageId}:`, error);
    throw error;
  }
}

// ── FE2-08 · Page Import ──────────────────────────────────────────────────────

/**
 * Preview an uploaded document as native blocks before committing.
 * POST /workspace/pages/:id/import/preview
 * Request:  FormData with { file: File }
 * Response: PageImportPreviewResult
 */
export async function previewPageImport(
  pageId: string,
  file: File
): Promise<PageImportPreviewResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post(
      `/workspace/pages/${pageId}/import/preview`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error previewing import for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Commit the previewed blocks into the current page.
 * POST /workspace/pages/:id/import/commit
 * Request:  { blocks: WorkspaceBlock[], mode: 'append' | 'replace' }
 * Response: { success: boolean, blocksInserted: number }
 */
export async function commitPageImport(
  pageId: string,
  blocks: WorkspaceBlock[],
  mode: "append" | "replace" = "append"
): Promise<{ success: boolean; blocksInserted: number }> {
  try {
    const res = await api.post(`/workspace/pages/${pageId}/import/commit`, {
      blocks,
      mode,
    });
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error committing import for page ${pageId}:`, error);
    throw error;
  }
}

/**
 * Export page content as Markdown (for copy / download actions).
 * GET /workspace/pages/:id/content
 * Response: { markdown: string, title: string }
 */
export async function getPageContent(
  pageId: string
): Promise<{ markdown: string; title: string }> {
  try {
    const res = await api.get(`/workspace/pages/${pageId}/content`);
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error fetching page content for ${pageId}:`, error);
    throw error;
  }
}

/**
 * Fetch assignable departments and employees for the current organization.
 * GET /workspace/assignable-scopes
 */
export async function getAssignableScopes(): Promise<AssignableScopesResponse> {
  try {
    const res = await api.get("/workspace/assignable-scopes");
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error("Error fetching assignable scopes:", error);
    throw error;
  }
}

/**
 * Assign a workspace page as a task.
 * POST /workspace/pages/:id/assign-as-task
 */
export async function assignPageAsTask(
  pageId: string,
  payload: AssignPageAsTaskPayload
): Promise<AssignmentResult> {
  try {
    const res = await api.post(`/workspace/pages/${pageId}/assign-as-task`, payload);
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error(`Error assigning page ${pageId} as task:`, error);
    throw error;
  }
}
