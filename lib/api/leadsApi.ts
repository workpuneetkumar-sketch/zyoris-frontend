// lib/api/leadsApi.ts

import api from "@/lib/api/api";

import { getLeadIntelligence } from "@/lib/api/leadIntelligenceApi";

import {
    Lead,
    LeadsFilters,
    LeadsResponse,
    PER_PAGE,
    computeLeadScore,
} from "@/types/leads";

const SOFT_DELETED_LEADS_STORAGE_KEY = "zyoris-soft-deleted-leads";

function getSoftDeletedLeadIds(): string[] {
    if (typeof window === "undefined") return [];

    try {
        const stored = window.localStorage.getItem(SOFT_DELETED_LEADS_STORAGE_KEY);
        if (!stored) return [];

        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch (error) {
        console.warn("Failed to read soft-deleted lead ids:", error);
        return [];
    }
}

function persistSoftDeletedLeadIds(ids: string[]) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(SOFT_DELETED_LEADS_STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
        console.warn("Failed to persist soft-deleted lead ids:", error);
    }
}

function markLeadAsSoftDeleted(id: Lead["id"]) {
    const existing = getSoftDeletedLeadIds();
    if (!existing.includes(id)) {
        persistSoftDeletedLeadIds([...existing, id]);
    }
}

function isLeadSoftDeleted(lead: Lead): boolean {
    return Boolean(lead.deleted) || getSoftDeletedLeadIds().includes(lead.id);
}

// ── GET paginated + filtered leads ─────────────────────────

// ── Backend page-size cap (the API won't return more than this per request) ──
const BACKEND_MAX_LIMIT = 100;

export async function fetchLeads(
    page: number,
    filters: LeadsFilters,
    limit: number = PER_PAGE
): Promise<LeadsResponse> {
    // If the requested limit fits within the backend cap, do a single request.
    // Otherwise, fan out into multiple backend requests (each capped at
    // BACKEND_MAX_LIMIT) and stitch the results together client-side.
    if (limit <= BACKEND_MAX_LIMIT) {
        return _fetchLeadsPage(page, filters, limit);
    }

    // --- Multi-page stitch ---
    // Work out which backend pages correspond to the virtual page the caller
    // asked for, then fetch exactly those backend pages in parallel.
    const virtualOffset = (page - 1) * limit;          // first lead index (0-based)
    const firstBackendPage = Math.floor(virtualOffset / BACKEND_MAX_LIMIT) + 1;
    const lastBackendPage  = Math.ceil((virtualOffset + limit) / BACKEND_MAX_LIMIT);

    const results = await Promise.all(
        Array.from(
            { length: lastBackendPage - firstBackendPage + 1 },
            (_, i) => _fetchLeadsPage(firstBackendPage + i, filters, BACKEND_MAX_LIMIT)
        )
    );

    // Stitch all leads together, then slice to the exact window the caller wants
    const allLeads  = results.flatMap((r) => r.leads);
    const totalReal = results[0]?.total ?? 0;           // total comes from first page

    // Relative offset within the stitched array
    const sliceStart = virtualOffset - (firstBackendPage - 1) * BACKEND_MAX_LIMIT;
    const sliceEnd   = sliceStart + limit;

    return { leads: allLeads.slice(sliceStart, sliceEnd), total: totalReal };
}

