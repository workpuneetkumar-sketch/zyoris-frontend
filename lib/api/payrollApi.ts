// lib/api/payrollApi.ts

import api from "@/lib/api/api";

// ── Types ────────────────────────────────────────────────

export interface PayrollEarnings {
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyance: number;
  medicalAllowance: number;
  otherAllowances: number;
}

export interface PayrollDeductions {
  pf: number;
  esi: number;
  tds: number;
  professionalTax: number;
  loanRecovery: number;
  otherDeductions: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  designation: string;
  department: string;
  avatar?: string;
  month: string;        // e.g. "2026-07"
  basicSalary: number;
  earnings: PayrollEarnings;
  deductions: PayrollDeductions;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  paymentStatus: "PAID" | "PENDING" | "PROCESSING";
  paymentDate?: string;
  bankAccount?: string;
  createdAt: string;
}

export interface Payslip extends PayrollRecord {
  payslipNumber: string;
  companyName: string;
  companyAddress: string;
  panNumber: string;
  uanNumber: string;
  paidDays: number;
  lopDays: number;
  totalDays: number;
}

export interface SalaryHistoryEntry {
  month: string;
  basicSalary: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  paymentStatus: "PAID" | "PENDING" | "PROCESSING";
  incrementPercentage?: number;
}

// ── Demo Data ────────────────────────────────────────────

const DEMO_EMPLOYEES = [
  { id: "emp-001", name: "Aarav Sharma", email: "aarav.sharma@zyoris.com", designation: "Senior Developer", department: "Engineering" },
  { id: "emp-002", name: "Priya Patel", email: "priya.patel@zyoris.com", designation: "Product Manager", department: "Product" },
  { id: "emp-003", name: "Rohan Gupta", email: "rohan.gupta@zyoris.com", designation: "UI/UX Designer", department: "Design" },
  { id: "emp-004", name: "Ananya Singh", email: "ananya.singh@zyoris.com", designation: "HR Manager", department: "Human Resources" },
  { id: "emp-005", name: "Vikram Reddy", email: "vikram.reddy@zyoris.com", designation: "DevOps Engineer", department: "Engineering" },
  { id: "emp-006", name: "Sneha Joshi", email: "sneha.joshi@zyoris.com", designation: "Marketing Lead", department: "Marketing" },
  { id: "emp-007", name: "Arjun Nair", email: "arjun.nair@zyoris.com", designation: "Backend Developer", department: "Engineering" },
  { id: "emp-008", name: "Kavya Iyer", email: "kavya.iyer@zyoris.com", designation: "QA Engineer", department: "Engineering" },
  { id: "emp-009", name: "Rahul Mehta", email: "rahul.mehta@zyoris.com", designation: "Sales Executive", department: "Sales" },
  { id: "emp-010", name: "Diya Kapoor", email: "diya.kapoor@zyoris.com", designation: "Finance Analyst", department: "Finance" },
  { id: "emp-011", name: "Karthik Menon", email: "karthik.menon@zyoris.com", designation: "Tech Lead", department: "Engineering" },
  { id: "emp-012", name: "Meera Choudhary", email: "meera.choudhary@zyoris.com", designation: "Content Writer", department: "Marketing" },
];

const BASE_SALARIES: Record<string, number> = {
  "emp-001": 95000,
  "emp-002": 110000,
  "emp-003": 72000,
  "emp-004": 85000,
  "emp-005": 88000,
  "emp-006": 78000,
  "emp-007": 75000,
  "emp-008": 62000,
  "emp-009": 55000,
  "emp-010": 68000,
  "emp-011": 120000,
  "emp-012": 48000,
};

function generateEarnings(basic: number): PayrollEarnings {
  return {
    basic,
    hra: Math.round(basic * 0.4),
    da: Math.round(basic * 0.12),
    specialAllowance: Math.round(basic * 0.15),
    conveyance: 1600,
    medicalAllowance: 1250,
    otherAllowances: Math.round(basic * 0.05),
  };
}

function generateDeductions(basic: number): PayrollDeductions {
  return {
    pf: Math.round(basic * 0.12),
    esi: Math.round(basic * 0.0075),
    tds: Math.round(basic * 0.1),
    professionalTax: 200,
    loanRecovery: 0,
    otherDeductions: Math.round(basic * 0.02),
  };
}

function sumEarnings(e: PayrollEarnings): number {
  return e.basic + e.hra + e.da + e.specialAllowance + e.conveyance + e.medicalAllowance + e.otherAllowances;
}

