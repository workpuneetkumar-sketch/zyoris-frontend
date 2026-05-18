// app/(dashboard)/leads/_api/leadsApi.ts

import api from "@/lib/api/api";

import {
    Lead,
    LeadsFilters,
    LeadsResponse,
    PER_PAGE,
} from "@/types/leads";

// ── GET paginated + filtered leads ─────────────────────────

export async function fetchLeads(
    page: number,
    filters: LeadsFilters
): Promise<LeadsResponse> {
    const params = {
        page,
        limit: PER_PAGE,

        ...(filters.status !== "All Status" && {
            status: filters.status,
        }),

        ...(filters.source !== "All Sources" && {
            source: filters.source,
        }),

        ...(filters.owner !== "All Owners" && {
            owner: filters.owner,
        }),

        ...(filters.search && {
            search: filters.search,
        }),
    };

    const res = await api.get("/leads/get-leads", {
        params,
    });

    return {
        leads: res.data.data,
        total: res.data.pagination.total,
    };
}

// ── POST create a new lead ─────────────────────────────────

export async function createLead(data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    city?: string;
    source?: string;
    status?: string;
    assignedToId?: string | null;
    tags?: string[];
    note?: string;
}): Promise<Lead> {
    const res = await api.post("/leads/create-leads", {
        ...data,
        assignedToId: data.assignedToId?.trim() || null, // ← "" → null
    });
    return res.data;
}
// ── PATCH update a lead ────────────────────────────────────

export async function updateLead(
    id: Lead["id"],
    data: Partial<Lead>
): Promise<Lead> {
    const res = await api.patch(`/leads/update-lead/${id}`, data);
    return res.data;
}

// ── POST assign a lead to a team member ───────────────────

export async function assignLead(
    leadId: Lead["id"],
    assignedToId: string
): Promise<Lead> {
    const res = await api.post(`/leads/assign-lead/${leadId}`, {
        assignedToId,
    });
    return res.data;
}


// ── PATCH soft-delete a lead ───────────────────────────────

export async function deleteLead(
    id: Lead["id"]
): Promise<void> {
    await api.patch(`/leads/update-lead/${id}`, {
        deleted: true,
    });
}

// ── GET export blob ────────────────────────────────────────

export async function exportLeadsBlob(): Promise<Blob> {
    const res = await api.get("/leads/export", {
        responseType: "blob",
    });

    return res.data;
}

// ── Utility: trigger CSV download ──────────────────────────

export function triggerBlobDownload(
    blob: Blob,
    filename: string
): void {
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = filename;

    a.click();

    URL.revokeObjectURL(url);
}