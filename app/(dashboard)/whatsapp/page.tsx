"use client";

import { WhatsAppUI } from "@/components/whatsapp/WhatsAppUI";
import { useWhatsApp } from "@/hooks/useWhatsApp";

export default function WhatsAppPage() {
    const {
        conversations,
        selectedConversation,
        selectedConversationId,
        setSelectedConversationId,
        loading,
        error,
        isDemoMode,
        sending,
        handleSendMessage
    } = useWhatsApp();

    return (
        <WhatsAppUI
            conversations={conversations}
            selectedConversation={selectedConversation}
            selectedConversationId={selectedConversationId}
            setSelectedConversationId={setSelectedConversationId}
            loading={loading}
            error={error}
            isDemoMode={isDemoMode}
            sending={sending}
            onSendMessage={handleSendMessage}
        />
    );
}
