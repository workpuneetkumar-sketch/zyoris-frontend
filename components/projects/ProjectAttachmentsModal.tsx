'use client';

import React from 'react';
import { X, Paperclip, Download } from 'lucide-react';
import { AttachmentSection } from '@/components/workspace/AttachmentSection';

interface ProjectAttachmentsModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onOpenExport?: () => void;
}

export const ProjectAttachmentsModal: React.FC<ProjectAttachmentsModalProps> = ({
  projectId,
  projectName,
  onClose,
  onOpenExport,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Project Files & Attachments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {projectName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Project</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <AttachmentSection
            entityType="PROJECT"
            entityId={projectId}
            canManage={true}
          />
        </div>
      </div>
    </div>
  );
};
