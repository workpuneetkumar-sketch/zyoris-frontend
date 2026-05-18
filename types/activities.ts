// types/activities.ts

export type ActivityType = "Task" | "Call" | "Meeting" | "Email" | "Note";
export type ActivityStatus = "Upcoming" | "Completed" | "Overdue";
export type ActivityPriority = "High" | "Medium" | "Low";

export interface Activity {
    id: string;
    title: string;
    description: string;
    relatedTo: string;
    relatedToCompany: string;
    type: ActivityType;
    owner: string;
    ownerAvatar: string;
    dueDate: string;
    dueTime: string;
    status: ActivityStatus;
    priority: ActivityPriority;
}

export interface ActivityStats {
    all: number;
    allChange: number;
    upcoming: number;
    upcomingChange: number;
    completed: number;
    completedChange: number;
    overdue: number;
    overdueChange: number;
}

export interface OverdueActivity {
    id: string;
    title: string;
    company: string;
    dueDate: string;
    priority: ActivityPriority;
}

export interface ActivityTypeBreakdown {
    type: ActivityType;
    count: number;
    percentage: number;
}

export interface ActivitiesFilters {
    tab: ActivityType | "All Activities";
    search: string;
    dateFrom: string;
    dateTo: string;
}

export interface ActivitiesResponse {
    activities: Activity[];
    total: number;
    stats: ActivityStats;
    overdue: OverdueActivity[];
    breakdown: ActivityTypeBreakdown[];
}

export const DEFAULT_FILTERS: ActivitiesFilters = {
    tab: "All Activities",
    search: "",
    dateFrom: "",
    dateTo: "",
};

export const PER_PAGE = 10;