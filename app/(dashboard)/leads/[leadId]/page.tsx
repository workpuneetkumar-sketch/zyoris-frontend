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
    BarChart2,
    TrendingUp,
    TrendingDown,
    Minus,
    User,
    Calendar,
    Globe,
    Bot,
    Clock,
    Home,
    IndianRupee,
    Search,
    BadgeCheck,
    Sparkles,
    SlidersHorizontal,
    Database,
    Layers,
    Copy,
    Check,
    ShieldCheck,
    UserCheck,
    Brain
} from "lucide-react";
import { AgentTriggerButton } from "@/components/agents/AgentResultModal";
import { Lead, computeLeadScore } from "@/types/leads";
import { getLeadStatusInfo } from "@/utils/leadStatus";
import { convertLeadToDeal, fetchLeadById, getLeadScore } from "@/lib/api/leadsApi";
import { updateDeal, fetchDeals } from "@/lib/api/dealsApi";
import { mapLeadStatusToDealStage } from "@/lib/dealStageMapper";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { toast } from "react-toastify";
import { AiExtractionCard } from "@/components/ai/AiExtractionCard";
import { AiBadge } from "@/components/ai/AiBadge";
import { CommunicationIntelligenceWidget } from "@/components/ai/CommunicationIntelligenceWidget";
import { LeadAISummaryCard } from "@/components/leads/LeadAISummaryCard";
import { LeadIntelligencePanel } from "@/components/leads/LeadIntelligencePanel";
import { LeadApiActionsToolbar } from "@/components/leads/LeadApiActionsToolbar";
import { resolveSingleLeadData } from "@/lib/utils/cleanLeadData";

// Helper to format date safely
function formatDate(dateString: string | undefined) {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
}

function safeString(value: any): string {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
}

