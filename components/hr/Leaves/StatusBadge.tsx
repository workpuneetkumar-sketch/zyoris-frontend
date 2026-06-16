import React from "react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Approved
      </span>
    );
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
        Pending
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      {status}
    </span>
  );
}