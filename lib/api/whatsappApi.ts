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
    conversationId: string;
    text: string;
}

export async function fetchConversations(): Promise<WhatsAppConversation[]> {
    const res = await api.get("/whatsapp/conversations");
    return res.data;
}

export async function sendWhatsAppMessage(data: SendWhatsAppPayload): Promise<WhatsAppMessage> {
    const res = await api.post("/whatsapp/send", data);
    return res.data;
}
