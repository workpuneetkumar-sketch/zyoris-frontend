export interface RawContactLike {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | { id?: string | number | null; name?: string | null } | null;
    companyName?: string | null;
    companyId?: string | number | null;
    position?: string | null;
    city?: string | null;
    source?: string | null;
    status?: string | null;
    assignedToId?: string | number | null;
    assignedTo?: {
        id?: string | number | null;
        name?: string | null;
        email?: string | null;
    } | null;
    tags?: unknown[] | null;
    note?: string | null;
    notes?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    [key: string]: unknown;
}

export interface NormalizedContact {
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
        id?: string;
        name?: string;
        email?: string;
    };
    tags?: string[];
    note?: string;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export function normalizeContact(raw: RawContactLike = {}): NormalizedContact {
    const companyValue = raw.company;
    const companyName =
        raw.companyName ??
        (typeof companyValue === "string" ? companyValue : companyValue?.name) ??
        raw.company ??
        "";

    const name = String(raw.name ?? "").trim() || "Unnamed Contact";
    const email = String(raw.email ?? "").trim();
    const note = String(raw.note ?? raw.notes ?? "").trim();

    return {
        ...raw,
        id: String(raw.id ?? ""),
        name,
        email,
        phone: raw.phone ? String(raw.phone) : "",
        company: companyName ? String(companyName) : "",
        companyId: raw.companyId ? String(raw.companyId) : undefined,
        position: raw.position ? String(raw.position) : "",
        city: raw.city ? String(raw.city) : "",
        source: raw.source ? String(raw.source) : "",
        status: raw.status ? String(raw.status) : "",
        assignedToId: raw.assignedToId !== undefined && raw.assignedToId !== null ? String(raw.assignedToId) : null,
        assignedTo: raw.assignedTo ? {
            id: String(raw.assignedTo.id ?? ""),
            name: String(raw.assignedTo.name ?? ""),
            email: raw.assignedTo.email ? String(raw.assignedTo.email) : undefined,
        } : undefined,
        tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
        note: note || "",
        notes: note || "",
        createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
        updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    };
}

export function normalizeContacts(rawList: RawContactLike[] = []): NormalizedContact[] {
    return rawList.map((item) => normalizeContact(item));
}
