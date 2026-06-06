"use client";

import { EmailUI } from "@/components/email/EmailUI";
import { useEmail } from "@/hooks/useEmail";

export default function EmailPage() {
    const {
        emails,
        filteredEmails,
        total,
        loading,
        error,
        isComposeOpen,
        sending,
        sendError,
        selectedEmail,
        search,
        setSearch,
        setIsComposeOpen,
        setSelectedEmail,
        handleSend,
        retry,
    } = useEmail();

    return (
        <EmailUI
            emails={emails}
            filteredEmails={filteredEmails}
            total={total}
            loading={loading}
            error={error}
            isComposeOpen={isComposeOpen}
            sending={sending}
            sendError={sendError}
            selectedEmail={selectedEmail}
            search={search}
            onSearchChange={setSearch}
            onOpenCompose={() => setIsComposeOpen(true)}
            onCloseCompose={() => setIsComposeOpen(false)}
            onSendEmail={handleSend}
            onSelectEmail={setSelectedEmail}
            onRetry={retry}
        />
    );
}
