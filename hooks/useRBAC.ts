"use client";

import { useAuth } from "@/context/AuthContext";
import { useCallback } from "react";

export function useRBAC() {
  const { userPermissions, sidebarItems, visibleDashboards, visibleModules, hasPermission } = useAuth();

  const isModuleVisible = useCallback((moduleName: string): boolean => {
    return visibleModules.includes(moduleName);
  }, [visibleModules]);

  return {
    userPermissions,
    sidebarItems,
    visibleDashboards,
    visibleModules,
    hasPermission,
    isModuleVisible,
  };
}
