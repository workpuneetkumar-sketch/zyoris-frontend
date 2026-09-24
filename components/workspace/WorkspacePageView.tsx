"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { WorkspacePage, WorkspaceBlock, WorkspacePageNode, PageLayoutWidth } from "@/types/workspace";
import { getWorkspacePage, updateWorkspacePage } from "@/lib/api/workspaceApi";
import { saveStoredLocalPage, useWorkspace } from "@/hooks/useWorkspace";
import { BlockEditor } from "./BlockEditor";
import { DatabaseView } from "./DatabaseView";
import { AttachmentSection } from "./AttachmentSection";
import { ExportModal } from "./ExportModal";
import { CustomizePagePanel } from "./CustomizePagePanel";
import { UseWithAIButton } from "./UseWithAIButton";
import { PageCommentsPanel } from "./PageCommentsPanel";
import { TranslatePageModal } from "./TranslatePageModal";
import { TurnIntoWikiModal, WikiBadge } from "./TurnIntoWikiModal";
import { PageAnalyticsPanel } from "./PageAnalyticsPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { PageImportModal } from "./PageImportModal";
import { PanelErrorBoundary } from "./PanelErrorBoundary";
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
  Download,
  Paperclip,
  Settings2,
  MessageSquare,
  Globe,
  BookOpen,
  BarChart2,
  History,
  Upload,
  MoreHorizontal,
} from "lucide-react";

interface WorkspacePageViewProps {
  pageId: string;
}

// ── Toolbar action menu items ──────────────────────────────────────────────────
const TOOLBAR_ACTIONS = [
  { key: "customize",  label: "Customize",       icon: Settings2,     color: "text-blue-500"   },
  { key: "ai",         label: "Use with AI",      icon: Sparkles,      color: "text-indigo-500" },
  { key: "comments",   label: "Suggest Edits",    icon: MessageSquare, color: "text-violet-500" },
  { key: "translate",  label: "Translate",        icon: Globe,         color: "text-sky-500"    },
  { key: "wiki",       label: "Turn into Wiki",   icon: BookOpen,      color: "text-violet-500" },
  { key: "analytics",  label: "Analytics",        icon: BarChart2,     color: "text-emerald-500"},
  { key: "history",    label: "Version History",  icon: History,       color: "text-orange-500" },
  { key: "import",     label: "Import",           icon: Upload,        color: "text-teal-500"   },
] as const;

