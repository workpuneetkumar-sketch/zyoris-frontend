"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMyTasks } from "@/hooks/useMyTasks";
import { useAuth } from "@/context/AuthContext";
import { CreatePageModal } from "@/components/workspace/CreatePageModal";
import { Project, getProjects } from "@/lib/api/projectsApi";
import { Task, TaskStatus } from "@/lib/api/tasksApi";
import {
  FileText,
  Plus,
  CheckSquare,
  Clock,
  FolderKanban,
  Search,
  ChevronDown,
  ChevronUp,
  Folder,
  ArrowRight,
  AlertCircle,
  Calendar,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function WorkspaceHomePage() {
  const { pageTree, isLoading: isPagesLoading, refetchTree } = useWorkspace();
  const { user } = useAuth();
  const myTasksState = useMyTasks(user?.id);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Creation modal & search state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"document" | "folder" | "database">("document");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllPages, setShowAllPages] = useState(false);

  // Refresh page tree on load
  useEffect(() => {
    refetchTree();
  }, [refetchTree]);

  // Load projects from existing backend API
  const fetchProjects = React.useCallback(async () => {
    setIsProjectsLoading(true);
    setProjectsError(null);
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Could not load workspace projects:", err);
      setProjectsError("Could not load projects.");
    } finally {
      setIsProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Extract flat list of pages from hierarchy, sorted by most recent first
  const allPages = useMemo(() => {
    const pages: {
      id: string;
      title: string;
      icon?: string | null;
      isFolder?: boolean;
      isDatabase?: boolean;
      isWiki?: boolean;
      updatedAt?: string;
      createdAt?: string;
    }[] = [];
    const seen = new Set<string>();

    const traverse = (nodes: typeof pageTree) => {
      nodes.forEach((n) => {
        if (n.id && n.id !== "[id]" && !n.id.includes("[id]") && !seen.has(n.id)) {
          seen.add(n.id);
          pages.push({
            id: n.id,
            title: n.title,
            icon: n.icon,
            isFolder: !!n.isFolder,
            isDatabase: !!n.isDatabase,
            isWiki: !!n.isWiki,
            updatedAt: n.updatedAt,
            createdAt: n.createdAt,
          });
        }
        if (n.children && n.children.length > 0) traverse(n.children);
      });
    };
    traverse(pageTree);

    // Sort by most recent updated/created first
    pages.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return pages;
  }, [pageTree]);

  // Filter pages by search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return allPages;
    const query = searchQuery.toLowerCase().trim();
    return allPages.filter((p) => (p.title || "Untitled Page").toLowerCase().includes(query));
  }, [allPages, searchQuery]);

  // Display top 12 by default, or all if toggled or searching
  const displayedPages = useMemo(() => {
    if (showAllPages || searchQuery.trim()) return filteredPages;
    return filteredPages.slice(0, 12);
  }, [filteredPages, showAllPages, searchQuery]);

  // Sort and select top 5 actionable assigned tasks for first viewport
  const prioritizedTasks = useMemo(() => {
    const tasks = [...myTasksState.tasks];
    // Sort: overdue first, then due today, then upcoming, then completed
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

    const getScore = (t: Task) => {
      if (t.status === "DONE") return 4;
      if (!t.dueDate) return 3;
      const due = new Date(t.dueDate).getTime();
      if (due < startOfToday) return 1; // overdue
      if (due <= endOfToday) return 2; // due today
      return 3; // upcoming
    };

    tasks.sort((a, b) => {
      const scoreDiff = getScore(a) - getScore(b);
      if (scoreDiff !== 0) return scoreDiff;
      // Secondary sort: earliest due date first
      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return timeA - timeB;
    });

    return tasks.slice(0, 5);
  }, [myTasksState.tasks]);

  const handleOpenCreateModal = (type: "document" | "folder" | "database" = "document") => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const formatDueDate = (dateStr?: string | null, status?: TaskStatus) => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    if (isNaN(due.getTime())) return null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
    const dueTime = due.getTime();

    if (status === "DONE") {
      return {
        label: `Completed (${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })})`,
        style: "text-slate-400 bg-slate-100 dark:bg-slate-800",
      };
    }

    if (dueTime < startOfToday) {
      const days = Math.max(1, Math.floor((startOfToday - dueTime) / (1000 * 3600 * 24)));
      return {
        label: `Overdue ${days}d`,
        style: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40",
      };
    } else if (dueTime <= endOfToday) {
      return {
        label: "Due Today",
        style: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40",
      };
    } else {
      return {
        label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        style: "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800",
      };
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "DONE":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60";
      case "REVIEW":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/60";
      case "BLOCKED":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60";
    }
  };

  const getProjectStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60";
      case "PLANNING":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60";
      case "ON_HOLD":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60";
      case "COMPLETED":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/60";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      {/* ── 1. Clean Header with One Clear Create Action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized hub for your assigned tasks, active projects, and workspace documents.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleOpenCreateModal("document")}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-xs transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Page</span>
          </button>
        </div>
      </div>

      {/* ── 2. First Viewport: My Tasks & Projects Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Card: My Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  My Tasks
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/40">
                  {myTasksState.loading && myTasksState.tasks.length === 0
                    ? "..."
                    : myTasksState.error && myTasksState.tasks.length === 0
                    ? "—"
                    : myTasksState.counts.all}
                </span>
              </div>

              <Link
                href="/workspace/tasks?tab=my"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Task rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
              {myTasksState.loading && myTasksState.tasks.length === 0 ? (
                <div className="space-y-3 py-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
                  ))}
                </div>
              ) : myTasksState.error && myTasksState.tasks.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-500">
                    {myTasksState.error === "Network Error"
                      ? "Could not load assigned tasks. Check connection."
                      : myTasksState.error}
                  </p>
                  <button
                    onClick={myTasksState.refresh}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : prioritizedTasks.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <CheckSquare className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No assigned tasks
                  </p>
                  <p className="text-[11px] text-slate-400">
                    You have no active tasks assigned right now.
                  </p>
                </div>
              ) : (
                prioritizedTasks.map((task) => {
                  const due = formatDueDate(task.dueDate, task.status);
                  return (
                    <Link
                      key={task.id}
                      href="/workspace/tasks?tab=my"
                      className="group flex items-center justify-between py-2.5 px-1 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`truncate text-xs font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition ${
                              task.status === "DONE" ? "line-through text-slate-400 dark:text-slate-500" : ""
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase">
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {due && (
                        <div className="shrink-0">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${due.style}`}
                          >
                            {due.label}
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {prioritizedTasks.length > 0 && (
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-right">
              <Link
                href="/workspace/tasks?tab=my"
                className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                Manage all tasks in Employee Portal →
              </Link>
            </div>
          )}
        </div>

        {/* Right Card: Projects */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Projects
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40">
                  {isProjectsLoading ? "..." : projectsError ? "—" : projects.length}
                </span>
              </div>

              <Link
                href="/workspace/projects"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Project rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
              {isProjectsLoading ? (
                <div className="space-y-3 py-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
                  ))}
                </div>
              ) : projectsError && projects.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-500">{projectsError}</p>
                  <button
                    onClick={fetchProjects}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : projects.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <FolderKanban className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No active projects
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Create projects to organize deliverables, tasks, and documents.
                  </p>
                </div>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/workspace/projects?projectId=${project.id}`}
                    className="group flex items-center justify-between py-2.5 px-1 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="truncate text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {project.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                        {project.counts && (
                          <span>
                            {project.counts.tasks || 0} tasks · {project.counts.pages || 0} pages
                          </span>
                        )}
                        {!project.counts && project.description && (
                          <span className="truncate max-w-xs">{project.description}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getProjectStatusBadge(
                          project.status
                        )}`}
                      >
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {projects.length > 0 && (
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-right">
              <Link
                href="/workspace/projects"
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                Browse all workspace projects →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Recent Pages Section ── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Pages
            </h2>
            {allPages.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                {allPages.length}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {allPages.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40 sm:w-56 transition"
                />
              </div>
            )}
          </div>
        </div>

        {isPagesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayedPages.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedPages.map((page) => {
                const updatedTime = page.updatedAt || page.createdAt;
                const formattedDate = updatedTime
                  ? new Date(updatedTime).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : null;

                return (
                  <Link
                    key={page.id}
                    href={`/workspace/pages/${page.id}`}
                    className="group p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:shadow-xs transition flex items-start space-x-3"
                  >
                    <span className="text-2xl shrink-0 p-0.5">
                      {page.isFolder ? "📁" : page.isDatabase ? "📊" : page.icon || "📄"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition">
                          {page.title || "Untitled Page"}
                        </h4>
                        {page.isDatabase && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-semibold shrink-0">
                            Database
                          </span>
                        )}
                        {page.isWiki && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-semibold shrink-0">
                            Wiki
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
                        {formattedDate && <span>Edited {formattedDate}</span>}
                        {!formattedDate && <span>Click to open</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {filteredPages.length > 12 && !searchQuery.trim() && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowAllPages((prev) => !prev)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  <span>
                    {showAllPages ? "Show Less" : `View All ${filteredPages.length} Pages`}
                  </span>
                  {showAllPages ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        ) : searchQuery.trim() ? (
          <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
            <Search className="w-6 h-6 text-slate-400 mx-auto" />
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No pages matching &ldquo;{searchQuery}&rdquo;
            </h4>
            <p className="text-[11px] text-slate-400">
              Try searching for a different keyword or create a new page.
            </p>
          </div>
        ) : (
          <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 bg-white dark:bg-slate-900">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No pages yet
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first page to start documenting specs, notes, architecture, and team knowledge.
            </p>
            <button
              onClick={() => handleOpenCreateModal("document")}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Page</span>
            </button>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <CreatePageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetchTree}
        initialType={modalType}
        pageTree={pageTree}
      />
    </div>
  );
}
