import api from "@/lib/api/api";

export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    date?: string; // ISO format, sometimes missing
    startTime: string; // ISO format
    endTime: string; // ISO format
    status?: MeetingStatus;
    attendees?: { id: string; name: string; email?: string }[];
    location?: string;
    link?: string;
    meetingLink?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CreateMeetingPayload {
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    status?: MeetingStatus;
    location?: string;
    link?: string;
}

export interface UpdateMeetingPayload extends Partial<CreateMeetingPayload> {
    status?: MeetingStatus;
}

export async function createMeeting(data: CreateMeetingPayload): Promise<Meeting> {
    const res = await api.post("/api/meetings/create", data);
    return res.data;
}

export async function getMeetings(): Promise<Meeting[]> {
    const res = await api.get("/api/meetings/get-meetings");
    if (Array.isArray(res.data)) {
        return res.data;
    }
    // Handle wrapped responses like { data: [...] } or { meetings: [...] }
    if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
    }
    if (res.data?.meetings && Array.isArray(res.data.meetings)) {
        return res.data.meetings;
    }
    return [];
}

export async function updateMeeting(id: string, data: UpdateMeetingPayload): Promise<Meeting> {
    const res = await api.patch(`/api/meetings/update-meeting/${id}`, data);
    return res.data;
}
