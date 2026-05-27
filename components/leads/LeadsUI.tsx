"use client";

import { useState, useEffect } from "react";
import EditLeadModal from "./EditLeadModal";
import ViewLeadModal from "./ViewLeadModal";
import { updateLead, assignLead, fetchTeamMembers } from "@/lib/api/leadsApi";
import { TeamMember } from "./AssignLeadModal";

import {
    Search,
    Filter,
    Download,
    Plus,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import {
    Lead,
    LeadsFilters,
    LeadStatus,
} from "@/types/leads";

export interface LeadsTableProps {
    leads: Lead[];
    total: number;
    page: number;
    perPage: number;
    filters: LeadsFilters;
    loading: boolean;
    openMenu: string | null;
    onPageChange: (page: number) => void;
    onRefreshLeads: () => Promise<void>;
    onFiltersChange: (filters: LeadsFilters) => void;
    onNewLead: () => void;
    onExport: () => void;
    onAction: (action: string, lead: Lead) => void;
    setOpenMenu: (id: string | null) => void;
}

const STATUS_STYLES: Record<LeadStatus, string> = {
    NEW: "bg-blue-50 text-blue-600 border border-blue-200",
    CONTACTED: "bg-amber-50 text-amber-600 border border-amber-200",
    QUALIFIED: "bg-green-50 text-green-600 border border-green-200",
    CLOSED: "bg-purple-50 text-purple-600 border border-purple-200",
};

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
                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
                {options.map((o) => (
                    <option key={o}>{o}</option>
                ))}
            </select>
            <ChevronRight
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none"
            />
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
    onPageChange,
    onFiltersChange,
    onRefreshLeads,
    onNewLead,
    onExport,
    onAction,
    setOpenMenu,
}: LeadsTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safeLeads = leads ?? [];
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [viewingLead, setViewingLead] = useState<Lead | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    // States for inline vertical assignment submenu
    const [isAssignSubmenuOpen, setIsAssignSubmenuOpen] = useState(false);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [assignSearch, setAssignSearch] = useState("");

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

    const filteredMembers = Array.isArray(members)
        ? members.filter(
            (m) =>
                m.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                m.role.toLowerCase().includes(assignSearch.toLowerCase())
        ) : [];

    return (
        <div className="min-h-full">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Leads</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage and track all incoming leads.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Download size={14} />
                        Export
                    </button>
                    <button
                        onClick={onNewLead}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                    >
                        <Plus size={15} />
                        New Lead
                    </button>
                </div>
            </div>

            {/* Table card — overflow-hidden removed so dropdown isn't clipped */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">

                {/* Filters bar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
                    <Select
                        value={filters.status}
                        options={["All Status", "NEW", "CONTACTED", "QUALIFIED", "CLOSED"]}
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
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={filters.search}
                            onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }); onPageChange(1); }}
                            className="h-9 pl-8 pr-4 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <Filter size={13} />
                        Filters
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto  overflow-y-visible rounded-b-2xl">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {/* ✅ Score column removed */}
                                {["Lead Name", "Company", "Source", "Owner", "Status", "Created At", "Actions"].map((h) => (
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
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : safeLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                                        No leads found.
                                    </td>
                                </tr>
                            ) : (
                                safeLeads.map((lead) => (
                                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">{lead.name}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{lead.company}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{lead.source}</td>

                                        {/* ✅ Owner — shows "NA" badge if unassigned */}

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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${STATUS_STYLES[lead.status]}`}>
                                                {lead.status}
                                            </span>
                                        </td>



                                        <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">{lead.createdAt}</td>

                                        {/*  Actions — overflow-visible so dropdown isn't clipped */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <p className="text-[13px] text-gray-400">
                        {loading
                            ? "Loading..."
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} leads`}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p <= 5 || p === totalPages)
                            .map((p, idx, arr) => (
                                <>
                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                        <span key={`e-${p}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                                    )}
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        disabled={loading}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${page === p
                                            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
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
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} />
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
                            className={`fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-lg py-1 transition-all duration-150 ${isAssignSubmenuOpen ? "w-56" : "w-36"
                                }`}
                            style={{
                                top: menuPos.top,
                                left: isAssignSubmenuOpen ? menuPos.left - 80 : menuPos.left,
                            }}
                        >
                            {!isAssignSubmenuOpen ? (
                                ["View", "Edit", "Assign", "Delete"].map((action) => (
                                    <button
                                        key={action}
                                        onClick={() => {
                                            const lead = safeLeads.find((l) => l.id === openMenu);
                                            if (lead) {
                                                if (action === "Edit") {
                                                    setEditingLead(lead);
                                                    setIsEditOpen(true);
                                                    setOpenMenu(null);
                                                    setMenuPos(null);
                                                } else if (action === "View") {
                                                    setViewingLead(lead);
                                                    setIsViewOpen(true);
                                                    setOpenMenu(null);
                                                    setMenuPos(null);
                                                } else if (action === "Assign") {
                                                    setIsAssignSubmenuOpen(true);
                                                } else {
                                                    onAction(action, lead);
                                                    setOpenMenu(null);
                                                    setMenuPos(null);
                                                }
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors flex items-center justify-between ${action === "Delete" ? "text-red-500" : "text-gray-700"
                                            }`}
                                    >
                                        <span>{action}</span>
                                        {action === "Assign" && (
                                            <ChevronRight size={13} className="text-gray-400" />
                                        )}
                                    </button>
                                ))
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
                                                        console.log("Clicked member:", member);
                                                        const lead = safeLeads.find((l) => l.id === openMenu);
                                                        console.log("Found lead:", lead);
                                                        if (lead) {
                                                            try {
                                                                console.log("Calling assignLead API...");
                                                                await assignLead(lead.id, member.id);


                                                                console.log("assignLead API success, refreshing leads...");
                                                                await onRefreshLeads();// refresh leads
                                                            } catch (err) {
                                                                console.error("Failed to assign lead", err);
                                                            }
                                                        } else {
                                                            console.warn("No lead found for openMenu:", openMenu);
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
                            await updateLead(editingLead.id, updatedData as unknown as Partial<Lead>);
                            setIsEditOpen(false);
                            setEditingLead(null);
                            onFiltersChange({ ...filters });
                        } catch (error) {
                            console.error("Failed to update lead", error);
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
        </div>
    );
}