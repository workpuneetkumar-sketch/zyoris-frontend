import React from 'react';
import HrHeader from "@/components/hr/HrHeader";
import HrStatsCards from "@/components/hr/HrStatsCards";
import AttendanceOverview from "@/components/hr/AttendanceOverview";
import LeaveSummary from "@/components/hr/LeaveSummary";
import PayrollOverview from "@/components/hr/PayrollOverview";
import RecentActivities from "@/components/hr/RecentActivities";
import EmployeeDistribution from "@/components/hr/EmployeeDistribution";
import UpcomingEvents from "@/components/hr/UpcomingEvents";
import QuickActions from "@/components/hr/QuickActions";

export default function HrDashboardPage() {
  return (
    <div className="min-h-full bg-slate-50/50 p-6 lg:p-8 flex flex-col gap-8 w-full">
      
      {/* 1. Header Section */}
      <HrHeader />

      <div className="space-y-8">
        {/* 2. Top Stats Row (5 Cards) */}
        <div className="w-full">
          <HrStatsCards />
        </div>

        {/* 3. Middle Section: Charts & Summaries (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <AttendanceOverview />
          <LeaveSummary />
          <PayrollOverview />
        </div>

        {/* 4. Bottom Section: Activities, Distribution & Events (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <RecentActivities />
          <EmployeeDistribution />
          <UpcomingEvents />
        </div>

        {/* 5. Footer Section: Quick Actions */}
        <div className="w-full">
          <QuickActions />
        </div>
      </div>
      
    </div>
  );
}