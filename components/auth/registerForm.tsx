"use client";

import { registerApi } from "@/lib/api/authApi";
import { createOrganization } from "@/lib/api/organizationsApi";
import { normaliseAuthError } from "@/lib/utils/authError";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect, useRef } from "react";
import FeatureFooter from "./ui/FeatureFooter";
import { AlertCircle, CheckCircle } from "lucide-react";

// ── Roles ─────────────────────────────────────────────────────────────────────

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
    "Technology", "Finance", "Healthcare", "Retail",
    "Manufacturing", "Education", "Consulting", "Other",
];

// ── Password strength ─────────────────────────────────────────────────────────

const PW_MIN_LEN = 8;

interface PwStrength {
    minLen: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
}

function checkPwStrength(pw: string): PwStrength {
    return {
        minLen:   pw.length >= PW_MIN_LEN,
        hasUpper: /[A-Z]/.test(pw),
        hasLower: /[a-z]/.test(pw),
        hasNumber: /[0-9]/.test(pw),
    };
}

function isPwValid(s: PwStrength): boolean {
    return s.minLen && s.hasUpper && s.hasLower && s.hasNumber;
}

// ── Requirement pill ──────────────────────────────────────────────────────────

function Req({ met, label }: { met: boolean; label: string }) {
    return (
        <li
            className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-green-600" : "text-gray-400"}`}
            aria-label={`${label}: ${met ? "met" : "not met"}`}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${met ? "bg-green-500" : "bg-gray-300"}`}
                aria-hidden="true"
            />
            {label}
        </li>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterForm() {
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 fields
    const [name, setName]                   = useState("");
    const [email, setEmail]                 = useState("");
    const [password, setPassword]           = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole]                   = useState(ROLES[0].value);
    const [designation, setDesignation]     = useState("");
    const [showPw, setShowPw]               = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    // Step 1 field-level errors
    const [nameError, setNameError]               = useState("");
    const [emailError, setEmailError]             = useState("");
    const [pwError, setPwError]                   = useState("");
    const [confirmError, setConfirmError]         = useState("");

    // Step 2 fields
    const [companyName, setCompanyName]   = useState("");
    const [companyAbout, setCompanyAbout] = useState("");
    const [businessType, setBusinessType] = useState("Technology");
    const [companyNameError, setCompanyNameError] = useState("");

    // Captured from Step 1 API response
    const [userId, setUserId] = useState("");

    const [apiError, setApiError]   = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess]     = useState(false);

    // Double-submit guards
    const step1Ref = useRef(false);
    const step2Ref = useRef(false);

    const router = useRouter();

    const pwStrength = checkPwStrength(password);

    // ── Restore mid-registration state after refresh ──────────────────────────
    useEffect(() => {
        const savedUserId = localStorage.getItem("zyoris-register-userId");
        const authRaw     = localStorage.getItem("zyoris-auth");

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

    // ── Validation helpers ────────────────────────────────────────────────────

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateStep1Fields(): boolean {
        let valid = true;

        if (!name.trim()) {
            setNameError("Full name is required.");
            valid = false;
        } else {
            setNameError("");
        }

        if (!email.trim()) {
            setEmailError("Email address is required.");
            valid = false;
        } else if (!EMAIL_RE.test(email.trim())) {
            setEmailError("Please enter a valid email address.");
            valid = false;
        } else {
            setEmailError("");
        }

        if (!isPwValid(pwStrength)) {
            setPwError("Password does not meet the requirements below.");
            valid = false;
        } else {
            setPwError("");
        }

        if (!confirmPassword) {
            setConfirmError("Please confirm your password.");
            valid = false;
        } else if (password !== confirmPassword) {
            setConfirmError("Passwords do not match.");
            valid = false;
        } else {
            setConfirmError("");
        }

        return valid;
    }

    // ── Step 1: Register User ─────────────────────────────────────────────────
    const handleStep1 = async (e: FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (!validateStep1Fields()) return;
        if (step1Ref.current || isLoading) return;

        step1Ref.current = true;
        setIsLoading(true);

        try {
            const res = await registerApi({ name: name.trim(), email: email.trim(), password, role, designation });

            if (!res?.user?.id) {
                setApiError("Invalid response from server. Please try again.");
                return;
            }

            // Persist auth tokens — same shape as AuthContext.login()
            localStorage.setItem(
                "zyoris-auth",
                JSON.stringify({ user: res.user, token: res.token, refreshToken: res.refreshToken })
            );
            localStorage.setItem("zyoris-register-userId", res.user.id);

            setUserId(res.user.id);
            setStep(2);
        } catch (err: unknown) {
            const { kind, message } = normaliseAuthError(err);
            if (kind === "conflict") {
                setEmailError(message);
            } else {
                setApiError(message);
            }
        } finally {
            setIsLoading(false);
            step1Ref.current = false;
        }
    };

    // ── Step 2: Create Organization ───────────────────────────────────────────
    const handleStep2 = async (e: FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (!companyName.trim()) {
            setCompanyNameError("Company name is required.");
            return;
        }
        setCompanyNameError("");

        if (!userId) {
            setApiError("Session expired. Please register again.");
            localStorage.removeItem("zyoris-register-userId");
            localStorage.removeItem("zyoris-auth");
            setStep(1);
            return;
        }

        if (step2Ref.current || isLoading) return;
        step2Ref.current = true;
        setIsLoading(true);

        try {
            await createOrganization({ name: companyName.trim(), userId, companyAbout, businessType });

            localStorage.removeItem("zyoris-register-userId");
            setSuccess(true);

            // Registration complete → go to login
            setTimeout(() => router.replace("/login"), 1500);
        } catch (err: unknown) {
            const { message } = normaliseAuthError(err);
            setApiError(message);
        } finally {
            setIsLoading(false);
            step2Ref.current = false;
        }
    };

    const inputClass =
        "w-full px-4 py-3 rounded-lg border border-slate-200 text-[14px] text-slate-800 placeholder-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white";
    const inputErrorClass =
        "w-full px-4 py-3 rounded-lg border border-red-400 text-[14px] text-slate-800 placeholder-slate-300 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white";
    const labelClass  = "block text-[13px] font-semibold text-slate-600 mb-1.5";
    const fieldErrClass = "text-xs text-red-500 mt-1";

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] relative overflow-y-auto">
            {/* Abstract Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-40">
                <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full border-[1px] border-blue-200/50 blur-3xl" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full border-[1px] border-blue-200/50 blur-3xl" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-10">
                <div className="w-full max-w-[700px] bg-white rounded-2xl shadow-2xl shadow-blue-900/10 border border-gray-100 px-4 sm:px-8 md:px-10 py-6 sm:py-9 flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-6">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            aria-label="Go back"
                            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                        <div className="flex items-center gap-2">
                            <img src="/logo.jpeg" alt="Zyoris Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded" />
                            <span className="text-xl sm:text-2xl uppercase text-[#002B7F]" style={{ fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif' }}>zyoris</span>
                        </div>
                    </div>

                    {/* Step label */}
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5" aria-live="polite">
                            {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
                        </p>
                        <h1 className="text-xl sm:text-[26px] font-bold text-[#1a2f6e] mb-1">
                            {step === 1 ? "Create your account" : "Company details"}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400">
                            {step === 1 ? "Set up your personal credentials" : "Tell us about your organization"}
                        </p>
                    </div>

                    {/* Step pills */}
                    <div className="flex items-center gap-2 mb-7" role="list" aria-label="Registration steps">
                        {[1, 2].map((s) => (
                            <div key={s} className="flex items-center gap-2" role="listitem">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                                        step === s ? "bg-blue-700 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                    }`}
                                    aria-current={step === s ? "step" : undefined}
                                >
                                    {step > s ? (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : s}
                                </div>
                                <span className={`text-[13px] font-medium ${step === s ? "text-blue-700" : "text-slate-400"}`}>
                                    {s === 1 ? "Account" : "Company"}
                                </span>
                                {s < 2 && <div className="w-8 sm:w-10 h-px bg-slate-200 ml-1" aria-hidden="true" />}
                            </div>
                        ))}
                    </div>

                    {/* Success banner */}
                    {success && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-600 flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            Organization created! Redirecting to sign in…
                        </div>
                    )}

                    {/* API-level error banner */}
                    {apiError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600 flex items-start gap-2"
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{apiError}</span>
                        </div>
                    )}

                    {/* ── STEP 1 ── */}
                    {step === 1 && (
                        <form onSubmit={handleStep1} noValidate aria-label="Account registration form" className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Full name */}
                                <div>
                                    <label htmlFor="reg-name" className={labelClass}>Full name</label>
                                    <div className="relative">
                                        <input
                                            id="reg-name"
                                            type="text"
                                            required
                                            autoComplete="name"
                                            placeholder="Jane Smith"
                                            value={name}
                                            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
                                            onBlur={() => { if (!name.trim()) setNameError("Full name is required."); }}
                                            aria-invalid={nameError ? "true" : "false"}
                                            aria-describedby={nameError ? "reg-name-error" : undefined}
                                            disabled={isLoading}
                                            className={(nameError ? inputErrorClass : inputClass) + " pr-9"}
                                        />
                                        <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    {nameError && <p id="reg-name-error" role="alert" className={fieldErrClass}>{nameError}</p>}
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="reg-email" className={labelClass}>Email address</label>
                                    <div className="relative">
                                        <input
                                            id="reg-email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            placeholder="you@company.com"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                                            onBlur={() => { if (!email.trim() || !EMAIL_RE.test(email.trim())) setEmailError("Please enter a valid email address."); }}
                                            aria-invalid={emailError ? "true" : "false"}
                                            aria-describedby={emailError ? "reg-email-error" : undefined}
                                            disabled={isLoading}
                                            className={(emailError ? inputErrorClass : inputClass) + " pr-9"}
                                        />
                                        <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    {emailError && <p id="reg-email-error" role="alert" className={fieldErrClass}>{emailError}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Role */}
                                <div>
                                    <label htmlFor="reg-role" className={labelClass}>Role</label>
                                    <div className="relative">
                                        <select
                                            id="reg-role"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            disabled={isLoading}
                                            className={inputClass + " appearance-none cursor-pointer pr-9 truncate"}
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Designation */}
                                <div>
                                    <label htmlFor="reg-designation" className={labelClass}>Designation</label>
                                    <div className="relative">
                                        <input
                                            id="reg-designation"
                                            type="text"
                                            placeholder="e.g. Senior Manager"
                                            value={designation}
                                            onChange={(e) => setDesignation(e.target.value)}
                                            disabled={isLoading}
                                            className={inputClass + " pr-9"}
                                        />
                                        <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zM9 5h6v2H9V5z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Password */}
                                <div>
                                    <label htmlFor="reg-password" className={labelClass}>Password</label>
                                    <div className="relative">
                                        <input
                                            id="reg-password"
                                            type={showPw ? "text" : "password"}
                                            required
                                            autoComplete="new-password"
                                            placeholder="Min. 8 characters"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); if (pwError) setPwError(""); if (confirmError && confirmPassword) setConfirmError(e.target.value !== confirmPassword ? "Passwords do not match." : ""); }}
                                            onBlur={() => { if (!isPwValid(checkPwStrength(password))) setPwError("Password does not meet the requirements below."); }}
                                            aria-invalid={pwError ? "true" : "false"}
                                            aria-describedby={`reg-pw-requirements${pwError ? " reg-pw-error" : ""}`}
                                            disabled={isLoading}
                                            className={(pwError ? inputErrorClass : inputClass) + " pr-10"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw((p) => !p)}
                                            aria-label={showPw ? "Hide password" : "Show password"}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                                        >
                                            <EyeIcon open={showPw} />
                                        </button>
                                    </div>
                                    {pwError && <p id="reg-pw-error" role="alert" className={fieldErrClass}>{pwError}</p>}
                                    {/* Password requirements — visible once user starts typing */}
                                    {password.length > 0 && (
                                        <ul id="reg-pw-requirements" className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1" aria-label="Password requirements">
                                            <Req met={pwStrength.minLen}   label={`${PW_MIN_LEN}+ characters`} />
                                            <Req met={pwStrength.hasUpper} label="Uppercase letter" />
                                            <Req met={pwStrength.hasLower} label="Lowercase letter" />
                                            <Req met={pwStrength.hasNumber} label="Number" />
                                        </ul>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label htmlFor="reg-confirm-pw" className={labelClass}>Confirm password</label>
                                    <div className="relative">
                                        <input
                                            id="reg-confirm-pw"
                                            type={showConfirmPw ? "text" : "password"}
                                            required
                                            autoComplete="new-password"
                                            placeholder="Re-enter password"
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); if (confirmError) setConfirmError(password !== e.target.value ? "Passwords do not match." : ""); }}
                                            onBlur={() => { if (confirmPassword && password !== confirmPassword) setConfirmError("Passwords do not match."); }}
                                            aria-invalid={confirmError ? "true" : "false"}
                                            aria-describedby={confirmError ? "reg-confirm-error" : undefined}
                                            disabled={isLoading}
                                            className={(confirmError ? inputErrorClass : inputClass) + " pr-10"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPw((p) => !p)}
                                            aria-label={showConfirmPw ? "Hide confirm password" : "Show confirm password"}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                                        >
                                            <EyeIcon open={showConfirmPw} />
                                        </button>
                                    </div>
                                    {confirmError && <p id="reg-confirm-error" role="alert" className={fieldErrClass}>{confirmError}</p>}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                aria-busy={isLoading}
                                aria-label={isLoading ? "Registering, please wait" : "Register"}
                                className="w-full py-3.5 bg-[#0B1D51] hover:bg-[#0a1840] disabled:opacity-55 disabled:cursor-not-allowed rounded-lg text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                                        Registering…
                                    </>
                                ) : "Register"}
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2 ── */}
                    {step === 2 && (
                        <form onSubmit={handleStep2} noValidate aria-label="Company registration form" className="space-y-4">
                            <div>
                                <label htmlFor="reg-company-name" className={labelClass}>Company name</label>
                                <input
                                    id="reg-company-name"
                                    type="text"
                                    required
                                    placeholder="Acme Corp"
                                    value={companyName}
                                    onChange={(e) => { setCompanyName(e.target.value); if (companyNameError) setCompanyNameError(""); }}
                                    onBlur={() => { if (!companyName.trim()) setCompanyNameError("Company name is required."); }}
                                    aria-invalid={companyNameError ? "true" : "false"}
                                    aria-describedby={companyNameError ? "reg-company-name-error" : undefined}
                                    disabled={isLoading}
                                    className={companyNameError ? inputErrorClass : inputClass}
                                />
                                {companyNameError && <p id="reg-company-name-error" role="alert" className={fieldErrClass}>{companyNameError}</p>}
                            </div>

                            <div>
                                <label htmlFor="reg-business-type" className={labelClass}>Business type</label>
                                <div className="relative">
                                    <select
                                        id="reg-business-type"
                                        value={businessType}
                                        onChange={(e) => setBusinessType(e.target.value)}
                                        disabled={isLoading}
                                        className={inputClass + " appearance-none cursor-pointer pr-9"}
                                    >
                                        {BUSINESS_TYPES.map((b) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="reg-company-about" className={labelClass}>About the company</label>
                                <textarea
                                    id="reg-company-about"
                                    rows={4}
                                    placeholder="Brief description of what your company does…"
                                    value={companyAbout}
                                    onChange={(e) => setCompanyAbout(e.target.value)}
                                    disabled={isLoading}
                                    className={inputClass + " resize-none"}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || success}
                                aria-busy={isLoading}
                                aria-label={isLoading ? "Creating organization, please wait" : "Continue"}
                                className="w-full py-3.5 bg-[#0B1D51] hover:bg-[#0a1840] disabled:opacity-55 disabled:cursor-not-allowed rounded-lg text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
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

// ── Eye icon helper ────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );
}
