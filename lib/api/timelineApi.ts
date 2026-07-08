// lib/api/timelineApi.ts
// Unified Activity Timeline API (Task 3).
//
// Primary endpoint: GET /activities/timeline
// Fallback: Fetch from individual endpoints and combine

import api from "@/lib/api/api";
import {
  TimelineItem,
  TimelineResponse,
  TimelineFilters,
  TIMELINE_PAGE_SIZE,
} from "@/types/timeline";
import { fetchCalls } from "./callsApi";
import { fetchEmails } from "./emailApi";
import { getMeetings } from "./meetingsApi";
import { fetchConversations } from "./whatsappApi";
import { fetchActivities } from "./activitiesApi";

// ── Helper functions to convert to TimelineItem ───────────────────────────────

function convertCallToTimelineItem(call: any): TimelineItem {
  return {
    id: `call-${call.id}`,
    type: "call",
    title: `Call with ${call.contactName || "Contact"}`,
    description: call.notes || `Duration: ${call.duration} min, Outcome: ${call.outcome}`,
    timestamp: call.date || new Date().toISOString(),
    relatedTo: call.contactName,
    relatedToId: call.contactId,
    owner: call.loggedBy || "System",
    sourceId: call.id,
    sourceType: "call",
    metadata: {
      duration: call.duration,
      outcome: call.outcome,
    },
  };
}

function convertEmailToTimelineItem(email: any): TimelineItem {
  return {
    id: `email-${email.id}`,
    type: "email",
    title: email.subject || "Email",
    description: email.body,
    timestamp: email.sentAt || email.createdAt || new Date().toISOString(),
    relatedTo: email.to,
    owner: email.from || "System",
    sourceId: email.id,
    sourceType: "email",
    metadata: {
      status: email.status,
      to: email.to,
      from: email.from,
    },
  };
}

function convertMeetingToTimelineItem(meeting: any): TimelineItem {
  return {
    id: `meeting-${meeting.id}`,
    type: "meeting",
    title: meeting.title || "Meeting",
    description: meeting.description,
    timestamp: meeting.date || meeting.startTime || new Date().toISOString(),
    relatedTo: meeting.attendees?.map((a: any) => a.name).join(", "),
    sourceId: meeting.id,
    sourceType: "meeting",
    metadata: {
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      location: meeting.location,
      link: meeting.link || meeting.meetingLink,
      attendees: meeting.attendees?.map((a: any) => a.name),
    },
  };
}

function convertWhatsAppToTimelineItem(convo: any): TimelineItem {
  const lastMessage = convo.messages?.[convo.messages.length - 1];
  return {
    id: `whatsapp-${convo.id}`,
    type: "whatsapp",
    title: `WhatsApp with ${convo.contactName}`,
    description: lastMessage?.text || "No messages",
    timestamp: convo.updatedAt || lastMessage?.timestamp || new Date().toISOString(),
    relatedTo: convo.contactName,
    relatedToId: convo.leadId,
    sourceId: convo.id,
    sourceType: "whatsapp",
    metadata: {
      contactPhone: convo.contactPhone,
      unreadCount: convo.unreadCount,
      leadName: convo.leadName,
      leadStatus: convo.leadStatus,
    },
  };
}

