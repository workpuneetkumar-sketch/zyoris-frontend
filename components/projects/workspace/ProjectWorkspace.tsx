"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Project,
  ProjectTask,
  ProjectPage,
  ProjectFile,
  ProjectMemberWithUser,
  getProjectById,
  getProjectTasks,
  getProjectPages,
  getProjectFiles,
  getProjectMembers,
  createProjectPage,
  linkProjectFile,
  updateProject,
} from "@/lib/api/projectsApi";
import {
  WorkspaceDatabase,
  WorkspacePage as IWorkspacePage,
} from "@/types/workspace";
import {
  getWorkspacePageDatabase,
  createWorkspaceDatabase,
  getWorkspacePage,
} from "@/lib/api/workspaceApi";
import { StatusBadge } from "@/components/projects/SharedComponents";
import { ProjectDatabaseTable } from "./ProjectDatabaseTable";
import { ProjectTaskCreateModal } from "./ProjectTaskCreateModal";
import TeamMembersModal from "@/components/projects/TeamMembersModal";
import MilestonesModal from "@/components/projects/MilestonesModal";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Paperclip,
  Database as DatabaseIcon,
  Activity as ActivityIcon,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Flag,
  Clock,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Download,
  FileCode,
  FileSpreadsheet,
  FileImage,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Smile,
} from "lucide-react";

export type WorkspaceTabKey =
  | "overview"
  | "tasks"
  | "pages"
  | "files"
  | "database"
  | "activity";

