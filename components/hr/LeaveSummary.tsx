import React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, UserCheck, UserMinus, Briefcase, Baby } from 'lucide-react';

export default function LeaveSummary() {
  const leaveData = [
    {
      title: 'Annual Leave',
      count: 45,
      status: 'Available',
      icon: UserCheck,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Sick Leave',
      count: 12,
      status: 'Available',
      icon: UserMinus,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-50',
    },
    {
      title: 'Casual Leave',
      count: 8,
      status: 'Available',
      icon: Briefcase,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-50',
    },
    {
      title: 'Maternity Leave',
      count: 2,
      status: 'Available',
      icon: Baby,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-50',
    },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Leave Summary</h2>
        <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          This Month
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Leave List */}
      <div className="flex-1 flex flex-col mt-1 sm:mt-2">
        <div className="divide-y divide-slate-100">
          {leaveData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center justify-between py-2.5 sm:py-3.5">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Icon */}
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.iconColor}`} />
                  </div>
                  {/* Title */}
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                    {item.title}
                  </span>
                </div>
                
                <div className="flex items-center gap-6 sm:gap-10">
                  {/* Count */}
                  <span className="text-xs sm:text-sm font-bold text-slate-800 w-4 text-center">
                    {item.count}
                  </span>
                  {/* Status */}
                  <span className="text-[11px] sm:text-[13px] font-medium text-emerald-600 w-14 sm:w-16 text-right">
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action */}
      <Link href="/hr/leaves">
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          Manage Leaves
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
      </Link>

    </div>
  );
}