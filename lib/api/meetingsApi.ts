import api from "@/lib/api/api";

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    date: string;
    startTime?: string;
    endTime?: string;
    participants?: string[];
    [key: string]: any;
}

export interface CreateMeetingPayload {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
}

export interface UpdateMeetingPayload extends Partial<CreateMeetingPayload> {}

export async function fetchMeetings(): Promise<{ meetings: Meeting[] }> {
    try {
        const res = await api.get("/api/meetings/get-meetings");
        if (Array.isArray(res.data)) return { meetings: res.data };
        if (res.data?.meetings) return { meetings: res.data.meetings };
        if (res.data?.data) return { meetings: res.data.data };
        return { meetings: [] };
    } catch (error: any) {
        if (error.response?.status === 404) return { meetings: [] };
        throw error;
    }
}

export async function createMeeting(data: CreateMeetingPayload): Promise<Meeting> {
    const res = await api.post("/api/meetings/create", data);
    return res.data;
}

export async function updateMeeting(id: string, data: UpdateMeetingPayload): Promise<Meeting> {
    const res = await api.patch(`/api/meetings/update-meeting/${id}`, data);
    return res.data;
}
