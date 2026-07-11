"use client";

import { useState } from "react";
import {
    Search,
    Plus,
    Filter,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Building2,
    Globe,
    Mail,
    Phone,
    MapPin,
    Users,
    X,
    ExternalLink,
} from "lucide-react";
import {
    Company,
    CompaniesFilters,
    createCompany,
    updateCompany,
} from "@/lib/api/companiesApi";
import type { Contact } from "@/lib/api/contactsApi";
import {
    bulkUpdateCompanies,
    bulkDeleteCompanies,
} from "@/lib/api/bulkOperationsApi";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import {
    BulkActionsBar,
    BulkCheckbox,
    BulkSelectAllRow,
    BulkUpdateDialog,
    BulkDeleteDialog,
} from "@/components/ui/BulkActionsBar";

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
    "Technology", "Finance", "Healthcare", "Retail", "Manufacturing",
    "Real Estate", "Education", "Marketing", "Consulting", "Other",
];

const STATUS_OPTIONS = ["Active", "Inactive", "Prospect", "Partner", "Customer"];

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-green-50 text-green-600 border border-green-200",
    Inactive: "bg-gray-100 text-gray-500 border border-gray-200",
    Prospect: "bg-blue-50 text-blue-600 border border-blue-200",
    Customer: "bg-purple-50 text-purple-600 border border-purple-200",
    Partner: "bg-amber-50 text-amber-600 border border-amber-200",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CompanyAvatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
    return (
        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 text-[13px] font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

function ContactAvatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
    return (
        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return <span className="text-gray-400 text-[12px]">—</span>;
    const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 border border-gray-200";
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${style}`}>
            {status}
        </span>
    );
}

// ── Company Form Modal ────────────────────────────────────────────────────────

interface CompanyFormData {
    name: string;
    industry: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    size: string;
    status: string;
    description: string;
}

const EMPTY_FORM: CompanyFormData = {
    name: "",
    industry: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    size: "",
    status: "",
    description: "",
};

interface CompanyModalProps {
    mode: "create" | "edit";
    initial?: CompanyFormData;
    onClose: () => void;
    onSave: (data: CompanyFormData) => Promise<void>;
}

function CompanyModal({ mode, initial, onClose, onSave }: CompanyModalProps) {
    const [form, setForm] = useState<CompanyFormData>(initial ?? EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<CompanyFormData>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        const newErrors: Partial<CompanyFormData> = {};
        if (!form.name.trim()) newErrors.name = "Company name is required";
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        try {
            setLoading(true);
            await onSave(form);
            onClose();
        } catch (err) {
            console.error("Save company error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-gray-50 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {mode === "create" ? "New Company" : "Edit Company"}
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {mode === "create" ? "Add a new company" : "Update company details"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                            Company Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Acme Corporation"
                                    className={`w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-400" : "border-gray-300 focus:border-blue-500"}`}
                                />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                <select
                                    name="industry"
                                    value={form.industry}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Industry</option>
                                    {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Status</option>
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="contact@acme.com"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+1 555 000 0000"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="San Francisco"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <input
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    placeholder="United States"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                                <select
                                    name="size"
                                    value={form.size}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Size</option>
                                    {["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map((s) => (
                                        <option key={s} value={s}>{s} employees</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Brief description..."
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-white border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors"
                    >
                        {loading ? "Saving..." : mode === "create" ? "Create Company" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Company Detail Panel ──────────────────────────────────────────────────────

interface DetailPanelProps {
    company: Company;
    contacts: Contact[];
    contactsLoading: boolean;
    contactsError: string | null;
    onClose: () => void;
    onEdit: (company: Company) => void;
}

function CompanyDetailPanel({
    company,
    contacts,
    contactsLoading,
    contactsError,
    onClose,
    onEdit,
}: DetailPanelProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <CompanyAvatar name={company.name} />
                    <div>
                        <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">{company.name}</h2>
                        <p className="text-[12px] text-gray-400">{company.industry || "Company"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(company)}
                        className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Status */}
                <div className="flex gap-3">
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Status</p>
                        <StatusBadge status={company.status} />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Size</p>
                        <span className="text-[13px] font-medium text-gray-700">{company.size || "—"}</span>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Contacts</p>
                        <span className="text-[13px] font-medium text-gray-700">{company.contactCount ?? contacts.length}</span>
                    </div>
                </div>

                {/* Contact Details */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2.5">
                    <p className="text-[12px] font-semibold text-gray-600 mb-3">Company Details</p>
                    {company.email && (
                        <div className="flex items-center gap-2.5">
                            <Mail size={13} className="text-gray-400 shrink-0" />
                            <span className="text-[12px] text-gray-600">{company.email}</span>
                        </div>
                    )}
                    {company.phone && (
                        <div className="flex items-center gap-2.5">
                            <Phone size={13} className="text-gray-400 shrink-0" />
                            <span className="text-[12px] text-gray-600">{company.phone}</span>
                        </div>
                    )}
                    {company.website && (
                        <div className="flex items-center gap-2.5">
                            <Globe size={13} className="text-gray-400 shrink-0" />
                            <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12px] text-blue-600 hover:underline flex items-center gap-1"
                            >
                                {company.website.replace(/^https?:\/\//, "")}
                                <ExternalLink size={10} />
                            </a>
                        </div>
                    )}
                    {(company.city || company.country) && (
                        <div className="flex items-center gap-2.5">
                            <MapPin size={13} className="text-gray-400 shrink-0" />
                            <span className="text-[12px] text-gray-600">
                                {[company.city, company.country].filter(Boolean).join(", ")}
                            </span>
                        </div>
                    )}
                    {company.description && (
                        <p className="text-[12px] text-gray-500 mt-2 pt-2 border-t border-gray-200">
                            {company.description}
                        </p>
                    )}
                </div>

                {/* Linked Contacts */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] font-semibold text-gray-700 flex items-center gap-1.5">
                            <Users size={14} className="text-gray-400" />
                            Linked Contacts
                        </p>
                        <span className="text-[12px] text-gray-400">
                            {contactsLoading ? "Loading..." : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
                        </span>
                    </div>

                    {contactsLoading ? (
                        <div className="space-y-2.5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
                                    <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                                    <div className="flex-1">
                                        <div className="h-3 bg-gray-100 rounded w-2/3 mb-1.5" />
                                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : contactsError ? (
                        <div className="py-4 text-center text-[13px] text-red-400">{contactsError}</div>
                    ) : contacts.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-gray-400">
                            <Building2 size={28} className="text-gray-200 mx-auto mb-2" />
                            No contacts linked to this company yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {contacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                                >
                                    <ContactAvatar name={contact.name} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-gray-800 truncate">{contact.name}</p>
                                        <p className="text-[11px] text-gray-400 truncate">
                                            {contact.position || contact.email || "—"}
                                        </p>
                                    </div>
                                    {contact.email && (
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-blue-500 transition-colors"
                                        >
                                            <Mail size={13} />
                                        </a>
                                    )}
                                    {contact.phone && (
                                        <a
                                            href={`tel:${contact.phone}`}
                                            className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-green-500 transition-colors"
                                        >
                                            <Phone size={13} />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CompaniesUIProps {
    companies: Company[];
    total: number;
    page: number;
    perPage: number;
    filters: CompaniesFilters;
    loading: boolean;
    openMenu: string | null;
    selectedCompany: Company | null;
    companyContacts: Contact[];
    contactsLoading: boolean;
    contactsError: string | null;
    onPageChange: (page: number) => void;
    onFiltersChange: (filters: CompaniesFilters) => void;
    onSelectCompany: (company: Company | null) => void;
    onDelete: (id: string, name: string) => Promise<void>;
    onReload: () => void;
    setOpenMenu: (id: string | null) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CompaniesUI({
    companies,
    total,
    page,
    perPage,
    filters,
    loading,
    openMenu,
    selectedCompany,
    companyContacts,
    contactsLoading,
    contactsError,
    onPageChange,
    onFiltersChange,
    onSelectCompany,
    onDelete,
    onReload,
    setOpenMenu,
}: CompaniesUIProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safeCompanies = companies ?? [];

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

    // ── Bulk state ────────────────────────────────────────────────────────────
    const [bulkUpdateIndustry, setBulkUpdateIndustry] = useState("");

    const bulk = useBulkSelection(() => onReload());

    const handleBulkUpdate = () => {
        void bulk.executeBulkCall("update", (onProgress) =>
            bulkUpdateCompanies(
                {
                    ids: Array.from(bulk.selectedIds),
                    data: {
                        ...(bulkUpdateIndustry && { industry: bulkUpdateIndustry }),
                    },
                },
                onProgress
            )
        );
    };

    const handleBulkDelete = () => {
        void bulk.executeBulkCall("delete", (onProgress) =>
            bulkDeleteCompanies({ ids: Array.from(bulk.selectedIds) }, onProgress)
        );
    };

    const handleCreate = async (data: CompanyFormData) => {
        await createCompany(data);
        onReload();
    };

    const handleEdit = async (data: CompanyFormData) => {
        if (!editingCompany) return;
        await updateCompany(editingCompany.id, data as Partial<Company>);
        onReload();
    };

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Companies</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage and track all your companies.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                    <Plus size={15} />
                    New Company
                </button>
            </div>

            {/* Content — split layout when a company is selected */}
            <div
  className={
    selectedCompany
      ? "grid grid-cols-[minmax(0,1fr)_340px] gap-5 items-start"
      : "flex gap-5 items-start"
  }
>

                {/* Left: Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-w-0">
                    {/* Filters */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
                        <div className="relative">
                            <select
                                value={filters.industry}
                                onChange={(e) => { onFiltersChange({ ...filters, industry: e.target.value }); onPageChange(1); }}
                                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option>All Industries</option>
                                {INDUSTRY_OPTIONS.map((i) => <option key={i}>{i}</option>)}
                            </select>
                            <ChevronRight size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={filters.status}
                                onChange={(e) => { onFiltersChange({ ...filters, status: e.target.value }); onPageChange(1); }}
                                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option>All Status</option>
                                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                            </select>
                            <ChevronRight size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative ml-auto">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search companies..."
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

                    {/* Bulk select-all row */}
                    <BulkSelectAllRow
                        allIds={safeCompanies.map((c) => c.id)}
                        selectedCount={bulk.selectedCount}
                        totalCount={safeCompanies.length}
                        isSelected={bulk.isSelected}
                        onSelectAll={bulk.selectAll}
                        onClear={bulk.clearSelection}
                    />

                    {/* Bulk action toolbar */}
                    <BulkActionsBar
                        selectedCount={bulk.selectedCount}
                        entityLabel={bulk.selectedCount === 1 ? "company" : "companies"}
                        showAssign={false}
                        onUpdate={() => bulk.openBulkAction("update")}
                        onDelete={() => bulk.openBulkAction("delete")}
                        onClear={bulk.clearSelection}
                        bulkState={bulk.bulkState}
                        onDismissResult={bulk.closeBulkAction}
                    />

                    {/* Table */}
                    <div className="overflow-x-auto overflow-y-visible w-full">
                        <table className="min-w-[900px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left px-3 py-3 w-8"></th>
                                    {["Company", "Industry", "Email", "Phone", "City", "Status", "Created", "Actions"].map((h) => (
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
                                            {Array.from({ length: 8 }).map((_, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : safeCompanies.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                                            No companies found.
                                        </td>
                                    </tr>
                                ) : (
                                    safeCompanies.map((company) => (
                                        <tr
                                            key={company.id}
                                            onClick={() => onSelectCompany(selectedCompany?.id === company.id ? null : company)}
                                            className={`border-b border-gray-50 cursor-pointer transition-colors ${
                                                selectedCompany?.id === company.id
                                                    ? "bg-blue-50/60"
                                                    : bulk.isSelected(company.id)
                                                    ? "bg-blue-50/30"
                                                    : "hover:bg-gray-50/60"
                                            }`}
                                        >
                                            <td
                                                className="px-3 py-3.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <BulkCheckbox
                                                    id={company.id}
                                                    isSelected={bulk.isSelected(company.id)}
                                                    onToggle={bulk.toggleSelect}
                                                    label={`Select ${company.name}`}
                                                />
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <CompanyAvatar name={company.name} />
                                                    <div>
                                                        <p className="font-medium text-gray-800 text-[13px]">{company.name}</p>
                                                        {company.website && (
                                                            <p className="text-[11px] text-gray-400 truncate max-w-[140px]">
                                                                {company.website.replace(/^https?:\/\//, "")}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{company.industry || "—"}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {company.email ? (
                                                    <a
                                                        href={`mailto:${company.email}`}
                                                        className="text-[13px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Mail size={13} />
                                                        <span className="truncate max-w-[160px]">{company.email}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-[13px]">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {company.phone ? (
                                                    <a
                                                        href={`tel:${company.phone}`}
                                                        className="text-[13px] text-green-600 hover:text-green-700 hover:underline flex items-center gap-1.5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Phone size={13} />
                                                        <span>{company.phone}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-[13px]">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {company.city || company.country ? (
                                                    <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                                                        <MapPin size={13} />
                                                        <span>{[company.city, company.country].filter(Boolean).join(", ")}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[13px]">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <StatusBadge status={company.status} />
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">
                                                {company.createdAt?.split("T")[0] || "—"}
                                            </td>
                                            <td
                                                className="px-5 py-3.5 whitespace-nowrap"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (openMenu === company.id) {
                                                            setOpenMenu(null);
                                                            setMenuPos(null);
                                                        } else {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setMenuPos({ top: rect.bottom + 4, left: rect.right - 144 });
                                                            setOpenMenu(company.id);
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
                                : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} companies`}
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
                                    <span key={p} className="contents">
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                                        )}
                                        <button
                                            onClick={() => onPageChange(p)}
                                            disabled={loading}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
                                                page === p
                                                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    </span>
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

                {/* Right: Detail Panel */}
                {selectedCompany && (
                    <CompanyDetailPanel
                        company={selectedCompany}
                        contacts={companyContacts}
                        contactsLoading={contactsLoading}
                        contactsError={contactsError}
                        onClose={() => onSelectCompany(null)}
                        onEdit={(company) => {
                            setEditingCompany(company);
                            onSelectCompany(null);
                        }}
                    />
                )}
            </div>

            {/* Context Menu */}
            {openMenu !== null && (
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => { setOpenMenu(null); setMenuPos(null); }}
                    />
                    {menuPos && (
                        <div
                            className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-36"
                            style={{ top: menuPos.top, left: menuPos.left }}
                        >
                            {["View Details", "Edit", "Delete"].map((action) => (
                                <button
                                    key={action}
                                    onClick={() => {
                                        const company = safeCompanies.find((c) => c.id === openMenu);
                                        if (!company) return;
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                        if (action === "View Details") {
                                            onSelectCompany(company);
                                        } else if (action === "Edit") {
                                            setEditingCompany(company);
                                        } else if (action === "Delete") {
                                            onDelete(company.id, company.name);
                                        }
                                    }}
                                    className={`w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 transition-colors ${
                                        action === "Delete" ? "text-red-500" : "text-gray-700"
                                    }`}
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Create Modal */}
            {isCreateOpen && (
                <CompanyModal
                    mode="create"
                    onClose={() => setIsCreateOpen(false)}
                    onSave={handleCreate}
                />
            )}

            {/* Edit Modal */}
            {editingCompany && (
                <CompanyModal
                    mode="edit"
                    initial={{
                        name: editingCompany.name ?? "",
                        industry: (editingCompany.industry as string) ?? "",
                        email: (editingCompany.email as string) ?? "",
                        phone: (editingCompany.phone as string) ?? "",
                        city: (editingCompany.city as string) ?? "",
                        country: (editingCompany.country as string) ?? "",
                        size: (editingCompany.size as string) ?? "",
                        status: (editingCompany.status as string) ?? "",
                        description: (editingCompany.description as string) ?? "",
                    }}
                    onClose={() => setEditingCompany(null)}
                    onSave={handleEdit}
                />
            )}

            {/* Bulk Update Dialog */}
            {bulk.bulkState.isOpen && bulk.bulkState.type === "update" && (
                <BulkUpdateDialog
                    count={bulk.selectedCount}
                    entityLabel={bulk.selectedCount === 1 ? "company" : "companies"}
                    fields={
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Industry</label>
                                <select
                                    value={bulkUpdateIndustry}
                                    onChange={(e) => setBulkUpdateIndustry(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                >
                                    <option value="">— keep existing —</option>
                                    {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                        </div>
                    }
                    onConfirm={handleBulkUpdate}
                    onCancel={bulk.closeBulkAction}
                    isProcessing={bulk.bulkState.isProcessing}
                    progress={bulk.bulkState.progress}
                    error={bulk.bulkState.error}
                />
            )}

            {/* Bulk Delete Dialog */}
            {bulk.bulkState.isOpen && bulk.bulkState.type === "delete" && (
                <BulkDeleteDialog
                    count={bulk.selectedCount}
                    entityLabel={bulk.selectedCount === 1 ? "company" : "companies"}
                    onConfirm={handleBulkDelete}
                    onCancel={bulk.closeBulkAction}
                    isProcessing={bulk.bulkState.isProcessing}
                    progress={bulk.bulkState.progress}
                    error={bulk.bulkState.error}
                />
            )}
        </div>
    );
}
