"use client";

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getEmployees } from '@/lib/api/hrApi';

const DEPT_COLORS: Record<string, { hex: string; colorClass: string }> = {
  'Engineering': { hex: '#3b82f6', colorClass: 'bg-blue-500' },
  'Sales': { hex: '#38bdf8', colorClass: 'bg-sky-400' },
  'Marketing': { hex: '#facc15', colorClass: 'bg-yellow-400' },
  'HR': { hex: '#fb923c', colorClass: 'bg-orange-400' },
  'Finance': { hex: '#ef4444', colorClass: 'bg-red-500' },
  'Design': { hex: '#a78bfa', colorClass: 'bg-violet-400' },
  'Operations': { hex: '#34d399', colorClass: 'bg-emerald-400' },
};

const FALLBACK_COLOR = { hex: '#94a3b8', colorClass: 'bg-slate-400' };

export default function EmployeeDistribution() {
  const [distributionData, setDistributionData] = useState<
    { label: string; count: number; percentage: number; hex: string; colorClass: string }[]
  >([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const employees = await getEmployees();

        const deptCounts: Record<string, number> = {};
        employees.forEach((emp) => {
          const dept = emp.department || 'Others';
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });

        const total = employees.length;
        const sorted = Object.entries(deptCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([label, count]) => {
            const color = DEPT_COLORS[label] || FALLBACK_COLOR;
            return {
              label,
              count,
              percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
              ...color,
            };
          });

        setTotalEmployees(total);
        setDistributionData(sorted);
      } catch (err) {
        console.error("Failed to load employee distribution:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
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
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 drop-shadow-sm">
                {distributionData.map((item, idx) => {
                  const offset = distributionData
                    .slice(0, idx)
                    .reduce((sum, d) => sum + d.percentage, 0);
                  return (
                    <circle
                      key={item.label}
                      cx="21" cy="21" r="15.915"
                      fill="transparent"
                      stroke={item.hex}
                      strokeWidth="7"
                      strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                      strokeDashoffset={-offset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-slate-800">{totalEmployees}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Total</span>
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-6 gap-y-2 sm:gap-y-2.5 w-full max-w-[380px] mx-auto">
          {distributionData.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${item.colorClass}`}></span>
                <span className="text-xs sm:text-sm text-slate-600 font-medium truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs sm:text-sm text-slate-800 font-semibold w-5 text-right">{item.count}</span>
                <span className="text-[10px] sm:text-xs text-slate-400 w-12 text-right">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link href="hr/employees">
      <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View Department Report
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
      </Link>
    </div>
  );
}