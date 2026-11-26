// components/finance/invoices/StatusBadge.tsx
'use client';

import React from 'react';
import {
  Edit2,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Ban,
  Loader2,
  Banknote,
  PieChart,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_META: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ size?: number | string }> }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Edit2,
  },
  SENT: {
    label: 'Sent',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Send,
  },
  ISSUED: {
    label: 'Issued',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Send,
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: PieChart,
  },
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  SUCCESS: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  VOID: {
    label: 'Void',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: Ban,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: Ban,
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  CREATED: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Loader2,
  },
  AUTHORIZED: {
    label: 'Authorized',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: CheckCircle2,
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  REIMBURSED: {
    label: 'Reimbursed',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Banknote,
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: Clock,
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Banknote,
  },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = (status || 'DRAFT').toUpperCase();
  const config = STATUS_META[key] || {
    label: status || 'Unknown',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className} ${className}`}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}