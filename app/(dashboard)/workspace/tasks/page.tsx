"use client";

import React from "react";
import Link from "next/link";
import { CheckSquare, ArrowRight, ListTodo, Plus } from "lucide-react";

export default function WorkspaceTasksPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tasks</h1>
            <p className="text-xs text-slate-500">Track and organize personal and workspace tasks</p>
          </div>
        </div>
        <Link
          href="/tasks"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs transition"
        >
          <span>Open Tasks Module</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
        <ListTodo className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Workspace Tasks view ready</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Tasks assigned to you or created within workspace pages appear here.
        </p>
      </div>
    </div>
  );
}
