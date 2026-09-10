export interface WorkspacePageNode {
  id: string;
  title: string;
  icon?: string | null;
  parentId?: string | null;
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
  isDatabase?: boolean;
  content?: any;
}

export interface UpdateWorkspacePageDto {
  title?: string;
  icon?: string | null;
  coverImage?: string | null;
  parentId?: string | null;
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

export interface WorkspaceDatabaseProperty {
  id: string;
  databaseId?: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url';
  options?: string[];
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
  type: 'table' | 'board' | 'list' | 'gallery';
  query?: Record<string, any>;
  createdAt?: string;
}

export interface WorkspaceDatabase {
  id: string;
  pageId: string;
  title?: string;
  properties?: WorkspaceDatabaseProperty[];
  rows?: WorkspaceDatabaseRow[];
  views?: WorkspaceDatabaseView[];
  createdAt?: string;
  updatedAt?: string;
}
