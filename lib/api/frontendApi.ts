import api from "./api";

export interface SidebarItem {
  key: string;
  label: string;
  route: string;
  visible: boolean;
}

export interface DashboardItem {
  key: string;
  route: string;
  visible: boolean;
}

export interface FrontendPermissionsResponse {
  sidebar: SidebarItem[];
  dashboards: DashboardItem[];
  modules: string[];
}

export const getFrontendPermissions = async (): Promise<FrontendPermissionsResponse> => {
  const res = await api.get<FrontendPermissionsResponse>("/frontend/permissions");
  return res.data;
};

export const getFrontendSidebar = async (): Promise<SidebarItem[]> => {
  const res = await api.get<SidebarItem[]>("/frontend/sidebar");
  return res.data;
};

export const getFrontendDashboards = async (): Promise<DashboardItem[]> => {
  const res = await api.get<DashboardItem[]>("/frontend/dashboards");
  return res.data;
};
