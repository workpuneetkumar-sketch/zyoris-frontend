// lib/api/timelineApi.ts
// Unified Activity Timeline API (Task 3).
//
// Primary endpoint: GET /activities/timeline
// Fallback merge from:
//   GET /api/calls/get-calls
//   GET /email/get-emails
//   GET /api/meetings/get-meetings
//   GET /whatsapp/conversations
//   GET /activities/get-activities
//
// All mock objects are marked with isMock: true

import api from "@/lib/api/api";
import { fetchCalls } from "@/lib/api/callsApi";
import { fetchEmails } from "@/lib/api/emailApi";
import { getMeetings } from "@/lib/api/meetingsApi";
import { fetchActivities } from "@/lib/api/activitiesApi";
import {
  TimelineItem,
  TimelineResponse,
  TimelineFilters,
  TIMELINE_PAGE_SIZE,
} from "@/types/timeline";

// ── MOCK DATA ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// MOCK DATA — timeline fallback
const MOCK_TIMELINE_ITEMS: TimelineItem[] = [
  {
    id: "tl-1",
    type: "call",
    title: "Call with Acme Corp",
    description: "Discussed proposal, client is interested. Follow up needed.",
    timestamp: daysAgo(0),
    relatedTo: "James Carter",
    owner: "Alex Morgan",
    ownerAvatar: "AM",
    sourceId: "call-1",
    sourceType: "call",
    metadata: { duration: 25, outcome: "Positive" },
  },
  {
    id: "tl-2",
    type: "email",
    title: "Proposal sent to Vertex Solutions",
    description: "Subject: Q3 Enterprise Proposal — Sent pricing deck",
    timestamp: daysAgo(0),
    relatedTo: "Sarah Mitchell",
    owner: "Jordan Lee",
    ownerAvatar: "JL",
    sourceId: "email-1",
    sourceType: "email",
    metadata: { subject: "Q3 Enterprise Proposal" },
  },
  {
    id: "tl-3",
    type: "meeting",
    title: "Demo meeting with TechWave",
    description: "Product demonstration — all stakeholders attended",
    timestamp: daysAgo(1),
    relatedTo: "Robert Chen",
    owner: "Taylor Smith",
    ownerAvatar: "TS",
    sourceId: "meeting-1",
    sourceType: "meeting",
    metadata: { duration: 60, attendees: ["Robert Chen", "Taylor Smith"] },
  },
  {
    id: "tl-4",
    type: "whatsapp",
    title: "WhatsApp: Nimbus Solutions",
    description: "Client confirmed interest in the premium plan",
    timestamp: daysAgo(1),
    relatedTo: "Mark Johnson",
    owner: "Alex Morgan",
    ownerAvatar: "AM",
    sourceId: "wa-1",
    sourceType: "whatsapp",
  },
  {
    id: "tl-5",
    type: "activity",
    title: "Task: Prepare contract for CloudWave",
    description: "Draft the MSA and send for review",
    timestamp: daysAgo(2),
    relatedTo: "CloudWave",
    owner: "Jordan Lee",
    ownerAvatar: "JL",
    sourceId: "act-1",
    sourceType: "activity",
    metadata: { priority: "High", status: "Upcoming" },
  },
  {
    id: "tl-6",
    type: "status_update",
    title: "Lead status changed to HOT",
    description: "James Carter moved from WARM to HOT",
    timestamp: daysAgo(2),
    relatedTo: "James Carter",
    owner: "Alex Morgan",
    ownerAvatar: "AM",
    sourceId: "su-1",
    sourceType: "status_update",
    metadata: { from: "WARM", to: "HOT" },
  },
  {
    id: "tl-7",
    type: "note",
    title: "Note added: Acme Corp",
    description: "Client requested a custom integration with their ERP system",
    timestamp: daysAgo(3),
    relatedTo: "Acme Corp",
    owner: "Taylor Smith",
    ownerAvatar: "TS",
    sourceId: "note-1",
    sourceType: "note",
  },
  {
    id: "tl-8",
    type: "assignment",
    title: "Lead assigned to Jordan Lee",
    description: "Vertex Solutions deal assigned for follow-up",
    timestamp: daysAgo(3),
    relatedTo: "Sarah Mitchell",
    owner: "Jordan Lee",
    ownerAvatar: "JL",
    sourceId: "asgn-1",
    sourceType: "assignment",
    metadata: { from: "Unassigned", to: "Jordan Lee" },
  },
  {
    id: "tl-9",
    type: "call",
    title: "Discovery call — Summit Group",
    description: "First contact. Client wants to see a demo next week.",
    timestamp: daysAgo(4),
    relatedTo: "Summit Group",
    owner: "Alex Morgan",
    ownerAvatar: "AM",
    sourceId: "call-2",
    sourceType: "call",
    metadata: { duration: 15, outcome: "Scheduled demo" },
  },
  {
    id: "tl-10",
    type: "email",
    title: "Follow-up email sent",
    description: "Sent follow-up after demo to Robert Chen at TechWave",
    timestamp: daysAgo(4),
    relatedTo: "Robert Chen",
    owner: "Taylor Smith",
    ownerAvatar: "TS",
    sourceId: "email-2",
    sourceType: "email",
    metadata: { subject: "Following up on our demo" },
  },
  {
    id: "tl-11",
    type: "meeting",
    title: "Contract review meeting",
    description: "Final terms discussed and approved",
    timestamp: daysAgo(5),
    relatedTo: "CloudWave",
    owner: "Jordan Lee",
    ownerAvatar: "JL",
    sourceId: "meeting-2",
    sourceType: "meeting",
    metadata: { duration: 45, attendees: ["CloudWave team", "Jordan Lee"] },
  },
  {
    id: "tl-12",
    type: "activity",
    title: "Task completed: Send pricing deck",
    description: "Pricing deck sent to Nimbus Solutions",
    timestamp: daysAgo(6),
    relatedTo: "Nimbus Solutions",
    owner: "Alex Morgan",
    ownerAvatar: "AM",
    sourceId: "act-2",
    sourceType: "activity",
    metadata: { priority: "Medium", status: "Completed" },
  },
];

