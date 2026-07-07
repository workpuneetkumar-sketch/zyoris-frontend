"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays, Info } from "lucide-react";
import { Project } from "@/lib/api/projectsApi";

interface TimelineViewProps {
  projects: Project[];
  onEdit: (project: Project) => void;
}

const STATUS_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  PLANNING: { bar: "bg-purple-400", text: "text-purple-700", bg: "bg-purple-50" },
  ACTIVE: { bar: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  ON_HOLD: { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" },
  COMPLETED: { bar: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-50" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TimelineView({ projects, onEdit }: TimelineViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Calculate timeline range
  const { months, totalDays, rangeStart } = useMemo(() => {
    if (projects.length === 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 6, 0);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const monthList: { label: string; startPct: number; widthPct: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const mDays = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        const offset = Math.ceil(
          (m.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        monthList.push({
          label: m.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          startPct: (offset / days) * 100,
          widthPct: (mDays / days) * 100,
        });
      }
      return { months: monthList, totalDays: days, rangeStart: start };
    }

    const dates = projects.flatMap((p) => {
      const result = [new Date(p.startDate)];
      if (p.endDate) result.push(new Date(p.endDate));
      return result;
    });

    // Pad 15 days before earliest and after latest
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

    const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const endMonth = new Date(latest.getFullYear(), latest.getMonth() + 2, 0);
    const days = Math.max(
      30,
      Math.ceil((endMonth.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );

    const monthList: { label: string; startPct: number; widthPct: number }[] = [];
    const cur = new Date(start);
    while (cur <= endMonth) {
      const mDays = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const offset = Math.ceil(
        (cur.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      monthList.push({
        label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        startPct: (offset / days) * 100,
        widthPct: (mDays / days) * 100,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    return { months: monthList, totalDays: days, rangeStart: start };
  }, [projects]);

  // Calculate bar position for each project
  const projectBars = useMemo(() => {
    return projects.map((p) => {
      const start = new Date(p.startDate);
      const end = p.endDate ? new Date(p.endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

      const startOffset = Math.max(
        0,
        (start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const duration = Math.max(
        7,
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        project: p,
        leftPct: (startOffset / totalDays) * 100,
        widthPct: Math.min((duration / totalDays) * 100, 100 - (startOffset / totalDays) * 100),
        startDate: formatDate(p.startDate),
        endDate: p.endDate ? formatDate(p.endDate) : "Ongoing",
      };
    });
  }, [projects, rangeStart, totalDays]);

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
        <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">No projects to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Legend */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Status:</span>
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-3 h-1.5 rounded-full ${val.bar}`} />
            {key.replace("_", " ")}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Month Headers */}
          <div className="relative h-10 bg-gray-50 border-b border-gray-100 flex">
            {months.map((m, i) => (
              <div
                key={i}
                className="border-r border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500"
                style={{
                  position: "absolute",
                  left: `${m.startPct}%`,
                  width: `${m.widthPct}%`,
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Project Rows */}
          <div className="divide-y divide-gray-50">
            {projectBars.map(({ project, leftPct, widthPct, startDate, endDate }) => {
              const colors = STATUS_COLORS[project.status] || STATUS_COLORS.PLANNING;
              const isHovered = hoveredId === project.id;

              return (
                <div
                  key={project.id}
                  className="relative flex items-center h-14 hover:bg-gray-50/50 transition-colors group"
                >
                  {/* Project Name Label */}
                  <div className="w-[200px] shrink-0 px-4 flex items-center gap-2 border-r border-gray-100 z-10 bg-white group-hover:bg-gray-50/50">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${colors.bar}`}
                    />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {project.name}
                    </span>
                  </div>

                  {/* Timeline Area */}
                  <div className="flex-1 relative h-full">
                    {/* Grid lines */}
                    {months.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-gray-100"
                        style={{ left: `${m.startPct}%` }}
                      />
                    ))}

                    {/* Project Bar */}
                    <div
                      className={`absolute top-3 h-8 rounded-lg cursor-pointer transition-all duration-200 flex items-center px-3 ${colors.bar} ${
                        isHovered ? "ring-2 ring-offset-1 ring-indigo-400 shadow-md" : "shadow-sm"
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 3)}%`,
                      }}
                      onClick={() => onEdit(project)}
                      onMouseEnter={() => setHoveredId(project.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <span className="text-[10px] font-bold text-white truncate whitespace-nowrap">
                        {widthPct > 8 ? project.name : ""}
                      </span>
                    </div>

                    {/* Tooltip */}
                    {isHovered && (
                      <div
                        className="absolute z-30 bg-gray-900 text-white rounded-xl px-4 py-3 text-xs shadow-xl pointer-events-none"
                        style={{
                          left: `${Math.min(leftPct + widthPct / 2, 80)}%`,
                          top: "-4px",
                          transform: "translateX(-50%) translateY(-100%)",
                        }}
                      >
                        <p className="font-bold text-sm mb-1">{project.name}</p>
                        <p className="text-gray-300">
                          {startDate} → {endDate}
                        </p>
                        <p className="text-gray-400 mt-0.5">
                          Status: {project.status.replace("_", " ")}
                        </p>
                        {project.client?.name && (
                          <p className="text-gray-400">
                            Client: {project.client.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
        <Info size={12} />
        <span>Click on a project bar to edit. Hover for details.</span>
      </div>
    </div>
  );
}
