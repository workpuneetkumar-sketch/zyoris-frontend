"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { fetchTodaySummary } from '@/lib/api/hrApi';

export default function AttendanceOverview() {
  const [attendanceData, setAttendanceData] = useState([
    { label: 'Present', value: 0, percentage: 0, colorClass: 'bg-emerald-500', hex: '#10b981' },
    { label: 'Absent', value: 0, percentage: 0, colorClass: 'bg-rose-500', hex: '#f43f5e' },
    { label: 'Late', value: 0, percentage: 0, colorClass: 'bg-amber-400', hex: '#fbbf24' },
    { label: 'Half Day', value: 0, percentage: 0, colorClass: 'bg-blue-400', hex: '#60a5fa' },
  ]);
  const [loading, setLoading] = useState(true);
  const [avgAttendance, setAvgAttendance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const summary = await fetchTodaySummary();

        const total = summary?.totalEmployees || 1;
        const present = summary?.checkedIn || summary?.presentToday || 0;
        const absent = summary?.absent || 0;
        const late = summary?.late || 0;
        const checkedOut = summary?.checkedOut || 0;
        const halfDay = Math.max(0, total - present - absent - late - checkedOut);
        const avgPct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

        setAttendanceData([
          { label: 'Present', value: present, percentage: total > 0 ? Math.round((present / total) * 1000) / 10 : 0, colorClass: 'bg-emerald-500', hex: '#10b981' },
          { label: 'Absent', value: absent, percentage: total > 0 ? Math.round((absent / total) * 1000) / 10 : 0, colorClass: 'bg-rose-500', hex: '#f43f5e' },
          { label: 'Late', value: late, percentage: total > 0 ? Math.round((late / total) * 1000) / 10 : 0, colorClass: 'bg-amber-400', hex: '#fbbf24' },
          { label: 'Half Day', value: halfDay, percentage: total > 0 ? Math.round((halfDay / total) * 1000) / 10 : 0, colorClass: 'bg-blue-400', hex: '#60a5fa' },
        ]);
        setAvgAttendance(avgPct);
      } catch (err) {
        console.error("Failed to load attendance overview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
            {attendanceData.map((item, index) => {
              const offset = attendanceData
                .slice(0, index)
                .reduce((sum, d) => sum + d.percentage, 0);
              return (
                <circle
                  key={item.label}
                  cx="21" cy="21" r="15.91549430918954"
                  fill="transparent"
                  stroke={item.hex}
                  strokeWidth="6"
                  strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-1000 ease-out"
                />
              );
            })}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {loading ? (
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-bold text-slate-800">{avgAttendance}%</span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 text-center px-1 leading-tight">Average Attendance</span>
              </>
            )}
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