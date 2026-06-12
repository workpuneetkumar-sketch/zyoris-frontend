import api from "@/lib/api/api";

export interface Call {
    id?: string;
    contactId?: string;
    contactName?: string;
    date?: string;
    duration: number;
    outcome: string;
    notes: string;
    loggedBy?: string;
}

export interface CallsResponse {
    calls: Call[];
    total: number;
}

export async function fetchCalls(page: number = 1): Promise<CallsResponse> {
    try {
        const res = await api.get("/api/calls/get-calls", { params: { page } });
        const raw = res.data;
        let calls: Call[] = [];
        let total = 0;
        
        if (Array.isArray(raw)) {
            calls = raw;
            total = raw.length;
        } else if (raw?.data && Array.isArray(raw.data)) {
            calls = raw.data;
            total = raw.pagination?.total ?? raw.data.length;
        } else if (raw?.calls && Array.isArray(raw.calls)) {
            calls = raw.calls;
            total = raw.total ?? raw.calls.length;
        }

        return { calls, total };
    } catch (err) {
        console.error("Failed to fetch calls", err);
        throw err;
    }
}

export async function createCall(data: Partial<Call>): Promise<Call> {
    try {
        const res = await api.post("/api/calls/log", data);
        return res.data;
    } catch (err) {
        console.error("Failed to create call", err);
        throw err;
    }
}
