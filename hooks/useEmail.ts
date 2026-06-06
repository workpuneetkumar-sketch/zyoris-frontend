"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    EmailLog,
    fetchEmails,
    sendEmail,
    SendEmailPayload,
} from "@/lib/api/emailApi";

export function useEmail() {
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
    const [search, setSearch] = useState("");

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadEmails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEmails();
            setEmails(data.emails ?? []);
            setTotal(data.total ?? 0);
        } catch (err) {
            // 404 → no emails yet; treat as empty list
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

    // ── Client-side search ────────────────────────────────────────────────────
    const filteredEmails = emails.filter((email) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            email.subject?.toLowerCase().includes(q) ||
            email.to?.toLowerCase().includes(q) ||
            email.from?.toLowerCase().includes(q) ||
            email.body?.toLowerCase().includes(q)
        );
    });

    // ── Send email ────────────────────────────────────────────────────────────
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

    return {
        emails,
        filteredEmails,
        total,
        loading,
        error,
        isComposeOpen,
        sending,
        sendError,
        selectedEmail,
        search,
        setSearch,
        setIsComposeOpen,
        setSelectedEmail,
        handleSend,
        retry: loadEmails,
    };
}
