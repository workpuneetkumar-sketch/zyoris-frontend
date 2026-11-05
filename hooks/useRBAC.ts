"use client";

import { useAuth } from "@/context/AuthContext";
import { useCallback } from "react";

export function useRBAC() {
  const {
    userPermissions,
    sidebarItems,
    visibleDashboards,
    visibleModules,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    refreshPermissions,
    permissionsLoaded,
    user,
    isAdmin,
  } = useAuth();

  const isModuleVisible = useCallback(
    (moduleName: string): boolean => {
      return visibleModules.includes(moduleName);
    },
    [visibleModules]
  );

  /**
   * Helper to check action-level entity permission, e.g. can("create", "leads") checks "leads.create"
   */
  const can = useCallback(
    (action: string, entity: string): boolean => {
      return hasPermission(`${entity}.${action}`);
    },
    [hasPermission]
  );

  return {
    userPermissions,
    sidebarItems,
    visibleDashboards,
    visibleModules,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    refreshPermissions,
    permissionsLoaded,
    isModuleVisible,
    can,
    user,
    isAdmin,
  };
}
