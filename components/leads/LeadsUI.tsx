"use client";

import { useState, useEffect } from "react";
import EditLeadModal from "./EditLeadModal";
import ViewLeadModal from "./ViewLeadModal";
import UploadLeadsModal from "./UploadLeadsModal";
import { updateLead, assignLead, fetchTeamMembers, deleteLead, getLeadAssignmentRecommendation, LeadAssignmentRecommendationResult } from "@/lib/api/leadsApi";
import { TeamMember } from "./AssignLeadModal";
import { toast } from "react-toastify";
import { LeadCheckbox } from "./BulkActionsToolbar";

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

    // States for inline vertical assignment submenu
    const [isAssignSubmenuOpen, setIsAssignSubmenuOpen] = useState(false);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [assignSearch, setAssignSearch] = useState("");
    const [aiRec, setAiRec] = useState<LeadAssignmentRecommendationResult | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((p) => p[0]?.toUpperCase() ?? "")
            .join("")
            .slice(0, 2);
    };

    useEffect(() => {
        if (isAssignSubmenuOpen && members.length === 0) {
            setMembersLoading(true);
            setMembersError(null);
            fetchTeamMembers()
                .then((data) => setMembers(data.members || []))
                .catch((err) => setMembersError(err?.response?.data?.message || err.message || "An error occurred"))
                .finally(() => setMembersLoading(false));
        }
    }, [isAssignSubmenuOpen, members.length]);

    useEffect(() => {
        if (!isAssignSubmenuOpen || !openMenu) return;
        setAiRec(null);
        setAiLoading(true);
        getLeadAssignmentRecommendation(openMenu)
            .then((data) => setAiRec(data))
            .catch((err) => console.warn("AI recommendation fetch failed:", err))
            .finally(() => setAiLoading(false));
    }, [isAssignSubmenuOpen, openMenu]);

    const filteredMembers = Array.isArray(members)
        ? members.filter(
            (m) =>
                m.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                m.role.toLowerCase().includes(assignSearch.toLowerCase())
        )
        : [];

    // ── Handle Delete ──────────────────────────────────────────
    const handleDelete = async (leadId: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        
        setDeletingId(leadId);
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
            setOpenMenu(null);
            setMenuPos(null);
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
                                            <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">{lead.name}</td>
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
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} leads`}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p <= 5 || p === totalPages)
                            .map((p, idx, arr) => (
                                <>
                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                        <span key={`e-${p}`} className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm">…</span>
                                    )}
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        disabled={loading}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${page === p
                                            ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                </>
                            ))}
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
                            setIsAssignSubmenuOpen(false);
                            setAssignSearch("");
                        }}
                    />
                    {menuPos && (
                        <div
                            className={`fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-lg py-1 transition-all duration-150 ${isAssignSubmenuOpen ? "w-56" : "w-44"
                                }`}
                            style={{
                                top: menuPos.top,
                                left: isAssignSubmenuOpen ? menuPos.left - 80 : menuPos.left,
                            }}
                        >
                            {!isAssignSubmenuOpen ? (
                                <>
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
                                    
                                    {/* Assign */}
                                    <button
                                        onClick={() => {
                                            setIsAssignSubmenuOpen(true);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center justify-between text-gray-700"
                                    >
                                        <span className="flex items-center gap-2">
                                            <UserPlus size={14} />
                                            Assign
                                        </span>
                                        <ChevronRight size={13} className="text-gray-400" />
                                    </button>
                                    
                                    {/* Delete */}
                                    <button
                                        onClick={() => {
                                            const lead = safeLeads.find((l) => l.id === openMenu);
                                            if (lead) {
                                                handleDelete(lead.id);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 text-red-500 border-t border-gray-100 mt-1 pt-1"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col">
                                    {/* Submenu Header */}
                                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                                        <button
                                            onClick={() => {
                                                setIsAssignSubmenuOpen(false);
                                                setAssignSearch("");
                                            }}
                                            className="p-1 rounded hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span className="text-[13px] font-semibold text-gray-700">Assign Lead</span>
                                    </div>

                                    {/* Search Input */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100">
                                        <Search size={12} className="text-gray-400 shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Search members..."
                                            value={assignSearch}
                                            onChange={(e) => setAssignSearch(e.target.value)}
                                            className="w-full text-[12px] outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                                            autoFocus
                                        />
                                    </div>

                                    {/* AI Best Match Card */}
                                    {aiLoading ? (
                                        <div className="mx-2 my-2 p-2.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 rounded-lg flex items-center gap-2 text-blue-700 text-[12px]">
                                            <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                                            <span>✨ AI analyzing capacity & territory...</span>
                                        </div>
                                    ) : aiRec && aiRec.rankings?.[0] ? (() => {
                                        const topRep = aiRec.rankings[0];
                                        const memberMatch = members.find((m) => m.id === topRep.repId || m.name.toLowerCase() === topRep.repName.toLowerCase());
                                        return (
                                            <div className="mx-2 my-2 p-2.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-indigo-200/80 rounded-xl shadow-sm text-left">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-900">
                                                        <Sparkles size={14} className="text-indigo-600 shrink-0" />
                                                        <span>AI Best Match</span>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-[11px] rounded-full shadow-xs">
                                                        {topRep.totalScore}% Score
                                                    </span>
                                                </div>
                                                <p className="text-[11.5px] font-medium text-gray-800 mb-0.5">
                                                    {topRep.repName}
                                                </p>
                                                <p className="text-[11px] text-gray-600 leading-snug mb-2 line-clamp-2">
                                                    {topRep.rationale}
                                                </p>
                                                {memberMatch && (
                                                    <button
                                                        type="button"
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const lead = safeLeads.find((l) => l.id === openMenu);
                                                            if (!lead) return;
                                                            try {
                                                                await assignLead(lead.id, memberMatch.id);
                                                                await onRefreshLeads();
                                                                toast.success(`Lead assigned to ${memberMatch.name}`);
                                                                setOpenMenu(null);
                                                                setMenuPos(null);
                                                                setIsAssignSubmenuOpen(false);
                                                                setAssignSearch("");
                                                            } catch (err) {
                                                                toast.error("Failed to assign lead");
                                                            }
                                                        }}
                                                        className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11.5px] rounded-lg transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <span>Assign to {topRep.repName.split(" ")[0]}</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })() : null}

                                    {/* Members List */}
                                    <div className="max-h-[180px] overflow-y-auto py-1">
                                        {membersLoading ? (
                                            <div className="flex justify-center py-4">
                                                <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                            </div>
                                        ) : membersError ? (
                                            <div className="px-3 py-2 text-[11px] text-red-500 text-center">
                                                {membersError}
                                            </div>
                                        ) : filteredMembers.length === 0 ? (
                                            <div className="px-3 py-2 text-[11px] text-gray-400 text-center">
                                                No members found
                                            </div>
                                        ) : (
                                            filteredMembers.map((member) => (
                                                <button
                                                    key={member.id}
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const lead = safeLeads.find((l) => l.id === openMenu);

                                                        if (!lead) {
                                                            console.warn("No lead found for openMenu:", openMenu);
                                                        } else if (lead.assignedTo?.id === member.id) {
                                                            setOpenMenu(null);
                                                            setMenuPos(null);
                                                            setIsAssignSubmenuOpen(false);
                                                            setAssignSearch("");
                                                            return;
                                                        } else {
                                                            try {
                                                                await assignLead(lead.id, member.id);
                                                                await onRefreshLeads();
                                                                toast.success(`Lead assigned to ${member.name}`);
                                                            } catch (err) {
                                                                console.error("Failed to assign lead", err);
                                                                toast.error("Failed to assign lead");
                                                            }
                                                        }

                                                        setOpenMenu(null);
                                                        setMenuPos(null);
                                                        setIsAssignSubmenuOpen(false);
                                                        setAssignSearch("");
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <Avatar initials={getInitials(member.name)} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[12.5px] font-medium text-gray-800 truncate">
                                                            {member.name}
                                                        </p>
                                                        <p className="text-[10.5px] text-gray-400 truncate">
                                                            {member.role}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
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

            {isUploadOpen && (
                <UploadLeadsModal
                    onClose={() => setIsUploadOpen(false)}
                    onSuccess={async () => {
                        await onRefreshLeads();
                        toast.success("Leads imported successfully!");
                    }}
                />
            )}
        </div>
    );
}