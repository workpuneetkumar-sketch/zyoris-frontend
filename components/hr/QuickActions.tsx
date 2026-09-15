"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Calendar, CheckCircle2, IndianRupee, Megaphone, UploadCloud } from 'lucide-react';

const ACTIONS = [
  {
    label: 'Add Employee',
    icon: UserPlus,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    href: '/hr/employees',
  },
  {
    label: 'Apply Leave',
    icon: Calendar,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    href: '/hr/leaves',
  },
  {
    label: 'Mark Attendance',
    icon: CheckCircle2,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    href: '/hr/attendance',
  },
  {
    label: 'Run Payroll',
    icon: IndianRupee,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    href: '/hr/payroll',
  },
  {
    label: 'Add Announcement',
    icon: Megaphone,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    href: '/communications',
  },
  {
    label: 'Upload Document',
    icon: UploadCloud,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    href: '/documents',
  },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className="w-full">
      <h2 className="text-xs sm:text-sm font-semibold text-slate-800 mb-3 sm:mb-4 px-1">Quick Actions</h2>
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-slate-100 rounded-xl hover:shadow-sm hover:border-slate-200 transition-all shrink-0"
            >
              <div className={`p-1 sm:p-1.5 rounded-lg ${action.bg} ${action.border} border`}>
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${action.color}`} />
              </div>
              <span className="text-[11px] sm:text-[13px] font-semibold text-slate-700 whitespace-nowrap">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
