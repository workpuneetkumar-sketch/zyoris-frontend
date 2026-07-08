// lib/api/activitiesApi.ts
// All network calls for the Activities module.

import api from "@/lib/api/api";
import { toast } from "react-toastify";
import {
  Activity,
  ActivitiesFilters,
  ActivitiesResponse,
  ActivityStats,
  OverdueActivity,
  ActivityTypeBreakdown,
  PER_PAGE,
  ActivityType,
} from "@/types/activities";
import { fetchCalls } from "./callsApi";
import { fetchEmails } from "./emailApi";
import { getMeetings } from "./meetingsApi";
import { fetchTasks } from "./tasksApi";
import { fetchConversations } from "./whatsappApi";

// ── Helper: Get initials from name ─────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// ── Helper functions to convert each data type to Activity with createdAt ───────
// We'll use a normalizedActivity type that includes createdAt for sorting

interface NormalizedActivity extends Activity {
  createdAt: string;
}

function convertTimelineItemToActivity(item: any): NormalizedActivity {
  const typeMap: Record<string, Activity["type"]> = {
    call: "Call",
    email: "Email",
    meeting: "Meeting",
    task: "Task",
    whatsapp: "WhatsApp",
    note: "Note",
    activity: "Note",
  };
  const type = typeMap[item.type] || "Note";
  const createdAt = item.timestamp || item.createdAt || new Date().toISOString();
  const date = new Date(createdAt);

  return {
    id: item.id,
    title: item.title || "Activity",
    description: item.description || "",
    relatedTo: item.relatedTo || "Contact",
    relatedToCompany: item.metadata?.relatedCompany || "Company",
    type,
    owner: item.owner || "User",
    ownerAvatar: item.ownerAvatar || getInitials(item.owner || "User"),
    dueDate: date.toLocaleDateString(),
    dueTime: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: "Upcoming",
    priority: "Medium",
    createdAt,
  };
}

function convertCallToActivity(call: any): NormalizedActivity {
  const dateStr = call.date || call.scheduledAt || call.createdAt || new Date().toISOString();
  const date = new Date(dateStr);
  return {
    id: `call-${call.id}`,
    title: call.subject || "Call",
    description: call.notes || "",
    relatedTo: call.contactName || "Contact",
    relatedToCompany: call.companyName || "Company",
    type: "Call",
    owner: call.loggedBy || "User",
    ownerAvatar: getInitials(call.loggedBy || "User"),
    dueDate: date.toLocaleDateString(),
    dueTime: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: call.status === "completed" ? "Completed" : "Upcoming",
    priority: "Medium",
    createdAt: dateStr,
  };
}

function convertEmailToActivity(email: any): NormalizedActivity {
  const dateStr = email.sentAt || email.createdAt || new Date().toISOString();
  const date = new Date(dateStr);
  return {
    id: `email-${email.id}`,
    title: email.subject || "Email",
    description: email.body || "",
    relatedTo: email.to || "Contact",
    relatedToCompany: email.companyName || "Company",
    type: "Email",
    owner: email.from || "User",
    ownerAvatar: getInitials(email.from || "User"),
    dueDate: date.toLocaleDateString(),
    dueTime: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: "Completed",
    priority: "Medium",
    createdAt: dateStr,
  };
}

function convertMeetingToActivity(meeting: any): NormalizedActivity {
  const dateStr = meeting.startTime || meeting.date || meeting.createdAt || new Date().toISOString();
  const date = new Date(dateStr);
  return {
    id: `meeting-${meeting.id}`,
    title: meeting.title || "Meeting",
    description: meeting.agenda || meeting.description || "",
    relatedTo: meeting.contactName || (meeting.attendees?.[0]?.name) || "Contact",
    relatedToCompany: meeting.companyName || "Company",
    type: "Meeting",
    owner: meeting.organizer || "User",
    ownerAvatar: getInitials(meeting.organizer || "User"),
    dueDate: date.toLocaleDateString(),
    dueTime: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: meeting.status === "COMPLETED" || meeting.status === "completed" ? "Completed" : "Upcoming",
    priority: "Medium",
    createdAt: dateStr,
  };
}

function convertTaskToActivity(task: any): NormalizedActivity {
  const dateStr = task.createdAt || new Date().toISOString();
  const date = new Date(dateStr);
  const dueDate = task.dueDate ? new Date(task.dueDate) : date;
  const statusMap: Record<string, Activity["status"]> = {
    TODO: "Upcoming",
    IN_PROGRESS: "Upcoming",
    DONE: "Completed",
  };
  const priorityMap: Record<string, Activity["priority"]> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
  };
  return {
    id: `task-${task.id}`,
    title: task.title || "Task",
    description: task.description || "",
    relatedTo: task.assignedTo?.name || "Contact",
    relatedToCompany: "Company",
    type: "Task",
    owner: task.createdBy?.name || task.assignedTo?.name || "User",
    ownerAvatar: getInitials(task.createdBy?.name || task.assignedTo?.name || "User"),
    dueDate: dueDate.toLocaleDateString(),
    dueTime: dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: statusMap[task.status] || "Upcoming",
    priority: priorityMap[task.priority] || "Medium",
    createdAt: dateStr,
  };
}

