// types/leadFollowUp.ts

export type FollowUpType = "CALL" | "MEETING" | "EMAIL" | "NOTE" | "WHATSAPP" | "OTHER";
export type FollowUpStatus = "PENDING" | "COMPLETED" | "OVERDUE" | "CANCELLED";
export type FollowUpPriority = "LOW" | "MEDIUM" | "HIGH";

export interface LeadFollowUpItem {
  id: string;
  leadId: string;
  type: FollowUpType;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  notes?: string;
  callNotes?: string;
  meetingNotes?: string;
  nextFollowUpDate?: string; // ISO datetime
  completedAt?: string;
  ownerId?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddFollowUpPayload {
  type: FollowUpType;
  priority: FollowUpPriority;
  notes?: string;
  callNotes?: string;
  meetingNotes?: string;
  nextFollowUpDate?: string;
  ownerId?: string;
  status?: FollowUpStatus;
}

export interface LeadNotePayload {
  content: string;
  type?: string;
}

export interface LeadFollowUpTimelineResponse {
  data: LeadFollowUpItem[];
  total?: number;
}
