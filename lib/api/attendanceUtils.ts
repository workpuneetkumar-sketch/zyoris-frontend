// lib/api/attendanceApi.ts
import api from "@/lib/api/api";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  date: string;
  attendanceDate?: string;
}

export interface TodaySummary {
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  onTime: number;
  late: number;
  absent: number;
}

/**
 * Check in an employee
 */
export async function checkIn(data: {
  employeeId: string;
  checkInTime: string;
}): Promise<AttendanceRecord> {
  try {
    const payload = {
      employeeId: data.employeeId,
      checkInTime: data.checkInTime,
      date: new Date().toISOString().split("T")[0]
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
  attendanceId: string;
  checkOutTime: string;
}): Promise<AttendanceRecord> {
  try {
    const payload = {
      employeeId: data.employeeId,
      attendanceId: data.attendanceId,
      checkOutTime: data.checkOutTime,
      date: new Date().toISOString().split("T")[0]
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
}): Promise<AttendanceRecord[]> {
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
export async function fetchTodaySummary(): Promise<TodaySummary> {
  try {
    const res = await api.get("/hr/attendance/today-summary");
    
    const data = res.data?.data || res.data;
    return data || {
      totalEmployees: 0,
      checkedIn: 0,
      checkedOut: 0,
      onTime: 0,
      late: 0,
      absent: 0
    };
  } catch (error: any) {
    console.error('Error fetching today summary:', error);
    return {
      totalEmployees: 0,
      checkedIn: 0,
      checkedOut: 0,
      onTime: 0,
      late: 0,
      absent: 0
    };
  }
}