// lib/api/emailApi.ts
// All network calls for the Email module.
// Swagger: POST /email/send | POST /email/send-bulk | GET /email/get-emails | POST /email/sync

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

export interface SendBulkEmailPayload {
    emails: string[];
    subject: string;
    body: string;
    templateId?: string;
    leadId?: string;
    dealId?: string;
    contactId?: string;
}

// ── GET all email logs ────────────────────────────────────────────────────────
// Swagger: GET /email/get-emails

export async function fetchEmails(): Promise<EmailsResponse> {
    const res = await api.get("/email/get-emails");
    const raw = res.data;
    // Normalise various response shapes
    if (Array.isArray(raw)) {
        return { emails: raw, total: raw.length };
    }
    if (Array.isArray(raw.data)) {
        return { emails: raw.data, total: raw.pagination?.total ?? raw.data.length };
    }
    if (Array.isArray(raw.emails)) {
        return { emails: raw.emails, total: raw.total ?? raw.emails.length };
    }
    return { emails: [], total: 0 };
}

// ── POST send email ───────────────────────────────────────────────────────────
// Swagger: POST /email/send

export async function sendEmail(data: SendEmailPayload): Promise<EmailLog> {
    const res = await api.post<EmailLog>("/email/send", data);
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
