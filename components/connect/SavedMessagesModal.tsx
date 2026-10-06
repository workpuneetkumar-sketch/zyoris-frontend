"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bookmark,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { ConnectMessage } from "@/types/connect";
import { getSavedMessages, unsaveMessage } from "@/lib/api/connectApi";
import MessageAttachmentRenderer from "./MessageAttachmentRenderer";

interface SavedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToSavedMessage?: (message: ConnectMessage) => void;
  onUnsaved?: (messageId: string) => void;
}

export default function SavedMessagesModal({
  isOpen,
  onClose,
  onJumpToSavedMessage,
  onUnsaved,
}: SavedMessagesModalProps) {
  const [savedList, setSavedList] = useState<ConnectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unsavingId, setUnsavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadSaved();
  }, [isOpen]);

  const loadSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSavedMessages(50);
      setSavedList(res.data);
      setNextCursor(res.nextCursor || null);
    } catch (err: any) {
      console.error("Failed to load saved messages:", err);
      setError("Failed to load saved messages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getSavedMessages(50, nextCursor);
      setSavedList((prev) => [...prev, ...res.data]);
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error("Failed to load more saved messages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUnsave = async (messageId: string) => {
    setUnsavingId(messageId);
    try {
      const ok = await unsaveMessage(messageId);
      if (ok) {
        setSavedList((prev) => prev.filter((m) => m.id !== messageId));
        if (onUnsaved) onUnsaved(messageId);
      }
    } catch (err) {
      console.error("Failed to unsave message:", err);
      alert("Failed to unsave message. Please try again.");
    } finally {
      setUnsavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-hover flex items-center justify-center text-primary border border-border">
              <Bookmark size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Saved Messages</h3>
              <p className="text-[11px] text-text-muted">Personal bookmarks across all conversations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs">Loading saved bookmarks...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-error-light text-error text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : savedList.length === 0 ? (
            <div className="py-12 text-center text-text-muted space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-surface-hover mx-auto flex items-center justify-center border border-border">
                <Bookmark size={22} className="text-text-muted" />
              </div>
              <p className="text-xs font-semibold text-text">No saved messages yet</p>
              <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                Save messages by clicking the bookmark option in the message menu to review them later.
              </p>
            </div>
          ) : (
            <>
              {savedList.map((msg) => {
                const author = msg.sender?.name || `User ${msg.senderId?.slice(-4) || ""}`;
                const time = new Date(msg.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl bg-surface-hover border border-border space-y-2 group hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-text">{author}</span>
                        <span className="text-[10px] text-text-muted">{time}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onJumpToSavedMessage && (
                          <button
                            onClick={() => {
                              onJumpToSavedMessage(msg);
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-medium rounded-lg text-primary hover:bg-surface border border-transparent hover:border-border flex items-center gap-1 transition-colors"
                            title="Jump to message"
                          >
                            <ExternalLink size={12} />
                            <span>Jump</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleUnsave(msg.id)}
                          disabled={unsavingId === msg.id}
                          className="p-1 rounded-lg text-text-muted hover:text-error hover:bg-surface transition-colors"
                          title="Remove bookmark"
                        >
                          {unsavingId === msg.id ? (
                            <Loader2 size={13} className="animate-spin text-error" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <MessageAttachmentRenderer attachments={msg.attachments} />
                    )}
                  </div>
                );
              })}

              {nextCursor && (
                <div className="pt-2 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-4 py-1.5 rounded-xl border border-border text-xs font-semibold text-text hover:bg-surface-hover transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load More Saved Messages"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
