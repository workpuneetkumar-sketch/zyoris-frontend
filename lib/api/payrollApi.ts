// lib/api/payrollApi.ts

import api from "@/lib/api/api";
import { getEmployees, type Employee } from "@/lib/api/hrApi";

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
  pdfUrl?: string;
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

/**
 * Raw payslip shape returned by the backend `/hr/payslips` endpoints.
 * The model is intentionally flat — richer UI fields are derived in
 * `normalizePayslip` / `toPayslip`.
 */
export interface BackendPayslip {
  id: string;
  employeeId: string;
  month: number;        // 1-12
  year: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  bonus: number;
  deductions: number;   // single lump sum
  netSalary: number;
  pdfUrl?: string;
  // Optional employee details if the backend joins them in.
  employee?: Partial<Employee> & { name?: string; designation?: string };
  employeeName?: string;
  designation?: string;
  department?: string;
  createdAt?: string;
}

// ── Constants ────────────────────────────────────────────

const COMPANY_NAME = "Zyoris Technologies Pvt. Ltd.";
const COMPANY_ADDRESS =
  "123 Tech Park, Sector 62, Noida, Uttar Pradesh - 201309";

// ── Normalization ────────────────────────────────────────

function toMonthString(month: number, year: number): string {
  const m = Math.min(Math.max(month || 1, 1), 12);
  return `${year}-${String(m).padStart(2, "0")}`;
}

/**
 * Convert a flat backend payslip into the rich `PayrollRecord` the UI
 * consumes. Employee name/designation/department are resolved from the
 * provided employee map (built from `/hr/employees`) with a fallback to any
 * details the payslip itself carries.
 */
export function normalizePayslip(
  raw: BackendPayslip,
  empMap?: Map<string, Employee>
): PayrollRecord {
  const emp = empMap?.get(raw.employeeId);
  const nested = raw.employee;

  const employeeName =
    emp?.name || nested?.name || raw.employeeName || raw.employeeId;
  const designation =
    emp?.role || nested?.designation || nested?.role || raw.designation || "—";
  const department =
    emp?.department || nested?.department || raw.department || "—";
  const employeeEmail = emp?.email || nested?.email || "";

  const basicSalary = raw.basicSalary || 0;
  const hra = raw.hra || 0;
  const allowances = raw.allowances || 0;
  const bonus = raw.bonus || 0;
  const totalDeductions = raw.deductions || 0;
  const grossEarnings = basicSalary + hra + allowances + bonus;

  const earnings: PayrollEarnings = {
    basic: basicSalary,
    hra,
    da: 0,
    specialAllowance: allowances,
    conveyance: 0,
    medicalAllowance: 0,
    otherAllowances: bonus,
  };

  const deductions: PayrollDeductions = {
    pf: 0,
    esi: 0,
    tds: 0,
    professionalTax: 0,
    loanRecovery: 0,
    otherDeductions: totalDeductions,
  };

  const month = toMonthString(raw.month, raw.year);

  return {
    id: raw.id,
    employeeId: raw.employeeId,
    employeeName,
    employeeEmail,
    designation,
    department,
    avatar: emp?.avatar,
    month,
    basicSalary,
    earnings,
    deductions,
    grossEarnings,
    totalDeductions,
    netPay: raw.netSalary ?? grossEarnings - totalDeductions,
    // Backend has no explicit status — a generated PDF implies it's processed.
    paymentStatus: raw.pdfUrl ? "PAID" : "PENDING",
    pdfUrl: raw.pdfUrl,
    createdAt: raw.createdAt || `${month}-01T00:00:00Z`,
  };
}

/** Expand a `PayrollRecord` into a full `Payslip` with company defaults. */
export function toPayslip(record: PayrollRecord): Payslip {
  return {
    ...record,
    payslipNumber: `ZYR/${record.month.replace("-", "")}/${record.employeeId
      .replace("emp-", "")
      .slice(-6)
      .toUpperCase()}`,
    companyName: COMPANY_NAME,
    companyAddress: COMPANY_ADDRESS,
    panNumber: "—",
    uanNumber: "—",
    paidDays: 30,
    lopDays: 0,
    totalDays: 30,
  };
}

