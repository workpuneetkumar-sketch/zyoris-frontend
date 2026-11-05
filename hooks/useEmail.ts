"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
    EmailLog,
    fetchEmails,
    sendEmail,
    syncEmails,
    SendEmailPayload,
} from "@/lib/api/emailApi";

export interface EmailDraft {
    id: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    updatedAt: string;
}

export interface EmailComposeSeed {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
    draftId?: string;
    notice?: string;
}

export interface EmailThread {
    id: string;
    subject: string;
    participants: string[];
    emails: EmailLog[];
    latestDate: string;
    latestPreview: string;
    latestSender: string;
    latestRecipient: string;
    isUnread: boolean;
    hasAttachments: boolean;
    labels: string[];
    draft?: EmailDraft;
}

export type FolderTab =
    | "Inbox"
    | "Sent"
    | "Drafts"
    | "Starred"
    | "Important"
    | "Archive"
    | "Spam"
    | "Trash"
    | "Accounts";

const isInFolder = (email: EmailLog, folder: FolderTab): boolean => {
    const status = String(email.status || "").toUpperCase();
    const storedFolder = String(email.folder || "").toUpperCase();
    const direction = String(email.direction || "").toUpperCase();

    switch (folder) {
        case "Inbox":
            return ["INBOX", "RECEIVED", "INBOUND"].includes(storedFolder) ||
                ["INBOUND", "INCOMING", "RECEIVED"].includes(direction) ||
                ["RECEIVED", "INBOUND"].includes(status);
        case "Sent":
            return storedFolder === "SENT" || status === "SENT";
        case "Starred":
            return email.isStarred === true || email.starred === true ||
                (Array.isArray(email.labels) && email.labels.some((label) => label.toUpperCase() === "STARRED"));
        case "Important":
            return email.isImportant === true || email.important === true ||
                (Array.isArray(email.labels) && email.labels.some((label) => label.toUpperCase() === "IMPORTANT"));
        case "Archive":
            return storedFolder === "ARCHIVE" || status === "ARCHIVED" || email.archived === true;
        case "Spam":
            return storedFolder === "SPAM" || status === "SPAM";
        case "Trash":
            return storedFolder === "TRASH" || status === "TRASH" || status === "DELETED";
        case "Drafts":
        case "Accounts":
            return false;
        default:
            return false;
    }
};

const getDraftStorageKey = (userId?: string) =>
    userId ? `zyoris-email-drafts:${userId}` : null;

function readLocalDrafts(storageKey: string | null): EmailDraft[] {
    if (!storageKey || typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];
        const drafts = JSON.parse(raw);
        if (!Array.isArray(drafts)) throw new Error("Stored drafts have an invalid format.");
        const validDrafts = drafts.filter((draft): draft is EmailDraft =>
            !!draft && typeof draft.id === "string" &&
            typeof draft.to === "string" && typeof draft.subject === "string" &&
            typeof draft.body === "string" && typeof draft.updatedAt === "string"
        );
        if (validDrafts.length !== drafts.length) throw new Error("Stored drafts contain invalid entries.");
        return validDrafts;
    } catch (error) {
        console.error("Failed to load local email drafts:", error);
        throw new Error("Could not load drafts saved on this device.");
    }
}

