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
        waStatus,
        waProfile,
        waStatusLoading,
        handleSendMessage,
        handleSetLabels,
        handleTogglePin,
        handleToggleArchive,
        handleAssignConversation,
        handleUpdateProfile,
        handleUploadMedia,
        retry,
        refreshStatus,
        refreshProfile,
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
            waStatus={waStatus}
            waProfile={waProfile}
            waStatusLoading={waStatusLoading}
            onSendMessage={handleSendMessage}
            onSetLabels={handleSetLabels}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onAssignConversation={handleAssignConversation}
            onUpdateProfile={handleUpdateProfile}
            onUploadMedia={handleUploadMedia}
            onRetry={retry}
            refreshStatus={refreshStatus}
            refreshProfile={refreshProfile}
        />
    );
}

