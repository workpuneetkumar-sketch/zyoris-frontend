"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MoreHorizontal,
  Search,
  Check,
  Copy,
  Link as LinkIcon,
  Files,
  FolderInput,
  Trash2,
  Lock,
  Unlock,
  Settings2,
  MessageSquare,
  Globe,
  BookOpen,
  BarChart2,
  History,
  Upload,
  Download,
  CheckSquare,
  Sparkles,
  Loader2,
  Type,
  Maximize2,
} from "lucide-react";
import { PageLayoutWidth } from "@/types/workspace";

export type ToolbarAction =
  | "customize"
  | "comments"
  | "translate"
  | "wiki"
  | "analytics"
  | "history"
  | "import";

export interface PageActionItem {
  id: string;
  label: string;
  section: "layout" | "actions" | "features" | "danger";
  keywords: string[];
  icon: React.ElementType;
  iconColor?: string;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  execute?: () => void;
}

interface PageActionsMenuProps {
  pageId: string;
  pageTitle: string;
  canEdit: boolean;
  canDelete?: boolean;
  isLocked: boolean;
  layoutWidth: PageLayoutWidth;
  smallText: boolean;
  isWiki: boolean;
  isDuplicating?: boolean;
  onToggleLock: () => void | Promise<void>;
  onToggleSmallText: (val: boolean) => void | Promise<void>;
  onToggleFullWidth: (val: boolean) => void | Promise<void>;
  onCopyLink: () => void | Promise<void>;
  onCopyContent: () => void | Promise<void>;
  onDuplicate: () => void | Promise<void>;
  onOpenMoveModal: () => void;
  onDeletePage: () => void;
  onOpenPanel: (panel: ToolbarAction) => void;
  onOpenExport: () => void;
  onOpenAssignTask: () => void;
}