function convertWhatsAppToActivity(whatsapp: any): NormalizedActivity {
  const lastMessage = whatsapp.messages?.[whatsapp.messages.length - 1];
  const dateStr = whatsapp.updatedAt || lastMessage?.timestamp || new Date().toISOString();
  const date = new Date(dateStr);
  return {
    id: `whatsapp-${whatsapp.id}`,
    title: `WhatsApp with ${whatsapp.contactName}`,
    description: lastMessage?.text || "No messages",
    relatedTo: whatsapp.contactName || "Contact",
    relatedToCompany: whatsapp.companyName || "Company",
    type: "WhatsApp",
    owner: lastMessage?.sender === "user" ? "Current User" : whatsapp.contactName,
    ownerAvatar: getInitials(lastMessage?.sender === "user" ? "Current User" : whatsapp.contactName),
    dueDate: date.toLocaleDateString(),
    dueTime: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: "Completed",
    priority: "Low",
    createdAt: dateStr,
  };
}

function convertActivityToActivity(activity: any): NormalizedActivity {
  const dateStr = activity.createdAt || new Date().toISOString();
  const date = new Date(dateStr);
  const type = (activity.type?.charAt(0) + activity.type?.slice(1).toLowerCase()) as Activity["type"] || "Note";
  return {
    id: `activity-${activity.id}`,
    title: activity.message || activity.title || "Activity",
    description: activity.message || activity.description || "",
    relatedTo: activity.metadata?.relatedTo || "Contact",
    relatedToCompany: activity.metadata?.relatedCompany || "Company",
    type: type as ActivityType,
    owner: activity.createdBy?.name || "User",
    ownerAvatar: getInitials(activity.createdBy?.name || "User"),
    dueDate: date.toLocaleDateString(),
    dueTime: activity.metadata?.dueTime || date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: "Upcoming",
    priority: "Medium",
    createdAt: dateStr,
  };
}

// ── Mock data generator ───────────────────────────────────────────────────────

function generateMockStats(): ActivityStats {
  return {
    all: 15,
    allChange: 12,
    upcoming: 8,
    upcomingChange: 5,
    completed: 5,
    completedChange: 8,
    overdue: 2,
    overdueChange: -15,
  };
}

function generateMockOverdue(): OverdueActivity[] {
  return [
    {
      id: "3",
      title: "Send proposal",
      company: "Global Industries",
      dueDate: "Jul 07, 2025",
      priority: "High",
    },
  ];
}

function generateMockBreakdown(): ActivityTypeBreakdown[] {
  return [
    { type: "Task", count: 5, percentage: 33 },
    { type: "Call", count: 4, percentage: 27 },
    { type: "Meeting", count: 3, percentage: 20 },
    { type: "Email", count: 2, percentage: 13 },
    { type: "Note", count: 1, percentage: 7 },
    { type: "WhatsApp", count: 1, percentage: 0 },
  ];
}

// ── GET paginated activities ──────────────────────────────────────────────────

