// lib/api/hrApi.ts

import api from "@/lib/api/api";
import { ProjectMember as Member } from "./projectsApi"; 
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
  if (!data) return {} as Employee;

  // 1. Identify where the true employee ID is
  // The user says: employee.id is correct, employee.user.id is wrong.
  // Sometimes data itself is the user object that has an employee property.
  
  let employeeId = data.id;
  let userData = data.user || data.User || {};
  
  // If data has an 'employee' property, that's likely the true employee data
  if (data.employee && typeof data.employee === 'object') {
    employeeId = data.employee.id || employeeId;
    // If we shifted to data.employee, then the original data might be the user data
    if (!data.user && !data.User) {
      userData = data;
    }
  }

  // 2. Map fields carefully
  const role = data.role || userData.role || userData.roleId || userData.designation || data.designation || 'No role';
  const name = data.name || userData.name || 'Unknown';
  const email = data.email || userData.email || 'No email';
  const department = data.department || 'Not assigned';
  const salary = data.salary !== undefined ? data.salary : (data.employee?.salary);
  const status = data.status || data.employee?.status || 'ACTIVE';
  
  const result: Employee = {
    id: employeeId || '',
    organizationId: data.organizationId || userData.organizationId || '',
    userId: userData.id || data.userId || '',
    name: name,
    email: email,
    department: department,
    role: role,
    salary: salary,
    joinDate: data.joinDate || data.employee?.joinDate || new Date().toISOString(),
    status: status,
    avatar: data.avatar || userData.avatar,
    createdAt: data.createdAt || data.employee?.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.employee?.updatedAt || new Date().toISOString()
  };

  console.log('[DEBUG] normalizeEmployeeData result:', { 
    id: result.id, 
    userId: result.userId, 
    name: result.name 
  });

  return result;
}

// ── Employee Endpoints ───────────────────────────────────

/**
 * Fetch all employees
 */
export async function getEmployees(): Promise<Employee[]> {
  console.log('[API] getEmployees request');
  try {
    const res = await api.get("/hr/employees/get-employees");
    console.log('[API] getEmployees response status:', res.status);
    
    // Handle various response structures
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
  console.log('[API] getEmployeeById request:', id);
  try {
    const res = await api.get(`/hr/employees/get-employee/${id}`);
    console.log('[API] getEmployeeById response status:', res.status);
    
    // Handle various response structures
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
  console.log('[DEBUG] updateEmployee - employee.id:', id);
  console.log('[DEBUG] updateEmployee - raw data:', data);

  try {
    const payload: Record<string, any> = {};
    
    // STRICT: Only allow department, salary, joinDate as per contract
    if (data.department !== undefined) payload.department = data.department;
    if (data.salary !== undefined) payload.salary = Number(data.salary);
    if (data.joinDate !== undefined) payload.joinDate = data.joinDate;
    
    console.log('[DEBUG] updateEmployee - final payload:', payload);

    const res = await api.patch(`/hr/employees/update-employee/${id}`, payload);
    console.log('[DEBUG] updateEmployee - response status:', res.status);
    
    let result = res.data?.data || res.data?.employee || res.data;
    
    if (result?.employee) {
      result = result.employee;
    }
    
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from update');
    }
    
    return normalizeEmployeeData(result);
  } catch (error: any) {
    console.error('[DEBUG] updateEmployee - error status:', error.response?.status);
    console.error('[DEBUG] updateEmployee - error message:', error.response?.data?.message || error.message);
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Failed to update employee');
  }
}

/**
 * Delete an employee
 */
export async function deleteEmployee(id: string): Promise<void> {
  console.log('[DEBUG] deleteEmployee - employee.id:', id);
  try {
    const res = await api.delete(`/hr/employees/delete-employee/${id}`);
    console.log('[DEBUG] deleteEmployee - response status:', res.status);
  } catch (error: any) {
    console.error('[DEBUG] deleteEmployee - error status:', error.response?.status);
    console.error('[DEBUG] deleteEmployee - error message:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Failed to delete employee');
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
 * Export attendance as CSV
 */
export async function exportAttendance(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<Blob> {
  try {
    const params: Record<string, string> = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    const res = await api.get("/hr/attendance/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  } catch (error: any) {
    console.error('Error exporting attendance:', error);
    throw new Error(error.response?.data?.message || 'Failed to export attendance');
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

