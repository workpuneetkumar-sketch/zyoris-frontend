"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
    EmailLog,
    fetchEmails,
    sendEmail,
    syncEmails,
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

export function useEmail() {
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    
    // UI State
    const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
    const [search, setSearch] = useState("");
    const [selectedLabel, setSelectedLabel] = useState<string>("Inbox");

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadEmails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEmails();
            const rawEmails = data.emails ?? [];
            
            // Basic label inference since API doesn't provide it
            // Assuming if the status is sent or no 'from' field, it was sent by us
            rawEmails.forEach(e => {
                const inferredLabels = [];
                if (e.status === 'sent' || !e.from) {
                    inferredLabels.push("Sent");
                } else {
                    inferredLabels.push("Inbox");
                }
                e.labels = inferredLabels;
            });
            
            setEmails(rawEmails);
            setTotal(data.total ?? 0);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                setEmails([]);
                setTotal(0);
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch emails.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEmails();
    }, [loadEmails]);

    // ── Thread Grouping ───────────────────────────────────────────────────────
    const threads = useMemo(() => {
        const groups = new Map<string, EmailLog[]>();
        
        emails.forEach(email => {
            // Normalize subject by removing Re:, Fwd:, etc.
            const cleanSubject = (email.subject || "")
                .replace(/^(re|fwd|fw):\s*/i, "")
                .trim()
                .toLowerCase();
            
            const threadKey = cleanSubject || "no-subject";
            
            if (!groups.has(threadKey)) {
                groups.set(threadKey, []);
            }
            groups.get(threadKey)!.push(email);
        });
        
        const generatedThreads: EmailThread[] = [];
        groups.forEach((threadEmails, key) => {
            // Sort thread emails chronologically
            threadEmails.sort((a, b) => {
                const dateA = new Date(a.sentAt || a.createdAt).getTime();
                const dateB = new Date(b.sentAt || b.createdAt).getTime();
                return dateA - dateB;
            });
            
            const latestEmail = threadEmails[threadEmails.length - 1];
            
            // Aggregate participants
            const participantSet = new Set<string>();
            threadEmails.forEach(e => {
                if (e.to) participantSet.add(e.to);
                if (e.from) participantSet.add(e.from);
            });
            
            // Aggregate labels
            const labelSet = new Set<string>();
            threadEmails.forEach(e => {
                e.labels?.forEach(l => labelSet.add(l));
            });
            
            generatedThreads.push({
                id: `thread-${key}`,
                subject: latestEmail.subject || "(No Subject)",
                participants: Array.from(participantSet),
                emails: threadEmails,
                latestDate: latestEmail.sentAt || latestEmail.createdAt,
                latestPreview: latestEmail.body || "",
                labels: Array.from(labelSet)
            });
        });
        
        // Sort threads by latest message date (newest first)
        return generatedThreads.sort((a, b) => 
            new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
        );
    }, [emails]);

    // ── Filtering & Search ────────────────────────────────────────────────────
    const filteredThreads = useMemo(() => {
        return threads.filter(thread => {
            // Filter by label
            if (selectedLabel !== "All" && !thread.labels.includes(selectedLabel)) {
                return false;
            }
            
            // Filter by search
            if (search.trim()) {
                const q = search.toLowerCase();
                return (
                    thread.subject.toLowerCase().includes(q) ||
                    thread.participants.some(p => p.toLowerCase().includes(q)) ||
                    thread.latestPreview.toLowerCase().includes(q)
                );
            }
            
            return true;
        });
    }, [threads, search, selectedLabel]);

    // ── Actions ───────────────────────────────────────────────────────────────
    async function handleSend(data: SendEmailPayload): Promise<boolean> {
        setSending(true);
        setSendError(null);
        try {
            await sendEmail(data);
            await loadEmails();
            setIsComposeOpen(false);
            return true;
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.error ?? err.response?.data?.message ?? err.message
                : err instanceof Error
                ? err.message
                : "Failed to send email.";
            setSendError(msg);
            return false;
        } finally {
            setSending(false);
        }
    }
    
    async function handleSync() {
        setSyncing(true);
        try {
            await syncEmails();
            await loadEmails();
        } catch (err) {
            console.error("Failed to sync emails", err);
        } finally {
            setSyncing(false);
        }
    }

    return {
        emails, // keep for backward compatibility if needed
        threads,
        filteredThreads,
        total: threads.length, // total now represents total threads
        loading,
        error,
        isComposeOpen,
        sending,
        sendError,
        syncing,
        selectedThread,
        search,
        selectedLabel,
        setSearch,
        setSelectedLabel,
        setIsComposeOpen,
        setSelectedThread,
        handleSend,
        handleSync,
        retry: loadEmails,
    };
}
