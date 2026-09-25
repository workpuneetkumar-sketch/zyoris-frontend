export type AssigneeType = "DEPARTMENT" | "USER";

export interface DepartmentSummary {
  name: string;
  memberCount: number;
}

export interface EmployeeScopeMember {
  userId: string;
  name: string | null;
  email: string;
  department: string;
  role: string | null;
}

export interface AssignableScopesResponse {
  organizationId: string;
  departments: DepartmentSummary[];
  employees: EmployeeScopeMember[];
}

export interface AssignPageAsTaskPayload {
  assigneeType: AssigneeType;
  targetDepartment?: string;
  targetUserId?: string;
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  metadata?: Record<string, any>;
}

export interface ReassignTaskPayload {
  assigneeType: AssigneeType;
  targetDepartment?: string;
  targetUserId?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export type EffectiveAssignmentResponse = AssignmentEffectiveAssignment;

export interface AssignmentEffectiveAssignment {
  taskId: string;
  organizationId: string;
  scope: string;
  assigneeType: AssigneeType;
  department: string | null;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  assignedBy: {
    id: string;
    name?: string | null;
  };
  assignedAt: string | Date;
  previousAssigneeId?: string | null;
  status: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | Date | null;
  source: string;
  pageContext?: {
    pageId: string;
    pageTitle: string;
  };
  metadata?: Record<string, any>;
}

export interface AssignmentResult {
  taskId: string;
  pageId: string;
  pageTitle: string;
  organizationId: string;
  scope: string;
  assigneeType: AssigneeType;
  assignedToId: string | null;
  department: string | null;
  assignedById: string;
  status: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | Date | null;
  createdAt: string | Date;
  effectiveAssignment?: AssignmentEffectiveAssignment;
}

export interface CsvTaskRow {
  title: string;
  description?: string;
  assigneeType?: AssigneeType;
  targetDepartment?: string;
  targetUserId?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
}

export interface ImportTasksCsvPayload {
  rows: CsvTaskRow[];
  defaultProjectId?: string;
}

export interface BulkTaskAssignmentResult {
  successful: EffectiveAssignmentResponse[];
  failed: { index: number; title: string; error: string }[];
  total: number;
  successCount: number;
  failureCount: number;
}