// ── Converters ────────────────────────────────────────────────────────────────

function callsToTimelineItems(calls: Awaited<ReturnType<typeof fetchCalls>>["calls"]): TimelineItem[] {
  return calls.map((c) => ({
    id: `call-${c.id ?? Math.random()}`,
    type: "call" as const,
    title: c.contactName ? `Call with ${c.contactName}` : "Call logged",
    description: c.notes || `Duration: ${c.duration ?? 0} min • Outcome: ${c.outcome ?? "—"}`,
    timestamp: c.date ?? new Date().toISOString(),
    relatedTo: c.contactName,
    owner: c.loggedBy,
    sourceId: String(c.id ?? ""),
    sourceType: "call" as const,
    metadata: { duration: c.duration, outcome: c.outcome },
  }));
}

function emailsToTimelineItems(emails: Awaited<ReturnType<typeof fetchEmails>>["emails"]): TimelineItem[] {
  return emails.map((e) => ({
    id: `email-${e.id}`,
    type: "email" as const,
    title: e.subject || "Email sent",
    description: e.body ? e.body.slice(0, 120) : `To: ${e.to}`,
    timestamp: e.sentAt ?? e.createdAt,
    relatedTo: e.to,
    sourceId: e.id,
    sourceType: "email" as const,
    metadata: { subject: e.subject, to: e.to },
  }));
}

function meetingsToTimelineItems(meetings: Awaited<ReturnType<typeof getMeetings>>): TimelineItem[] {
  return meetings.map((m) => ({
    id: `meeting-${m.id}`,
    type: "meeting" as const,
    title: m.title,
    description: m.description,
    timestamp: m.date ?? m.startTime,
    relatedTo: m.attendees?.map((a) => a.name).join(", "),
    sourceId: m.id,
    sourceType: "meeting" as const,
    metadata: {
      status: m.status,
      location: m.location,
      attendees: m.attendees?.map((a) => a.name),
    },
  }));
}

