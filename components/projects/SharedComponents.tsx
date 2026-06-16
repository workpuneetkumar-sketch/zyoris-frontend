// app/(dashboard)/projects/components/SharedComponents.tsx
import React from "react";

// ── Status Badge ────────────────────────────────────────────────────────
export const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
    COMPLETED: "bg-blue-100 text-blue-700 ring-blue-600/20",
    PENDING: "bg-amber-100 text-amber-700 ring-amber-600/20",
    CANCELLED: "bg-red-100 text-red-700 ring-red-600/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        colorMap[status] || "bg-gray-100 text-gray-600 ring-gray-500/20"
      }`}
    >
      {status}
    </span>
  );
};

// ── Progress Bar ────────────────────────────────────────────────────────
export const ProgressBar = ({ progress = 0 }: { progress?: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
      style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
    />
  </div>
);

// ── Skeleton ─────────────────────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);