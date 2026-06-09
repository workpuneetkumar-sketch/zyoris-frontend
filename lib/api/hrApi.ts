// lib/api/hrApi.ts

import api from "@/lib/api/api";

// ── Types ────────────────────────────────────────────────

export interface Employee {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  salary?: number;
  joinDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkIn: string;
  checkOut?: string;
  status?: 'Present' | 'Late' | 'Absent' | 'Half Day';
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: "SICK" | "CASUAL" | "EARNED";
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HRStats {
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  onTime: number;
  late: number;
  absent: number;
  presentToday?: number;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  password: string;
  roleId: string;
  designation: string;
  department: string;
  salary?: number;
  joinDate: string;
}

export interface UpdateEmployeeData {
  name?: string;
  email?: string;
  department?: string;
  role?: string;
  salary?: number;
  joinDate?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
}

// ── Helper function to normalize employee data ────────────

function normalizeEmployeeData(data: any): Employee {
  const userData = data.user || data.User || {};
  const role = data.role || userData.role || userData.roleId || userData.designation || 'No role';
  const name = data.name || userData.name || 'Unknown';
  const email = data.email || userData.email || 'No email';

  return {
    id: data.id || '',
    organizationId: data.organizationId || userData.organizationId || '',
    userId: data.userId || userData.id || '',
    name,
    email,
    department: data.department || 'Not assigned',
    role,
    salary: data.salary,
    joinDate: data.joinDate || new Date().toISOString(),
    status: data.status || 'ACTIVE',
    avatar: data.avatar,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

// ── Employee Endpoints ───────────────────────────────────

/**
 * Fetch all employees
 */
export async function getEmployees(): Promise<Employee[]> {
  try {
    const res = await api.get("/hr/employees/get-employees");
    let data = res.data?.data || res.data;

    if (Array.isArray(data)) return data.map(normalizeEmployeeData);
    if (data?.employees && Array.isArray(data.employees))
      return data.employees.map(normalizeEmployeeData);

    return [];
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch employees');
  }
}

/**
 * Fetch a single employee by ID
 */
export async function getEmployeeById(id: string): Promise<Employee> {
  try {
    const res = await api.get(`/hr/employees/get-employee/${id}`);
    let data = res.data?.data || res.data?.employee || res.data;
    if (data?.employee) data = data.employee;
    if (!data || typeof data !== 'object') throw new Error('Invalid employee data received');
    return normalizeEmployeeData(data);
  } catch (error: any) {
    console.error('Error fetching employee:', error);
    if (error.response?.status === 404) throw new Error('Employee not found');
    throw new Error(error.response?.data?.message || 'Failed to fetch employee');
  }
}

/**
 * Create a new employee
 */
export async function createEmployee(data: CreateEmployeeData): Promise<Employee> {
  try {
    const payload = {
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
      roleId: data.roleId,
      designation: data.designation.trim(),
      department: data.department,
      salary: data.salary ?? 0,
      joinDate: data.joinDate,
    };
    const res = await api.post("/hr/employees/create", payload);
    let result = res.data?.data || res.data;
    if (result?.employee) result = result.employee;
    return normalizeEmployeeData(result);
  } catch (error: any) {
    console.error("Error creating employee:", error);
    throw new Error(error.response?.data?.message || "Failed to create employee");
  }
}

/**
 * Update an existing employee
 */
export async function updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee> {
  try {
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.email !== undefined) payload.email = data.email.trim();
    if (data.department !== undefined) payload.department = data.department;
    if (data.role !== undefined) payload.role = data.role.trim();
    if (data.salary !== undefined) payload.salary = data.salary;
    if (data.joinDate !== undefined) payload.joinDate = data.joinDate;
    if (data.status !== undefined) payload.status = data.status;

    const res = await api.patch(`/hr/employees/update-employee/${id}`, payload);
    let result = res.data?.data || res.data?.employee || res.data;
    if (result?.employee) result = result.employee;
    if (!result || typeof result !== 'object') throw new Error('Invalid response from update');
    return normalizeEmployeeData(result);
  } catch (error: any) {
    console.error('Error updating employee:', error);
    throw new Error(error.response?.data?.message || 'Failed to update employee');
  }
}

// ── Attendance Endpoints ─────────────────────────────────

/**
 * Check in an employee
 */
export async function checkIn(data: {
  employeeId: string;
  attendanceDate?: string;
  checkIn?: string;
}): Promise<Attendance> {
  try {
    const payload = {
      employeeId: data.employeeId,
      attendanceDate: data.attendanceDate || new Date().toISOString().split("T")[0],
      checkIn: data.checkIn || new Date().toISOString(),
    };
    const res = await api.post("/hr/attendance/check-in", payload);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error('Error checking in:', error);
    throw new Error(error.response?.data?.message || 'Failed to check in');
  }
}

/**
 * Check out an employee
 */
export async function checkOut(data: {
  employeeId: string;
  attendanceDate?: string;
  checkOut?: string;
}): Promise<Attendance> {
  try {
    const payload = {
      employeeId: data.employeeId,
      attendanceDate: data.attendanceDate || new Date().toISOString().split("T")[0],
      checkOut: data.checkOut || new Date().toISOString(),
    };
    const res = await api.post("/hr/attendance/check-out", payload);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error('Error checking out:', error);
    throw new Error(error.response?.data?.message || 'Failed to check out');
  }
}

/**
 * Fetch attendance records with optional filters
 */
export async function fetchAttendance(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Attendance[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.employeeId) params.employeeId = filters.employeeId;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const res = await api.get("/hr/attendance/get-attendance", { params });
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return [];
  }
}

/**
 * Fetch today's attendance summary
 */
export async function fetchTodaySummary(): Promise<HRStats> {
  try {
    const res = await api.get("/hr/attendance/today-summary");
    const data = res.data?.data || res.data;
    return data || {
      totalEmployees: 0,
      checkedIn: 0,
      checkedOut: 0,
      onTime: 0,
      late: 0,
      absent: 0,
    };
  } catch (error: any) {
    console.error('Error fetching today summary:', error);
    return { totalEmployees: 0, checkedIn: 0, checkedOut: 0, onTime: 0, late: 0, absent: 0 };
  }
}

// ── Leave Request Endpoints ──────────────────────────────

/**
 * Apply for leave
 */
export async function applyLeave(data: {
  employeeId: string;
  startDate: string;
  endDate: string;
  type: LeaveRequest["type"];
  reason: string;
}): Promise<LeaveRequest> {
  try {
    const res = await api.post("/hr/leaves/apply", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error('Error applying for leave:', error);
    throw new Error(error.response?.data?.message || 'Failed to apply for leave');
  }
}

/**
 * Fetch leave requests with optional filters
 */
export async function fetchLeaves(filters?: {
  employeeId?: string;
  status?: LeaveRequest["status"];
  startDate?: string;
  endDate?: string;
}): Promise<LeaveRequest[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.employeeId) params.employeeId = filters.employeeId;
    if (filters?.status) params.status = filters.status;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const res = await api.get("/hr/leaves/get-leaves", { params });
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('Error fetching leaves:', error);
    return [];
  }
}

/**
 * Get a single leave request by ID
 */
export async function getLeaveById(id: string): Promise<LeaveRequest> {
  try {
    const res = await api.get(`/hr/leaves/get-leave/${id}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error('Error fetching leave:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch leave');
  }
}

/**
 * Approve a leave request
 */
export async function approveLeave(id: string): Promise<LeaveRequest> {
  try {
    const res = await api.patch(`/hr/leaves/approve/${id}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error('Error approving leave:', error);
    throw new Error(error.response?.data?.message || 'Failed to approve leave');
  }
}

/**
 * Reject a leave request
 */
export async function rejectLeave(id: string): Promise<LeaveRequest> {
  try {
    const res = await api.patch(`/hr/leaves/reject/${id}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error('Error rejecting leave:', error);
    throw new Error(error.response?.data?.message || 'Failed to reject leave');
  }
}

/**
 * @deprecated Use approveLeave / rejectLeave directly instead
 */
export async function updateLeaveStatus(
  id: string,
  status: "APPROVED" | "REJECTED"
): Promise<LeaveRequest> {
  return status === "APPROVED" ? approveLeave(id) : rejectLeave(id);
}
