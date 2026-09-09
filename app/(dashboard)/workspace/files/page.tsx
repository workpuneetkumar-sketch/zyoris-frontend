"use client";

import React from "react";
import { Folder } from "lucide-react";

export default function WorkspaceFilesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="p-2.5 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
          <Folder className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Files</h1>
          <p className="text-xs text-slate-500">Shared attachments and assets</p>
        </div>
      </div>

      <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
        <Folder className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Files Management</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Media and document assets attached within workspace pages.
        </p>
      </div>
    </div>
  );
}
