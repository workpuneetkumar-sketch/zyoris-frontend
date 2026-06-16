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
<<<<<<< HEAD
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Attendance Overview</h2>
        <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          This Month
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
=======
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
>>>>>>> 32c8e17c3aa87fcce1d2aaac445b10887acbad93
        </button>
      </div>

      {/* Main Content (Chart & Legend) */}
<<<<<<< HEAD
      <div className="flex flex-col items-center gap-5 sm:gap-6 flex-1">
        
        {/* Donut Chart - Centered on mobile */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 mx-auto">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 drop-shadow-sm">
=======
      <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 md:gap-10 flex-1 w-full min-w-0">
        
        {/* Left: Donut Chart */}
        <div className="relative w-32 h-32 md:w-44 md:h-44 shrink-0 mx-auto md:mx-0">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 filter drop-shadow-md">
            {/* Background Circle */}
            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="5" />
            
>>>>>>> 32c8e17c3aa87fcce1d2aaac445b10887acbad93
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 32c8e17c3aa87fcce1d2aaac445b10887acbad93
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer Action */}
<<<<<<< HEAD
      <Link href="/hr/attendance">
      <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Attendance Report
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
=======
      <Link href="/hr/attendance" className="block w-full mt-auto">
        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group w-full min-w-0">
          <span className="text-[11px] md:text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors truncate">
            View Detailed Attendance Report
          </span>
          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-all shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
>>>>>>> 32c8e17c3aa87fcce1d2aaac445b10887acbad93
      </Link>

    </div>
  );
}