"use client";

import React, { useEffect, useState } from 'react';
import { Users, CalendarCheck, UserPlus, Clock, UserCheck } from 'lucide-react';
import { fetchTodaySummary, getEmployees, fetchLeaves } from '@/lib/api/hrApi';

interface StatsData {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  newHires: number;
  activeEmployees: number;
}

export default function HrStatsCards() {
  const [stats, setStats] = useState<StatsData>({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    newHires: 0,
    activeEmployees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const [todaySummary, employees, approvedLeaves] = await Promise.all([
          fetchTodaySummary(),
          getEmployees(),
          fetchLeaves({ status: 'APPROVED' }),
        ]);

        let presentToday = 0;
        if (todaySummary) {
          presentToday =
            (todaySummary as any).presentToday ||
            (todaySummary as any).checkedIn ||
            (todaySummary as any).present ||
            0;
        }

        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;

        const today = new Date().toISOString().split('T')[0];
        const onLeaveToday = approvedLeaves.filter((leave) => {
          return leave.startDate <= today && leave.endDate >= today;
        }).length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newHires = employees.filter((emp) => {
          if (!emp.joinDate) return false;
          const joinDate = new Date(emp.joinDate);
          return joinDate >= thirtyDaysAgo;
        }).length;

        setStats({
          totalEmployees,
          presentToday: Math.min(presentToday, totalEmployees),
          onLeave: onLeaveToday,
          newHires,
          activeEmployees,
        });

      } catch (error) {
        console.error('Failed to fetch HR stats:', error);
        setError('Failed to load statistics');
        setStats({
          totalEmployees: 0,
          presentToday: 0,
          onLeave: 0,
          newHires: 0,
          activeEmployees: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsConfig = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees.toLocaleString(),
      subtitle: loading ? 'Loading...' : `${stats.activeEmployees} active`,
      subtitleColor: 'text-blue-600',
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Present Today',
      value: stats.presentToday.toLocaleString(),
      subtitle: stats.totalEmployees > 0
        ? `${((stats.presentToday / stats.totalEmployees) * 100).toFixed(1)}% attendance`
        : '0% attendance',
      subtitleColor: 'text-emerald-600',
      icon: CalendarCheck,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'On Leave',
      value: stats.onLeave.toLocaleString(),
      subtitle: stats.totalEmployees > 0
        ? `${((stats.onLeave / stats.totalEmployees) * 100).toFixed(1)}% of total`
        : '0% of total',
      subtitleColor: 'text-amber-600',
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'New Hires',
      value: stats.newHires.toLocaleString(),
      subtitle: 'Last 30 days',
      subtitleColor: 'text-purple-600',
      icon: UserPlus,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.iconBg}`}>
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`} />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] xs:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 truncate">
                {stat.title}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="inline-block w-12 sm:w-16 h-5 sm:h-6 bg-gray-200 rounded animate-pulse"></span>
                ) : (
                  stat.value
                )}
              </span>
              <span className={`text-[10px] xs:text-[11px] font-medium mt-1 truncate ${stat.subtitleColor}`}>
                {loading ? (
                  <span className="inline-block w-16 sm:w-20 h-3 bg-gray-200 rounded animate-pulse"></span>
                ) : (
                  stat.subtitle
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}