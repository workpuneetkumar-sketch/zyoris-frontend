"use client";

import { registerApi } from "@/lib/api/authApi";
import { createOrganization } from "@/lib/api/organizationsApi";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import FeatureFooter from "./ui/FeatureFooter";

const ROLES = [
    { value: "ADMIN",                   label: "Administrator" },
    { value: "CEO",                     label: "CEO – Chief Executive Officer" },
    { value: "CFO",                     label: "CFO – Chief Financial Officer" },
    { value: "CLIENT_SUCCESS_MANAGER",  label: "Client Success Manager" },
    { value: "FINANCE_EXECUTIVE",       label: "Finance Executive" },
    { value: "FINANCE_MANAGER",         label: "Finance Manager" },
    { value: "HR_EXECUTIVE",            label: "HR Executive" },
    { value: "HR_MANAGER",              label: "HR Manager" },
    { value: "MANAGER",                 label: "Manager" },
    { value: "MARKETING_EXECUTIVE",     label: "Marketing Executive" },
    { value: "MARKETING_MANAGER",       label: "Marketing Manager" },
    { value: "OPERATIONS_HEAD",         label: "Operations Head" },
    { value: "PROJECT_MANAGER",         label: "Project Manager" },
    { value: "SALES_EXECUTIVE",         label: "Sales Executive" },
    { value: "SALES_HEAD",              label: "Sales Head" },
    { value: "SALES_USER",              label: "Sales User" },
    { value: "SUPPORT_EXECUTIVE",       label: "Support Executive" },
    { value: "USER",                    label: "Regular User" },
    { value: "VIEWER",                  label: "Viewer – Read Only" },
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

export default function RegisterForm() {
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState(ROLES[0].value);
    const [designation, setDesignation] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    // Step 2 fields
    const [companyName, setCompanyName] = useState("");
    const [companyAbout, setCompanyAbout] = useState("");
    const [businessType, setBusinessType] = useState("Technology");

    // Captured from Step 1 API response
    const [userId, setUserId] = useState("");

    const [localError, setLocalError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const router = useRouter();

    // ── Restore mid-registration state after refresh
    // Only resume Step 2 if BOTH the onboarded userId and a valid auth token exist.
    // This prevents stale/abandoned state from skipping Step 1 for new users.
    useEffect(() => {
        const savedUserId = localStorage.getItem("zyoris-register-userId");
        const authRaw = localStorage.getItem("zyoris-auth");

        if (savedUserId && authRaw) {
            try {
                const auth = JSON.parse(authRaw);
                if (auth?.token && auth?.user?.id === savedUserId) {
                    setUserId(savedUserId);
                    setStep(2);
                    return;
                }
            } catch {
                // Malformed auth — fall through to Step 1
            }
        }

        localStorage.removeItem("zyoris-register-userId");
        setStep(1);
    }, []);

    // ── Step 1: Register User
    const handleStep1 = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setError(null);

        if (password.length < 8) {
            setLocalError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }

        try {
            setIsLoading(true);

            const res = await registerApi({ name, email, password, role, designation });

            if (!res?.user?.id) {
                setError("Invalid response from server.");
                return;
            }

            // Persist auth
            localStorage.setItem(
                "zyoris-auth",
                JSON.stringify({
                    user: res.user,
                    token: res.token,
                    refreshToken: res.refreshToken,
                })
            );

            localStorage.setItem("zyoris-register-userId", res.user.id);

            setUserId(res.user.id);
            setStep(2);
        } catch (err: any) {
            setError(
                err?.response?.data?.error ??
                err?.response?.data?.message ??
                "Registration failed."
            );
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 2: Create Organization
    const handleStep2 = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setError(null);

        if (!userId) {
            setLocalError("Session expired. Please register again.");
            // Clear stale state and restart
            localStorage.removeItem("zyoris-register-userId");
            localStorage.removeItem("zyoris-auth");
            setStep(1);
            return;
        }

        setIsLoading(true);

        try {
            await createOrganization({ name: companyName, userId, companyAbout, businessType });

            localStorage.removeItem("zyoris-register-userId");
            setSuccess(true);

            // Registration complete → go to login; login itself will redirect to dashboard
            setTimeout(() => router.replace("/login"), 1500);
        } catch (err: any) {
            setError(
                err?.response?.data?.error ??
                err?.response?.data?.message ??
                "Failed to create organization. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const displayError = localError || error;

    const inputClass =
        "w-full px-4 py-3 rounded-lg border border-slate-200 text-[14px] text-slate-800 placeholder-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white";

    const labelClass = "block text-[13px] font-semibold text-slate-600 mb-1.5";

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] relative overflow-y-auto">
            {/* Abstract Background Waves — same as login page */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-40">
                <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full border-[1px] border-blue-200/50 blur-3xl"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full border-[1px] border-blue-200/50 blur-3xl"></div>
            </div>

            {/* Center Card */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-10">
                <div className="w-full max-w-[700px] bg-white rounded-2xl shadow-2xl shadow-blue-900/10 border border-gray-100 px-6 sm:px-10 py-7 sm:py-9 flex flex-col">

                    {/* Header row: Back — Logo */}
                    <div className="grid grid-cols-3 items-center mb-6">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium justify-self-start"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                        <div className="col-start-2 justify-self-center flex items-center gap-2">
                            <img src="/logo.jpeg" alt="Zyoris Logo" className="w-8 h-8 object-contain rounded" />
                            <span className="text-2xl uppercase text-[#002B7F]" style={{ fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif' }}>zyoris</span>
                        </div>
                    </div>

                    {/* Step label + Title */}
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
                            {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
                        </p>
                        <h1 className="text-[26px] font-bold text-[#1a2f6e] mb-1">
                            {step === 1 ? "Create your account" : "Company details"}
                        </h1>
                        <p className="text-sm text-slate-400">
                            {step === 1
                                ? "Set up your personal credentials"
                                : "Tell us about your organization"}
                        </p>
                    </div>

                    {/* Step pills */}
                    <div className="flex items-center gap-2 mb-7">
                        {[1, 2].map((s) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${step === s
                                    ? "bg-blue-700 text-white"
                                    : step > s
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-100 text-slate-400"
                                    }`}>
                                    {step > s ? (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : s}
                                </div>
                                <span className={`text-[13px] font-medium ${step === s ? "text-blue-700" : "text-slate-400"}`}>
                                    {s === 1 ? "Account" : "Company"}
                                </span>
                                {s < 2 && <div className="w-10 h-px bg-slate-200 ml-1" />}
                            </div>
                        ))}
                    </div>

                    {/* Success banner */}
                    {success && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-600 flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Organization created! Redirecting to login…
                        </div>
                    )}

                    {displayError && (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-500">
                            {displayError}
                        </div>
                    )}

                    {/* ── STEP 1 ── */}
                    {step === 1 && (
                        <form onSubmit={handleStep1} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Full name</label>
                                    <div className="relative">
                                        <input
                                            type="text" required placeholder="Jane Smith"
                                            value={name} onChange={(e) => setName(e.target.value)}
                                            className={inputClass + " pr-9"}
                                        />
                                        <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Email address</label>
                                    <div className="relative">
                                        <input
                                            type="email" required autoComplete="email"
                                            placeholder="you@company.com"
                                            value={email} onChange={(e) => setEmail(e.target.value)}
                                            className={inputClass + " pr-9"}
                                        />
                                        <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <label className={labelClass}>Designation</label>
                                    <div className="relative">
                                        <input
                                            type="text" placeholder="e.g. Senior Manager"
                                            value={designation} onChange={(e) => setDesignation(e.target.value)}
                                            className={inputClass + " pr-9"}
                                        />
                                        <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zM9 5h6v2H9V5z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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

                            <button type="submit" disabled={isLoading}
                                className="w-full py-3.5 bg-[#0B1D51] hover:bg-[#0a1840] disabled:opacity-55 disabled:cursor-not-allowed rounded-lg text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors">
                                {isLoading ? (
                                    <>
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Registering…
                                    </>
                                ) : "Register"}
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2 ── */}
                    {step === 2 && (
                        <form onSubmit={handleStep2} className="space-y-4">
                            <div>
                                <label className={labelClass}>Company name</label>
                                <input
                                    type="text" required placeholder="Acme Corp"
                                    value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

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

                            <div>
                                <label className={labelClass}>About the company</label>
                                <textarea
                                    rows={4} placeholder="Brief description of what your company does…"
                                    value={companyAbout} onChange={(e) => setCompanyAbout(e.target.value)}
                                    className={inputClass + " resize-none"}
                                />
                            </div>

                            <button type="submit" disabled={isLoading || success}
                                className="w-full py-3.5 bg-[#0B1D51] hover:bg-[#0a1840] disabled:opacity-55 disabled:cursor-not-allowed rounded-lg text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors">
                                {isLoading ? (
                                    <>
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Creating organization…
                                    </>
                                ) : "Continue"}
                            </button>
                        </form>
                    )}

                    <p className="text-center text-sm text-slate-400 mt-6">
                        Already have an account?{" "}
                        <a href="/login" className="text-blue-600 font-semibold hover:underline">
                            Sign in
                        </a>
                    </p>
                </div>

                {/* Footer */}
                <div className="w-full max-w-5xl mx-auto">
                    <FeatureFooter />
                    <p className="text-center text-xs text-slate-400 pb-2">
                        Copyright © {new Date().getFullYear()} <span className="font-semibold text-slate-500">ZYORIS</span>. All rights reserved.
                    </p>
                </div>
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