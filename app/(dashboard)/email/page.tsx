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
        templates,
        loadingTemplates,
        connectingGmail,
        gmailConnectError,
        setSearch,
        setSelectedLabel,
        setIsComposeOpen,
        setSelectedThread,
        handleSend,
        handleScheduleSend,
        handleCreateTemplate,
        handleSync,
        handleConnectGmail,
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
            templates={templates}
            loadingTemplates={loadingTemplates}
            connectingGmail={connectingGmail}
            gmailConnectError={gmailConnectError}
            onSearchChange={setSearch}
            onLabelChange={setSelectedLabel}
            onOpenCompose={() => setIsComposeOpen(true)}
            onCloseCompose={() => setIsComposeOpen(false)}
            onSendEmail={handleSend}
            onScheduleEmail={handleScheduleSend}
            onCreateTemplate={handleCreateTemplate}
            onSyncEmails={handleSync}
            onConnectGmail={handleConnectGmail}
            onSelectThread={setSelectedThread}
            onRetry={retry}
        />
    );
}
