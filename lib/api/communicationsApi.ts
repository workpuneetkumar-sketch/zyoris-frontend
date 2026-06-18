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

export async function getInbox(): Promise<CommunicationItem[]> {
    let inbox: CommunicationItem[] = [];
    try {
        const res = await api.get("/api/communications/inbox");
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
        console.warn("Failed to fetch /api/communications/inbox, falling back to enrichment", err);
    }

    if (inbox.length === 0) {
        // Fetch all independently and merge
        try {
            const [emailsRes, callsRes, whatsappRes, meetingsRes] = await Promise.allSettled([
                fetchEmails(),
                fetchCalls(),
                fetchConversations(),
                getMeetings()
            ]);

            if (emailsRes.status === "fulfilled") {
                const emails = emailsRes.value.emails || [];
                emails.forEach(e => {
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
                const calls = callsRes.value.calls || [];
                calls.forEach(c => {
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
                const convos = whatsappRes.value || [];
                convos.forEach(w => {
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
                const meetings = meetingsRes.value || [];
                meetings.forEach(m => {
                    inbox.push({
                        id: `meeting-${m.id}`,
                        type: "meeting",
                        contact: m.attendees?.map(a => a.name).join(", ") || "No attendees",
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

    // Sort by timestamp descending
    return inbox.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
