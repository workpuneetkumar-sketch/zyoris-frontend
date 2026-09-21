// lib/api/contactsApi.ts
// Network calls for the Contacts module.
// Strictly aligned with Swagger API spec & live backend routes (/api/customers / /api/contact/create)

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

/** Utility to check if a string matches a CUID, MongoDB ObjectId, or UUID format */
function isValidId(str?: string): boolean {
    if (!str) return false;
    const s = str.trim();
    return /^(cm[a-z0-9]{20,}|[a-f0-9]{24}|[a-f0-9-]{36})$/i.test(s);
}

// ── GET paginated contacts ────────────────────────────────────────────────────
// Tries Swagger route GET /api/contact/get-contacts, with fallbacks to /api/contacts and /api/customers

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
        "/api/customers",
    ];

    for (const url of endpoints) {
        try {
            const res = await api.get(url, { params });
            const raw = res.data;
            let list: any[] = [];
            let totalCount = 0;

            if (Array.isArray(raw)) {
                list = raw;
                totalCount = raw.length;
            } else if (Array.isArray(raw?.data)) {
                list = raw.data;
                totalCount = raw.pagination?.total ?? raw.total ?? raw.data.length;
            } else if (Array.isArray(raw?.contacts)) {
                list = raw.contacts;
                totalCount = raw.total ?? raw.contacts.length;
            } else if (Array.isArray(raw?.items)) {
                list = raw.items;
                totalCount = raw.total ?? raw.items.length;
            }

            const contacts: Contact[] = list.map((item: any) => ({
                id: item.id || item.customerId || String(Math.random()),
                name: item.name || item.fullName || "Unnamed Contact",
                email: item.email || "",
                phone: item.phone || item.normalizedPhone || "",
                company: typeof item.company === "string" ? item.company : (item.company?.name || item.companyName || ""),
                companyId: item.companyId || (typeof item.company === "object" ? item.company?.id : undefined),
                position: item.position || item.title || item.designation || "",
                city: item.city || "",
                source: item.source || item.preferredChannel || "",
                status: item.status || item.lifecycleState || "Active",
                notes: item.notes || item.note || "",
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: item.updatedAt,
            }));

            return { contacts, total: totalCount };
        } catch (err: any) {
            if (err?.response?.status === 404) {
                continue; // Try next endpoint
            }
            throw err;
        }
    }

    return { contacts: [], total: 0 };
}

// ── POST create contact ───────────────────────────────────────────────────────
// Tries Swagger POST /api/contact/create with fallbacks to /api/contacts/create, /api/contacts, and /api/customers

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

    // Sanitize companyId vs company text
    const givenCompanyId = data.companyId?.trim();
    const givenCompanyText = data.company?.trim();

    if (givenCompanyId && isValidId(givenCompanyId)) {
        payload.companyId = givenCompanyId;
    } else if (givenCompanyText) {
        if (isValidId(givenCompanyText)) {
            payload.companyId = givenCompanyText;
        } else {
            payload.company = givenCompanyText;
            payload.companyName = givenCompanyText;
        }
    }

    if (data.position?.trim()) payload.position = data.position.trim();
    if (data.city?.trim()) payload.city = data.city.trim();
    if (data.source?.trim()) payload.source = data.source.trim();
    if (data.status?.trim()) payload.status = data.status.trim();

    const notesVal = data.notes?.trim() || data.note?.trim();
    if (notesVal) payload.notes = notesVal;

    const endpoints = [
        "/api/contact/create",
        "/api/contacts/create",
        "/api/contacts",
        "/api/customers",
    ];

    let lastError: any = null;
    for (const url of endpoints) {
        try {
            const res = await api.post(url, payload);
            const raw = res.data?.data || res.data;
            return {
                id: raw.id || raw.customerId || String(Math.random()),
                name: raw.name || data.name,
                email: raw.email || data.email || "",
                phone: raw.phone || data.phone || "",
                company: typeof raw.company === "string" ? raw.company : (raw.company?.name || data.company || ""),
                companyId: raw.companyId || payload.companyId,
                position: raw.position || data.position || "",
                city: raw.city || data.city || "",
                source: raw.source || data.source || "",
                status: raw.status || data.status || "Active",
                notes: raw.notes || notesVal || "",
                createdAt: raw.createdAt || new Date().toISOString(),
            };
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

    if (data.name?.trim()) payload.name = data.name.trim();
    if (data.email?.trim()) payload.email = data.email.trim();
    if (data.phone?.trim()) payload.phone = data.phone.trim();

    const cId = data.companyId?.trim();
    const cText = (data.company as string)?.trim();
    if (cId && isValidId(cId)) {
        payload.companyId = cId;
    } else if (cText) {
        if (isValidId(cText)) {
            payload.companyId = cText;
        } else {
            payload.company = cText;
            payload.companyName = cText;
        }
    }

    if (data.position?.trim()) payload.position = data.position.trim();
    if (data.city?.trim()) payload.city = data.city.trim();
    if (data.source?.trim()) payload.source = data.source.trim();
    if (data.status?.trim()) payload.status = data.status.trim();

    const notesVal = (data.notes || data.note)?.trim();
    if (notesVal) payload.notes = notesVal;

    const endpoints = [
        `/api/contact/update-contact/${id}`,
        `/api/contacts/update-contact/${id}`,
        `/api/contacts/${id}`,
        `/api/customers/${id}`,
    ];

    let lastError: any = null;
    for (const url of endpoints) {
        try {
            const res = await api.patch(url, payload);
            const raw = res.data?.data || res.data;
            return raw as Contact;
        } catch (err: any) {
            lastError = err;
            if (err?.response?.status === 404) {
                continue;
            }
            if (err?.response?.status === 405) {
                try {
                    const putRes = await api.put(url, payload);
                    return (putRes.data?.data || putRes.data) as Contact;
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
        `/api/customers/${id}`,
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
        `/api/customers/${id}`,
    ];

    let lastError: any = null;
    for (const url of endpoints) {
        try {
            const res = await api.get(url);
            const raw = res.data?.data || res.data;
            return raw as Contact;
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



