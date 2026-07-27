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
            
            if (!data || data.length === 0) {
                console.warn("WhatsApp API returned no conversations, falling back to Demo Mode");
                setIsDemoMode(true);
                setConversations(MOCK_CONVERSATIONS);
            } else {
                setIsDemoMode(false);
                setConversations(prev => {
                    return data.map(newConv => {
                        const existing = prev.find(p => p.id === newConv.id);
                        // Preserve fetched messages if summary API doesn't include full history
                        const messages = existing && (!newConv.messages || newConv.messages.length === 0) && existing.messages && existing.messages.length > 0
                            ? existing.messages
                            : (newConv.messages || []);
                        return {
                            ...newConv,
                            pinned: newConv.pinned ?? existing?.pinned ?? false,
                            archived: newConv.archived ?? existing?.archived ?? false,
                            labels: newConv.labels ?? existing?.labels ?? [],
                            messages
                        };
                    });
                });
            }
        } catch (err: any) {
            console.error("WhatsApp API failed", err);
            const errorMsg = err?.message || "Failed to load conversations.";
            setError(errorMsg);
            // In demo mode or fallback, load mock conversations so user can continue testing UI
            setIsDemoMode(true);
            setConversations(MOCK_CONVERSATIONS);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMessages = useCallback(async (conversationId: string) => {
        try {
            // ALWAYS fire the API so it appears in the Network tab
            const messages = await fetchConversationMessages(conversationId);
            
            // Only update state from API if we are NOT in demo mode (otherwise keep mock messages)
            if (!isDemoMode) {
                setConversations(prev => prev.map(conv => 
                    conv.id === conversationId ? { ...conv, messages: messages || [] } : conv
                ));
            }
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    }, [isDemoMode]);

    useEffect(() => {
        loadConversations();

        // Poll for new messages every 5 seconds
        const interval = setInterval(() => {
            loadConversations();
        }, 5000);

        return () => clearInterval(interval);
    }, [loadConversations]);

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
            // ALWAYS fire the API so it appears in the Network tab
            let apiSuccess = false;
            try {
                await sendWhatsAppMessage({ 
                    to: currentConversation.contactPhone, 
                    message: text,
                    conversationId: selectedConversationId 
                });
                apiSuccess = true;
            } catch (apiErr) {
                console.error("sendWhatsAppMessage API failed", apiErr);
                if (!isDemoMode) throw apiErr;
            }

            if (isDemoMode) {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const newMessage: WhatsAppMessage = {
                    id: `m_${Date.now()}`,
                    text,
                    sender: 'user',
                    timestamp: new Date().toISOString()
                };
                
                setConversations(prev => prev.map(conv => {
                    if (conv.id === selectedConversationId) {
                        return {
                            ...conv,
                            messages: [...conv.messages, newMessage],
                            updatedAt: newMessage.timestamp
                        };
                    }
                    return conv;
                }));
                return true;
            } else if (apiSuccess) {
                await loadConversations();
                await loadMessages(selectedConversationId);
                return true;
            }
            return false;
        } catch (err) {
            setError("Failed to send message.");
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

