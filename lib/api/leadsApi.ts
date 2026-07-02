// app/(dashboard)/leads/_api/leadsApi.ts

import api from "@/lib/api/api";


import {
    Lead,
    LeadsFilters,
    LeadsResponse,
    PER_PAGE,
    computeLeadScore,
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

    const d = res.data;

    // Support multiple backend response shapes:
    // Shape A: { data: [...], pagination: { total } }
    // Shape B: { data: [...], total }
    // Shape C: { leads: [...], total }
    // Shape D: { data: { leads: [...], total } }
    const leads: Lead[] =
        Array.isArray(d?.data)        ? d.data :
        Array.isArray(d?.leads)       ? d.leads :
        Array.isArray(d?.data?.leads) ? d.data.leads :
        [];

    const total: number =
        typeof d?.pagination?.total === "number" ? d.pagination.total :
        typeof d?.meta?.total        === "number" ? d.meta.total :
        typeof d?.total              === "number" ? d.total :
        typeof d?.data?.total        === "number" ? d.data.total :
        leads.length; // fallback: at least show current page count

    // Ensure every lead has a non-zero score (compute client-side if backend returns 0/null)
    const scoredLeads: Lead[] = leads.map((lead: Lead) => ({
        ...lead,
        score: (typeof lead.score === "number" && lead.score > 0)
            ? lead.score
            : computeLeadScore(lead),
    }));

    return { leads: scoredLeads, total };
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
    estimatedValue?: number;
    assignedToId?: string | null;
    tags?: string[];
    note?: string;
}): Promise<Lead> {
    console.log('[API createLead] Request payload:', data);
    try {
        const res = await api.post("/leads/create-leads", {
            ...data,
            assignedToId: data.assignedToId?.trim() || null, // ← "" → null
        });
        console.log('[API createLead] API response status:', res.status);
        console.log('[API createLead] API response data:', res.data);
        return res.data;
    } catch (error: any) {
        console.error('[API createLead] API error:', error.response?.data || error.message);
        throw error;
    }
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

// ── GET team members for organization ────────────────────────

export async function fetchTeamMembers(): Promise<any> {
    const res = await api.get("/organizations/team-members");
    return res.data;
}

// ── GET single lead ────────────────────────────────────────
export async function fetchLeadById(leadId: string): Promise<any> {
    const res = await api.get(`/leads/get-lead/${leadId}`);
    const lead = res.data;
    // Ensure score is computed if backend returns 0 / null
    if (lead && (typeof lead.score !== "number" || lead.score === 0)) {
        lead.score = computeLeadScore(lead);
    }
    return lead;
}

// ── POST add note to lead ──────────────────────────────────
export async function addLeadNote(
    leadId: string,
    note: string
): Promise<any> {
    const res = await api.post(`/leads/add-note/${leadId}`, { note });
    return res.data;
}

// ── Bulk CSV import ────────────────────────────────────────

export interface LeadImportStartResponse {
    success: boolean;
    message: string;
    jobId: string;
}

export interface LeadImportJobStatus {
    id: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    progress: number;               // 0-100
    errorCsvPath: string | null;
    startedAt: string | null;
    completedAt: string | null;
}

export interface LeadImportJobResponse {
    success: boolean;
    data: LeadImportJobStatus;
}

/**
 * POST /leads/import
 * Start a background CSV lead import. Returns a jobId immediately (202).
 */
export async function startLeadImport(file: File): Promise<LeadImportStartResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<LeadImportStartResponse>("/leads/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
}

/**
 * GET /leads/import/{jobId}
 * Poll import job status and progress.
 */
export async function getLeadImportStatus(jobId: string): Promise<LeadImportJobResponse> {
    const res = await api.get<LeadImportJobResponse>(`/leads/import/${jobId}`);
    return res.data;
}

/**
 * GET /leads/import/{jobId}/errors
 * Download the validation error CSV. Returns a Blob.
 * Will throw if no error CSV exists (404).
 */
export async function downloadLeadImportErrors(jobId: string): Promise<Blob> {
    const res = await api.get(`/leads/import/${jobId}/errors`, {
        responseType: "blob",
    });
    return res.data;
}

// ── POST convert lead to deal ──────────────────────────────
// Endpoint: POST /leads/:id/convert-to-deal
// Response shape: { deal: { id, dealId, name, stage, ... } } or flat deal object

export interface ConvertToDealResponse {
    deal?: {
        id?: string;
        dealId?: string;
        [key: string]: any;
    };
    id?: string;
    dealId?: string;
    [key: string]: any;
}

export async function convertLeadToDeal(
    leadId: string
): Promise<ConvertToDealResponse> {
    console.log(`[API] convertLeadToDeal - leadId: ${leadId}`);
    try {
        const res = await api.post<ConvertToDealResponse>(
            `/leads/${leadId}/convert-to-deal`
        );
        console.log(`[API] convertLeadToDeal - full response:`, {
            status: res.status,
            statusText: res.statusText,
            data: res.data,
        });
        return res.data;
    } catch (error: any) {
        console.error(`[API] convertLeadToDeal - error:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw error;
    }
}
