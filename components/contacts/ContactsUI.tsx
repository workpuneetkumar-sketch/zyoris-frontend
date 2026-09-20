"use client";

import { useState } from "react";
import {
    Search,
    Plus,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Mail,
    Phone,
    Building2,
    MapPin,
    X,
    Users,
    CheckCircle2,
    Target,
    UserCheck,
    Filter,
    ArrowUpRight,
    Briefcase,
} from "lucide-react";
import {
    Contact,
    ContactsFilters,
    createContact,
    updateContact,
} from "@/lib/api/contactsApi";
import {
    bulkUpdateContacts,
    bulkDeleteContacts,
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

const STATUS_OPTIONS = ["Active", "Inactive", "Lead", "Customer", "Partner"];
const SOURCE_OPTIONS = ["Website", "Referral", "LinkedIn", "Cold Outreach", "Event", "Other"];

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
    Inactive: "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    Lead: "bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60",
    Customer: "bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60",
    Partner: "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "CT";
    return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-[12px] font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
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

// ── Contact Form Modal ────────────────────────────────────────────────────────

interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    company: string;
    position: string;
    city: string;
    source: string;
    status: string;
    note: string;
}

const EMPTY_FORM: ContactFormData = {
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    city: "",
    source: "",
    status: "",
    note: "",
};

interface ContactModalProps {
    mode: "create" | "edit";
    initial?: ContactFormData;
    onClose: () => void;
    onSave: (data: ContactFormData) => Promise<void>;
}

