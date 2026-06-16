import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDistribution() {
  const distributionData = [
    { label: 'Engineering', count: 96, percentage: 37.5, hex: '#3b82f6', colorClass: 'bg-blue-500' },
    { label: 'Sales', count: 48, percentage: 18.8, hex: '#38bdf8', colorClass: 'bg-sky-400' },
    { label: 'Marketing', count: 32, percentage: 12.5, hex: '#facc15', colorClass: 'bg-yellow-400' },
    { label: 'HR', count: 24, percentage: 9.4, hex: '#fb923c', colorClass: 'bg-orange-400' },
    { label: 'Finance', count: 20, percentage: 7.8, hex: '#ef4444', colorClass: 'bg-red-500' },
    { label: 'Others', count: 36, percentage: 14.0, hex: '#94a3b8', colorClass: 'bg-slate-400' },
  ];

  return (
<<<<<<< HEAD
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Employee Distribution</h2>
        <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          By Department
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-5 sm:gap-6 flex-1">
        {/* SVG Donut - Centered */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 mx-auto">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 drop-shadow-sm">
            {/* Engineering */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[0].hex} strokeWidth="7" strokeDasharray="37.5 62.5" strokeDashoffset="0" />
            {/* Sales */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[1].hex} strokeWidth="7" strokeDasharray="18.8 81.2" strokeDashoffset="-37.5" />
            {/* Marketing */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[2].hex} strokeWidth="7" strokeDasharray="12.5 87.5" strokeDashoffset="-56.3" />
            {/* HR */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[3].hex} strokeWidth="7" strokeDasharray="9.4 90.6" strokeDashoffset="-68.8" />
            {/* Finance */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[4].hex} strokeWidth="7" strokeDasharray="7.8 92.2" strokeDashoffset="-78.2" />
            {/* Others */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[5].hex} strokeWidth="7" strokeDasharray="14 86" strokeDashoffset="-86" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-slate-800">256</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Total</span>
          </div>
        </div>

        {/* Legend - Grid layout to prevent overflow */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-6 gap-y-2 sm:gap-y-2.5 w-full max-w-[380px] mx-auto">
          {distributionData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${item.colorClass}`}></span>
                <span className="text-xs sm:text-sm text-slate-600 font-medium truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs sm:text-sm text-slate-800 font-semibold w-5 text-right">{item.count}</span>
                <span className="text-[10px] sm:text-xs text-slate-400 w-12 text-right">({item.percentage}%)</span>
=======
    <div className="bg-white border border-slate-100 rounded-xl p-4 md:p-6 flex flex-col h-full shadow-sm overflow-hidden w-full max-w-full min-w-0">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 md:mb-8 gap-2 w-full min-w-0">
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm md:text-base font-bold text-slate-800 truncate">Employee Distribution</h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Headcount by department</p>
        </div>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] md:text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all shrink-0">
          By Dept
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 md:gap-10 flex-1 w-full min-w-0">
        
        {/* SVG Donut */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 mx-auto md:mx-0">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 filter drop-shadow-md">
            {/* Background */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
            
            {/* Segments */}
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[0].hex} strokeWidth="6" strokeDasharray="37.5 62.5" strokeDashoffset="0" strokeLinecap="round" />
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[1].hex} strokeWidth="6" strokeDasharray="18.8 81.2" strokeDashoffset="-37.5" strokeLinecap="round" />
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[2].hex} strokeWidth="6" strokeDasharray="12.5 87.5" strokeDashoffset="-56.3" strokeLinecap="round" />
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[3].hex} strokeWidth="6" strokeDasharray="9.4 90.6" strokeDashoffset="-68.8" strokeLinecap="round" />
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[4].hex} strokeWidth="6" strokeDasharray="7.8 92.2" strokeDashoffset="-78.2" strokeLinecap="round" />
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={distributionData[5].hex} strokeWidth="6" strokeDasharray="14 86" strokeDashoffset="-86" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
            <span className="text-xl md:text-3xl font-black text-slate-800 leading-none">256</span>
            <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3.5 w-full flex-1 min-w-0">
          {distributionData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between min-w-0 group">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.colorClass} shadow-sm group-hover:scale-110 transition-transform`}></span>
                <span className="text-[13px] md:text-sm text-slate-600 font-semibold">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <span className="text-sm text-slate-800 font-bold">{item.count}</span>
                <span className="text-[11px] text-slate-400 font-medium">({item.percentage}%)</span>
>>>>>>> 32c8e17c3aa87fcce1d2aaac445b10887acbad93
              </div>
            </div>
          ))}
        </div>
      </div>
<<<<<<< HEAD
      
      <Link href="hr/employees">
      <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Department Report
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
=======

      {/* Footer Action */}
      <Link href="hr/employees" className="block w-full mt-auto">
        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group w-full min-w-0">
          <span className="text-[11px] md:text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors truncate">
            View Department Breakdown
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