// components/finance/StatusBadge.tsx
'use client';

import { InvoiceStatus } from '@/lib/api/finance/invoicesApi';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          className: 'bg-gray-100 text-gray-700',
        };
      case 'SENT':
        return {
          label: 'Sent',
          className: 'bg-yellow-100 text-yellow-700',
        };
      case 'PAID':
        return {
          label: 'Paid',
          className: 'bg-green-100 text-green-700',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-700',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}