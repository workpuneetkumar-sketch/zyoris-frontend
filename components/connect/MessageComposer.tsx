"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader2,
  X,
  Edit2,
  CornerDownRight,
  Check,
} from "lucide-react";
import { ConnectMessage } from "@/types/connect";

interface MessageComposerProps {
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  editingMessage?: ConnectMessage | null;
  replyingToMessage?: ConnectMessage | null;
  onSendMessage: (content: string, parentMessageId?: string | null) => Promise<void> | void;
  onSaveEdit?: (messageId: string, content: string) => Promise<void> | void;
  onCancelEdit?: () => void;
  onCancelReply?: () => void;
}

export default function MessageComposer({
  placeholder = "Type a message...",
  disabled = false,
  sending = false,
  editingMessage = null,
  replyingToMessage = null,
  onSendMessage,
  onSaveEdit,
  onCancelEdit,
  onCancelReply,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content when entering / leaving edit mode
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      textareaRef.current?.focus();
    } else if (!replyingToMessage) {
      // If we exited edit mode and no reply, keep what user was typing or clear
    }
  }, [editingMessage]);

  // Focus composer when reply is set
  useEffect(() => {
    if (replyingToMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingToMessage]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent || sending || disabled) return;

    if (editingMessage && onSaveEdit) {
      await onSaveEdit(editingMessage.id, cleanContent);
      setContent("");
    } else {
      setContent("");
      await onSendMessage(cleanContent, replyingToMessage ? replyingToMessage.id : null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      if (editingMessage && onCancelEdit) {
        onCancelEdit();
        setContent("");
      } else if (replyingToMessage && onCancelReply) {
        onCancelReply();
      }
    }
  };

  return (
    <div
      id="message-composer-container"
      className="p-3 md:p-4 bg-surface border-t border-border shrink-0"
    >
      <div className="bg-surface-hover border border-border rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary focus-within:bg-surface transition-all shadow-inner">
        {/* Reply Mode Context Header */}
        {replyingToMessage && !editingMessage && (
          <div
            id="composer-reply-banner"
            className="msg-reply-banner px-4 py-2 flex items-center justify-between text-xs border-b border-border"
          >
            <div className="flex items-center gap-2 text-text-secondary truncate">
              <CornerDownRight size={14} className="text-primary shrink-0" />
              <span className="font-semibold text-text truncate">
                Replying to {replyingToMessage.sender?.name || "User"}:
              </span>
              <span className="truncate italic text-text-muted">
                "{replyingToMessage.content}"
              </span>
            </div>
            <button
              id="cancel-reply-btn"
              type="button"
              onClick={onCancelReply}
              className="p-1 text-text-muted hover:text-text rounded-md hover:bg-surface transition-colors"
              title="Cancel Reply (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Edit Mode Context Header */}
        {editingMessage && (
          <div
            id="composer-edit-banner"
            className="msg-edit-banner px-4 py-2 flex items-center justify-between text-xs border-b border-border"
          >
            <div className="flex items-center gap-2 truncate">
              <Edit2 size={14} className="shrink-0" />
              <span className="font-semibold truncate">Editing message</span>
            </div>
            <button
              id="cancel-edit-btn"
              type="button"
              onClick={() => {
                onCancelEdit?.();
                setContent("");
              }}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-text hover:bg-surface-hover border border-border transition-colors"
            >
              Cancel Edit (Esc)
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-2">
          <textarea
            ref={textareaRef}
            id="message-composer-input"
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? "Edit your message..."
                : replyingToMessage
                ? `Reply to ${replyingToMessage.sender?.name || "user"}...`
                : placeholder
            }
            disabled={disabled || sending}
            className="flex-1 bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none resize-none py-1.5 max-h-32 min-h-[36px]"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 pb-1">
            {editingMessage ? (
              <div className="flex items-center gap-1">
                <button
                  id="save-edit-btn"
                  type="submit"
                  disabled={disabled || sending || !content.trim()}
                  className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Save</span>
                </button>
              </div>
            ) : (
              <button
                id="send-message-btn"
                type="submit"
                disabled={disabled || sending || !content.trim()}
                className="p-2 bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 flex items-center justify-center"
                title="Send Message (Enter)"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