type ToolbarAction = typeof TOOLBAR_ACTIONS[number]["key"];

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
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState<boolean>(true);

  // ── FE2 feature panel state ────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<ToolbarAction | null>(null);
  const [isWiki, setIsWiki] = useState<boolean>(false);
  const [layoutWidth, setLayoutWidth] = useState<PageLayoutWidth>("default");
  const [smallText, setSmallText] = useState<boolean>(false);

  // Toolbar overflow menu
  const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState(false);
  const toolbarMenuRef = useRef<HTMLDivElement>(null);

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
      setIsWiki(data?.isWiki ?? false);
      setLayoutWidth(data?.layoutWidth ?? "default");
      setSmallText(data?.smallText ?? false);
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

  // Close toolbar overflow menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(e.target as Node)) {
        setIsToolbarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const canEdit = page?.userPermissions?.canEdit ?? true;
  const isLocked = page?.isLocked ?? false;

  // Dynamic max-width based on layout setting
  const contentWidth = layoutWidth === "full" ? "max-w-full" : "max-w-4xl";
  const textSize = smallText ? "text-sm" : "";

  return (
    <div className={`${contentWidth} mx-auto px-6 md:px-12 py-8 md:py-12 ${textSize}`}>
      {!canEdit && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center space-x-2">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>Read-only Mode: You have view permissions for this page. Editing is disabled.</span>
        </div>
      )}

      {/* Cover Image Banner */}
      {coverImage && (
        <div className="relative group h-48 w-full rounded-2xl overflow-hidden mb-8 shadow-sm">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          {canEdit && (
            <button
              onClick={() => handleSelectCover(null)}
              className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 px-3 py-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition"
            >
              Remove Cover
            </button>
          )}
        </div>
      )}
      {/* Page Header Actions Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        {!coverImage && canEdit && (
          <button
            onClick={() => setIsCoverPickerOpen(!isCoverPickerOpen)}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Add Cover Image</span>
          </button>
        )}

        {/* Right-side toolbar */}
        <div className="flex items-center space-x-2 ml-auto flex-wrap gap-1.5">

          {/* Wiki badge */}
          {isWiki && <WikiBadge />}

          {/* Use with AI — always visible */}
          <UseWithAIButton pageId={pageId} pageTitle={title} />

          {/* Attachments toggle */}
          <button
            onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)}
            className={`inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition ${
              isAttachmentsExpanded
                ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Attachments</span>
          </button>

          {/* Export */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* ··· Overflow menu for remaining FE2 actions */}
          <div className="relative" ref={toolbarMenuRef}>
            <button
              type="button"
              onClick={() => setIsToolbarMenuOpen((v) => !v)}
              className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              aria-label="More page actions"
              aria-expanded={isToolbarMenuOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isToolbarMenuOpen && (
              <div className="absolute right-0 top-9 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 animate-in fade-in duration-100">
                {/* Customize */}
                <button
                  onClick={() => { setActivePanel("customize"); setIsToolbarMenuOpen(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <Settings2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Customize Page</span>
                </button>

                {/* Suggest Edits */}
                <button
                  onClick={() => { setActivePanel("comments"); setIsToolbarMenuOpen(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                  <span>Suggest Edits</span>
                </button>

                {/* Translate */}
                <button
                  onClick={() => { setActivePanel("translate"); setIsToolbarMenuOpen(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  <span>Translate</span>
                </button>

                {/* Import */}
                {canEdit && (
                  <button
                    onClick={() => { setActivePanel("import"); setIsToolbarMenuOpen(false); }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                  >
                    <Upload className="w-3.5 h-3.5 text-teal-500" />
                    <span>Import</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Turn into Wiki */}
                <button
                  onClick={() => { setActivePanel("wiki"); setIsToolbarMenuOpen(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                  <span>{isWiki ? "Revert from Wiki" : "Turn into Wiki"}</span>
                </button>

                {/* Analytics */}
                <button
                  onClick={() => { setActivePanel("analytics"); setIsToolbarMenuOpen(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Analytics</span>
                </button>

                {/* Version History */}
                <button
                  onClick={() => { setActivePanel("history"); setIsToolbarMenuOpen(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <History className="w-3.5 h-3.5 text-orange-500" />
                  <span>Version History</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cover Image Preset Picker */}
      {isCoverPickerOpen && canEdit && (
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
            onClick={() => canEdit && setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            disabled={!canEdit}
            className="text-4xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-80 disabled:cursor-default"
            title={canEdit ? "Change Icon" : "Page Icon"}
          >
            {icon || "📄"}
          </button>

          {/* Emoji Picker Popover */}
          {isEmojiPickerOpen && canEdit && (
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
        <div className="relative flex items-center gap-3">
          <input
            type="text"
            value={title}
            disabled={!canEdit}
            onChange={(e) => canEdit && handleTitleChange(e.target.value)}
            placeholder="Untitled Page..."
            className="flex-1 text-4xl font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none tracking-tight placeholder-slate-300 dark:placeholder-slate-700 disabled:opacity-90"
          />
          {isWiki && <WikiBadge className="flex-shrink-0" />}
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

      {/* Page Attachments Section */}
      {isAttachmentsExpanded && (
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <AttachmentSection
            entityType="PAGE"
            entityId={page.id}
            canManage={page.userPermissions?.canEdit ?? true}
          />
        </div>
      )}

      {/* Export Modal Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entityType="PAGE"
        entityId={page.id}
        entityName={title}
      />

      {/* ── FE2-01 · Customize Page ───────────────────────────────────────── */}
      <PanelErrorBoundary label="Customize Page" onClose={() => setActivePanel(null)}>
        <CustomizePagePanel
          isOpen={activePanel === "customize"}
          onClose={() => setActivePanel(null)}
          page={page}
          onSaved={(updated) => {
            if (updated.icon !== undefined) setIcon(updated.icon ?? "📄");
            if (updated.coverImage !== undefined) setCoverImage(updated.coverImage);
            if (updated.layoutWidth !== undefined) setLayoutWidth(updated.layoutWidth ?? "default");
            if (updated.smallText !== undefined) setSmallText(updated.smallText ?? false);
          }}
        />
      </PanelErrorBoundary>

      {/* ── FE2-03 · Suggest Edits / Comments ───────────────────────────────── */}
      <PanelErrorBoundary label="Suggest Edits" onClose={() => setActivePanel(null)}>
        <PageCommentsPanel
          isOpen={activePanel === "comments"}
          onClose={() => setActivePanel(null)}
          pageId={pageId}
        />
      </PanelErrorBoundary>

      {/* ── FE2-04 · Translate ───────────────────────────────────────────────── */}
      <PanelErrorBoundary label="Translate" onClose={() => setActivePanel(null)}>
        <TranslatePageModal
          isOpen={activePanel === "translate"}
          onClose={() => setActivePanel(null)}
          pageId={pageId}
          currentBlocks={page.blocks ?? []}
          onApplied={fetchPageData}
        />
      </PanelErrorBoundary>

      {/* ── FE2-05 · Turn into Wiki ──────────────────────────────────────────── */}
      <PanelErrorBoundary label="Turn into Wiki" onClose={() => setActivePanel(null)}>
        <TurnIntoWikiModal
          isOpen={activePanel === "wiki"}
          onClose={() => setActivePanel(null)}
          pageId={pageId}
          pageTitle={title}
          isWiki={isWiki}
          isLocked={isLocked}
          onConverted={(newIsWiki) => setIsWiki(newIsWiki)}
        />
      </PanelErrorBoundary>

      {/* ── FE2-06 · Analytics ───────────────────────────────────────────────── */}
      <PanelErrorBoundary label="Analytics" onClose={() => setActivePanel(null)}>
        <PageAnalyticsPanel
          isOpen={activePanel === "analytics"}
          onClose={() => setActivePanel(null)}
          pageId={pageId}
        />
      </PanelErrorBoundary>

      {/* ── FE2-07 · Version History ─────────────────────────────────────────── */}
      <PanelErrorBoundary label="Version History" onClose={() => setActivePanel(null)}>
        <VersionHistoryPanel
          isOpen={activePanel === "history"}
          onClose={() => setActivePanel(null)}
          pageId={pageId}
          isLocked={isLocked}
          onRestored={fetchPageData}
        />
      </PanelErrorBoundary>

      {/* ── FE2-08 · Page Import ─────────────────────────────────────────────── */}
      <PanelErrorBoundary label="Import" onClose={() => setActivePanel(null)}>
        <PageImportModal
          isOpen={activePanel === "import"}
          onClose={() => setActivePanel(null)}
          pageId={pageId}
          onImported={fetchPageData}
        />
      </PanelErrorBoundary>
    </div>
  );
};
