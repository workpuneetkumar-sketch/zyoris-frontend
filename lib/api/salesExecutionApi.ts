// lib/api/salesExecutionApi.ts
// Sales Execution API Client for 17 Endpoints across Day 1, Day 2, and Day 3

import api from "@/lib/api/api";
import {
  CapturedActivity,
  SalesActivitiesFilter,
  SalesActivitiesResponse,
  SingleActivityResponse,
  CreateSalesActivityPayload,
  MeetingPrepResponse,
  SubmitTranscriptPayload,
  MeetingIntelligenceResponse,
  SalesChannel,
  IngestActivityPayload,
  TimelineFilter,
  CreateSequencePayload,
  SequenceRecord,
  SequenceEnrollmentPayload,
  SequenceEnrollment,
  AdvanceSequenceStepPayload,
  PauseSequencePayload,
  CreatePlaybookPayload,
  PlaybookRecord,
  EvaluatePlaybookPayload,
  PlaybookEvaluationResult,
  CreateQuotePayload,
  QuoteRecord,
  ApproveQuotePayload,
  GenerateQuotePdfPayload,
  QuoteEsignPayload,
  EsignWebhookPayload,
} from "@/types/salesExecution";

// ── Day 1 — Activity + AI Intelligence ─────────────────────────────────────

/**
 * 1. POST /api/sales/activities/ingest
 * Ingest raw activity with idempotency key and event metadata.
 */
export async function ingestActivity(
  payload: IngestActivityPayload
): Promise<{ success: boolean; data: Record<string, unknown>; message?: string }> {
  try {
    const res = await api.post("/api/sales/activities/ingest", payload);
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 500) {
      // Fallback to legacy endpoint if backend route DB is initializing
      const legacyRes = await api.post("/api/sales/activities", {
        channel: payload.channel || "EMAIL",
        source: payload.source || "DIRECT",
        payload: payload.payload || { subject: payload.eventType },
        customerId: payload.customerId,
        dealId: payload.dealId,
      }).catch(() => null);
      if (legacyRes?.data) return legacyRes.data;
    }
    throw err;
  }
}

/**
 * 2. GET /api/sales/activities/timeline
 * Fetch activity timeline for an entity or global feed.
 */
export async function getActivitiesTimeline(
  filters?: TimelineFilter
): Promise<SalesActivitiesResponse> {
  const params: Record<string, string | number> = {};
  if (filters?.entityType) params.entityType = filters.entityType;
  if (filters?.entityId) params.entityId = filters.entityId;
  if (filters?.channel) params.channel = filters.channel;
  if (filters?.page) params.page = filters.page;
  if (filters?.limit) params.limit = filters.limit;

  try {
    const res = await api.get("/api/sales/activities/timeline", { params });
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 500) {
      // Fallback to GET /api/sales/activities
      const fallback = await getSalesActivities(filters as any);
      return fallback;
    }
    throw err;
  }
}

/**
 * 3. POST /api/sales/meetings/:id/prep
 * Generate meeting prep context for specific meeting ID.
 */
export async function generateMeetingPrep(
  meetingId: string,
  payload?: Record<string, unknown>
): Promise<MeetingPrepResponse> {
  try {
    const res = await api.post(`/api/sales/meetings/${meetingId}/prep`, payload || {});
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 405 || err.response?.status === 500) {
      // Fallback to GET /api/sales/meetings/:id/prep
      const getRes = await api.get(`/api/sales/meetings/${meetingId}/prep`).catch(() => null);
      if (getRes?.data) return getRes.data;
    }
    throw err;
  }
}

/**
 * 4. POST /api/sales/meetings/:id/extract
 * Submit transcript & extract intelligence for specific meeting ID.
 */
