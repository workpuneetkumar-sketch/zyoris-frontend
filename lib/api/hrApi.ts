// lib/api/hrApi.ts

import api from "@/lib/api/api";

// ── Types ────────────────────────────────────────────────

export interface Employee {
    id: string;
    organizationId: string;
    userId: string;
    department: string;
    joinDate: string; // ISO date
    salary?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Attendance {
    id: string;
    employeeId: string;
    attendanceDate: string; // ISO date
    checkIn: string; // ISO datetime or time string
    checkOut?: string; // ISO datetime or time string
    createdAt: string;
}

export interface LeaveRequest {
    id: string;
    employeeId: string;
    startDate: string; // ISO date
    endDate: string; // ISO date
    type: "SICK" | "CASUAL" | "EARNED";
    reason: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
}

// ── Employee Endpoints ───────────────────────────────────

export async function createEmployee(data: {
    userId: string;
    department: string;
    joinDate: string;
    salary?: number;
}): Promise<Employee> {
    const res = await api.post("/hr/employees/create", data);
    return res.data;
}

export async function fetchEmployees(): Promise<Employee[]> {
    const res = await api.get("/hr/employees/get-employees");
    return res.data;
}

export async function fetchEmployeeById(id: string): Promise<Employee> {
    const res = await api.get(`/hr/employees/get-employee/${id}`);
    return res.data;
}

export async function updateEmployee(
    id: string,
    data: Partial<Omit<Employee, "id" | "organizationId" | "createdAt" | "updatedAt">>
): Promise<Employee> {
    const res = await api.patch(`/hr/employees/update-employee/${id}`, data);
    return res.data;
}

// ── Attendance Endpoints ─────────────────────────────────

export async function checkIn(data: {
    employeeId: string;
    attendanceDate?: string; // optional, defaults to today
    checkIn?: string; // optional, defaults to current time
}): Promise<Attendance> {
    const res = await api.post("/hr/attendance/check-in", {
        ...data,
        attendanceDate: data.attendanceDate || new Date().toISOString().split("T")[0],
        checkIn: data.checkIn || new Date().toISOString(),
    });
    return res.data;
}

export async function checkOut(data: {
    employeeId: string;
    attendanceDate?: string; // optional, defaults to today
    checkOut?: string; // optional, defaults to current time
}): Promise<Attendance> {
    const res = await api.post("/hr/attendance/check-out", {
        ...data,
        attendanceDate: data.attendanceDate || new Date().toISOString().split("T")[0],
        checkOut: data.checkOut || new Date().toISOString(),
    });
    return res.data;
}

export async function fetchAttendance(filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<Attendance[]> {
    const params = {
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
        ...(filters?.startDate && { startDate: filters.startDate }),
        ...(filters?.endDate && { endDate: filters.endDate }),
    };
    
    const res = await api.get("/hr/attendance/get-attendance", { params });
    return res.data;
}

export interface TodaySummary {
    checkedIn: number;
    checkedOut: number;
    onTime: number;
    late: number;
    absent: number;
    totalEmployees: number;
}

export async function fetchTodaySummary(): Promise<TodaySummary> {
    const res = await api.get("/hr/attendance/today-summary");
    return res.data;
}

// ── Leave Request Endpoints ──────────────────────────────

export async function applyLeave(data: {
    employeeId: string;
    startDate: string;
    endDate: string;
    type: LeaveRequest["type"];
    reason: string;
}): Promise<LeaveRequest> {
    const res = await api.post("/hr/leaves/apply", data);
    return res.data;
}

export async function fetchLeaves(filters?: {
    employeeId?: string;
    status?: LeaveRequest["status"];
    startDate?: string;
    endDate?: string;
}): Promise<LeaveRequest[]> {
    const params = {
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.startDate && { startDate: filters.startDate }),
        ...(filters?.endDate && { endDate: filters.endDate }),
    };
    
    const res = await api.get("/hr/leaves/get-leaves", { params });
    return res.data;
}

export async function approveLeave(
    id: string,
    action: "APPROVED" | "REJECTED"
): Promise<LeaveRequest> {
    const res = await api.patch(`/hr/leaves/approve/${id}`, {
        status: action,
    });
    return res.data;
}

// ── Convenience aliases ──────────────────────────────────

export const rejectLeave = (id: string) => approveLeave(id, "REJECTED");
export const approveLeaveRequest = (id: string) => approveLeave(id, "APPROVED");