import api from "@/lib/api/api";

export interface Call {
    id: string;
    contactName: string;
    date: string;
    duration: string;
    outcome: string;
    notes: string;
    loggedBy: string;
}

export interface CallsResponse {
    calls: Call[];
    total: number;
}

const MOCK_CALLS: Call[] = [
    {
        id: "1",
        contactName: "Jane Smith",
        date: new Date().toISOString(),
        duration: "15 mins",
        outcome: "Interested",
        notes: "Discussed the new pricing plan. She will review and get back.",
        loggedBy: "Admin",
    },
    {
        id: "2",
        contactName: "John Doe",
        date: new Date(Date.now() - 86400000).toISOString(),
        duration: "5 mins",
        outcome: "Left Voicemail",
        notes: "No answer, left a brief voicemail.",
        loggedBy: "Admin",
    },
    {
        id: "3",
        contactName: "Acme Corp (Sarah)",
        date: new Date(Date.now() - 172800000).toISOString(),
        duration: "30 mins",
        outcome: "Follow Up Required",
        notes: "Detailed product demo. Needs a follow-up email with spec sheets.",
        loggedBy: "Admin",
    },
    {
        id: "4",
        contactName: "Michael Scott",
        date: new Date(Date.now() - 259200000).toISOString(),
        duration: "45 mins",
        outcome: "Interested",
        notes: "Very interested in paper products. Wants a quote for 100 boxes.",
        loggedBy: "Sales Team",
    },
    {
        id: "5",
        contactName: "Dwight Schrute",
        date: new Date(Date.now() - 345600000).toISOString(),
        duration: "12 mins",
        outcome: "Not Interested",
        notes: "Says he grows his own beets and doesn't need our software.",
        loggedBy: "Sales Team",
    },
    {
        id: "6",
        contactName: "Jim Halpert",
        date: new Date(Date.now() - 432000000).toISOString(),
        duration: "8 mins",
        outcome: "No Answer",
        notes: "Called twice, went to voicemail both times. Will try again tomorrow.",
        loggedBy: "Admin",
    },
    {
        id: "7",
        contactName: "Pam Beesly",
        date: new Date(Date.now() - 518400000).toISOString(),
        duration: "20 mins",
        outcome: "Follow Up Required",
        notes: "Needs to consult with management before making a decision.",
        loggedBy: "Sales Team",
    },
    {
        id: "8",
        contactName: "Stanley Hudson",
        date: new Date(Date.now() - 604800000).toISOString(),
        duration: "2 mins",
        outcome: "Not Interested",
        notes: "Hung up when I mentioned 'software upgrade'.",
        loggedBy: "Admin",
    }
];

export async function fetchCalls(page: number = 1): Promise<CallsResponse> {
    try {
        const res = await api.get("/calls", { params: { page } });
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

        if (!calls || calls.length === 0) {
            return { calls: MOCK_CALLS, total: MOCK_CALLS.length };
        }
        return { calls, total };
    } catch (err) {
        console.warn("Failed to fetch calls, using mock data", err);
        return { calls: MOCK_CALLS, total: MOCK_CALLS.length };
    }
}

export async function createCall(data: Partial<Call>): Promise<Call> {
    try {
        const res = await api.post("/calls", data);
        return res.data;
    } catch (err) {
        console.warn("Failed to create call, mocking response", err);
        return {
            id: Math.random().toString(36).substring(7),
            contactName: data.contactName || "Unknown",
            date: new Date().toISOString(),
            duration: data.duration || "0 mins",
            outcome: data.outcome || "Unknown",
            notes: data.notes || "",
            loggedBy: data.loggedBy || "Admin",
            ...data,
        } as Call;
    }
}
