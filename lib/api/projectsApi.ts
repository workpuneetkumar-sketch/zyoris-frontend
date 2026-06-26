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

export interface ProjectMember {
  id: string;           // membership id
  projectId: string;
  userId: string;       // user id
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
  members?: ProjectMember[];   // only in GET /projects/{id}
  milestones?: Milestone[];    // only in GET /projects/{id}
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

export async function addProjectMember(projectId: string, data: AddMemberPayload): Promise<any> {
  try {
    const res = await api.post(`/projects/${projectId}/members`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to add member");
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

// Fetches project details (including members) and returns the members array
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const project = await getProjectById(projectId);
  return project.members || [];
}