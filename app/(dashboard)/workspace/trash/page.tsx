"use client";

import React from "react";
import { Trash2 } from "lucide-react";

export default function WorkspaceTrashPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
          <Trash2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trash</h1>
          <p className="text-xs text-slate-500">Deleted pages and archives</p>
        </div>
      </div>

      <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
        <Trash2 className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Trash is empty</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Pages removed from the workspace will be held here prior to permanent deletion.
        </p>
      </div>
    </div>
  );
}
