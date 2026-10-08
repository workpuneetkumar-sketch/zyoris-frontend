"use client";

import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function AccessDenied({
  title = "Access Denied",
  description = "You do not have permission to access this page. This area requires administrative privileges.",
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] py-16 px-4 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-5 shadow-sm">
        <ShieldAlert size={32} strokeWidth={2} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </Link>
    </div>
  );
}

export default AccessDenied;
