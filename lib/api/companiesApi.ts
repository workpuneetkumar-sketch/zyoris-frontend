// lib/api/companiesApi.ts
// All network calls for the Companies module.
// Uses the shared axios instance — handles auth, token refresh, and logout.
//
// Endpoints confirmed against deployed Swagger at https://zyoris.onrender.com/docs
// Section: Company — all routes are prefixed /api/company/

import api from "@/lib/api/api";
import type { Contact } from "@/lib/api/contactsApi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Company {
    id: string;
    name: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
    size?: string;
    revenue?: number;
    status?: string;
    description?: string;
    assignedToId?: string | null;
    assignedTo?: {
        id: string;
        name: string;
        email?: string;
    };
    contactCount?: number;
    createdAt: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CompaniesFilters {
    industry: string;
    status: string;
    search: string;
}

export interface CompaniesResponse {
    companies: Company[];
    total: number;
}

export const DEFAULT_COMPANIES_FILTERS: CompaniesFilters = {
    industry: "All Industries",
    status: "All Status",
    search: "",
};

export const COMPANIES_PER_PAGE = 10;

// ── GET paginated companies ───────────────────────────────────────────────────
// Swagger: GET /api/company/get-companies

export async function fetchCompanies(
    page: number,
    filters: CompaniesFilters
): Promise<CompaniesResponse> {
    const params: Record<string, string | number> = {
        page,
        limit: COMPANIES_PER_PAGE,
    };

    if (filters.industry !== "All Industries") params.industry = filters.industry;
    if (filters.status !== "All Status") params.status = filters.status;
    if (filters.search) params.search = filters.search;

    const res = await api.get("/api/company/get-companies", { params });

    // Normalise response shape
    const raw = res.data;
    if (Array.isArray(raw)) {
        return { companies: raw, total: raw.length };
    }
    if (Array.isArray(raw.data)) {
        return {
            companies: raw.data,
            total: raw.pagination?.total ?? raw.data.length,
        };
    }
    if (Array.isArray(raw.companies)) {
        return { companies: raw.companies, total: raw.total ?? raw.companies.length };
    }
    return { companies: [], total: 0 };
}

// ── GET contacts linked to a company ─────────────────────────────────────────
// Swagger: GET /api/company/{id}/contacts

export async function fetchCompanyContacts(companyId: string): Promise<Contact[]> {
    const res = await api.get(`/api/company/${companyId}/contacts`);
    const raw = res.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.contacts)) return raw.contacts;
    return [];
}

// ── GET single company ────────────────────────────────────────────────────────
// Swagger: GET /api/company/get-company/{id}

export async function fetchCompanyById(id: string): Promise<Company> {
    const res = await api.get<Company>(`/api/company/get-company/${id}`);
    return res.data;
}

// ── POST create company ───────────────────────────────────────────────────────
// Swagger: POST /api/company/create

export async function createCompany(data: {
    name: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
    size?: string;
    revenue?: number;
    status?: string;
    description?: string;
}): Promise<Company> {
    const res = await api.post<Company>("/api/company/create", data);
    return res.data;
}

// ── PATCH update company ──────────────────────────────────────────────────────
// Swagger: PATCH /api/company/update-company/{id}

export async function updateCompany(
    id: string,
    data: Partial<Company>
): Promise<Company> {
    const res = await api.patch<Company>(`/api/company/update-company/${id}`, data);
    return res.data;
}

// ── DELETE company ────────────────────────────────────────────────────────────
// Swagger: DELETE /api/company/delete-company/{id}

export async function deleteCompany(id: string): Promise<void> {
    await api.delete(`/api/company/delete-company/${id}`);
}
