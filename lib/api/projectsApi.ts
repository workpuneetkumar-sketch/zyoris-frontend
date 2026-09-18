"use client";

import api from "@/lib/api/api";

// ── Types ──────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string;      // stays required (backend always returns it)
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface ProjectMemberUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface ProjectMember {
  id: string;           // membership id
  projectId: string;
  userId: string;       // user id
  role?: ProjectMemberRole;
  createdAt?: string;
  updatedAt?: string;
  user?: ProjectMemberUser;
}

export interface ProjectMemberWithUser extends ProjectMember {
  role?: ProjectMemberRole;
}

export interface ProjectSummaryCounts {
  tasks: number;
  pages: number;
  files: number;
  members: number;
  milestones: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  projectId: string;
  organizationId?: string;
  createdById?: string;
  assignedToId?: string | null;
  assignedTo?: ProjectMemberUser | null;
  dueDate?: string | null;
  startDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTaskPayload {
  title: string;
  description?: string;
  assignedToId?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  status?: "TODO" | "IN_PROGRESS" | "DONE";
}

export interface ProjectPage {
  id: string;
  title: string;
  icon?: string | null;
  coverImage?: string | null;
  parentId?: string | null;
  projectId: string;
  organizationId?: string;
  createdById?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPagePayload {
  title: string;
  icon?: string;
  coverImage?: string;
  parentId?: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  organizationId?: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkProjectFilePayload {
  fileUploadId: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string | null;
  client?: Client;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  startDate: string;
  endDate?: string;
  targetDate?: string;
  color?: string | null;
  key?: string | null;
  budget?: number | null;
  currency?: string;
  ownerId?: string;
  members?: ProjectMember[];   // only in GET /projects/{id}
  milestones?: Milestone[];    // only in GET /projects/{id}
  counts?: ProjectSummaryCounts; // in GET /projects and GET /projects/{id}
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  clientId?: string;       // optional, backend allows null
  status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  startDate: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  clientId?: string;
  status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  startDate?: string;
  endDate?: string;
}

export interface CreateMilestonePayload {
  title: string;
  description?: string;
  status?: string;
  dueDate?: string;   // ✅ now optional – matches component usage
}

export interface AddMemberPayload {
  userId: string;
  role?: string;
}

// ── API Methods ─────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  try {
    const res = await api.get("/projects");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch projects");
  }
}

export async function getProjectById(id: string): Promise<Project> {
  try {
    const res = await api.get(`/projects/${id}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch project");
  }
}

export async function createProject(data: CreateProjectPayload): Promise<Project> {
  try {
    const res = await api.post("/projects/create", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw error;
  }
}

export async function updateProject(id: string, data: UpdateProjectPayload): Promise<Project> {
  try {
    const res = await api.patch(`/projects/${id}`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await api.delete(`/projects/${id}`);
  } catch (error: any) {
    throw error;
  }
}

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  try {
    const res = await api.get(`/projects/${projectId}/milestones`);
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch milestones");
  }
}

export async function createMilestone(projectId: string, data: CreateMilestonePayload): Promise<Milestone> {
  try {
    const res = await api.post(`/projects/${projectId}/milestones`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create milestone");
  }
}

// ── BE-2 Project Relations: Tasks ──────────────────────────────────────────

export async function getProjectTasks(
  projectId: string,
  params?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }
): Promise<ProjectTask[]> {
  try {
    const res = await api.get(`/projects/${projectId}/tasks`, { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.tasks)) return data.tasks;
    return [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch project tasks");
  }
}

export async function createProjectTask(
  projectId: string,
  payload: CreateProjectTaskPayload
): Promise<ProjectTask> {
  try {
    const res = await api.post(`/projects/${projectId}/tasks`, payload);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create project task");
  }
}

// ── BE-2 Project Relations: Pages ──────────────────────────────────────────

export async function getProjectPages(
  projectId: string,
  params?: {
    parentId?: string;
    page?: number;
    limit?: number;
  }
): Promise<ProjectPage[]> {
  try {
    const res = await api.get(`/projects/${projectId}/pages`, { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.pages)) return data.pages;
    return [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch project pages");
  }
}

export async function createProjectPage(
  projectId: string,
  payload: CreateProjectPagePayload
): Promise<ProjectPage> {
  try {
    const res = await api.post(`/projects/${projectId}/pages`, payload);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create project page");
  }
}

// ── BE-2 Project Relations: Files ──────────────────────────────────────────

export async function getProjectFiles(
  projectId: string,
  params?: {
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<ProjectFile[]> {
  try {
    const res = await api.get(`/projects/${projectId}/files`, { params });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.files)) return data.files;
    return [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch project files");
  }
}

export async function linkProjectFile(
  projectId: string,
  payload: LinkProjectFilePayload
): Promise<ProjectFile> {
  try {
    const res = await api.post(`/projects/${projectId}/files`, payload);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to link project file");
  }
}

// ── BE-2 Project Relations: Members ────────────────────────────────────────

export async function getProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
  try {
    const res = await api.get(`/projects/${projectId}/members`);
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.members)) return data.members;
    return [];
  } catch (error: any) {
    // Graceful fallback to project.members from GET /projects/:id
    try {
      const project = await getProjectById(projectId);
      return (project.members || []) as any;
    } catch {
      return [];
    }
  }
}

export async function addProjectMember(projectId: string, data: AddMemberPayload): Promise<any> {
  try {
    const res = await api.post(`/projects/${projectId}/members`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error("Permission Denied: You do not have permission to add project members.");
    }
    throw new Error(error.response?.data?.message || "Failed to add member");
  }
}

export async function updateProjectMember(projectId: string, memberId: string, role: string): Promise<any> {
  try {
    const res = await api.patch(`/projects/${projectId}/members/${memberId}`, { role });
    return res.data?.data || res.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error("Permission Denied: You do not have permission to update project member roles.");
    }
    throw new Error(error.response?.data?.message || "Failed to update project member role");
  }
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<any> {
  try {
    const res = await api.delete(`/projects/${projectId}/members/${memberId}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error("Permission Denied: You do not have permission to remove project members.");
    }
    throw new Error(error.response?.data?.message || "Failed to remove member from project");
  }
}

// ── Employee helpers ──────────────────────────────────────────────────

export async function getEmployees(): Promise<any[]> {
  try {
    const res = await api.get("/hr/employees/get-employees");
    return res.data || [];
  } catch (error: any) {
    console.error("Failed to fetch employees:", error);
    return [];
  }
}