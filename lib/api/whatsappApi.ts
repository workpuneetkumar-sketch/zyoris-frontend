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

function parseApiError(error: any): string {
    if (error?.response) {
        const status = error.response.status;
        const msg = error.response.data?.message || error.response.data?.error;
        if (status === 404) return msg || "Conversation not found (404)";
        if (status === 401) return msg || "Unauthorized access (401). Please verify authentication.";
        if (status >= 500) return msg || "Server error occurred. Please try again (500)";
        return msg || `Request failed with status ${status}`;
    }
    return error?.message || "Network error occurred";
}

export async function fetchConversations(): Promise<WhatsAppConversation[]> {
    try {
        const res = await api.get("/whatsapp/conversations");
        return res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function sendWhatsAppMessage(data: SendWhatsAppPayload): Promise<WhatsAppMessage> {
    try {
        const res = await api.post("/whatsapp/send", data);
        return res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function fetchConversationMessages(conversationId: string): Promise<WhatsAppMessage[]> {
    try {
        const res = await api.get(`/whatsapp/conversations/${conversationId}/messages`);
        return res.data;
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

