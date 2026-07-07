// types/timeline.ts
// Types for the Unified Activity Timeline (Task 3)

export type TimelineItemType =
  | "call"
  | "email"
  | "meeting"
  | "whatsapp"
  | "activity"
  | "note"
  | "status_update"
  | "assignment";

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  description?: string;
  timestamp: string;
  relatedTo?: string;
  relatedToId?: string;
  owner?: string;
  ownerAvatar?: string;
  metadata?: Record<string, unknown>;
  // Source tracking
  sourceId: string;
  sourceType: TimelineItemType;
}

export interface TimelineFilters {
  types: TimelineItemType[];
  search: string;
  dateFrom: string;
  dateTo: string;
  owner: string;
}

export interface TimelineResponse {
  items: TimelineItem[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface TimelineGroup {
  date: string;
  label: string;
  items: TimelineItem[];
}

export const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  types: [],
  search: "",
  dateFrom: "",
  dateTo: "",
  owner: "",
};

export const TIMELINE_ITEM_LABELS: Record<TimelineItemType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  whatsapp: "WhatsApp",
  activity: "Activity",
  note: "Note",
  status_update: "Status Update",
  assignment: "Assignment",
};

export const TIMELINE_PAGE_SIZE = 20;
