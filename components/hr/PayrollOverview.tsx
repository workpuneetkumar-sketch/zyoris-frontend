import React from 'react';
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';

export default function PayrollOverview() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Payroll Overview</h2>
        <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          May 2024
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 sm:mb-6">
        <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Total Payroll Cost</p>
        <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
          <span className="text-xl sm:text-2xl font-bold text-slate-800">$125,860</span>
          <span className="flex items-center text-[10px] sm:text-xs font-medium text-emerald-500">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
            12.5% vs Apr 2024
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="flex-1 w-full relative min-h-[120px] sm:min-h-[140px]">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[8px] sm:text-[10px] text-slate-400">
          <span>$150K</span>
          <span>$100K</span>
          <span>$50K</span>
          <span>$0</span>
        </div>
        
        {/* Graph Area */}
        <div className="absolute left-8 sm:left-10 right-0 top-2 bottom-6">
          {/* Horizontal Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            <div className="w-full h-px bg-slate-50"></div>
            <div className="w-full h-px bg-slate-50"></div>
            <div className="w-full h-px bg-slate-50"></div>
            <div className="w-full h-px bg-slate-50"></div>
          </div>
          
          {/* Line Chart Path */}
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path 
              d="M 0,80 L 15,60 L 30,50 L 45,60 L 60,40 L 75,55 L 90,30 L 100,30 L 100,100 L 0,100 Z" 
              fill="url(#gradient)" 
            />
            <path 
              d="M 0,80 L 15,60 L 30,50 L 45,60 L 60,40 L 75,55 L 90,30 L 100,30" 
              fill="none" 
              stroke="#8b5cf6" 
              strokeWidth="2" 
              vectorEffect="non-scaling-stroke"
            />
            {/* Data Points */}
            <circle cx="0" cy="80" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="15" cy="60" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="30" cy="50" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="45" cy="60" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="60" cy="40" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="75" cy="55" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="90" cy="30" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <circle cx="100" cy="30" r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        {/* X-Axis Labels */}
        <div className="absolute left-8 sm:left-10 right-0 bottom-0 flex justify-between text-[8px] sm:text-[10px] text-slate-400">
          <span>Dec</span>
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Payroll Summary
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}