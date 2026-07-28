// lib/api/emailApi.ts
// All network calls for the Email module.
// Endpoints: GET /email/get-emails?folder={inbox|sent|drafts|trash} | POST /email/oauth/gmail/connect | POST /email/send | POST /email/send-bulk | POST /email/sync

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
    threadId?: string; // Derived on frontend
    labels?: string[]; // Derived on frontend
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
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SendEmailPayload {
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    templateId?: string;
    variables?: Record<string, string>;
    leadId?: string;
    dealId?: string;
    contactId?: string;
    attachments?: EmailAttachment[];
    scheduledAt?: string;
}

export interface SendBulkEmailPayload {
    emails: string[];
    subject: string;
    body: string;
    templateId?: string;
    leadId?: string;
    dealId?: string;
    contactId?: string;
}

export interface GmailConnectResponse {
    url?: string;
    consentUrl?: string;
    redirectUrl?: string;
    authUrl?: string;
    [key: string]: unknown;
}

// ── GET email logs by folder ──────────────────────────────────────────────────
// Endpoint: GET /email/get-emails?folder={inbox|sent|drafts|trash}

export async function fetchEmails(folder?: string): Promise<EmailsResponse> {
    const res = await api.get("/email/get-emails", {
        params: folder ? { folder: folder.toLowerCase() } : undefined,
    });
    const raw = res.data;
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
    return { emails: [], total: 0 };
}

// ── GET & POST Email Templates ─────────────────────────────────────────────────
// Endpoints: GET /email/templates | POST /email/templates

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
    const res = await api.get("/email/templates");
    const raw = res.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.templates)) return raw.templates;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
}

export async function createEmailTemplate(data: { name: string; subject: string; body: string }): Promise<EmailTemplate> {
    const res = await api.post("/email/templates", data);
    return res.data;
}

// ── POST Gmail OAuth Connect ──────────────────────────────────────────────────
// Endpoint: POST /email/oauth/gmail/connect

export async function connectGmail(): Promise<GmailConnectResponse> {
    const res = await api.post("/email/oauth/gmail/connect");
    return res.data;
}

// ── POST send email & schedule send ───────────────────────────────────────────
// Swagger: POST /email/send | POST /email/schedule-send

export async function sendEmail(data: SendEmailPayload): Promise<EmailLog> {
    const res = await api.post<EmailLog>("/email/send", data);
    return res.data;
}

export async function scheduleSendEmail(data: SendEmailPayload): Promise<EmailLog> {
    const res = await api.post<EmailLog>("/email/schedule-send", data);
    return res.data;
}

// ── POST send bulk email ──────────────────────────────────────────────────────
// Swagger: POST /email/send-bulk

export async function sendBulkEmails(data: SendBulkEmailPayload): Promise<any> {
    const res = await api.post("/email/send-bulk", data);
    return res.data;
}

// ── POST sync emails ──────────────────────────────────────────────────────────
// Swagger: POST /email/sync

export async function syncEmails(): Promise<any> {
    const res = await api.post("/email/sync");
    return res.data;
}
