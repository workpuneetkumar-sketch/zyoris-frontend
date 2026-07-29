"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
    EmailLog,
    EmailTemplate,
    fetchEmails,
    fetchEmailTemplates,
    createEmailTemplate,
    sendEmail,
    scheduleSendEmail,
    syncEmails,
    connectGmail,
    SendEmailPayload,
} from "@/lib/api/emailApi";

export interface EmailThread {
    id: string;
    subject: string;
    participants: string[];
    emails: EmailLog[];
    latestDate: string;
    latestPreview: string;
    labels: string[];
}

export type FolderTab = "Inbox" | "Sent" | "Drafts" | "Trash" | "Gmail Connect";

export function useEmail() {
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // Templates State
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateError, setTemplateError] = useState<string | null>(null);

    // Gmail Connect State
    const [connectingGmail, setConnectingGmail] = useState(false);
    const [gmailConnectError, setGmailConnectError] = useState<string | null>(null);

    // UI State
    const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
    const [search, setSearch] = useState("");
    const [selectedLabel, setSelectedLabel] = useState<FolderTab>("Inbox");

    // ── Fetch Templates ───────────────────────────────────────────────────────
    const loadTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        setTemplateError(null);
        try {
            const data = await fetchEmailTemplates();
            setTemplates(data);
        } catch (err) {
            console.warn("Failed to load email templates", err);
            setTemplateError("Failed to load templates.");
        } finally {
            setLoadingTemplates(false);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // ── Fetch Emails by Folder ────────────────────────────────────────────────
    const loadEmails = useCallback(async (folder: FolderTab = selectedLabel) => {
        if (folder === "Gmail Connect") {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEmails(folder.toLowerCase());
            const rawEmails = data.emails ?? [];

            // Assign current folder label to emails for thread view
            rawEmails.forEach((e) => {
                e.labels = [folder];
            });

            setEmails(rawEmails);
            setTotal(data.total ?? rawEmails.length);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                if (status === 401) {
                    setError("Unauthorized. Your session may have expired. Please log in again.");
                } else if (status === 400) {
                    setError("Invalid folder requested. Please select a valid email folder.");
                } else if (status === 404) {
                    setEmails([]);
                    setTotal(0);
                } else {
                    const serverMsg = err.response?.data?.message || err.response?.data?.error;
                    setError(serverMsg || `Failed to fetch emails for ${folder} (${status || 'Network Error'}).`);
                }
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch emails.");
            }
        } finally {
            setLoading(false);
        }
    }, [selectedLabel]);

    useEffect(() => {
        loadEmails(selectedLabel);
    }, [selectedLabel, loadEmails]);

    // ── Thread Grouping ───────────────────────────────────────────────────────
    const threads = useMemo(() => {
        const groups = new Map<string, EmailLog[]>();

        emails.forEach((email) => {
            const cleanSubject = (email.subject || "")
                .replace(/^(re|fwd|fw):\s*/i, "")
                .trim()
                .toLowerCase();

            const threadKey = cleanSubject || email.id || "no-subject";

            if (!groups.has(threadKey)) {
                groups.set(threadKey, []);
            }
            groups.get(threadKey)!.push(email);
        });

        const generatedThreads: EmailThread[] = [];
        groups.forEach((threadEmails, key) => {
            threadEmails.sort((a, b) => {
                const dateA = new Date(a.sentAt || a.createdAt).getTime();
                const dateB = new Date(b.sentAt || b.createdAt).getTime();
                return dateA - dateB;
            });

            const latestEmail = threadEmails[threadEmails.length - 1];

            const participantSet = new Set<string>();
            threadEmails.forEach((e) => {
                if (e.to) participantSet.add(e.to);
                if (e.from) participantSet.add(e.from);
            });

            const labelSet = new Set<string>();
            threadEmails.forEach((e) => {
                e.labels?.forEach((l) => labelSet.add(l));
            });

            generatedThreads.push({
                id: `thread-${key}`,
                subject: latestEmail.subject || "(No Subject)",
                participants: Array.from(participantSet),
                emails: threadEmails,
                latestDate: latestEmail.sentAt || latestEmail.createdAt,
                latestPreview: latestEmail.body || "",
                labels: Array.from(labelSet),
            });
        });

        return generatedThreads.sort(
            (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
        );
    }, [emails]);

    // ── Filtering & Search ────────────────────────────────────────────────────
    const filteredThreads = useMemo(() => {
        return threads.filter((thread) => {
            if (search.trim()) {
                const q = search.toLowerCase();
                return (
                    thread.subject.toLowerCase().includes(q) ||
                    thread.participants.some((p) => p.toLowerCase().includes(q)) ||
                    thread.latestPreview.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [threads, search]);

    // ── Actions ───────────────────────────────────────────────────────────────
    async function handleSend(data: SendEmailPayload): Promise<boolean> {
        setSending(true);
        setSendError(null);
        try {
            await sendEmail(data);
            await loadEmails(selectedLabel);
            setIsComposeOpen(false);
            return true;
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.message ?? err.response?.data?.error ?? err.message
                : err instanceof Error
                ? err.message
                : "Failed to send email.";
            setSendError(msg);
            return false;
        } finally {
            setSending(false);
        }
    }

    async function handleScheduleSend(data: SendEmailPayload): Promise<boolean> {
        setSending(true);
        setSendError(null);
        try {
            await scheduleSendEmail(data);
            await loadEmails(selectedLabel);
            setIsComposeOpen(false);
            return true;
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.message ?? err.response?.data?.error ?? err.message
                : err instanceof Error
                ? err.message
                : "Failed to schedule email.";
            setSendError(msg);
            return false;
        } finally {
            setSending(false);
        }
    }

    async function handleCreateTemplate(data: { name: string; subject: string; body: string }): Promise<boolean> {
        try {
            const created = await createEmailTemplate(data);
            setTemplates((prev) => [created, ...prev]);
            return true;
        } catch (err) {
            console.error("Failed to create template", err);
            return false;
        }
    }

    async function handleSync() {
        setSyncing(true);
        try {
            await syncEmails();
            await loadEmails(selectedLabel);
        } catch (err) {
            console.error("Failed to sync emails", err);
        } finally {
            setSyncing(false);
        }
    }

    // ── Gmail Connect Action ─────────────────────────────────────────────────
    async function handleConnectGmail() {
        setConnectingGmail(true);
        setGmailConnectError(null);
        try {
            const res = await connectGmail();
            const consentUrl = res.url || res.consentUrl || res.redirectUrl || res.authUrl;
            if (consentUrl && typeof window !== "undefined") {
                window.location.href = consentUrl;
            } else if (typeof res === "string" && (res as string).startsWith("http")) {
                window.location.href = res;
            } else {
                setGmailConnectError("Server returned an invalid Google authentication URL.");
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                const message =
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    (status === 400
                        ? "User is not associated with an organization."
                        : "Failed to connect Gmail account.");
                setGmailConnectError(message);
            } else {
                setGmailConnectError(err instanceof Error ? err.message : "Failed to connect Gmail.");
            }
        } finally {
            setConnectingGmail(false);
        }
    }

    return {
        emails,
        threads,
        filteredThreads,
        total: threads.length,
        loading,
        error,
        isComposeOpen,
        sending,
        sendError,
        syncing,
        selectedThread,
        search,
        selectedLabel,
        templates,
        loadingTemplates,
        templateError,
        connectingGmail,
        gmailConnectError,
        setSearch,
        setSelectedLabel: (folder: FolderTab) => {
            setSelectedLabel(folder);
            setSelectedThread(null);
        },
        setIsComposeOpen,
        setSelectedThread,
        handleSend,
        handleScheduleSend,
        handleCreateTemplate,
        loadTemplates,
        handleSync,
        handleConnectGmail,
        retry: () => loadEmails(selectedLabel),
    };
}