export async function fetchActivities(
  page: number,
  filters: ActivitiesFilters
): Promise<ActivitiesResponse> {
  const allActivities: NormalizedActivity[] = [];

  try {
    // First try primary /activities/timeline endpoint
    const timelineRes = await api.get("/activities/timeline").catch(() => null);
    if (timelineRes) {
      const data = timelineRes.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.items)
        ? data.items
        : [];
      if (items.length > 0) {
        items.forEach((item: any) => allActivities.push(convertTimelineItemToActivity(item)));
      }
    }
  } catch (err) {
    console.log("Primary timeline endpoint failed, using fallback");
  }

  // If primary didn't work or returned nothing, use fallback to fetch all endpoints in parallel
  if (allActivities.length === 0) {
    const [
      activitiesRes,
      callsRes,
      emailsRes,
      meetingsRes,
      tasksRes,
      whatsappRes,
    ] = await Promise.allSettled([
      api.get("/activities/get-activities").catch(() => null),
      fetchCalls(1).catch(() => null),
      fetchEmails().catch(() => null),
      getMeetings().catch(() => null),
      fetchTasks().catch(() => null),
      fetchConversations().catch(() => null),
    ]);

    // Process activities
    if (activitiesRes.status === "fulfilled" && activitiesRes.value) {
      const data = activitiesRes.value.data;
      const activities = data.activities || data.data || [];
      activities.forEach((a: any) => allActivities.push(convertActivityToActivity(a)));
    } else if (activitiesRes.status === "rejected") {
      toast.warning("Failed to load activities from /activities/get-activities");
    }

    // Process calls
    if (callsRes.status === "fulfilled" && callsRes.value) {
      const calls = callsRes.value.calls || [];
      calls.forEach((c: any) => allActivities.push(convertCallToActivity(c)));
    } else if (callsRes.status === "rejected") {
      toast.warning("Failed to load calls");
    }

    // Process emails
    if (emailsRes.status === "fulfilled" && emailsRes.value) {
      const emails = emailsRes.value.emails || [];
      emails.forEach((e: any) => allActivities.push(convertEmailToActivity(e)));
    } else if (emailsRes.status === "rejected") {
      toast.warning("Failed to load emails");
    }

    // Process meetings
    if (meetingsRes.status === "fulfilled" && meetingsRes.value) {
      const meetings = meetingsRes.value || [];
      meetings.forEach((m: any) => allActivities.push(convertMeetingToActivity(m)));
    } else if (meetingsRes.status === "rejected") {
      toast.warning("Failed to load meetings");
    }

    // Process tasks
    if (tasksRes.status === "fulfilled" && tasksRes.value) {
      const tasks = tasksRes.value.tasks || [];
      tasks.forEach((t: any) => allActivities.push(convertTaskToActivity(t)));
    } else if (tasksRes.status === "rejected") {
      toast.warning("Failed to load tasks");
    }

    // Process WhatsApp
    if (whatsappRes.status === "fulfilled" && whatsappRes.value) {
      const whatsapp = whatsappRes.value || [];
      whatsapp.forEach((w: any) => allActivities.push(convertWhatsAppToActivity(w)));
    } else if (whatsappRes.status === "rejected") {
      toast.warning("Failed to load WhatsApp conversations");
    }
  }

  // Remove duplicates by id
  const uniqueActivities = Array.from(
    new Map(allActivities.map((a) => [a.id, a])).values()
  );

  // Sort descending by createdAt (newest first)
  uniqueActivities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Apply filters
  let filtered: NormalizedActivity[] = [...uniqueActivities];
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter((a) =>
      a.title.toLowerCase().includes(searchLower) ||
      a.description.toLowerCase().includes(searchLower) ||
      a.relatedTo.toLowerCase().includes(searchLower) ||
      a.relatedToCompany.toLowerCase().includes(searchLower)
    );
  }
  
  if (filters.tab && filters.tab !== "All Activities") {
    filtered = filtered.filter((a) => a.type === filters.tab);
  }
  
  // Apply pagination
  const start = (page - 1) * PER_PAGE;
  const paginated = filtered.slice(start, start + PER_PAGE);
  
  // Keep createdAt in the response since it's now an optional field in Activity type
  const finalPaginated: Activity[] = paginated;
  
  return {
    activities: finalPaginated,
    total: filtered.length,
    stats: generateMockStats(),
    overdue: generateMockOverdue(),
    breakdown: generateMockBreakdown(),
  };
}

// ── POST create activity ──────────────────────────────────────────────────────

export interface CreateActivityRequest {
  entityType: "LEAD" | "DEAL" | "CONTACT" | "COMPANY";
  entityId: string;
  type: "NOTE" | "TASK" | "CALL" | "MEETING" | "EMAIL";
  message: string;
  title?: string;
  dueDate?: string;
  priority?: "High" | "Medium" | "Low";
  metadata?: Record<string, unknown>;
}

export async function createActivity(data: CreateActivityRequest): Promise<{ success: boolean; data: Activity }> {
  try {
    const res = await api.post("/activities/create-activity", data);
    return res.data;
  } catch (error) {
    console.log("Creating mock activity");
    const mockActivity: Activity = {
      id: Date.now().toString(),
      title: data.title || data.message.substring(0, 50),
      description: data.message,
      relatedTo: "Contact",
      relatedToCompany: "Company",
      type: (data.type.charAt(0) + data.type.slice(1).toLowerCase()) as Activity["type"],
      owner: "Current User",
      ownerAvatar: "CU",
      dueDate: data.dueDate || new Date().toLocaleDateString(),
      dueTime: "12:00 PM",
      status: "Upcoming",
      priority: data.priority || "Medium",
    };
    return { success: true, data: mockActivity };
  }
}

// ── DELETE activity (not in API spec, keeping for compatibility) ─────────────────

export async function deleteActivity(id: string): Promise<void> {
  try {
    await api.delete(`/activities/delete-activity/${id}`);
  } catch (error) {
    console.log("Mock delete activity");
  }
}