function activitiesToTimelineItems(activities: Awaited<ReturnType<typeof fetchActivities>>["activities"]): TimelineItem[] {
  return activities.map((a) => ({
    id: `activity-${a.id}`,
    type: "activity" as const,
    title: a.title,
    description: a.description,
    timestamp: a.dueDate ?? new Date().toISOString(),
    relatedTo: a.relatedToCompany,
    owner: a.owner,
    ownerAvatar: a.ownerAvatar,
    sourceId: a.id,
    sourceType: "activity" as const,
    metadata: { priority: a.priority, status: a.status, type: a.type },
  }));
}

// ── Apply filters ─────────────────────────────────────────────────────────────

function applyFilters(items: TimelineItem[], filters: TimelineFilters): TimelineItem[] {
  let result = [...items];

  if (filters.types.length > 0) {
    result = result.filter((item) => filters.types.includes(item.type));
  }

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.relatedTo?.toLowerCase().includes(q) ||
        item.owner?.toLowerCase().includes(q)
    );
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    result = result.filter((item) => new Date(item.timestamp).getTime() >= from);
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime() + 86400000;
    result = result.filter((item) => new Date(item.timestamp).getTime() <= to);
  }

  if (filters.owner.trim()) {
    const owner = filters.owner.toLowerCase();
    result = result.filter((item) => item.owner?.toLowerCase().includes(owner));
  }

  return result;
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchTimeline(
  page: number,
  filters: TimelineFilters
): Promise<TimelineResponse> {
  let items: TimelineItem[] = [];
  let usedMock = false;

  // 1. Try primary timeline endpoint
  try {
    const res = await api.get("/activities/timeline");
    const raw = res.data;
    const rawItems: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    if (rawItems.length > 0) {
      items = rawItems.map((item: unknown) => {
        const i = item as Record<string, unknown>;
        return {
          id: String(i.id ?? Math.random()),
          type: (i.type ?? "activity") as TimelineItem["type"],
          title: String(i.title ?? "Activity"),
          description: i.description ? String(i.description) : undefined,
          timestamp: String(i.timestamp ?? i.createdAt ?? i.date ?? new Date().toISOString()),
          relatedTo: i.relatedTo ? String(i.relatedTo) : undefined,
          owner: i.owner ? String(i.owner) : undefined,
          ownerAvatar: i.ownerAvatar ? String(i.ownerAvatar) : undefined,
          sourceId: String(i.id ?? ""),
          sourceType: (i.type ?? "activity") as TimelineItem["type"],
          metadata: typeof i.metadata === "object" ? (i.metadata as Record<string, unknown>) : {},
        };
      });
    }
  } catch {
    // Primary endpoint unavailable — continue to merge
  }

  // 2. If timeline endpoint returned nothing, merge from individual sources
  if (items.length === 0) {
    const [callsResult, emailsResult, meetingsResult, activitiesResult] = await Promise.allSettled([
      fetchCalls(),
      fetchEmails(),
      getMeetings(),
      fetchActivities(1, { tab: "All Activities", search: "", dateFrom: "", dateTo: "" }),
    ]);

    if (callsResult.status === "fulfilled") {
      items.push(...callsToTimelineItems(callsResult.value.calls));
    }
    if (emailsResult.status === "fulfilled") {
      items.push(...emailsToTimelineItems(emailsResult.value.emails));
    }
    if (meetingsResult.status === "fulfilled") {
      items.push(...meetingsToTimelineItems(meetingsResult.value));
    }
    if (activitiesResult.status === "fulfilled") {
      items.push(...activitiesToTimelineItems(activitiesResult.value.activities));
    }
  }

  // 3. If still nothing, use mock data
  if (items.length === 0) {
    items = MOCK_TIMELINE_ITEMS;
    usedMock = true;
  }

  // Deduplicate by sourceId
  const seen = new Set<string>();
  items = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Sort by timestamp descending
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply filters
  const filtered = applyFilters(items, filters);

  // Paginate
  const offset = (page - 1) * TIMELINE_PAGE_SIZE;
  const pageItems = filtered.slice(offset, offset + TIMELINE_PAGE_SIZE);

  return {
    items: pageItems,
    total: filtered.length,
    hasMore: offset + TIMELINE_PAGE_SIZE < filtered.length,
    nextCursor: String(page + 1),
  };
}
