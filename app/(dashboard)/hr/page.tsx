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
    <div className="min-h-full bg-slate-50/50 p-4 md:p-6 lg:p-8 flex flex-col gap-6 md:gap-8 w-full overflow-hidden">
      
      {/* 1. Header Section */}
      <HrHeader />

      <div className="space-y-6 md:space-y-8 w-full max-w-full overflow-hidden">
        {/* 2. Top Stats Row (5 Cards) */}
        <div className="w-full overflow-hidden">
          <HrStatsCards />
        </div>

        {/* Middle & Bottom Section: Grid of 6 Cards (2 Columns, 3 Rows) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full overflow-hidden">
          <AttendanceOverview />
          <LeaveSummary />
          <PayrollOverview />
          <RecentActivities />
          <EmployeeDistribution />
          <UpcomingEvents />
        </div>

        {/* 5. Footer Section: Quick Actions */}
        <div className="w-full overflow-hidden">
          <QuickActions />
        </div>
      </div>
      
    </div>
  );
}