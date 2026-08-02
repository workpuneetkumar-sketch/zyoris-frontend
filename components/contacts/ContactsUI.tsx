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
    Active: "bg-green-50 text-green-600 border border-green-200",
    Inactive: "bg-gray-100 text-gray-500 border border-gray-200",
    Lead: "bg-blue-50 text-blue-600 border border-blue-200",
    Customer: "bg-purple-50 text-purple-600 border border-purple-200",
    Partner: "bg-amber-50 text-amber-600 border border-amber-200",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
    return (
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-[12px] font-bold flex items-center justify-center shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-gray-50 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {mode === "create" ? "New Contact" : "Edit Contact"}
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {mode === "create" ? "Add a new contact" : "Update contact details"}
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
                    {/* Basic Info */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Jane Smith"
                                    className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-400" : "border-gray-300 focus:border-blue-500"}`}
                                />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="jane@example.com"
                                    className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? "border-red-400" : "border-gray-300 focus:border-blue-500"}`}
                                />
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+1 555 000 0000"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                <input
                                    name="company"
                                    value={form.company}
                                    onChange={handleChange}
                                    placeholder="Acme Corp"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                                <input
                                    name="position"
                                    value={form.position}
                                    onChange={handleChange}
                                    placeholder="Sales Manager"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="New York"
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                                <select
                                    name="source"
                                    value={form.source}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Source</option>
                                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Status</option>
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Notes</h3>
                       <textarea
    name="note"
    value={form.note}
    onChange={handleChange}
    placeholder="Additional notes..."
    rows={3}
    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
/>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <Avatar name={contact.name} />
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{contact.name}</h2>
                            <p className="text-sm text-gray-400">{contact.position || contact.company || "Contact"}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-50/50 space-y-4 flex-1">
                    {/* Status + Source */}
                    <div className="flex gap-3">
                        <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Status</p>
                            <StatusBadge status={contact.status} />
                        </div>
                        <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Source</p>
                            <span className="text-sm font-medium text-gray-700">{contact.source || "—"}</span>
                        </div>
                        <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Created</p>
                            <span className="text-sm font-medium text-gray-700">{contact.createdAt?.split("T")[0] || "—"}</span>
                        </div>
                    </div>
                    {/* Contact Info */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="text-sm font-semibold text-gray-700">Contact Information</h3>
                        </div>
                        <div className="p-5 grid grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Email</p>
                                    <p className="text-sm text-gray-800">{contact.email || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                                    <p className="text-sm text-gray-800">{contact.phone || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Company</p>
                                    <p className="text-sm text-gray-800">{contact.company || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">City</p>
                                    <p className="text-sm text-gray-800">{contact.city || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {contact.note && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <p className="text-xs text-gray-400 mb-2">Notes</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.note}</p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors">
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
        <div className="min-h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Contacts</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage and track all your contacts.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                    <Plus size={15} />
                    New Contact
                </button>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                {/* Filters */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
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
                    <div className="relative">
                        <select
                            value={filters.source}
                            onChange={(e) => { onFiltersChange({ ...filters, source: e.target.value }); onPageChange(1); }}
                            className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option>All Sources</option>
                            {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <ChevronRight size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative ml-auto">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={filters.search}
                            onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }); onPageChange(1); }}
                            className="h-9 pl-8 pr-4 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
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
                <div className="overflow-x-auto overflow-y-visible rounded-b-2xl">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-3 py-3 w-8"></th>
                                {["Name", "Company", "Email", "Phone", "City", "Source", "Status", "Created At", "Actions"].map((h) => (
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
                                        {Array.from({ length: 9 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : safeContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-16 text-gray-400 text-sm">
                                        No contacts found.
                                    </td>
                                </tr>
                            ) : (
                                safeContacts.map((contact) => (
                                    <tr key={contact.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${bulk.isSelected(contact.id) ? "bg-blue-50/40" : ""}`}>
                                        <td className="px-3 py-3.5">
                                            <BulkCheckbox
                                                id={contact.id}
                                                isSelected={bulk.isSelected(contact.id)}
                                                onToggle={bulk.toggleSelect}
                                                label={`Select ${contact.name}`}
                                            />
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={contact.name} />
                                                <span className="font-medium text-gray-800">{contact.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{contact.company || "—"}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{contact.email || "—"}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{contact.phone || "—"}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{contact.city || "—"}</td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{contact.source || "—"}</td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <StatusBadge status={contact.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">
                                            {contact.createdAt?.split("T")[0] || "—"}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
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
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} contacts`}
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
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Company ID</label>
                                <input
                                    type="text"
                                    value={bulkUpdateCompanyId}
                                    onChange={(e) => setBulkUpdateCompanyId(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    placeholder="Enter company ID"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
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