function formatFieldKey(key: string): string {
    if (!key) return "";
    let result = key.replace(/[-_]+/g, " ");
    result = result.replace(/([a-z])([A-Z])/g, "$1 $2");
    
    const wordReplacements: [RegExp, string][] = [
        [/PROJECTCODENAME/i, "Project Code Name"],
        [/PRIMARYDATACENTER/i, "Primary Data Center"],
        [/SECURITYCLEARANCE/i, "Security Clearance"],
        [/ANNUALRESEARCHBUDGET/i, "Annual Research Budget"],
        [/HARDWAREARCHITECTURE/i, "Hardware Architecture"],
        [/PREFERREDOPERATINGSYSTEM/i, "Preferred Operating System"]
    ];

    for (const [regex, replacement] of wordReplacements) {
        if (regex.test(result)) {
            return replacement;
        }
    }

    return result
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function getInitials(name: string): string {
    if (!name) return "NA";
    return name
        .split(" ")
        .map((n) => n[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 2);
}

// Extract JSON payload from lead notes/metadata
function parseExtractionData(lead: any) {
    if (lead.metadata?.extractedData) return { data: lead.metadata.extractedData, cleanNote: lead.note };
    
    if (lead.note) {
        try {
            const jsonMatch = lead.note.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                if (data.project || data.budget || data.timeline || data.city || data.interest) {
                    const cleanNote = lead.note.replace(jsonMatch[0], '').replace(/```json/g, '').replace(/```/g, '').trim();
                    return { data, cleanNote: cleanNote || "No additional notes." };
                }
            }
        } catch {
            // Ignore parse errors
        }
    }
    return { data: null, cleanNote: lead.note };
}

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const leadId = params?.leadId as string;

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState(false);

    // Convert-to-deal state
    const [converting, setConverting] = useState(false);
    const [convertError, setConvertError] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // ── Load lead ─────────────────────────────────────────────────────────────
    const loadLeadData = async () => {
        if (!leadId) return;
        setLoading(true);
        setError(null);
        try {
            const rawData = await fetchLeadById(leadId);
            const data = resolveSingleLeadData(rawData);
            let leadScore = data.score;
            
            // Try to fetch the real score from the API
            try {
                const scoreResponse = await getLeadScore(leadId);
                leadScore = scoreResponse.score;
            } catch (scoreErr) {
                console.warn("Failed to fetch lead score, falling back to computed:", scoreErr);
            }
            
            // Ensure all fields exist with fallbacks
            const enrichedLead: Lead = resolveSingleLeadData({
                ...data,
                id: data.id || leadId,
                name: data.name || "Unnamed Lead",
                company: data.company || "",
                source: data.source || "Unknown",
                status: data.status || "NEW",
                email: data.email || "",
                phone: data.phone || "",
                city: data.city || "",
                score: leadScore ?? computeLeadScore(data),
                tags: data.tags || [],
                note: data.note || "",
                owner: data.owner || "Unassigned",
                ownerAvatar: data.ownerAvatar || "",
                assignedTo: data.assignedTo || null,
                assignedToId: data.assignedToId || null,
                estimatedValue: data.estimatedValue || 0,
                createdAt: data.createdAt || new Date().toISOString(),
                deleted: data.deleted || false,
            });
            setLead(enrichedLead);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load lead.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeadData();
    }, [leadId]);

    const handleCopyLeadId = () => {
        if (!lead?.id) return;
        navigator.clipboard.writeText(lead.id);
        setCopiedId(true);
        toast.success("Lead ID copied to clipboard");
        setTimeout(() => setCopiedId(false), 2000);
    };

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

            // Extract deal ID across all possible backend response structures
            let dealId: string | undefined =
                createdDeal?.id ||
                createdDeal?.dealId ||
                createdDeal?.deal?.id ||
                createdDeal?.deal?.dealId ||
                createdDeal?.data?.id ||
                createdDeal?.data?.dealId ||
                createdDeal?.data?.deal?.id ||
                createdDeal?.result?.id ||
                createdDeal?.payload?.id;

            // Fallback: If backend response didn't include dealId directly, lookup created deal from list
            if (!dealId) {
                try {
                    console.log("[Lead Convert] dealId not directly in response, querying deals list...");
                    const allDeals = await fetchDeals();
                    const matched = allDeals.find(
                        (d) => d.leadId === leadId || (d.name && lead.name && d.name.toLowerCase() === lead.name.toLowerCase())
                    ) || allDeals[0];

                    if (matched && (matched.id || (matched as any).dealId)) {
                        dealId = (matched.id || (matched as any).dealId) as string;
                    }
                } catch (fallbackErr) {
                    console.warn("[Lead Convert] Fallback deal lookup notice:", fallbackErr);
                }
            }

            // STEP 2 → Optional sync lead data into created deal if dealId found
            if (dealId) {
                try {
                    const payload = {
                        name: lead.name,
                        amount: Number(lead.estimatedValue || 0),
                        stage: "NEW",
                        assignedToId: lead.assignedToId?.trim() || null,
                        companyId: (lead as any).companyId || null,
                        contactId: (lead as any).contactId || null,
                    };

                    await updateDeal(dealId, payload);
                } catch (syncErr: any) {
                    console.warn("[Lead Convert] Optional updateDeal sync notice:", syncErr?.response?.data || syncErr);
                }
            }

            toast.success("Lead converted to deal successfully");

            // STEP 3 → Navigate immediately to created deal or deals dashboard
            if (dealId) {
                router.replace(`/deals/${dealId}`);
            } else {
                router.replace("/deals");
            }

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
    const hasContactInfo = lead.email || lead.phone || lead.city || lead.company;
    const hasTags = lead.tags && lead.tags.length > 0;
    const { data: extractionData, cleanNote } = parseExtractionData(lead);
    const hasNote = cleanNote && cleanNote.trim().length > 0;
    const isWhatsAppAI = lead.source === "whatsapp_ai_detection";
    const hasCustomFields = lead.customFields && Object.keys(lead.customFields).length > 0;
    const leadScoreValue = lead.score ?? computeLeadScore(lead);

    // ── Detail view ───────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">

            {/* ── Page Header & Action Controls ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Lead Identity */}
                <div className="flex items-start sm:items-center gap-3.5">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors shrink-0 mt-0.5 sm:mt-0"
                        title="Go back"
                    >
                        <ArrowLeft size={18} className="text-gray-600" />
                    </button>
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                                {lead.name || "Unnamed Lead"}
                            </h1>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${statusInfo.style}`}>
                                {statusInfo.emoji} {statusInfo.label}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {lead.company && (
                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                    <Building2 size={13} className="text-gray-400" /> {lead.company}
                                </span>
                            )}
                            {lead.jobTitle && (
                                <span className="flex items-center gap-1">
                                    <Briefcase size={13} className="text-gray-400" /> {lead.jobTitle}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Clock size={13} className="text-gray-400" /> Created {formatDate(lead.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Quick Action Buttons (Research, Qualify, Convert) */}
                <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                    <AgentTriggerButton
                        agentType="research"
                        payload={{
                            agentId: "research-agent",
                            action: "research",
                            parameters: {
                                entityType: "lead",
                                entityId: leadId,
                                includeExternalEnrichment: true,
                            },
                        }}
                        label="Research Lead"
                        icon={<Search size={14} className="shrink-0" />}
                        className="h-9 px-3.5"
                    />

                    <AgentTriggerButton
                        agentType="qualify_lead"
                        payload={{
                            agentId: "lead-qualification-agent",
                            action: "qualify_lead",
                            parameters: {
                                leadId: leadId,
                                forceRecalculate: true,
                            },
                        }}
                        label="Qualify Lead"
                        icon={<BadgeCheck size={14} className="shrink-0" />}
                        className="h-9 px-3.5"
                    />

                    <button
                        onClick={handleConvert}
                        disabled={converting || lead.status === "DEAD"}
                        className={`flex items-center gap-2 h-9 px-5 rounded-xl text-white text-xs font-semibold transition-all shadow-xs ${
                            lead.status === "DEAD"
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-100 disabled:opacity-70"
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
                </div>
            </div>

            {convertError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                    {convertError}
                </div>
            )}

            {/* ── Lead Overview & Key Attributes Card (Clean Client-Friendly Profile) ── */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
                {/* Card Title & Meta Header */}
                <div className="px-5 py-4 bg-gray-50/60 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 shadow-2xs">
                            <User size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 tracking-tight">Lead Overview</h2>
                            <p className="text-xs text-gray-500">
                                Contact information, company profile, and commercial attributes
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Copyable Lead ID Badge */}
                        <button
                            onClick={handleCopyLeadId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono transition-colors border border-gray-200/80"
                            title="Click to copy Lead ID"
                        >
                            {copiedId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-gray-500" />}
                            <span>ID: <strong className="text-gray-900">{lead.id.slice(0, 12)}...</strong></span>
                        </button>

                        <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Verified Record</span>
                        </div>
                    </div>
                </div>

                {/* 4-Column Attribute Grid */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Column 1: Contact Information */}
                    <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/70 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                <Mail size={13} className="text-blue-500" /> Contact Details
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                                Primary
                            </span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div>
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Email</span>
                                <span className="font-medium text-gray-900 truncate block" title={safeString(lead.email)}>
                                    {safeString(lead.email)}
                                </span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60">
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Phone</span>
                                <span className="font-medium text-gray-900 block" title={safeString(lead.phone)}>
                                    {safeString(lead.phone)}
                                </span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60">
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Location</span>
                                <span className="font-medium text-gray-900 truncate block" title={safeString(lead.city || lead.state || lead.country)}>
                                    {safeString(lead.city || lead.state || lead.country)}
                                </span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60 flex justify-between items-center">
                                <span className="text-gray-500">Territory</span>
                                <span className="font-semibold text-gray-800">{safeString(lead.territory)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Company & Role */}
                    <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/70 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 size={13} className="text-sky-500" /> Organization
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold">
                                Entity
                            </span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div>
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Company Name</span>
                                <span className="font-bold text-gray-900 truncate block" title={safeString(lead.company)}>
                                    {safeString(lead.company)}
                                </span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60">
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Job Role / Title</span>
                                <span className="font-medium text-gray-900 truncate block" title={safeString(lead.jobTitle)}>
                                    {safeString(lead.jobTitle)}
                                </span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60">
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Industry</span>
                                <span className="font-medium text-gray-900 truncate block" title={safeString(lead.industry)}>
                                    {safeString(lead.industry)}
                                </span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60 flex justify-between items-center">
                                <span className="text-gray-500">External Reference</span>
                                <span className="font-medium text-gray-800 truncate max-w-[110px]" title={safeString(lead.externalId)}>
                                    {safeString(lead.externalId)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Commercial & Ownership */}
                    <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/70 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                <IndianRupee size={13} className="text-emerald-500" /> Commercial
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                Deal Potential
                            </span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div>
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Estimated Value</span>
                                <span className="font-bold text-emerald-600 text-sm block">
                                    {lead.estimatedValue ? `₹${lead.estimatedValue.toLocaleString('en-IN')}` : "—"}
                                </span>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60 flex justify-between items-center">
                                <span className="text-gray-500">Source Channel</span>
                                {isWhatsAppAI ? (
                                    <span className="font-semibold text-emerald-700 bg-emerald-50 text-[10px] px-2 py-0.5 rounded border border-emerald-100">
                                        WhatsApp AI
                                    </span>
                                ) : (
                                    <span className="font-semibold text-blue-700 bg-blue-50 text-[11px] px-2 py-0.5 rounded border border-blue-100">
                                        {safeString(lead.source)}
                                    </span>
                                )}
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60">
                                <span className="text-gray-400 block text-[10px] font-medium uppercase">Assigned Owner</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {lead.assignedTo?.name ? getInitials(lead.assignedTo.name) : "NA"}
                                    </div>
                                    <span className="font-medium text-gray-900 truncate">
                                        {lead.assignedTo?.name || lead.owner || "Unassigned"}
                                    </span>
                                </div>
                            </div>
                            <div className="pt-1.5 border-t border-gray-200/60 flex justify-between items-center">
                                <span className="text-gray-500">Predictive Score</span>
                                <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                    {leadScoreValue} / 100
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Column 4: Custom Properties */}
                    <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/70 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                <SlidersHorizontal size={13} className="text-purple-500" /> Custom Fields
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-100">
                                {Object.keys(lead.customFields || {}).length} Custom
                            </span>
                        </div>

                        {lead.customFields && Object.keys(lead.customFields).length > 0 ? (
                            <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-0.5">
                                {Object.entries(lead.customFields).map(([key, val]) => (
                                    <div key={key} className="bg-white p-2 rounded-lg border border-gray-200/80 flex justify-between items-center text-xs">
                                        <span className="text-gray-500 text-[11px] font-medium truncate max-w-[95px]" title={key}>
                                            {formatFieldKey(key)}
                                        </span>
                                        <span className="text-gray-900 font-semibold text-[11px] truncate max-w-[115px]" title={String(val)}>
                                            {safeString(val)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl p-3 text-center border border-gray-200/80 my-auto">
                                <ShieldCheck size={20} className="text-blue-500 mx-auto mb-1" />
                                <p className="text-xs font-semibold text-gray-900">Standard CRM Schema</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">All standard fields mapped</p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Additional Details row: Tags & Notes (if available) */}
                {(hasTags || hasNote) && (
                    <div className="px-5 py-4 bg-gray-50/40 border-t border-gray-100 space-y-3">
                        {hasTags && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mr-1">
                                    <Tag size={13} /> Tags:
                                </span>
                                {Array.isArray(lead.tags) && lead.tags.map((tag: any, idx: number) => (
                                    <span
                                        key={tag.id || idx}
                                        className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100"
                                    >
                                        {typeof tag === "string" ? tag : tag.label || tag.name || tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {hasNote && (
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                                    <FileText size={13} /> Sales Notes:
                                </span>
                                <div className="p-3 bg-white rounded-xl text-xs text-gray-700 border border-gray-200/80 leading-relaxed whitespace-pre-wrap">
                                    {cleanNote}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Extraction Card (If extracted payload found in note) */}
            {extractionData && (
                <AiExtractionCard data={extractionData} />
            )}

            {/* ── Lead Operations & Automation Subsystems (11 Subsystems) ─────── */}
            <LeadApiActionsToolbar
                leadId={leadId}
                leadName={lead.name}
                lead={lead}
                onLeadUpdated={loadLeadData}
            />

            {/* ── AI & Lead Intelligence Section ─────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-1">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                        <Brain size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                            AI &amp; Lead Intelligence
                        </h2>
                        <p className="text-xs text-gray-500">
                            Automated lead analysis, conversational insights, and predictive qualification
                        </p>
                    </div>
                </div>

                {/* AI CRM Lead Summary & Next Action Card */}
                <LeadAISummaryCard leadId={leadId} />

                {/* AI Communication Intelligence Widget */}
                <CommunicationIntelligenceWidget leadId={leadId} />

                {/* Lead Intelligence Panel */}
                <LeadIntelligencePanel lead={lead} />
            </div>

            {/* Confirmation Modal for Convert to Deal */}
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
