"use client";

import React from "react";
import Link from "next/link";
import { FolderKanban, ArrowRight, Layers } from "lucide-react";

export default function WorkspaceProjectsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Projects</h1>
            <p className="text-xs text-slate-500">Project boards and milestone trackers</p>
          </div>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-medium text-xs transition"
        >
          <span>Open Projects Module</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
        <Layers className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Projects Workspace active</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Collaborate on team project timelines and project document bases.
        </p>
      </div>
    </div>
  );
}
