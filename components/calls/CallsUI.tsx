"use client";

import { useState, useMemo } from "react";
import { Plus, X, ChevronLeft, ChevronRight, Phone, PlayCircle, List, Clock, Search, Filter } from "lucide-react";
import { Call } from "@/lib/api/callsApi";

const OUTCOME_OPTIONS = ["CONNECTED", "NO_ANSWER", "LEFT_VOICEMAIL", "BUSY", "FAILED"];

interface CallFormData {
    contactId: string;
    duration: string;
    outcome: string;
    notes: string;
}

const EMPTY_FORM: CallFormData = {
    contactId: "",
    duration: "",
    outcome: "",
    notes: "",
};

interface CallModalProps {
    onClose: () => void;
    onSave: (data: Partial<Call>) => Promise<void>;
}

function CallModal({ onClose, onSave }: CallModalProps) {
    const [form, setForm] = useState<CallFormData>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<CallFormData>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        const newErrors: Partial<CallFormData> = {};
        if (!form.contactId.trim()) newErrors.contactId = "Contact ID is required";
        if (!form.duration.trim() || isNaN(Number(form.duration))) newErrors.duration = "Valid duration (number) is required";
        if (!form.outcome.trim()) newErrors.outcome = "Outcome is required";
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        
        try {
            setLoading(true);
            await onSave({
                contactId: form.contactId,
                duration: Number(form.duration),
                outcome: form.outcome,
                notes: form.notes
            } as Partial<Call>);
            onClose();
        } catch (err) {
            console.error("Save call error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-gray-50 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-gray-900">Log Call</h2>
                        <p className="text-sm text-gray-500 mt-1">Record a new call interaction</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 max-h-[70vh]">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact ID *</label>
                                <input
                                    name="contactId"
                                    value={form.contactId}
                                    onChange={handleChange}
                                    placeholder="Enter contact ID"
                                    className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.contactId ? "border-red-400" : "border-gray-300 focus:border-blue-500"}`}
                                />
                                {errors.contactId && <p className="text-xs text-red-500 mt-1">{errors.contactId}</p>}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                                <input
                                    name="duration"
                                    type="number"
                                    value={form.duration}
                                    onChange={handleChange}
                                    placeholder="e.g., 15"
                                    className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.duration ? "border-red-400" : "border-gray-300 focus:border-blue-500"}`}
                                />
                                {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome *</label>
                                <select
                                    name="outcome"
                                    value={form.outcome}
                                    onChange={handleChange}
                                    className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.outcome ? "border-red-400" : "border-gray-300 focus:border-blue-500"}`}
                                >
                                    <option value="">Select Outcome</option>
                                    {OUTCOME_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {errors.outcome && <p className="text-xs text-red-500 mt-1">{errors.outcome}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    placeholder="Call notes..."
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-5 bg-gray-50/50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-sm transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none transition-all duration-200 shadow-sm shadow-blue-200"
                    >
                        {loading ? "Saving..." : "Log Call"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export interface CallsUIProps {
    calls: Call[];
    total: number;
    page: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    onLogCall: (data: Partial<Call>) => Promise<void>;
}

export function CallsUI({
    calls,
    total,
    page,
    loading,
    onPageChange,
    onLogCall,
}: CallsUIProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
    const [filterOutcome, setFilterOutcome] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const perPage = 10;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const handleSave = async (data: Partial<Call>) => {
        await onLogCall(data);
    };

    const filteredCalls = useMemo(() => {
        return calls.filter((call) => {
            if (filterOutcome && call.outcome !== filterOutcome) return false;
            if (searchQuery && !call.contactName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [calls, filterOutcome, searchQuery]);

    return (
        <div className="min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">Calls</h1>
                    <p className="text-[15px] text-gray-500 mt-1.5 font-medium">Manage and track your call logs</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white rounded-xl p-1 border border-gray-200 flex items-center shadow-sm">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === "table" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <List size={16} /> Table
                        </button>
                        <button
                            onClick={() => setViewMode("timeline")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === "timeline" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <Clock size={16} /> Timeline
                        </button>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[14px] font-bold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus size={18} />
                        Log Call
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search contact..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                    />
                </div>
                <div className="relative max-w-xs w-full sm:w-auto">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                        value={filterOutcome}
                        onChange={(e) => setFilterOutcome(e.target.value)}
                        className="w-full h-10 pl-9 pr-8 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm appearance-none bg-white"
                    >
                        <option value="">All Outcomes</option>
                        {OUTCOME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                {viewMode === "table" ? (
                    <div className="overflow-x-auto overflow-y-visible rounded-t-2xl rounded-b-2xl">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {["Contact", "Date", "Duration", "Outcome", "Recording", "Notes", "Logged By"].map((h) => (
                                        <th key={h} className="text-left px-5 py-3 text-[12px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-16">
                                            <div className="flex justify-center items-center h-full p-4">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCalls.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-16">
                                            <Phone size={32} className="text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-400 text-sm font-medium">No calls found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCalls.map((call) => (
                                        <tr key={call.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center shrink-0 shadow-sm border border-blue-200/50">
                                                        <Phone size={16} />
                                                    </div>
                                                    <span className="font-semibold text-gray-800 text-[14px]">{call.contactName || "Unknown Contact"}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                                                {call.date ? (
                                                    <>{new Date(call.date).toLocaleDateString()} {new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                                                ) : "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{call.duration} mins</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                    {call.outcome}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {call.outcome === "CONNECTED" ? (
                                                    <div className="flex items-center gap-2 text-blue-500 opacity-60 cursor-not-allowed" title="Recording unavailable">
                                                        <PlayCircle size={18} />
                                                        <span className="text-xs font-medium">00:00 / {call.duration}:00</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate" title={call.notes}>
                                                {call.notes || "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">
                                                {call.loggedBy || "—"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-6 relative">
                        {loading ? (
                            <div className="flex justify-center items-center py-16">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredCalls.length === 0 ? (
                            <div className="text-center py-16">
                                <Phone size={32} className="text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm font-medium">No calls found in timeline.</p>
                            </div>
                        ) : (
                            <>
                                <div className="absolute left-[45px] top-8 bottom-8 w-0.5 bg-gray-100"></div>
                                <div className="space-y-6">
                                    {filteredCalls.map((call) => (
                                        <div key={call.id} className="relative flex gap-6">
                                            <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border-4 border-white z-10 text-blue-600 shadow-sm">
                                                <Phone size={18} />
                                            </div>
                                            <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 text-base">{call.contactName || "Unknown Contact"}</h3>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {call.date ? new Date(call.date).toLocaleString() : "Date unavailable"} • {call.duration} mins
                                                        </p>
                                                    </div>
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium bg-white border border-gray-200 text-gray-600 shrink-0">
                                                        {call.outcome}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-4 bg-white p-3 rounded-lg border border-gray-100">
                                                    {call.notes || "No notes provided for this call."}
                                                </p>
                                                {call.outcome === "CONNECTED" && (
                                                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed shadow-sm">
                                                        <PlayCircle size={16} />
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-gray-600">Recording Unavailable</span>
                                                            <span className="text-[10px]">Placeholder • {call.duration} mins</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <p className="text-[13px] text-gray-400">
                        {loading
                            ? "Loading..."
                            : `Showing ${total === 0 ? 0 : (page - 1) * perPage + 1} to ${Math.min(page * perPage, total)} of ${total} calls`}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-medium bg-blue-600 text-white shadow-sm shadow-blue-200">
                            {page}
                        </span>
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

            {isModalOpen && (
                <CallModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