interface ProjectWorkspaceProps {
  initialProject: Project;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  initialProject,
}) => {
  const router = useRouter();
  const [project, setProject] = useState<Project>(initialProject);
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>("overview");
  const [loading, setLoading] = useState(false);

  // Tab Data States
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("ALL");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("ALL");
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");

  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>("");

  const [members, setMembers] = useState<ProjectMemberWithUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Database Tab State
  const [database, setDatabase] = useState<WorkspaceDatabase | null>(null);
  const [dbPageId, setDbPageId] = useState<string | null>(null);
  const [loadingDatabase, setLoadingDatabase] = useState(false);
  const [isInitializingDb, setIsInitializingDb] = useState(false);

  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageIcon, setNewPageIcon] = useState("📄");
  const [isCreatingPageSubmitting, setIsCreatingPageSubmitting] = useState(false);

  const [isLinkFileOpen, setIsLinkFileOpen] = useState(false);
  const [fileUploadId, setFileUploadId] = useState("");
  const [isLinkingFileSubmitting, setIsLinkingFileSubmitting] = useState(false);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);

  // ── Reload Project Details ──────────────────────────────────────────────
  const refreshProject = useCallback(async () => {
    try {
      const refreshed = await getProjectById(project.id);
      setProject(refreshed);
    } catch (err) {
      console.error("Failed to refresh project:", err);
    }
  }, [project.id]);

  // ── Fetch Tasks ─────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const params: any = {};
      if (taskStatusFilter !== "ALL") params.status = taskStatusFilter;
      if (taskPriorityFilter !== "ALL") params.priority = taskPriorityFilter;
      const data = await getProjectTasks(project.id, params);
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch project tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [project.id, taskStatusFilter, taskPriorityFilter]);

  // ── Fetch Pages ─────────────────────────────────────────────────────────
  const fetchPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const data = await getProjectPages(project.id);
      setPages(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch project pages:", err);
      return [];
    } finally {
      setLoadingPages(false);
    }
  }, [project.id]);

  // ── Fetch Files ─────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const params: any = {};
      if (fileSearchQuery.trim()) params.search = fileSearchQuery.trim();
      const data = await getProjectFiles(project.id, params);
      setFiles(data);
    } catch (err) {
      console.error("Failed to fetch project files:", err);
    } finally {
      setLoadingFiles(false);
    }
  }, [project.id, fileSearchQuery]);

  // ── Fetch Members ───────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await getProjectMembers(project.id);
      setMembers(data);
    } catch (err) {
      console.error("Failed to fetch project members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [project.id]);

  // ── Fetch / Locate Project Database ─────────────────────────────────────
  const fetchDatabase = useCallback(async (projectPages?: ProjectPage[]) => {
    setLoadingDatabase(true);
    try {
      const pList = projectPages || (await getProjectPages(project.id));
      // Look for a page that might have a database or has title 'Database' or has an icon with database
      const dbCandidate =
        pList.find(
          (p) =>
            p.title?.toLowerCase().includes("database") ||
            p.icon === "🗄️" ||
            p.icon === "📊"
        ) || pList[0];

      if (dbCandidate) {
        setDbPageId(dbCandidate.id);
        try {
          const db = await getWorkspacePageDatabase(dbCandidate.id);
          if (db) {
            setDatabase(db);
            return;
          }
        } catch (e) {
          // Inline database might not yet exist for this page
        }
      }
      setDatabase(null);
    } catch (err) {
      console.error("Failed to fetch project database:", err);
    } finally {
      setLoadingDatabase(false);
    }
  }, [project.id]);

  // ── Initialize Project Database ─────────────────────────────────────────
  const handleInitializeDatabase = async () => {
    setIsInitializingDb(true);
    try {
      let targetPageId = dbPageId;
      if (!targetPageId) {
        // Create a documentation page under project for the database
        const newPage = await createProjectPage(project.id, {
          title: `${project.name} Database`,
          icon: "🗄️",
        });
        targetPageId = newPage.id;
        setDbPageId(targetPageId);
        setPages((prev) => [newPage, ...prev]);
      }

      // Initialize database on page via POST /workspace/pages/:pageId/database
      const newDb = await createWorkspaceDatabase(targetPageId, {
        name: `${project.name} Database`,
      });
      setDatabase(newDb);
    } catch (err) {
      console.error("Failed to initialize database:", err);
    } finally {
      setIsInitializingDb(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    fetchTasks();
    fetchPages().then((pList) => fetchDatabase(pList));
    fetchFiles();
    fetchMembers();
  }, [fetchTasks, fetchPages, fetchFiles, fetchMembers, fetchDatabase]);

  // ── Create Page Handler ─────────────────────────────────────────────────
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    setIsCreatingPageSubmitting(true);
    try {
      const created = await createProjectPage(project.id, {
        title: newPageTitle.trim(),
        icon: newPageIcon || "📄",
      });
      setPages((prev) => [created, ...prev]);
      setNewPageTitle("");
      setNewPageIcon("📄");
      setIsCreatePageOpen(false);
      refreshProject();
    } catch (err: any) {
      console.error("Failed to create project page:", err);
    } finally {
      setIsCreatingPageSubmitting(false);
    }
  };

  // ── Link File Handler ───────────────────────────────────────────────────
  const handleLinkFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUploadId.trim()) return;

    setIsLinkingFileSubmitting(true);
    try {
      const linked = await linkProjectFile(project.id, {
        fileUploadId: fileUploadId.trim(),
      });
      setFiles((prev) => [linked, ...prev]);
      setFileUploadId("");
      setIsLinkFileOpen(false);
      refreshProject();
    } catch (err: any) {
      console.error("Failed to link file:", err);
    } finally {
      setIsLinkingFileSubmitting(false);
    }
  };

  // ── Filtered Tasks ──────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks, taskSearchQuery]);

  // Counts breakdown
  const taskCounts = useMemo(() => {
    const todo = tasks.filter((t) => t.status === "TODO").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    return { todo, inProgress, done, total: tasks.length };
  }, [tasks]);

  const completionPercent = useMemo(() => {
    if (taskCounts.total === 0) return 0;
    return Math.round((taskCounts.done / taskCounts.total) * 100);
  }, [taskCounts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Breadcrumb & Top Navigation ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Link
            href="/projects"
            className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Projects</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {project.name}
          </span>
          {project.key && (
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] text-slate-600 dark:text-slate-300">
              {project.key}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team ({members.length})</span>
          </button>
          <button
            onClick={() => setIsMilestonesModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Milestones ({project.milestones?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* ── Project Workspace Hero Header ──────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>

            {project.description && (
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(project.startDate).toLocaleDateString()}
                  {project.endDate ? ` – ${new Date(project.endDate).toLocaleDateString()}` : ""}
                </span>
              </span>

              {project.client?.name && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Client: {project.client.name}</span>
                </span>
              )}

              {project.budget && (
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Budget: {project.currency || "$"}{Number(project.budget).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions & Progress */}
          <div className="flex flex-col items-start md:items-end gap-3 min-w-[220px]">
            <div className="w-full bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Completion</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{completionPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setIsCreateTaskOpen(true)}
              className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* ── Tabs Navigation Bar ────────────────────────────────────────── */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-1 md:space-x-2 overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: LayoutDashboard, count: null },
            { key: "tasks", label: "Tasks", icon: CheckSquare, count: taskCounts.total },
            { key: "pages", label: "Pages", icon: FileText, count: pages.length },
            { key: "files", label: "Files", icon: Paperclip, count: files.length },
            { key: "database", label: "Database", icon: DatabaseIcon, count: database?.rows?.length ?? null },
            { key: "activity", label: "Activity", icon: ActivityIcon, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as WorkspaceTabKey)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 dark:bg-black/10 text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Real Metrics KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Total Tasks</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {project.counts?.tasks ?? tasks.length}
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                <span className="text-emerald-600 font-bold">{taskCounts.done} done</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">{taskCounts.inProgress} active</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Docs & Pages</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {project.counts?.pages ?? pages.length}
              </p>
              <p className="text-[10px] text-slate-500">Documentation & guides</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Project Files</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {project.counts?.files ?? files.length}
              </p>
              <p className="text-[10px] text-slate-500">Assets and attachments</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Team Members</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {project.counts?.members ?? members.length}
              </p>
              <p className="text-[10px] text-slate-500">Active contributors</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Milestones</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {project.counts?.milestones ?? project.milestones?.length ?? 0}
              </p>
              <p className="text-[10px] text-slate-500">Scheduled milestones</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Tasks List */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Project Tasks Overview
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
                >
                  <span>View All Tasks</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <p className="text-xs text-slate-400">No tasks created under this project yet.</p>
                  <button
                    onClick={() => setIsCreateTaskOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Create First Task
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tasks.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            t.status === "DONE"
                              ? "bg-emerald-500"
                              : t.status === "IN_PROGRESS"
                              ? "bg-blue-500"
                              : "bg-slate-300"
                          }`}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {t.priority}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Members Snapshot */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Team Members
                  </h3>
                </div>
                <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Manage
                </button>
              </div>

              {members.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No members added yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {members.map((m) => (
                    <div
                      key={m.id || m.userId}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase">
                          {m.user?.name?.[0] || m.user?.email?.[0] || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {m.user?.name || m.user?.email || m.userId}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {m.user?.email}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {m.role || "MEMBER"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TASKS ───────────────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter tasks by name..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>

              {/* Priority Filter */}
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreateTaskOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>

          {/* Tasks Grid / Board */}
          {loadingTasks ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-xs">Loading project tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No tasks found
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create a task under this project. Tasks created here automatically inherit this project ID.
              </p>
              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["TODO", "IN_PROGRESS", "DONE"] as const).map((colStatus) => {
                const colTasks = filteredTasks.filter((t) => t.status === colStatus);
                const colTitle =
                  colStatus === "TODO"
                    ? "To Do"
                    : colStatus === "IN_PROGRESS"
                    ? "In Progress"
                    : "Done";
                const badgeColor =
                  colStatus === "DONE"
                    ? "bg-emerald-100 text-emerald-700"
                    : colStatus === "IN_PROGRESS"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-700";

                return (
                  <div
                    key={colStatus}
                    className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {colTitle}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {colTasks.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {colTasks.map((t) => (
                        <div
                          key={t.id}
                          className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 shadow-xs space-y-2 hover:border-blue-400 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                              {t.title}
                            </h5>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                t.priority === "HIGH"
                                  ? "bg-red-100 text-red-700"
                                  : t.priority === "MEDIUM"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {t.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-50 dark:border-slate-700/60">
                            <span>
                              {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No due date"}
                            </span>
                            {t.assignedTo && (
                              <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                                {t.assignedTo.name || t.assignedTo.email}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PAGES ───────────────────────────────────────────────── */}
      {activeTab === "pages" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Project Documentation & Specs
              </h3>
              <p className="text-xs text-slate-500">
                Documentation pages created specifically for this project.
              </p>
            </div>
            <button
              onClick={() => setIsCreatePageOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Page</span>
            </button>
          </div>

          {loadingPages ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-xs">Loading pages...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No documentation pages yet
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Organize requirements, system designs, and user guides inside this project.
              </p>
              <button
                onClick={() => setIsCreatePageOpen(true)}
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Page</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  href={`/workspace/pages/${p.id}`}
                  className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-500 hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{p.icon || "📄"}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {p.title || "Untitled Page"}
                    </h4>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Created</span>
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: FILES ───────────────────────────────────────────────── */}
      {activeTab === "files" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={() => setIsLinkFileOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Existing File</span>
            </button>
          </div>

          {loadingFiles ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-xs">Loading project files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Paperclip className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No files linked to this project
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Link existing uploaded documents, design briefs, or spreadsheets.
              </p>
              <button
                onClick={() => setIsLinkFileOpen(true)}
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link File</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="p-3">File Name</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Linked Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                        <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{file.originalName || file.fileName}</span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-[140px]">
                        {file.mimeType}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        {file.url ? (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-blue-600 hover:underline font-semibold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">Available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: DATABASE ────────────────────────────────────────────── */}
      {activeTab === "database" && (
        <div className="space-y-4">
          {loadingDatabase ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-xs">Loading project database...</p>
            </div>
          ) : database ? (
            <ProjectDatabaseTable
              database={database}
              onRefresh={() => fetchDatabase()}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mx-auto">
                <DatabaseIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Initialize Project Database
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Attach an inline database table to manage structured asset lists, test cases, feature matrices, or customer registries under this project.
                </p>
              </div>
              <button
                onClick={handleInitializeDatabase}
                disabled={isInitializingDb}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
              >
                {isInitializingDb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Initialize Project Database</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 6: ACTIVITY ────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <ActivityIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Project Activity Feed
            </h3>
          </div>

          <div className="relative pl-6 space-y-6 border-l-2 border-slate-100 dark:border-slate-800">
            {/* Project Created Event */}
            <div className="relative space-y-1">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Project Initialized
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Created under key <span className="font-mono">{project.key || "PRJ"}</span> with status{" "}
                <span className="font-semibold">{project.status}</span>.
              </p>
            </div>

            {/* Milestones events */}
            {project.milestones?.map((ms) => (
              <div key={ms.id} className="relative space-y-1">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900" />
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Milestone: {ms.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Due {new Date(ms.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Status: {ms.status}
                </p>
              </div>
            ))}

            {/* Tasks events */}
            {tasks.slice(0, 5).map((t) => (
              <div key={t.id} className="relative space-y-1">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Task Created: {t.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Inherited project ID <span className="font-mono text-blue-600">{project.id}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      <ProjectTaskCreateModal
        isOpen={isCreateTaskOpen}
        projectId={project.id}
        projectName={project.name}
        members={members}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={(newTask) => {
          setTasks((prev) => [newTask, ...prev]);
          refreshProject();
        }}
      />

      {/* Create Page Modal */}
      {isCreatePageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Create Project Documentation Page
            </h3>
            <form onSubmit={handleCreatePage} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Icon
                </label>
                <div className="flex gap-2">
                  {["📄", "📝", "🚀", "💡", "📊", "🗄️", "⚡"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewPageIcon(emoji)}
                      className={`text-xl p-1.5 rounded-lg border ${
                        newPageIcon === emoji
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/40"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Page Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architecture Overview"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePageOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPageSubmitting || !newPageTitle.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {isCreatingPageSubmitting ? "Creating..." : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link File Modal */}
      {isLinkFileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Link File to Project
            </h3>
            <form onSubmit={handleLinkFile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  File Upload ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter fileUploadId"
                  value={fileUploadId}
                  onChange={(e) => setFileUploadId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkFileOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinkingFileSubmitting || !fileUploadId.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {isLinkingFileSubmitting ? "Linking..." : "Link File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {isTeamModalOpen && (
        <TeamMembersModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => {
            setIsTeamModalOpen(false);
            fetchMembers();
            refreshProject();
          }}
          showToast={() => {}}
          onMemberAdded={() => {
            fetchMembers();
            refreshProject();
          }}
        />
      )}

      {/* Milestones Modal */}
      {isMilestonesModalOpen && (
        <MilestonesModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => {
            setIsMilestonesModalOpen(false);
            refreshProject();
          }}
          showToast={() => {}}
        />
      )}
    </div>
  );
};
