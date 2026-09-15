// components/leads/EditLeadModal.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, CheckCircle2, X, Save, Loader2 } from "lucide-react";
import LeadForm, { LeadFormValues } from "./LeadForm";

interface EditLeadModalProps {
    lead: LeadFormValues & { leadId: string };
    onClose: () => void;
    onSave: (data: LeadFormValues) => Promise<void> | void;
}

function deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

// ── Unsaved Changes Popup (centred overlay) ────────────────────────────────

function UnsavedChangesPopup({
    onSave,
    onDiscard,
    saving,
}: {
    onSave: () => void;
    onDiscard: () => void;
    saving: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Top accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />

                <div className="p-7">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} className="text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Unsaved Changes</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                You have unsaved changes. What would you like to do?
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
                        Your edits will be <strong>lost</strong> if you discard them. Save your changes to keep them.
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onDiscard}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50"
                        >
                            <X size={16} />
                            Discard Changes
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-70 shadow-sm shadow-blue-200"
                        >
                            {saving ? (
                                <><Loader2 size={16} className="animate-spin" /> Saving…</>
                            ) : (
                                <><Save size={16} /> Save Changes</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function EditLeadModal({ lead, onClose, onSave }: EditLeadModalProps) {
    const initialForm: LeadFormValues = {
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        city: lead.city || "",
        source: lead.source || "",
        status: lead.status || "",
        estimatedValue: (lead as any).estimatedValue?.toString() || "",
        assignedToId: lead.assignedToId || "",
        tags: Array.isArray(lead.tags)
            ? lead.tags.map((tag: any) => (typeof tag === "string" ? tag : tag.label))
            : [],
        note: lead.note || "",
    };

    const [form, setForm] = useState<LeadFormValues>(initialForm);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
    const [showUnsavedPopup, setShowUnsavedPopup] = useState(false);
    // Tracks whether form has ever been dirtied (to avoid popup on initial mount)
    const isFirstRender = useRef(true);

    const isDirty = !deepEqual(form, initialForm);

    // Auto-show the save/discard popup as soon as any field changes
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (isDirty && !showUnsavedPopup && !loading) {
            setShowUnsavedPopup(true);
        }
        // If user reverts all changes back to initial, hide the popup
        if (!isDirty) {
            setShowUnsavedPopup(false);
        }
    }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

    // Intercept close attempts
    const handleRequestClose = useCallback(() => {
        if (isDirty) {
            setShowUnsavedPopup(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    const handleSave = useCallback(async () => {
        const newErrors: { name?: string; email?: string } = {};
        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.email.trim()) newErrors.email = "Email is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setShowUnsavedPopup(false);
            return;
        }

        try {
            setLoading(true);
            await onSave(form);
            setShowUnsavedPopup(false);
            onClose();
        } catch (error) {
            console.error(error);
            setShowUnsavedPopup(false);
        } finally {
            setLoading(false);
        }
    }, [form, onSave, onClose]);

    const handleDiscard = useCallback(() => {
        setShowUnsavedPopup(false);
        onClose();
    }, [onClose]);

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-gray-50 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Edit Lead</h2>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    Update lead details
                                    {isDirty && (
                                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[11px] font-semibold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                                            Unsaved changes
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleRequestClose}
                            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-1">
                        <LeadForm form={form} setForm={setForm} errors={errors} />
                    </div>

                    {/* Footer — no Save button; changes trigger popup automatically */}
                    <div className="flex justify-between items-center px-6 py-4 bg-white border-t border-gray-200 shrink-0">
                        <p className="text-xs text-gray-400">
                            {isDirty
                                ? "Changes detected — save or discard above"
                                : "No changes yet"}
                        </p>
                        <button
                            onClick={handleRequestClose}
                            className="h-10 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Unsaved changes popup — appears automatically when form is dirty */}
            {showUnsavedPopup && (
                <UnsavedChangesPopup
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                    saving={loading}
                />
            )}
        </>
    );
}