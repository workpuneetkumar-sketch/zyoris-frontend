"use client";

import React from "react";
import {
  CalendarDays,
  Users,
  Trash2,
  Edit,
  ListChecks,
  FolderKanban,
} from "lucide-react";
import { Project } from "@/lib/api/projectsApi";
import { StatusBadge } from "@/components/projects/SharedComponents";

interface ListViewProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onTeam: (project: Project) => void;
  onMilestones: (project: Project) => void;
}

export default function ListView({
  projects,
  onEdit,
  onDelete,
  onTeam,
  onMilestones,
}: ListViewProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
        <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">No projects found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Project Name", "Client", "Status", "Start", "End", ""].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-900">{project.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {project.description || "—"}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm text-gray-700">
                  {project.client?.name || project.clientId || "—"}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {new Date(project.startDate).toLocaleDateString()}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTeam(project)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="Team"
                    >
                      <Users size={16} />
                    </button>
                    <button
                      onClick={() => onMilestones(project)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="Milestones"
                    >
                      <ListChecks size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(project)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(project)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {projects.map((project) => (
          <div key={project.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{project.name}</p>
                <p className="text-xs text-gray-500">
                  {project.client?.name || project.clientId || "—"}
                </p>
              </div>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <span>
                {new Date(project.startDate).toLocaleDateString()}
                {project.endDate &&
                  ` – ${new Date(project.endDate).toLocaleDateString()}`}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onTeam(project)}
                className="p-1.5 text-gray-500"
                title="Team"
              >
                <Users size={16} />
              </button>
              <button
                onClick={() => onMilestones(project)}
                className="p-1.5 text-gray-500"
                title="Milestones"
              >
                <ListChecks size={16} />
              </button>
              <button
                onClick={() => onEdit(project)}
                className="p-1.5 text-gray-500"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete(project)}
                className="p-1.5 text-red-500"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
