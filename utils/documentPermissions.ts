// utils/documentPermissions.ts
//
// Client-side, role-based access control for the Documents module.
// There is no backend permission payload today (see context/AuthContext.tsx —
// the user carries a single `role` string), so this helper is the single
// source of truth the UI reads from.
//
// Policy: every authenticated role can view / preview / download / upload /
// link. Only ADMIN can delete. An unknown / missing role gets nothing.

export type DocRole =
  | "ADMIN"
  | "CEO"
  | "CFO"
  | "SALES_HEAD"
  | "OPERATIONS_HEAD";

const KNOWN_ROLES: DocRole[] = [
  "ADMIN",
  "CEO",
  "CFO",
  "SALES_HEAD",
  "OPERATIONS_HEAD",
];

export interface DocumentPermissions {
  canView: boolean;
  canPreview: boolean;
  canDownload: boolean;
  canUpload: boolean;
  canDelete: boolean;
  canLink: boolean;
}

const NO_ACCESS: DocumentPermissions = {
  canView: false,
  canPreview: false,
  canDownload: false,
  canUpload: false,
  canDelete: false,
  canLink: false,
};

/**
 * Resolve the document capabilities for a given role string.
 * Pass `user?.role` straight in — unknown/undefined roles are denied.
 */
export function getDocumentPermissions(
  role?: string | null
): DocumentPermissions {
  if (!role || !KNOWN_ROLES.includes(role as DocRole)) {
    return { ...NO_ACCESS };
  }

  return {
    canView: true,
    canPreview: true,
    canDownload: true,
    canUpload: true,
    canLink: true,
    canDelete: role === "ADMIN",
  };
}
