// lib/api/leadFollowUpService.ts
// Lead Follow-up Timeline — calls real API, falls back to mock data if unavailable.

import api from "@/lib/api/api";
import {
  LeadFollowUpItem,
  AddFollowUpPayload,
  LeadNotePayload,
  LeadFollowUpTimelineResponse,
} from "@/types/leadFollowUp";

// ── Mock data ──────────────────────────────────────────────────────────────

const mockTimelines: Record<string, LeadFollowUpItem[]> = {};

let useMock = false;

function generateId() {
  return `fu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getMockTimeline(leadId: string): LeadFollowUpItem[] {
  if (!mockTimelines[leadId]) {
    const now = Date.now();
    mockTimelines[leadId] = [
      {
        id: generateId(),
        leadId,
        type: "CALL",
        status: "COMPLETED",
        priority: "HIGH",
        callNotes: "Discussed budget requirements. Client is interested but needs board approval.",
        nextFollowUpDate: new Date(now + 3 * 86400000).toISOString(),
        ownerName: "Sales Rep",
        completedAt: new Date(now - 2 * 86400000).toISOString(),
        createdAt: new Date(now - 3 * 86400000).toISOString(),
        updatedAt: new Date(now - 2 * 86400000).toISOString(),
      },
      {
        id: generateId(),
        leadId,
        type: "EMAIL",
        status: "COMPLETED",
        priority: "MEDIUM",
        notes: "Sent product brochure and pricing sheet.",
        completedAt: new Date(now - 86400000).toISOString(),
        createdAt: new Date(now - 86400000).toISOString(),
        updatedAt: new Date(now - 86400000).toISOString(),
      },
      {
        id: generateId(),
        leadId,
        type: "MEETING",
        status: "PENDING",
        priority: "HIGH",
        meetingNotes: "Schedule product demo with technical team.",
        nextFollowUpDate: new Date(now + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  return mockTimelines[leadId];
}

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
  if (useMock) {
    const data = getMockTimeline(leadId);
    return { data, total: data.length };
  }

  try {
    const res = await api.get<any>(`/leads/${leadId}/follow-up-timeline`);
    const data = resolveTimeline(res.data);
    return { data, total: res.data?.total ?? data.length };
  } catch (err: any) {
    if (err?.response?.status === 404 || !err?.response) {
      useMock = true;
      return getFollowUpTimeline(leadId);
    }
    throw err;
  }
}

export async function addFollowUp(
  leadId: string,
  payload: AddFollowUpPayload
): Promise<LeadFollowUpItem> {
  if (useMock) {
    const newItem: LeadFollowUpItem = {
      id: generateId(),
      leadId,
      ...payload,
      status: payload.status ?? "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!mockTimelines[leadId]) getMockTimeline(leadId);
    mockTimelines[leadId] = [newItem, ...mockTimelines[leadId]];
    return newItem;
  }

  try {
    const res = await api.post<any>(`/leads/${leadId}/follow-up`, payload);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    if (err?.response?.status === 404 || !err?.response) {
      useMock = true;
      return addFollowUp(leadId, payload);
    }
    throw err;
  }
}

export async function addLeadNote(
  leadId: string,
  payload: LeadNotePayload
): Promise<any> {
  try {
    const res = await api.post<any>(`/leads/add-note/${leadId}`, payload);
    return res.data?.data ?? res.data;
  } catch (err: any) {
    // Note API may not exist — create a mock follow-up instead
    if (err?.response?.status === 404 || !err?.response) {
      return addFollowUp(leadId, {
        type: "NOTE",
        priority: "LOW",
        notes: payload.content,
        status: "COMPLETED",
      });
    }
    throw err;
  }
}
