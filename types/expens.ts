// types/index.ts

export interface Expense {
  id: string;
  organizationId: string;
  submittedById: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";
  amount: number;
  description: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  department?: string;
  designation?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Finance specific types
export interface ExpenseFilters {
  category?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  reimbursed: number;
  totalAmount: number;
  pendingAmount: number;
}

// HR Types (from your HR module)
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

// Auth Types
export interface AuthData {
  token: string;
  userId: string;
  organizationId: string;
  user?: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
    organizationId: string;
  };
  message?: string;
}