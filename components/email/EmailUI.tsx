"use client";

import { useState } from "react";
import {
    Plus,
    Search,
    Mail,
    Send,
    X,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Inbox,
    Send as SendIcon,
    FileText,
    Trash2,
    Clock,
    Paperclip,
    Layers,
    ExternalLink,
    CheckCircle2,
    ShieldAlert,
    Wand2,
} from "lucide-react";
import { EmailLog, EmailTemplate, SendEmailPayload, EmailAttachment } from "@/lib/api/emailApi";
import { EmailThread, FolderTab } from "@/hooks/useEmail";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const oneDayMs = 86_400_000;
        if (diff < oneDayMs && d.getDate() === now.getDate()) {
            return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        }
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
        return "—";
    }
}

function formatFullDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
}

function getInitials(email: string): string {
    if (!email) return "?";
    const local = email.split("@")[0] ?? "";
    return local
        .split(/[.\-_+]/)
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "?";
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── Avatar Component ──────────────────────────────────────────────────────────

function Avatar({ email }: { email: string }) {
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm border border-blue-400/30">
            {getInitials(email)}
        </div>
    );
}

// ── Templates Management Modal ─────────────────────────────────────────────────

interface TemplatesModalProps {
    templates: EmailTemplate[];
    onClose: () => void;
    onCreate: (data: { name: string; subject: string; body: string }) => Promise<boolean>;
}

