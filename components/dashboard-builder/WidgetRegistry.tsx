// components/dashboard-builder/WidgetRegistry.tsx
// Central registry of all dashboard widget definitions.
// Add new widgets here — the builder auto-discovers them.

import { WidgetDefinition } from "@/types/dashboard-builder";

// ── Widget component imports ───────────────────────────────────────────────
import { PipelineWidget } from "./widgets/PipelineWidget";
import { ConversionRateWidget } from "./widgets/ConversionRateWidget";
import { CashFlowWidget } from "./widgets/CashFlowWidget";
import { RevenueWidget } from "./widgets/RevenueWidget";
import { InventoryRiskWidget } from "./widgets/InventoryRiskWidget";
import { AttendanceWidget } from "./widgets/AttendanceWidget";
import { ExecutiveDashboardWidget } from "./widgets/ExecutiveDashboardWidget";
import { AnalyticsWidget } from "./widgets/AnalyticsWidget";
import { CRMWidget } from "./widgets/CRMWidget";
import { HRWidget } from "./widgets/HRWidget";
import { ProjectsWidget } from "./widgets/ProjectsWidget";
import { TasksWidget } from "./widgets/TasksWidget";
import { ActivitiesWidget } from "./widgets/ActivitiesWidget";
import { CommunicationsWidget } from "./widgets/CommunicationsWidget";
import { MarketingWidget } from "./widgets/MarketingWidget";
import { AIInsightsWidget } from "./widgets/AIInsightsWidget";

// ── Registry entry type ────────────────────────────────────────────────────

export interface WidgetRegistryEntry {
  id: string;
  title: string;
  module: string;
  icon: string;
  description: string;
  minW: number;
  minH: number;
  defaultW: number;
  defaultH: number;
  component: React.ComponentType<{ isPreview?: boolean }>;
}

// ── Full widget registry ───────────────────────────────────────────────────