function ContactModal({ mode, initial, onClose, onSave }: ContactModalProps) {
    const [form, setForm] = useState<ContactFormData>(initial ?? EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<ContactFormData>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        const newErrors: Partial<ContactFormData> = {};
        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.email.trim()) newErrors.email = "Email is required";
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        try {
            setLoading(true);
            await onSave(form);
            onClose();
        } catch (err) {
            console.error("Save contact error:", err);
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
                            {mode === "create" ? "New Contact" : "Edit Contact"}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {mode === "create" ? "Add a new contact to your CRM workspace" : "Update contact details and preferences"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
                    {/* Basic Info */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name *</label>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Jane Smith"
                                    className={`w-full h-10 rounded-xl border px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.name ? "border-rose-400" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`}
                                />
                                {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email *</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="jane@example.com"
                                    className={`w-full h-10 rounded-xl border px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.email ? "border-rose-400" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`}
                                />
                                {errors.email && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.email}</p>}
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
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company</label>
                                <input
                                    name="company"
                                    value={form.company}
                                    onChange={handleChange}
                                    placeholder="Acme Corp"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Position</label>
                                <input
                                    name="position"
                                    value={form.position}
                                    onChange={handleChange}
                                    placeholder="Sales Director"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">City</label>
                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="New York"
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Source</label>
                                <select
                                    name="source"
                                    value={form.source}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Select Source</option>
                                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
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
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Notes & Details</h3>
                        <textarea
                            name="note"
                            value={form.note}
                            onChange={handleChange}
                            placeholder="Add additional context or notes about this contact..."
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
                        {loading ? "Saving..." : mode === "create" ? "Create Contact" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── View Contact Modal ────────────────────────────────────────────────────────

function ViewContactModal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <Avatar name={contact.name} />
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">{contact.name}</h2>
                            <p className="text-xs text-slate-500">{contact.position || contact.company || "Contact Record"}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30 space-y-4 flex-1">
                    {/* Status + Source */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                            <StatusBadge status={contact.status} />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Source</p>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{contact.source || "—"}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Created</p>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{contact.createdAt?.split("T")[0] || "—"}</span>
                        </div>
                    </div>
                    {/* Contact Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Information</h3>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-slate-400 mb-0.5">Email</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{contact.email || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-slate-400 mb-0.5">Phone</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{contact.phone || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-slate-400 mb-0.5">Company</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{contact.company || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] text-slate-400 mb-0.5">City</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{contact.city || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {contact.note && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs p-5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-normal">{contact.note}</p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ContactsUIProps {
    contacts: Contact[];
    total: number;
    page: number;
    perPage: number;
    filters: ContactsFilters;
    loading: boolean;
    openMenu: string | null;
    onPageChange: (page: number) => void;
    onFiltersChange: (filters: ContactsFilters) => void;
    onDelete: (id: string, name: string) => Promise<void>;
    onReload: () => void;
    setOpenMenu: (id: string | null) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContactsUI({
    contacts,
    total,
    page,
    perPage,
    filters,
    loading,
    openMenu,
    onPageChange,
    onFiltersChange,
    onDelete,
    onReload,
    setOpenMenu,
}: ContactsUIProps) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safeContacts = contacts ?? [];

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [viewingContact, setViewingContact] = useState<Contact | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

    // Calculated Stat Counts
    const activeCount = safeContacts.filter((c) => c.status === "Active").length;
    const leadCount = safeContacts.filter((c) => c.status === "Lead").length;
    const customerCount = safeContacts.filter((c) => c.status === "Customer").length;

    // ── Bulk update form state ────────────────────────────────────────────────
    const [bulkUpdateCompanyId, setBulkUpdateCompanyId] = useState("");

    const bulk = useBulkSelection(() => onReload());

    const handleBulkUpdate = () => {
        void bulk.executeBulkCall("update", (onProgress) =>
            bulkUpdateContacts(
                {
                    ids: Array.from(bulk.selectedIds),
                    data: {
                        companyId: bulkUpdateCompanyId,
                    },
                },
                onProgress
            )
        );
    };

    const handleBulkDelete = () => {
        void bulk.executeBulkCall("delete", (onProgress) =>
            bulkDeleteContacts({ ids: Array.from(bulk.selectedIds) }, onProgress)
        );
    };

    const handleCreate = async (data: ContactFormData) => {
        await createContact(data);
        onReload();
    };

    const handleEdit = async (data: ContactFormData) => {
        if (!editingContact) return;
        await updateContact(editingContact.id, data as Partial<Contact>);
        onReload();
    };

    return (
        <div className="space-y-6">
            {/* Header & Primary CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/60 shadow-2xs shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">Contacts</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage and track your customer and lead contacts in one place.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md shrink-0"
                >
                    <Plus size={15} />
                    New Contact
                </button>
            </div>

            {/* Quick Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
                        <Users size={16} className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active</span>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leads</span>
                        <Target size={16} className="text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{leadCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customers</span>
                        <UserCheck size={16} className="text-purple-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{customerCount}</p>
                </div>
            </div>

            {/* Table Container Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-wrap">
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
                    <div className="relative">
                        <select
                            value={filters.source}
                            onChange={(e) => { onFiltersChange({ ...filters, source: e.target.value }); onPageChange(1); }}
                            className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option>All Sources</option>
                            {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <ChevronRight size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative sm:ml-auto w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search contacts by name, email..."
                            value={filters.search}
                            onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }); onPageChange(1); }}
                            className="w-full h-9 pl-8 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                        />
                    </div>
                </div>

                {/* Bulk select-all row */}
                <BulkSelectAllRow
                    allIds={safeContacts.map((c) => c.id)}
                    selectedCount={bulk.selectedCount}
                    totalCount={safeContacts.length}
                    isSelected={bulk.isSelected}
                    onSelectAll={bulk.selectAll}
                    onClear={bulk.clearSelection}
                />

                {/* Bulk action toolbar */}
                <BulkActionsBar
                    selectedCount={bulk.selectedCount}
                    entityLabel={bulk.selectedCount === 1 ? "contact" : "contacts"}
                    showAssign={false}
                    onUpdate={() => bulk.openBulkAction("update")}
                    onDelete={() => bulk.openBulkAction("delete")}
                    onClear={bulk.clearSelection}
                    bulkState={bulk.bulkState}
                    onDismissResult={bulk.closeBulkAction}
                />

                {/* Table */}
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                                <th className="text-left px-4 py-3.5 w-10"></th>
                                {["Name", "Company", "Email", "Phone", "City", "Source", "Status", "Created At", "Actions"].map((h) => (
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
                                        {Array.from({ length: 9 }).map((_, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : safeContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-16 text-slate-400 text-xs font-medium">
                                        No contacts found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                safeContacts.map((contact) => (
                                    <tr
                                        key={contact.id}
                                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150 ${
                                            bulk.isSelected(contact.id) ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                                        }`}
                                    >
                                        <td className="px-4 py-3.5">
                                            <BulkCheckbox
                                                id={contact.id}
                                                isSelected={bulk.isSelected(contact.id)}
                                                onToggle={bulk.toggleSelect}
                                                label={`Select ${contact.name}`}
                                            />
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={contact.name} />
                                                <div>
                                                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{contact.name}</span>
                                                    {contact.position && <span className="text-[11px] text-slate-400 font-medium">{contact.position}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{contact.company || "—"}</td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{contact.email || "—"}</td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{contact.phone || "—"}</td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{contact.city || "—"}</td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{contact.source || "—"}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <StatusBadge status={contact.status} />
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap text-[11px]">
                                            {contact.createdAt?.split("T")[0] || "—"}
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <button
                                                onClick={(e) => {
                                                    if (openMenu === contact.id) {
                                                        setOpenMenu(null);
                                                        setMenuPos(null);
                                                    } else {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setMenuPos({ top: rect.bottom + 4, left: rect.right - 144 });
                                                        setOpenMenu(contact.id);
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
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} contacts`}
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
                            {["View", "Edit", "Delete"].map((action) => (
                                <button
                                    key={action}
                                    onClick={() => {
                                        const contact = safeContacts.find((c) => c.id === openMenu);
                                        if (!contact) return;
                                        setOpenMenu(null);
                                        setMenuPos(null);
                                        if (action === "View") {
                                            setViewingContact(contact);
                                        } else if (action === "Edit") {
                                            setEditingContact(contact);
                                        } else if (action === "Delete") {
                                            onDelete(contact.id, contact.name);
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
                <ContactModal
                    mode="create"
                    onClose={() => setIsCreateOpen(false)}
                    onSave={handleCreate}
                />
            )}

            {/* Edit Modal */}
            {editingContact && (
                <ContactModal
                    mode="edit"
                    initial={{
                        name: editingContact.name ?? "",
                        email: editingContact.email ?? "",
                        phone: (editingContact.phone as string) ?? "",
                        company: (editingContact.company as string) ?? "",
                        position: (editingContact.position as string) ?? "",
                        city: (editingContact.city as string) ?? "",
                        source: (editingContact.source as string) ?? "",
                        status: (editingContact.status as string) ?? "",
                        note: (editingContact.note as string) ?? "",
                    }}
                    onClose={() => setEditingContact(null)}
                    onSave={handleEdit}
                />
            )}

            {/* View Modal */}
            {viewingContact && (
                <ViewContactModal
                    contact={viewingContact}
                    onClose={() => setViewingContact(null)}
                />
            )}

            {/* Bulk Update Dialog */}
            {bulk.bulkState.isOpen && bulk.bulkState.type === "update" && (
                <BulkUpdateDialog
                    count={bulk.selectedCount}
                    entityLabel={bulk.selectedCount === 1 ? "contact" : "contacts"}
                    fields={
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Company ID</label>
                                <input
                                    type="text"
                                    value={bulkUpdateCompanyId}
                                    onChange={(e) => setBulkUpdateCompanyId(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    placeholder="Enter company ID"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                />
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
                    entityLabel={bulk.selectedCount === 1 ? "contact" : "contacts"}
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
