"use client";

import React, { useState } from "react";
import {
  MoreHorizontal,
  CalendarDays,
  Users,
  ArrowRight,
  GripVertical,
  Edit,
  Trash2,
  ListChecks,
  ChevronDown,
} from "lucide-react";
import { Project, UpdateProjectPayload } from "@/lib/api/projectsApi";

interface KanbanViewProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onTeam: (project: Project) => void;
  onMilestones: (project: Project) => void;
  onUpdateStatus: (id: string, payload: UpdateProjectPayload) => void;
}

type StatusColumn = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";

const COLUMNS: {
  key: StatusColumn;
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  headerBg: string;
}[] = [
  {
    key: "PLANNING",
    label: "Planning",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    dotColor: "bg-purple-500",
    headerBg: "border-purple-300",
  },
  {
    key: "ACTIVE",
    label: "Active",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    dotColor: "bg-emerald-500",
    headerBg: "border-emerald-300",
  },
  {
    key: "ON_HOLD",
    label: "On Hold",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    dotColor: "bg-amber-500",
    headerBg: "border-amber-300",
  },
  {
    key: "COMPLETED",
    label: "Completed",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    dotColor: "bg-blue-500",
    headerBg: "border-blue-300",
  },
];

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onTeam,
  onMilestones,
  onMoveStatus,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onTeam: () => void;
  onMilestones: () => void;
  onMoveStatus: (status: StatusColumn) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const otherStatuses = COLUMNS.filter((c) => c.key !== project.status);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Card Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <GripVertical
              size={14}
              className="text-gray-300 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {project.name}
              </h4>
              {project.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal size={14} className="text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-40">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onTeam();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Users size={14} /> Team
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onMilestones();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ListChecks size={14} /> Milestones
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 pb-3 pt-1 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {project.client?.name && (
            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md text-[10px] font-medium">
              {project.client.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays size={11} />
            {new Date(project.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Move Status */}
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <ArrowRight size={11} />
            Move
            <ChevronDown size={10} />
          </button>
          {showMoveMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMoveMenu(false)}
              />
              <div className="absolute right-0 bottom-7 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36">
                {otherStatuses.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => {
                      setShowMoveMenu(false);
                      onMoveStatus(col.key);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${col.dotColor}`}
                    />
                    {col.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KanbanView({
  projects,
  onEdit,
  onDelete,
  onTeam,
  onMilestones,
  onUpdateStatus,
}: KanbanViewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {COLUMNS.map((col) => {
        const colProjects = projects.filter((p) => p.status === col.key);
        return (
          <div
            key={col.key}
            className="flex-1 min-w-[280px] max-w-[340px] flex flex-col"
          >
            {/* Column Header */}
            <div
              className={`rounded-t-xl px-4 py-3 border-t-[3px] ${col.headerBg} bg-white border-x border-b border-gray-100`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}
                  />
                  <h3 className={`text-sm font-bold ${col.color}`}>
                    {col.label}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bgColor} ${col.color}`}
                >
                  {colProjects.length}
                </span>
              </div>
            </div>

            {/* Column Body */}
            <div className="flex-1 bg-gray-50/50 rounded-b-xl border border-t-0 border-gray-100 p-3 space-y-3 min-h-[200px]">
              {colProjects.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  No projects
                </div>
              ) : (
                colProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={() => onEdit(project)}
                    onDelete={() => onDelete(project)}
                    onTeam={() => onTeam(project)}
                    onMilestones={() => onMilestones(project)}
                    onMoveStatus={(status) =>
                      onUpdateStatus(project.id, { status })
                    }
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