function groupEmailThreads(emails: EmailLog[]): EmailThread[] {
    const groups = new Map<string, EmailLog[]>();

    emails.forEach((email) => {
        const threadKey = email.threadId || email.id;
        const threadEmails = groups.get(threadKey) || [];
        threadEmails.push(email);
        groups.set(threadKey, threadEmails);
    });

    return Array.from(groups.entries()).map(([key, threadEmails]) => {
        const ordered = [...threadEmails].sort(
            (a, b) => new Date(a.sentAt || a.createdAt).getTime() - new Date(b.sentAt || b.createdAt).getTime()
        );
        const latestEmail = ordered[ordered.length - 1];
        const participantSet = new Set<string>();
        ordered.forEach((email) => {
            if (email.from) participantSet.add(email.from);
            if (email.to) participantSet.add(email.to);
        });
        return {
            id: `thread-${key}`,
            subject: latestEmail.subject || "(No Subject)",
            participants: Array.from(participantSet),
            emails: ordered,
            latestDate: latestEmail.sentAt || latestEmail.createdAt,
            latestPreview: (latestEmail.body || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim(),
            latestSender: latestEmail.from || "Organization sender",
            latestRecipient: latestEmail.to || "",
            isUnread: latestEmail.isRead === false,
            hasAttachments: ordered.some((email) => !!email.attachments?.length),
            labels: Array.from(new Set(ordered.flatMap((email) => email.labels || []))),
        };
    }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
}

export function useEmail() {
    const { user } = useAuth();
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [drafts, setDrafts] = useState<EmailDraft[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncNotice, setSyncNotice] = useState<string | null>(null);
    const [draftError, setDraftError] = useState<string | null>(null);

    const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
    const [search, setSearch] = useState("");
    const [selectedLabel, setSelectedLabel] = useState<FolderTab>("Inbox");
    const draftStorageKey = getDraftStorageKey(user?.id);

    useEffect(() => {
        try {
            setDrafts(readLocalDrafts(draftStorageKey));
            setDraftError(null);
        } catch (err) {
            setDrafts([]);
            setDraftError(err instanceof Error ? err.message : "Could not load drafts saved on this device.");
        }
    }, [draftStorageKey]);

    const loadEmails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEmails();
            setEmails(data.emails);
            setTotal(data.total);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                if (status === 401) {
                    setError("Unauthorized. Your session may have expired. Please log in again.");
                } else {
                    const serverMsg = err.response?.data?.message || err.response?.data?.error;
                    setError(serverMsg || `Failed to fetch email (${status || "Network Error"}).`);
                }
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch emails.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadEmails();
    }, [loadEmails]);

    const threads = useMemo(() => {
        const visibleEmails = emails.filter((email) => isInFolder(email, selectedLabel));
        const remoteThreads = groupEmailThreads(visibleEmails);
        if (selectedLabel !== "Drafts") return remoteThreads;
        return drafts.map((draft): EmailThread => ({
            id: `draft-${draft.id}`,
            subject: draft.subject || "(No Subject)",
            participants: draft.to ? [draft.to] : [],
            emails: [],
            latestDate: draft.updatedAt,
            latestPreview: draft.body.replace(/<[^>]*>/g, "").slice(0, 180),
            latestSender: "Draft",
            latestRecipient: draft.to,
            isUnread: false,
            hasAttachments: false,
            labels: ["Drafts"],
            draft,
        })).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
    }, [emails, drafts, selectedLabel]);

    const filteredThreads = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return threads;
        return threads.filter((thread) =>
            thread.subject.toLowerCase().includes(query) ||
            thread.participants.some((participant) => participant.toLowerCase().includes(query)) ||
            thread.latestPreview.toLowerCase().includes(query)
        );
    }, [threads, search]);

    const activeThread = selectedThread
        ? threads.find((thread) => thread.id === selectedThread.id) || selectedThread
        : null;

    async function handleSend(data: SendEmailPayload): Promise<boolean> {
        setSending(true);
        setSendError(null);
        try {
            await sendEmail(data);
            if (selectedLabel === "Sent") await loadEmails();
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

    function handleSaveDraft(draft: Omit<EmailDraft, "id" | "updatedAt"> & { id?: string }): boolean {
        if (!draftStorageKey) {
            setDraftError("Drafts require an authenticated user and are saved only in this browser.");
            return false;
        }
        try {
            const nextDraft: EmailDraft = {
                ...draft,
                id: draft.id || `draft-${Date.now()}`,
                updatedAt: new Date().toISOString(),
            };
            const nextDrafts = [nextDraft, ...drafts.filter((item) => item.id !== nextDraft.id)];
            localStorage.setItem(draftStorageKey, JSON.stringify(nextDrafts));
            setDrafts(nextDrafts);
            setDraftError(null);
            return true;
        } catch (err) {
            console.error("Failed to save local email draft:", err);
            setDraftError("Could not save this draft on this device.");
            return false;
        }
    }

    function handleDeleteDraft(draftId: string): boolean {
        if (!draftStorageKey) {
            setDraftError("Drafts require an authenticated user and are saved only in this browser.");
            return false;
        }
        try {
            const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
            localStorage.setItem(draftStorageKey, JSON.stringify(nextDrafts));
            setDrafts(nextDrafts);
            setDraftError(null);
            if (selectedThread?.draft?.id === draftId) setSelectedThread(null);
            return true;
        } catch (err) {
            console.error("Failed to delete local email draft:", err);
            setDraftError("Could not delete this local draft.");
            return false;
        }
    }

    async function handleSync() {
        setSyncing(true);
        setSyncNotice(null);
        try {
            const response = await syncEmails();
            await loadEmails();
            setSyncNotice(response.message || "The server accepted the sync request.");
        } catch (err) {
            const message = axios.isAxiosError(err)
                ? err.response?.data?.message ?? err.response?.data?.error ?? err.message
                : err instanceof Error ? err.message : "Failed to sync emails.";
            setSyncNotice(message);
        } finally {
            setSyncing(false);
        }
    }

    return {
        emails,
        drafts,
        threads,
        filteredThreads,
        total: selectedLabel === "Drafts" ? drafts.length : threads.length,
        loading,
        error,
        isComposeOpen,
        sending,
        sendError,
        syncing,
        syncNotice,
        draftError,
        selectedThread: activeThread,
        search,
        selectedLabel,
        setSearch,
        setSelectedLabel: (folder: FolderTab) => {
            setSelectedLabel(folder);
            setSelectedThread(null);
            setSearch("");
        },
        setIsComposeOpen,
        setSelectedThread,
        handleSend,
        handleSaveDraft,
        handleDeleteDraft,
        handleSync,
        retry: () => loadEmails(),
    };
}
