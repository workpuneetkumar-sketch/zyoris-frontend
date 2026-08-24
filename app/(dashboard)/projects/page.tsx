"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  FolderKanban,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  X,
  LayoutGrid,
  List,
  GanttChart,
  Flag,
} from "lucide-react";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
} from "@/lib/api/projectsApi";

import { Skeleton } from "@/components/projects/SharedComponents";
import ProjectFormModal from "@/components/projects/ProjectFormModal";
import MilestonesModal from "@/components/projects/MilestonesModal";
import TeamModal from "@/components/projects/TeamMembersModal";

import KanbanView from "@/components/projects/KanbanView";
import ListView from "@/components/projects/ListView";
import TimelineView from "@/components/projects/TimelineView";
import MilestonesView from "@/components/projects/MilestonesView";

// ── View Types ──────────────────────────────────────────────

type ViewKey = "kanban" | "list" | "timeline" | "milestones";

const VIEW_TABS: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "kanban", label: "Kanban", icon: LayoutGrid },
  { key: "list", label: "List", icon: List },
  { key: "timeline", label: "Timeline", icon: GanttChart },
  { key: "milestones", label: "Milestones", icon: Flag },
];

// ── Main Page ───────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("kanban");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ── Data Loading ──────────────────────────────────────────

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

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── CRUD Handlers ─────────────────────────────────────────

  const handleCreate = async (payload: CreateProjectPayload) => {
    try {
      const newProject = await createProject(payload);
      setProjects((prev) => [newProject, ...prev]);
      setShowCreateModal(false);
      showToast("success", "Project created successfully");
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err.message || "Something went wrong";
      showToast("error", message);
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
      const message =
        err?.response?.data?.message || err.message || "Something went wrong";
      showToast("error", message);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    payload: UpdateProjectPayload
  ) => {
    // Optimistic update for instant 0ms UI feedback
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
    );
    try {
      await updateProject(id, payload);
    } catch (err: any) {
      loadProjects(); // rollback on error
      const message =
        err?.response?.data?.message || err.message || "Something went wrong";
      showToast("error", message);
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
      const message =
        err?.response?.data?.message || err.message || "Something went wrong";
      showToast("error", message);
    }
  };

  // ── Shared action callbacks for views ─────────────────────

  const openEdit = (project: Project) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const openDelete = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const openTeam = (project: Project) => {
    setSelectedProject(project);
    setShowTeamModal(true);
  };

  const openMilestones = (project: Project) => {
    setSelectedProject(project);
    setShowMilestonesModal(true);
  };

  // ── Filtering ─────────────────────────────────────────────

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "ACTIVE").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    planning: projects.filter((p) => p.status === "PLANNING").length,
    onHold: projects.filter((p) => p.status === "ON_HOLD").length,
  };

  // ── Render ────────────────────────────────────────────────

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
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70"
          >
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
          <p className="text-sm text-gray-500 mt-1">
            Manage all your projects and teams
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
        >
          <Plus size={18} />
          Create Project
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: FolderKanban,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Active",
            value: stats.active,
            icon: BarChart3,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Planning",
            value: stats.planning,
            icon: Clock,
            color: "text-purple-600 bg-purple-50",
          },
          {
            label: "On Hold",
            value: stats.onHold,
            icon: PauseCircle,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle,
            color: "text-blue-600 bg-blue-50",
          },
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

      {/* View Switcher + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* View Tabs */}
        <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
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
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <button
            onClick={loadProjects}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Content Area */}
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
          <button
            onClick={loadProjects}
            className="mt-4 text-indigo-600 font-semibold"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {activeView === "kanban" && (
            <KanbanView
              projects={filteredProjects}
              onEdit={openEdit}
              onDelete={openDelete}
              onTeam={openTeam}
              onMilestones={openMilestones}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
          {activeView === "list" && (
            <ListView
              projects={filteredProjects}
              onEdit={openEdit}
              onDelete={openDelete}
              onTeam={openTeam}
              onMilestones={openMilestones}
            />
          )}
          {activeView === "timeline" && (
            <TimelineView
              projects={filteredProjects}
              onEdit={openEdit}
            />
          )}
          {activeView === "milestones" && (
            <MilestonesView
              projects={filteredProjects}
              onOpenMilestonesModal={openMilestones}
            />
          )}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}

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

      {showDeleteModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Project
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete &ldquo;{selectedProject.name}
              &rdquo;? This action cannot be undone.
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

      {showTeamModal && selectedProject && (
        <TeamModal
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => {
            setShowTeamModal(false);
            setSelectedProject(null);
          }}
          showToast={showToast}
          onMemberAdded={() => {
            // optional refresh
          }}
        />
      )}
    </div>
  );
}