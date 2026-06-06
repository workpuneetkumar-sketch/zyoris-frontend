// components/leads/LeadForm.tsx
"use client";

import { useState } from "react";

export const SOURCE_OPTIONS = [
    "Website",
    "Referral",
    "Cold Outreach",
    "LinkedIn",
    "Event",
    "Other",
] as const;

export const STATUS_OPTIONS = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "CLOSED",
] as const;

export interface LeadFormValues {
    name: string;
    email: string;
    phone: string;
    company: string;
    city: string;
    source: string;
    status: string;
    assignedToId: string;
    tags: string[];
    note: string;
}

interface LeadFormProps {
    form: LeadFormValues;
    setForm: React.Dispatch<React.SetStateAction<LeadFormValues>>;
    errors?: {
        name?: string;
        email?: string;
    };
}

export default function LeadForm({
    form,
    setForm,
    errors = {},
}: LeadFormProps) {
    const [tagInput, setTagInput] = useState("");

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleTagKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();

            const val = tagInput.replace(",", "").trim();

            if (val && !form.tags.includes(val)) {
                setForm((prev) => ({
                    ...prev,
                    tags: [...prev.tags, val],
                }));
            }

            setTagInput("");
        }

        if (
            e.key === "Backspace" &&
            tagInput === "" &&
            form.tags.length
        ) {
            setForm((prev) => ({
                ...prev,
                tags: prev.tags.slice(0, -1),
            }));
        }
    };

    const removeTag = (index: number) => {
        setForm((prev) => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="space-y-6">

            {/* Basic Info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">
                    Basic Information
                </h2>

                <div className="grid grid-cols-2 gap-4">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name *
                        </label>

                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="John Smith"
                            className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none
                            ${errors.name
                                    ? "border-red-400"
                                    : "border-gray-300 focus:border-blue-500"
                                }`}
                        />

                        {errors.name && (
                            <p className="text-xs text-red-500 mt-1">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                        </label>

                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="user@example.com"
                            className={`w-full h-10 rounded-lg border px-3 text-sm text-gray-900 outline-none
                            ${errors.email
                                    ? "border-red-400"
                                    : "border-gray-300 focus:border-blue-500"
                                }`}
                        />

                        {errors.email && (
                            <p className="text-xs text-red-500 mt-1">
                                {errors.email}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                        </label>

                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+91 99999 99999"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company
                        </label>

                        <input
                            type="text"
                            name="company"
                            value={form.company}
                            onChange={handleChange}
                            placeholder="Acme Corp"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                        </label>

                        <input
                            type="text"
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            placeholder="Mumbai"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Source
                        </label>

                        <select
                            name="source"
                            value={form.source}
                            onChange={handleChange}
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                        >
                            <option value="">Select Source</option>

                            {SOURCE_OPTIONS.map((source) => (
                                <option key={source} value={source}>
                                    {source}
                                </option>
                            ))}
                        </select>
                    </div>

                </div>
            </div>

            {/* Lead Details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">
                    Lead Details
                </h2>

                <div className="grid grid-cols-2 gap-4">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>

                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                        >
                            <option value="">Select Status</option>

                            {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assigned To
                        </label>

                        <input
                            type="text"
                            name="assignedToId"
                            value={form.assignedToId}
                            onChange={handleChange}
                            placeholder="User ID"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tags
                        </label>

                        <div className="flex flex-wrap gap-2 min-h-[42px] border border-gray-300 rounded-lg px-3 py-2">

                            {form.tags.map((tag: any, index) => (
                                <span
                                    key={tag.id || index}
                                    className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
                                >
                                    {typeof tag === "string" ? tag : tag.label}

                                    <button
                                        type="button"
                                        onClick={() => removeTag(index)}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}

                            <input
                                value={tagInput}
                                onChange={(e) =>
                                    setTagInput(e.target.value)
                                }
                                onKeyDown={handleTagKeyDown}
                                placeholder={
                                    form.tags.length === 0
                                        ? "Press Enter to add tags"
                                        : ""
                                }
                                className="flex-1 min-w-[120px] outline-none text-sm text-gray-900"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">
                    Notes
                </h2>

                <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="Additional notes..."
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none resize-none focus:border-blue-500"
                />
            </div>

        </div>
    );
}