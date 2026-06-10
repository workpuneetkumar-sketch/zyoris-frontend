"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchConversations, sendWhatsAppMessage, WhatsAppConversation, WhatsAppMessage } from "@/lib/api/whatsappApi";

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
            if (data && data.length > 0) {
                setConversations(data);
                setIsDemoMode(false);
            } else {
                console.warn("WhatsApp API returned no conversations, falling back to Demo Mode");
                setIsDemoMode(true);
                setConversations(MOCK_CONVERSATIONS);
            }
        } catch (err) {
            console.warn("WhatsApp API failed, falling back to Demo Mode", err);
            setIsDemoMode(true);
            setConversations(MOCK_CONVERSATIONS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const handleSendMessage = async (text: string) => {
        if (!selectedConversationId || !text.trim()) return false;
        
        setSending(true);
        try {
            if (isDemoMode) {
                // Simulate network delay
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
            } else {
                await sendWhatsAppMessage({ conversationId: selectedConversationId, text });
                await loadConversations();
                return true;
            }
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
