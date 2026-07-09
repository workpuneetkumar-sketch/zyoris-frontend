import api from "@/lib/api/api";
import { fetchEmails } from "./emailApi";
import { fetchCalls } from "./callsApi";
import { fetchConversations } from "./whatsappApi";
import { getMeetings } from "./meetingsApi";

export type CommunicationType = "email" | "whatsapp" | "call" | "meeting";

export interface CommunicationItem {
    id: string;
    type: CommunicationType;
    contact: string;
    preview: string;
    timestamp: string;
    originalData?: any;
}

export async function getInbox(filterType?: string): Promise<CommunicationItem[]> {
    let inbox: CommunicationItem[] = [];
    try {
        const url = filterType ? `/api/communications/inbox?type=${filterType.toUpperCase()}` : "/api/communications/inbox";
        const res = await api.get(url);
        if (Array.isArray(res.data) && res.data.length > 0) {
            inbox = res.data.map((item: any) => {
                const type = (item.type || "").toLowerCase() as CommunicationType;
                let contact = "Unknown";
                let preview = "";

                if (type === "email") {
                    contact = item.description || "Unknown";
                    preview = item.title || "No Subject";
                } else if (type === "call") {
                    contact = item.title || "Call";
                    preview = item.description || "No notes";
                } else if (type === "meeting") {
                    contact = "Meeting";
                    preview = item.title || "Scheduled Meeting";
                } else {
                    contact = item.title || "Unknown";
                    preview = item.description || "";
                }

                return {
                    id: item.id,
                    type,
                    contact,
                    preview,
                    timestamp: item.timestamp,
                    originalData: item
                };
            });
        }
    } catch (err) {
        console.warn(`Failed to fetch /api/communications/inbox (type=${filterType}), falling back to enrichment`, err);
    }

    if (inbox.length === 0) {
        // Fetch all independently and merge
        try {
            const [emailsRes, callsRes, whatsappRes, meetingsRes] = await Promise.allSettled([
                (!filterType || filterType.toLowerCase() === "email") ? fetchEmails() : Promise.resolve({ emails: [] }),
                (!filterType || filterType.toLowerCase() === "call") ? fetchCalls() : Promise.resolve({ calls: [] }),
                (!filterType || filterType.toLowerCase() === "whatsapp") ? fetchConversations() : Promise.resolve([]),
                (!filterType || filterType.toLowerCase() === "meeting") ? getMeetings() : Promise.resolve([])
            ]);

            if (emailsRes.status === "fulfilled") {
                const emails = (emailsRes.value as any).emails || [];
                emails.forEach((e: any) => {
                    inbox.push({
                        id: `email-${e.id}`,
                        type: "email",
                        contact: e.to || e.from || "Unknown",
                        preview: e.subject || e.body || "",
                        timestamp: e.sentAt || e.createdAt || new Date().toISOString(),
                        originalData: e
                    });
                });
            }

            if (callsRes.status === "fulfilled") {
                const calls = (callsRes.value as any).calls || [];
                calls.forEach((c: any) => {
                    inbox.push({
                        id: `call-${c.id || Math.random().toString()}`,
                        type: "call",
                        contact: c.contactName || "Unknown Contact",
                        preview: c.notes || `Duration: ${c.duration} mins`,
                        timestamp: c.date || new Date().toISOString(),
                        originalData: c
                    });
                });
            }

            if (whatsappRes.status === "fulfilled") {
                const convos = (whatsappRes.value as any) || [];
                convos.forEach((w: any) => {
                    const lastMessage = w.messages && w.messages.length > 0 ? w.messages[w.messages.length - 1] : null;
                    inbox.push({
                        id: `wa-${w.id}`,
                        type: "whatsapp",
                        contact: w.contactName || w.contactPhone || "Unknown",
                        preview: lastMessage ? lastMessage.text : "No messages",
                        timestamp: w.updatedAt || (lastMessage ? lastMessage.timestamp : new Date().toISOString()),
                        originalData: w
                    });
                });
            }

            if (meetingsRes.status === "fulfilled") {
                const meetings = (meetingsRes.value as any) || [];
                meetings.forEach((m: any) => {
                    inbox.push({
                        id: `meeting-${m.id}`,
                        type: "meeting",
                        contact: m.attendees?.map((a: any) => a.name).join(", ") || "No attendees",
                        preview: m.title || "Meeting",
                        timestamp: m.date || new Date().toISOString(),
                        originalData: m
                    });
                });
            }

        } catch (err) {
            console.error("Error during inbox enrichment:", err);
        }
    }

    // Ensure we filter fallback items accurately in case some sneaked in
    if (filterType) {
        inbox = inbox.filter(item => item.type === filterType.toLowerCase());
    }

    // Sort by timestamp descending
    return inbox.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export interface CommunicationStats {
    total: number;
    email: number;
    whatsapp: number;
    call: number;
    meeting: number;
}

export async function getStats(): Promise<CommunicationStats> {
    try {
        const res = await api.get("/api/communications/stats");
        
        // If the backend returns 200 OK but the data doesn't have the keys we expect,
        // it means the endpoint is either broken, returning wrong data (like Leads stats), 
        // or just empty. We MUST throw an error here to force the local fallback.
        if (
            res.data && 
            typeof res.data === "object" && 
            (res.data.total !== undefined || res.data.email !== undefined || res.data.emails !== undefined)
        ) {
            return {
                total: res.data.total || 0,
                email: res.data.email || res.data.emails || 0,
                whatsapp: res.data.whatsapp || res.data.whatsapps || 0,
                call: res.data.call || res.data.calls || 0,
                meeting: res.data.meeting || res.data.meetings || 0,
            };
        } else {
            // Force the fallback if the expected schema isn't found!
            throw new Error("Invalid stats schema received from backend");
        }
    } catch (err) {
        console.warn("Failed to fetch valid /api/communications/stats, falling back to computing from inbox", err);
    }
    
    // Fallback: compute from inbox
    try {
        const inbox = await getInbox();
        return {
            total: inbox.length,
            email: inbox.filter(i => i.type === "email").length,
            whatsapp: inbox.filter(i => i.type === "whatsapp").length,
            call: inbox.filter(i => i.type === "call").length,
            meeting: inbox.filter(i => i.type === "meeting").length,
        };
    } catch (fallbackErr) {
        console.error("Failed to compute stats from inbox", fallbackErr);
        return { total: 0, email: 0, whatsapp: 0, call: 0, meeting: 0 };
    }
}
