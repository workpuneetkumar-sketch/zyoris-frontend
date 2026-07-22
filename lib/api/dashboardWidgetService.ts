// lib/api/dashboardWidgetService.ts
// Mock service for the Dashboard Builder widget catalog.
// Day 2: Mock data with categories.
// Future: Replace with GET /dashboard/widgets/catalog

import { WidgetDefinition } from "@/types/dashboard-builder";

const MOCK_CATALOG: WidgetDefinition[] = [
  {
    id: "kpi-revenue",
    type: "kpi",
    title: "Revenue KPI",
    description: "Current revenue with trend percentage",
    icon: "DollarSign",
    category: "Finance",
    defaultW: 2,
    defaultH: 1,
  },
  {
    id: "kpi-leads",
    type: "kpi",
    title: "Leads Count",
    description: "Total leads count for this period",
    icon: "Users",
    category: "Sales",
    defaultW: 2,
    defaultH: 1,
  },
  {
    id: "kpi-deal-value",
    type: "kpi",
    title: "Deal Value",
    description: "Total pipeline deal value",
    icon: "Briefcase",
    category: "Sales",
    defaultW: 2,
    defaultH: 1,
  },
  {
    id: "chart-revenue",
    type: "chart",
    title: "Revenue Trend",
    description: "Monthly revenue over time",
    icon: "BarChart2",
    category: "Analytics",
    defaultW: 4,
    defaultH: 2,
  },
  {
    id: "chart-deals",
    type: "chart",
    title: "Deals Pipeline",
    description: "Deals by pipeline stage",
    icon: "TrendingUp",
    category: "Analytics",
    defaultW: 4,
    defaultH: 2,
  },
  {
    id: "table-leads",
    type: "table",
    title: "Recent Leads",
    description: "Latest leads added to the system",
    icon: "Table",
    category: "Sales",
    defaultW: 4,
    defaultH: 2,
  },
  {
    id: "activity-feed",
    type: "activity",
    title: "Activity Feed",
    description: "Recent team activity entries",
    icon: "Activity",
    category: "Activity",
    defaultW: 3,
    defaultH: 2,
  },
  {
    id: "tasks-overview",
    type: "tasks",
    title: "My Tasks",
    description: "Overview of pending tasks",
    icon: "CheckSquare",
    category: "Tasks",
    defaultW: 3,
    defaultH: 2,
  },
];

export async function getWidgetCatalog(): Promise<WidgetDefinition[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));
  return MOCK_CATALOG.map((w) => ({ ...w }));
}
