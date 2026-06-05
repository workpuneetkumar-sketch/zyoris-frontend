// lib/api/contactsApi.ts
// All network calls for the Contacts module.
// Uses the shared axios instance — handles auth, token refresh, and logout.
//
// Endpoints confirmed against deployed Swagger at https://zyoris.onrender.com/docs
// Section: Contact — all routes are prefixed /api/contact/

import api from "@/lib/api/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Contact {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    companyId?: string;
    position?: string;
    city?: string;
    source?: string;
    status?: string;
    assignedToId?: string | null;
    assignedTo?: {
        id: string;
        name: string;
        email?: string;
    };
    tags?: string[];
    note?: string;
    createdAt: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface ContactsFilters {
    status: string;
    source: string;
    search: string;
}

export interface ContactsResponse {
    contacts: Contact[];
    total: number;
}

export const DEFAULT_CONTACTS_FILTERS: ContactsFilters = {
    status: "All Status",
    source: "All Sources",
    search: "",
};

export const CONTACTS_PER_PAGE = 10;

// ── GET paginated contacts ────────────────────────────────────────────────────
// Swagger: GET /api/contact/get-contacts

export async function fetchContacts(
    page: number,
    filters: ContactsFilters
): Promise<ContactsResponse> {
    const params: Record<string, string | number> = {
        page,
        limit: CONTACTS_PER_PAGE,
    };

    if (filters.status !== "All Status") params.status = filters.status;
    if (filters.source !== "All Sources") params.source = filters.source;
    if (filters.search) params.search = filters.search;

    const res = await api.get("/api/contact/get-contacts", { params });

    // Normalise response shape — handle array, { data, pagination }, { contacts, total }
    const raw = res.data;
    if (Array.isArray(raw)) {
        return { contacts: raw, total: raw.length };
    }
    if (Array.isArray(raw.data)) {
        return {
            contacts: raw.data,
            total: raw.pagination?.total ?? raw.data.length,
        };
    }
    if (Array.isArray(raw.contacts)) {
        return { contacts: raw.contacts, total: raw.total ?? raw.contacts.length };
    }
    return { contacts: [], total: 0 };
}

// ── POST create contact ───────────────────────────────────────────────────────
// Swagger: POST /api/contact/create

export async function createContact(data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    companyId?: string;
    position?: string;
    city?: string;
    source?: string;
    status?: string;
    assignedToId?: string | null;
    tags?: string[];
    note?: string;
}): Promise<Contact> {
    const res = await api.post<Contact>("/api/contact/create", {
        ...data,
        assignedToId: data.assignedToId?.trim() || null,
    });
    return res.data;
}

// ── PATCH update contact ──────────────────────────────────────────────────────
// Swagger: PATCH /api/contact/update-contact/{id}

export async function updateContact(
    id: string,
    data: Partial<Contact>
): Promise<Contact> {
    const res = await api.patch<Contact>(`/api/contact/update-contact/${id}`, data);
    return res.data;
}

// ── DELETE contact ────────────────────────────────────────────────────────────
// Swagger: DELETE /api/contact/delete-contact/{id}

export async function deleteContact(id: string): Promise<void> {
    await api.delete(`/api/contact/delete-contact/${id}`);
}

// ── GET single contact ────────────────────────────────────────────────────────
// Swagger: GET /api/contact/get-contact/{id}

export async function fetchContactById(id: string): Promise<Contact> {
    const res = await api.get<Contact>(`/api/contact/get-contact/${id}`);
    return res.data;
}
