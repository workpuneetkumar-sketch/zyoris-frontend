// app/(dashboard)/activities/_api/activitiesApi.ts

import {
    Activity,
    ActivitiesFilters,
    ActivitiesResponse,
    ActivityStats,
    OverdueActivity,
    ActivityTypeBreakdown,
    PER_PAGE,
} from "@/types/activities";

// ── Auth helper ───────────────────────────────────────────────────────────────
function getAuthHeaders(): HeadersInit {
    const raw = localStorage.getItem("zyoris-auth");
    const token = raw ? JSON.parse(raw).token : null;

    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

// ── Mock data (used as fallback if API not ready) ─────────────────────────────
const MOCK_STATS: ActivityStats = {
    all: 128,
    allChange: 12.5,
    upcoming: 32,
    upcomingChange: 18.4,
    completed: 78,
    completedChange: 10.7,
    overdue: 18,
    overdueChange: 5.3,
};

const MOCK_BREAKDOWN: ActivityTypeBreakdown[] = [
    { type: "Task", count: 42, percentage: 32.8 },
    { type: "Call", count: 28, percentage: 21.9 },
    { type: "Meeting", count: 24, percentage: 18.8 },
    { type: "Email", count: 20, percentage: 15.6 },
    { type: "Note", count: 14, percentage: 10.9 },
];

const MOCK_OVERDUE: OverdueActivity[] = [
    { id: "1", title: "Prepare proposal for Inspire Tech", company: "Inspire Tech", dueDate: "May 19, 2024", priority: "High" },
    { id: "2", title: "Follow up call with Nimbus Solutions", company: "Nimbus Solutions", dueDate: "May 19, 2024", priority: "Medium" },
    { id: "3", title: "Send documents to DataSoft Inc.", company: "DataSoft Inc.", dueDate: "May 20, 2024", priority: "Medium" },
];

const MOCK_ACTIVITIES: Activity[] = [
    { id: "1", title: "Follow up with Acme Corporation", description: "Discuss proposal and next steps", relatedTo: "Acme Corporation", relatedToCompany: "Acme Corporation", type: "Task", owner: "Alex Morgan", ownerAvatar: "AM", dueDate: "May 22, 2024", dueTime: "10:00 AM", status: "Upcoming", priority: "High" },
    { id: "2", title: "Call with Bright Solutions", description: "Product demo discussion", relatedTo: "Bright Solutions", relatedToCompany: "Bright Solutions", type: "Call", owner: "Jordan Lee", ownerAvatar: "JL", dueDate: "May 22, 2024", dueTime: "02:00 PM", status: "Upcoming", priority: "Medium" },
    { id: "3", title: "Meeting with OMEGA Industries", description: "Quarterly review meeting", relatedTo: "OMEGA Industries", relatedToCompany: "OMEGA Industries", type: "Meeting", owner: "Taylor Smith", ownerAvatar: "TS", dueDate: "May 23, 2024", dueTime: "11:00 AM", status: "Upcoming", priority: "High" },
    { id: "4", title: "Send proposal to Vertex Solutions", description: "Email proposal and pricing", relatedTo: "Vertex Solutions", relatedToCompany: "Vertex Solutions", type: "Email", owner: "Alex Morgan", ownerAvatar: "AM", dueDate: "May 23, 2024", dueTime: "04:00 PM", status: "Upcoming", priority: "Medium" },
    { id: "5", title: "Demo completed with NextGen Systems", description: "Product demo successfully completed", relatedTo: "NextGen Systems", relatedToCompany: "NextGen Systems", type: "Meeting", owner: "Taylor Smith", ownerAvatar: "TS", dueDate: "May 20, 2024", dueTime: "03:00 PM", status: "Completed", priority: "Low" },
    { id: "6", title: "Call with Summit Group", description: "Discuss requirements", relatedTo: "Summit Group", relatedToCompany: "Summit Group", type: "Call", owner: "Jordan Lee", ownerAvatar: "JL", dueDate: "May 19, 2024", dueTime: "10:30 AM", status: "Completed", priority: "Low" },
    { id: "7", title: "Prepare report for Acme Corporation", description: "Monthly performance report", relatedTo: "Acme Corporation", relatedToCompany: "Acme Corporation", type: "Task", owner: "Alex Morgan", ownerAvatar: "AM", dueDate: "May 17, 2024", dueTime: "05:00 PM", status: "Completed", priority: "Medium" },
    { id: "8", title: "Follow up meeting with CloudWave", description: "Contract discussion", relatedTo: "CloudWave", relatedToCompany: "CloudWave", type: "Meeting", owner: "Jordan Lee", ownerAvatar: "JL", dueDate: "May 16, 2024", dueTime: "11:30 AM", status: "Overdue", priority: "High" },
];

// ── GET paginated activities ──────────────────────────────────────────────────
export async function fetchActivities(
    page: number,
    filters: ActivitiesFilters
): Promise<ActivitiesResponse> {
    try {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(PER_PAGE),
            ...(filters.tab !== "All Activities" && { type: filters.tab }),
            ...(filters.search && { search: filters.search }),
            ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
            ...(filters.dateTo && { dateTo: filters.dateTo }),
        });

        const res = await fetch(`/activities/get-activities?${params.toString()}`, {
            headers: getAuthHeaders(),
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json() as Promise<ActivitiesResponse>;

    } catch {
        // ── Fallback to mock data if API not ready ────────────────────────────
        const filtered = MOCK_ACTIVITIES.filter((a) => {
            if (filters.tab !== "All Activities" && a.type !== filters.tab) return false;
            if (filters.search && !a.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
            return true;
        });

        const start = (page - 1) * PER_PAGE;
        return {
            activities: filtered.slice(start, start + PER_PAGE),
            total: filtered.length,
            stats: MOCK_STATS,
            overdue: MOCK_OVERDUE,
            breakdown: MOCK_BREAKDOWN,
        };
    }
}

// ── POST create activity ──────────────────────────────────────────────────────
export async function createActivity(data: Partial<Activity>): Promise<Activity> {
    const res = await fetch("/activities/create-activity", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Create failed");
    return res.json();
}

// ── PATCH update activity ─────────────────────────────────────────────────────
export async function updateActivity(id: string, data: Partial<Activity>): Promise<void> {
    const res = await fetch(`/activities/update-activity/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Update failed");
}

// ── DELETE activity ───────────────────────────────────────────────────────────
export async function deleteActivity(id: string): Promise<void> {
    const res = await fetch(`/activities/delete-activity/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Delete failed");
}