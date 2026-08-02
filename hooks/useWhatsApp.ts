"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    fetchConversations,
    fetchConversationMessages,
    sendWhatsAppMessage,
    setConversationLabels,
    setConversationPinned,
    setConversationArchived,
    assignConversation,
    fetchWhatsAppStatus,
    fetchWhatsAppProfile,
    updateWhatsAppProfile,
    uploadWhatsAppMedia,
    WhatsAppConversation,
    WhatsAppStatusResponse,
    WhatsAppBusinessProfile,
    WhatsAppMediaUploadResponse,
} from "@/lib/api/whatsappApi";
import { toast } from "sonner";

export type WhatsAppTab = "inbox" | "archived";

export function useWhatsApp() {
    const [conversations, setConversations]           = useState<WhatsAppConversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [activeTab, setActiveTab]                   = useState<WhatsAppTab>("inbox");
    const [loading, setLoading]                       = useState(true);   // true ONLY on first load
    const [error, setError]                           = useState<string | null>(null);
    const [isDemoMode, setIsDemoMode]                 = useState(false);
    const [sending, setSending]                       = useState(false);

    const [waStatus, setWaStatus]                     = useState<WhatsAppStatusResponse | null>(null);
    const [waProfile, setWaProfile]                   = useState<WhatsAppBusinessProfile | null>(null);
    const [waStatusLoading, setWaStatusLoading]       = useState(false);
    const [waProfileLoading, setWaProfileLoading]     = useState(false);

    // Track whether initial load is done — polling never sets loading=true again
    const initialLoadDone = useRef(false);
    // Track ongoing send so background refresh doesn't overwrite optimistic message
    const isSending = useRef(false);

    // ── Merge fresh server conversations into existing state without wiping anything ──
    const mergeConversations = useCallback(
        (fresh: WhatsAppConversation[], prev: WhatsAppConversation[]): WhatsAppConversation[] => {
            return fresh.map(newConv => {
                const existing = prev.find(p => p.id === newConv.id);
                if (!existing) return newConv;

                // Keep the longer / most-up-to-date message list
                const existingMsgs = existing.messages || [];
                const freshMsgs    = newConv.messages   || [];
                let messages = freshMsgs.length >= existingMsgs.length ? freshMsgs : existingMsgs;

                // Append any brand-new messages from the server that aren't in our local list
                for (const m of freshMsgs) {
                    if (!messages.some(x => x.id === m.id)) {
                        messages = [...messages, m];
                    }
                }

                return {
                    ...newConv,
                    // Always keep server-authoritative fields, but fallback to local for optimistic ones
                    pinned:   newConv.pinned   ?? existing.pinned   ?? false,
                    archived: newConv.archived ?? existing.archived ?? false,
                    labels:   newConv.labels   ?? existing.labels   ?? [],
                    messages,
                };
            });
        },
        []
    );

    // ── Silent background refresh — NEVER sets loading=true ──────────────────
    const silentRefreshConversations = useCallback(async () => {
        if (isSending.current) return; // don't overwrite during send
        try {
            const data = await fetchConversations();
            if (Array.isArray(data)) {
                setConversations(prev => mergeConversations(data, prev));
                setError(null);
            }
        } catch {
            // silently ignore background errors — don't wipe existing data
        }
    }, [mergeConversations]);

    // ── Initial load — sets loading=true once ───────────────────────────────
    const loadConversations = useCallback(async () => {
        if (!initialLoadDone.current) setLoading(true);
        setError(null);
        try {
            const data = await fetchConversations();
            const list = Array.isArray(data) ? data : [];
            setIsDemoMode(false);
            setConversations(prev =>
                initialLoadDone.current ? mergeConversations(list, prev) : list
            );
        } catch (err: any) {
            console.error("WhatsApp load failed", err);
            if (!initialLoadDone.current) {
                setError(err?.message || "Failed to load conversations.");
                setConversations([]);
            }
        } finally {
            setLoading(false);
            initialLoadDone.current = true;
        }
    }, [mergeConversations]);

    // ── Silent message refresh for selected conversation ─────────────────────
    const silentRefreshMessages = useCallback(async (conversationId: string) => {
        if (isSending.current) return;
        try {
            const messages = await fetchConversationMessages(conversationId);
            if (messages) {
                setConversations(prev =>
                    prev.map(conv =>
                        conv.id === conversationId
                            ? {
                                ...conv,
                                messages: messages.length >= conv.messages.length
                                    ? messages
                                    : conv.messages,
                              }
                            : conv
                    )
                );
            }
        } catch {
            // silently ignore
        }
    }, []);

    // ── Status ────────────────────────────────────────────────────────────────
    const loadStatus = useCallback(async () => {
        setWaStatusLoading(true);
        try {
            const s = await fetchWhatsAppStatus();
            setWaStatus(s);
        } catch {
            setWaStatus(null);
        } finally {
            setWaStatusLoading(false);
        }
    }, []);

    // ── Profile ───────────────────────────────────────────────────────────────
    const loadProfile = useCallback(async () => {
        setWaProfileLoading(true);
        try {
            const p = await fetchWhatsAppProfile();
            setWaProfile(p);
        } catch {
            setWaProfile(null);
        } finally {
            setWaProfileLoading(false);
        }
    }, []);

    // ── Bootstrap + polling ──────────────────────────────────────────────────
    useEffect(() => {
        loadConversations();
        loadStatus();
        loadProfile();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Separate effect for polling — uses silent refresh only
    const selectedConversationIdRef = useRef(selectedConversationId);
    useEffect(() => {
        selectedConversationIdRef.current = selectedConversationId;
    }, [selectedConversationId]);

    useEffect(() => {
        const interval = setInterval(() => {
            silentRefreshConversations();
            if (selectedConversationIdRef.current) {
                silentRefreshMessages(selectedConversationIdRef.current);
            }
        }, 10_000); // 10s — still live but less aggressive
        return () => clearInterval(interval);
    }, [silentRefreshConversations, silentRefreshMessages]);

    // Load messages when conversation is first selected
    useEffect(() => {
        if (selectedConversationId) {
            silentRefreshMessages(selectedConversationId);
        }
    }, [selectedConversationId, silentRefreshMessages]);

    // ── Send message ──────────────────────────────────────────────────────────
    const handleSendMessage = async (text: string) => {
        if (!selectedConversationId || !text.trim()) return false;
        const currentConversation = conversations.find(c => c.id === selectedConversationId);
        if (!currentConversation) return false;

        // Optimistic message so the user sees it immediately
        const optimisticMsg = {
            id: `optimistic_${Date.now()}`,
            text,
            sender: "user" as const,
            timestamp: new Date().toISOString(),
        };

        setConversations(prev =>
            prev.map(conv =>
                conv.id === selectedConversationId
                    ? { ...conv, messages: [...conv.messages, optimisticMsg] }
                    : conv
            )
        );

        setSending(true);
        isSending.current = true;
        try {
            const newMsg = await sendWhatsAppMessage({
                to: currentConversation.contactPhone,
                message: text,
            });

            // Replace the optimistic message with the real one from server
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id !== selectedConversationId) return conv;
                    const msgs = conv.messages.filter(m => m.id !== optimisticMsg.id);
                    return {
                        ...conv,
                        messages: newMsg ? [...msgs, newMsg] : [...msgs],
                        updatedAt: newMsg?.timestamp || new Date().toISOString(),
                    };
                })
            );
            return true;
        } catch (err: any) {
            // Remove the optimistic message on failure
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === selectedConversationId
                        ? { ...conv, messages: conv.messages.filter(m => m.id !== optimisticMsg.id) }
                        : conv
                )
            );
            console.error("sendWhatsAppMessage error", err);
            // Show the backend error message (may include "WhatsApp not configured" etc.)
            // Fall back to a helpful generic message only if the backend gave nothing useful
            const backendMsg = err?.message || "";
            const isGenericBackendError = backendMsg.toLowerCase().includes("unexpected error") || backendMsg.toLowerCase().includes("internal server");
            const displayMsg = isGenericBackendError
                ? "Message failed to send. The WhatsApp integration may not be configured on the server."
                : backendMsg || "Failed to send message.";
            toast.error(displayMsg);
            return false;
        } finally {
            setSending(false);
            isSending.current = false;
        }
    };

    // ── Labels ────────────────────────────────────────────────────────────────
    const handleSetLabels = async (id: string, labels: string[]) => {
        let snapshot: WhatsAppConversation[] = [];
        setConversations(prev => { snapshot = prev; return prev.map(c => c.id === id ? { ...c, labels } : c); });
        try {
            await setConversationLabels(id, labels);
            return true;
        } catch (err: any) {
            toast.error(err?.message || "Failed to update labels.");
            setConversations(snapshot);
            return false;
        }
    };

    // ── Pin ───────────────────────────────────────────────────────────────────
    const handleTogglePin = async (id: string, pinned: boolean) => {
        let snapshot: WhatsAppConversation[] = [];
        setConversations(prev => { snapshot = prev; return prev.map(c => c.id === id ? { ...c, pinned } : c); });
        try {
            await setConversationPinned(id, pinned);
            return true;
        } catch (err: any) {
            toast.error(err?.message || "Failed to update pin.");
            setConversations(snapshot);
            return false;
        }
    };

    // ── Archive ───────────────────────────────────────────────────────────────
    const handleToggleArchive = async (id: string, archived: boolean) => {
        let snapshot: WhatsAppConversation[] = [];
        setConversations(prev => { snapshot = prev; return prev.map(c => c.id === id ? { ...c, archived } : c); });
        try {
            await setConversationArchived(id, archived);
            return true;
        } catch (err: any) {
            toast.error(err?.message || "Failed to update archive.");
            setConversations(snapshot);
            return false;
        }
    };

    // ── Assign ────────────────────────────────────────────────────────────────
    const handleAssignConversation = async (id: string, userId: string | null) => {
        try {
            await assignConversation(id, userId);
            toast.success(userId ? "Conversation assigned." : "Conversation unassigned.");
            return true;
        } catch (err: any) {
            toast.error(err?.message || "Failed to assign conversation.");
            return false;
        }
    };

    // ── Update profile ────────────────────────────────────────────────────────
    const handleUpdateProfile = async (updates: Partial<WhatsAppBusinessProfile>) => {
        try {
            const updated = await updateWhatsAppProfile(updates);
            setWaProfile(updated);
            toast.success("Business profile updated.");
            return true;
        } catch (err: any) {
            toast.error(err?.message || "Failed to update profile.");
            return false;
        }
    };

    // ── Upload media ──────────────────────────────────────────────────────────
    const handleUploadMedia = async (file: File): Promise<WhatsAppMediaUploadResponse | null> => {
        try {
            const result = await uploadWhatsAppMedia(file);
            return result;
        } catch (err: any) {
            toast.error(err?.message || "Failed to upload media.");
            return null;
        }
    };

    const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

    return {
        conversations,
        selectedConversation,
        selectedConversationId,
        setSelectedConversationId,
        activeTab,
        setActiveTab,
        loading,
        error,
        isDemoMode,
        sending,
        waStatus,
        waProfile,
        waStatusLoading,
        waProfileLoading,
        handleSendMessage,
        handleSetLabels,
        handleTogglePin,
        handleToggleArchive,
        handleAssignConversation,
        handleUpdateProfile,
        handleUploadMedia,
        retry: loadConversations,
        refreshStatus: loadStatus,
        refreshProfile: loadProfile,
    };
}
