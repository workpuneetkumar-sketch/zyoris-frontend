"use client";

import { useState, useEffect } from "react";
import EditLeadModal from "./EditLeadModal";
import ViewLeadModal from "./ViewLeadModal";
import UploadLeadsModal from "./UploadLeadsModal";
import { updateLead, deleteLead, getLeadSharePayload, exportLeadAsPdf, buildWhatsAppShareUrl, LeadSharePayload } from "@/lib/api/leadsApi";
import { toast } from "react-toastify";
import { LeadCheckbox } from "./BulkActionsToolbar";
import { AiBadge } from "@/components/ai/AiBadge";

import {
    Search,
    Filter,
    Download,
    Plus,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Upload,
    Trash2,
    Eye,
    Edit,
    UserPlus,
    Briefcase,
    Sparkles,
    Share2,
    MessageCircle,
    FileDown,
    Loader2 as SpinnerIcon,
    X,
} from "lucide-react";

import {
    Lead,
    LeadsFilters,
} from "@/types/leads";
import { getLeadStatusInfo } from "@/utils/leadStatus";

export interface LeadsTableProps {
    leads: Lead[];
    total: number;
    page: number;
    perPage: number;
    filters: LeadsFilters;
    loading: boolean;
    openMenu: string | null;
    convertingId?: string | null;
    onPageChange: (page: number) => void;
    onRefreshLeads: () => Promise<void>;
    onFiltersChange: (filters: LeadsFilters) => void;
    onNewLead: () => void;
    onExport: () => void;
    onAction: (action: string, lead: Lead) => void;
    setOpenMenu: (id: string | null) => void;
    isSelected: (id: string) => boolean;
    onToggleSelect: (id: string) => void;
    onOpenAdvancedFilters: () => void;
}

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

function Select({
    value,
    options,
    onChange,
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none h-10 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
                {options.map((o) => (
                    <option key={o}>{o}</option>
                ))}
            </select>
            <ChevronRight
                size={16}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none"
            />
        </div>
    );
}

/** Returns a colour‑coded badge for a numeric lead score (0‑100). */
function ScoreBadge({ score }: { score: number | undefined | null }) {
    if (score == null || isNaN(Number(score))) return <span className="text-xs text-gray-300">—</span>;
    const n = Number(score);
    const cls =
        n >= 70
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : n >= 40
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-red-50 text-red-600 border-red-200";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
            {n}
        </span>
    );
}

// ── Share Lead Modal ───────────────────────────────────────────────────────────

