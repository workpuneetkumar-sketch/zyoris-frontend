import React from 'react';
import { Users, CalendarCheck, Umbrella, UserPlus, Cake } from 'lucide-react';

export default function HrStatsCards() {
  const stats = [
    {
      title: 'Total Employees',
      value: '256',
      subtitle: '↑ 8 this month',
      subtitleColor: 'text-emerald-500',
      icon: Users,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Present Today',
      value: '198',
      subtitle: '77.3% of total',
      subtitleColor: 'text-indigo-500',
      icon: CalendarCheck,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'On Leave',
      value: '28',
      subtitle: '10.9% of total',
      subtitleColor: 'text-amber-500',
      icon: Umbrella,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
    {
      title: 'New Hires',
      value: '12',
      subtitle: '↑ 3 this month',
      subtitleColor: 'text-emerald-500',
      icon: UserPlus,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Upcoming Birthdays',
      value: '7',
      subtitle: 'Next 7 days',
      subtitleColor: 'text-purple-500',
      icon: Cake,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
      {stats.map((stat, index) => {
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
                {stat.value}
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