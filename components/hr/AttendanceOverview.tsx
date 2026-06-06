import React from 'react';
import Link from "next/link";
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function AttendanceOverview() {
  const attendanceData = [
    { label: 'Present', value: 198, percentage: 77.3, colorClass: 'bg-emerald-500', hex: '#10b981' },
    { label: 'Absent', value: 28, percentage: 10.9, colorClass: 'bg-rose-500', hex: '#f43f5e' },
    { label: 'Late', value: 18, percentage: 7.0, colorClass: 'bg-amber-400', hex: '#fbbf24' },
    { label: 'Half Day', value: 12, percentage: 4.8, colorClass: 'bg-blue-400', hex: '#60a5fa' },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Attendance Overview</h2>
        <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          This Month
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Main Content (Chart & Legend) */}
      <div className="flex flex-col items-center gap-5 sm:gap-6 flex-1">
        
        {/* Donut Chart - Centered on mobile */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 mx-auto">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 drop-shadow-sm">
            {/* Present */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[0].hex} strokeWidth="6" 
              strokeDasharray="76.3 23.7" strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
            
            {/* Absent */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[1].hex} strokeWidth="6" 
              strokeDasharray="9.9 90.1" strokeDashoffset="-77.3" />
            
            {/* Late */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[2].hex} strokeWidth="6" 
              strokeDasharray="6 94" strokeDashoffset="-88.2" />
            
            {/* Half Day */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[3].hex} strokeWidth="6" 
              strokeDasharray="4.8 95.2" strokeDashoffset="-95.2" />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-slate-800">77.3%</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 text-center px-1 leading-tight">Average Attendance</span>
          </div>
        </div>

        {/* Legend - Full width with better spacing */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:gap-y-3 w-full max-w-[320px] mx-auto">
          {attendanceData.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.colorClass}`}></span>
                <span className="text-xs sm:text-sm text-slate-700 font-medium truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs sm:text-sm text-slate-800 font-semibold">{item.value}</span>
                <span className="text-[10px] sm:text-xs text-slate-500">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer Action */}
      <Link href="/hr/attendance">
      <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Attendance Report
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
      </Link>

    </div>
  );
}