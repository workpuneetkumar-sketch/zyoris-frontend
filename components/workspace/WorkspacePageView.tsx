"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  WorkspacePage,
  WorkspaceBlock,
  WorkspacePageNode,
  PageLayoutWidth,
} from "@/types/workspace";
import {
  getWorkspacePage,
  updateWorkspacePage,
  duplicateWorkspacePage,
  deleteWorkspacePage,
  savePageSettings,
  getPageContent,
} from "@/lib/api/workspaceApi";
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
import { AssignmentTaskModal } from "./AssignmentTaskModal";
import { MovePageModal } from "./MovePageModal";
import { PageActionsMenu, ToolbarAction } from "./PageActionsMenu";
import { toast } from "react-toastify";
import {
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  Image as ImageIcon,
  Folder,
  ChevronRight,
  Download,
  Paperclip,
  Loader2,
  Lock,
  Unlock,
  Sparkles,
} from "lucide-react";

interface WorkspacePageViewProps {
  pageId: string;
}

const EMOJI_LIST = [
  "📄", "📝", "🚀", "💡", "📊", "⚡", "📁", "🧠", "🔍", "🎯", "📌", "✨", "🛠️", "⚙️", "🌟"
];
const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",
];

/**
 * Fallback helper to serialize blocks to markdown if backend content endpoint fails.
 */
function serializeBlocksToMarkdown(titleText: string, blocksList: WorkspaceBlock[]): string {
  const lines: string[] = [`# ${titleText || "Untitled Page"}\n`];
  if (!blocksList || blocksList.length === 0) return lines.join("\n");

  blocksList.forEach((b) => {
    const text = b.text || b.content?.text || (typeof b.content === "string" ? b.content : "");
    const type = (b.type || "paragraph").toLowerCase();
    switch (type) {
      case "heading_1":
      case "h1":
        lines.push(`\n# ${text}`);
        break;
      case "heading_2":
      case "h2":
        lines.push(`\n## ${text}`);
        break;
      case "heading_3":
      case "h3":
        lines.push(`\n### ${text}`);
        break;
      case "bulleted_list_item":
      case "bulleted":
      case "bullet_list":
        lines.push(`- ${text}`);
        break;
      case "numbered_list_item":
      case "numbered":
      case "numbered_list":
        lines.push(`1. ${text}`);
        break;
      case "to_do":
      case "todo":
      case "checklist": {
        const checked = b.properties?.checked || b.content?.checked;
        lines.push(`- [${checked ? "x" : " "}] ${text}`);
        break;
      }
      case "quote":
        lines.push(`> ${text}`);
        break;
      case "code":
        lines.push(`\`\`\`\n${text}\n\`\`\``);
        break;
      case "divider":
        lines.push(`\n---\n`);
        break;
      default:
        lines.push(text);
        break;
    }
  });

  return lines.join("\n");
}

/**
 * Copy to clipboard with legacy execCommand fallback (FE1-02).
 */
async function copyToClipboardFallback(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, attempting fallback:", err);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error("Clipboard copy fallback failed:", fallbackErr);
    return false;
  }
}

export const WorkspacePageView: React.FC<WorkspacePageViewProps> = ({ pageId }) => {
  const router = useRouter();
  const { pageTree, refetchTree } = useWorkspace();
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
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Modals state (FE1-03, FE1-04, Assign)
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isDuplicating, setIsDuplicating] = useState<boolean>(false);

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
      setLayoutWidth(data?.layoutWidth ?? data?.settings?.layoutWidth ?? "default");
      setSmallText(data?.smallText ?? data?.settings?.smallText ?? false);
      setIsLocked(data?.isLocked ?? data?.settings?.isLocked ?? false);
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

<<<<<<< HEAD
  /* Debounced Title Persistence */
=======
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

  /* Immediate & Debounced Title Persistence */
  const flushTitleSave = async (titleToSave: string) => {
    if (titleTimerRef.current) {
      clearTimeout(titleTimerRef.current);
      titleTimerRef.current = null;
    }
    const cleanTitle = titleToSave.trim() || "Untitled Page";
    setTitleSaveStatus("saving");
    try {
      await updateWorkspacePage(pageId, { title: cleanTitle });
      saveStoredLocalPage({ id: pageId, title: cleanTitle, icon });
      setTitleSaveStatus("saved");
    } catch (err) {
      console.error("Failed to update page title:", err);
      setTitleSaveStatus("error");
    }
  };

