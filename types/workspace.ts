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

export interface WorkspaceBlock {
  id: string;
  pageId?: string;
  type: string;
  content?: any;
  text?: string;
  properties?: Record<string, any>;
  position?: number;
  parentId?: string | null;
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