/**
 * Derive per-employee salary history client-side from the full set of loaded
 * payroll records — the backend exposes no dedicated salary-history endpoint.
 */
export function deriveSalaryHistory(
  records: PayrollRecord[],
  employeeId: string
): SalaryHistoryEntry[] {
  const entries = records
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => a.month.localeCompare(b.month));

  return entries.map((r, idx) => {
    const prev = entries[idx - 1];
    const incrementPercentage =
      prev && prev.basicSalary > 0 && r.basicSalary > prev.basicSalary
        ? Number(
            (
              ((r.basicSalary - prev.basicSalary) / prev.basicSalary) *
              100
            ).toFixed(1)
          )
        : undefined;

    return {
      month: r.month,
      basicSalary: r.basicSalary,
      grossEarnings: r.grossEarnings,
      totalDeductions: r.totalDeductions,
      netPay: r.netPay,
      paymentStatus: r.paymentStatus,
      incrementPercentage,
    };
  });
}

// ── API Functions ────────────────────────────────────────

async function buildEmployeeMap(): Promise<Map<string, Employee>> {
  try {
    const employees = await getEmployees();
    return new Map(employees.map((e) => [e.id, e]));
  } catch (error) {
    console.error("Error loading employees for payslip enrichment:", error);
    return new Map();
  }
}

export async function fetchPayslips(): Promise<PayrollRecord[]> {
  try {
    const [res, empMap] = await Promise.all([
      api.get("/hr/payslips"),
      buildEmployeeMap(),
    ]);
    const data = res.data?.data ?? res.data;
    const list: BackendPayslip[] = Array.isArray(data) ? data : [];
    return list.map((p) => normalizePayslip(p, empMap));
  } catch (error: any) {
    console.error("Error fetching payslips:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch payslips"
    );
  }
}

export async function fetchPayslipById(id: string): Promise<Payslip> {
  try {
    const [res, empMap] = await Promise.all([
      api.get(`/hr/payslips/${id}`),
      buildEmployeeMap(),
    ]);
    const data = res.data?.data ?? res.data;
    return toPayslip(normalizePayslip(data as BackendPayslip, empMap));
  } catch (error: any) {
    console.error("Error fetching payslip:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch payslip"
    );
  }
}

/**
 * Download a payslip PDF. Fetches the file as a blob and triggers a browser
 * download; falls back to opening `pdfUrl` directly if the blob call fails.
 */
export async function downloadPayslipPdf(
  id: string,
  fileName?: string,
  pdfUrl?: string
): Promise<void> {
  try {
    const response = await api.get(`/hr/payslips/${id}/download`, {
      responseType: "blob",
    });
    const blob = response.data;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || `Payslip_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error: any) {
    console.error("PDF download failed:", error);
    if (pdfUrl) {
      const base =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://zyoris.onrender.com";
      const href = pdfUrl.startsWith("http") ? pdfUrl : `${base}${pdfUrl}`;
      window.open(href, "_blank");
      return;
    }
    throw new Error(
      error.response?.data?.message || "Failed to download payslip"
    );
  }
}

export async function generatePayslip(
  employeeId: string,
  month: number,
  year: number
): Promise<PayrollRecord> {
  try {
    const res = await api.post("/hr/payslips/generate", {
      employeeId,
      month,
      year,
    });
    const data = res.data?.data ?? res.data;
    const empMap = await buildEmployeeMap();
    return normalizePayslip(data as BackendPayslip, empMap);
  } catch (error: any) {
    console.error("Error generating payslip:", error);
    throw new Error(
      error.response?.data?.message || "Failed to generate payslip"
    );
  }
}

export async function deletePayslip(id: string): Promise<void> {
  try {
    await api.delete(`/hr/payslips/${id}`);
  } catch (error: any) {
    console.error("Error deleting payslip:", error);
    throw new Error(
      error.response?.data?.message || "Failed to delete payslip"
    );
  }
}
