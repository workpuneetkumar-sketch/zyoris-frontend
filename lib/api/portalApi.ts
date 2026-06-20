import axios from "axios";

// Dedicated portal API instance (separate from admin)
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

// ── Real API Methods ─────────────────────────────────────────────
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

// ── DEMO DATA (used when toggled) ────────────────────────────────
export function getDemoDashboard(): PortalDashboardData {
  return {
    projectsCount: 8,
    invoicesCount: 12,
    documentsCount: 5,
    recentProjects: getDemoProjects().slice(0, 3),
    recentInvoices: getDemoInvoices().slice(0, 3),
    recentDocuments: getDemoDocuments().slice(0, 3),
  };
}

export function getDemoProjects(): PortalProject[] {
  return [
    {
      id: "demo-1",
      name: "Website Redesign",
      status: "ACTIVE",
      startDate: "2026-05-10T00:00:00Z",
      endDate: "2026-07-15T00:00:00Z",
      progress: 65,
    },
    {
      id: "demo-2",
      name: "Mobile App Development",
      status: "ACTIVE",
      startDate: "2026-04-01T00:00:00Z",
      endDate: "2026-08-30T00:00:00Z",
      progress: 40,
    },
    {
      id: "demo-3",
      name: "CRM Integration",
      status: "COMPLETED",
      startDate: "2026-01-20T00:00:00Z",
      endDate: "2026-03-15T00:00:00Z",
      progress: 100,
    },
    {
      id: "demo-4",
      name: "Inventory System",
      status: "PENDING",
      startDate: "2026-06-01T00:00:00Z",
      progress: 0,
    },
  ];
}

export function getDemoInvoices(): PortalInvoice[] {
  return [
    {
      id: "inv-1",
      number: "INV-2026-001",
      amount: 2500.0,
      status: "PAID",
      dueDate: "2026-05-20T00:00:00Z",
      downloadUrl: "#",
    },
    {
      id: "inv-2",
      number: "INV-2026-002",
      amount: 1800.0,
      status: "SENT",
      dueDate: "2026-06-15T00:00:00Z",
      downloadUrl: "#",
    },
    {
      id: "inv-3",
      number: "INV-2026-003",
      amount: 3200.0,
      status: "OVERDUE",
      dueDate: "2026-04-30T00:00:00Z",
    },
    {
      id: "inv-4",
      number: "INV-2026-004",
      amount: 950.0,
      status: "DRAFT",
      dueDate: "2026-07-01T00:00:00Z",
    },
  ];
}

export function getDemoDocuments(): PortalDocument[] {
  return [
    {
      id: "doc-1",
      fileName: "Project_Proposal.pdf",
      fileType: "application/pdf",
      fileSize: 245000,
      uploadDate: "2026-06-10T10:30:00Z",
      downloadUrl: "#",
    },
    {
      id: "doc-2",
      fileName: "Contract_v2.docx",
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 128000,
      uploadDate: "2026-06-12T14:00:00Z",
      downloadUrl: "#",
    },
    {
      id: "doc-3",
      fileName: "Invoice_March.xlsx",
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileSize: 82000,
      uploadDate: "2026-06-13T08:15:00Z",
    },
  ];
}