export const PageActionsMenu: React.FC<PageActionsMenuProps> = ({
  pageId,
  pageTitle,
  canEdit,
  canDelete = true,
  isLocked,
  layoutWidth,
  smallText,
  isWiki,
  isDuplicating = false,
  onToggleLock,
  onToggleSmallText,
  onToggleFullWidth,
  onCopyLink,
  onCopyContent,
  onDuplicate,
  onOpenMoveModal,
  onDeletePage,
  onOpenPanel,
  onOpenExport,
  onOpenAssignTask,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setFocusedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Central Action Registry (FE1-01, FE1-05, FE1-06, FE1-07)
  const actionRegistry: PageActionItem[] = useMemo(() => {
    return [
      // ── Reading & Layout Toggles ──
      {
        id: "small-text",
        label: "Small text",
        section: "layout",
        keywords: ["font", "size", "typography", "compact", "small"],
        icon: Type,
        iconColor: "text-slate-500",
        isToggle: true,
        toggleValue: smallText,
        onToggle: onToggleSmallText,
      },
      {
        id: "full-width",
        label: "Full width",
        section: "layout",
        keywords: ["width", "full", "wide", "expand", "layout"],
        icon: Maximize2,
        iconColor: "text-slate-500",
        isToggle: true,
        toggleValue: layoutWidth === "full",
        onToggle: onToggleFullWidth,
      },
      {
        id: "lock-page",
        label: isLocked ? "Unlock page" : "Lock page",
        section: "layout",
        keywords: ["lock", "unlock", "read only", "protect", "freeze", "permission"],
        icon: isLocked ? Unlock : Lock,
        iconColor: isLocked ? "text-amber-500" : "text-slate-500",
        disabled: !canEdit,
        isToggle: true,
        toggleValue: isLocked,
        onToggle: () => onToggleLock(),
      },

      // ── Core Clipboard & Page Actions ──
      {
        id: "copy-link",
        label: "Copy link",
        section: "actions",
        keywords: ["copy link", "share", "url", "clipboard", "address"],
        icon: LinkIcon,
        iconColor: "text-sky-500",
        execute: onCopyLink,
      },
      {
        id: "copy-content",
        label: "Copy page contents",
        section: "actions",
        keywords: ["copy content", "markdown", "text", "body", "clipboard", "export"],
        icon: Copy,
        iconColor: "text-blue-500",
        execute: onCopyContent,
      },
      {
        id: "duplicate",
        label: isDuplicating ? "Duplicating..." : "Duplicate",
        section: "actions",
        keywords: ["duplicate", "clone", "copy page", "replicate", "fork"],
        icon: isDuplicating ? Loader2 : Files,
        iconColor: "text-indigo-500",
        disabled: isDuplicating,
        execute: onDuplicate,
      },
      {
        id: "move-page",
        label: "Move to...",
        section: "actions",
        keywords: ["move", "folder", "parent", "location", "organize", "relocate"],
        icon: FolderInput,
        iconColor: "text-amber-500",
        execute: onOpenMoveModal,
      },

      // ── FE-2 & Extended Features ──
      {
        id: "customize",
        label: "Customize Page",
        section: "features",
        keywords: ["customize", "appearance", "icon", "cover", "theme", "header"],
        icon: Settings2,
        iconColor: "text-blue-500",
        execute: () => onOpenPanel("customize"),
      },
      {
        id: "comments",
        label: "Suggest Edits",
        section: "features",
        keywords: ["comments", "suggest", "edits", "discussion", "feedback", "review"],
        icon: MessageSquare,
        iconColor: "text-violet-500",
        execute: () => onOpenPanel("comments"),
      },
      {
        id: "translate",
        label: "Translate",
        section: "features",
        keywords: ["translate", "language", "multilingual", "localize", "spanish", "french"],
        icon: Globe,
        iconColor: "text-sky-500",
        execute: () => onOpenPanel("translate"),
      },
      {
        id: "wiki",
        label: isWiki ? "Revert from Wiki" : "Turn into Wiki",
        section: "features",
        keywords: ["wiki", "knowledge base", "documentation", "guide", "docs"],
        icon: BookOpen,
        iconColor: "text-violet-500",
        execute: () => onOpenPanel("wiki"),
      },
      {
        id: "analytics",
        label: "Page Analytics",
        section: "features",
        keywords: ["analytics", "views", "edits", "stats", "traffic", "metrics", "history"],
        icon: BarChart2,
        iconColor: "text-emerald-500",
        execute: () => onOpenPanel("analytics"),
      },
      {
        id: "history",
        label: "Version History",
        section: "features",
        keywords: ["version history", "revisions", "restore", "changelog", "undo", "versions"],
        icon: History,
        iconColor: "text-orange-500",
        execute: () => onOpenPanel("history"),
      },
      {
        id: "import",
        label: "Import",
        section: "features",
        keywords: ["import", "docx", "markdown", "upload", "file", "word"],
        icon: Upload,
        iconColor: "text-teal-500",
        disabled: !canEdit || isLocked,
        execute: () => onOpenPanel("import"),
      },
      {
        id: "export",
        label: "Export",
        section: "features",
        keywords: ["export", "download", "pdf", "html", "markdown", "save"],
        icon: Download,
        iconColor: "text-indigo-500",
        execute: onOpenExport,
      },
      {
        id: "assign-task",
        label: "Assign this page as task",
        section: "features",
        keywords: ["assign", "task", "employee", "team", "todo", "action"],
        icon: CheckSquare,
        iconColor: "text-indigo-500",
        execute: onOpenAssignTask,
      },

      // ── Danger Zone ──
      {
        id: "trash",
        label: "Move to Trash",
        section: "danger",
        keywords: ["trash", "delete", "remove", "archive", "destroy", "soft delete"],
        icon: Trash2,
        iconColor: "text-rose-500",
        destructive: true,
        disabled: !canDelete,
        execute: onDeletePage,
      },
    ];
  }, [
    canDelete,
    canEdit,
    isDuplicating,
    isLocked,
    isWiki,
    layoutWidth,
    onCopyContent,
    onCopyLink,
    onDeletePage,
    onDuplicate,
    onOpenAssignTask,
    onOpenExport,
    onOpenMoveModal,
    onOpenPanel,
    onToggleFullWidth,
    onToggleLock,
    onToggleSmallText,
    smallText,
  ]);

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return actionRegistry;

    return actionRegistry.filter((action) => {
      const labelMatch = action.label.toLowerCase().includes(query);
      const keywordMatch = action.keywords.some((k) => k.toLowerCase().includes(query));
      return labelMatch || keywordMatch;
    });
  }, [actionRegistry, searchQuery]);

  // List of items navigable via keyboard (exclude disabled items)
  const navigableActions = useMemo(() => {
    return filteredActions.filter((a) => !a.disabled);
  }, [filteredActions]);

  // Handle keyboard events (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerButtonRef.current?.focus();
      return;
    }

    if (navigableActions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % navigableActions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + navigableActions.length) % navigableActions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currentAction = navigableActions[focusedIndex];
      if (currentAction && !currentAction.disabled) {
        if (currentAction.isToggle && currentAction.onToggle) {
          currentAction.onToggle(!currentAction.toggleValue);
        } else if (currentAction.execute) {
          setIsOpen(false);
          currentAction.execute();
        }
      }
    }
  };

  const handleActionClick = (action: PageActionItem) => {
    if (action.disabled) return;
    if (action.isToggle && action.onToggle) {
      action.onToggle(!action.toggleValue);
      return;
    }
    setIsOpen(false);
    if (action.execute) {
      action.execute();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Three-Dot Trigger Button (FE1-01) */}
      <button
        ref={triggerButtonRef}
        type="button"
        id="page-actions-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="More page actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition ${
          isOpen
            ? "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
        }`}
        title="Page options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Dropdown Menu Modal / Popover */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="page-actions-menu-trigger"
          className="absolute right-0 top-9 w-64 max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800/80 focus:outline-none"
        >
          {/* Action Search Input (FE1-07) */}
          <div className="px-3 pb-2 pt-1">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search actions..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* If Search Active: Flat Filtered List */}
          {searchQuery.trim() !== "" ? (
            <div className="py-1">
              {filteredActions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No actions found for "{searchQuery}"
                </div>
              ) : (
                filteredActions.map((action) => {
                  const isCurrentFocused =
                    navigableActions[focusedIndex]?.id === action.id;
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.id}
                      type="button"
                      role="menuitem"
                      disabled={action.disabled}
                      onClick={() => handleActionClick(action)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition text-left ${
                        isCurrentFocused
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium"
                          : action.destructive
                          ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      } ${action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            action.isToggle && action.toggleValue
                              ? "text-blue-600 dark:text-blue-400"
                              : action.iconColor || "text-slate-500"
                          } ${action.id === "duplicate" && isDuplicating ? "animate-spin" : ""}`}
                        />
                        <span className="truncate">{action.label}</span>
                      </div>

                      {action.isToggle ? (
                        <div
                          className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            action.toggleValue ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              action.toggleValue ? "translate-x-3" : "translate-x-0"
                            }`}
                          />
                        </div>
                      ) : action.shortcut ? (
                        <span className="text-[10px] text-slate-400 font-mono ml-2">
                          {action.shortcut}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* Grouped Sections (Reference-style) */
            <>
              {/* Section 1: Page Layout & Lock Toggles (FE1-05, FE1-06) */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Page Style & Lock
                </div>
                {actionRegistry
                  .filter((a) => a.section === "layout")
                  .map((action) => {
                    const isCurrentFocused =
                      navigableActions[focusedIndex]?.id === action.id;
                    const Icon = action.icon;

                    return (
                      <div
                        key={action.id}
                        role="menuitem"
                        onClick={() => handleActionClick(action)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs select-none transition ${
                          isCurrentFocused
                            ? "bg-slate-100 dark:bg-slate-800"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        } ${action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon
                            className={`w-4 h-4 ${
                              action.toggleValue
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-400"
                            }`}
                          />
                          <span className="text-slate-700 dark:text-slate-200 font-medium">
                            {action.label}
                          </span>
                        </div>

                        {/* Modern Toggle Switch Switch */}
                        <div
                          className={`relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            action.toggleValue
                              ? "bg-blue-600"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              action.toggleValue ? "translate-x-3" : "translate-x-0"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Section 2: Core Actions (FE1-02, FE1-03, FE1-04) */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Actions
                </div>
                {actionRegistry
                  .filter((a) => a.section === "actions")
                  .map((action) => {
                    const isCurrentFocused =
                      navigableActions[focusedIndex]?.id === action.id;
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        type="button"
                        role="menuitem"
                        disabled={action.disabled}
                        onClick={() => handleActionClick(action)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition ${
                          isCurrentFocused
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        } ${action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${
                              action.iconColor || "text-slate-400"
                            } ${action.id === "duplicate" && isDuplicating ? "animate-spin" : ""}`}
                          />
                          <span className="truncate">{action.label}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Section 3: Page Features (FE-2 & Collaborative tools) */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Page Features
                </div>
                {actionRegistry
                  .filter((a) => a.section === "features")
                  .map((action) => {
                    const isCurrentFocused =
                      navigableActions[focusedIndex]?.id === action.id;
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        type="button"
                        role="menuitem"
                        disabled={action.disabled}
                        onClick={() => handleActionClick(action)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition ${
                          isCurrentFocused
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        } ${action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${action.iconColor || "text-slate-400"}`}
                          />
                          <span className="truncate">{action.label}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Section 4: Danger Zone */}
              <div className="py-1">
                {actionRegistry
                  .filter((a) => a.section === "danger")
                  .map((action) => {
                    const isCurrentFocused =
                      navigableActions[focusedIndex]?.id === action.id;
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        type="button"
                        role="menuitem"
                        disabled={action.disabled}
                        onClick={() => handleActionClick(action)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition ${
                          isCurrentFocused
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-medium"
                            : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        } ${action.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Icon className="w-4 h-4 flex-shrink-0 text-rose-500" />
                          <span className="truncate font-medium">{action.label}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
