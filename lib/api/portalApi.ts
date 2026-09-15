import axios from "axios";

const portalApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Attach portal token from localStorage
portalApi.interceptors.request.use((config) => {
  const portalData = localStorage.getItem("portalAuth");
  if (portalData) {
    const { token } = JSON.parse(portalData);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Types ──────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PortalProfile {
  id: string;
  name: string;
  email: string;
  // any other fields returned by /portal/me
}

export interface PortalDashboardData {
  projectsCount: number;
  invoicesCount: number;
  documentsCount: number;
  recentProjects: PortalProject[];
  recentInvoices: PortalInvoice[];
  recentDocuments: PortalDocument[];
}

export interface PortalProject {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  progress?: number;
}

export interface PortalInvoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  dueDate: string;
  downloadUrl?: string;
}

export interface PortalDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  downloadUrl?: string;
}

export interface SetPasswordPayload {
  password: string;
}

// ── Auth ──────────────────────────────────────────────────────────
export async function portalLogin(data: LoginPayload): Promise<LoginResponse> {
  try {
    const res = await portalApi.post("/portal/login", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    const message = error.response?.data?.message || "Login failed";
    if (message === "INVALID_CREDENTIALS") throw new Error("INVALID_CREDENTIALS");
    throw new Error(message);
  }
}

/** Validate the current token and return client profile */
export async function getPortalProfile(): Promise<PortalProfile> {
  try {
    const res = await portalApi.get("/portal/me");
    return res.data?.data || res.data;
  } catch (error: any) {
    // If token is invalid/expired, clear local storage
    localStorage.removeItem("portalAuth");
    throw new Error("Session expired or invalid. Please login again.");
  }
}

export async function setClientPortalPassword(
  clientId: string,
  data: SetPasswordPayload
): Promise<void> {
  try {
    await portalApi.put(`/portal/clients/${clientId}/password`, data);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to set password");
  }
}

// ── Data ──────────────────────────────────────────────────────────
export async function getPortalDashboard(): Promise<PortalDashboardData> {
  try {
    const res = await portalApi.get("/portal/dashboard");
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch dashboard");
  }
}

export async function getPortalProjects(): Promise<PortalProject[]> {
  try {
    const res = await portalApi.get("/portal/projects");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch projects");
  }
}

export async function getPortalInvoices(): Promise<PortalInvoice[]> {
  try {
    const res = await portalApi.get("/portal/invoices");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch invoices");
  }
}

export async function getPortalDocuments(): Promise<PortalDocument[]> {
  try {
    const res = await portalApi.get("/portal/documents");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch documents");
  }
}