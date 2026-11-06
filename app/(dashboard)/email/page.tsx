"use client";

import { EmailUI } from "@/components/email/EmailUI";
import { useEmail } from "@/hooks/useEmail";

export default function EmailPage() {
    const {
        filteredThreads,
        total,
        loading,
        error,
        isComposeOpen,
        sending,
        sendError,
        syncing,
        syncNotice,
        draftError,
        selectedThread,
        search,
        selectedLabel,
        setSearch,
        setSelectedLabel,
        setIsComposeOpen,
        setSelectedThread,
        handleSend,
        handleSync,
        handleSaveDraft,
        handleDeleteDraft,
        retry,
    } = useEmail();

    return (
        <EmailUI
            filteredThreads={filteredThreads}
            total={total}
            loading={loading}
            error={error}
            isComposeOpen={isComposeOpen}
            sending={sending}
            sendError={sendError}
            syncing={syncing}
            syncNotice={syncNotice}
            draftError={draftError}
            selectedThread={selectedThread}
            search={search}
            selectedLabel={selectedLabel}
            onSearchChange={setSearch}
            onLabelChange={setSelectedLabel}
            onOpenCompose={() => setIsComposeOpen(true)}
            onCloseCompose={() => setIsComposeOpen(false)}
            onSendEmail={handleSend}
            onSaveDraft={handleSaveDraft}
            onDeleteDraft={handleDeleteDraft}
            onSyncEmails={handleSync}
            onSelectThread={setSelectedThread}
            onRetry={retry}
        />
    );
}
