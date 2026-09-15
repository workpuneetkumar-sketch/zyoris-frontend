"use client";

import React, { useEffect, useState } from "react";
import {
  Flag,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  PlayCircle,
  Plus,
  Target,
} from "lucide-react";
import {
  getMilestones,
  Milestone,
  Project,
} from "@/lib/api/projectsApi";

interface MilestonesViewProps {
  projects: Project[];
  onOpenMilestonesModal: (project: Project) => void;
}

interface ProjectMilestonesGroup {
  project: Project;
  milestones: Milestone[];
  loading: boolean;
  expanded: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  PENDING: {
    label: "Pending",
    icon: <Clock size={12} />,
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: <PlayCircle size={12} />,
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    icon: <CheckCircle2 size={12} />,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MilestonesView({
  projects,
  onOpenMilestonesModal,
}: MilestonesViewProps) {
  const [groups, setGroups] = useState<ProjectMilestonesGroup[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load milestones for all projects
  useEffect(() => {
    async function loadAll() {
      setInitialLoading(true);
      const results: ProjectMilestonesGroup[] = [];

      for (const project of projects) {
        try {
          const milestones = await getMilestones(project.id);
          results.push({
            project,
            milestones,
            loading: false,
            expanded: milestones.length > 0,
          });
        } catch {
          results.push({
            project,
            milestones: [],
            loading: false,
            expanded: false,
          });
        }
      }

      setGroups(results);
      setInitialLoading(false);
    }

    if (projects.length > 0) {
      loadAll();
    } else {
      setGroups([]);
      setInitialLoading(false);
    }
  }, [projects]);

  const toggleExpand = (projectId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.project.id === projectId ? { ...g, expanded: !g.expanded } : g
      )
    );
  };

  // Aggregate stats
  const allMilestones = groups.flatMap((g) => g.milestones);
  const totalMilestones = allMilestones.length;
  const completedCount = allMilestones.filter(
    (m) => m.status === "COMPLETED"
  ).length;
  const inProgressCount = allMilestones.filter(
    (m) => m.status === "IN_PROGRESS"
  ).length;
  const pendingCount = allMilestones.filter(
    (m) => m.status === "PENDING"
  ).length;

  const STAT_CARDS = [
    {
      label: "Total Milestones",
      value: totalMilestones,
      icon: <Target size={18} className="text-indigo-600" />,
      bg: "bg-indigo-50",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
      bg: "bg-emerald-50",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: <PlayCircle size={18} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      label: "Pending",
      value: pendingCount,
      icon: <Clock size={18} className="text-amber-600" />,
      bg: "bg-amber-50",
    },
  ];

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-gray-500">
          Loading milestones...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Milestone Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
          >
            <div
              className={`p-2.5 rounded-xl ${card.bg}`}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Project Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Flag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No projects found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const completed = group.milestones.filter(
              (m) => m.status === "COMPLETED"
            ).length;
            const total = group.milestones.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={group.project.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Project Header */}
                <button
                  onClick={() => toggleExpand(group.project.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {group.expanded ? (
                      <ChevronDown size={18} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0 text-left">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {group.project.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {total} milestone{total !== 1 ? "s" : ""} ·{" "}
                        {completed} completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Progress Bar */}
                    <div className="hidden sm:flex items-center gap-2 w-32">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                    {/* Add Milestone */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMilestonesModal(group.project);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                </button>

                {/* Milestones List */}
                {group.expanded && (
                  <div className="border-t border-gray-100">
                    {group.loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2
                          size={20}
                          className="animate-spin text-gray-400"
                        />
                      </div>
                    ) : group.milestones.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-sm text-gray-400">
                          No milestones yet.{" "}
                          <button
                            onClick={() =>
                              onOpenMilestonesModal(group.project)
                            }
                            className="text-indigo-600 font-semibold hover:underline"
                          >
                            Add one
                          </button>
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {group.milestones.map((milestone) => {
                          const config =
                            STATUS_CONFIG[milestone.status] ||
                            STATUS_CONFIG.PENDING;
                          return (
                            <div
                              key={milestone.id}
                              className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/30 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    milestone.status === "COMPLETED"
                                      ? "bg-emerald-100 text-emerald-600"
                                      : milestone.status === "IN_PROGRESS"
                                      ? "bg-blue-100 text-blue-600"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {milestone.status === "COMPLETED" ? (
                                    <CheckCircle2 size={14} />
                                  ) : milestone.status === "IN_PROGRESS" ? (
                                    <PlayCircle size={14} />
                                  ) : (
                                    <Clock size={14} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className={`text-sm font-medium ${
                                      milestone.status === "COMPLETED"
                                        ? "text-gray-400 line-through"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {milestone.title}
                                  </p>
                                  {milestone.description && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">
                                      {milestone.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-gray-400 hidden sm:inline">
                                  📅 {formatDate(milestone.dueDate)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${config.bgColor} ${config.color}`}
                                >
                                  {config.icon}
                                  {config.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
