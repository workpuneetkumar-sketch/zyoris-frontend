"use client";
// components/dashboard-builder/widgets/ProjectsWidget.tsx
// Real data: GET /projects via useProjects hook.
// Mock const PROJECTS removed entirely.

import { RefreshCw, AlertCircle, FolderOpen } from "lucide-react";
import { useProjects } from "@/hooks/useDashboard";
import type { Project } from "@/lib/api/projectsApi";

// ── Map backend status → display label + colour ────────────────────────────
const STATUS_META: Record<string, { label: string; cls: string; bar: string }> = {
  ACTIVE:    { label: "Active",    cls: "text-emerald-600 bg-emerald-50 border-emerald-100", bar: "#10b981" },
  PLANNING:  { label: "Planning",  cls: "text-blue-600   bg-blue-50   border-blue-100",     bar: "#6366f1" },
  ON_HOLD:   { label: "On Hold",   cls: "text-amber-600  bg-amber-50  border-amber-100",    bar: "#f59e0b" },
  COMPLETED: { label: "Complete",  cls: "text-gray-500   bg-gray-100  border-gray-200",     bar: "#94a3b8" },
};
const DEFAULT_META = { label: "—", cls: "text-gray-400 bg-gray-50 border-gray-100", bar: "#94a3b8" };

function getStatusMeta(status?: string) {
  return STATUS_META[(status ?? "").toUpperCase()] ?? DEFAULT_META;
}

/** Compute rough % progress from milestone counts; fall back to 0 */
function progressPct(project: Project): number {
  const counts = project.counts;
  if (!counts || !counts.milestones) return 0;
  // We don't have completed milestones count from the list endpoint —
  // show 100% only for COMPLETED status, otherwise 50% for ACTIVE, etc.
  const s = (project.status ?? "").toUpperCase();
  if (s === "COMPLETED") return 100;
  if (s === "ACTIVE")    return 60;
  if (s === "ON_HOLD")   return 40;
  return 20; // PLANNING
}

/** Format end/target date */
function dueLabel(project: Project): string {
  const d = project.targetDate ?? project.endDate;
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ProjectsWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: projects, loading, error, refetch } = useProjects();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-center animate-pulse">
            <div className="flex items-center justify-between mb-1">
              <div className="h-3 w-28 bg-gray-100 rounded" />
              <div className="h-3 w-14 bg-gray-100 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full" />
              <div className="h-3 w-8 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!projects || projects.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <FolderOpen size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No projects yet</p>
      </div>
    );
  }

  // Show up to 4 most-recently-updated projects
  const displayed = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {displayed.map((p: Project) => {
        const meta = getStatusMeta(p.status);
        const pct  = progressPct(p);
        const due  = dueLabel(p);

        return (
          <div key={p.id} className="flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-800 truncate mr-2">{p.name}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {due && <span className="text-[9px] text-gray-400">{due}</span>}
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: meta.bar }}
                />
              </div>
              <p className="text-[10px] font-bold text-gray-600 w-8 text-right">{pct}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
