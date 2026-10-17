import React from "react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Approved
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Pending
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200/60 shadow-2xs">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      {status}
    </span>
  );
}