function sumDeductions(d: PayrollDeductions): number {
  return d.pf + d.esi + d.tds + d.professionalTax + d.loanRecovery + d.otherDeductions;
}

const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

function generateDemoPayroll(): PayrollRecord[] {
  const records: PayrollRecord[] = [];
  const currentMonth = "2026-07";

  for (const emp of DEMO_EMPLOYEES) {
    const basic = BASE_SALARIES[emp.id] || 60000;
    const earnings = generateEarnings(basic);
    const deductions = generateDeductions(basic);
    const gross = sumEarnings(earnings);
    const totalDed = sumDeductions(deductions);

    const status: PayrollRecord["paymentStatus"] =
      currentMonth === "2026-07"
        ? Math.random() > 0.3 ? "PENDING" : "PROCESSING"
        : "PAID";

    records.push({
      id: `pay-${emp.id}-${currentMonth}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeEmail: emp.email,
      designation: emp.designation,
      department: emp.department,
      month: currentMonth,
      basicSalary: basic,
      earnings,
      deductions,
      grossEarnings: gross,
      totalDeductions: totalDed,
      netPay: gross - totalDed,
      paymentStatus: status,
      paymentDate: status === "PAID" ? `${currentMonth}-28T10:00:00Z` : undefined,
      bankAccount: `XXXX${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: `${currentMonth}-01T00:00:00Z`,
    });
  }

  return records;
}

function generateDemoSalaryHistory(employeeId: string): SalaryHistoryEntry[] {
  const basic = BASE_SALARIES[employeeId] || 60000;
  const history: SalaryHistoryEntry[] = [];

  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    // Simulate a small salary increment in April (annual review)
    const monthBasic = month >= "2026-04" ? Math.round(basic * 1.08) : basic;
    const earnings = generateEarnings(monthBasic);
    const deductions = generateDeductions(monthBasic);
    const gross = sumEarnings(earnings);
    const totalDed = sumDeductions(deductions);

    const incrementPct = month === "2026-04" ? 8.0 : undefined;

    history.push({
      month,
      basicSalary: monthBasic,
      grossEarnings: gross,
      totalDeductions: totalDed,
      netPay: gross - totalDed,
      paymentStatus: month === "2026-07" ? "PENDING" : "PAID",
      incrementPercentage: incrementPct,
    });
  }

  return history;
}

function generateDemoPayslip(payrollRecord: PayrollRecord): Payslip {
  return {
    ...payrollRecord,
    payslipNumber: `ZYR/${payrollRecord.month.replace("-", "")}/${payrollRecord.employeeId.replace("emp-", "").toUpperCase()}`,
    companyName: "Zyoris Technologies Pvt. Ltd.",
    companyAddress: "123 Tech Park, Sector 62, Noida, Uttar Pradesh - 201309",
    panNumber: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
    uanNumber: `1001${Math.floor(10000000 + Math.random() * 90000000)}`,
    paidDays: 30,
    lopDays: 0,
    totalDays: 30,
  };
}

// ── Exported Demo Data Generators ────────────────────────

export function getDemoPayrollRecords(): PayrollRecord[] {
  return generateDemoPayroll();
}

export function getDemoSalaryHistory(employeeId: string): SalaryHistoryEntry[] {
  return generateDemoSalaryHistory(employeeId);
}

export function getDemoPayslip(payrollRecord: PayrollRecord): Payslip {
  return generateDemoPayslip(payrollRecord);
}

// ── Real API Functions ───────────────────────────────────

export async function fetchPayrollRecords(month?: string): Promise<PayrollRecord[]> {
  try {
    const params: Record<string, string> = {};
    if (month) params.month = month;
    const res = await api.get("/hr/payroll/records", { params });
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error("Error fetching payroll records:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch payroll records");
  }
}

export async function fetchPayslipById(payrollId: string): Promise<Payslip> {
  try {
    const res = await api.get(`/hr/payroll/payslip/${payrollId}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error("Error fetching payslip:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch payslip");
  }
}

export async function fetchSalaryHistory(employeeId: string): Promise<SalaryHistoryEntry[]> {
  try {
    const res = await api.get(`/hr/payroll/salary-history/${employeeId}`);
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error("Error fetching salary history:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch salary history");
  }
}

export async function generatePayslipApi(employeeId: string, month: string): Promise<Payslip> {
  try {
    const res = await api.post("/hr/payroll/generate-payslip", { employeeId, month });
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error("Error generating payslip:", error);
    throw new Error(error.response?.data?.message || "Failed to generate payslip");
  }
}
