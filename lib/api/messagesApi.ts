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
        const employees = await getEmployees();
        // Map employees to chat sessions (Team Chat)
        const sessions: ChatSession[] = employees
            .filter(emp => emp.userId) // must have a userId to receive messages
            .map(emp => ({
                id: emp.userId,
                name: emp.name,
                avatar: emp.avatar,
                lastMessage: "Start a conversation",
                updatedAt: new Date().toISOString()
            }));
        return sessions;
    } catch (e) {
        console.error("Failed to fetch employees for team chat", e);
        return [];
    }
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
        const res = await api.get(`/messages/get-messages?receiverId=${sessionId}`);
        if (res.data?.success && Array.isArray(res.data.data)) {
            return res.data.data.map((msg: any, index: number) => {
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
        console.warn("API /messages/get-messages returned an error (likely not implemented yet). Returning empty conversation.");
    }
    return [];
}

export async function sendMessage(sessionId: string, text: string): Promise<ChatMessage[]> {
    // Optimistic user message
    const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        sessionId,
        text,
        senderId: "me",
        timestamp: new Date().toISOString()
    };

    try {
        const payload = {
            receiverId: sessionId,
            content: text
        };
        // Hit the actual endpoint required by the spec
        await api.post("/messages/send", payload);
    } catch (e) {
        console.warn("API /messages/send returned an error (likely not implemented yet). Optimistically keeping message in UI.");
    }

    return [userMsg];
}

export async function updateMessage(messageId: string, text: string): Promise<ChatMessage | null> {
    try {
        const payload = {
            messageId,
            content: text
        };
        const res = await api.put(`/messages/update`, payload);
        if (res.data?.success && res.data.data) {
            const msg = res.data.data;
            return {
                id: msg.id,
                sessionId: msg.sessionId || "",
                text: msg.content || msg.text || "",
                senderId: msg.senderId || "",
                timestamp: msg.createdAt || msg.timestamp || new Date().toISOString()
            };
        }
    } catch (error) {
        console.warn("API /messages/update returned an error:", error);
    }
    return null;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
    try {
        const res = await api.delete(`/messages/delete/${messageId}`);
        return res.data?.success || false;
    } catch (error) {
        console.warn("API /messages/delete returned an error:", error);
        return false;
    }
}
