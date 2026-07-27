"use client";

import { WhatsAppUI } from "@/components/whatsapp/WhatsAppUI";
import { useWhatsApp } from "@/hooks/useWhatsApp";

export default function WhatsAppPage() {
    const {
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
        retry
    } = useWhatsApp();

    return (
        <WhatsAppUI
            conversations={conversations}
            selectedConversation={selectedConversation}
            selectedConversationId={selectedConversationId}
            setSelectedConversationId={setSelectedConversationId}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loading={loading}
            error={error}
            isDemoMode={isDemoMode}
            sending={sending}
            onSendMessage={handleSendMessage}
            onSetLabels={handleSetLabels}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onRetry={retry}
        />
    );
}

