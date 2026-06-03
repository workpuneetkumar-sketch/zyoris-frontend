import React from 'react';
import { UserPlus, Calendar, CheckCircle2, DollarSign, Megaphone, UploadCloud } from 'lucide-react';

export default function QuickActions() {
  const actions = [
    { label: 'Add Employee', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Apply Leave', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Mark Attendance', icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Run Payroll', icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: 'Add Announcement', icon: Megaphone, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Upload Document', icon: UploadCloud, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100' },
  ];

  return (
    <div className="w-full">
      <h2 className="text-sm font-semibold text-slate-800 mb-4 px-1">Quick Actions</h2>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button 
              key={index}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-100 rounded-xl hover:shadow-sm hover:border-slate-200 transition-all shrink-0"
            >
              <div className={`p-1.5 rounded-lg ${action.bg} ${action.border} border`}>
                <Icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}