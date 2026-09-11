"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { WorkspacePage, WorkspaceBlock, WorkspacePageNode } from "@/types/workspace";
import { getWorkspacePage, updateWorkspacePage } from "@/lib/api/workspaceApi";
import { saveStoredLocalPage, useWorkspace } from "@/hooks/useWorkspace";
import { BlockEditor } from "./BlockEditor";
import { DatabaseView } from "./DatabaseView";
import {
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  Image as ImageIcon,
  Smile,
  Database,
  Sparkles,
  CheckCircle2,
  Loader2,
  Folder,
  ChevronRight,
} from "lucide-react";

interface WorkspacePageViewProps {
  pageId: string;
}

const EMOJI_LIST = ["📄", "📝", "🚀", "💡", "📊", "⚡", "📁", "🧠", "🔍", "🎯", "📌", "✨", "🛠️", "⚙️", "🌟"];
const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",
];

export const WorkspacePageView: React.FC<WorkspacePageViewProps> = ({ pageId }) => {
  const { pageTree } = useWorkspace();
  const [page, setPage] = useState<WorkspacePage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("");
  const [icon, setIcon] = useState<string>("📄");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState<boolean>(false);

  const [titleSaveStatus, setTitleSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const titleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Find child pages/folders of current pageId
  const findChildItems = (): WorkspacePageNode[] => {
    if (!pageId || !pageTree || pageTree.length === 0) return [];
    
    const findNodeRecursively = (nodes: WorkspacePageNode[]): WorkspacePageNode | null => {
      for (const node of nodes) {
        if (node.id === pageId) return node;
        if (node.children && node.children.length > 0) {
          const found = findNodeRecursively(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetNode = findNodeRecursively(pageTree);
    return targetNode?.children || [];
  };

  const childItems = findChildItems();

  const fetchPageData = useCallback(async () => {
    if (!pageId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWorkspacePage(pageId);
      setPage(data);
      setTitle(data?.title || "Untitled Page");
      setIcon(data?.icon || "📄");
      setCoverImage(data?.coverImage || null);
    } catch (err: any) {
      console.error(`Failed to load page ${pageId}:`, err);
      const msg =
        err?.response?.status === 404
          ? "Workspace page not found or has been deleted."
          : err?.response?.data?.message || err?.message || "Failed to load page content.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  /* Debounced Title Persistence */
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setTitleSaveStatus("saving");

    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);

    titleTimerRef.current = setTimeout(async () => {
      try {
        await updateWorkspacePage(pageId, { title: newTitle.trim() });
        saveStoredLocalPage({ id: pageId, title: newTitle.trim(), icon });
        setTitleSaveStatus("saved");
      } catch (err) {
        console.error("Failed to update page title:", err);
        setTitleSaveStatus("error");
      }
    }, 750);
  };

  /* Icon Update */
  const handleSelectIcon = async (newIcon: string) => {
    setIcon(newIcon);
    setIsEmojiPickerOpen(false);
    try {
      await updateWorkspacePage(pageId, { icon: newIcon });
    } catch (err) {
      console.error("Failed to update icon:", err);
    }
  };

  /* Cover Image Update */
  const handleSelectCover = async (url: string | null) => {
    setCoverImage(url);
    setIsCoverPickerOpen(false);
    try {
      await updateWorkspacePage(pageId, { coverImage: url });
    } catch (err) {
      console.error("Failed to update cover image:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-6 animate-pulse">
        <div className="h-10 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        <div className="space-y-4 pt-6">
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          <div className="h-4 w-4/6 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Unable to Load Page
        </h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{error}</p>
        <button
          onClick={fetchPageData}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-semibold text-xs hover:bg-slate-800 transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-8 md:py-12">
      {/* Cover Image Banner */}
      {coverImage ? (
        <div className="relative group h-48 w-full rounded-2xl overflow-hidden mb-8 shadow-sm">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          <button
            onClick={() => handleSelectCover(null)}
            className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 px-3 py-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition"
          >
            Remove Cover
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <button
            onClick={() => setIsCoverPickerOpen(!isCoverPickerOpen)}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Add Cover Image</span>
          </button>
        </div>
      )}

      {/* Cover Image Preset Picker */}
      {isCoverPickerOpen && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Cover Image Preset
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {COVER_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectCover(preset)}
                className="h-20 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition"
              >
                <img src={preset} alt="Preset" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-3 relative">
          <button
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            className="text-4xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Change Icon"
          >
            {icon || "📄"}
          </button>

          {/* Emoji Picker Popover */}
          {isEmojiPickerOpen && (
            <div className="absolute top-14 left-0 z-50 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-wrap gap-2 w-64">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectIcon(emoji)}
                  className="w-9 h-9 text-xl hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editable Title Header */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled Page..."
            className="w-full text-4xl font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none tracking-tight placeholder-slate-300 dark:placeholder-slate-700"
          />
        </div>

        {/* Meta details */}
        <div className="flex items-center space-x-4 mt-3 text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
          {page.updatedAt && (
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Updated {new Date(page.updatedAt).toLocaleDateString()}</span>
            </span>
          )}

          {titleSaveStatus === "saving" && (
            <span className="text-amber-500 font-medium flex items-center space-x-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving title...</span>
            </span>
          )}
        </div>
      </div>

      {/* Folder Contents / Sub-items Grid */}
      {childItems.length > 0 && (
        <div className="mb-8 p-4 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Folder className="w-4 h-4 text-amber-500" />
              <span>Folder Contents ({childItems.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {childItems.map((child) => (
              <Link
                key={child.id}
                href={`/workspace/pages/${child.id}`}
                className="group flex items-center space-x-3 p-3 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl hover:border-blue-500 hover:shadow-xs transition"
              >
                <span className="text-xl">
                  {child.isFolder || child.icon === "📁" ? "📁" : child.icon || "📄"}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {child.title || "Untitled"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {child.isFolder || child.icon === "📁" ? "Folder" : child.isDatabase ? "Database" : "Document"}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Database Mode vs Block Editor Mode */}
      {page.isDatabase || page.database ? (
        <DatabaseView
          database={page.database!}
          pageId={page.id}
          onRefresh={fetchPageData}
        />
      ) : (
        <BlockEditor
          pageId={page.id}
          initialBlocks={page.blocks || []}
          canEdit={page.userPermissions?.canEdit ?? true}
        />
      )}
    </div>
  );
};
