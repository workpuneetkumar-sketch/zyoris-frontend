// lib/api/salesExecutionApi.ts
// FE-1 Day 1: Sales Execution API Client for Activity Capture, Meeting Prep, and Meeting Intelligence

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
} from "@/types/salesExecution";

/**
 * Fetch captured sales activities with optional filtering and pagination.
 * GET /api/sales/activities
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
 * Fetch details of a single captured activity by ID.
 * GET /api/sales/activities/:id
 */
export async function getSalesActivityById(
  id: string
): Promise<SingleActivityResponse> {
  const res = await api.get(`/api/sales/activities/${id}`);
  return res.data;
}

/**
 * Ingest a sales activity across any supported channel.
 * POST /api/sales/activities
 */
export async function createSalesActivity(
  payload: CreateSalesActivityPayload
): Promise<{ success: boolean; data: { activity: CapturedActivity;[key: string]: unknown } }> {
  const res = await api.post("/api/sales/activities", payload);
  return res.data;
}

/**
 * Ingest an activity via channel-specific endpoint.
 * POST /api/sales/activities/:channel
 */
export async function createSalesActivityByChannel(
  channel: SalesChannel,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data: unknown }> {
  const res = await api.post(`/api/sales/activities/${channel}`, payload);
  return res.data;
}

/**
 * Generate/retrieve grounded meeting preparation context by meeting ID.
 * GET /api/sales/meetings/:id/prep
 */
export async function getMeetingPrep(
  meetingId: string
): Promise<MeetingPrepResponse> {
  const res = await api.get(`/api/sales/meetings/${meetingId}/prep`);
  return res.data;
}

/**
 * Ingest and process meeting transcript through AI intelligence pipeline.
 * POST /api/sales/meetings/transcript
 */
export async function submitMeetingTranscript(
  payload: SubmitTranscriptPayload
): Promise<MeetingIntelligenceResponse> {
  const res = await api.post("/api/sales/meetings/transcript", payload);
  return res.data;
}

/**
 * Retrieve structured meeting intelligence by intelligence ID or meeting ID.
 * GET /api/sales/meetings/:id/intelligence
 */
export async function getMeetingIntelligence(
  idOrMeetingId: string
): Promise<MeetingIntelligenceResponse> {
  const res = await api.get(`/api/sales/meetings/${idOrMeetingId}/intelligence`);
  return res.data;
}
