"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    fetchConversations, 
    fetchConversationMessages, 
    sendWhatsAppMessage, 
    setConversationLabels,
    setConversationPinned,
    setConversationArchived,
    WhatsAppConversation, 
    WhatsAppMessage 
} from "@/lib/api/whatsappApi";
import { MOCK_CONVERSATIONS } from "@/lib/api/whatsappMockData";
import { toast } from "react-toastify";

export type WhatsAppTab = "inbox" | "archived";

export function useWhatsApp() {
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<WhatsAppTab>("inbox");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [sending, setSending] = useState(false);

    const loadConversations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchConversations();
            const conversationList = Array.isArray(data) ? data : [];
            
            setIsDemoMode(false);
            setConversations(prev => {
                return conversationList.map(newConv => {
                    const existing = prev.find(p => p.id === newConv.id);
                    let messages = newConv.messages || [];

                    if (existing && existing.messages && existing.messages.length > 0) {
                        if (existing.messages.length >= messages.length) {
                            messages = existing.messages;
                            if (newConv.messages && newConv.messages.length > 0) {
                                const latestNew = newConv.messages[newConv.messages.length - 1];
                                if (latestNew && !messages.some(m => m.id === latestNew.id)) {
                                    messages = [...messages, latestNew];
                                }
                            }
                        }
                    }

                    return {
                        ...newConv,
                        pinned: newConv.pinned ?? existing?.pinned ?? false,
                        archived: newConv.archived ?? existing?.archived ?? false,
                        labels: newConv.labels ?? existing?.labels ?? [],
                        messages
                    };
                });
            });
        } catch (err: any) {
            console.error("WhatsApp API failed", err);
            const errorMsg = err?.message || "Failed to load conversations.";
            setError(errorMsg);
            setIsDemoMode(false);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMessages = useCallback(async (conversationId: string) => {
        try {
            const messages = await fetchConversationMessages(conversationId);
            setConversations(prev => prev.map(conv => 
                conv.id === conversationId ? { ...conv, messages: messages || [] } : conv
            ));
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    }, []);

    useEffect(() => {
        loadConversations();

        // Poll for new conversations and active conversation messages every 5 seconds
        const interval = setInterval(() => {
            loadConversations();
            if (selectedConversationId) {
                loadMessages(selectedConversationId);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [loadConversations, selectedConversationId, loadMessages]);

    useEffect(() => {
        if (selectedConversationId) {
            loadMessages(selectedConversationId);
        }
    }, [selectedConversationId, loadMessages]);

    const handleSendMessage = async (text: string) => {
        if (!selectedConversationId || !text.trim()) return false;
        
        const currentConversation = conversations.find(c => c.id === selectedConversationId);
        if (!currentConversation) return false;

        setSending(true);
        try {
            const newMsg = await sendWhatsAppMessage({ 
                to: currentConversation.contactPhone, 
                message: text,
                conversationId: selectedConversationId 
            });

            if (newMsg) {
                setConversations(prev => prev.map(conv => {
                    if (conv.id === selectedConversationId) {
                        return {
                            ...conv,
                            messages: [...conv.messages, newMsg],
                            updatedAt: newMsg.timestamp || new Date().toISOString()
                        };
                    }
                    return conv;
                }));
            }
            await loadConversations();
            await loadMessages(selectedConversationId);
            return true;
        } catch (err: any) {
            console.error("sendWhatsAppMessage error", err);
            setError(err?.message || "Failed to send message.");
            return false;
        } finally {
            setSending(false);
        }
    };

    // Label Manager - optimistic update with rollback
    const handleSetLabels = async (id: string, labels: string[]) => {
        let previousConversations: WhatsAppConversation[] = [];
        setConversations(prev => {
            previousConversations = prev;
            return prev.map(c => c.id === id ? { ...c, labels } : c);
        });

        try {
            await setConversationLabels(id, labels);
            return true;
        } catch (err: any) {
            console.error("setConversationLabels failed", err);
            const message = err?.message || "Failed to update conversation labels.";
            toast.error(message);
            // Rollback optimistic update
            setConversations(previousConversations);
            return false;
        }
    };

    // Pinned toggle - optimistic update with rollback
    const handleTogglePin = async (id: string, pinned: boolean) => {
        let previousConversations: WhatsAppConversation[] = [];
        setConversations(prev => {
            previousConversations = prev;
            return prev.map(c => c.id === id ? { ...c, pinned } : c);
        });

        try {
            await setConversationPinned(id, pinned);
            return true;
        } catch (err: any) {
            console.error("setConversationPinned failed", err);
            const message = err?.message || "Failed to update pin status.";
            toast.error(message);
            // Rollback optimistic update
            setConversations(previousConversations);
            return false;
        }
    };

    // Archived toggle - optimistic update with rollback
    const handleToggleArchive = async (id: string, archived: boolean) => {
        let previousConversations: WhatsAppConversation[] = [];
        setConversations(prev => {
            previousConversations = prev;
            return prev.map(c => c.id === id ? { ...c, archived } : c);
        });

        try {
            await setConversationArchived(id, archived);
            return true;
        } catch (err: any) {
            console.error("setConversationArchived failed", err);
            const message = err?.message || "Failed to update archive status.";
            toast.error(message);
            // Rollback optimistic update
            setConversations(previousConversations);
            return false;
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
        handleSendMessage,
        handleSetLabels,
        handleTogglePin,
        handleToggleArchive,
        retry: loadConversations
    };
}

