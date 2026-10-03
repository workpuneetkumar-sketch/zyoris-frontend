import api from "@/lib/api/api";
import { getEmployees } from "./hrApi";

export interface ChatSession {
    id: string; // Will map to employee's userId
    name: string;
    avatar?: string;
    lastMessage?: string;
    updatedAt: string;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    text: string;
    senderId: string;
    timestamp: string;
}

export async function getChatSessions(): Promise<ChatSession[]> {
    try {
        const [teamRes, employees] = await Promise.all([
            api.get("/organizations/team-members").catch(() => null),
            getEmployees().catch(() => [])
        ]);
        
        const members = teamRes?.data?.members || teamRes?.data || [];
        const currentUserId = getCurrentUserId();
        
        // Use a Map to deduplicate by ID
        const uniqueUsers = new Map<string, ChatSession>();
        
        // 1. Add Team Members
        members.forEach((m: any) => {
            if (m.id && m.id !== currentUserId) {
                uniqueUsers.set(m.id, {
                    id: m.id,
                    name: m.name || "Unknown User",
                    avatar: m.avatar,
                    lastMessage: "Start a conversation",
                    updatedAt: new Date().toISOString()
                });
            }
        });
        
        // 2. Add Employees
        employees.forEach((emp: any) => {
            const uid = emp.userId;
            if (uid && uid !== currentUserId && !uniqueUsers.has(uid)) {
                uniqueUsers.set(uid, {
                    id: uid,
                    name: emp.name || "Unknown Employee",
                    avatar: emp.avatar,
                    lastMessage: "Start a conversation",
                    updatedAt: new Date().toISOString()
                });
            }
        });
        
        return Array.from(uniqueUsers.values());
    } catch (e) {
        console.error("Failed to fetch users for team chat", e);
        return [];
    }
}

function getCurrentUserId(): string {
    if (typeof window !== "undefined") {
        const raw = localStorage.getItem("zyoris-auth");
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                return parsed?.user?.id || "me";
            } catch (e) {
                return "me";
            }
        }
    }
    return "me";
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const currentUserId = getCurrentUserId();
    
    // Server-driven authority: fetch messages from backend API
    try {
        const res = await api.get(`/api/communications/messages?conversationId=${sessionId}&limit=50`);
        const dataArray = Array.isArray(res.data) 
            ? res.data 
            : (res.data?.data && Array.isArray(res.data.data) ? res.data.data : null);
        
        if (dataArray) {
            return dataArray.map((msg: any) => ({
                id: msg.id,
                sessionId,
                text: msg.content || "",
                senderId: msg.senderId || sessionId, 
                timestamp: msg.createdAt || new Date().toISOString()
            }));
        }
    } catch (e) {
        // Fallback to legacy conversation receiver query if conversationId was user ID
        try {
            const fallbackRes = await api.get(`/messages/get-messages?receiverId=${sessionId}`);
            const fbArray = Array.isArray(fallbackRes.data)
                ? fallbackRes.data
                : (fallbackRes.data?.data && Array.isArray(fallbackRes.data.data) ? fallbackRes.data.data : null);
            if (fbArray) {
                return fbArray.map((msg: any, idx: number) => ({
                    id: msg.id || `msg-${idx}`,
                    sessionId,
                    text: msg.content || msg.text || "",
                    senderId: msg.senderId || sessionId,
                    timestamp: msg.createdAt || new Date().toISOString()
                }));
            }
        } catch (err) {
            console.warn("Failed to fetch session messages from server:", err);
        }
    }

    return [];
}

export async function sendMessage(sessionId: string, text: string, senderId?: string): Promise<ChatMessage[]> {
    const currentUserId = senderId || getCurrentUserId();
    
    // Server is authoritative: send to canonical backend endpoint
    try {
        const res = await api.post("/api/communications/messages", {
            conversationId: sessionId,
            content: text,
        });
        const sent = res.data?.data || res.data;
        return [{
            id: sent.id,
            sessionId,
            text: sent.content,
            senderId: sent.senderId || currentUserId,
            timestamp: sent.createdAt || new Date().toISOString(),
        }];
    } catch (e) {
        // Fallback to /messages/send if sessionId is a legacy direct user ID
        try {
            await api.post("/messages/send", {
                receiverId: sessionId,
                content: text
            });
        } catch (err) {
            console.warn("Failed to send message to backend:", err);
            throw err;
        }

        return [{
            id: `msg-${Date.now()}`,
            sessionId,
            text,
            senderId: currentUserId,
            timestamp: new Date().toISOString()
        }];
    }
}

export async function updateMessage(messageId: string, text: string): Promise<ChatMessage | null> {
    try {
        const res = await api.patch(`/api/communications/messages/${messageId}`, {
            content: text,
        });
        const msg = res.data?.data || res.data;
        return {
            id: msg.id,
            sessionId: msg.conversationId || "",
            text: msg.content || "",
            senderId: msg.senderId || "",
            timestamp: msg.editedAt || msg.createdAt || new Date().toISOString()
        };
    } catch (error) {
        console.warn("Failed to update message via canonical API:", error);
        return null;
    }
}

export async function deleteMessage(messageId: string): Promise<boolean> {
    try {
        const res = await api.delete(`/api/communications/messages/${messageId}`);
        return res.status === 200 || res.status === 204 || res.data?.success === true;
    } catch (error) {
        console.warn("Failed to delete message via canonical API:", error);
        return false;
    }
}

