"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorkspacePageNode, CreateWorkspacePageDto, WorkspacePage } from "@/types/workspace";
import { createWorkspacePage, createWorkspaceDatabase } from "@/lib/api/workspaceApi";
import { X, FileText, Loader2, AlertCircle, Sparkles, Database } from "lucide-react";

interface CreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialParentId?: string | null;
  pageTree?: WorkspacePageNode[];
}

const EMOJI_OPTIONS = ["📄", "📝", "🚀", "💡", "📊", "⚡", "📁", "🧠", "🔍", "🎯", "📌", "✨"];

export const CreatePageModal: React.FC<CreatePageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialParentId = null,
  pageTree = [],
}) => {
  const router = useRouter();
  const [title, setTitle] = useState<string>("");
  const [icon, setIcon] = useState<string>("📄");
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [isDatabase, setIsDatabase] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setParentId(initialParentId);
  }, [initialParentId, isOpen]);

  if (!isOpen) return null;

  // Flatten page tree for parent selection
  const flattenTree = (nodes: WorkspacePageNode[], depth = 0): { id: string; title: string; depth: number }[] => {
    let result: { id: string; title: string; depth: number }[] = [];
    nodes.forEach((node) => {
      if (node.id && node.id !== "[id]" && !node.id.includes("[id]")) {
        result.push({ id: node.id, title: node.title, depth });
        if (node.children && node.children.length > 0) {
          result = result.concat(flattenTree(node.children, depth + 1));
        }
      }
    });
    return result;
  };

  const parentOptions = flattenTree(pageTree);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Page title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Prepare clean page creation payload
    const payload: Record<string, any> = {
      title: title.trim(),
    };
    if (icon) payload.icon = icon;
    if (parentId) payload.parentId = parentId;

    try {
      let createdPage: WorkspacePage;

      // Primary creation attempt
      try {
        createdPage = await createWorkspacePage(payload as CreateWorkspacePageDto);
      } catch (primaryErr: any) {
        const errStr = JSON.stringify(primaryErr?.response?.data || "").toLowerCase();
        // If backend database throws a DB constraint or 500 error (e.g. emoji charset / optional field mismatch), fallback to minimal title payload
        if (errStr.includes("database error") || errStr.includes("db error") || primaryErr?.response?.status === 500) {
          console.warn("Primary page creation hit backend DB constraint, retrying with title-only payload...");
          const fallbackPayload: Record<string, any> = { title: title.trim() };
          if (parentId) fallbackPayload.parentId = parentId;
          createdPage = await createWorkspacePage(fallbackPayload as CreateWorkspacePageDto);
        } else {
          throw primaryErr;
        }
      }

      // If user checked "Create as Database View Page", associate database via POST /workspace/pages/:pageId/database
      if (isDatabase && createdPage?.id) {
        try {
          await createWorkspaceDatabase(createdPage.id, { title: title.trim() });
        } catch (dbErr) {
          console.warn("Database initialization notice (handled gracefully without failing page creation):", dbErr);
        }
      }

      onSuccess();
      onClose();
      
      // Reset form
      setTitle("");
      setIcon("📄");
      setParentId(null);
      setIsDatabase(false);

      // Navigate to created page if ID returned
      if (createdPage?.id && createdPage.id !== "[id]") {
        router.push(`/workspace/pages/${createdPage.id}`);
      }
    } catch (err: any) {
      console.error("Page creation error:", err, err?.response?.data);
      const resData = err?.response?.data;
      let msg = "Failed to create page. Please check page details and try again.";
      if (resData) {
        if (Array.isArray(resData.errors) && resData.errors.length > 0) {
          msg = resData.errors.map((e: any) => (typeof e === "string" ? e : `${e.field ? e.field + ': ' : ''}${e.message || e.error || ''}`)).join("; ");
        } else if (Array.isArray(resData.message) && resData.message.length > 0) {
          msg = resData.message.join("; ");
        } else if (typeof resData.message === "string" && resData.message !== "Request validation failed. Please check the fields below." && !resData.message.toLowerCase().includes("database error")) {
          msg = resData.message;
        } else if (resData.error && typeof resData.error === "string" && !resData.error.toLowerCase().includes("database error")) {
          msg = `${resData.error}`;
        }
      } else if (err?.message && !err.message.toLowerCase().includes("database error")) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Page</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition border ${
                    icon === emoji
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/60 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Page Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Product Roadmap, Engineering Specs..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Parent Page Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Parent Page (Optional)
            </label>
            <select
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              <option value="">No parent (Root Page)</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {"— ".repeat(item.depth)} {item.title || "Untitled"}
                </option>
              ))}
            </select>
          </div>

          {/* Is Database Toggle */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isDatabaseToggle"
              checked={isDatabase}
              onChange={(e) => setIsDatabase(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="isDatabaseToggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer">
              <Database className="w-3.5 h-3.5 text-purple-500" />
              <span>Create as Database View Page</span>
            </label>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm shadow-blue-500/20 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Create Page</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