const REGISTRY: WidgetRegistryEntry[] = [
  // ── Executive ─────────────────────────────────────────────────────────
  {
    id: "executive-dashboard",
    title: "Executive Dashboard",
    module: "Executive",
    icon: "👑",
    description: "High-level KPIs, revenue, deals, and performance trend",
    minW: 4,
    minH: 4,
    defaultW: 6,
    defaultH: 5,
    component: ExecutiveDashboardWidget,
  },

  // ── Analytics ─────────────────────────────────────────────────────────
  {
    id: "analytics",
    title: "Analytics Overview",
    module: "Analytics",
    icon: "📈",
    description: "Visitor and conversion analytics with trend chart",
    minW: 3,
    minH: 3,
    defaultW: 5,
    defaultH: 4,
    component: AnalyticsWidget,
  },

  // ── CRM ───────────────────────────────────────────────────────────────
  {
    id: "crm",
    title: "CRM Funnel",
    module: "CRM",
    icon: "🏆",
    description: "Lead pipeline funnel and recent CRM activity",
    minW: 2,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
    component: CRMWidget,
  },
  {
    id: "pipeline",
    title: "Pipeline",
    module: "Sales",
    icon: "🔥",
    description: "Visual sales pipeline with stage breakdown",
    minW: 2,
    minH: 2,
    defaultW: 4,
    defaultH: 3,
    component: PipelineWidget,
  },
  {
    id: "conversion-rate",
    title: "Conversion Rate",
    module: "Sales",
    icon: "⚡",
    description: "Lead-to-deal conversion rate tracking",
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 3,
    component: ConversionRateWidget,
  },

  // ── Finance ───────────────────────────────────────────────────────────
  {
    id: "revenue",
    title: "Revenue",
    module: "Finance",
    icon: "💰",
    description: "Monthly revenue trend with target tracking",
    minW: 2,
    minH: 2,
    defaultW: 4,
    defaultH: 3,
    component: RevenueWidget,
  },
  {
    id: "cash-flow",
    title: "Cash Flow",
    module: "Finance",
    icon: "💵",
    description: "Inflow vs outflow cash flow visualization",
    minW: 2,
    minH: 2,
    defaultW: 4,
    defaultH: 3,
    component: CashFlowWidget,
  },

  // ── HR ────────────────────────────────────────────────────────────────
  {
    id: "hr",
    title: "HR Overview",
    module: "HR",
    icon: "👥",
    description: "Headcount, attendance, and department breakdown",
    minW: 2,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
    component: HRWidget,
  },
  {
    id: "attendance",
    title: "Attendance",
    module: "HR",
    icon: "📋",
    description: "Daily attendance tracking and absence rates",
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 3,
    component: AttendanceWidget,
  },

  // ── Projects ──────────────────────────────────────────────────────────
  {
    id: "projects",
    title: "Projects",
    module: "Projects",
    icon: "📁",
    description: "Active project progress and status overview",
    minW: 2,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
    component: ProjectsWidget,
  },

  // ── Tasks ─────────────────────────────────────────────────────────────
  {
    id: "tasks",
    title: "My Tasks",
    module: "Tasks",
    icon: "✅",
    description: "Pending and completed tasks with priority",
    minW: 2,
    minH: 3,
    defaultW: 3,
    defaultH: 4,
    component: TasksWidget,
  },

  // ── Activities ────────────────────────────────────────────────────────
  {
    id: "activities",
    title: "Recent Activities",
    module: "Activities",
    icon: "🗂️",
    description: "Recent CRM activity feed across all channels",
    minW: 2,
    minH: 3,
    defaultW: 3,
    defaultH: 4,
    component: ActivitiesWidget,
  },

  // ── Operations ────────────────────────────────────────────────────────
  {
    id: "inventory-risk",
    title: "Inventory Risk",
    module: "Operations",
    icon: "📦",
    description: "Inventory health and risk indicators",
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 3,
    component: InventoryRiskWidget,
  },

  // ── Communications ────────────────────────────────────────────────────
  {
    id: "communications",
    title: "Communications",
    module: "Communications",
    icon: "📡",
    description: "Multi-channel outreach stats and reply rates",
    minW: 2,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
    component: CommunicationsWidget,
  },

  // ── Marketing ─────────────────────────────────────────────────────────
  {
    id: "marketing",
    title: "Marketing",
    module: "Marketing",
    icon: "🎯",
    description: "Lead generation, CAC, ROI, and campaign trends",
    minW: 2,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
    component: MarketingWidget,
  },

  // ── AI & Insights ─────────────────────────────────────────────────────
  {
    id: "ai-insights",
    title: "AI Insights",
    module: "AI & Insights",
    icon: "🧠",
    description: "AI-powered suggestions, risks, and opportunities",
    minW: 2,
    minH: 3,
    defaultW: 4,
    defaultH: 5,
    component: AIInsightsWidget,
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────

const REGISTRY_MAP = new Map(REGISTRY.map((e) => [e.id, e]));

/** Get a single registry entry by widget ID */
export function getWidgetEntry(id: string): WidgetRegistryEntry | undefined {
  return REGISTRY_MAP.get(id);
}

/** Get all widget definitions (for the catalog) */
export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return REGISTRY.map((e) => ({
    id: e.id,
    title: e.title,
    module: e.module,
    icon: e.icon,
    description: e.description,
    minW: e.minW,
    minH: e.minH,
    defaultW: e.defaultW,
    defaultH: e.defaultH,
  }));
}

/** Group widget definitions by module */
export function getWidgetCatalogGroups(): Array<{ module: string; widgets: WidgetDefinition[] }> {
  const groups = new Map<string, WidgetDefinition[]>();
  for (const entry of REGISTRY) {
    const def: WidgetDefinition = {
      id: entry.id,
      title: entry.title,
      module: entry.module,
      icon: entry.icon,
      description: entry.description,
      minW: entry.minW,
      minH: entry.minH,
      defaultW: entry.defaultW,
      defaultH: entry.defaultH,
    };
    const arr = groups.get(entry.module) ?? [];
    arr.push(def);
    groups.set(entry.module, arr);
  }
  return Array.from(groups.entries()).map(([module, widgets]) => ({ module, widgets }));
}

export default REGISTRY;
