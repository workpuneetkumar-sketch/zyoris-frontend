"use client";

import { useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "../../lib/api/leadsApi";

const SOURCE_OPTIONS = ["Website", "Referral", "Cold Outreach", "LinkedIn", "Event", "Other"] as const;
const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"] as const;

interface LeadForm {
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

interface FormErrors {
    name?: string;
    email?: string;
}

export default function NewLeadPage() {
    const router = useRouter();

    const [form, setForm] = useState<LeadForm>({
        name: "",
        email: "",
        phone: "",
        company: "",
        city: "",
        source: "",
        status: "",
        assignedToId: "",
        tags: [],
        note: "",
    });

    const [tagInput, setTagInput] = useState<string>("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);  // ← new

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ): void => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = tagInput.replace(",", "").trim();
            if (val && !form.tags.includes(val)) {
                setForm((prev) => ({ ...prev, tags: [...prev.tags, val] }));
            }
            setTagInput("");
        } else if (e.key === "Backspace" && tagInput === "" && form.tags.length) {
            setForm((prev) => ({ ...prev, tags: prev.tags.slice(0, -1) }));
        }
    };

    const removeTag = (index: number): void => {
        setForm((prev) => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));
    };

    // ← updated handleSubmit
    const handleSubmit = async (): Promise<void> => {
        const newErrors: FormErrors = {};
        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.email.trim()) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            newErrors.email = "Enter a valid email";

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }

        try {
            setLoading(true);
            await createLead({
                ...form,
                assignedToId: form.assignedToId.trim() || null, // ← "" → null
            });
            router.push("/leads");
        } catch (err) {
            console.error("Failed to create lead:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const styles: Record<string, CSSProperties> = {
        page: { padding: "1.5rem", background: "#f5f5f5", minHeight: "100vh" },
        header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" },
        breadcrumb: { display: "flex", alignItems: "center", gap: "8px" },
        backBtn: { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: "6px 0" },
        pageTitle: { fontSize: "20px", fontWeight: 500, color: "#111827" },
        card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" },
        sectionTitle: { fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", paddingBottom: "8px", borderBottom: "1px solid #f3f4f6" },
        formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
        formGroup: { display: "flex", flexDirection: "column", gap: "5px" },
        label: { fontSize: "13px", fontWeight: 500, color: "#374151" },
        req: { color: "#ef4444", marginLeft: "2px" },
        input: { fontSize: "14px", color: "#111827", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 12px", width: "100%", outline: "none" },
        inputError: { border: "1px solid #ef4444" },
        select: { fontSize: "14px", color: "#111827", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 12px", width: "100%", outline: "none" },
        textarea: { fontSize: "14px", color: "#111827", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 12px", width: "100%", outline: "none", resize: "vertical", minHeight: "80px" },
        tagContainer: { display: "flex", flexWrap: "wrap", gap: "6px", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "8px", minHeight: "38px", cursor: "text", background: "#fff" },
        tag: { display: "flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", padding: "3px 8px", borderRadius: "999px" },
        tagRemove: { background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: 0 },
        tagInput: { border: "none", outline: "none", fontSize: "13px", background: "transparent", color: "#111827", flex: 1, minWidth: "80px", padding: "2px 0" },
        hint: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
        errorText: { fontSize: "11px", color: "#ef4444", marginTop: "2px" },
        footerActions: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "1.5rem" },
        btnPrimary: { background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "14px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" },
        btnSecondary: { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 18px", fontSize: "14px", cursor: "pointer" },
    };

    return (
        <div style={styles.page}>

            <div style={styles.header}>
                <div style={styles.breadcrumb}>
                    <button style={styles.backBtn} onClick={() => router.push("/leads")}>
                        ← Leads
                    </button>
                    <span style={{ color: "#d1d5db" }}>/</span>
                    <span style={styles.pageTitle}>New Lead</span>
                </div>
            </div>

            {/* Basic Info */}
            <div style={styles.card}>
                <div style={styles.sectionTitle}>Basic information</div>
                <div style={styles.formGrid}>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Full name <span style={styles.req}>*</span></label>
                        <input
                            style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                            type="text" name="name" placeholder="e.g. John Smith"
                            value={form.name} onChange={handleChange}
                        />
                        {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email address <span style={styles.req}>*</span></label>
                        <input
                            style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
                            type="email" name="email" placeholder="user@example.com"
                            value={form.email} onChange={handleChange}
                        />
                        {errors.email && <span style={styles.errorText}>{errors.email}</span>}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Phone</label>
                        <input style={styles.input} type="tel" name="phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={handleChange} />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Company</label>
                        <input style={styles.input} type="text" name="company" placeholder="e.g. Acme Corp" value={form.company} onChange={handleChange} />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>City</label>
                        <input style={styles.input} type="text" name="city" placeholder="e.g. San Francisco" value={form.city} onChange={handleChange} />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Source</label>
                        <select style={styles.select} name="source" value={form.source} onChange={handleChange}>
                            <option value="">Select source</option>
                            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                </div>
            </div>

            {/* Lead Details */}
            <div style={styles.card}>
                <div style={styles.sectionTitle}>Lead details</div>
                <div style={styles.formGrid}>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Status</label>
                        <select style={styles.select} name="status" value={form.status} onChange={handleChange}>
                            <option value="">Select status</option>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Assigned to{" "}
                            <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
                        </label>
                        <input
                            style={styles.input}
                            type="text"
                            name="assignedToId"
                            placeholder="Enter user ID"
                            value={form.assignedToId}
                            onChange={handleChange}
                        />
                        <span style={styles.hint}>Leave blank to assign later</span>
                    </div>

                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                        <label style={styles.label}>Tags</label>
                        <div style={styles.tagContainer} onClick={() => document.getElementById("tagInput")?.focus()}>
                            {form.tags.map((tag, i) => (
                                <span key={i} style={styles.tag}>
                                    {tag}
                                    <button style={styles.tagRemove} onClick={() => removeTag(i)} aria-label={`Remove tag ${tag}`}>×</button>
                                </span>
                            ))}
                            <input
                                id="tagInput"
                                style={styles.tagInput}
                                placeholder={form.tags.length === 0 ? "Type and press Enter to add tags…" : ""}
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                            />
                        </div>
                        <span style={styles.hint}>Press Enter or comma to add a tag</span>
                    </div>

                </div>
            </div>

            {/* Note */}
            <div style={styles.card}>
                <div style={styles.sectionTitle}>Note</div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Add a note</label>
                    <textarea style={styles.textarea} name="note" placeholder="Add any additional context or notes about this lead…" value={form.note} onChange={handleChange} />
                </div>
            </div>

            {/* Footer */}
            <div style={styles.footerActions}>
                <button style={styles.btnSecondary} onClick={() => router.push("/leads")} disabled={loading}>
                    Cancel
                </button>
                <button
                    style={{
                        ...styles.btnPrimary,
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? "Creating..." : " Create Lead"}
                </button>
            </div>

        </div>
    );
}