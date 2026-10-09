"use client";

import { useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { getDashboardForRole } from "@/utils/roleRedirect";

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_RE.test(value.trim())) return "Please enter a valid email address.";
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required.";
  return "";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Field-level validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  // Auth / server error shown in the banner above the form
  const [formError, setFormError] = useState<string | null>(null);

  // Duplicate-submission guard
  const submittingRef = useRef(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    // Duplicate-submit guard
    if (submittingRef.current || isLoading) return;
    submittingRef.current = true;

    setIsLoading(true);
    setFormError(null);

    try {
      const res = await login(email.trim(), password) as any;

      const role = res.user.role;
      if (!res.user.organizationId && (role === "CEO" || role === "CFO")) {
        localStorage.setItem("zyoris-register-userId", res.user.id);
        router.push("/register");
      } else if (!res.user.organizationId) {
        setFormError("No organization assigned. Please contact your administrator.");
      } else {
        router.push(getDashboardForRole(res.user.role));
      }
    } catch (err: any) {
      // AuthContext.login() already called getAuthErrorMessage internally and
      // set context.error. We mirror it into local formError for the inline banner.
      if (!err?.response) {
        setFormError("Login unavailable. Please check your connection and try again later.");
      } else {
        // Use the sanitised message already produced by AuthContext
        setFormError(
          err?.response?.status === 401
            ? "Invalid email or password. Please try again."
            : err?.response?.status === 404
              ? "No account found with that email. Please sign up first."
              : err?.response?.status >= 500
                ? "Something went wrong on our end. Please try again shortly."
                : "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
    }
  };

  const busy = isLoading;

  return (
    <div className="min-h-screen flex flex-col bg-[#1a2f6e] relative">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-400/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-blue-600/5" />
      </div>

      {/* ── Center Card ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[860px] flex rounded-2xl overflow-hidden shadow-2xl shadow-black/50">

          {/* ── LEFT: Form Panel ── */}
          <div className="flex-1 bg-white px-10 py-10 flex flex-col justify-center min-w-0">

            {/* Header */}
            <div className="mb-7">
              <h1 className="text-[22px] font-bold text-[#1a2f6e] mb-1">Log In</h1>
              <p className="text-[13px] text-slate-400">Sign in to continue to Zyoris</p>
            </div>

            {/* Auth / server error banner */}
            {formError && (
              <div
                id="login-form-error"
                role="alert"
                aria-live="assertive"
                className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-500"
              >
                {formError}
              </div>
            )}

            <form
              noValidate
              onSubmit={handleSubmit}
              className="space-y-4"
              aria-label="Sign-in form"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="legacy-email"
                  className="block text-[13px] font-semibold text-slate-600 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="legacy-email"
                  type="email"
                  autoComplete="username email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(validateEmail(e.target.value));
                  }}
                  onBlur={() => setEmailError(validateEmail(email))}
                  aria-invalid={emailError ? "true" : "false"}
                  aria-describedby={emailError ? "legacy-email-error" : undefined}
                  disabled={busy}
                  className={[
                    "w-full px-4 py-2.5 rounded-lg border text-[14px] text-slate-800 placeholder-slate-300 outline-none transition-all",
                    emailError
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                  ].join(" ")}
                />
                {emailError && (
                  <p id="legacy-email-error" role="alert" className="mt-1 text-[11px] text-red-500">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="legacy-password"
                    className="text-[13px] font-semibold text-slate-600"
                  >
                    Password
                  </label>
                  {/* Forgot password — pending BD2 */}
                  <span
                    className="text-[12px] text-slate-400 cursor-default select-none"
                    title="Password reset is not yet available."
                    aria-label="Forgot password — not yet available"
                  >
                    Forgot password?
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="legacy-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(validatePassword(e.target.value));
                    }}
                    onBlur={() => setPasswordError(validatePassword(password))}
                    aria-invalid={passwordError ? "true" : "false"}
                    aria-describedby={passwordError ? "legacy-password-error" : undefined}
                    disabled={busy}
                    className={[
                      "w-full px-4 py-2.5 pr-14 rounded-lg border text-[14px] text-slate-800 placeholder-slate-300 outline-none transition-all",
                      passwordError
                        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                    ].join(" ")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                {passwordError && (
                  <p id="legacy-password-error" role="alert" className="mt-1 text-[11px] text-red-500">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                aria-label={busy ? "Signing in, please wait" : "Sign in"}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-55 disabled:cursor-not-allowed rounded-lg text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {busy ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                Sign In with
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Sign up */}
            <p className="text-center text-[13px] text-slate-400">
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-blue-600 font-semibold hover:underline">
                Sign up
              </a>
            </p>
          </div>

          {/* ── RIGHT: Brand Panel ── */}
          <div className="hidden md:flex w-[340px] bg-[#1a2f6e] flex-col items-center justify-end pb-10 px-8 shrink-0 relative overflow-hidden">

            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/10 pointer-events-none" />
            <div className="absolute top-1/4 -left-10 w-32 h-32 rounded-full bg-blue-400/10 pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-40 h-40 rounded-full bg-[#0f1f55]/60 pointer-events-none" />

            <div className="relative z-10 w-full bg-white/10 border border-white/15 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" />
                    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity="0.3" />
                  </svg>
                </div>
                <span className="text-white font-bold text-[14px] tracking-tight">zyoris</span>
              </div>

              <p className="text-blue-200 text-[12px] font-medium mb-1.5">Welcome to</p>
              <h2 className="text-white text-[19px] font-bold leading-snug mb-3">
                Your Smart Dashboard Platform.
              </h2>
              <p className="text-blue-200/70 text-[12px] leading-relaxed">
                Track performance, manage teams, and generate real-time insights — all in one place.
              </p>

              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
                {([["12.5k", "Users"], ["98%", "Uptime"], ["4.9★", "Rating"]] as const).map(([val, lbl]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-white text-[14px] font-bold">{val}</p>
                    <p className="text-blue-300/60 text-[10px] mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 flex gap-1.5">
              <div className="w-5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-4 text-center">
        <p className="text-[12px] text-blue-200/40">
          Copyright © 2025{" "}
          <a href="#" className="text-blue-300/60 hover:text-blue-200 transition-colors">
            zyoris
          </a>
          . All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
