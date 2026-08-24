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
  isDragging,
  isJustDropped,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onTeam,
  onMilestones,
  onMoveStatus,
}: {
  project: Project;
  isDragging: boolean;
  isJustDropped: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
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
    <div
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing group ${
        isDragging
          ? "opacity-40 scale-95 rotate-2 border-indigo-400 shadow-2xl ring-4 ring-indigo-500/20"
          : isJustDropped
          ? "border-emerald-400 ring-2 ring-emerald-400/50 animate-in zoom-in-95 duration-300 shadow-md"
          : "border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300"
      }`}
    >
      {/* Card Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <GripVertical
              size={14}
              className="text-gray-300 mt-1 shrink-0 group-hover:text-indigo-500 transition-colors"
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
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal size={14} className="text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-40">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onTeam();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Users size={14} /> Team
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onMilestones();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ListChecks size={14} /> Milestones
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu(!showMoveMenu);
            }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoveMenu(false);
                }}
              />
              <div className="absolute right-0 bottom-7 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36">
                {otherStatuses.map((col) => (
                  <button
                    key={col.key}
                    onClick={(e) => {
                      e.stopPropagation();
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
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<StatusColumn | null>(null);
  const [justDroppedProjectId, setJustDroppedProjectId] = useState<string | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {COLUMNS.map((col) => {
        const colProjects = projects.filter((p) => p.status === col.key);
        const isColOver = dragOverCol === col.key;

        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverCol(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCol(null);
              const projId = e.dataTransfer.getData("text/plain") || draggedProjectId;
              if (projId) {
                onUpdateStatus(projId, { status: col.key });
                setJustDroppedProjectId(projId);
                setTimeout(() => setJustDroppedProjectId(null), 600);
              }
              setDraggedProjectId(null);
            }}
            className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col rounded-xl border transition-all duration-300 ${
              isColOver
                ? "bg-indigo-50/80 border-indigo-400 ring-4 ring-indigo-400/20 scale-[1.01] shadow-lg shadow-indigo-100/50"
                : "bg-gray-50/50 border-gray-100"
            }`}
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
            <div className="flex-1 p-3 space-y-3 min-h-[200px] flex flex-col">
              {colProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isDragging={draggedProjectId === project.id}
                  isJustDropped={justDroppedProjectId === project.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", project.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedProjectId(project.id);
                  }}
                  onDragEnd={() => {
                    setDraggedProjectId(null);
                    setDragOverCol(null);
                  }}
                  onEdit={() => onEdit(project)}
                  onDelete={() => onDelete(project)}
                  onTeam={() => onTeam(project)}
                  onMilestones={() => onMilestones(project)}
                  onMoveStatus={(status) =>
                    onUpdateStatus(project.id, { status })
                  }
                />
              ))}

              {isColOver && draggedProjectId && (
                <div className="border-2 border-dashed border-indigo-400 rounded-xl p-3 bg-indigo-100/40 text-indigo-700 text-xs font-bold text-center animate-pulse transition-all">
                  Drop project here
                </div>
              )}

              {colProjects.length === 0 && !isColOver && (
                <div className="flex items-center justify-center h-24 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  No projects
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
