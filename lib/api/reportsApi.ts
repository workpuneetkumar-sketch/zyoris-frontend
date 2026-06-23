import api from "@/lib/api/api";
import { fetchLeads } from "@/lib/api/leadsApi";
import { fetchDeals } from "@/lib/api/dealsApi";
import { getProjects } from "@/lib/api/projectsApi";
import { getInvoices } from "@/lib/api/finance/invoicesApi";
import { fetchExpenses } from "@/lib/api/finance/expenseApi";

// ─── Types ──────────────────────────────────────────────────────────────

export type ReportEntityType = 
  | "LEADS" 
  | "DEALS" 
  | "PROJECTS" 
  | "INVOICES" 
  | "EXPENSES" 
  | "CAMPAIGNS";

export interface ReportFilters {
  entityType: ReportEntityType;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}

export interface ReportData {
  columns: string[];
  rows: Record<string, any>[];
  total: number;
  entityType: ReportEntityType;
}

// ─── Campaign Types ────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  budget: number;
  status: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Campaign API ─────────────────────────────────────────────────────

export async function getCampaigns(filters?: {
  status?: string;
  search?: string;
}): Promise<Campaign[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.status && filters.status !== "ALL") params.status = filters.status;
    if (filters?.search) params.search = filters.search;

    const res = await api.get("/marketing/campaigns", { params });
    let data = res.data?.data || res.data;

    if (data?.campaigns && Array.isArray(data.campaigns)) {
      return data.campaigns;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error: any) {
    console.error("Campaign API Error:", error);
    return [];
  }
}

// ─── Report Data Fetchers ────────────────────────────────────────────

export async function fetchReportData(filters: ReportFilters): Promise<ReportData> {
  const { entityType, startDate, endDate, status, search } = filters;

  let rawData: any[] = [];
  let columns: string[] = [];

  try {
    switch (entityType) {
      case "LEADS": {
        const response = await fetchLeads(1, {
          status: status || "All Status",
          source: "All Sources",
          owner: "All Owners",
          search: search || "", // API handles search
        });
        rawData = response.leads || [];
        columns = ["name", "email", "company", "status", "source", "createdAt", "assignedTo"];
        break;
      }

      case "DEALS": {
        const deals = await fetchDeals();
        rawData = deals || [];
        columns = ["name", "stage", "amount", "owner", "closeDate", "createdAt", "companyName"];
        break;
      }

      case "PROJECTS": {
        const projects = await getProjects();
        rawData = projects || [];
        columns = ["name", "client", "status", "progress", "startDate", "endDate", "memberCount"];
        break;
      }

      case "INVOICES": {
        const invoices = await getInvoices({ 
          status: status !== "ALL" ? status : undefined,
          search: search || undefined 
        });
        rawData = invoices || [];
        columns = ["invoiceNumber", "clientName", "totalAmount", "status", "dueDate", "createdAt"];
        break;
      }

      case "EXPENSES": {
        const expenses = await fetchExpenses({
          status: status !== "ALL" ? status : undefined,
          startDate,
          endDate,
        });
        rawData = expenses || [];
        columns = ["category", "amount", "description", "status", "expenseDate", "submittedBy"];
        break;
      }

      case "CAMPAIGNS": {
        const campaigns = await getCampaigns({ 
          status: status !== "ALL" ? status : undefined,
          search: search || undefined 
        });
        rawData = campaigns || [];
        columns = ["name", "channel", "budget", "status", "startDate", "endDate"];
        break;
      }

      default: {
        rawData = [];
        columns = [];
      }
    }

    // Apply client-side search for entities that don't support it
    if (search && !["LEADS", "INVOICES", "CAMPAIGNS"].includes(entityType)) {
      const searchLower = search.toLowerCase();
      rawData = rawData.filter((item) => {
        return Object.values(item).some((value) => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply date range filter (client-side)
    if (startDate || endDate) {
      rawData = rawData.filter((item) => {
        const dateField = item.createdAt || item.startDate || item.expenseDate || item.dueDate || item.closeDate;
        if (!dateField) return true;
        const itemDate = new Date(dateField);
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate && itemDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Normalize data for display
    const normalizedRows = rawData.map((item) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        if (col === "submittedBy") {
          if (item.submittedBy) {
            row[col] = typeof item.submittedBy === "object" 
              ? item.submittedBy.name || item.submittedBy.email || "—"
              : item.submittedBy;
          } else if (item.user) {
            row[col] = item.user.name || item.user.email || "—";
          } else if (item.employee) {
            row[col] = item.employee.name || item.employee.email || "—";
          } else {
            row[col] = "—";
          }
        } else if (col === "assignedTo") {
          row[col] = item.assignedTo?.name || item.assignedTo?.email || "—";
        } else if (col === "client") {
          row[col] = item.client?.name || item.clientId || "—";
        } else if (col === "memberCount") {
          row[col] = item.members?.length || item.memberCount || 0;
        } else if (col === "totalAmount" || col === "amount" || col === "budget") {
          const value = item[col] || 0;
          row[col] = typeof value === 'number' ? `₹${value.toLocaleString()}` : value;
        } else if (col === "progress") {
          row[col] = item[col] !== undefined && item[col] !== null ? `${item[col]}%` : "—";
        } else if (col === "createdAt" || col === "startDate" || col === "endDate" || 
                   col === "dueDate" || col === "closeDate" || col === "expenseDate") {
          row[col] = item[col] ? new Date(item[col]).toLocaleDateString() : "—";
        } else {
          row[col] = item[col] !== undefined && item[col] !== null ? item[col] : "—";
        }
      });
      return row;
    });

    return {
      columns,
      rows: normalizedRows,
      total: normalizedRows.length,
      entityType,
    };
  } catch (error: any) {
    console.error("Error fetching report data:", error);
    return {
      columns: [],
      rows: [],
      total: 0,
      entityType,
    };
  }
}

// ─── Helper: Get column display names ─────────────────────────────────

export function getColumnDisplayName(column: string): string {
  const displayNames: Record<string, string> = {
    name: "Name",
    email: "Email",
    company: "Company",
    status: "Status",
    source: "Source",
    createdAt: "Created Date",
    assignedTo: "Assigned To",
    stage: "Stage",
    amount: "Amount",
    owner: "Owner",
    closeDate: "Close Date",
    companyName: "Company",
    client: "Client",
    progress: "Progress",
    startDate: "Start Date",
    endDate: "End Date",
    memberCount: "Members",
    invoiceNumber: "Invoice #",
    clientName: "Client",
    totalAmount: "Total Amount",
    dueDate: "Due Date",
    category: "Category",
    description: "Description",
    expenseDate: "Date",
    submittedBy: "Submitted By",
    channel: "Channel",
    budget: "Budget",
  };
  return displayNames[column] || column.charAt(0).toUpperCase() + column.slice(1);
}

// ─── Helper: Get entity display name ──────────────────────────────────

export function getEntityDisplayName(entityType: ReportEntityType): string {
  const names: Record<ReportEntityType, string> = {
    LEADS: "Leads",
    DEALS: "Deals",
    PROJECTS: "Projects",
    INVOICES: "Invoices",
    EXPENSES: "Expenses",
    CAMPAIGNS: "Campaigns",
  };
  return names[entityType];
}