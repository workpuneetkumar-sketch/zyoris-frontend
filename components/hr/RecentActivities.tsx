import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function RecentActivities() {
  const activities = [
    { name: 'Taylor Smith', desc: 'Applied for leave (Annual Leave)', time: '10:30 AM', img: 'https://i.pravatar.cc/150?u=1' },
    { name: 'Jordan Lee', desc: 'Check-in at Office', time: '09:15 AM', img: 'https://i.pravatar.cc/150?u=2' },
    { name: 'Casey Williams', desc: 'Completed "Leadership Training"', time: 'Yesterday', img: 'https://i.pravatar.cc/150?u=3' },
    { name: 'Alex Morgan', desc: 'Published Payroll for May 2024', time: 'Yesterday', img: 'https://i.pravatar.cc/150?u=alex' },
    { name: 'Morgan Davis', desc: 'Added new document "HR Policy.pdf"', time: 'May 19, 2024', img: 'https://i.pravatar.cc/150?u=5' },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      <h2 className="text-sm sm:text-base font-semibold text-slate-800 mb-4 sm:mb-6">Recent Activities</h2>
      
      <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-y-auto max-h-[300px] sm:max-h-none">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <img src={activity.img} alt={activity.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 object-cover shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">{activity.name}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 truncate">{activity.desc}</span>
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 whitespace-nowrap shrink-0">{activity.time}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View All Activities
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}