function ShareLeadModal({
    lead,
    onClose,
}: {
    lead: Lead;
    onClose: () => void;
}) {
    const [payload, setPayload] = useState<LeadSharePayload | null>(null);
    const [loadingShare, setLoadingShare] = useState(true);
    const [shareError, setShareError] = useState<string | null>(null);
    const [exportingPdf, setExportingPdf] = useState(false);

    useEffect(() => {
        let active = true;
        setLoadingShare(true);
        setShareError(null);
        getLeadSharePayload(lead.id)
            .then((data) => { if (active) setPayload(data); })
            .catch((err) => {
                if (!active) return;
                console.warn("Share payload fetch failed, using lead data as fallback", err);
                // Fallback: build payload from existing lead object
                setPayload({
                    leadId: lead.id,
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone,
                    company: lead.company,
                    city: lead.city,
                    source: lead.source,
                    status: lead.status,
                    estimatedValue: lead.estimatedValue,
                    score: lead.score,
                    assignedTo: lead.assignedTo ?? undefined,
                    tags: lead.tags,
                    note: lead.note,
                });
            })
            .finally(() => { if (active) setLoadingShare(false); });
        return () => { active = false; };
    }, [lead]);

    const handleWhatsApp = () => {
        if (!payload) return;
        const phone = payload.phone?.replace(/\D/g, "") || lead.phone?.replace(/\D/g, "") || "";
        const url = buildWhatsAppShareUrl(payload, phone);
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handlePdf = async () => {
        if (exportingPdf) return;
        setExportingPdf(true);
        try {
            const blob = await exportLeadAsPdf(lead.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lead-${lead.name?.replace(/\s+/g, "-") || lead.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("PDF downloaded");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "PDF export failed");
        } finally {
            setExportingPdf(false);
        }
    };

    const handleCopyLink = () => {
        const url = payload?.shareUrl || `${window.location.origin}/leads/${lead.id}`;
        navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => toast.error("Failed to copy"));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                            <Share2 size={16} className="text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Share Lead</h3>
                            <p className="text-xs text-gray-400">{lead.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {loadingShare ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
                            <SpinnerIcon size={18} className="animate-spin" />
                            Loading share data…
                        </div>
                    ) : (
                        <>
                            {/* Lead summary card */}
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2">
                                <p className="text-sm font-semibold text-gray-800">{payload?.name || lead.name}</p>
                                {payload?.company && <p className="text-xs text-gray-500">{payload.company}</p>}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {payload?.email && (
                                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                            {payload.email}
                                        </span>
                                    )}
                                    {payload?.phone && (
                                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.7a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                            {payload.phone}
                                        </span>
                                    )}
                                    {payload?.status && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                            {payload.status}
                                        </span>
                                    )}
                                    {payload?.estimatedValue && payload.estimatedValue > 0 && (
                                        <span className="text-xs font-medium text-emerald-700">
                                            ₹{payload.estimatedValue.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Share options */}
                            <div className="grid grid-cols-1 gap-2">
                                {/* WhatsApp */}
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-all group"
                                >
                                    <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-800">Share via WhatsApp</p>
                                        <p className="text-xs text-gray-500">Open WhatsApp with pre-filled message</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                                </button>

                                {/* PDF Export */}
                                <button
                                    onClick={handlePdf}
                                    disabled={exportingPdf}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 transition-all group disabled:opacity-60"
                                >
                                    <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                        {exportingPdf
                                            ? <SpinnerIcon size={16} className="text-white animate-spin" />
                                            : <FileDown size={16} className="text-white" />
                                        }
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-800">{exportingPdf ? "Generating PDF…" : "Export as PDF"}</p>
                                        <p className="text-xs text-gray-500">Download a formatted PDF of this lead</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                                </button>

                                {/* Copy link */}
                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all group"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gray-500 flex items-center justify-center shrink-0">
                                        <MessageCircle size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-800">Copy Link</p>
                                        <p className="text-xs text-gray-500">Copy the lead URL to clipboard</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function LeadsTable({
    leads,
    total,
    page,
    perPage,
    filters,
    loading,
    openMenu,
    convertingId,
    onPageChange,
    onRefreshLeads,
    onFiltersChange,
    onNewLead,
    onExport,
    onAction,
    setOpenMenu,
    isSelected,
    onToggleSelect,
    onOpenAdvancedFilters,
}: LeadsTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safeLeads = leads ?? [];
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [viewingLead, setViewingLead] = useState<Lead | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Share modal state
    const [sharingLead, setSharingLead] = useState<Lead | null>(null);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // ── Handle Delete ──────────────────────────────────────────
    const handleDelete = async (leadId: string) => {
        setDeletingId(leadId);
        setOpenMenu(null);
        setMenuPos(null);
        try {
            const result = await deleteLead(leadId);
            if (result.success) {
                toast.success(result.message || "Lead deleted successfully");
                await onRefreshLeads();
            }
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message || "Failed to delete lead");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-4 px-1">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">Leads</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage and track all incoming leads.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Upload size={16} />
                        Upload
                    </button>
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Download size={16} />
                        Export
                    </button>
                    <button
                        onClick={onNewLead}
                        className="flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow"
                    >
                        <Plus size={18} />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Table card — overflow-hidden removed so dropdown isn't clipped */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">

                {/* Filters bar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
                    <Select
                        value={filters.status}
                        options={["All Status", "NEW", "WARM", "HOT", "DEAD"]}
                        onChange={(v) => { onFiltersChange({ ...filters, status: v }); onPageChange(1); }}
                    />
                    <Select
                        value={filters.source}
                        options={["All Sources", "Website", "Referral", "LinkedIn", "Cold Call"]}
                        onChange={(v) => { onFiltersChange({ ...filters, source: v }); onPageChange(1); }}
                    />
                    <Select
                        value={filters.owner}
                        options={["All Owners"]}
                        onChange={(v) => { onFiltersChange({ ...filters, owner: v }); onPageChange(1); }}
                    />
                    <div className="relative ml-auto">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={filters.search}
                            onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }); onPageChange(1); }}
                            className="h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                        />
                    </div>
                    <button onClick={onOpenAdvancedFilters} className="flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <Filter size={16} />
                        Filters
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto overflow-y-visible rounded-b-2xl">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-3 py-3"></th>
                                {["Lead Name", "Company", "Owner", "Status", "Score", "Created At", "Actions"].map((h) => (
                                    <th key={h} className="text-left px-5 py-3 text-[12px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: perPage }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="px-3 py-4"></td>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : safeLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                                        No leads found.
                                    </td>
                                </tr>
                            ) : (
                                safeLeads.map((lead) => {
                                    const statusInfo = getLeadStatusInfo(lead.status);
                                    const isDeleting = deletingId === lead.id;
                                    
                                    return (
                                        <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                            <td className="px-3 py-3.5">
                                                <LeadCheckbox 
                                                    leadId={lead.id} 
                                                    isSelected={isSelected(lead.id)} 
                                                    onToggle={onToggleSelect} 
                                                />
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span>{lead.name}</span>
                                                    {String(lead.source || "").toLowerCase() === 'whatsapp_ai_detection' && (
                                                        <AiBadge label="🤖 Auto-Detected via WhatsApp AI" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{lead.company || "—"}</td>
                                            {/* Owner — shows "NA" badge if unassigned */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {lead.assignedTo ? (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar
                                                            initials={
                                                                lead.assignedTo.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")
                                                                    .toUpperCase()
                                                                    .slice(0, 2)
                                                            }
                                                        />
                                                        <span className="text-gray-700">
                                                            {lead.assignedTo.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium bg-gray-100 text-gray-400 border border-gray-200">
                                                        NA
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${statusInfo.style}`}>
                                                    {statusInfo.emoji} {statusInfo.label}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <ScoreBadge score={lead.score} />
                                            </td>

                                            <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">
                                                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                                            </td>

                                            {/* Actions — overflow-visible so dropdown isn't clipped */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {convertingId === lead.id ? (
                                                    <div className="w-8 h-8 flex items-center justify-center">
                                                        <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                                    </div>
                                                ) : isDeleting ? (
                                                    <div className="w-8 h-8 flex items-center justify-center">
                                                        <span className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            if (openMenu === lead.id) {
                                                                setOpenMenu(null);
                                                                setMenuPos(null);
                                                            } else {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setMenuPos({ top: rect.bottom + 4, left: rect.right - 144 });
                                                                setOpenMenu(lead.id);
                                                            }
                                                        }}
                                                        className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                        {loading
                            ? "Loading..."
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total} leads`}
                    </p>
                    <div className="flex items-center gap-1.5">
                        {/* Prev */}
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {/* Page buttons — windowed: always show 1, last, current±2, with ellipsis */}
                        {(() => {
                            const delta = 2;
                            const range: number[] = [];
                            const rangeWithDots: (number | "...")[] = [];
                            let prev: number | undefined;

                            for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
                                range.push(i);
                            }

                            if (totalPages > 1) {
                                // always include first
                                [1, ...range, totalPages].forEach((i) => {
                                    if (prev !== undefined) {
                                        if (i - prev === 2) rangeWithDots.push(prev + 1);
                                        else if (i - prev > 2) rangeWithDots.push("...");
                                    }
                                    rangeWithDots.push(i);
                                    prev = i;
                                });
                            } else {
                                rangeWithDots.push(1);
                            }

                            return rangeWithDots.map((p, idx) =>
                                p === "..." ? (
                                    <span
                                        key={`dots-${idx}`}
                                        className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm select-none"
                                    >
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p as number)}
                                        disabled={loading}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                                            page === p
                                                ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                                                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            );
                        })()}

                        {/* Next */}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || loading}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {openMenu !== null && (
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => {
                            setOpenMenu(null);
                            setMenuPos(null);
                        }}
                    />
                    {menuPos && (
                        <div
                            className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44 transition-all duration-150"
                            style={{
                                top: menuPos.top,
                                left: menuPos.left,
                            }}
                        >
                            {/* View */}
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) {
                                        setViewingLead(lead);
                                        setIsViewOpen(true);
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                    }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Eye size={14} />
                                View
                            </button>

                            {/* Edit */}
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) {
                                        setEditingLead(lead);
                                        setIsEditOpen(true);
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                    }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Edit size={14} />
                                Edit
                            </button>

                            {/* Convert to Deal */}
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) {
                                        onAction("Convert", lead);
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                    }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Briefcase size={14} />
                                Convert to Deal
                            </button>

                            {/* Share */}
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) {
                                        setSharingLead(lead);
                                        setIsShareOpen(true);
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                    }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                            >
                                <Share2 size={14} />
                                Share
                            </button>

                            {/* Delete */}
                            <button
                                onClick={() => {
                                    const lead = safeLeads.find((l) => l.id === openMenu);
                                    if (lead) {
                                        setConfirmDeleteId(lead.id);
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                    }
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-red-500 border-t border-gray-100 mt-1 pt-1"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    )}
                </>
            )}

            {isEditOpen && editingLead && (
                <EditLeadModal
                    lead={{
                        leadId: editingLead.id,
                        name: editingLead.name,
                        email: editingLead.email || "",
                        phone: editingLead.phone || "",
                        company: editingLead.company || "",
                        city: editingLead.city || "",
                        source: editingLead.source || "",
                        status: editingLead.status || "",
                        estimatedValue: editingLead.estimatedValue?.toString() || "",
                        assignedToId: editingLead.assignedToId || "",
                        tags: editingLead.tags || [],
                        note: editingLead.note || "",
                    }}
                    onClose={() => {
                        setIsEditOpen(false);
                        setEditingLead(null);
                    }}
                    onSave={async (updatedData) => {
                        try {
                            const payload = {
                                ...updatedData,
                                estimatedValue: (updatedData.estimatedValue !== "" && updatedData.estimatedValue !== undefined && updatedData.estimatedValue !== null) 
                                    ? Number(updatedData.estimatedValue) 
                                    : undefined,
                            };
                            await updateLead(editingLead.id, payload as unknown as Partial<Lead>);
                            setIsEditOpen(false);
                            setEditingLead(null);
                            await onRefreshLeads();
                            toast.success("Lead updated successfully");
                        } catch (error) {
                            console.error("Failed to update lead", error);
                            toast.error("Failed to update lead");
                        }
                    }}
                />
            )}

            {isViewOpen && viewingLead && (
                <ViewLeadModal
                    lead={viewingLead}
                    onClose={() => {
                        setIsViewOpen(false);
                        setViewingLead(null);
                    }}
                />
            )}

            {isShareOpen && sharingLead && (
                <ShareLeadModal
                    lead={sharingLead}
                    onClose={() => {
                        setIsShareOpen(false);
                        setSharingLead(null);
                    }}
                />
            )}

            {isUploadOpen && (
                <UploadLeadsModal
                    onClose={() => setIsUploadOpen(false)}
                    onSuccess={async () => {
                        await onRefreshLeads();
                        toast.success("Leads imported! Applying assignment rules…");
                        // Fire assignment rules on all unassigned leads after bulk import
                        // This is best-effort — individual failures are non-fatal
                        try {
                            const { fetchLeads: fetchLeadsApi } = await import("@/lib/api/leadsApi");
                            const { executeAssignmentRule } = await import("@/lib/api/leadsApi");
                            const data = await fetchLeadsApi(1, { status: "All Status", source: "All Sources", owner: "All Owners", search: "" });
                            const unassigned = data.leads.filter((l: any) => !l.assignedToId && !l.assignedTo);
                            await Promise.allSettled(
                                unassigned.slice(0, 50).map((l: any) => executeAssignmentRule(l.id))
                            );
                            if (unassigned.length > 0) {
                                toast.success(`Assignment rules applied to ${Math.min(unassigned.length, 50)} leads.`);
                            }
                        } catch (err) {
                            console.warn("[BulkUpload] Assignment rule run failed (non-fatal):", err);
                        }
                    }}
                />
            )}

            {/* ── Delete Confirm Modal ── */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                <Trash2 size={22} className="text-red-500" />
                            </div>
                            <h2 className="text-[16px] font-bold text-gray-900 mb-1">Delete Lead</h2>
                            <p className="text-[13px] text-gray-500">
                                Are you sure you want to delete this lead? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={deletingId === confirmDeleteId}
                                className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                disabled={deletingId === confirmDeleteId}
                                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                            >
                                {deletingId === confirmDeleteId ? (
                                    <>
                                        <SpinnerIcon size={14} className="animate-spin" />
                                        Deleting…
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}