async function _fetchLeadsPage(
    page: number,
    filters: LeadsFilters,
    limit: number
): Promise<LeadsResponse> {
    const params = {
        page,
        limit,

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

        ...(filters.dateFrom && {
            createdFrom: filters.dateFrom,
        }),

        ...(filters.dateTo && {
            createdTo: filters.dateTo,
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
    let leads: Lead[] =
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

    // Filter out deleted leads (soft delete)
    leads = leads.filter((lead: Lead) => !isLeadSoftDeleted(lead));

    // Fetch real lead scores from API for each lead
    const scoredLeads: Lead[] = await Promise.all(
        leads.map(async (lead: Lead) => {
            let score: number;
            try {
                const scoreResponse = await getLeadScore(lead.id);
                score = scoreResponse.score;
            } catch (error) {
                console.warn(`Failed to fetch score for lead ${lead.id}, falling back to computed`, error);
                score = computeLeadScore(lead);
            }
            return {
                ...lead,
                score,
            };
        })
    );

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

// ── DELETE a lead (soft delete with PATCH, falling back to frontend-only removal) ──────────────────────────────

export async function deleteLead(
    id: Lead["id"]
): Promise<{ success: boolean; message: string; localOnly?: boolean }> {
    try {
        console.log('[deleteLead] Deleting lead:', id);

        // Try soft delete with PATCH first.
        await api.patch(`/leads/update-lead/${id}`, {
            deleted: true,
        });

        markLeadAsSoftDeleted(id);
        return {
            success: true,
            message: 'Lead deleted successfully',
        };
    } catch (error: any) {
        console.warn('[deleteLead] Backend delete failed, applying frontend-only soft delete:', error.response?.data || error.message);

        // Fall back to a local-only soft delete so the lead disappears from the UI.
        markLeadAsSoftDeleted(id);
        return {
            success: true,
            message: 'Lead removed from view',
            localOnly: true,
        };
    }
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
    console.log('[fetchLeadById] Fetching lead:', leadId);
    
    try {
        const res = await api.get(`/leads/get-lead/${leadId}`);
        const lead = res.data;
        
        console.log('[fetchLeadById] Raw API response:', JSON.stringify(lead, null, 2));
        
        // Check if lead exists
        if (!lead) {
            console.error('[fetchLeadById] No lead data returned');
            throw new Error('Lead not found');
        }
        
        // Check if lead is deleted
        if (lead.deleted === true || isLeadSoftDeleted(lead)) {
            console.warn('[fetchLeadById] Lead is deleted');
            throw new Error('Lead has been deleted');
        }
        
        // Compute score if needed
        let score = lead.score;
        if (typeof score !== 'number' || score === 0) {
            score = computeLeadScore(lead);
        }
        
        // Ensure all fields are properly mapped and handle null/undefined
        const enrichedLead = {
            id: lead.id || leadId,
            name: lead.name || lead.Name || "Unnamed Lead",
            email: lead.email || lead.Email || "",
            phone: lead.phone || lead.Phone || "",
            company: lead.company || lead.Company || "",
            city: lead.city || lead.City || "",
            source: lead.source || lead.Source || "Unknown",
            status: lead.status || lead.Status || "NEW",
            score: score,
            tags: Array.isArray(lead.tags) ? lead.tags : [],
            note: lead.note || lead.Note || "",
            estimatedValue: typeof lead.estimatedValue === 'number' ? lead.estimatedValue : 0,
            assignedTo: lead.assignedTo || null,
            assignedToId: lead.assignedToId || lead.assignedTo?.id || null,
            owner: lead.owner || "Unassigned",
            ownerAvatar: lead.ownerAvatar || "",
            createdAt: lead.createdAt || lead.CreatedAt || new Date().toISOString(),
            updatedAt: lead.updatedAt || lead.UpdatedAt || new Date().toISOString(),
            organizationId: lead.organizationId || "",
            deleted: lead.deleted || false,
        };
        
        console.log('[fetchLeadById] Enriched lead:', JSON.stringify(enrichedLead, null, 2));
        return enrichedLead;
        
    } catch (error: any) {
        console.error('[fetchLeadById] Error:', error.response?.data || error.message);
        throw error;
    }
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
    console.log('[startLeadImport] File received:', {
        name: file.name,
        type: file.type,
        size: file.size,
    });
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
        const res = await api.post<LeadImportStartResponse>("/leads/import", formData);
        console.log('[startLeadImport] Response:', res.data);
        return res.data;
    } catch (error: any) {
        console.error('[startLeadImport] Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * GET /leads/import/{jobId}
 * Poll import job status and progress.
 * Handles both response shapes: { success, data: { ... } } and flat { id, status, ... }
 */
export async function getLeadImportStatus(jobId: string): Promise<LeadImportJobStatus> {
    console.log('[getLeadImportStatus] Polling job:', jobId);
    
    try {
        const res = await api.get<any>(`/leads/import/${jobId}`);
        console.log('[getLeadImportStatus] Raw response:', res.data);
        
        // Handle both response shapes
        let jobData: LeadImportJobStatus;
        
        if (res.data?.data && typeof res.data.data === 'object' && 'id' in res.data.data) {
            // Shape: { success: true, data: { id, status, ... } }
            jobData = res.data.data;
        } else if (res.data?.id) {
            // Shape: { id, status, ... } (flat)
            jobData = res.data;
        } else {
            // Fallback: try to use the whole response
            jobData = res.data;
        }
        
        // Ensure all numeric fields exist with defaults
        const result: LeadImportJobStatus = {
            id: jobData.id || jobId,
            status: jobData.status || 'PENDING',
            totalRows: jobData.totalRows ?? 0,
            processedRows: jobData.processedRows ?? 0,
            successRows: jobData.successRows ?? 0,
            failedRows: jobData.failedRows ?? 0,
            progress: jobData.progress ?? 0,
            errorCsvPath: jobData.errorCsvPath || null,
            startedAt: jobData.startedAt || null,
            completedAt: jobData.completedAt || null,
        };
        
        console.log('[getLeadImportStatus] Parsed job:', result);
        return result;
    } catch (error: any) {
        console.error('[getLeadImportStatus] Error polling:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw error;
    }
}

/**
 * GET /leads/import/{jobId}/errors
 * Download the validation error CSV. Returns a Blob.
 * Will throw if no error CSV exists (404).
 */
export async function downloadLeadImportErrors(jobId: string): Promise<Blob> {
    console.log('[downloadLeadImportErrors] Downloading errors for job:', jobId);
    
    try {
        const res = await api.get(`/leads/import/${jobId}/errors`, {
            responseType: "blob",
        });
        console.log('[downloadLeadImportErrors] Download successful');
        return res.data;
    } catch (error: any) {
        console.error('[downloadLeadImportErrors] Error downloading:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw error;
    }
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

// ── GET lead score ─────────────────────────────────────────
// Endpoint: GET /leads/get-lead-score/{leadId}
export async function getLeadScore(leadId: string): Promise<{ score: number }> {
  console.log(`[API] getLeadScore - leadId: ${leadId}`);
  try {
        const snapshot = await getLeadIntelligence(leadId);
        const score = typeof snapshot?.score?.total === "number"
            ? snapshot.score.total
            : 0;

        if (score > 0) {
            return { score };
        }

        console.warn('[API] getLeadScore - snapshot did not include a usable score, falling back to computeLeadScore');
        const lead = await fetchLeadById(leadId);
        return { score: lead.score };
  } catch (error: any) {
    console.error(`[API] getLeadScore - error:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
        const lead = await fetchLeadById(leadId);
        return { score: lead.score };
  }
}

// ── Day 2: AI Lead Assignment Recommendation & Routing Rules ──

export interface RepScoreBreakdown {
  repId: string;
  repName: string;
  totalScore: number;
  conversionScore: number;
  loadScore: number;
  matchScore: number;
  rationale: string;
  activeOpenLeads: number;
  historicalWonDeals: number;
}

export interface LeadAssignmentRecommendationResult {
  leadId: string;
  recommendedRepId: string;
  rankings: RepScoreBreakdown[];
  aiTelemetry?: any;
}

export interface AssignmentRuleConfig {
  id?: string;
  name?: string;
  strategy: "round_robin" | "load_balanced" | "ai_recommendation" | "manual";
  enabled?: boolean;
  fallbackRepId?: string;
  targetRoleIds?: string[];
}

/**
 * Endpoint: POST /leads/:id/assignment-recommendation
 * Evaluates eligible sales representatives for a lead using 3-pillar scoring + AI synthesis.
 */
export async function getLeadAssignmentRecommendation(leadId: string): Promise<LeadAssignmentRecommendationResult> {
  console.log(`[API] getLeadAssignmentRecommendation - leadId: ${leadId}`);
  try {
    const res = await api.post(`/leads/${leadId}/assignment-recommendation`, { reassign: true });
    console.log(`[API] getLeadAssignmentRecommendation response:`, res.data);
    const data = res.data?.data || res.data;
    if (!data || !data.recommendedRepId) {
      throw new Error("Invalid recommendation data received from server");
    }
    return data;
  } catch (error: any) {
    console.error(`[API] getLeadAssignmentRecommendation error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Endpoint: GET /leads/assignment-rules
 */
export async function getAssignmentRules(): Promise<AssignmentRuleConfig> {
  try {
    const res = await api.get(`/leads/assignment-rules`);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error(`[API] getAssignmentRules error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Endpoint: POST /leads/assignment-rules
 */
export async function saveAssignmentRule(config: AssignmentRuleConfig): Promise<AssignmentRuleConfig> {
  try {
    const res = await api.post(`/leads/assignment-rules`, config);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error(`[API] saveAssignmentRule error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Endpoint: POST /leads/:id/execute-assignment-rule
 */
export async function executeAssignmentRule(leadId: string, rule?: AssignmentRuleConfig): Promise<any> {
  try {
    const res = await api.post(`/leads/${leadId}/execute-assignment-rule`, { rule });
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error(`[API] executeAssignmentRule error:`, error.response?.data || error.message);
    throw error;
  }
}

// ── Lead Share Payload ─────────────────────────────────────────────────────

export interface LeadSharePayload {
  leadId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  source?: string;
  status?: string;
  estimatedValue?: number;
  score?: number;
  assignedTo?: { name?: string; email?: string };
  tags?: string[];
  note?: string;
  shareUrl?: string;
  // any extra fields the backend may add
  [key: string]: any;
}

/**
 * GET /leads/{leadId}/share
 * Returns a structured lead share payload (name, phone, email, status etc.)
 */
export async function getLeadSharePayload(leadId: string): Promise<LeadSharePayload> {
  console.log(`[API] getLeadSharePayload - leadId: ${leadId}`);
  try {
    const res = await api.get(`/leads/${leadId}/share`);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    console.error(`[API] getLeadSharePayload error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * POST /leads/{leadId}/share/pdf
 * Export lead as PDF. Returns a Blob.
 */
export async function exportLeadAsPdf(leadId: string): Promise<Blob> {
  console.log(`[API] exportLeadAsPdf - leadId: ${leadId}`);
  try {
    const res = await api.post(
      `/leads/${leadId}/share/pdf`,
      {},
      { responseType: "blob" }
    );
    return res.data;
  } catch (error: any) {
    console.error(`[API] exportLeadAsPdf error:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Build a WhatsApp share URL from a lead share payload.
 * Opens wa.me with a pre-filled message.
 */
export function buildWhatsAppShareUrl(payload: LeadSharePayload, phone?: string): string {
  const lines: string[] = [
    `📋 *Lead Details*`,
    ``,
    `*Name:* ${payload.name || "—"}`,
  ];
  if (payload.company) lines.push(`*Company:* ${payload.company}`);
  if (payload.email) lines.push(`*Email:* ${payload.email}`);
  if (payload.phone) lines.push(`*Phone:* ${payload.phone}`);
  if (payload.city) lines.push(`*City:* ${payload.city}`);
  if (payload.source) lines.push(`*Source:* ${payload.source}`);
  if (payload.status) lines.push(`*Status:* ${payload.status}`);
  if (payload.estimatedValue && payload.estimatedValue > 0) {
    lines.push(`*Est. Value:* ₹${payload.estimatedValue.toLocaleString()}`);
  }
  if (payload.score != null) lines.push(`*Score:* ${payload.score}/100`);
  if (payload.assignedTo?.name) lines.push(`*Assigned To:* ${payload.assignedTo.name}`);
  if (payload.note) lines.push(``, `*Note:* ${payload.note}`);
  if (payload.shareUrl) lines.push(``, `🔗 ${payload.shareUrl}`);

  const text = encodeURIComponent(lines.join("\n"));
  const phoneClean = phone?.replace(/\D/g, "") || "";
  return phoneClean
    ? `https://wa.me/${phoneClean}?text=${text}`
    : `https://wa.me/?text=${text}`;
}