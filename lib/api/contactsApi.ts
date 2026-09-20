// lib/api/contactsApi.ts
// Network calls for the Contacts module.
// Strictly aligned with Swagger API spec at POST /api/contact/create

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
    notes?: string;
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

    if (filters.status && filters.status !== "All Status") params.status = filters.status;
    if (filters.source && filters.source !== "All Sources") params.source = filters.source;
    if (filters.search) params.search = filters.search;

    try {
        const res = await api.get("/api/contact/get-contacts", { params });
        const raw = res.data;
        if (Array.isArray(raw)) {
            return { contacts: raw, total: raw.length };
        }
        if (Array.isArray(raw?.data)) {
            return {
                contacts: raw.data,
                total: raw.pagination?.total ?? raw.total ?? raw.data.length,
            };
        }
        if (Array.isArray(raw?.contacts)) {
            return { contacts: raw.contacts, total: raw.total ?? raw.contacts.length };
        }
        if (Array.isArray(raw?.items)) {
            return { contacts: raw.items, total: raw.total ?? raw.items.length };
        }
        return { contacts: [], total: 0 };
    } catch (err: any) {
        if (err?.response?.status === 404) {
            return { contacts: [], total: 0 };
        }
        throw err;
    }
}

// ── POST create contact ───────────────────────────────────────────────────────
// Swagger: POST /api/contact/create
// Schema: name (req), email, phone, companyId, position, city, source, status, notes

export async function createContact(data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    companyId?: string;
    position?: string;
    city?: string;
    source?: string;
    status?: string;
    note?: string;
    notes?: string;
}): Promise<Contact> {
    const payload: Record<string, any> = {
        name: data.name.trim(),
    };

    if (data.email?.trim()) payload.email = data.email.trim();
    if (data.phone?.trim()) payload.phone = data.phone.trim();

    const cId = data.companyId?.trim() || data.company?.trim();
    if (cId) payload.companyId = cId;

    if (data.position?.trim()) payload.position = data.position.trim();
    if (data.city?.trim()) payload.city = data.city.trim();
    if (data.source?.trim()) payload.source = data.source.trim();
    if (data.status?.trim()) payload.status = data.status.trim();

    const notesVal = data.notes?.trim() || data.note?.trim();
    if (notesVal) payload.notes = notesVal;

    const res = await api.post<Contact>("/api/contact/create", payload);
    return res.data;
}

// ── PATCH update contact ──────────────────────────────────────────────────────
// Swagger: PATCH /api/contact/update-contact/{id}

export async function updateContact(
    id: string,
    data: Partial<Contact>
): Promise<Contact> {
    const payload: Record<string, any> = {};

    if (data.name?.trim()) payload.name = data.name.trim();
    if (data.email?.trim()) payload.email = data.email.trim();
    if (data.phone?.trim()) payload.phone = data.phone.trim();

    const cId = (data.companyId || (data as any).company)?.trim();
    if (cId) payload.companyId = cId;

    if (data.position?.trim()) payload.position = data.position.trim();
    if (data.city?.trim()) payload.city = data.city.trim();
    if (data.source?.trim()) payload.source = data.source.trim();
    if (data.status?.trim()) payload.status = data.status.trim();

    const notesVal = (data.notes || data.note)?.trim();
    if (notesVal) payload.notes = notesVal;

    const res = await api.patch<Contact>(`/api/contact/update-contact/${id}`, payload);
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


