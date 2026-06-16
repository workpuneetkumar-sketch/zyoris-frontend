// components/leads/EditLeadModal.tsx
"use client";

import { useState } from "react";
import LeadForm, {
    LeadFormValues,
} from "./LeadForm";

interface EditLeadModalProps {
    lead: LeadFormValues & {
        leadId: string;
    };

    onClose: () => void;

    onSave: (data: LeadFormValues) => Promise<void> | void;
}

export default function EditLeadModal({
    lead,
    onClose,
    onSave,
}: EditLeadModalProps) {
    const [form, setForm] = useState<LeadFormValues>({
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
            ? lead.tags.map((tag: any) =>
                typeof tag === "string"
                    ? tag
                    : tag.label
            )
            : [],
        note: lead.note || "",
    });

    const [loading, setLoading] = useState(false);

    const [errors, setErrors] = useState<{
        name?: string;
        email?: string;
    }>({});

    const handleSave = async () => {
        const newErrors: {
            name?: string;
            email?: string;
        } = {};

        if (!form.name.trim()) {
            newErrors.name = "Name is required";
        }

        if (!form.email.trim()) {
            newErrors.email = "Email is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setLoading(true);

            await onSave(form);

            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

            <div className="bg-gray-50 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Edit Lead
                        </h2>

                        <p className="text-sm text-gray-400 mt-0.5">
                            Update lead details
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[75vh] overflow-y-auto">
                    <LeadForm
                        form={form}
                        setForm={setForm}
                        errors={errors}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t border-gray-200">

                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>

                </div>
            </div>
        </div>
    );
}