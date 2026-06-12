"use client";

import { useState } from "react";
import { Plus, X, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { Call } from "@/lib/api/callsApi";

const OUTCOME_OPTIONS = ["Interested", "Not Interested", "No Answer", "Left Voicemail", "Follow Up Required"];

interface CallFormData {
    contactName: string;
    duration: string;
    outcome: string;
    notes: string;
    loggedBy: string;
}

const EMPTY_FORM: CallFormData = {
    contactName: "",
    duration: "",
    outcome: "",
    notes: "",
    loggedBy: "Admin", // default value or could be dynamic
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
        if (!form.contactName.trim()) newErrors.contactName = "Contact is required";
        if (!form.duration.trim()) newErrors.duration = "Duration is required";
        if (!form.outcome.trim()) newErrors.outcome = "Outcome is required";
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        
        try {
            setLoading(true);
            await onSave(form);
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
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Log Call</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Record a new call interaction</p>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                                <input
                                    name="contactName"
                                    value={form.contactName}
                                    onChange={handleChange}
                                    placeholder="Select or enter contact"
                                    className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${errors.contactName ? "border-red-400" : "border-gray-300 focus:border-blue-500"}`}
                                />
                                {errors.contactName && <p className="text-xs text-red-500 mt-1">{errors.contactName}</p>}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration *</label>
                                <input
                                    name="duration"
                                    value={form.duration}
                                    onChange={handleChange}
                                    placeholder="e.g., 15 mins"
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
    const perPage = 10;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const handleSave = async (data: Partial<Call>) => {
        await onLogCall(data);
    };

    return (
        <div className="min-h-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Calls</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage and track your call logs.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                    <Plus size={15} />
                    Log Call
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="overflow-x-auto overflow-y-visible rounded-t-2xl rounded-b-2xl">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {["Contact", "Date", "Duration", "Outcome", "Notes", "Logged By"].map((h) => (
                                    <th key={h} className="text-left px-5 py-3 text-[12px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : calls.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                                        No calls logged.
                                    </td>
                                </tr>
                            ) : (
                                calls.map((call) => (
                                    <tr key={call.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                    <Phone size={14} />
                                                </div>
                                                <span className="font-medium text-gray-800">{call.contactName}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                                            {new Date(call.date).toLocaleDateString()} {new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{call.duration}</td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                {call.outcome}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate" title={call.notes}>
                                            {call.notes || "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">
                                            {call.loggedBy}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

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
