"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[Zyoris Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050816] px-4 text-center">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)]">
          <svg className="w-9 h-9 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
        Something went wrong
      </h1>
      <p className="text-gray-400 text-sm max-w-sm mb-1">
        An unexpected error occurred in the Zyoris intelligence layer.
      </p>
      {error?.message && (
        <p className="text-xs text-red-400/80 font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mt-3 max-w-sm break-all">
          {error.message}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-white text-sm font-medium shadow-[0_8px_24px_rgba(99,102,241,0.4)] hover:brightness-110 hover:-translate-y-0.5 transition-all duration-150"
        >
          Try again
        </button>
        <a
          href="/"
          className="px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all duration-150"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
