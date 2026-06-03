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
    <div className="bg-white border border-slate-100 rounded-xl p-6 flex flex-col h-full shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-base font-semibold text-slate-800">Employee Distribution</h2>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          By Department
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 flex-1">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 shrink-0">
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
            <span className="text-lg font-bold text-slate-800">256</span>
            <span className="text-[10px] text-slate-500 font-medium">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 w-full sm:w-auto flex-1">
          {distributionData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.colorClass}`}></span>
                <span className="text-slate-600 font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-semibold w-6 text-right">{item.count}</span>
                <span className="text-slate-400 text-xs w-12 text-right">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Link href="hr/employee" >
      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Department Report
        </span>
        <ChevronRight className="w-4 h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
      </Link>
    </div>
  );
}