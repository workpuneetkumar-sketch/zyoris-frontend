"use client";

import { useParams, useRouter, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Building2,
    Tag,
    FileText,
    Briefcase,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { Lead } from "@/types/leads";
import { getLeadStatusInfo } from "@/utils/leadStatus";
import { convertLeadToDeal, fetchLeadById } from "@/lib/api/leadsApi";
import { updateDeal } from "@/lib/api/dealsApi";
import { mapLeadStatusToDealStage } from "@/lib/dealStageMapper";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { toast } from "react-toastify";

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const leadId = params?.leadId as string;

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Convert-to-deal state
    const [converting, setConverting] = useState(false);
    const [convertError, setConvertError] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // ── Load lead ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!leadId) return;
        setLoading(true);
        setError(null);
        fetchLeadById(leadId)
            .then((data) => setLead(data))
            .catch((err) =>
                setError(err instanceof Error ? err.message : "Failed to load lead.")
            )
            .finally(() => setLoading(false));
    }, [leadId]);

    // ── Convert to deal ───────────────────────────────────────────────────────
    const handleConvert = () => {
        if (!leadId || converting || lead?.status === "DEAD") return;
        setIsConfirmModalOpen(true);
    };

    const executeConvert = async () => {
    setIsConfirmModalOpen(false);
    setConverting(true);
    setConvertError(null);

    try {
        if (!lead) {
            throw new Error("Lead data missing");
        }

        // STEP 1 → Create deal from lead
        const createdDeal = await convertLeadToDeal(leadId);

        console.log("[Lead Convert] Response:", createdDeal);

        // Backend returns flat deal object
        const dealId =
            createdDeal?.id ||
            createdDeal?.deal?.id ||
            createdDeal?.dealId;

        if (!dealId) {
            console.error("Deal creation response:", createdDeal);
            throw new Error("Deal ID not returned");
        }

        // STEP 2 → Sync lead data into created deal
try {
    const payload = {
    name: lead.name,
    amount: Number(lead.estimatedValue || 0),

    stage: "NEW", // temporary hardcode

    assignedToId:
        lead.assignedToId?.trim() || null,

    companyId:
        (lead as any).companyId || null,

    contactId:
        (lead as any).contactId || null,
};

    console.log("[Lead Convert] Updating deal", {
        dealId,
        payload,
    });

    const updated = await updateDeal(dealId, payload);

    console.log("[Lead Convert] Updated response", updated);

} catch (err: any) {
    console.error(
        "[Lead Convert] updateDeal FULL ERROR",
        err?.response?.data || err
    );

    throw new Error(
        err?.response?.data?.message ||
        "Deal created but sync failed"
    );
}

        toast.success("Lead converted successfully");

        // STEP 3 → Navigate immediately
        router.replace(`/deals/${dealId}`);

    } catch (err: any) {
        console.error("[Lead Convert Error]", err);

        const msg =
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Conversion failed";

        setConvertError(msg);
        toast.error(msg);

    } finally {
        setConverting(false);
    }
};
    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Loading lead...</p>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!lead && !loading && !error) {
        notFound();
        return null;
    }

    if (!lead) return null;

    const statusInfo = getLeadStatusInfo(lead.status);

    // ── Detail view ───────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0"
                        title="Go back"
                    >
                        <ArrowLeft size={16} className="text-gray-600" />
                    </button>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{lead.name}</h1>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.style}`}>
                                {statusInfo.emoji} {statusInfo.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">{lead.company || "No Company"}</p>
                    </div>
                </div>

                {/* Convert to Deal — primary CTA */}
                <div className="flex flex-col items-end gap-1.5">
                    <button
                        onClick={handleConvert}
                        disabled={converting || lead.status === "DEAD"}
                        className={`flex items-center gap-2 h-9 px-5 rounded-lg text-white text-[13px] font-semibold transition-colors shadow-sm ${
                            lead.status === "DEAD" 
                                ? "bg-gray-400 cursor-not-allowed" 
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 disabled:opacity-70"
                        }`}
                    >
                        {converting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Briefcase size={14} />
                        )}
                        {converting 
                            ? "Converting..." 
                            : lead.status === "DEAD" 
                                ? "Cannot Convert Dead Lead" 
                                : "Convert to Deal"}
                    </button>
                    {convertError && (
                        <p className="text-xs text-red-500 text-right max-w-[260px]">
                            {convertError}
                        </p>
                    )}
                </div>
            </div>

            {/* Status / Source / Created row */}
            <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.style}`}>
                        {statusInfo.emoji} {statusInfo.label}
                    </span>
                </div>
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Source</p>
                    <span className="text-sm font-medium text-gray-700">{lead.source || "—"}</span>
                </div>
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Created At</p>
                    <span className="text-sm font-medium text-gray-700">{lead.createdAt || "—"}</span>
                </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                    <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Email</p>
                            <p className="text-sm text-gray-800">{lead.email || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                            <p className="text-sm text-gray-800">{lead.phone || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Location</p>
                            <p className="text-sm text-gray-800">{lead.city || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Company</p>
                            <p className="text-sm text-gray-800">{lead.company || "—"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ownership & Assignment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-700">Assignment</h3>
                </div>
                <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {lead.assignedTo?.name
                            ? lead.assignedTo.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                            : "NA"}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {lead.assignedTo?.name || lead.owner || "Unassigned"}
                        </p>
                        {lead.assignedTo?.email && (
                            <p className="text-xs text-gray-500">{lead.assignedTo.email}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tags & Notes */}
            {((lead.tags && lead.tags.length > 0) || lead.note) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-700">Additional Details</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        {lead.tags && lead.tags.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" /> Tags
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {lead.tags.map((tag: any, idx: number) => (
                                        <span
                                            key={tag.id || idx}
                                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium border border-gray-200"
                                        >
                                            {typeof tag === "string" ? tag : tag.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {lead.note && (
                            <div>
                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Note
                                </p>
                                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 whitespace-pre-wrap">
                                    {lead.note}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                title="Convert Lead"
                message={`Convert lead "${lead.name}" to a deal?`}
                confirmText="Convert"
                onConfirm={executeConvert}
                onCancel={() => setIsConfirmModalOpen(false)}
            />
        </div>
    );
}