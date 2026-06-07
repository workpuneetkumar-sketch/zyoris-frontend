import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function UpcomingEvents() {
  const events = [
    { month: 'MAY', day: '22', title: 'Team Outing', time: 'May 22, 2024 • 10:00 AM' },
    { month: 'MAY', day: '25', title: 'Performance Review Cycle', time: 'May 25 - Jun 05, 2024' },
    { month: 'MAY', day: '31', title: 'Payroll Processing', time: 'May 31, 2024 • 09:00 AM' },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Upcoming Events</h2>
        <span className="text-[10px] sm:text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-700">View Calendar</span>
      </div>

      <div className="flex-1 flex flex-col gap-3 sm:gap-4">
        {events.map((event, index) => (
          <div key={index} className="flex items-center justify-between border border-slate-100 rounded-lg p-2.5 sm:p-3 hover:bg-slate-50 transition-colors gap-2">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="flex flex-col items-center justify-center bg-indigo-50/50 rounded-lg min-w-[42px] sm:min-w-[50px] py-1 sm:py-1.5 border border-indigo-50 shrink-0">
                <span className="text-[8px] sm:text-[10px] font-bold text-indigo-500 uppercase">{event.month}</span>
                <span className="text-base sm:text-lg font-bold text-indigo-700 leading-none mt-0.5">{event.day}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{event.title}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{event.time}</span>
              </div>
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-emerald-50 text-emerald-600 text-[9px] sm:text-[10px] font-semibold rounded-full border border-emerald-100 whitespace-nowrap shrink-0">
              Upcoming
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View All Events
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}