export async function extractMeetingIntelligence(
  meetingId: string,
  payload: { transcript: string; speakers?: string[]; dealId?: string; customerId?: string }
): Promise<MeetingIntelligenceResponse> {
  try {
    const res = await api.post(`/api/sales/meetings/${meetingId}/extract`, payload);
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 500) {
      // Fallback to POST /api/sales/meetings/transcript
      const legacyRes = await api.post("/api/sales/meetings/transcript", {
        meetingId,
        transcript: payload.transcript,
        dealId: payload.dealId,
        customerId: payload.customerId,
      }).catch(() => null);
      if (legacyRes?.data) return legacyRes.data;
    }
    throw err;
  }
}

/**
 * 5. GET /api/sales/meetings/:id/intelligence
 * Retrieve meeting intelligence for meeting ID.
 */
export async function getMeetingIntelligenceData(
  meetingId: string
): Promise<MeetingIntelligenceResponse> {
  const res = await api.get(`/api/sales/meetings/${meetingId}/intelligence`);
  return res.data;
}

// ── Legacy Day 1 API helpers ────────────────────────────────────────────────

export async function getSalesActivities(
  filters?: SalesActivitiesFilter
): Promise<SalesActivitiesResponse> {
  const params: Record<string, string | number> = {};
  if (filters?.channel && filters.channel !== "ALL") params.channel = filters.channel;
  if (filters?.customerId) params.customerId = filters.customerId;
  if (filters?.dealId) params.dealId = filters.dealId;
  if (filters?.contactId) params.contactId = filters.contactId;
  if (filters?.identityStatus) params.identityStatus = filters.identityStatus;
  if (filters?.page) params.page = filters.page;
  if (filters?.limit) params.limit = filters.limit;

  const res = await api.get("/api/sales/activities", { params });
  return res.data;
}

export async function getSalesActivityById(id: string): Promise<SingleActivityResponse> {
  const res = await api.get(`/api/sales/activities/${id}`);
  return res.data;
}

export async function createSalesActivity(
  payload: CreateSalesActivityPayload
): Promise<{ success: boolean; data: { activity: CapturedActivity; [key: string]: unknown } }> {
  const res = await api.post("/api/sales/activities", payload);
  return res.data;
}

export async function createSalesActivityByChannel(
  channel: SalesChannel,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data: unknown }> {
  const res = await api.post(`/api/sales/activities/${channel}`, payload);
  return res.data;
}

export async function getMeetingPrep(meetingId: string): Promise<MeetingPrepResponse> {
  const res = await api.get(`/api/sales/meetings/${meetingId}/prep`);
  return res.data;
}

export async function submitMeetingTranscript(
  payload: SubmitTranscriptPayload
): Promise<MeetingIntelligenceResponse> {
  const res = await api.post("/api/sales/meetings/transcript", payload);
  return res.data;
}

export async function getMeetingIntelligence(
  idOrMeetingId: string
): Promise<MeetingIntelligenceResponse> {
  const res = await api.get(`/api/sales/meetings/${idOrMeetingId}/intelligence`);
  return res.data;
}

// ── Day 2 — Sequences + Playbooks ──────────────────────────────────────────

/**
 * 6. POST /api/sales/sequences
 * Create a new automated outreach sequence.
 */
export async function createSequence(
  payload: CreateSequencePayload
): Promise<{ success: boolean; data: SequenceRecord; message?: string }> {
  const res = await api.post("/api/sales/sequences", payload);
  return res.data;
}

/**
 * 7. POST /api/sales/sequences/:id/enroll
 * Enroll contact/lead in sequence.
 */
export async function enrollInSequence(
  sequenceId: string,
  payload: SequenceEnrollmentPayload
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  const res = await api.post(`/api/sales/sequences/${sequenceId}/enroll`, payload);
  return res.data;
}

/**
 * 8. POST /api/sales/sequences/enrollments/:id/step
 * Execute / advance step for enrollment.
 */
export async function advanceSequenceStep(
  enrollmentId: string,
  payload?: AdvanceSequenceStepPayload
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  try {
    const res = await api.post(`/api/sales/sequences/enrollments/${enrollmentId}/step`, payload || {});
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      // Fallback endpoint
      const fb = await api.post(`/api/sales/sequences/enrollments/${enrollmentId}/advance`, payload || {}).catch(() => null);
      if (fb?.data) return fb.data;
    }
    throw err;
  }
}

