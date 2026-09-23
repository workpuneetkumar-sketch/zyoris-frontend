export interface WorkspacePageNode {
  id: string;
  title: string;
  icon?: string | null;
  parentId?: string | null;
  isFolder?: boolean;
  isDatabase?: boolean;
  position?: number | null;
  children?: WorkspacePageNode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BlockFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  link?: string | null;
  isOpen?: boolean;
  subtext?: string;
}

export interface WorkspaceBlock {
  id: string;
  pageId?: string;
  type: string; // 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'bulleted_list_item' | 'numbered_list_item' | 'to_do' | 'quote' | 'divider' | 'code' | 'link'
  content?: any;
  text?: string;
  properties?: Record<string, any>;
  formatting?: BlockFormatting;
  position?: number;
  parentId?: string | null; // parentBlockId support
  parentBlockId?: string | null;
  children?: WorkspaceBlock[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspacePage {
  id: string;
  title: string;
  icon?: string | null;
  coverImage?: string | null;
  parentId?: string | null;
  isFolder?: boolean;
  isDatabase?: boolean;
  position?: number | null;
  blocks?: WorkspaceBlock[];
  content?: any;
  databaseId?: string | null;
  database?: WorkspaceDatabase | null;
  userPermissions?: {
    canEdit?: boolean;
    canShare?: boolean;
    canDelete?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkspacePageDto {
  title: string;
  icon?: string;
  coverImage?: string;
  parentId?: string | null;
  isFolder?: boolean;
  isDatabase?: boolean;
  content?: any;
}

export interface UpdateWorkspacePageDto {
  title?: string;
  icon?: string | null;
  coverImage?: string | null;
  parentId?: string | null;
  isFolder?: boolean;
  isDatabase?: boolean;
  content?: any;
}

export interface CreateBlockDto {
  type: string;
  text?: string;
  content?: any;
  properties?: Record<string, any>;
  position?: number;
  parentBlockId?: string | null;
}

export interface UpdateBlockDto {
  type?: string;
  text?: string;
  content?: any;
  properties?: Record<string, any>;
  position?: number;
  parentBlockId?: string | null;
}

export interface ReorderBlockItem {
  id: string;
  position: number; // Float position format
  parentBlockId?: string | null;
}

export type DatabasePropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'TEXT'
  | 'NUMBER'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'DATE'
  | 'CHECKBOX'
  | 'URL';

export type DatabaseViewType =
  | 'table'
  | 'board'
  | 'list'
  | 'gallery'
  | 'TABLE'
  | 'BOARD'
  | 'LIST'
  | 'GALLERY';

export interface WorkspaceDatabaseProperty {
  id: string;
  databaseId?: string;
  name: string;
  type: DatabasePropertyType;
  options?: string[] | Record<string, any>;
  createdAt?: string;
}

export interface WorkspaceDatabaseRow {
  id: string;
  databaseId?: string;
  data: Record<string, any>; // Row JSON payload
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceDatabaseView {
  id: string;
  databaseId?: string;
  name: string;
  type: DatabaseViewType;
  query?: Record<string, any>;
  createdAt?: string;
}

export interface WorkspaceDatabase {
  id: string;
  pageId: string;
  name?: string;
  title?: string;
  properties?: WorkspaceDatabaseProperty[];
  rows?: WorkspaceDatabaseRow[];
  views?: WorkspaceDatabaseView[];
  createdAt?: string;
  updatedAt?: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// FE2 — Extended types for Workspace Page features
// ─────────────────────────────────────────────────────────────────────────────

// ── FE2-01 · Page Settings ────────────────────────────────────────────────────

export type PageLayoutWidth = "default" | "full";

export interface WorkspacePageSettings {
  id: string;
  icon?: string | null;
  coverImage?: string | null;
  layoutWidth?: PageLayoutWidth;
  smallText?: boolean;
  fullWidth?: boolean;
  updatedAt?: string;
}

// ── FE2-03 · Comments ─────────────────────────────────────────────────────────

export interface WorkspaceComment {
  id: string;
  pageId: string;
  blockId?: string | null;       // Optional target block
  content: string;
  resolved: boolean;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCommentDto {
  content: string;
  blockId?: string | null;
}

// ── FE2-04 · Translation ──────────────────────────────────────────────────────

export interface TranslatePageResult {
  translatedBlocks: WorkspaceBlock[];
  targetLanguage: string;
  /** ISO language code of the detected source language, if provided by backend */
  sourceLanguage?: string;
}

// ── FE2-05 · Wiki ─────────────────────────────────────────────────────────────

// Extends WorkspacePage — add isWiki at the interface level
declare module "@/types/workspace" {
  interface WorkspacePage {
    isWiki?: boolean;
    isLocked?: boolean;
    layoutWidth?: PageLayoutWidth;
    smallText?: boolean;
  }
}

// ── FE2-06 · Analytics ───────────────────────────────────────────────────────

export interface WorkspaceAnalyticsActivity {
  userId: string;
  userName: string;
  action: "view" | "edit" | "comment" | "restore";
  timestamp: string;
}

export interface WorkspaceAnalytics {
  pageId: string;
  totalViews: number;
  totalEdits: number;
  totalComments: number;
  uniqueViewers: number;
  lastViewedAt?: string | null;
  lastEditedAt?: string | null;
  lastEditedBy?: string | null;
  recentActivity: WorkspaceAnalyticsActivity[];
}

// ── FE2-07 · Revisions ────────────────────────────────────────────────────────

export interface WorkspaceRevision {
  id: string;
  pageId: string;
  editorId: string;
  editorName: string;
  editorAvatarUrl?: string | null;
  snapshot: {
    title: string;
    icon?: string | null;
    blocks: WorkspaceBlock[];
  };
  createdAt: string;
}

// ── FE2-08 · Page Import ──────────────────────────────────────────────────────

export type SupportedImportFormat = "docx" | "md" | "txt" | "html";

export interface PageImportPreviewResult {
  blocks: WorkspaceBlock[];
  detectedFormat: SupportedImportFormat;
  /** Estimated block count; useful for large-file warnings */
  blockCount: number;
  warnings?: string[];
}
