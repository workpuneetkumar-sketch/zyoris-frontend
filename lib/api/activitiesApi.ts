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
    CALL: "Call",
    email: "Email",
    EMAIL: "Email",
    meeting: "Meeting",
    MEETING: "Meeting",
    task: "Task",
    TASK: "Task",
    whatsapp: "WhatsApp",
    WHATSAPP: "WhatsApp",
    note: "Note",
    NOTE: "Note",
    activity: "Note",
    ACTIVITY: "Note",
  };
  const type = typeMap[item.type] || "Note";
  const createdAt = item.timestamp || item.createdAt || new Date().toISOString();
  const date = new Date(createdAt);

  return {
    id: item.id,
    title: item.message || item.title || "Activity",
    description: item.message || item.description || "",
    relatedTo: item.metadata?.relatedTo || item.relatedTo || "Contact",
    relatedToCompany: item.metadata?.relatedCompany || "Company",
    type,
    owner: item.createdBy?.name || item.owner || "User",
    ownerAvatar: item.ownerAvatar || getInitials(item.createdBy?.name || item.owner || "User"),
    dueDate: date.toLocaleDateString(),
    dueTime: item.metadata?.dueTime || date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: "Upcoming",
    priority: (item.metadata?.priority as Activity["priority"]) || "Medium",
    createdAt,
  };
}

function convertCallToActivity(call: any): NormalizedActivity {
  const dateStr = call.date || call.scheduledAt || call.createdAt || new Date().toISOString();
  const date = new Date(dateStr);
  return {
    id: call.id,
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
    id: email.id,
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
    id: meeting.id,
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
    id: task.id,
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
    id: whatsapp.id,
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
  // Convert uppercase type (like "NOTE") to UI type (like "Note")
  const type = (() => {
    const t = activity.type?.toUpperCase();
    switch (t) {
      case "NOTE": return "Note";
      case "TASK": return "Task";
      case "CALL": return "Call";
      case "MEETING": return "Meeting";
      case "EMAIL": return "Email";
      case "WHATSAPP": return "WhatsApp";
      default: return "Note";
    }
  })() as ActivityType;
  return {
    id: activity.id,
    title: activity.message || activity.title || "Activity",
    description: activity.message || activity.description || "",
    relatedTo: activity.metadata?.relatedTo || "Contact",
    relatedToCompany: activity.metadata?.relatedCompany || "Company",
    type,
    owner: activity.createdBy?.name || "User",
    ownerAvatar: getInitials(activity.createdBy?.name || "User"),
    dueDate: date.toLocaleDateString(),
    dueTime: activity.metadata?.dueTime || date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: "Upcoming",
    priority: (activity.metadata?.priority as Activity["priority"]) || "Medium",
    createdAt: dateStr,
  };
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
      console.log("📊 /activities/timeline items:", items);
      if (items.length > 0) {
        items.forEach((item: any) => allActivities.push(convertTimelineItemToActivity(item)));
      }
    }
  } catch (err) {
    console.log("Primary timeline endpoint failed, using fallback");
  }

  // Always fetch all individual endpoints as well, to ensure we get all data
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
    console.log("📋 /activities/get-activities data:", data);
    console.log("📋 /activities/get-activities items:", activities);
    activities.forEach((a: any) => {
      const converted = convertActivityToActivity(a);
      console.log("🔄 Converted activity:", converted);
      allActivities.push(converted);
    });
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

  // Remove duplicates by id
  const uniqueActivities = Array.from(
    new Map(allActivities.map((a) => [a.id, a])).values()
  );
  console.log("🆔 Unique activities:", uniqueActivities);

  // Sort descending by createdAt (newest first)
  uniqueActivities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  console.log("🔽 Sorted activities:", uniqueActivities);

  // Calculate stats on all unique activities
  const all = uniqueActivities.length;
  const upcoming = uniqueActivities.filter(a => a.status === "Upcoming").length;
  const completed = uniqueActivities.filter(a => a.status === "Completed").length;
  const overdue = uniqueActivities.filter(a => a.status === "Overdue").length;
  
  const stats: ActivityStats = {
    all,
    allChange: 0,
    upcoming,
    upcomingChange: 0,
    completed,
    completedChange: 0,
    overdue,
    overdueChange: 0,
  };
  
  const overdueActivities: OverdueActivity[] = uniqueActivities
    .filter(a => a.status === "Overdue")
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      title: a.title,
      company: a.relatedToCompany,
      dueDate: a.dueDate,
      priority: a.priority,
    }));
  
  const typeCounts: Record<ActivityType, number> = {
    Task: 0,
    Call: 0,
    Meeting: 0,
    Email: 0,
    Note: 0,
    WhatsApp: 0,
  };
  
  uniqueActivities.forEach(a => {
    if (typeCounts[a.type] !== undefined) {
      typeCounts[a.type]++;
    }
  });
  
  const breakdown: ActivityTypeBreakdown[] = Object.entries(typeCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type: type as ActivityType,
      count,
      percentage: all > 0 ? Math.round((count / all) * 100) : 0,
    }));

  // Apply filters
  let filtered: NormalizedActivity[] = [...uniqueActivities];
  console.log("🧹 Before filters, filtered length:", filtered.length, "filters:", filters);
  
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
    console.log("🔍 Filtering by tab:", filters.tab);
    filtered = filtered.filter((a) => {
      console.log(`   checking activity type: ${a.type} (matches? ${a.type === filters.tab})`);
      return a.type === filters.tab;
    });
  }
  
  console.log("✅ After filters, filtered length:", filtered.length, "filtered:", filtered);
  
  // Apply pagination
  const start = (page - 1) * PER_PAGE;
  const paginated = filtered.slice(start, start + PER_PAGE);
  
  // Keep createdAt in the response since it's now an optional field in Activity type
  const finalPaginated: Activity[] = paginated;
  
  return {
    activities: finalPaginated,
    total: filtered.length,
    stats,
    overdue: overdueActivities,
    breakdown,
  };
}

// ── POST create activity ──────────────────────────────────────────────────────

export interface CreateActivityRequest {
  entityType: "LEAD" | "DEAL" | "CONTACT" | "COMPANY";
  entityId: string;
  type: "NOTE" | "TASK" | "CALL" | "MEETING" | "EMAIL";
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createActivity(data: CreateActivityRequest): Promise<{ success: boolean; data: any }> {
  const res = await api.post("/activities/create-activity", data);
  return res.data;
}

// ── DELETE activity (not in API spec, keeping for compatibility) ─────────────────

export async function deleteActivity(id: string): Promise<void> {
  try {
    await api.delete(`/activities/delete-activity/${id}`);
  } catch (error) {
    console.log("Mock delete activity");
  }
}
