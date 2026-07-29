// components/finance/Expenses/StatusBadge.tsx

"use client";

import React from "react";
import { Clock, CheckCircle2, XCircle, Banknote } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle2 size={12} />
        Approved
      </span>
    );
  
  if (status === "PENDING")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700">
        <Clock size={12} />
        Pending
      </span>
    );
  
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700">
        <XCircle size={12} />
        Rejected
      </span>
    );
  
  if (status === "REIMBURSED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">
        <Banknote size={12} />
        Reimbursed
      </span>
    );
  
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
      {status}
    </span>
  );
}