"use client";

import React, { ReactNode } from "react";
import { useRBAC } from "@/hooks/useRBAC";

export interface PermissionGuardProps {
  /** Single permission required to render or enable the children */
  permission?: string;
  /** Multiple permissions */
  permissions?: string[];
  /** When true, requires ALL permissions in the permissions array. Alias for mode="all". */
  requireAll?: boolean;
  /** Whether to require ALL or ANY of the permissions in the permissions array. Defaults to "any" unless requireAll is true. */
  mode?: "all" | "any";
  /** "hide" completely unmounts children (default). "disable" renders children wrapped with disabled styles and tooltip. */
  action?: "hide" | "disable";
  /** Tooltip message shown when action="disable" and permission is denied */
  disabledTooltip?: string;
  /** Custom fallback element to render when action="hide" and permission is denied */
  fallback?: ReactNode;
  /** The protected UI elements */
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  mode,
  action = "hide",
  disabledTooltip = "You do not have permission to perform this action.",
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, permissionsLoaded } = useRBAC();

  // If neither permission nor permissions is provided, allow by default
  if (!permission && (!permissions || permissions.length === 0)) {
    return <>{children}</>;
  }

  // Safe check: If permissions are not loaded yet, deny access
  let isAllowed = false;

  if (permission) {
    isAllowed = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    const shouldRequireAll = mode === "all" || requireAll;
    isAllowed = shouldRequireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (action === "hide") {
    return <>{fallback}</>;
  }

  // Render disabled wrapper with tooltip and disabled styling
  return (
    <span
      className="inline-block cursor-not-allowed opacity-60 pointer-events-none select-none"
      title={disabledTooltip}
      aria-disabled="true"
      tabIndex={-1}
    >
      {children}
    </span>
  );
}

export default PermissionGuard;