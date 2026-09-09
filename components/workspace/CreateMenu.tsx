"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, FileText, CheckSquare, Folder, Database, Sparkles, ChevronDown } from "lucide-react";

interface CreateMenuProps {
  onOpenCreatePageModal: (parentId?: string | null) => void;
}

export const CreateMenu: React.FC<CreateMenuProps> = ({ onOpenCreatePageModal }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition"
      >
        <Plus className="w-4 h-4" />
        <span>Create</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in duration-150">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Universal Create
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenCreatePageModal(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition"
          >
            <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Page</div>
              <div className="text-[10px] text-slate-400">Document or note page</div>
            </div>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onOpenCreatePageModal(null);
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition"
          >
            <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Database</div>
              <div className="text-[10px] text-slate-400">Structured data view</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
