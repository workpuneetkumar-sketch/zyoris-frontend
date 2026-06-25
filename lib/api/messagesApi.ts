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
    const cacheKey = `chat_history_${[currentUserId, sessionId].sort().join('_')}`;
    
    let apiMessages: ChatMessage[] = [];
    try {
        const res = await api.get(`/messages/get-messages?receiverId=${sessionId}`);
        const dataArray = Array.isArray(res.data) ? res.data : (res.data?.data && Array.isArray(res.data.data) ? res.data.data : null);
        
        if (dataArray) {
            apiMessages = dataArray.map((msg: any, index: number) => {
                if (typeof msg === 'string') {
                    return {
                        id: `msg-${index}`,
                        sessionId,
                        text: msg,
                        senderId: sessionId,
                        timestamp: new Date().toISOString()
                    };
                }
                return {
                    id: msg.id || `msg-${index}`,
                    sessionId,
                    text: msg.content || msg.text || msg.message || "",
                    senderId: msg.senderId || sessionId, 
                    timestamp: msg.createdAt || msg.timestamp || new Date().toISOString()
                };
            });
        }
    } catch (e) {
        console.warn("API /messages/get-messages failed. Falling back to local cache.");
    }

    // Load from local storage cache
    let localMessages: ChatMessage[] = [];
    if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try { localMessages = JSON.parse(cached); } catch (e) {}
        }
    }

    // Merge logic: use API messages if they exist and are longer, else local
    const finalMessages = apiMessages.length >= localMessages.length ? apiMessages : localMessages;
    
    // Save merged to cache just in case
    if (typeof window !== "undefined" && finalMessages.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(finalMessages));
    }

    return finalMessages;
}

export async function sendMessage(sessionId: string, text: string, senderId?: string): Promise<ChatMessage[]> {
    const currentUserId = senderId || getCurrentUserId();
    
    // Optimistic user message
    const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        sessionId,
        text,
        senderId: currentUserId,
        timestamp: new Date().toISOString()
    };

    // Save to local cache instantly
    if (typeof window !== "undefined") {
        const cacheKey = `chat_history_${[currentUserId, sessionId].sort().join('_')}`;
        let localMessages: ChatMessage[] = [];
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try { localMessages = JSON.parse(cached); } catch (e) {}
        }
        localMessages.push(userMsg);
        localStorage.setItem(cacheKey, JSON.stringify(localMessages));
    }

    try {
        const payload = {
            receiverId: sessionId,
            content: text
        };
        // Hit the actual endpoint required by the spec
        await api.post("/messages/send", payload);
    } catch (e) {
        console.warn("API /messages/send returned an error. Optimistically kept in cache.");
    }

    return [userMsg];
}
