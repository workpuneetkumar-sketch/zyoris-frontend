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
}

export interface SendWhatsAppPayload {
    to: string;
    message: string;
    conversationId?: string;
}

export async function fetchConversations(): Promise<WhatsAppConversation[]> {
    const res = await api.get("/whatsapp/conversations", { baseURL: "" });
    return res.data;
}

export async function sendWhatsAppMessage(data: SendWhatsAppPayload): Promise<WhatsAppMessage> {
    const res = await api.post("/whatsapp/send", data, { baseURL: "" });
    return res.data;
}

export async function fetchConversationMessages(conversationId: string): Promise<WhatsAppMessage[]> {
    const res = await api.get(`/whatsapp/conversations/${conversationId}/messages`, { baseURL: "" });
    return res.data;
}

export async function triggerWhatsAppWebhook(payload: any): Promise<any> {
    const res = await api.post("/whatsapp/webhook", payload, { baseURL: "" });
    return res.data;
}
