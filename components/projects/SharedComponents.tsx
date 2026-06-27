import React from "react";

// ── Status Badge ────────────────────────────────────────────────────────
export const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    PLANNING: "bg-purple-100 text-purple-700 ring-purple-600/20",
    ACTIVE: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
    ON_HOLD: "bg-amber-100 text-amber-700 ring-amber-600/20",
    COMPLETED: "bg-blue-100 text-blue-700 ring-blue-600/20",
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

// ── Skeleton ─────────────────────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);