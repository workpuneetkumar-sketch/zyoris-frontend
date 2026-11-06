"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useEffect, useRef, useState } from "react";
import {
    AlertCircle,
    Archive,
    Bold,
    Check,
    ChevronLeft,
    FileText,
    Forward,
    Inbox,
    Italic,
    Link,
    Mail,
    Paperclip,
    Plus,
    RefreshCw,
    Reply,
    Search,
    Send,
    ShieldAlert,
    Star,
    Trash2,
    Underline,
    User,
    X,
} from "lucide-react";
import { EmailThread, FolderTab, EmailComposeSeed, EmailDraft } from "@/hooks/useEmail";
import { SendEmailPayload } from "@/lib/api/emailApi";
import { GmailConnectScreen } from "@/components/email/GmailConnectScreen";

const FOLDERS: { label: FolderTab; icon: React.ReactNode }[] = [
    { label: "Inbox", icon: <Inbox size={16} /> },
    { label: "Sent", icon: <Send size={16} /> },
    { label: "Drafts", icon: <FileText size={16} /> },
    { label: "Starred", icon: <Star size={16} /> },
    { label: "Important", icon: <ShieldAlert size={16} /> },
    { label: "Archive", icon: <Archive size={16} /> },
    { label: "Spam", icon: <AlertCircle size={16} /> },
    { label: "Trash", icon: <Trash2 size={16} /> },
    { label: "Accounts", icon: <Mail size={16} /> },
];

const FOLDER_INTEGRATION_NOTICES: Partial<Record<FolderTab, string>> = {
    Inbox: "The current backend provides an email activity log, not an inbox synchronization API. Connect-account and inbox integration require backend OAuth and mailbox sync support.",
    Starred: "Starred-message data and actions are not available from the current backend.",
    Important: "Important-message data and actions are not available from the current backend.",
    Archive: "Archive data and actions are not available from the current backend.",
    Spam: "Spam-folder data and actions are not available from the current backend.",
    Trash: "Trash-folder data and actions are not available from the current backend.",
};

function stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

function escapeHtml(value: string) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

interface ComposeModalProps {
    seed: EmailComposeSeed | null;
    sending: boolean;
    sendError: string | null;
    draftError: string | null;
    onClose: () => void;
    onSend: (data: SendEmailPayload) => Promise<boolean>;
    onSaveDraft: (draft: Omit<EmailDraft, "updatedAt">) => boolean;
    onDeleteDraft: (id: string) => boolean;
}

