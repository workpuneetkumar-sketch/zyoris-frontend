"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { fetchActivities } from "@/lib/api/activitiesApi";
import type { Activity } from "@/types/activities";

interface ActivityItem {
  id: string;
  name: string;
  desc: string;
  time: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function RecentActivities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchActivities(1, {
          tab: "All Activities",
          search: "",
          dateFrom: "",
          dateTo: "",
        });

        const items: Activity[] = response.activities ?? [];
        const mapped: ActivityItem[] = items.slice(0, 5).map((item) => {
          const createdAt = item.createdAt || '';
          return {
            id: item.id,
            name: item.owner || 'User',
            desc: item.title || '',
            time: createdAt ? formatRelativeTime(createdAt) : item.dueDate || '',
          };
        });

        setActivities(mapped);
      } catch (err) {
        console.error("Failed to load recent activities:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 flex flex-col h-full shadow-sm">
      <h2 className="text-sm sm:text-base font-semibold text-slate-800 mb-4 sm:mb-6">Recent Activities</h2>

      <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-y-auto max-h-[300px] sm:max-h-none">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No recent activities</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {getInitials(activity.name)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">{activity.name}</span>
                  <span className="text-[10px] sm:text-xs text-slate-500 truncate">{activity.desc}</span>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 whitespace-nowrap shrink-0">{activity.time}</span>
            </div>
          ))
        )}
      </div>

      <Link href="/activities">
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex justify-between items-center cursor-pointer group">
        <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
          View All Activities
        </span>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
      </div>
      </Link>
    </div>
  );
}