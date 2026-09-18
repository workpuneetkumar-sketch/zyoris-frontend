'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Code,
  FileCode,
  FileType,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  createExport,
  downloadExportResult,
  exportDatabaseTableToFile,
  ExportFormat,
  FORMAT_EXTENSIONS,
} from '@/lib/api/exportApi';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'PAGE' | 'TASK' | 'PROJECT';
  entityId: string;
  entityName?: string;
  title?: string;
  defaultFormat?: ExportFormat;
  databaseId?: string;
  databaseRows?: Array<{ data: Record<string, any>; [key: string]: any }>;
  databaseProperties?: Array<{ name: string; [key: string]: any }>;
}

const FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  extension: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}[] = [
  {
    id: 'MARKDOWN',
    label: 'Markdown',
    extension: '.md',
    description: 'Formatted plain text file, great for docs and notes',
    icon: FileText,
    colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'HTML',
    label: 'HTML Document',
    extension: '.html',
    description: 'Web page format with styled rich text',
    icon: Code,
    colorClass: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
  },
  {
    id: 'PDF',
    label: 'PDF Document',
    extension: '.pdf',
    description: 'Universal document format for sharing and printing',
    icon: FileType,
    colorClass: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
  },
  {
    id: 'CSV',
    label: 'CSV Data',
    extension: '.csv',
    description: 'Comma-separated raw tabular data for spreadsheets',
    icon: FileSpreadsheet,
    colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'XLSX',
    label: 'Excel Spreadsheet',
    extension: '.xlsx',
    description: 'Microsoft Excel spreadsheet format',
    icon: FileSpreadsheet,
    colorClass: 'text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800',
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName = 'Item',
  title,
  defaultFormat,
  databaseId,
  databaseRows,
  databaseProperties,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat || 'MARKDOWN');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeChildren, setIncludeChildren] = useState(true);
  const [includeActivities, setIncludeActivities] = useState(false);
  const [includeComments, setIncludeComments] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // ── Specialized Flow: Database Table Export ────────────────────────────
      if (databaseRows) {
        // If entityId is a valid project ID, notify backend export audit service
        if (entityId && entityId !== "database") {
          try {
            await createExport({
              entityType: "PROJECT",
              entityId,
              format: selectedFormat,
              options: {
                databaseId,
                includeAttachments,
                includeChildren,
                includeActivities,
                includeComments,
              },
            });
          } catch (apiErr: any) {
            console.warn("Backend export registration notice:", apiErr?.message);
          }
        }

        // Generate and download the actual database rows file with columns
        const ext = FORMAT_EXTENSIONS[selectedFormat] || '.csv';
        const fileName = `${entityName.replace(/[^a-z0-9_-]/gi, '_')}_data${ext}`;
        await exportDatabaseTableToFile(
          databaseProperties || [],
          databaseRows,
          selectedFormat,
          fileName
        );

        setSuccessMsg(`Successfully exported ${databaseRows.length} database rows as ${selectedFormat}`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
        return;
      }

      // ── Standard Entity Export (Project, Page, Task) ───────────────────────
      const result = await createExport({
        entityType,
        entityId,
        format: selectedFormat,
        options: {
          includeAttachments,
          includeChildren,
          includeActivities,
          includeComments,
        },
      });

      // Step 2: Download the generated blob/file
      await downloadExportResult(result, `${entityName.replace(/[^a-z0-9_-]/gi, '_')}_export`);

      setSuccessMsg(`Successfully exported ${entityName} as ${selectedFormat}`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to export:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to export document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title || `Export ${entityType.charAt(0) + entityType.slice(1).toLowerCase()}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {entityName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Select Format */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Select Export Format
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {FORMAT_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = selectedFormat === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedFormat(opt.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${opt.colorClass}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {opt.label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {opt.extension}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Export Settings
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Include Attachments Manifest
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Include file links and attachment metadata in export output
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={(e) => setIncludeChildren(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Include Child Items & Subtasks
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Recursively bundle subtasks and nested documentation
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeComments}
                onChange={(e) => setIncludeComments(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Include Discussion Comments
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Add thread messages and comment activity logs
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeActivities}
                onChange={(e) => setIncludeActivities(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Include Audit Activities Timeline
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Include audit log history and transition events
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export {selectedFormat}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
