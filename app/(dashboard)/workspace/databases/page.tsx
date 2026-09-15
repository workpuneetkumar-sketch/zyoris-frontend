"use client";

import React from "react";
import { Database, Plus } from "lucide-react";

export default function WorkspaceDatabasesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Databases</h1>
            <p className="text-xs text-slate-500">Custom tables and structured data views</p>
          </div>
        </div>
      </div>

      <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
        <Database className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Databases Section</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Pages marked as database views will be listed here. You can create database pages using the universal Create menu.
        </p>
      </div>
    </div>
  );
}