function convertActivityToTimelineItem(activity: any): TimelineItem {
  const typeMap: Record<string, TimelineItem["type"]> = {
    "Task": "activity",
    "Call": "call",
    "Meeting": "meeting",
    "Email": "email",
    "Note": "note",
  };
  return {
    id: `activity-${activity.id}`,
    type: typeMap[activity.type] || "activity",
    title: activity.title || "Activity",
    description: activity.description,
    timestamp: new Date().toISOString(),
    relatedTo: activity.relatedTo || activity.relatedToCompany,
    owner: activity.owner,
    ownerAvatar: activity.ownerAvatar,
    sourceId: activity.id,
    sourceType: typeMap[activity.type] || "activity",
    metadata: {
      status: activity.status,
      priority: activity.priority,
      dueDate: activity.dueDate,
      dueTime: activity.dueTime,
    },
  };
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchTimeline(
  page: number,
  filters: TimelineFilters,
  cursor?: string,
  entityType?: string,
  entityId?: string
): Promise<TimelineResponse> {
  try {
    // First try the unified endpoint
    const params: Record<string, string | number> = {
      limit: TIMELINE_PAGE_SIZE,
    };

    if (entityType) {
      params.entityType = entityType;
    }
    if (entityId) {
      params.entityId = entityId;
    }

    if (cursor) {
      params.cursor = cursor;
    }

    if (filters.types.length > 0) {
      params.types = filters.types.join(",");
    }

    const res = await api.get("/activities/timeline", { params });
    const raw = res.data;
    const rawItems: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.items)
      ? raw.items
      : [];

    if (rawItems.length > 0) {
      const items = rawItems.map((item: unknown) => {
        const i = item as Record<string, unknown>;
        return {
          id: String(i.id ?? Math.random()),
          type: (i.type ?? "activity") as TimelineItem["type"],
          title: String(i.title ?? "Activity"),
          description: i.description ? String(i.description) : undefined,
          timestamp: String(i.timestamp ?? i.createdAt ?? new Date().toISOString()),
          relatedTo: i.relatedTo ? String(i.relatedTo) : undefined,
          owner: i.owner
            ? typeof i.owner === "object"
              ? (i.owner as { name?: string }).name
              : String(i.owner)
            : undefined,
          sourceId: String(i.id ?? ""),
          sourceType: (i.type ?? "activity") as TimelineItem["type"],
          metadata: typeof i.metadata === "object" ? (i.metadata as Record<string, unknown>) : {},
        };
      });

      const pagination = raw?.pagination as { nextCursor?: string; hasMore?: boolean } | undefined;

      return {
        items,
        total: raw?.total ?? items.length,
        hasMore: Boolean(pagination?.hasMore ?? false),
        nextCursor: pagination?.nextCursor,
      };
    }
  } catch (error) {
    console.log("Unified timeline endpoint not available, falling back to individual endpoints");
  }

  // Fallback: Fetch from individual endpoints and combine
  const allItems: TimelineItem[] = [];

  try {
    // Fetch calls
    if (!filters.types.length || filters.types.includes("call")) {
      const callsData = await fetchCalls(1);
      allItems.push(...callsData.calls.map(convertCallToTimelineItem));
    }
  } catch (e) {
    console.error("Failed to fetch calls for timeline:", e);
  }

  try {
    // Fetch emails
    if (!filters.types.length || filters.types.includes("email")) {
      const emailsData = await fetchEmails();
      allItems.push(...emailsData.emails.map(convertEmailToTimelineItem));
    }
  } catch (e) {
    console.error("Failed to fetch emails for timeline:", e);
  }

  try {
    // Fetch meetings
    if (!filters.types.length || filters.types.includes("meeting")) {
      const meetings = await getMeetings();
      allItems.push(...meetings.map(convertMeetingToTimelineItem));
    }
  } catch (e) {
    console.error("Failed to fetch meetings for timeline:", e);
  }

  try {
    // Fetch WhatsApp
    if (!filters.types.length || filters.types.includes("whatsapp")) {
      const whatsappConvos = await fetchConversations();
      allItems.push(...whatsappConvos.map(convertWhatsAppToTimelineItem));
    }
  } catch (e) {
    console.error("Failed to fetch WhatsApp for timeline:", e);
  }

  try {
    // Fetch activities
    if (!filters.types.length || filters.types.includes("activity") || filters.types.includes("note")) {
      const activitiesData = await fetchActivities(1, { tab: "All Activities", search: "", dateFrom: "", dateTo: "" });
      allItems.push(...activitiesData.activities.map(convertActivityToTimelineItem));
    }
  } catch (e) {
    console.error("Failed to fetch activities for timeline:", e);
  }

  // Apply search filter
  let filteredItems = allItems;
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredItems = filteredItems.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      (item.relatedTo && item.relatedTo.toLowerCase().includes(searchLower))
    );
  }

  // Apply date filters
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filteredItems = filteredItems.filter(item => new Date(item.timestamp) >= fromDate);
  }
  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredItems = filteredItems.filter(item => new Date(item.timestamp) <= toDate);
  }

  // Apply owner filter
  if (filters.owner) {
    const ownerLower = filters.owner.toLowerCase();
    filteredItems = filteredItems.filter(item =>
      item.owner && item.owner.toLowerCase().includes(ownerLower)
    );
  }

  // Sort by timestamp (newest first)
  filteredItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Pagination
  const start = (page - 1) * TIMELINE_PAGE_SIZE;
  const end = start + TIMELINE_PAGE_SIZE;
  const paginatedItems = filteredItems.slice(start, end);
  const hasMore = end < filteredItems.length;

  return {
    items: paginatedItems,
    total: filteredItems.length,
    hasMore,
  };
}