function ComposeModal({
    seed,
    sending,
    sendError,
    draftError,
    onClose,
    onSend,
    onSaveDraft,
    onDeleteDraft,
}: ComposeModalProps) {
    const [to, setTo] = useState(seed?.to || "");
    const [cc, setCc] = useState(seed?.cc || "");
    const [bcc, setBcc] = useState(seed?.bcc || "");
    const [subject, setSubject] = useState(seed?.subject || "");
    const [body, setBody] = useState(seed?.body || "");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [integrationError, setIntegrationError] = useState("");
    const [showCc, setShowCc] = useState(!!seed?.cc);
    const [showBcc, setShowBcc] = useState(!!seed?.bcc);
    const [recipientError, setRecipientError] = useState("");
    const [subjectError, setSubjectError] = useState("");
    const [bodyError, setBodyError] = useState("");
    const [minimized, setMinimized] = useState(false);
    const [sent, setSent] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editorRef.current) editorRef.current.innerHTML = seed?.body || "";
    }, [seed]);

    const validate = () => {
        const recipients = to.split(/[;,]/).map((recipient) => recipient.trim()).filter(Boolean);
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errors = {
            recipient: !recipients.length
                ? "Recipient is required."
                : recipients.length > 1
                ? "The current email service supports one recipient per message."
                : !validEmail.test(recipients[0])
                ? "Enter a valid email address."
                : "",
            subject: subject.trim() ? "" : "Subject is required.",
            body: stripHtml(body).trim() ? "" : "Message is required.",
        };
        setRecipientError(errors.recipient);
        setSubjectError(errors.subject);
        setBodyError(errors.body);
        return !errors.recipient && !errors.subject && !errors.body;
    };

    const handleSend = async () => {
        if (cc.trim() || bcc.trim() || attachments.length) {
            setIntegrationError(
                attachments.length
                    ? "The current email service cannot send attachments. Remove selected files to send this email."
                    : "The current email service cannot send CC or BCC recipients. Remove those recipients to send this email."
            );
            return;
        }
        setIntegrationError("");
        if (!validate()) return;
        const success = await onSend({ to: to.trim(), subject: subject.trim(), body });
        if (success) {
            if (seed?.draftId) onDeleteDraft(seed.draftId);
            setSent(true);
            window.setTimeout(onClose, 900);
        }
    };

    const handleSaveDraft = () => {
        if (attachments.length) {
            setIntegrationError("Attachments are not stored in local drafts. Remove selected files before saving this draft.");
            return;
        }
        const success = onSaveDraft({
            id: seed?.draftId || `draft-${Date.now()}`,
            to: to.trim(),
            cc: cc.trim(),
            bcc: bcc.trim(),
            subject: subject.trim(),
            body,
        });
        if (success) onClose();
    };

    const handleDiscard = () => {
        if (seed?.draftId) onDeleteDraft(seed.draftId);
        onClose();
    };

    const handleClose = () => {
        if (!sent && (to.trim() || cc.trim() || bcc.trim() || subject.trim() || stripHtml(body).trim())) {
            handleSaveDraft();
            return;
        }
        onClose();
    };

    const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length) {
            setAttachments((current) => [...current, ...selectedFiles]);
            setIntegrationError("Files can be selected and previewed, but the current email service cannot include attachments when sending.");
        }
        event.target.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index));
        setIntegrationError("");
    };

    const format = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        setBody(editorRef.current?.innerHTML || "");
    };

    if (minimized) {
        return (
            <div className="fixed bottom-0 right-4 z-50 w-72 rounded-t-xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between px-4 py-3">
                    <button onClick={() => setMinimized(false)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-gray-800">{subject || "New Email"}</button>
                    <button aria-label="Close compose" onClick={handleClose} className="ml-3 text-gray-500 hover:text-gray-800"><X size={15} /></button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
            onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    void handleSend();
                }
            }}
        >
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{seed?.draftId ? "Edit Draft" : "New Email"}</h2>
                        <p className="mt-0.5 text-xs text-gray-500">Send using the email service configured for your organization.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button aria-label="Minimize compose" onClick={() => setMinimized(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">−</button>
                        <button aria-label="Close compose" onClick={handleClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"><X size={16} /></button>
                    </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                    {sendError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{sendError}</p>}
                    {draftError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle size={16} className="mt-0.5 shrink-0" />{draftError}</p>}
                    {sent && <p role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"><Check size={16} />Email accepted by the server.</p>}
                    {seed?.notice && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{seed.notice}</p>}

                    <div className="flex items-center gap-3 border-b border-gray-100 pb-3 text-sm">
                        <span className="w-12 shrink-0 text-gray-500">From</span>
                        <span className="text-gray-600">Organization sender (configured on server)</span>
                    </div>
                    <div>
                        <label htmlFor="email-to" className="sr-only">To</label>
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                            <span className="w-12 shrink-0 text-sm text-gray-500">To</span>
                            <input id="email-to" value={to} onChange={(event) => setTo(event.target.value)} placeholder="name@example.com" className="min-w-0 flex-1 text-sm text-gray-900 outline-none" />
                            <button type="button" onClick={() => setShowCc((visible) => !visible)} className={`text-xs ${showCc ? "text-blue-700" : "text-gray-500 hover:text-blue-700"}`}>Cc</button>
                            <button type="button" onClick={() => setShowBcc((visible) => !visible)} className={`text-xs ${showBcc ? "text-blue-700" : "text-gray-500 hover:text-blue-700"}`}>Bcc</button>
                        </div>
                        {recipientError && <p className="mt-1 text-xs text-red-600">{recipientError}</p>}
                        {showCc && (
                            <div className="flex items-center gap-3 border-b border-gray-100 py-2">
                                <label htmlFor="email-cc" className="w-12 shrink-0 text-sm text-gray-500">Cc</label>
                                <input id="email-cc" value={cc} onChange={(event) => setCc(event.target.value)} placeholder="Additional recipient" className="min-w-0 flex-1 text-sm text-gray-900 outline-none" />
                            </div>
                        )}
                        {showBcc && (
                            <div className="flex items-center gap-3 border-b border-gray-100 py-2">
                                <label htmlFor="email-bcc" className="w-12 shrink-0 text-sm text-gray-500">Bcc</label>
                                <input id="email-bcc" value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="Hidden recipient" className="min-w-0 flex-1 text-sm text-gray-900 outline-none" />
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="email-subject" className="sr-only">Subject</label>
                        <div className="border-b border-gray-100 pb-2">
                            <input id="email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="w-full text-sm text-gray-900 outline-none" />
                        </div>
                        {subjectError && <p className="mt-1 text-xs text-red-600">{subjectError}</p>}
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-1.5">
                            {[
                                { label: "Bold", icon: <Bold size={15} />, command: "bold" },
                                { label: "Italic", icon: <Italic size={15} />, command: "italic" },
                                { label: "Underline", icon: <Underline size={15} />, command: "underline" },
                                { label: "Bulleted list", icon: <span className="text-sm">•≡</span>, command: "insertUnorderedList" },
                                { label: "Numbered list", icon: <span className="text-xs">1.≡</span>, command: "insertOrderedList" },
                            ].map((item) => (
                                <button key={item.label} type="button" aria-label={item.label} title={item.label} onMouseDown={(event) => event.preventDefault()} onClick={() => format(item.command)} className="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-white hover:text-blue-700">
                                    {item.icon}
                                </button>
                            ))}
                            <button type="button" aria-label="Insert link" title="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={() => { const url = window.prompt("Enter a link URL"); if (url) format("createLink", url); }} className="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-white hover:text-blue-700"><Link size={15} /></button>
                            <input ref={attachmentInputRef} type="file" multiple className="hidden" onChange={handleAttachmentSelection} />
                            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => attachmentInputRef.current?.click()} title="Select attachments" className="ml-auto flex h-8 items-center gap-1.5 rounded px-2 text-xs text-gray-600 hover:bg-white hover:text-blue-700">
                                <Paperclip size={14} />Attach files
                            </button>
                        </div>
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            role="textbox"
                            aria-label="Message"
                            aria-multiline="true"
                            onInput={(event) => setBody(event.currentTarget.innerHTML)}
                            className="min-h-48 whitespace-pre-wrap px-3 py-3 text-sm text-gray-800 outline-none empty:before:text-gray-400 empty:before:content-['Write_your_message...']"
                        />
                        {attachments.length > 0 && (
                            <ul aria-label="Selected attachments" className="flex flex-wrap gap-2 border-t border-gray-100 px-3 py-2">
                                {attachments.map((file, index) => (
                                    <li key={`${file.name}-${file.lastModified}-${index}`} className="flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
                                        <Paperclip size={12} className="shrink-0 text-gray-400" />
                                        <span className="max-w-48 truncate">{file.name}</span>
                                        <span className="shrink-0 text-gray-400">{file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}</span>
                                        <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeAttachment(index)} className="shrink-0 text-gray-400 hover:text-red-600"><X size={14} /></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {bodyError && <p className="text-xs text-red-600">{bodyError}</p>}
                    {integrationError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{integrationError}</p>}
                    <p className="text-xs text-gray-500">The server currently supports one To recipient only. CC, BCC, attachments, and scheduled sending are not supported for delivery.</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-6">
                    <button onClick={handleDiscard} disabled={sending} className="h-10 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-50">Discard</button>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSaveDraft} disabled={sending} className="h-10 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-white disabled:opacity-50">Save Draft</button>
                        <button onClick={handleSend} disabled={sending || sent} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            {sending ? "Sending…" : "Send"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ThreadPanel({ thread, onClose, onReply, onForward, onEditDraft }: {
    thread: EmailThread;
    onClose: () => void;
    onReply: () => void;
    onForward: () => void;
    onEditDraft: (draft: EmailDraft) => void;
}) {
    if (thread.draft) {
        return (
            <div className="flex h-full flex-col">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                    <button onClick={onClose} aria-label="Back to email list" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft size={15} /></button>
                    <h3 className="min-w-0 flex-1 truncate font-semibold text-gray-900">{thread.subject}</h3>
                    <button onClick={() => onEditDraft(thread.draft!)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Edit Draft</button>
                </div>
                <div className="p-5 text-sm text-gray-600">
                    <p><span className="text-gray-400">To:</span> {thread.draft.to || "No recipient"}</p>
                    <div className="mt-4 whitespace-pre-wrap">{stripHtml(thread.draft.body)}</div>
                    <p className="mt-5 text-xs text-gray-400">Saved on this device only</p>
                </div>
            </div>
        );
    }
    const latestEmail = thread.emails[thread.emails.length - 1];
    const latestStatus = `${latestEmail?.direction || ""} ${latestEmail?.status || ""}`.toUpperCase();
    const canReply = latestStatus.includes("SENT") || latestStatus.includes("OUTBOUND")
        ? !!latestEmail?.to
        : !!latestEmail?.from;
    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-5">
                <button onClick={onClose} aria-label="Back to email list" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft size={15} /></button>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold text-gray-900">{thread.subject}</h3>
                    <p className="truncate text-xs text-gray-500">{thread.participants.join(", ")}</p>
                </div>
                <PermissionGuard permission="email.send">
                    {canReply && <button onClick={onReply} className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"><Reply size={13} />Reply</button>}
                    {!!latestEmail && <button onClick={onForward} className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Forward size={13} />Forward</button>}
                </PermissionGuard>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 p-4 sm:p-5">
                {thread.emails.map((email) => (
                    <article key={email.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><User size={14} /></div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-gray-800">{email.from || "Unknown Sender"}</p>
                                    <p className="truncate text-[11px] text-gray-500">To: {email.to}</p>
                                </div>
                            </div>
                            <time className="shrink-0 text-[11px] text-gray-400">
                                {email.sentAt || email.createdAt
                                    ? new Date(email.sentAt || email.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                                    : "Date unavailable"}
                            </time>
                        </div>
                        <div className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-relaxed text-gray-700">{stripHtml(email.body)}</div>
                        {!!email.attachments?.length && <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500"><Paperclip size={13} />{email.attachments.length} attachment(s) listed; download links are not available.</div>}
                    </article>
                ))}
            </div>
        </div>
    );
}

function ThreadItem({ thread, onClick, isSelected }: { thread: EmailThread; onClick: () => void; isSelected: boolean }) {
    const date = thread.latestDate
        ? new Date(thread.latestDate).toLocaleDateString([], { month: "short", day: "numeric" })
        : "";
    return (
        <button onClick={onClick} className={`w-full border-b border-gray-100 px-4 py-3.5 text-left transition-colors hover:bg-blue-50/40 ${isSelected ? "border-l-2 border-l-blue-500 bg-blue-50" : ""}`}>
            <div className="mb-1 flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                    {thread.isUnread && <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    <span className="truncate text-[13px] font-semibold leading-tight text-gray-900">{thread.subject}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-gray-400">
                    {thread.hasAttachments && <Paperclip size={12} aria-label="Has attachments" />}
                    {date}
                </span>
            </div>
            <p className="truncate text-xs leading-snug text-gray-500">{thread.latestSender}{thread.latestRecipient ? ` to ${thread.latestRecipient}` : ""}</p>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">{thread.latestPreview}</p>
        </button>
    );
}

export interface EmailUIProps {
    filteredThreads: EmailThread[];
    total: number;
    loading: boolean;
    error: string | null;
    isComposeOpen: boolean;
    sending: boolean;
    sendError: string | null;
    syncing: boolean;
    syncNotice: string | null;
    draftError: string | null;
    selectedThread: EmailThread | null;
    search: string;
    selectedLabel: FolderTab;
    onSearchChange: (value: string) => void;
    onLabelChange: (label: FolderTab) => void;
    onOpenCompose: (seed?: EmailComposeSeed) => void;
    onCloseCompose: () => void;
    onSendEmail: (data: SendEmailPayload) => Promise<boolean>;
    onSaveDraft: (draft: Omit<EmailDraft, "updatedAt">) => boolean;
    onDeleteDraft: (id: string) => boolean;
    onSyncEmails: () => void;
    onSelectThread: (thread: EmailThread | null) => void;
    onRetry: () => void;
}

export function EmailUI({
    filteredThreads, total, loading, error, isComposeOpen, sending, sendError, syncing, syncNotice, draftError,
    selectedThread, search, selectedLabel, onSearchChange, onLabelChange,
    onOpenCompose, onCloseCompose, onSendEmail, onSaveDraft, onDeleteDraft, onSyncEmails,
    onSelectThread, onRetry,
}: EmailUIProps) {
    const [composeSeed, setComposeSeed] = useState<EmailComposeSeed | null>(null);
    const [syncNoticeVisible, setSyncNoticeVisible] = useState(false);
    const openCompose = (seed?: EmailComposeSeed) => {
        setComposeSeed(seed || null);
        onOpenCompose(seed);
    };
    const folderNotice = FOLDER_INTEGRATION_NOTICES[selectedLabel];

    const replyToThread = (forward: boolean) => {
        if (!selectedThread) return;
        const lastEmail = selectedThread.emails[selectedThread.emails.length - 1];
        if (!lastEmail) return;
        const status = `${lastEmail.direction || ""} ${lastEmail.status || ""}`.toUpperCase();
        const replyRecipient = status.includes("SENT") || status.includes("OUTBOUND") ? lastEmail.to : lastEmail.from;
        const subjectPrefix = forward ? "Fwd:" : "Re:";
        const subject = /^(re|fwd|fw):\s*/i.test(selectedThread.subject)
            ? selectedThread.subject
            : `${subjectPrefix} ${selectedThread.subject}`;
        const quotedMessage = escapeHtml(stripHtml(lastEmail.body));
        const body = forward
            ? `<br><br>---------- Forwarded message ----------<br>From: ${escapeHtml(lastEmail.from || "")}<br>To: ${escapeHtml(lastEmail.to)}<br>Subject: ${escapeHtml(lastEmail.subject)}<br><br>${quotedMessage}`
            : `<br><br>On ${escapeHtml(lastEmail.sentAt || lastEmail.createdAt)}, ${escapeHtml(lastEmail.from || "the sender")} wrote:<br>${quotedMessage.split("\n").map((line) => `&gt; ${line}`).join("<br>")}`;
        openCompose({
            to: forward ? "" : replyRecipient || "",
            subject,
            body,
            notice: forward ? "The original message text is included. Attachments cannot be forwarded until the backend supports them." : undefined,
        });
    };

    return (
        <div className="min-h-full">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900">Email</h1>
                    <p className="mt-1 text-[15px] font-medium text-gray-500">
                        {selectedLabel === "Accounts" ? "Email account integrations" : `${total} ${selectedLabel === "Drafts" ? "draft" : "email"}${total !== 1 ? "s" : ""} in ${selectedLabel}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setSyncNoticeVisible(true); onSyncEmails(); }} disabled={syncing} title="Check email sync status" className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50">
                        <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /><span className="hidden sm:inline">Sync status</span>
                    </button>
                    <PermissionGuard permission="email.send">
                        <button onClick={() => openCompose()} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700"><Plus size={18} />Compose</button>
                    </PermissionGuard>
                </div>
            </div>

            {syncNoticeVisible && syncNotice && (
                <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span>{syncNotice}</span>
                    <button aria-label="Dismiss sync message" onClick={() => setSyncNoticeVisible(false)}><X size={16} /></button>
                </div>
            )}

            {selectedLabel === "Accounts" ? (
                <GmailConnectScreen />
            ) : (
                <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:flex-row">
                    <nav aria-label="Email folders" className="flex gap-1 overflow-x-auto border-b border-gray-100 p-2 lg:w-48 lg:shrink-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-3">
                        {FOLDERS.filter((folder) => folder.label !== "Accounts").map((folder) => (
                            <button key={folder.label} onClick={() => onLabelChange(folder.label)} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:w-full ${selectedLabel === folder.label ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                                <span className={selectedLabel === folder.label ? "text-blue-600" : "text-gray-400"}>{folder.icon}</span>{folder.label}
                            </button>
                        ))}
                        <button onClick={() => onLabelChange("Accounts")} className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 lg:mt-auto"><Mail size={16} className="text-gray-400" />Accounts</button>
                    </nav>

                    <div className="flex min-h-[420px] min-w-0 flex-1 flex-col md:flex-row">
                        <section className="flex min-h-[260px] w-full shrink-0 flex-col border-b border-gray-100 md:w-72 md:border-b-0 md:border-r">
                            <div className="border-b border-gray-100 p-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="search" aria-label="Search current email list" placeholder="Search email log…" value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <p className="mt-2 text-[11px] text-gray-400">Search is limited to messages available in this list.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" /></div>
                                ) : error ? (
                                    <div className="p-4 text-center">
                                        <AlertCircle size={28} className="mx-auto mb-2 text-red-300" />
                                        <p className="mb-3 text-sm text-gray-500">{error}</p>
                                        <button onClick={onRetry} className="text-xs font-medium text-blue-600 hover:underline">Try again</button>
                                    </div>
                                ) : folderNotice ? (
                                    <div className="px-5 py-12 text-center">
                                        <Mail size={30} className="mx-auto mb-3 text-gray-200" />
                                        <p className="text-sm font-medium text-gray-700">{selectedLabel} unavailable</p>
                                        <p className="mt-2 text-xs leading-relaxed text-gray-500">{folderNotice}</p>
                                        <button onClick={() => onLabelChange("Accounts")} className="mt-4 text-xs font-semibold text-blue-600 hover:underline">View account integration</button>
                                    </div>
                                ) : filteredThreads.length === 0 ? (
                                    <div className="px-5 py-12 text-center">
                                        <Mail size={30} className="mx-auto mb-3 text-gray-200" />
                                        <p className="text-sm font-medium text-gray-500">{search ? "No emails match your search." : selectedLabel === "Drafts" ? "No local drafts." : "No email activity available."}</p>
                                        {selectedLabel === "Drafts" && <p className="mt-2 text-xs text-gray-400">Drafts are saved on this device and are not synced.</p>}
                                    </div>
                                ) : filteredThreads.map((thread) => (
                                    <ThreadItem key={thread.id} thread={thread} isSelected={selectedThread?.id === thread.id} onClick={() => onSelectThread(thread)} />
                                ))}
                            </div>
                        </section>

                        <section className="min-h-[360px] min-w-0 flex-1 overflow-hidden">
                            {selectedThread ? (
                                <ThreadPanel
                                    thread={selectedThread}
                                    onClose={() => onSelectThread(null)}
                                    onReply={() => replyToThread(false)}
                                    onForward={() => replyToThread(true)}
                                    onEditDraft={(draft) => openCompose({ ...draft, draftId: draft.id })}
                                />
                            ) : (
                                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-300"><Mail size={28} /></div>
                                    <p className="text-base font-semibold text-gray-700">{selectedLabel === "Sent" ? "Organization email activity" : "Select an email"}</p>
                                    <p className="max-w-sm text-sm text-gray-400">
                                        {selectedLabel === "Sent"
                                            ? "This view shows email records available from the current backend. It is not a connected mailbox."
                                            : "Choose an item from the list to view its available details."}
                                    </p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}

            {isComposeOpen && (
                <ComposeModal
                    key={composeSeed?.draftId || `${composeSeed?.subject || ""}-${composeSeed?.to || ""}`}
                    seed={composeSeed}
                    sending={sending}
                    sendError={sendError}
                    draftError={draftError}
                    onClose={() => { setComposeSeed(null); onCloseCompose(); }}
                    onSend={onSendEmail}
                    onSaveDraft={onSaveDraft}
                    onDeleteDraft={onDeleteDraft}
                />
            )}
        </div>
    );
}
