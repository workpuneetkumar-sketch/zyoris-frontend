// lib/api/leadFollowUpService.ts
// Lead Follow-up Timeline — calls real API

import api from "@/lib/api/api";
import {
  LeadFollowUpItem,
  AddFollowUpPayload,
  LeadNotePayload,
  LeadFollowUpTimelineResponse,
} from "@/types/leadFollowUp";

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveTimeline(data: any): LeadFollowUpItem[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.timeline)) return data.timeline;
  if (Array.isArray(data?.followUps)) return data.followUps;
  return [];
}

// ── API Methods ────────────────────────────────────────────────────────────

export async function getFollowUpTimeline(
  leadId: string
): Promise<LeadFollowUpTimelineResponse> {
  const res = await api.get<any>(`/leads/${leadId}/follow-up-timeline`);
  const data = resolveTimeline(res.data);
  return { data, total: res.data?.total ?? data.length };
}

export async function addFollowUp(
  leadId: string,
  payload: AddFollowUpPayload
): Promise<LeadFollowUpItem> {
  const res = await api.post<any>(`/leads/${leadId}/follow-up`, payload);
  return res.data?.data ?? res.data;
}

export async function addLeadNote(
  leadId: string,
  payload: LeadNotePayload
): Promise<any> {
  const res = await api.post<any>(`/leads/add-note/${leadId}`, payload);
  return res.data?.data ?? res.data;
}
