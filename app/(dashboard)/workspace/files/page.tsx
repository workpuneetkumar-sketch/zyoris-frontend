"use client";

import React from "react";
import Link from "next/link";
import { Folder, Paperclip, FileText, FolderKanban, ArrowRight } from "lucide-react";

export default function WorkspaceFilesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Workspace Files
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Document attachments and media assets across workspace pages and projects.
            </p>
          </div>
        </div>
      </div>

      {/* Informative Guidance & Entry Points */}
      <div className="p-8 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 space-y-6">
        <div className="max-w-xl space-y-2">
          <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400">
            <Paperclip className="w-5 h-5" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Context-Scoped Attachments
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            In Zyoris, files and media are attached directly to relevant workspace pages and projects. This ensures security, proper access permissions, and contextual organization.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Link
            href="/workspace"
            className="group p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 rounded-xl transition flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  Page Attachments
                </h4>
                <p className="text-[11px] text-slate-400">
                  Open any document to view, upload, or preview attached files
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
          </Link>

          <Link
            href="/workspace/projects"
            className="group p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 rounded-xl transition flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  Project Files
                </h4>
                <p className="text-[11px] text-slate-400">
                  View shared assets, specs, and attachments across team projects
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
}
