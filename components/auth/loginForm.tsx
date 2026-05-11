"use client";

import { useState, FormEvent } from "react";

type Props = {
    onSubmit: (email: string, password: string) => Promise<void>;
    isLoading: boolean;
    error?: string | null;
};

export default function LoginForm({ onSubmit, isLoading, error }: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await onSubmit(email, password);
    };

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

                        {/* Error */}
                        {error && (
                            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-500">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Email */}
                            <div>
                                <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-[14px] text-slate-800 placeholder-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[13px] font-semibold text-slate-600">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        className="text-[12px] text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPw ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 pr-14 rounded-lg border border-slate-200 text-[14px] text-slate-800 placeholder-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors px-1"
                                    >
                                        {showPw ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            {/* Remember me */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-3.5 h-3.5 accent-blue-600 rounded"
                                />
                                <span className="text-[13px] text-slate-500">Remember me</span>
                            </label>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-55 disabled:cursor-not-allowed rounded-lg text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[11px] text-slate-400 font-medium tracking-wide">Sign In with</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* 
<div className="flex items-center justify-center gap-3 mb-6">
    <SocialBtn color="#1877F2" label="Facebook" icon={<FacebookIcon />} />
    <SocialBtn color="#EA4335" label="Google" icon={<GoogleIcon />} />
    <SocialBtn color="#E1306C" label="Instagram" icon={<InstagramIcon />} />
    <SocialBtn color="#1DA1F2" label="Twitter" icon={<TwitterIcon />} />
</div>
*/}

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

                        {/* Decorative circles */}
                        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/10 pointer-events-none" />
                        <div className="absolute top-1/4 -left-10 w-32 h-32 rounded-full bg-blue-400/10 pointer-events-none" />
                        <div className="absolute bottom-4 right-4 w-40 h-40 rounded-full bg-[#0f1f55]/60 pointer-events-none" />

                        {/* Floating info card */}
                        <div className="relative z-10 w-full bg-white/10 border border-white/15 rounded-2xl p-6 mb-8">

                            {/* Brand */}
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

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
                                {[["12.5k", "Users"], ["98%", "Uptime"], ["4.9★", "Rating"]].map(([val, lbl]) => (
                                    <div key={lbl} className="text-center">
                                        <p className="text-white text-[14px] font-bold">{val}</p>
                                        <p className="text-blue-300/60 text-[10px] mt-0.5">{lbl}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Carousel dots */}
                        <div className="relative z-10 flex gap-1.5">
                            <div className="w-5 h-1.5 rounded-full bg-white" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Footer ── */}
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

/* ── Social Button ── */
function SocialBtn({
    color,
    label,
    icon,
}: {
    color: string;
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={`Sign in with ${label}`}
            style={{ backgroundColor: color }}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-85 active:scale-95 transition-all"
        >
            {icon}
        </button>
    );
}

/* ── SVG Icons ── */
/*
function FacebookIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    );
}
function GoogleIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}
function InstagramIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
        </svg>
    );
}
function TwitterIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
        </svg>
    );


}

*/