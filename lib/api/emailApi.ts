// lib/api/emailApi.ts
// All network calls for the Email module.
// The deployed email router currently supports listing, sending, and sync only.

import api from "@/lib/api/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailLog {
    id: string;
    to: string;
    from?: string;
    subject: string;
    body: string;
    status?: string;
    sentAt?: string;
    createdAt: string;
    updatedAt?: string;
    threadId?: string;
    labels?: string[];
    folder?: string;
    direction?: string;
    isRead?: boolean;
    isStarred?: boolean;
    isImportant?: boolean;
    starred?: boolean;
    important?: boolean;
    archived?: boolean;
    attachments?: EmailAttachment[];
    [key: string]: unknown;
}

export interface EmailsResponse {
    emails: EmailLog[];
    total: number;
}

export interface EmailAttachment {
    filename: string;
    url?: string;
    content?: string;
    id?: string;
    mimeType?: string;
    size?: number;
}

export interface SendEmailPayload {
    to: string;
    subject: string;
    body: string;
    templateId?: string;
    variables?: Record<string, string>;
    leadId?: string;
    dealId?: string;
    contactId?: string;
}

// ── GET available email activity ──────────────────────────────────────────────

export async function fetchEmails(): Promise<EmailsResponse> {
    const res = await api.get("/email/get-emails");
    const raw = res.data?.data ?? res.data;
    // Normalise various response shapes
    if (Array.isArray(raw)) {
        return { emails: raw, total: raw.length };
    }
    if (Array.isArray(raw?.data)) {
        return { emails: raw.data, total: raw.pagination?.total ?? raw.data.length };
    }
    if (Array.isArray(raw?.emails)) {
        return { emails: raw.emails, total: raw.total ?? raw.emails.length };
    }
    throw new Error("Email service returned an unsupported list response.");
}

// ── POST send email ───────────────────────────────────────────────────────────
// The deployed route accepts one recipient, subject, and HTML body.

export async function sendEmail(data: SendEmailPayload): Promise<EmailLog> {
    const res = await api.post<EmailLog>("/email/send", data);
    return res.data;
}

// ── POST sync emails ──────────────────────────────────────────────────────────
// Current backend returns a stub response; callers must inspect its message.
export interface EmailSyncResponse {
    success?: boolean;
    message?: string;
}

export async function syncEmails(): Promise<EmailSyncResponse> {
    const res = await api.post("/email/sync");
    return res.data?.data ?? res.data;
}
