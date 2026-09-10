"use client";

import React, { useState } from "react";
import { WorkspacePageNode } from "@/types/workspace";
import { updateWorkspacePage } from "@/lib/api/workspaceApi";
import { FolderInput, X, Loader2, AlertCircle, Check } from "lucide-react";

interface MovePageModalProps {
  isOpen: boolean;
  pageId: string;
  pageTitle: string;
  currentParentId?: string | null;
  pageTree: WorkspacePageNode[];
  onClose: () => void;
  onSuccess: () => void;
}

export const MovePageModal: React.FC<MovePageModalProps> = ({
  isOpen,
  pageId,
  pageTitle,
  currentParentId = null,
  pageTree = [],
  onClose,
  onSuccess,
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    currentParentId
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const flattenTree = (
    nodes: WorkspacePageNode[],
    depth = 0
  ): { id: string; title: string; depth: number }[] => {
    let result: { id: string; title: string; depth: number }[] = [];
    nodes.forEach((node) => {
      // Exclude moving page into itself
      if (node.id !== pageId) {
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
    setIsSubmitting(true);
    setError(null);

    try {
      await updateWorkspacePage(pageId, {
        parentId: selectedParentId,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to move page:", err);
      setError(err?.response?.data?.message || "Failed to move page location.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <FolderInput className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Move "{pageTitle || "Page"}"
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-500 font-semibold mb-2">
              Select New Parent Location
            </label>
            <select
              value={selectedParentId || ""}
              onChange={(e) => setSelectedParentId(e.target.value || null)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none text-xs"
            >
              <option value="">No parent (Root Level Workspace)</option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {"— ".repeat(opt.depth)} {opt.title || "Untitled"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Move</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
