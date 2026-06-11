"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchConversations, fetchConversationMessages, sendWhatsAppMessage, WhatsAppConversation, WhatsAppMessage } from "@/lib/api/whatsappApi";
import { MOCK_CONVERSATIONS } from "@/lib/api/whatsappMockData";

export function useWhatsApp() {
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
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
                        // Preserve fetched messages if the summary API doesn't include full history
                        if (existing && (!newConv.messages || newConv.messages.length === 0) && existing.messages && existing.messages.length > 0) {
                            return { ...newConv, messages: existing.messages };
                        }
                        // Ensure messages array exists
                        return { ...newConv, messages: newConv.messages || [] };
                    });
                });
            }
        } catch (err) {
            console.error("WhatsApp API failed", err);
            setError("Failed to load conversations. Showing demo data.");
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
                if (!isDemoMode) throw apiErr; // Only throw if we are relying on real data
            }

            if (isDemoMode) {
                // Simulate network delay for mock UI update
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

    const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

    return {
        conversations,
        selectedConversation,
        selectedConversationId,
        setSelectedConversationId,
        loading,
        error,
        isDemoMode,
        sending,
        handleSendMessage,
        retry: loadConversations
    };
}
