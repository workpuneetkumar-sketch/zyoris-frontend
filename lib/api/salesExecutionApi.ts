// lib/api/salesExecutionApi.ts
// Sales Execution API Client for Task 1, Task 2, and Task 3
// Strictly consumes real backend APIs with ZERO mock data

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
  ActivityReviewsResponse,
  ResolveReviewPayload,
  DismissReviewPayload,
  SalesProposal,
  CreateProposalPayload,
  ProposalRule,
  CreateProposalRulePayload,
  OutreachGeneratePayload,
  OutreachDraft,
  SequenceRecord,
  CreateSequencePayload,
  SequenceEnrollment,
  SequenceEnrollmentPayload,
  SequenceExecution,
  AdvanceSequenceStepPayload,
} from "@/types/salesExecution";

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// TASK 1 APIs ΓÇö Activity Capture, Reviews, Meeting Prep & Intelligence
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * POST /api/sales/activities
 * Ingest a sales activity across any supported channel.
 */
export async function createSalesActivity(
  payload: CreateSalesActivityPayload
): Promise<{ success: boolean; data: { activity: CapturedActivity; [key: string]: unknown }; message?: string }> {
  const body = {
    channel: payload.channel,
    source: payload.source || "MANUAL",
    ...(payload.externalId ? { externalId: payload.externalId } : {}),
    ...(payload.customerId ? { customerId: payload.customerId } : {}),
    ...(payload.dealId ? { dealId: payload.dealId } : {}),
    ...(payload.contactId ? { contactId: payload.contactId } : {}),
    ...(payload.leadId ? { leadId: payload.leadId } : {}),
    payload: payload.payload || {
      subject: (payload as unknown as Record<string, unknown>).subject,
      content: (payload as unknown as Record<string, unknown>).content,
      body: (payload as unknown as Record<string, unknown>).body,
      ...(payload as unknown as Record<string, unknown>).metadata as Record<string, unknown>,
    },
  };
  const res = await api.post("/api/sales/activities", body);
  return res.data;
}

/**
 * POST /api/sales/activities/:channel
 * Ingest an activity via channel-specific endpoint.
 */
export async function createSalesActivityByChannel(
  channel: SalesChannel | string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data: unknown; message?: string }> {
  const ch = typeof channel === "string" ? channel.toLowerCase() : String(channel).toLowerCase();
  const body = payload.payload ? payload : { payload, source: payload.source || "API" };
  const res = await api.post(`/api/sales/activities/${ch}`, body);
  return res.data;
}

/**
 * GET /api/sales/activities
 * Fetch captured sales activities with optional filtering and pagination.
 */
export async function getSalesActivities(
  filters?: SalesActivitiesFilter
): Promise<SalesActivitiesResponse> {
  const params: Record<string, string | number> = {};

  if (filters?.channel && filters.channel !== "ALL") {
    params.channel = filters.channel;
  }
  if (filters?.customerId) {
    params.customerId = filters.customerId;
  }
  if (filters?.dealId) {
    params.dealId = filters.dealId;
  }
  if (filters?.contactId) {
    params.contactId = filters.contactId;
  }
  if (filters?.identityStatus) {
    params.identityStatus = filters.identityStatus;
  }
  if (filters?.page) {
    params.page = filters.page;
  }
  if (filters?.limit) {
    params.limit = filters.limit;
  }

  const res = await api.get("/api/sales/activities", { params });
  return res.data;
}

/**
 * GET /api/sales/activities/:id
 * Fetch details of a single captured activity by ID.
 */
export async function getSalesActivityById(
  id: string,
  fallbackActivity?: CapturedActivity | null
): Promise<SingleActivityResponse> {
  const res = await api.get(`/api/sales/activities/${id}`);
  return res.data;
}

/**
 * GET /api/sales/activities/reviews
 * Fetch pending activity duplicate or identity reviews.
 */
