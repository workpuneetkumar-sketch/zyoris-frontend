import api from "@/lib/api/api";

export interface WhatsAppMessage {
    id: string;
    text: string;
    sender: 'user' | 'contact';
    timestamp: string;
}

export interface WhatsAppConversation {
    id: string;
    contactName: string;
    contactPhone: string;
    unreadCount: number;
    messages: WhatsAppMessage[];
    updatedAt: string;
    leadId?: string;
    leadName?: string;
    leadStatus?: string;
    pinned?: boolean;
    archived?: boolean;
    labels?: string[];
}

export interface SendWhatsAppPayload {
    to: string;
    message: string;
    conversationId?: string;
}

export interface AISummaryResponse {
    summary: string;
}

export interface AISentimentResponse {
    sentiment: string;
    score?: number;
}

export interface AISuggestionsResponse {
    suggestions: string[];
}

export interface BroadcastPayload {
    to: string[];
    templateName: string;
    language: string;
    parameters: string[];
}

export interface BroadcastRecipientResult {
    to: string;
    success: boolean;
    metaMessageId?: string;
    error?: string;
}

export interface BroadcastResponse {
    success: boolean;
    total: number;
    sent: number;
    failed: number;
    results: BroadcastRecipientResult[];
}

export interface WhatsAppApiErrorDetail {
    status?: number;
    errorCode?: string;
    message: string;
}

function parseApiErrorDetail(error: any): WhatsAppApiErrorDetail {
    if (error?.response) {
        const status = error.response.status;
        const data = error.response.data;
        const msg = data?.message || data?.error;
        const errorCode = data?.error;
        if (status === 404) return { status, errorCode, message: msg || "Conversation not found (404)" };
        if (status === 401) return { status, errorCode, message: msg || "Unauthorized access (401). Please verify authentication." };
        if (status === 400) return { status, errorCode, message: msg || "Invalid request validation failed (400)." };
        if (status >= 500) return { status, errorCode, message: msg || "Server error occurred. Please try again (500)." };
        return { status, errorCode, message: msg || `Request failed with status ${status}` };
    }
    return { message: error?.message || "Network error occurred" };
}

function parseApiError(error: any): string {
    return parseApiErrorDetail(error).message;
}

export function normalizeWhatsAppMessage(raw: any): WhatsAppMessage {
    if (!raw) return { id: `m_${Date.now()}`, text: "", sender: "contact", timestamp: new Date().toISOString() };
    const dir = String(raw.direction || raw.sender || raw.type || "").toUpperCase();
    const isUser = dir === "OUTBOUND" || dir === "USER" || dir === "ME" || dir === "SENT" || raw.fromMe === true || raw.isOutgoing === true;
    return {
        id: raw.id || raw.metaId || `m_${Date.now()}`,
        text: raw.text || raw.message || "",
        sender: isUser ? "user" : "contact",
        timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
    };
}

export function normalizeWhatsAppConversation(raw: any): WhatsAppConversation {
    if (!raw) {
        return {
            id: "",
            contactName: "Unknown Contact",
            contactPhone: "",
            unreadCount: 0,
            messages: [],
            updatedAt: new Date().toISOString(),
        };
    }
    const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];
    const messages = rawMessages.map(normalizeWhatsAppMessage);
    const phone = raw.contactPhone || raw.phoneNumber || "";
    const name = raw.contactName || raw.customerName || raw.lead?.name || raw.contact?.name || phone || "Unknown Contact";

    return {
        id: raw.id || "",
        contactName: name,
        contactPhone: phone,
        unreadCount: typeof raw.unreadCount === "number" ? raw.unreadCount : (raw._count?.messages ?? 0),
        messages: messages,
        updatedAt: raw.updatedAt || raw.createdAt || (messages.length > 0 ? messages[messages.length - 1].timestamp : new Date().toISOString()),
        leadId: raw.leadId || raw.lead?.id,
        leadName: raw.leadName || raw.lead?.name,
        leadStatus: raw.leadStatus || raw.lead?.status,
        pinned: Boolean(raw.pinned),
        archived: Boolean(raw.archived),
        labels: Array.isArray(raw.labels) ? raw.labels : [],
    };
}

export async function fetchConversations(): Promise<WhatsAppConversation[]> {
    try {
        const res = await api.get("/whatsapp/conversations");
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        return list.map(normalizeWhatsAppConversation);
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function sendWhatsAppMessage(data: SendWhatsAppPayload): Promise<WhatsAppMessage> {
    try {
        const res = await api.post("/whatsapp/send", data);
        return normalizeWhatsAppMessage(res.data?.message || res.data);
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function fetchConversationMessages(conversationId: string): Promise<WhatsAppMessage[]> {
    try {
        const res = await api.get(`/whatsapp/conversations/${conversationId}/messages`);
        const list = Array.isArray(res.data) ? res.data : (res.data?.messages || res.data?.data || []);
        return list.map(normalizeWhatsAppMessage);
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function triggerWhatsAppWebhook(payload: any): Promise<any> {
    try {
        const res = await api.post("/whatsapp/webhook", payload);
        return res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function setConversationLabels(id: string, labels: string[]): Promise<WhatsAppConversation> {
    try {
        const res = await api.patch(`/whatsapp/conversations/${id}/labels`, { labels });
        return res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function setConversationPinned(id: string, pinned: boolean): Promise<WhatsAppConversation> {
    try {
        const res = await api.patch(`/whatsapp/conversations/${id}/pin`, { pinned });
        return res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function setConversationArchived(id: string, archived: boolean): Promise<WhatsAppConversation> {
    try {
        const res = await api.patch(`/whatsapp/conversations/${id}/archive`, { archived });
        return res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

/* ---------------------------------------------------
   AI INSIGHTS & BROADCAST API CALLS
--------------------------------------------------- */

export async function fetchAISummary(conversationId: string): Promise<AISummaryResponse> {
    try {
        const res = await api.post(`/whatsapp/conversations/${conversationId}/ai-summary`);
        return res.data;
    } catch (err: any) {
        const detail = parseApiErrorDetail(err);
        const error: any = new Error(detail.message);
        error.status = detail.status;
        error.errorCode = detail.errorCode;
        throw error;
    }
}

export async function fetchAISentiment(conversationId: string): Promise<AISentimentResponse> {
    try {
        const res = await api.post(`/whatsapp/conversations/${conversationId}/ai-sentiment`);
        return res.data;
    } catch (err: any) {
        const detail = parseApiErrorDetail(err);
        const error: any = new Error(detail.message);
        error.status = detail.status;
        error.errorCode = detail.errorCode;
        throw error;
    }
}

export async function fetchAISuggestions(conversationId: string): Promise<AISuggestionsResponse> {
    try {
        const res = await api.post(`/whatsapp/conversations/${conversationId}/ai-suggestions`);
        return res.data;
    } catch (err: any) {
        const detail = parseApiErrorDetail(err);
        const error: any = new Error(detail.message);
        error.status = detail.status;
        error.errorCode = detail.errorCode;
        throw error;
    }
}

export async function sendBroadcast(payload: BroadcastPayload): Promise<BroadcastResponse> {
    try {
        const res = await api.post("/whatsapp/broadcast", payload);
        return res.data;
    } catch (err: any) {
        const detail = parseApiErrorDetail(err);
        const error: any = new Error(detail.message);
        error.status = detail.status;
        error.errorCode = detail.errorCode;
        throw error;
    }
}


