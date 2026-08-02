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

        // Log the raw error data to help debug
        if (process.env.NODE_ENV !== "production") {
            console.error("[WhatsApp API Error]", { status, data });
        }

        // Try all common backend error message fields, including nested ones
        const msg =
            data?.message ||
            data?.error ||
            data?.detail ||
            data?.msg ||
            data?.errors?.[0]?.message ||
            data?.errors?.[0] ||
            (typeof data === "string" ? data : null);

        const errorCode = data?.code || data?.errorCode;

        if (status === 404) return { status, errorCode, message: msg || "Not found (404)" };
        if (status === 401) return { status, errorCode, message: msg || "Unauthorized (401). Please log in again." };
        if (status === 400) return { status, errorCode, message: msg || "Invalid request (400)." };
        if (status === 403) return { status, errorCode, message: msg || "Permission denied (403)." };
        if (status === 422) return { status, errorCode, message: msg || "Unprocessable request (422)." };
        if (status >= 500) return { status, errorCode, message: msg || "Server error. Please try again." };
        return { status, errorCode, message: msg || `Request failed (${status})` };
    }
    // Network / timeout errors
    if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
        return { message: "Request timed out. Please check your connection." };
    }
    if (error?.message) return { message: error.message };
    return { message: "Network error. Please check your connection." };
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
        // Only send fields the backend accepts: to, message (+ optional media fields)
        // conversationId is not in the API spec and may cause validation errors
        const payload: Record<string, any> = { to: data.to };
        if (data.message) payload.message = data.message;

        if (process.env.NODE_ENV !== "production") {
            console.log("[WhatsApp Send] payload:", JSON.stringify(payload));
        }

        const res = await api.post("/whatsapp/send", payload);

        if (process.env.NODE_ENV !== "production") {
            console.log("[WhatsApp Send] success response:", res.status, JSON.stringify(res.data));
        }

        return normalizeWhatsAppMessage(res.data?.message || res.data?.data || res.data);
    } catch (err: any) {
        const detail = parseApiErrorDetail(err);
        if (process.env.NODE_ENV !== "production") {
            console.error("[WhatsApp Send] error detail:", detail);
        }
        const error: any = new Error(detail.message);
        error.status = detail.status;
        error.errorCode = detail.errorCode;
        throw error;
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
        const data = res.data?.data ?? res.data;
        const summary = data?.summary || data?.text || data?.result || (typeof data === "string" ? data : "");
        return { summary };
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
        const data = res.data?.data ?? res.data;
        return {
            sentiment: data?.overallSentiment || data?.sentiment || data?.label || "Unknown",
            score: data?.confidence ?? data?.score,
        };
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
        // Handle multiple possible shapes: data.data.suggestions | data.suggestions | data.data (array) | data (array)
        const outer = res.data?.data ?? res.data;
        let raw: any[] = [];
        if (Array.isArray(outer)) {
            raw = outer;
        } else if (Array.isArray(outer?.suggestions)) {
            raw = outer.suggestions;
        } else if (Array.isArray(res.data?.suggestions)) {
            raw = res.data.suggestions;
        }
        return {
            suggestions: raw.map((s: any) => (typeof s === "string" ? s : s?.text || s?.message || JSON.stringify(s))).filter(Boolean),
        };
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

/* ---------------------------------------------------
   ASSIGN CONVERSATION
   PATCH /whatsapp/conversations/{id}/assign
--------------------------------------------------- */

export interface AssignConversationPayload {
    userId: string | null; // null = unassign
}

export async function assignConversation(
    id: string,
    userId: string | null
): Promise<WhatsAppConversation> {
    try {
        // Backend expects "assignedToId" per API spec
        const res = await api.patch(`/whatsapp/conversations/${id}/assign`, { assignedToId: userId });
        return normalizeWhatsAppConversation(res.data?.data || res.data);
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

/* ---------------------------------------------------
   SEND TEMPLATE MESSAGE
   POST /whatsapp/send-template
--------------------------------------------------- */

export interface SendTemplatePayload {
    to: string;
    templateName: string;
    language: string;
    parameters?: string[];
    conversationId?: string;
}

export async function sendTemplateMessage(payload: SendTemplatePayload): Promise<any> {
    try {
        const res = await api.post("/whatsapp/send-template", payload);
        return res.data?.data || res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

/* ---------------------------------------------------
   STATUS
   GET /whatsapp/status
--------------------------------------------------- */

export interface WhatsAppStatusResponse {
    connected: boolean;
    phoneNumber?: string;
    displayName?: string;
    accountStatus?: string;
    qualityRating?: string;
    messagingLimit?: string;
    [key: string]: any;
}

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatusResponse | null> {
    try {
        const res = await api.get("/whatsapp/status");
        const data = res.data?.data || res.data;

        // Debug log so we can see exactly what the backend returns
        if (process.env.NODE_ENV !== "production") {
            console.log("[WhatsApp Status] raw response:", res.status, JSON.stringify(data));
        }

        // Determine connected: explicit boolean > status string comparison > default true
        let connected = true;
        if (typeof data?.connected === "boolean") {
            connected = data.connected;
        } else if (typeof data?.status === "string") {
            connected = data.status === "connected" || data.status === "CONNECTED";
        }
        return {
            connected,
            phoneNumber: data?.phoneNumber || data?.phone_number,
            displayName: data?.displayName || data?.display_name,
            accountStatus: data?.accountStatus || data?.account_status,
            qualityRating: data?.qualityRating || data?.quality_rating,
            messagingLimit: data?.messagingLimit || data?.messaging_limit,
            ...(data || {}),
        };
    } catch (err: any) {
        // Endpoint may not exist yet — return null so UI can show "N/A"
        if (process.env.NODE_ENV !== "production") {
            console.warn("[WhatsApp Status] fetch failed:", parseApiError(err));
        }
        return null;
    }
}

/* ---------------------------------------------------
   BUSINESS PROFILE
   GET  /whatsapp/profile
   PATCH /whatsapp/profile
--------------------------------------------------- */

export interface WhatsAppBusinessProfile {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string;
    profilePictureUrl?: string;
    [key: string]: any;
}

export async function fetchWhatsAppProfile(): Promise<WhatsAppBusinessProfile | null> {
    try {
        const res = await api.get("/whatsapp/profile");
        return res.data?.data || res.data;
    } catch (err: any) {
        // Endpoint may not exist yet — return null so UI can handle gracefully
        console.warn("fetchWhatsAppProfile failed:", parseApiError(err));
        return null;
    }
}

export async function updateWhatsAppProfile(
    updates: Partial<WhatsAppBusinessProfile>
): Promise<WhatsAppBusinessProfile> {
    try {
        const res = await api.patch("/whatsapp/profile", updates);
        return res.data?.data || res.data;
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

/* ---------------------------------------------------
   MEDIA
   POST /whatsapp/media         – upload
   GET  /whatsapp/media/{id}    – download / get URL
--------------------------------------------------- */

export interface WhatsAppMediaUploadResponse {
    mediaId: string;
    url?: string;
    mimeType?: string;
    [key: string]: any;
}

export interface WhatsAppMediaResponse {
    mediaId: string;
    url: string;
    mimeType?: string;
    fileSize?: number;
    [key: string]: any;
}

export async function uploadWhatsAppMedia(file: File): Promise<WhatsAppMediaUploadResponse> {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/whatsapp/media", formData);
        const data = res.data?.data || res.data;
        return {
            mediaId: data.mediaId || data.id || data.media_id || "",
            url: data.url,
            mimeType: data.mimeType || data.mime_type,
            ...data,
        };
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}

export async function fetchWhatsAppMedia(mediaId: string): Promise<WhatsAppMediaResponse> {
    try {
        const res = await api.get(`/whatsapp/media/${mediaId}`);
        const data = res.data?.data || res.data;
        return {
            mediaId: data.mediaId || data.id || data.media_id || mediaId,
            url: data.url || "",
            mimeType: data.mimeType || data.mime_type,
            fileSize: data.fileSize || data.file_size,
            ...data,
        };
    } catch (err: any) {
        throw new Error(parseApiError(err));
    }
}


