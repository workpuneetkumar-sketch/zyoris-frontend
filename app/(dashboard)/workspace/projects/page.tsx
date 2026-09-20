"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  ArrowRight,
  Plus,
  Loader2,
  CheckSquare,
  FileText,
  Paperclip,
  Users,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Project, getProjects } from "@/lib/api/projectsApi";
import { StatusBadge } from "@/components/projects/SharedComponents";

export default function WorkspaceProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Projects</h1>
            <p className="text-xs text-slate-500">
              Project workspaces containing tasks, documentation, files and databases.
            </p>
          </div>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-semibold text-xs transition"
        >
          <span>Projects Kanban / List</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
          <p className="text-xs">Loading project workspaces...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No projects found
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create a project to unlock its dedicated workspace with tasks, documentation pages, files, and database table.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <Link
              key={proj.id}
              href={`/projects/${proj.id}`}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-500 hover:shadow-xs transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                        {proj.name}
                      </h4>
                      {proj.key && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] text-slate-600 dark:text-slate-300">
                          {proj.key}
                        </span>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {proj.description}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={proj.status} />
                </div>
              </div>

              {/* Counts summary bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{proj.counts?.tasks ?? 0}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{proj.counts?.pages ?? 0}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>{proj.counts?.files ?? 0}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{proj.counts?.members ?? 0}</span>
                  </span>
                </div>
                <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center space-x-1 group-hover:translate-x-0.5 transition">
                  <span>Open</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
