import api from "@/lib/api/api"; // your pre-configured axios instance

// ── Types ──────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  client?: Client;
  status: "ACTIVE" | "COMPLETED" | "PENDING" | "CANCELLED" | string;
  progress?: number;
  startDate: string;
  endDate?: string;
  members?: Member[];
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  clientId: string;
  status?: string;
  startDate: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  clientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateMilestonePayload {
  title: string;
  description?: string;
  status?: string;
  dueDate: string;
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

export async function createProject(data: CreateProjectPayload): Promise<Project> {
  try {
    const res = await api.post("/projects/create", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create project");
  }
}

export async function updateProject(id: string, data: UpdateProjectPayload): Promise<Project> {
  try {
    const res = await api.patch(`/projects/${id}`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update project");
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await api.delete(`/projects/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete project");
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

export async function addProjectMember(projectId: string, data: AddMemberPayload): Promise<Member> {
  try {
    const res = await api.post(`/projects/${projectId}/members`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to add member");
  }
}