import api from "@/lib/api/api";

export interface ChatSession {
    id: string;
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

// In-memory mock data for team chat
const mockSessions: ChatSession[] = [
    { id: "team-1", name: "Alice Johnson", lastMessage: "Can you send the report?", updatedAt: new Date().toISOString() },
    { id: "team-2", name: "Bob Smith", lastMessage: "Sounds good.", updatedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "team-3", name: "Charlie Davis", lastMessage: "I will check it out.", updatedAt: new Date(Date.now() - 86400000).toISOString() },
];

const mockMessages: Record<string, ChatMessage[]> = {
    "team-1": [
        { id: "m1", sessionId: "team-1", text: "Hey! How is the project going?", senderId: "team-1", timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: "m2", sessionId: "team-1", text: "Going well, just finishing up.", senderId: "me", timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: "m3", sessionId: "team-1", text: "Can you send the report?", senderId: "team-1", timestamp: new Date().toISOString() },
    ]
};

export async function getChatSessions(): Promise<ChatSession[]> {
    try {
        const res = await api.get("/chat/sessions");
        if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (e) {
        console.warn("Failed to fetch sessions, using mock");
    }
    return [...mockSessions];
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
        const res = await api.get(`/chat/session/${sessionId}`);
        if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (e) {
        console.warn("Failed to fetch session messages, using mock");
    }
    return mockMessages[sessionId] || [];
}

export async function sendMessage(sessionId: string, text: string): Promise<ChatMessage> {
    try {
        const res = await api.post("/chat/message", { sessionId, message: text });
        if (res.data && res.data.id) return res.data;
    } catch (e) {
        console.warn("Failed to send message, using mock");
    }
    const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sessionId,
        text,
        senderId: "me",
        timestamp: new Date().toISOString()
    };
    if (!mockMessages[sessionId]) mockMessages[sessionId] = [];
    mockMessages[sessionId].push(newMsg);
    
    const session = mockSessions.find(s => s.id === sessionId);
    if (session) {
        session.lastMessage = text;
        session.updatedAt = new Date().toISOString();
    }
    
    return newMsg;
}