function TemplatesModal({ templates, onClose, onCreate }: TemplatesModalProps) {
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim() || !subject.trim() || !body.trim()) {
            setError("All fields (Name, Subject, Body) are required.");
            return;
        }
        setSaving(true);
        setError(null);
        const ok = await onCreate({ name, subject, body });
        setSaving(false);
        if (ok) {
            setName("");
            setSubject("");
            setBody("");
        } else {
            setError("Failed to save template. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-8">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Wand2 size={18} className="text-blue-600" /> Email Templates
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Manage and reuse email templates</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    {/* Create New Template Form */}
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                        <h3 className="text-sm font-bold text-blue-900">Create New Template</h3>
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-medium">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Template Name *</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Sales Follow-up"
                                className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Default Subject *</label>
                            <input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Following up on {{topic}}"
                                className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Body (Supports {"{{variable}}"} placeholders) *</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={4}
                                placeholder="Hi {{name}}, thanks for your time..."
                                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {saving ? "Saving..." : "Save Template"}
                            </button>
                        </div>
                    </div>

                    {/* Existing Templates List */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 mb-3">Saved Templates ({templates.length})</h3>
                        {templates.length === 0 ? (
                            <p className="text-xs text-gray-400 font-medium italic">No templates created yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {templates.map((tpl) => (
                                    <div key={tpl.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900 text-sm">{tpl.name}</span>
                                        </div>
                                        <p className="text-xs font-semibold text-blue-700 mb-1">Subject: {tpl.subject}</p>
                                        <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100 font-mono">
                                            {tpl.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Compose Modal ─────────────────────────────────────────────────────────────

interface ComposeModalProps {
    templates: EmailTemplate[];
    sending: boolean;
    sendError: string | null;
    onClose: () => void;
    onSend: (data: SendEmailPayload) => Promise<boolean>;
    onSchedule?: (data: SendEmailPayload) => Promise<boolean>;
    leadId?: string;
    dealId?: string;
    contactId?: string;
}

function ComposeModal({
    templates,
    sending,
    sendError,
    onClose,
    onSend,
    onSchedule,
    leadId,
    dealId,
    contactId,
}: ComposeModalProps) {
    const [form, setForm] = useState<SendEmailPayload>({
        to: "",
        subject: "",
        body: "",
        leadId,
        dealId,
        contactId,
    });

    const [ccString, setCcString] = useState("");
    const [bccString, setBccString] = useState("");
    const [showCcBcc, setShowCcBcc] = useState(false);

    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [placeholders, setPlaceholders] = useState<string[]>([]);

    const [isScheduleMode, setIsScheduleMode] = useState(false);
    const [scheduledAtDate, setScheduledAtDate] = useState("");

    const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
    const [newAttachName, setNewAttachName] = useState("");
    const [newAttachUrl, setNewAttachUrl] = useState("");
    const [showAttachInput, setShowAttachInput] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) {
            setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
        }
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;

        const tpl = templates.find((t) => t.id === templateId);
        if (tpl) {
            setForm((prev) => ({
                ...prev,
                subject: tpl.subject,
                body: tpl.body,
                templateId: tpl.id,
            }));

            // Extract placeholders like {{name}}
            const matches = Array.from(
                new Set([...tpl.subject.matchAll(/\{\{(.*?)\}\}/g), ...tpl.body.matchAll(/\{\{(.*?)\}\}/g)])
            ).map((m) => m[1].trim());

            setPlaceholders(matches);
            const initialVars: Record<string, string> = {};
            matches.forEach((p) => {
                initialVars[p] = "";
            });
            setVariables(initialVars);
        }
    };

    const handleVariableChange = (key: string, val: string) => {
        const updated = { ...variables, [key]: val };
        setVariables(updated);
    };

    const handleAddAttachment = () => {
        if (newAttachName.trim()) {
            setAttachments((prev) => [
                ...prev,
                { filename: newAttachName.trim(), url: newAttachUrl.trim() || undefined },
            ]);
            setNewAttachName("");
            setNewAttachUrl("");
            setShowAttachInput(false);
        }
    };

    const handleRemoveAttachment = (idx: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!form.to.trim()) {
            newErrors.to = "Recipient email is required";
        } else if (!isValidEmail(form.to)) {
            newErrors.to = "Please enter a valid email address (e.g. user@domain.com)";
        }
        if (!form.subject.trim()) newErrors.subject = "Subject is required";
        if (!form.body.trim()) newErrors.body = "Body cannot be empty";

        if (isScheduleMode) {
            if (!scheduledAtDate) {
                newErrors.scheduledAt = "Please select a date and time for schedule send";
            } else {
                const schedTime = new Date(scheduledAtDate).getTime();
                if (isNaN(schedTime) || schedTime <= Date.now()) {
                    newErrors.scheduledAt = "Scheduled date & time must be in the future";
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (schedule: boolean) => {
        setIsScheduleMode(schedule);
        if (!validateForm()) return;

        const ccArray = ccString
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && isValidEmail(s));
        const bccArray = bccString
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && isValidEmail(s));

        const payload: SendEmailPayload = {
            ...form,
            cc: ccArray.length > 0 ? ccArray : undefined,
            bcc: bccArray.length > 0 ? bccArray : undefined,
            templateId: selectedTemplateId || undefined,
            variables: Object.keys(variables).length > 0 ? variables : undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            scheduledAt: schedule && scheduledAtDate ? new Date(scheduledAtDate).toISOString() : undefined,
        };

        if (schedule && onSchedule) {
            await onSchedule(payload);
        } else {
            await onSend(payload);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-8">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50/90 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <Mail className="text-blue-600" size={20} /> New Message
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Compose, template & schedule email</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {sendError && (
                        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Error Sending Email</p>
                                <p>{sendError}</p>
                            </div>
                        </div>
                    )}

                    {/* Template Picker */}
                    {templates.length > 0 && (
                        <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Wand2 size={16} className="text-blue-600 shrink-0" />
                                <span className="text-xs font-semibold text-blue-900">Insert Template:</span>
                            </div>
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => handleSelectTemplate(e.target.value)}
                                className="h-9 px-3 text-xs font-medium rounded-lg border border-blue-200 bg-white text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-xs"
                            >
                                <option value="">-- Choose Template --</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.subject})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Template Variables Input */}
                    {placeholders.length > 0 && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
                            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                Template Placeholders ({placeholders.length})
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {placeholders.map((p) => (
                                    <div key={p}>
                                        <label className="block text-[11px] font-semibold text-amber-800 capitalize mb-0.5">
                                            {p}
                                        </label>
                                        <input
                                            type="text"
                                            value={variables[p] || ""}
                                            onChange={(e) => handleVariableChange(p, e.target.value)}
                                            placeholder={`Value for {{${p}}}`}
                                            className="w-full h-8 px-2.5 text-xs rounded-lg border border-amber-200 outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* To Field */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">To *</label>
                            <button
                                type="button"
                                onClick={() => setShowCcBcc(!showCcBcc)}
                                className="text-xs text-blue-600 font-semibold hover:underline"
                            >
                                {showCcBcc ? "Hide CC/BCC" : "+ CC / BCC"}
                            </button>
                        </div>
                        <input
                            name="to"
                            type="email"
                            value={form.to}
                            onChange={handleChange}
                            placeholder="recipient@example.com"
                            className={`w-full h-10 rounded-xl border px-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${errors.to ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                    </div>

                    {/* CC / BCC Fields */}
                    {showCcBcc && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">CC (Comma separated)</label>
                                <input
                                    type="text"
                                    value={ccString}
                                    onChange={(e) => setCcString(e.target.value)}
                                    placeholder="cc1@example.com, cc2@example.com"
                                    className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">BCC (Comma separated)</label>
                                <input
                                    type="text"
                                    value={bccString}
                                    onChange={(e) => setBccString(e.target.value)}
                                    placeholder="bcc1@example.com, bcc2@example.com"
                                    className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Subject Field */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Subject *</label>
                        <input
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            placeholder="Email subject..."
                            className={`w-full h-10 rounded-xl border px-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${errors.subject ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                    </div>

                    {/* Body Field */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Body *</label>
                        <textarea
                            name="body"
                            value={form.body}
                            onChange={handleChange}
                            placeholder="Write your message here..."
                            rows={6}
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none transition-all focus:ring-2 focus:ring-blue-500/20 ${errors.body ? "border-red-400 bg-red-50/30" : "border-gray-200 focus:border-blue-500"}`}
                        />
                        {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body}</p>}
                    </div>

                    {/* Attachments Section */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                                <Paperclip size={14} /> Attachments ({attachments.length})
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowAttachInput(!showAttachInput)}
                                className="text-xs text-blue-600 font-semibold hover:underline"
                            >
                                + Add Attachment
                            </button>
                        </div>
                        {showAttachInput && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="File Name (e.g. Proposal.pdf)"
                                    value={newAttachName}
                                    onChange={(e) => setNewAttachName(e.target.value)}
                                    className="w-full h-8 px-3 text-xs rounded-lg border border-gray-300 outline-none"
                                />
                                <input
                                    type="url"
                                    placeholder="File URL (optional)"
                                    value={newAttachUrl}
                                    onChange={(e) => setNewAttachUrl(e.target.value)}
                                    className="w-full h-8 px-3 text-xs rounded-lg border border-gray-300 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddAttachment}
                                    className="px-3 py-1 bg-gray-800 text-white rounded-lg text-xs font-semibold"
                                >
                                    Attach File
                                </button>
                            </div>
                        )}
                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((att, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                                        <Paperclip size={12} /> {att.filename}
                                        <button type="button" onClick={() => handleRemoveAttachment(idx)} className="hover:text-red-600">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Schedule Send Date Picker */}
                    {isScheduleMode && (
                        <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
                            <label className="block text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                <Clock size={15} /> Select Schedule Date & Time *
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledAtDate}
                                onChange={(e) => {
                                    setScheduledAtDate(e.target.value);
                                    if (errors.scheduledAt) setErrors((prev) => ({ ...prev, scheduledAt: "" }));
                                }}
                                className={`w-full h-10 px-3 text-xs rounded-xl border ${errors.scheduledAt ? "border-red-400 bg-red-50" : "border-purple-200"} bg-white outline-none focus:ring-2 focus:ring-purple-500`}
                            />
                            {errors.scheduledAt && <p className="text-xs text-red-500 font-semibold">{errors.scheduledAt}</p>}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsScheduleMode(!isScheduleMode)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                                isScheduleMode
                                    ? "bg-purple-100 text-purple-800 border-purple-300"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                            <Clock size={14} />
                            {isScheduleMode ? "Schedule Mode Active" : "Schedule Send"}
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            Discard
                        </button>

                        {isScheduleMode ? (
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={sending}
                                className="flex items-center gap-2 h-10 px-5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all disabled:opacity-60 shadow-sm"
                            >
                                <Clock size={15} />
                                {sending ? "Scheduling..." : "Schedule Send"}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={sending}
                                className="flex items-center gap-2 h-10 px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-60 shadow-sm shadow-blue-500/20"
                            >
                                <Send size={15} />
                                {sending ? "Sending..." : "Send Email"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Email Detail Panel (Thread View) ──────────────────────────────────────────

function EmailDetailPanel({ thread, onClose }: { thread: EmailThread; onClose: () => void }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-160px)] sticky top-6 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Conversation
                </span>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <h2 className="text-base font-bold text-gray-900 leading-snug">
                    {thread.subject}
                </h2>
                <div className="flex gap-2 mt-2">
                    {thread.labels.map((label) => (
                        <span key={label} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {thread.emails.map((email) => (
                    <div key={email.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar email={email.from || email.to} />
                                <div>
                                    <p className="text-xs font-bold text-gray-900">{email.from || "Me"}</p>
                                    <p className="text-[11px] text-gray-500">To: {email.to}</p>
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium">
                                {formatFullDate(email.sentAt || email.createdAt)}
                            </span>
                        </div>
                        <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed pt-2 border-t border-gray-50">
                            {email.body}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Email UI Component ───────────────────────────────────────────────────

export interface EmailUIProps {
    threads: EmailThread[];
    filteredThreads: EmailThread[];
    total: number;
    loading: boolean;
    error: string | null;
    isComposeOpen: boolean;
    sending: boolean;
    sendError: string | null;
    syncing: boolean;
    selectedThread: EmailThread | null;
    search: string;
    selectedLabel: FolderTab;
    templates?: EmailTemplate[];
    loadingTemplates?: boolean;
    connectingGmail: boolean;
    gmailConnectError: string | null;
    onSearchChange: (q: string) => void;
    onLabelChange: (folder: FolderTab) => void;
    onOpenCompose: () => void;
    onCloseCompose: () => void;
    onSendEmail: (data: SendEmailPayload) => Promise<boolean>;
    onScheduleEmail?: (data: SendEmailPayload) => Promise<boolean>;
    onCreateTemplate?: (data: { name: string; subject: string; body: string }) => Promise<boolean>;
    onSyncEmails: () => void;
    onConnectGmail: () => void;
    onSelectThread: (thread: EmailThread | null) => void;
    onRetry: () => void;
    leadId?: string;
    dealId?: string;
    contactId?: string;
}

export function EmailUI({
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
    templates = [],
    loadingTemplates,
    connectingGmail,
    gmailConnectError,
    onSearchChange,
    onLabelChange,
    onOpenCompose,
    onCloseCompose,
    onSendEmail,
    onScheduleEmail,
    onCreateTemplate,
    onSyncEmails,
    onConnectGmail,
    onSelectThread,
    onRetry,
    leadId,
    dealId,
    contactId,
}: EmailUIProps) {
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

    const folders: { name: FolderTab; icon: any; count?: number; emptyMsg: string }[] = [
        { name: "Inbox", icon: Inbox, count: total, emptyMsg: "No inbox messages found." },
        { name: "Sent", icon: SendIcon, emptyMsg: "No sent messages found." },
        { name: "Drafts", icon: FileText, emptyMsg: "No drafts available." },
        { name: "Trash", icon: Trash2, emptyMsg: "Trash is empty." },
    ];

    const currentFolder = folders.find((f) => f.name === selectedLabel) ?? folders[0];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Email Workspace</h1>
                    <p className="text-xs text-gray-500 mt-1">Manage communications, templates, and schedule outreach</p>
                </div>
                <div className="flex items-center gap-3">
                    {onCreateTemplate && (
                        <button
                            onClick={() => setIsTemplatesModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition"
                        >
                            <Wand2 size={15} className="text-blue-600" /> Templates
                        </button>
                    )}
                    <button
                        onClick={onSyncEmails}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                        {syncing ? "Syncing..." : "Sync"}
                    </button>
                    <button
                        onClick={onOpenCompose}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
                    >
                        <Plus size={15} /> Compose
                    </button>
                </div>
            </div>

            {/* Error Banners */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center justify-between text-xs font-medium">
                    <span>{error}</span>
                    <button onClick={onRetry} className="underline font-bold">Retry</button>
                </div>
            )}

            {gmailConnectError && (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-medium">
                    {gmailConnectError}
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-xs space-y-1">
                        {folders.map((folder) => {
                            const Icon = folder.icon;
                            const isActive = selectedLabel === folder.name;
                            return (
                                <button
                                    key={folder.name}
                                    onClick={() => onLabelChange(folder.name)}
                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                                        isActive
                                            ? "bg-blue-50 text-blue-700 font-bold"
                                            : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon size={16} className={isActive ? "text-blue-600" : "text-gray-400"} />
                                        <span>{folder.name}</span>
                                    </div>
                                    {folder.count !== undefined && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                            {folder.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Email Table */}
                <div className={`${selectedThread ? "md:col-span-2" : "md:col-span-3"} transition-all`}>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Search Bar */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search by recipient, subject, or snippet..."
                                className="w-full bg-transparent text-xs font-medium outline-none text-gray-800 placeholder-gray-400"
                            />
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/30 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        <th className="px-5 py-3">Participant</th>
                                        <th className="px-5 py-3">Subject / Snippet</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="pr-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-16">
                                                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                                                    Loading {selectedLabel.toLowerCase()} emails...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredThreads.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-16">
                                                <Mail size={32} className="text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 text-xs font-semibold">
                                                    {search ? "No emails match your search filter." : currentFolder.emptyMsg}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredThreads.map((thread) => {
                                            const isSelected = selectedThread?.id === thread.id;
                                            const displayEmail = thread.participants[0] || "Unknown";
                                            return (
                                                <tr
                                                    key={thread.id}
                                                    onClick={() => onSelectThread(isSelected ? null : thread)}
                                                    className={`border-b border-gray-50 cursor-pointer transition-colors ${
                                                        isSelected ? "bg-blue-50/60" : "hover:bg-gray-50/60"
                                                    }`}
                                                >
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar email={displayEmail} />
                                                            <div className="max-w-[140px] truncate">
                                                                <p className="font-bold text-gray-800 text-xs truncate">
                                                                    {displayEmail}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 max-w-[240px]">
                                                        <p className="font-semibold text-gray-900 truncate text-xs">
                                                            {thread.subject}
                                                        </p>
                                                        <p className="text-gray-400 truncate text-[11px] mt-0.5">
                                                            {thread.latestPreview}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                            {formatDate(thread.latestDate)}
                                                        </span>
                                                    </td>
                                                    <td className="pr-4 py-3.5 whitespace-nowrap text-right">
                                                        <ChevronRight
                                                            size={16}
                                                            className={`inline-block transition-colors ${
                                                                isSelected ? "text-blue-600" : "text-gray-300"
                                                            }`}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Thread Detail Drawer */}
                {selectedThread && (
                    <div className="md:col-span-1">
                        <EmailDetailPanel
                            thread={selectedThread}
                            onClose={() => onSelectThread(null)}
                        />
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {isComposeOpen && (
                <ComposeModal
                    templates={templates}
                    sending={sending}
                    sendError={sendError}
                    onClose={onCloseCompose}
                    onSend={onSendEmail}
                    onSchedule={onScheduleEmail}
                    leadId={leadId}
                    dealId={dealId}
                    contactId={contactId}
                />
            )}

            {/* Templates Modal */}
            {isTemplatesModalOpen && onCreateTemplate && (
                <TemplatesModal
                    templates={templates}
                    onClose={() => setIsTemplatesModalOpen(false)}
                    onCreate={onCreateTemplate}
                />
            )}
        </div>
    );
}