export async function getActivityReviews(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ActivityReviewsResponse> {
  const res = await api.get("/api/sales/activities/reviews", { params });
  return res.data;
}

/**
 * POST /api/sales/activities/reviews/:id/resolve
 * Resolve an activity review (e.g. merge duplicate, confirm match).
 */
export async function resolveActivityReview(
  id: string,
  payload?: ResolveReviewPayload
): Promise<{ success: boolean; data: unknown; message?: string }> {
  const res = await api.post(`/api/sales/activities/reviews/${id}/resolve`, payload || {});
  return res.data;
}

/**
 * POST /api/sales/activities/reviews/:id/dismiss
 * Dismiss an activity review (e.g. mark as false positive).
 */
export async function dismissActivityReview(
  id: string,
  payload?: DismissReviewPayload
): Promise<{ success: boolean; data: unknown; message?: string }> {
  const res = await api.post(`/api/sales/activities/reviews/${id}/dismiss`, payload || {});
  return res.data;
}

/**
 * GET /api/sales/meetings/:id/prep
 * Generate/retrieve grounded meeting preparation context by meeting ID.
 */
export async function getMeetingPrep(
  meetingId: string
): Promise<MeetingPrepResponse> {
  const res = await api.get(`/api/sales/meetings/${meetingId}/prep`);
  return res.data;
}

/**
 * POST /api/sales/meetings/transcript
 * Ingest and process meeting transcript through AI intelligence pipeline.
 */
export async function submitMeetingTranscript(
  payload: SubmitTranscriptPayload
): Promise<MeetingIntelligenceResponse> {
  const res = await api.post("/api/sales/meetings/transcript", payload);
  return res.data;
}

/**
 * GET /api/sales/meetings/:id/intelligence
 * Retrieve structured meeting intelligence by intelligence ID or meeting ID.
 */
export async function getMeetingIntelligence(
  idOrMeetingId: string
): Promise<MeetingIntelligenceResponse> {
  const res = await api.get(`/api/sales/meetings/${idOrMeetingId}/intelligence`);
  return res.data;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// TASK 2 APIs ΓÇö Proposals & Rules
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * POST /api/sales/proposals
 * Create a new proposal for review and approval.
 */
export async function createProposal(
  payload: CreateProposalPayload
): Promise<{ success: boolean; data: SalesProposal; message?: string }> {
  const res = await api.post("/api/sales/proposals", payload);
  return res.data;
}

/**
 * GET /api/sales/proposals
 * List sales proposals with optional filtering by status or deal.
 */
export async function getProposals(params?: {
  status?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  dealId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: SalesProposal[]; total?: number; message?: string }> {
  const queryParams: Record<string, unknown> = {};
  if (params?.status && params.status !== "ALL") {
    queryParams.status = params.status === "PENDING_APPROVAL" ? "PENDING" : params.status;
  }
  if (params?.targetEntityType) queryParams.targetEntityType = params.targetEntityType;
  if (params?.targetEntityId) queryParams.targetEntityId = params.targetEntityId;
  else if (params?.dealId) queryParams.targetEntityId = params.dealId;
  else if (params?.customerId) queryParams.targetEntityId = params.customerId;

  if (params?.limit) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;
  else if (params?.page && params?.limit) queryParams.offset = (params.page - 1) * params.limit;

  const res = await api.get("/api/sales/proposals", { params: queryParams });
  return res.data;
}

/**
 * GET /api/sales/proposals/:id
 * Retrieve single proposal with proposed changes and audit trail.
 */
export async function getProposalById(
  id: string
): Promise<{ success: boolean; data: SalesProposal; message?: string }> {
  const res = await api.get(`/api/sales/proposals/${id}`);
  return res.data;
}

/**
 * POST /api/sales/proposals/:id/approve
 * Approve proposed changes or discounts.
 */
export async function approveProposal(
  id: string,
  payload?: { comment?: string; notes?: string }
): Promise<{ success: boolean; data: SalesProposal; message?: string }> {
  const notes = payload?.notes || payload?.comment || "Approved via CRM Proposals Workspace";
  const res = await api.post(`/api/sales/proposals/${id}/approve`, { notes });
  return res.data;
}

/**
 * POST /api/sales/proposals/:id/reject
 * Reject proposal with reason.
 */
export async function rejectProposal(
  id: string,
  payload?: { reason?: string }
): Promise<{ success: boolean; data: SalesProposal; message?: string }> {
  const reason = payload?.reason || "Rejected by reviewer";
  const res = await api.post(`/api/sales/proposals/${id}/reject`, { reason });
  return res.data;
}

/**
 * POST /api/sales/proposals/:id/apply
 * Apply approved proposal changes to live CRM deal/account records.
 */
export async function applyProposal(
  id: string,
  payload?: { force?: boolean }
): Promise<{ success: boolean; data: SalesProposal; message?: string }> {
  const res = await api.post(`/api/sales/proposals/${id}/apply`, payload || {});
  return res.data;
}

/**
 * POST /api/sales/proposals/:id/cancel
 * Cancel an open proposal.
 */
export async function cancelProposal(
  id: string,
  payload?: { reason?: string }
): Promise<{ success: boolean; data: SalesProposal; message?: string }> {
  const res = await api.post(`/api/sales/proposals/${id}/cancel`, payload || {});
  return res.data;
}

/**
 * GET /api/sales/proposals/rules
 * Fetch automated proposal approval & governance rules.
 */
export async function getProposalRules(): Promise<{
  success: boolean;
  data: ProposalRule[];
  message?: string;
}> {
  const res = await api.get("/api/sales/proposals/rules");
  return res.data;
}

/**
 * POST /api/sales/proposals/rules
 * Create a new governance / auto-approval rule for proposals.
 */
export async function createProposalRule(
  payload: CreateProposalRulePayload
): Promise<{ success: boolean; data: ProposalRule; message?: string }> {
  const targetEntityType = payload.targetEntityType || "DEAL";
  const fieldName = payload.fieldName || (payload.discountThreshold !== undefined ? "discount" : "amount");
  const riskLevel = payload.riskLevel || (payload.discountThreshold && payload.discountThreshold > 20 ? "HIGH" : "MEDIUM");
  const approvalRequirement =
    payload.approvalRequirement ||
    (payload.autoApprove ? "AUTO_APPLY" : "REQUIRES_APPROVAL");

  const body = {
    targetEntityType,
    fieldName,
    riskLevel,
    approvalRequirement,
    minConfidenceAutoApply: payload.minConfidenceAutoApply ?? 0.85,
    isActive: payload.isActive ?? true,
    description: payload.description || payload.name || payload.condition || "Approval Governance Rule",
  };

  const res = await api.post("/api/sales/proposals/rules", body);
  return res.data;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// TASK 2 APIs ΓÇö Outreach Generation & Drafts
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * POST /api/sales/outreach/generate
 * Generate grounded, personalized outreach via AI with citations and context.
 */
export async function generateOutreach(
  payload: OutreachGeneratePayload
): Promise<{ success: boolean; data: OutreachDraft; message?: string }> {
  const targetEntityType =
    payload.targetEntityType ||
    (payload.leadId ? "LEAD" : payload.dealId ? "DEAL" : payload.customerId ? "CUSTOMER" : "LEAD");
  const targetEntityId =
    payload.targetEntityId || payload.leadId || payload.dealId || payload.customerId || "";

  // Normalize tone and channel to upper case for Swagger enum compliance
  const channel = String(payload.channel || "EMAIL").toUpperCase();
  const rawTone = String(payload.tone || "PROFESSIONAL").toUpperCase();
  const validTones = ["PROFESSIONAL", "CASUAL", "PERSUASIVE", "URGENT"];
  const tone = validTones.includes(rawTone) ? rawTone : "PROFESSIONAL";

  const body = {
    targetEntityType,
    targetEntityId,
    channel,
    tone,
    objective: payload.objective || payload.goal || "Follow-up",
    ...(payload.templateId ? { templateId: payload.templateId } : {}),
    ...(payload.customPromptInstructions
      ? { customPromptInstructions: payload.customPromptInstructions }
      : payload.context?.notes
      ? { customPromptInstructions: String(payload.context.notes) }
      : {}),
  };

  const res = await api.post("/api/sales/outreach/generate", body);
  return res.data;
}

/**
 * GET /api/sales/outreach/drafts
 * List generated outreach drafts.
 */
export async function getOutreachDrafts(params?: {
  channel?: string;
  status?: string;
  leadId?: string;
  dealId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: OutreachDraft[]; message?: string }> {
  const queryParams: Record<string, unknown> = {};
  if (params?.channel && params.channel !== "ALL") queryParams.channel = params.channel;
  if (params?.status && params.status !== "ALL") queryParams.status = params.status;
  if (params?.targetEntityType) queryParams.targetEntityType = params.targetEntityType;
  if (params?.targetEntityId) queryParams.targetEntityId = params.targetEntityId;
  else if (params?.leadId) {
    queryParams.targetEntityType = "LEAD";
    queryParams.targetEntityId = params.leadId;
  } else if (params?.dealId) {
    queryParams.targetEntityType = "DEAL";
    queryParams.targetEntityId = params.dealId;
  }
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;

  const res = await api.get("/api/sales/outreach/drafts", { params: queryParams });
  return res.data;
}

/**
 * GET /api/sales/outreach/drafts/:id
 * Retrieve single outreach draft with grounded context.
 */
export async function getOutreachDraftById(
  id: string
): Promise<{ success: boolean; data: OutreachDraft; message?: string }> {
  const res = await api.get(`/api/sales/outreach/drafts/${id}`);
  return res.data;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// TASK 2 APIs ΓÇö Sequences & Cadence Management
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * POST /api/sales/sequences
 * Create a new automated outreach sequence.
 */
export async function createSequence(
  payload: CreateSequencePayload
): Promise<{ success: boolean; data: SequenceRecord; message?: string }> {
  // Normalize steps to Swagger schema: stepOrder, stepType, name, config
  const normalizedSteps = (payload.steps || []).map((s, idx) => {
    let stepType = s.stepType || "SEND_EMAIL";
    if (stepType === "EMAIL") stepType = "SEND_EMAIL";
    if (stepType === "CALL" || stepType === "TASK") stepType = "CALL_TASK";
    if (stepType === "WHATSAPP") stepType = "SEND_WHATSAPP";

    const config = s.config || {
      subject: s.subject || "",
      body: s.body || "",
      delayDays: s.delayDays ?? 0,
    };

    return {
      stepOrder: s.stepOrder || idx + 1,
      stepType,
      name: s.name || s.subject || `Step ${idx + 1}`,
      config,
    };
  });

  const body = {
    name: payload.name,
    description: payload.description || "",
    steps: normalizedSteps,
  };

  const res = await api.post("/api/sales/sequences", body);
  return res.data;
}

/**
 * GET /api/sales/sequences
 * List all automated sales sequences.
 */
export async function getSequences(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: SequenceRecord[]; total?: number; message?: string }> {
  const res = await api.get("/api/sales/sequences", { params });
  return res.data;
}

/**
 * GET /api/sales/sequences/:id
 * Retrieve sequence by ID with its configured steps.
 */
export async function getSequenceById(
  id: string
): Promise<{ success: boolean; data: SequenceRecord; message?: string }> {
  const res = await api.get(`/api/sales/sequences/${id}`);
  return res.data;
}

/**
 * POST /api/sales/sequences/:id/activate
 * Activate a sequence for new enrollments and step processing.
 */
export async function activateSequence(
  id: string
): Promise<{ success: boolean; data: SequenceRecord; message?: string }> {
  const res = await api.post(`/api/sales/sequences/${id}/activate`, {});
  return res.data;
}

/**
 * POST /api/sales/sequences/:id/pause
 * Pause an active sequence.
 */
export async function pauseSequence(
  id: string
): Promise<{ success: boolean; data: SequenceRecord; message?: string }> {
  const res = await api.post(`/api/sales/sequences/${id}/pause`, {});
  return res.data;
}

/**
 * POST /api/sales/sequences/:id/deactivate
 * Deactivate a sequence.
 */
export async function deactivateSequence(
  id: string
): Promise<{ success: boolean; data: SequenceRecord; message?: string }> {
  const res = await api.post(`/api/sales/sequences/${id}/deactivate`, {});
  return res.data;
}

/**
 * POST /api/sales/sequences/:id/archive
 * Archive an inactive sequence.
 */
export async function archiveSequence(
  id: string
): Promise<{ success: boolean; data: SequenceRecord; message?: string }> {
  const res = await api.post(`/api/sales/sequences/${id}/archive`, {});
  return res.data;
}

/**
 * POST /api/sales/sequences/:id/enroll
 * Enroll a contact or lead into a sequence.
 */
export async function enrollInSequence(
  sequenceId: string,
  payload: SequenceEnrollmentPayload
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  const targetEntityType =
    payload.targetEntityType ||
    (payload.leadId ? "LEAD" : payload.contactId ? "CONTACT" : payload.customerId ? "CUSTOMER" : payload.dealId ? "DEAL" : "LEAD");
  const targetEntityId =
    payload.targetEntityId || payload.leadId || payload.contactId || payload.customerId || payload.dealId || "";

  const body = {
    targetEntityType,
    targetEntityId,
    metadata: payload.metadata || {},
  };

  const res = await api.post(`/api/sales/sequences/${sequenceId}/enroll`, body);
  return res.data;
}

/**
 * GET /api/sales/sequences/:id/executions
 * Fetch step execution history for a sequence.
 */
export async function getSequenceExecutions(
  sequenceId: string,
  params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ success: boolean; data: SequenceExecution[]; message?: string }> {
  const res = await api.get(`/api/sales/sequences/${sequenceId}/executions`, { params });
  return res.data;
}

/**
 * GET /api/sales/sequences/enrollments
 * List all sequence enrollments.
 */
export async function getSequenceEnrollments(params?: {
  sequenceId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  status?: string;
  contactId?: string;
  leadId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: SequenceEnrollment[]; message?: string }> {
  const queryParams: Record<string, unknown> = {};
  if (params?.sequenceId) queryParams.sequenceId = params.sequenceId;
  if (params?.status && params.status !== "ALL") queryParams.status = params.status;
  if (params?.targetEntityType) queryParams.targetEntityType = params.targetEntityType;
  if (params?.targetEntityId) queryParams.targetEntityId = params.targetEntityId;
  else if (params?.leadId) {
    queryParams.targetEntityType = "LEAD";
    queryParams.targetEntityId = params.leadId;
  } else if (params?.contactId) {
    queryParams.targetEntityType = "CONTACT";
    queryParams.targetEntityId = params.contactId;
  }
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.offset !== undefined) queryParams.offset = params.offset;

  const res = await api.get("/api/sales/sequences/enrollments", { params: queryParams });
  return res.data;
}

/**
 * GET /api/sales/sequences/enrollments/:id
 * Retrieve enrollment details by ID.
 */
export async function getSequenceEnrollmentById(
  id: string
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  const res = await api.get(`/api/sales/sequences/enrollments/${id}`);
  return res.data;
}

/**
 * POST /api/sales/sequences/enrollments/:id/pause
 * Pause an individual enrollment.
 */
export async function pauseSequenceEnrollment(
  id: string,
  payload?: { pauseReason?: string }
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  const res = await api.post(`/api/sales/sequences/enrollments/${id}/pause`, payload || {});
  return res.data;
}

/**
 * POST /api/sales/sequences/enrollments/:id/resume
 * Resume a paused enrollment.
 */
export async function resumeSequenceEnrollment(
  id: string
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  const res = await api.post(`/api/sales/sequences/enrollments/${id}/resume`, {});
  return res.data;
}

/**
 * POST /api/sales/sequences/enrollments/:id/stop
 * Stop an enrollment completely.
 */
export async function stopSequenceEnrollment(
  id: string,
  payload?: { reason?: string }
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  const res = await api.post(`/api/sales/sequences/enrollments/${id}/stop`, payload || {});
  return res.data;
}

/**
 * POST /api/sales/sequences/tick
 * Trigger immediate background worker tick to process ready cadence steps.
 */
export async function tickSequence(): Promise<{
  success: boolean;
  data: { processedCount?: number; executionIds?: string[]; [key: string]: unknown };
  message?: string;
}> {
  const res = await api.post("/api/sales/sequences/tick", {});
  return res.data;
}

export async function advanceSequenceStep(
  enrollmentId: string,
  payload?: AdvanceSequenceStepPayload
): Promise<{ success: boolean; data: SequenceEnrollment; message?: string }> {
  const res = await api.post(`/api/sales/sequences/enrollments/${enrollmentId}/step`, payload || {});
  return res.data;
}