/**
 * 9. PATCH /api/sales/sequences/enrollments/:id/pause
 * Pause active sequence enrollment.
 */
export async function pauseSequenceEnrollment(
  enrollmentId: string,
  payload?: PauseSequencePayload
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  try {
    const res = await api.patch(`/api/sales/sequences/enrollments/${enrollmentId}/pause`, payload || {});
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      const fb = await api.post(`/api/sales/sequences/enrollments/${enrollmentId}/pause`, payload || {}).catch(() => null);
      if (fb?.data) return fb.data;
    }
    throw err;
  }
}

/**
 * 10. POST /api/sales/playbooks
 * Create sales playbook with structured rules/steps.
 */
export async function createPlaybook(
  payload: CreatePlaybookPayload
): Promise<{ success: boolean; data: PlaybookRecord; message?: string }> {
  const res = await api.post("/api/sales/playbooks", payload);
  return res.data;
}

/**
 * 11. POST /api/sales/playbooks/evaluate
 * Evaluate playbook against deal / lead context.
 */
export async function evaluatePlaybook(
  payload: EvaluatePlaybookPayload
): Promise<{ success: boolean; data: PlaybookEvaluationResult; message?: string }> {
  try {
    const res = await api.post("/api/sales/playbooks/evaluate", payload);
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404 && payload.playbookId) {
      const fb = await api.post(`/api/sales/playbooks/${payload.playbookId}/evaluate`, payload).catch(() => null);
      if (fb?.data) return fb.data;
    }
    throw err;
  }
}

// ── Day 3 — Quotes + E-Sign ────────────────────────────────────────────────

/**
 * 12. POST /api/sales/quotes
 * Create a new deal quote with line items.
 */
export async function createQuote(
  payload: CreateQuotePayload
): Promise<{ success: boolean; data: QuoteRecord; message?: string }> {
  const res = await api.post("/api/sales/quotes", payload);
  return res.data;
}

/**
 * 13. GET /api/sales/quotes/:id
 * Retrieve quote details by ID.
 */
export async function getQuoteById(
  id: string
): Promise<{ success: boolean; data: QuoteRecord; message?: string }> {
  const res = await api.get(`/api/sales/quotes/${id}`);
  return res.data;
}

/**
 * 14. POST /api/sales/quotes/:id/approve
 * Manager approval for sales quote.
 */
export async function approveQuote(
  id: string,
  payload?: ApproveQuotePayload
): Promise<{ success: boolean; data: QuoteRecord; message?: string }> {
  const res = await api.post(`/api/sales/quotes/${id}/approve`, payload || {});
  return res.data;
}

/**
 * 15. POST /api/sales/quotes/:id/generate-pdf
 * Render PDF document for quote.
 */
export async function generateQuotePdf(
  id: string,
  payload?: GenerateQuotePdfPayload
): Promise<{ success: boolean; data: { pdfUrl: string; quote: QuoteRecord }; message?: string }> {
  const res = await api.post(`/api/sales/quotes/${id}/generate-pdf`, payload || {});
  return res.data;
}

/**
 * 16. POST /api/sales/quotes/:id/esign
 * Send quote for e-signature.
 */
export async function sendQuoteEsign(
  id: string,
  payload: QuoteEsignPayload
): Promise<{ success: boolean; data: { envelopeId: string; status: string; quote: QuoteRecord }; message?: string }> {
  try {
    const res = await api.post(`/api/sales/quotes/${id}/send-esign`, payload);
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      const fb = await api.post(`/api/sales/quotes/${id}/esign`, payload).catch(() => null);
      if (fb?.data) return fb.data;
    }
    throw err;
  }
}

/**
 * 17. POST /api/sales/esign/webhook
 * Receive e-sign provider status webhook updates.
 */
export async function triggerEsignWebhook(
  payload: EsignWebhookPayload
): Promise<{ success: boolean; data: Record<string, unknown>; message?: string }> {
  const res = await api.post("/api/sales/esign/webhook", payload);
  return res.data;
}
