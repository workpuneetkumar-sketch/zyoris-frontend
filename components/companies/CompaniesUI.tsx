"use client";

import { useState } from "react";
import {
    Search,
    Plus,
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
    CheckCircle2,
    Briefcase,
    Layers,
    ArrowUpRight,
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

const STATUS_OPTIONS = ["Active", "Inactive"];

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
    Inactive: "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    Prospect: "bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60",
    Customer: "bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60",
    Partner: "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CompanyAvatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "CO";
    return (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
            {initials}
        </div>
    );
}

function ContactAvatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "CT";
    return (
        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return <span className="text-slate-400 text-xs">—</span>;
    const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500 border border-slate-200";
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight shadow-2xs ${style}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            {mode === "create" ? "New Company" : "Edit Company"}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {mode === "create" ? "Add a new company profile to your CRM" : "Update company details and account settings"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
                    <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Company Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company Name *</label>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Acme Corporation"
                                    className={`w-full h-10 rounded-xl border px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.name ? "border-rose-400" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`}
                                />
                                {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Industry</label>
                                <select
                                    name="industry"
                                    value={form.industry}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Select Industry</option>
                                    {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Select Status</option>
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="contact@acme.com"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+1 555 000 0000"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">City</label>
                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="San Francisco"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Country</label>
                                <input
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    placeholder="United States"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company Size</label>
                                <input
                                    name="size"
                                    value={form.size}
                                    onChange={handleChange}
                                    placeholder="e.g. 50-200 employees"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Overview</h3>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Add brief description or company background..."
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md disabled:opacity-70 transition-all"
                    >
                        {loading ? "Saving..." : mode === "create" ? "Create Company" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Company Detail Slide-out / Panel ──────────────────────────────────────────

function CompanyDetailPanel({
    company,
    contacts,
    contactsLoading,
    contactsError,
    onClose,
    onEdit,
}: {
    company: Company;
    contacts: Contact[];
    contactsLoading: boolean;
    contactsError: string | null;
    onClose: () => void;
    onEdit: (company: Company) => void;
}) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 space-y-5 animate-in slide-in-from-right-4 duration-200">
            {/* Top Bar */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <CompanyAvatar name={company.name} />
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{company.name}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{company.industry || "Company Record"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onEdit(company)}
                        className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* Account Details */}
            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-500">Account Status</span>
                    <StatusBadge status={company.status} />
                </div>

                <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
                    {company.website && (
                        <div className="flex items-center gap-2.5">
                            <Globe size={14} className="text-slate-400 shrink-0" />
                            <a
                                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 truncate"
                            >
                                <span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span>
                                <ExternalLink size={10} />
                            </a>
                        </div>
                    )}
                    {company.email && (
                        <div className="flex items-center gap-2.5">
                            <Mail size={14} className="text-slate-400 shrink-0" />
                            <a href={`mailto:${company.email}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 truncate">
                                {company.email}
                            </a>
                        </div>
                    )}
                    {company.phone && (
                        <div className="flex items-center gap-2.5">
                            <Phone size={14} className="text-slate-400 shrink-0" />
                            <a href={`tel:${company.phone}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600">
                                {company.phone}
                            </a>
                        </div>
                    )}
                    {(company.city || company.country) && (
                        <div className="flex items-center gap-2.5">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {[company.city, company.country].filter(Boolean).join(", ")}
                            </span>
                        </div>
                    )}
                    {company.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 leading-relaxed font-normal">
                            {company.description}
                        </p>
                    )}
                </div>

                {/* Linked Contacts Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Users size={15} className="text-blue-500" />
                            Linked Contacts
                        </p>
                        <span className="text-[11px] font-bold text-slate-400">
                            {contactsLoading ? "Loading..." : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
                        </span>
                    </div>

                    {contactsLoading ? (
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                                    <div className="flex-1">
                                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3 mb-1.5" />
                                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : contactsError ? (
                        <div className="py-4 text-center text-xs text-rose-500 font-medium">{contactsError}</div>
                    ) : contacts.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                            <Building2 size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                            No contacts linked to this company yet.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {contacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ContactAvatar name={contact.name} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{contact.name}</p>
                                        <p className="text-[11px] text-slate-400 truncate">
                                            {contact.position || contact.email || "—"}
                                        </p>
                                    </div>
                                    {contact.email && (
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Mail size={13} />
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

    const activeCount = safeCompanies.filter((c) => c.status === "Active").length;
    const uniqueIndustries = new Set(safeCompanies.map((c) => c.industry).filter(Boolean)).size;

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
        <div className="space-y-6">
            {/* Header & Action CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/60 shadow-2xs shrink-0">
                        <Building2 size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">Companies</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage enterprise accounts, company details, and linked contact lists.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md shrink-0"
                >
                    <Plus size={15} />
                    New Company
                </button>
            </div>

            {/* Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Companies</span>
                        <Building2 size={16} className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Accounts</span>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Industries</span>
                        <Globe size={16} className="text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{uniqueIndustries}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Linked Contacts</span>
                        <Users size={16} className="text-purple-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{companyContacts.length || safeCompanies.length}</p>
                </div>
            </div>

            {/* Split layout when a company is selected */}
            <div
                className={
                    selectedCompany
                        ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start"
                        : "flex gap-5 items-start"
                }
            >
                {/* Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs min-w-0 w-full overflow-hidden">
                    {/* Filters */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                        <div className="relative">
                            <select
                                value={filters.industry}
                                onChange={(e) => { onFiltersChange({ ...filters, industry: e.target.value }); onPageChange(1); }}
                                className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                            >
                                <option>All Industries</option>
                                {INDUSTRY_OPTIONS.map((i) => <option key={i}>{i}</option>)}
                            </select>
                            <ChevronRight size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={filters.status}
                                onChange={(e) => { onFiltersChange({ ...filters, status: e.target.value }); onPageChange(1); }}
                                className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                            >
                                <option>All Status</option>
                                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                            </select>
                            <ChevronRight size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative sm:ml-auto w-full sm:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search companies..."
                                value={filters.search}
                                onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }); onPageChange(1); }}
                                className="w-full h-9 pl-8 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                            />
                        </div>
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
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                                    <th className="text-left px-4 py-3.5 w-10"></th>
                                    {["Company", "Industry", "Email", "Phone", "Location", "Status", "Created", "Actions"].map((h) => (
                                        <th key={h} className="px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                {loading ? (
                                    Array.from({ length: perPage }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-4"></td>
                                            {Array.from({ length: 8 }).map((_, j) => (
                                                <td key={j} className="px-4 py-4">
                                                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse w-3/4" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : safeCompanies.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-16 text-slate-400 text-xs font-medium">
                                            No companies found.
                                        </td>
                                    </tr>
                                ) : (
                                    safeCompanies.map((company) => (
                                        <tr
                                            key={company.id}
                                            onClick={() => onSelectCompany(selectedCompany?.id === company.id ? null : company)}
                                            className={`cursor-pointer transition-colors duration-150 ${
                                                selectedCompany?.id === company.id
                                                    ? "bg-blue-50/70 dark:bg-blue-950/30"
                                                    : bulk.isSelected(company.id)
                                                    ? "bg-blue-50/40 dark:bg-blue-950/20"
                                                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                                            }`}
                                        >
                                            <td
                                                className="px-4 py-3.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <BulkCheckbox
                                                    id={company.id}
                                                    isSelected={bulk.isSelected(company.id)}
                                                    onToggle={bulk.toggleSelect}
                                                    label={`Select ${company.name}`}
                                                />
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <CompanyAvatar name={company.name} />
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-slate-100 block text-xs">{company.name}</p>
                                                        {company.website && (
                                                            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
                                                                {company.website.replace(/^https?:\/\//, "")}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{company.industry || "—"}</td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {company.email ? (
                                                    <a
                                                        href={`mailto:${company.email}`}
                                                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1.5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Mail size={13} />
                                                        <span className="truncate max-w-[150px]">{company.email}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {company.phone ? (
                                                    <a
                                                        href={`tel:${company.phone}`}
                                                        className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1.5"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Phone size={13} />
                                                        <span>{company.phone}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                {company.city || company.country ? (
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        <MapPin size={13} className="text-slate-400 shrink-0" />
                                                        <span>{[company.city, company.country].filter(Boolean).join(", ")}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <StatusBadge status={company.status} />
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap text-[11px]">
                                                {company.createdAt?.split("T")[0] || "—"}
                                            </td>
                                            <td
                                                className="px-4 py-3.5 whitespace-nowrap"
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
                                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
                                                >
                                                    <MoreVertical size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                        <p className="text-xs font-medium text-slate-500">
                            {loading
                                ? "Loading records..."
                                : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} companies`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => onPageChange(Math.max(1, page - 1))}
                                disabled={page === 1 || loading}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p <= 5 || p === totalPages)
                                .map((p, idx, arr) => (
                                    <span key={p} className="contents">
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold">…</span>
                                        )}
                                        <button
                                            onClick={() => onPageChange(p)}
                                            disabled={loading}
                                            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                                                page === p
                                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs"
                                                    : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    </span>
                                ))}
                            <button
                                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages || loading}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                            className="fixed z-[9999] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 w-36 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
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
                                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                                        action === "Delete" ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"
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
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Industry</label>
                                <select
                                    value={bulkUpdateIndustry}
                                    onChange={(e) => setBulkUpdateIndustry(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
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