>>>>>>> f568dd6 (fix(workspace & tasks): redesign suggest edits panel, fix import 400 error & client-side fallback, enforce future due dates, and resolve title input glitch)
  const handleTitleChange = (newTitle: string) => {
    if (isLocked) return;
    setTitle(newTitle);
    setTitleSaveStatus("saving");

    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);

    titleTimerRef.current = setTimeout(() => {
      flushTitleSave(newTitle);
    }, 750);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      flushTitleSave(title);
    }
  };

  /* Icon Update */
  const handleSelectIcon = async (newIcon: string) => {
    if (isLocked) return;
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
    if (isLocked) return;
    setCoverImage(url);
    setIsCoverPickerOpen(false);
    try {
      await updateWorkspacePage(pageId, { coverImage: url });
    } catch (err) {
      console.error("Failed to update cover image:", err);
    }
  };

  /* ── FE1-05: Small Text Toggle ─────────────────────────────────────────── */
  const handleToggleSmallText = async (val: boolean) => {
    const prev = smallText;
    setSmallText(val);
    try {
      await savePageSettings(pageId, { smallText: val });
    } catch (err) {
      console.error("Failed to persist small text setting:", err);
      setSmallText(prev);
      toast.error("Failed to save layout preference.");
    }
  };

  /* ── FE1-05: Full Width Toggle ─────────────────────────────────────────── */
  const handleToggleFullWidth = async (val: boolean) => {
    const prev = layoutWidth;
    const newWidth: PageLayoutWidth = val ? "full" : "default";
    setLayoutWidth(newWidth);
    try {
      await savePageSettings(pageId, {
        layoutWidth: newWidth,
        fullWidth: val,
      });
    } catch (err) {
      console.error("Failed to persist full width setting:", err);
      setLayoutWidth(prev);
      toast.error("Failed to save layout preference.");
    }
  };

  /* ── FE1-06: Lock / Unlock Page Toggle ─────────────────────────────────── */
  const handleToggleLock = async () => {
    const canUserEdit = page?.userPermissions?.canEdit ?? true;
    if (!canUserEdit) {
      toast.error("You do not have permission to lock or unlock this page.");
      return;
    }

    const nextLocked = !isLocked;
    setIsLocked(nextLocked);

    try {
      await savePageSettings(pageId, { isLocked: nextLocked });
      toast.success(nextLocked ? "Page locked" : "Page unlocked");
    } catch (err: any) {
      console.error("Failed to update lock state:", err);
      setIsLocked(!nextLocked); // revert on failure
      const msg = err?.response?.data?.message || "Failed to update page lock state.";
      toast.error(msg);
    }
  };

  /* ── FE1-02: Copy Link ─────────────────────────────────────────────────── */
  const handleCopyLink = async () => {
    const canonicalUrl = `${window.location.origin}/workspace/pages/${pageId}`;
    const success = await copyToClipboardFallback(canonicalUrl);
    if (success) {
      toast.success("Page link copied to clipboard!");
    } else {
      toast.error("Unable to copy link to clipboard.");
    }
  };

  /* ── FE1-02: Copy Page Contents ────────────────────────────────────────── */
  const handleCopyContent = async () => {
    try {
      let markdownContent = "";
      try {
        const res = await getPageContent(pageId);
        markdownContent = res?.markdown || "";
      } catch (beErr) {
        console.warn("Backend content endpoint error, falling back to local serializer:", beErr);
        markdownContent = serializeBlocksToMarkdown(title, page?.blocks || []);
      }

      if (!markdownContent || markdownContent.trim() === "") {
        markdownContent = `# ${title || "Untitled Page"}\n`;
      }

      const success = await copyToClipboardFallback(markdownContent);
      if (success) {
        toast.success("Page content copied to clipboard!");
      } else {
        toast.error("Failed to copy page contents to clipboard.");
      }
    } catch (err) {
      console.error("Error during copy page content:", err);
      toast.error("Failed to copy page contents.");
    }
  };

  /* ── FE1-03: Duplicate Page ────────────────────────────────────────────── */
  const handleDuplicate = async () => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const newPage = await duplicateWorkspacePage(pageId);
      toast.success("Page duplicated successfully!");

      if (newPage?.id) {
        saveStoredLocalPage({
          id: newPage.id,
          title: newPage.title || `${title || "Untitled"} (Copy)`,
          icon: newPage.icon || icon || "📄",
          parentId: newPage.parentId || null,
          isFolder: !!newPage.isFolder,
          isDatabase: !!newPage.isDatabase,
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("zyoris:page-created", { detail: newPage })
        );
      }
      refetchTree();

      if (newPage?.id) {
        router.push(`/workspace/pages/${newPage.id}`);
      }
    } catch (err: any) {
      console.error("Failed to duplicate page:", err);
      const msg = err?.response?.data?.message || "Failed to duplicate page. Please try again.";
      toast.error(msg);
    } finally {
      setIsDuplicating(false);
    }
  };

  /* ── FE1-04: Move to Trash ─────────────────────────────────────────────── */
  const handleDeleteToTrash = async () => {
    const canUserDelete = page?.userPermissions?.canDelete ?? true;
    if (!canUserDelete) {
      toast.error("You do not have permission to delete this page.");
      return;
    }

    const confirmed = window.confirm(
      `Move "${title || "this page"}" to Trash? You can restore it later from Trash.`
    );
    if (!confirmed) return;

    try {
      await deleteWorkspacePage(pageId);
      toast.success("Page moved to Trash.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("zyoris:page-deleted", { detail: pageId })
        );
      }
      refetchTree();
      router.push("/workspace/trash");
    } catch (err: any) {
      console.error("Failed to delete page:", err);
      const msg = err?.response?.data?.message || "Failed to move page to Trash.";
      toast.error(msg);
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
  const canDelete = page?.userPermissions?.canDelete ?? true;

  // Dynamic max-width based on layout setting (FE1-05)
  const contentWidth = layoutWidth === "full" ? "max-w-full" : "max-w-4xl";
  const textSize = smallText ? "text-sm leading-relaxed" : "";

  return (
    <div className={`${contentWidth} mx-auto px-6 md:px-12 py-8 md:py-12 ${textSize}`}>
      {/* Read-Only permission banner */}
      {!canEdit && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center space-x-2">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>Read-only Mode: You have view permissions for this page. Editing is disabled.</span>
        </div>
      )}

      {/* Locked Page Warning Banner (FE1-06) */}
      {isLocked && (
        <div className="mb-4 px-4 py-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">This page is locked.</span>
              <span className="text-amber-700/80 dark:text-amber-400/80 ml-1.5 hidden sm:inline">
                Editing title, icon, cover image, and blocks is disabled.
              </span>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleToggleLock}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-xl font-semibold text-xs transition"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock</span>
            </button>
          )}
        </div>
      )}

      {/* Cover Image Banner */}
      {coverImage && (
        <div className="relative group h-48 w-full rounded-2xl overflow-hidden mb-8 shadow-sm">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          {canEdit && !isLocked && (
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
        {!coverImage && canEdit && !isLocked && (
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

          {/* ── FE1-01 / FE1-07: Central Page Actions Three-Dot Menu ── */}
          <PageActionsMenu
            pageId={pageId}
            pageTitle={title}
            canEdit={canEdit}
            canDelete={canDelete}
            isLocked={isLocked}
            layoutWidth={layoutWidth}
            smallText={smallText}
            isWiki={isWiki}
            isDuplicating={isDuplicating}
            onToggleLock={handleToggleLock}
            onToggleSmallText={handleToggleSmallText}
            onToggleFullWidth={handleToggleFullWidth}
            onCopyLink={handleCopyLink}
            onCopyContent={handleCopyContent}
            onDuplicate={handleDuplicate}
            onOpenMoveModal={() => setIsMoveModalOpen(true)}
            onDeletePage={handleDeleteToTrash}
            onOpenPanel={(panel) => setActivePanel(panel)}
            onOpenExport={() => setIsExportModalOpen(true)}
            onOpenAssignTask={() => setIsAssignModalOpen(true)}
          />
        </div>
      </div>

      {/* Cover Image Preset Picker */}
      {isCoverPickerOpen && canEdit && !isLocked && (
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
            onClick={() => canEdit && !isLocked && setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            disabled={!canEdit || isLocked}
            className="text-4xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-80 disabled:cursor-default"
            title={canEdit && !isLocked ? "Change Icon" : "Page Icon"}
          >
            {icon || "📄"}
          </button>

          {/* Emoji Picker Popover */}
          {isEmojiPickerOpen && canEdit && !isLocked && (
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
            disabled={!canEdit || isLocked}
            onChange={(e) => canEdit && !isLocked && handleTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={() => flushTitleSave(title)}
            placeholder="Untitled Page..."
            className={`flex-1 ${
              smallText ? "text-2xl sm:text-3xl font-bold" : "text-4xl font-extrabold"
            } text-slate-900 dark:text-white bg-transparent focus:outline-none tracking-tight placeholder-slate-300 dark:placeholder-slate-700 disabled:opacity-90 transition-all duration-150`}
          />
          {isLocked && (
            <span
              title="Page is locked"
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-full text-xs font-semibold flex-shrink-0"
            >
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </span>
          )}
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
          canEdit={canEdit && !isLocked}
          smallText={smallText}
        />
      )}

      {/* Page Attachments Section */}
      {isAttachmentsExpanded && (
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <AttachmentSection
            entityType="PAGE"
            entityId={page.id}
            canManage={canEdit && !isLocked}
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

      {/* Move Page Modal Dialog (FE1-04) */}
      <MovePageModal
        isOpen={isMoveModalOpen}
        pageId={page.id}
        pageTitle={title}
        currentParentId={page.parentId}
        pageTree={pageTree}
        onClose={() => setIsMoveModalOpen(false)}
        onSuccess={() => {
          toast.success("Page moved successfully!");
          fetchPageData();
          refetchTree();
        }}
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

      {/* ── Assign this page as task Modal ───────────────────────────────────── */}
      <AssignmentTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        pageId={pageId}
        pageTitle={title || page?.title || "Untitled"}
        onSuccess={() => {
          fetchPageData();
        }}
      />
    </div>
  );
};
