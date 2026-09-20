// lib/api/contactsApi.ts
// All network calls for the Contacts module.
// Uses the shared axios instance — handles auth, token refresh, and logout.

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

    const endpoints = [
        "/api/contact/get-contacts",
        "/api/contacts/get-contacts",
        "/api/contacts",
        "/api/contact",
        "/contacts",
    ];

    for (const url of endpoints) {
        try {
            const res = await api.get(url, { params });
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
                continue; // Try next fallback URL
            }
            throw err;
        }
    }

    return { contacts: [], total: 0 };
}

// ── POST create contact ───────────────────────────────────────────────────────

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
    notes?: string;
}): Promise<Contact> {
    const payload: Record<string, any> = {
        name: data.name.trim(),
        email: data.email.trim(),
    };

    if (data.phone?.trim()) payload.phone = data.phone.trim();
    if (data.company?.trim()) {
        payload.company = data.company.trim();
        payload.companyName = data.company.trim();
    }
    if (data.companyId?.trim()) payload.companyId = data.companyId.trim();
    if (data.position?.trim()) payload.position = data.position.trim();
    if (data.city?.trim()) payload.city = data.city.trim();
    if (data.source?.trim()) payload.source = data.source.trim();
    if (data.status?.trim()) payload.status = data.status.trim();
    if (data.assignedToId?.trim()) payload.assignedToId = data.assignedToId.trim();
    if (Array.isArray(data.tags) && data.tags.length > 0) payload.tags = data.tags;

    const noteVal = data.notes?.trim() || data.note?.trim();
    if (noteVal) {
        payload.notes = noteVal;
        payload.note = noteVal;
    }

    const endpoints = [
        "/api/contact/create",
        "/api/contacts/create",
        "/api/contacts",
        "/api/contact",
        "/contacts/create",
        "/contacts",
    ];

    let lastError: any = null;
    for (const url of endpoints) {
        try {
            const res = await api.post<Contact>(url, payload);
            return res.data;
        } catch (err: any) {
            lastError = err;
            if (err?.response?.status === 404) {
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

// ── PATCH update contact ──────────────────────────────────────────────────────

export async function updateContact(
    id: string,
    data: Partial<Contact>
): Promise<Contact> {
    const payload: Record<string, any> = {};
    Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
            payload[key] = typeof val === "string" ? val.trim() : val;
        }
    });

    if (data.note || (data as any).notes) {
        const n = (data as any).notes || data.note;
        payload.note = n;
        payload.notes = n;
    }

    const endpoints = [
        `/api/contact/update-contact/${id}`,
        `/api/contacts/update-contact/${id}`,
        `/api/contacts/${id}`,
        `/api/contact/${id}`,
        `/contacts/${id}`,
    ];

    let lastError: any = null;
    for (const url of endpoints) {
        try {
            const res = await api.patch<Contact>(url, payload);
            return res.data;
        } catch (err: any) {
            lastError = err;
            if (err?.response?.status === 404) {
                continue;
            }
            // Also try PUT if PATCH returns 405 Method Not Allowed
            if (err?.response?.status === 405) {
                try {
                    const putRes = await api.put<Contact>(url, payload);
                    return putRes.data;
                } catch (putErr) {
                    continue;
                }
            }
            throw err;
        }
    }
    throw lastError;
}

// ── DELETE contact ────────────────────────────────────────────────────────────

export async function deleteContact(id: string): Promise<void> {
    const endpoints = [
        `/api/contact/delete-contact/${id}`,
        `/api/contacts/delete-contact/${id}`,
        `/api/contacts/${id}`,
        `/api/contact/${id}`,
        `/contacts/${id}`,
    ];

    let lastError: any = null;
    for (const url of endpoints) {
        try {
            await api.delete(url);
            return;
        } catch (err: any) {
            lastError = err;
            if (err?.response?.status === 404) {
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

// ── GET single contact ────────────────────────────────────────────────────────

export async function fetchContactById(id: string): Promise<Contact> {
    const endpoints = [
        `/api/contact/get-contact/${id}`,
        `/api/contacts/get-contact/${id}`,
        `/api/contacts/${id}`,
        `/api/contact/${id}`,
        `/contacts/${id}`,
    ];

    let lastError: any = null;
    for (const url of endpoints) {
        try {
            const res = await api.get<Contact>(url);
            return res.data;
        } catch (err: any) {
            lastError = err;
            if (err?.response?.status === 404) {
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

