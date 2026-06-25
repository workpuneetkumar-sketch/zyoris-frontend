"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  FolderKanban,
  CalendarDays,
  Users,
  BarChart3,
  Clock,
  Trash2,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
  ListChecks,
} from "lucide-react";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getEmployees,
  getProjectMembers,
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
} from "@/lib/api/projectsApi";

import { StatusBadge, ProgressBar, Skeleton } from "@/components/projects/SharedComponents";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import MilestonesModal from "@/components/projects/MilestonesModal";
import TeamModal from "@/components/projects/TeamMembersModal";

export default function ProjectsPage() {
  // Core state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Selected project
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Employee map: userId -> { name, email }
  const [employeeMap, setEmployeeMap] = useState<
    Record<string, { name: string; email: string }>
  >({});

  // Project members: projectId -> Member[]
  const [projectMembers, setProjectMembers] = useState<
    Record<string, Array<{ id: string; name: string; email: string }>>
  >({});

  // ── Load projects ──────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ── Load employees once ────────────────────────────────────────────
  useEffect(() => {
    async function loadEmployees() {
      try {
        const employees = await getEmployees();
        const map: Record<string, { name: string; email: string }> = {};
        employees.forEach((emp: any) => {
          if (emp.user) {
            map[emp.userId] = {
              name: emp.user.name,
              email: emp.user.email,
            };
          }
        });
        setEmployeeMap(map);
      } catch (err) {
        // Silently fail; members will show only IDs
      }
    }
    loadEmployees();
  }, []);

  // ── Load members for all projects ──────────────────────────────────
  useEffect(() => {
    if (projects.length === 0) return;

    async function loadMembers() {
      const membersMap: typeof projectMembers = {};
      await Promise.all(
        projects.map(async (project) => {
          try {
            const members = await getProjectMembers(project.id);
            const detailedMembers = members
              .map((m: any) => ({
                id: m.userId,
                name: employeeMap[m.userId]?.name || m.user?.name || "Unknown",
                email: employeeMap[m.userId]?.email || m.user?.email || "",
              }))
              .filter((m) => m.name !== "Unknown" || m.email);
            membersMap[project.id] = detailedMembers;
          } catch {
            membersMap[project.id] = [];
          }
        })
      );
      setProjectMembers(membersMap);
    }

    loadMembers();
  }, [projects, employeeMap]);

  // ── Refresh a single project's members (local update after add) ──
  const refreshProjectMembers = useCallback(
    (projectId: string, newMember?: { id: string; name: string; email: string }) => {
      if (newMember) {
        // Append the new member to the existing list
        setProjectMembers((prev) => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), newMember],
        }));
      } else {
        // Optionally re-fetch from API if needed, but we rely on local updates
        // You can call getProjectMembers again if desired, but we skip for reliability.
      }
    },
    []
  );

  // ── Filtering ──────────────────────────────────────────────────────
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Summary stats ──────────────────────────────────────────────────
  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "ACTIVE").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    pending: projects.filter((p) => p.status === "PENDING").length,
  };

  // ── Toast helper ───────────────────────────────────────────────────
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── CRUD Actions ───────────────────────────────────────────────────
  const handleCreate = async (payload: CreateProjectPayload) => {
    try {
      const newProject = await createProject(payload);
      setProjects((prev) => [newProject, ...prev]);
      setShowCreateModal(false);
      showToast("success", "Project created successfully");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleUpdate = async (id: string, payload: UpdateProjectPayload) => {
    try {
      const updated = await updateProject(id, payload);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
      );
      setShowEditModal(false);
      setSelectedProject(null);
      showToast("success", "Project updated successfully");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      await deleteProject(selectedProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== selectedProject.id));
      setShowDeleteModal(false);
      setSelectedProject(null);
      showToast("success", "Project deleted successfully");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-indigo-600" />
            Projects
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all your projects and teams</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
        >
          <Plus size={18} />
          Create Project
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Projects", value: stats.total, icon: FolderKanban, color: "text-indigo-600 bg-indigo-50" },
          { label: "Active", value: stats.active, icon: BarChart3, color: "text-emerald-600 bg-emerald-50" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-blue-600 bg-blue-50" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600 bg-amber-50" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 text-sm font-medium bg-white cursor-pointer"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={loadProjects}
          disabled={loading}
          className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Project List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={loadProjects} className="mt-4 text-indigo-600 font-semibold">
            Try again
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No projects found</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
            className="mt-2 text-indigo-600 font-semibold"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Project Name", "Client", "Status", "Progress", "Team", "Start", "End", ""].map(
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
                {filteredProjects.map((project) => {
                  const members = projectMembers[project.id] || [];
                  return (
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
                      <td className="px-5 py-4 w-32">
                        <div className="flex items-center gap-2">
                          <ProgressBar progress={project.progress} />
                          <span className="text-xs text-gray-600">{project.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Users className="w-4 h-4 text-gray-400 shrink-0" />
                          {members.length > 0 ? (
                            members.slice(0, 3).map((member, idx) => (
                              <span
                                key={member.id}
                                className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-xs"
                                title={member.email}
                              >
                                {member.name}
                                {idx < Math.min(members.length, 3) - 1 ? "," : ""}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">
                              {project.memberCount ?? project.members?.length ?? 0}
                            </span>
                          )}
                          {members.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{members.length - 3}
                            </span>
                          )}
                        </div>
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
                            onClick={() => {
                              setSelectedProject(project);
                              setShowMilestonesModal(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="Milestones"
                          >
                            <ListChecks size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setShowTeamModal(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="Team"
                          >
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredProjects.map((project) => {
              const members = projectMembers[project.id] || [];
              return (
                <div key={project.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.client?.name || project.clientId || "—"}</p>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span>
                      {new Date(project.startDate).toLocaleDateString()}
                      {project.endDate && ` – ${new Date(project.endDate).toLocaleDateString()}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar progress={project.progress} />
                    <span className="text-xs text-gray-600">{project.progress || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                      <Users className="w-3.5 h-3.5" />
                      {members.length > 0 ? (
                        members.map((member) => (
                          <span
                            key={member.id}
                            className="bg-gray-100 px-1.5 py-0.5 rounded text-xs"
                            title={member.email}
                          >
                            {member.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs">
                          {project.memberCount ?? project.members?.length ?? 0}
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowMilestonesModal(true);
                        }}
                        className="p-1.5 text-gray-500"
                      >
                        <ListChecks size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowTeamModal(true);
                        }}
                        className="p-1.5 text-gray-500"
                      >
                        <Users size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowEditModal(true);
                        }}
                        className="p-1.5 text-gray-500"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Create / Edit Project Modal */}
      {(showCreateModal || showEditModal) && (
        <ProjectFormModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedProject(null);
          }}
          onSubmit={(payload) => {
            if (showEditModal && selectedProject) {
              handleUpdate(selectedProject.id, payload);
            } else {
              handleCreate(payload as CreateProjectPayload);
            }
          }}
          initialData={showEditModal ? selectedProject : undefined}
          loading={false}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete “{selectedProject.name}”? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestones Modal */}
      {showMilestonesModal && selectedProject && (
        <MilestonesModal
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => {
            setShowMilestonesModal(false);
            setSelectedProject(null);
          }}
          showToast={showToast}
        />
      )}

      {/* Team Modal */}
      {showTeamModal && selectedProject && (
        <TeamModal
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          currentMembers={projectMembers[selectedProject.id] || []}
          onClose={() => {
            setShowTeamModal(false);
            setSelectedProject(null);
          }}
          showToast={showToast}
          onMemberAdded={(newMember) =>
            refreshProjectMembers(selectedProject.id, newMember)
          }
        />
      )}
    </div>
  );
}