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
<<<<<<< HEAD
    <div className="min-h-screen bg-[#fafbfc] p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 w-full">
=======
    <div className="min-h-full bg-slate-50/50 p-4 md:p-6 lg:p-8 flex flex-col gap-6 md:gap-8 w-full overflow-hidden">
>>>>>>> 32c8e17c3aa87fcce1d2aaac445b10887acbad93
      
      {/* 1. Header Section */}
      <HrHeader />

      <div className="space-y-6 md:space-y-8 w-full max-w-full overflow-hidden">
        {/* 2. Top Stats Row (5 Cards) */}
        <div className="w-full overflow-hidden">
          <HrStatsCards />
        </div>

<<<<<<< HEAD
      {/* 3. Middle Section: Charts & Summaries (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        <AttendanceOverview />
        <LeaveSummary />
        <PayrollOverview />
      </div>

      {/* 4. Bottom Section: Activities, Distribution & Events (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        <RecentActivities />
        <EmployeeDistribution />
        <UpcomingEvents />
      </div>

      {/* 5. Footer Section: Quick Actions */}
      <div className="w-full mt-1 sm:mt-2">
        <QuickActions />
=======
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
>>>>>>> 32c8e17c3aa87fcce1d2aaac445b10887acbad93
      </div>
      
    </div>
  );
}