"use client";
import React, { useEffect, useState } from 'react';
import { Users, CalendarCheck, Umbrella, UserPlus, Cake } from 'lucide-react';
import { fetchTodaySummary, fetchEmployees, fetchLeaves } from '@/lib/api/hrApi';

interface StatsData {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  newHires: number;
  upcomingBirthdays: number;
}

export default function HrStatsCards() {
  const [stats, setStats] = useState<StatsData>({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    newHires: 0,
    upcomingBirthdays: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all data in parallel
        const [todaySummary, employees, leaveRequests] = await Promise.all([
          fetchTodaySummary(),
          fetchEmployees(),
          fetchLeaves({ status: 'APPROVED' }),
        ]);

        // Calculate present today and on leave
        const presentToday = todaySummary.checkedIn;
        
        // Calculate employees on approved leave today
        const today = new Date().toISOString().split('T')[0];
        const onLeaveToday = leaveRequests.filter((leave) => {
          return leave.startDate <= today && leave.endDate >= today;
        }).length;

        // Calculate new hires in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newHires = employees.filter((emp) => {
          return new Date(emp.joinDate) >= thirtyDaysAgo;
        }).length;

        // Calculate upcoming birthdays in next 7 days
        const upcomingBirthdays = calculateUpcomingBirthdays(employees);

        setStats({
          totalEmployees: todaySummary.totalEmployees,
          presentToday,
          onLeave: onLeaveToday,
          newHires,
          upcomingBirthdays,
        });
      } catch (error) {
        console.error('Failed to fetch HR stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Helper function to calculate upcoming birthdays
  const calculateUpcomingBirthdays = (employees: any[]): number => {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    return 0;
  };

  const statsConfig = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees.toLocaleString(),
      subtitle: loading ? 'Loading...' : 'Current headcount',
      subtitleColor: 'text-emerald-500',
      icon: Users,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Present Today',
      value: stats.presentToday.toLocaleString(),
      subtitle: `${stats.totalEmployees > 0 ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1) : 0}% of total`,
      subtitleColor: 'text-indigo-500',
      icon: CalendarCheck,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'On Leave',
      value: stats.onLeave.toLocaleString(),
      subtitle: `${stats.totalEmployees > 0 ? ((stats.onLeave / stats.totalEmployees) * 100).toFixed(1) : 0}% of total`,
      subtitleColor: 'text-amber-500',
      icon: Umbrella,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
    {
      title: 'New Hires',
      value: stats.newHires.toLocaleString(),
      subtitle: 'Last 30 days',
      subtitleColor: 'text-emerald-500',
      icon: UserPlus,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Upcoming Birthdays',
      value: stats.upcomingBirthdays.toLocaleString(),
      subtitle: 'Next 7 days',
      subtitleColor: 'text-purple-500',
      icon: Cake,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <div 
            key={index} 
            className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Icon Container */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}>
              <Icon className={`w-6 h-6 ${stat.iconColor}`} />
            </div>

            {/* Text Details */}
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-slate-500 mb-0.5">
                {stat.title}
              </span>
              <span className="text-2xl font-bold text-slate-800">
                {loading ? '...' : stat.value}
              </span>
              <span className={`text-[11px] font-medium mt-1 ${stat.subtitleColor}`}>
                {stat.subtitle}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}