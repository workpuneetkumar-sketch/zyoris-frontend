"use client";

import { EmailUI } from "@/components/email/EmailUI";
import { useEmail } from "@/hooks/useEmail";

export default function EmailPage() {
    const {
        threads,
        filteredThreads,
        total,
        loading,
        error,
        isComposeOpen,
        sending,
        sendError,
        syncing,
        selectedThread,
        search,
        selectedLabel,
        setSearch,
        setSelectedLabel,
        setIsComposeOpen,
        setSelectedThread,
        handleSend,
        handleSync,
        retry,
    } = useEmail();

    return (
        <EmailUI
            threads={threads}
            filteredThreads={filteredThreads}
            total={total}
            loading={loading}
            error={error}
            isComposeOpen={isComposeOpen}
            sending={sending}
            sendError={sendError}
            syncing={syncing}
            selectedThread={selectedThread}
            search={search}
            selectedLabel={selectedLabel}
            onSearchChange={setSearch}
            onLabelChange={setSelectedLabel}
            onOpenCompose={() => setIsComposeOpen(true)}
            onCloseCompose={() => setIsComposeOpen(false)}
            onSendEmail={handleSend}
            onSyncEmails={handleSync}
            onSelectThread={setSelectedThread}
            onRetry={retry}
        />
    );
}
