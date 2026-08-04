// components/leads/leadnewpage.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import LeadForm, {
    LeadFormValues,
} from "./LeadForm";

import { createLead, executeAssignmentRule } from "@/lib/api/leadsApi";

export default function NewLeadPage() {
    const router = useRouter();

    const [form, setForm] = useState<LeadFormValues>({
        name: "",
        email: "",
        phone: "",
        company: "",
        city: "",
        source: "",
        status: "",
        estimatedValue: "",
        assignedToId: "",
        tags: [],
        note: "",
    });

    const [errors, setErrors] = useState<{
        name?: string;
        email?: string;
    }>({});

    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        console.log('[NewLeadPage] Form values before submission:', form);

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

            const payload = {
                ...form,
                estimatedValue: (form.estimatedValue !== "" && form.estimatedValue !== undefined && form.estimatedValue !== null) 
                    ? Number(form.estimatedValue) 
                    : undefined,
                assignedToId: null, // assignment handled by rules below
            };
            console.log('[NewLeadPage] Payload to createLead:', payload);

            const newLead = await createLead(payload);
            console.log('[NewLeadPage] Created lead:', newLead);

            // Run assignment rule on the new lead (fire-and-forget — don't block UX)
            if (newLead?.id) {
                executeAssignmentRule(newLead.id).catch((err) => {
                    console.warn('[NewLeadPage] Assignment rule execution failed (non-fatal):', err?.message);
                });
            }

            toast.success("Lead created successfully");
            router.push("/leads");
        } catch (error: any) {
            console.error('[NewLeadPage] Error creating lead:', error);
            const errorMsg = error.response?.data?.message || error.message || "Failed to create lead";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">

                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        New Lead
                    </h1>

                    <p className="text-sm text-gray-400 mt-1">
                        Create and manage lead information
                    </p>
                </div>

            </div>

            {/* Shared Form */}
            <LeadForm
                form={form}
                setForm={setForm}
                errors={errors}
            />

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6">

                <button
                    onClick={() => router.push("/leads")}
                    className="h-10 px-5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                    Cancel
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
                >
                    {loading ? "Creating..." : "Create Lead"}
                </button>

            </div>
        </div>
    );
}