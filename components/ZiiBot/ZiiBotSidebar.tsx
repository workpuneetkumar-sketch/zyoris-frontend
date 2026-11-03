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
      className={`flex flex-col h-full bg-slate-50 border-r border-gray-200 text-gray-800 select-none ${className}`}
    >
      {/* ── Top Header with New Chat Button ── */}
      <div className="p-3 border-b border-gray-200 flex flex-col gap-2.5 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Conversations ({sessions.length})
            </span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Close sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            onNewChat();
            onCloseMobile?.();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-200 active:scale-[0.98] transition-all"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        {/* Search */}
        {sessions.length > 3 && (
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sessions List ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 zii-chat-scroll bg-slate-50">
        {isLoading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            <span className="text-xs">Loading conversations...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-3 text-center text-gray-400">
            <Calendar size={22} className="text-gray-300 mb-1.5" />
            <p className="text-xs font-semibold text-gray-600">
              {searchQuery ? "No matching chats" : "No conversations yet"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {searchQuery
                ? "Try a different search query"
                : "Ask ZII BOT a CRM question to get started"}
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
                className={`group relative flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs font-semibold"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
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
                      disabled={isSubmitting}
                      className="flex-1 px-2 py-1 bg-white border border-blue-500 rounded text-xs text-gray-900 outline-none"
                    />
                    <button
                      onClick={(e) => handleSaveRename(session.id, e)}
                      disabled={isSubmitting || !editTitle.trim()}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Save"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      disabled={isSubmitting}
                      className="p-1 text-gray-400 hover:bg-gray-200 rounded"
                      title="Cancel"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : isDeleting ? (
                  /* Confirm Delete */
                  <div
                    className="flex items-center justify-between w-full py-0.5 text-rose-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] font-bold">Delete chat?</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleConfirmDelete(session.id, e)}
                        disabled={isSubmitting}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                      >
                        {isSubmitting ? "..." : "Delete"}
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        disabled={isSubmitting}
                        className="px-1.5 py-0.5 text-gray-500 hover:text-gray-700 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard session row */
                  <>
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isActive ? "bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.6)]" : "bg-gray-300"
                        }`}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate font-medium text-xs" title={session.title}>
                          {session.title}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate">
                          {formatRelativeTime(session.updatedAt || session.createdAt)}
                          {session.lastMessage ? ` • ${session.lastMessage}` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Rename / Delete (visible on group hover or active) */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(session, e)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-200 rounded"
                        title="Rename conversation"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleStartDelete(session.id, e)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete conversation"
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

      {/* ── Footer ── */}
      <div className="p-2.5 border-t border-gray-200 bg-white text-[10px] text-gray-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          CRM Access Scoped
        </span>
        <span className="font-bold text-gray-700">ZII Intelligence</span>
      </div>
    </div>
  );
}
