"use client";

import { useState, FormEvent } from "react";

const ROLES = [
    { value: "ADMIN", label: "Admin" },
    { value: "CEO", label: "CEO" },
    { value: "CFO", label: "CFO" },
    { value: "SALES_HEAD", label: "Sales Head" },
    { value: "OPERATIONS_HEAD", label: "Operations Head" },
];

const BUSINESS_TYPES = [
    "Technology",
    "Finance",
    "Healthcare",
    "Retail",
    "Manufacturing",
    "Education",
    "Consulting",
    "Other",
];

type Props = {
    onSubmit: (data: {
        name: string;
        email: string;
        password: string;
        role: string;
        organizationId: string;
        designation: string;
        companyName: string;
        companyAbout: string;
        businessType: string;
    }) => Promise<void>;
    isLoading: boolean;
    error?: string | null;
    success?: boolean;
};

export default function RegisterForm({ onSubmit, isLoading, error, success }: Props) {
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState("ADMIN");
    const [designation, setDesignation] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    // Step 2 fields
    const [organizationId, setOrganizationId] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [companyAbout, setCompanyAbout] = useState("");
    const [businessType, setBusinessType] = useState("Technology");

    const [localError, setLocalError] = useState<string | null>(null);

    const handleStep1 = (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        if (password.length < 8) {
            setLocalError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }
        setStep(2);
    };

    const handleStep2 = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        await onSubmit({
            name, email, password, role,
            organizationId, designation,
            companyName, companyAbout, businessType,
        });
    };

    const displayError = localError || error;

    const inputClass =
        "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-[13.5px] text-slate-800 placeholder-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white";

    const labelClass = "block text-[12.5px] font-semibold text-slate-600 mb-1.5";

    return (
        <div className="min-h-screen flex flex-col bg-[#1a2f6e] relative">

            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-400/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-blue-600/5" />
            </div>

            {/* Center Card */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-[920px] flex rounded-2xl overflow-hidden shadow-2xl shadow-black/50">

                    {/* ── LEFT: Form Panel ── */}
                    <div className="flex-1 bg-white px-9 py-9 flex flex-col justify-center min-w-0">

                        {/* Header */}
                        <div className="mb-6">
                            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
                                {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
                            </p>
                            <h1 className="text-[21px] font-bold text-[#1a2f6e] mb-1">
                                {step === 1 ? "Create your account" : "Company details"}
                            </h1>
                            <p className="text-[12.5px] text-slate-400">
                                {step === 1
                                    ? "Set up your personal credentials"
                                    : "Tell us about your organization"}
                            </p>
                        </div>

                        {/* Step pills */}
                        <div className="flex items-center gap-2 mb-6">
                            {[1, 2].map((s) => (
                                <div key={s} className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step === s
                                            ? "bg-blue-700 text-white"
                                            : step > s
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-100 text-slate-400"
                                        }`}>
                                        {step > s ? (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : s}
                                    </div>
                                    <span className={`text-[11px] font-medium ${step === s ? "text-blue-700" : "text-slate-400"}`}>
                                        {s === 1 ? "Account" : "Company"}
                                    </span>
                                    {s < 2 && <div className="w-8 h-px bg-slate-200 ml-1" />}
                                </div>
                            ))}
                        </div>

                        {/* Success banner */}
                        {success && (
                            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-600 flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Account created! Redirecting to login…
                            </div>
                        )}

                        {/* Error banner */}
                        {displayError && (
                            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-500">
                                {displayError}
                            </div>
                        )}

                        {/* ── STEP 1 ── */}
                        {step === 1 && (
                            <form onSubmit={handleStep1} className="space-y-3.5">
                                <div className="grid grid-cols-2 gap-3.5">
                                    {/* Full Name */}
                                    <div>
                                        <label className={labelClass}>Full name</label>
                                        <input
                                            type="text" required placeholder="Jane Smith"
                                            value={name} onChange={(e) => setName(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    {/* Email */}
                                    <div>
                                        <label className={labelClass}>Email address</label>
                                        <input
                                            type="email" required autoComplete="email"
                                            placeholder="you@company.com"
                                            value={email} onChange={(e) => setEmail(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    {/* Role */}
                                    <div>
                                        <label className={labelClass}>Role</label>
                                        <div className="relative">
                                            <select
                                                value={role} onChange={(e) => setRole(e.target.value)}
                                                className={inputClass + " appearance-none cursor-pointer pr-9"}
                                            >
                                                {ROLES.map((r) => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Designation */}
                                    <div>
                                        <label className={labelClass}>Designation</label>
                                        <input
                                            type="text" placeholder="e.g. Senior Manager"
                                            value={designation} onChange={(e) => setDesignation(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    {/* Password */}
                                    <div>
                                        <label className={labelClass}>Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPw ? "text" : "password"} required minLength={8}
                                                placeholder="Min. 8 characters"
                                                value={password} onChange={(e) => setPassword(e.target.value)}
                                                className={inputClass + " pr-10"}
                                            />
                                            <button type="button" onClick={() => setShowPw((p) => !p)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                <EyeIcon open={showPw} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Confirm Password */}
                                    <div>
                                        <label className={labelClass}>Confirm password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPw ? "text" : "password"} required
                                                placeholder="Re-enter password"
                                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={inputClass + " pr-10"}
                                            />
                                            <button type="button" onClick={() => setShowConfirmPw((p) => !p)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                <EyeIcon open={showConfirmPw} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit"
                                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 transition-colors mt-1">
                                    Continue
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </form>
                        )}

                        {/* ── STEP 2 ── */}
                        {step === 2 && (
                            <form onSubmit={handleStep2} className="space-y-3.5">
                                <div className="grid grid-cols-2 gap-3.5">
                                    {/* Company Name */}
                                    <div>
                                        <label className={labelClass}>Company name</label>
                                        <input
                                            type="text" required placeholder="Acme Corp"
                                            value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    {/* Organization ID */}
                                    <div>
                                        <label className={labelClass}>Organization ID</label>
                                        <input
                                            type="text" placeholder="e.g. ORG-00123"
                                            value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {/* Business Type */}
                                <div>
                                    <label className={labelClass}>Business type</label>
                                    <div className="relative">
                                        <select
                                            value={businessType} onChange={(e) => setBusinessType(e.target.value)}
                                            className={inputClass + " appearance-none cursor-pointer pr-9"}
                                        >
                                            {BUSINESS_TYPES.map((b) => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Company About */}
                                <div>
                                    <label className={labelClass}>About the company</label>
                                    <textarea
                                        rows={3} placeholder="Brief description of what your company does…"
                                        value={companyAbout} onChange={(e) => setCompanyAbout(e.target.value)}
                                        className={inputClass + " resize-none"}
                                    />
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => { setStep(1); setLocalError(null); }}
                                        className="flex-1 py-2.5 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 text-[13.5px] font-semibold flex items-center justify-center gap-2 transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back
                                    </button>
                                    <button type="submit" disabled={isLoading || success}
                                        className="flex-[2] py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-55 disabled:cursor-not-allowed rounded-lg text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 transition-colors">
                                        {isLoading ? (
                                            <>
                                                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                Creating account…
                                            </>
                                        ) : "Create account"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Sign in link */}
                        <p className="text-center text-[12.5px] text-slate-400 mt-5">
                            Already have an account?{" "}
                            <a href="/login" className="text-blue-600 font-semibold hover:underline">
                                Sign in
                            </a>
                        </p>
                    </div>

                    {/* ── RIGHT: Brand Panel ── */}
                    <div className="hidden md:flex w-[320px] bg-[#1a2f6e] flex-col items-center justify-end pb-10 px-8 shrink-0 relative overflow-hidden">

                        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/10 pointer-events-none" />
                        <div className="absolute top-1/4 -left-10 w-32 h-32 rounded-full bg-blue-400/10 pointer-events-none" />
                        <div className="absolute bottom-4 right-4 w-40 h-40 rounded-full bg-[#0f1f55]/60 pointer-events-none" />

                        {/* Top logo */}
                        <div className="relative z-10 self-start mt-10 mb-auto flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" />
                                    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                                    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                                    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.3" />
                                </svg>
                            </div>
                            <span className="text-white font-bold text-[15px] tracking-tight">zyoris</span>
                        </div>

                        <div className="relative z-10 w-full bg-white/10 border border-white/15 rounded-2xl p-6 mb-8">
                            <p className="text-blue-200 text-[12px] font-medium mb-1.5">Welcome to</p>
                            <h2 className="text-white text-[18px] font-bold leading-snug mb-3">
                                Your Smart Dashboard Platform.
                            </h2>
                            <p className="text-blue-200/70 text-[12px] leading-relaxed">
                                Track performance, manage teams, and generate real-time insights — all in one place.
                            </p>

                            <div className="mt-5 space-y-3 pt-4 border-t border-white/10">
                                {[
                                    { icon: "✦", text: "Role-based access control" },
                                    { icon: "✦", text: "Real-time analytics" },
                                    { icon: "✦", text: "Team collaboration tools" },
                                ].map(({ icon, text }) => (
                                    <div key={text} className="flex items-center gap-2.5">
                                        <span className="text-blue-400 text-[10px]">{icon}</span>
                                        <p className="text-blue-200/70 text-[11.5px]">{text}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
                                {[["12.5k", "Users"], ["98%", "Uptime"], ["4.9★", "Rating"]].map(([val, lbl]) => (
                                    <div key={lbl} className="text-center">
                                        <p className="text-white text-[13px] font-bold">{val}</p>
                                        <p className="text-blue-300/60 text-[10px] mt-0.5">{lbl}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative z-10 flex gap-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${step === 1 ? "w-5 bg-white" : "w-1.5 bg-white/30"}`} />
                            <div className={`h-1.5 rounded-full transition-all ${step === 2 ? "w-5 bg-white" : "w-1.5 bg-white/30"}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 py-4 text-center">
                <p className="text-[12px] text-blue-200/40">
                    Copyright © {new Date().getFullYear()}{" "}
                    <a href="#" className="text-blue-300/60 hover:text-blue-200 transition-colors">zyoris</a>
                    . All Rights Reserved.
                </p>
            </div>
        </div>
    );
}

function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );
}