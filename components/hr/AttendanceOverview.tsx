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
    <div className="bg-white border border-slate-100 rounded-xl p-4 md:p-6 flex flex-col h-full shadow-sm overflow-hidden w-full max-w-full min-w-0">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 md:mb-8 gap-2 w-full min-w-0">
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm md:text-base font-bold text-slate-800 truncate">Attendance Overview</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Employee presence tracking</p>
        </div>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] md:text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all shrink-0">
          This Month
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Main Content (Chart & Legend) */}
      <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 md:gap-10 flex-1 w-full min-w-0">
        
        {/* Left: Donut Chart */}
        <div className="relative w-32 h-32 md:w-44 md:h-44 shrink-0 mx-auto md:mx-0">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 filter drop-shadow-md">
            {/* Background Circle */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="5" />
            
            {/* Present */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[0].hex} strokeWidth="5" 
              strokeDasharray="76.3 23.7" strokeDashoffset="0" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            
            {/* Absent */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[1].hex} strokeWidth="5" 
              strokeDasharray="9.9 90.1" strokeDashoffset="-76.3" strokeLinecap="round" />
            
            {/* Late */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[2].hex} strokeWidth="5" 
              strokeDasharray="6 94" strokeDashoffset="-86.2" strokeLinecap="round" />
            
            {/* Half Day */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke={attendanceData[3].hex} strokeWidth="5" 
              strokeDasharray="4.8 95.2" strokeDashoffset="-92.2" strokeLinecap="round" />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
            <span className="text-xl md:text-3xl font-black text-slate-800 leading-none">77%</span>
            <span className="text-[9px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Present</span>
          </div>
        </div>

        {/* Right: Legend */}
        <div className="flex flex-col gap-4 w-full flex-1 min-w-0">
          {attendanceData.map((item, index) => (
            <div key={index} className="flex items-center justify-between min-w-0 group">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.colorClass} shadow-sm group-hover:scale-110 transition-transform`}></span>
                <span className="text-[13px] md:text-sm text-slate-600 font-semibold">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <span className="text-sm text-slate-800 font-bold">{item.value}</span>
                <span className="text-[11px] text-slate-400 font-medium">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer Action */}
      <Link href="/hr/attendance" className="block w-full mt-auto">
        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group w-full min-w-0">
          <span className="text-[11px] md:text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors truncate">
            View Detailed Attendance Report
          </span>
          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-all shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>

    </div>
  );
}