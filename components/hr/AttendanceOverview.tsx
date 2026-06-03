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
    <div className="bg-white border border-slate-100 rounded-xl p-6 flex flex-col h-full shadow-sm">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-base font-semibold text-slate-800">Attendance Overview</h2>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          This Month
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Main Content (Chart & Legend) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-8 flex-1">
        
        {/* Left: Donut Chart */}
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 drop-shadow-sm">
            {/* 
              Background circle (optional, usually good for a base)
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="6" /> 
            */}
            
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
            <span className="text-xl font-bold text-slate-800">77.3%</span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">Average Attendance</span>
          </div>
        </div>

        {/* Right: Legend */}
        <div className="flex flex-col gap-3.5 w-full sm:w-auto flex-1">
          {attendanceData.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.colorClass}`}></span>
                <span className="text-slate-700 font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-semibold">{item.value}</span>
                <span className="text-slate-500 text-xs w-12 text-right">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer Action */}
      <Link href="/hr/attendance">
      <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Attendance Report
        </span>
        <ChevronRight className="w-4 h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
      </Link>

    </div>
  );
}
