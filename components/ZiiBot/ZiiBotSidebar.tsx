"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Calendar,
} from "lucide-react";
import type { ChatSession } from "@/lib/api/chatApi";

interface ZiiBotSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  isLoading: boolean;
  onCloseMobile?: () => void;
  className?: string;
  isDark?: boolean;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 2) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function ZiiBotSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  isLoading,
  onCloseMobile,
  className = "",
  isDark = false,
}: ZiiBotSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.lastMessage && s.lastMessage.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  const handleStartRename = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onRenameSession(id, editTitle.trim());
      setEditingId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle("");
  };

  const handleStartDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleConfirmDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onDeleteSession(id);
      setDeletingId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <div
      className={`flex flex-col h-full border-r select-none ${
        isDark
          ? "bg-[#09090b] border-zinc-800 text-zinc-300"
          : "bg-zinc-50 border-zinc-200 text-zinc-700"
      } ${className}`}
    >
      {/* ── Top Header with New Chat Button ── */}
      <div
        className={`p-3 border-b flex flex-col gap-2.5 ${
          isDark ? "bg-[#09090b] border-zinc-800" : "bg-white border-zinc-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className={isDark ? "text-zinc-400" : "text-zinc-500"} />
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              Conversations ({sessions.length})
            </span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className={`p-1 rounded-md transition-colors ${
                isDark
                  ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
              title="Close sidebar"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            onNewChat();
            onCloseMobile?.();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-xs transition-all active:scale-[0.98] ${
            isDark
              ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/60 shadow-xs"
              : "bg-zinc-900 hover:bg-black text-white shadow-xs"
          }`}
        >
          <Plus size={14} />
          <span>New Chat</span>
        </button>

        {/* Search */}
        {sessions.length > 2 && (
          <div className="relative">
            <Search
              size={13}
              className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
                isDark ? "text-zinc-500" : "text-zinc-400"
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg outline-none transition-all ${
                isDark
                  ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-700"
                  : "bg-zinc-100 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-400"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sessions List ── */}
      <div
        className={`flex-1 overflow-y-auto px-2 py-2 space-y-1 zii-chat-scroll ${
          isDark ? "bg-[#09090b]" : "bg-zinc-50"
        }`}
      >
        {isLoading && sessions.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center py-8 gap-2 ${
              isDark ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            <Loader2 size={16} className="animate-spin text-emerald-500" />
            <span className="text-xs">Loading history...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center py-8 px-3 text-center ${
              isDark ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            <Calendar size={20} className="mb-1.5 opacity-60" />
            <p className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              {searchQuery ? "No matching chats" : "No conversations yet"}
            </p>
            <p className="text-[11px] mt-0.5 opacity-80">
              {searchQuery ? "Try another search" : "Ask anything to get started"}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingId === session.id;
            const isDeleting = deletingId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => {
                  if (!isEditing && !isDeleting) {
                    onSelectSession(session.id);
                    onCloseMobile?.();
                  }
                }}
                className={`group relative flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                  isActive
                    ? isDark
                      ? "bg-zinc-800/90 text-white font-medium border border-zinc-700/80 shadow-xs"
                      : "bg-white text-zinc-950 font-medium border border-zinc-300 shadow-xs"
                    : isDark
                    ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
                    : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 border border-transparent"
                }`}
              >
                {/* Editing title input */}
                {isEditing ? (
                  <div
                    className="flex items-center gap-1.5 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(session.id, e as any);
                        if (e.key === "Escape") handleCancelRename(e as any);
                      }}
                      autoFocus
                      className={`flex-1 px-2 py-1 text-xs rounded border outline-none ${
                        isDark
                          ? "bg-zinc-900 border-zinc-700 text-white"
                          : "bg-white border-zinc-300 text-zinc-900"
                      }`}
                    />
                    <button
                      onClick={(e) => handleSaveRename(session.id, e)}
                      disabled={isSubmitting}
                      className="p-1 hover:text-emerald-500 rounded"
                      title="Save title"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 hover:text-rose-500 rounded"
                      title="Cancel"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : isDeleting ? (
                  /* Deleting confirmation inline */
                  <div
                    className="flex items-center justify-between w-full py-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] text-rose-500 font-medium">Delete chat?</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleConfirmDelete(session.id, e)}
                        disabled={isSubmitting}
                        className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-medium hover:bg-rose-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Regular session row */
                  <>
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate font-medium leading-snug">
                        {session.title || "Untitled conversation"}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                        {formatRelativeTime(session.updatedAt || session.createdAt)}
                      </p>
                    </div>

                    {/* Quick actions (Rename / Delete) */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(session, e)}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? "hover:text-white hover:bg-zinc-700"
                            : "hover:text-zinc-900 hover:bg-zinc-200"
                        }`}
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleStartDelete(session.id, e)}
                        className="p-1 hover:text-rose-500 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
