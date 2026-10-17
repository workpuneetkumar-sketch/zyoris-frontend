"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader2,
  X,
  Edit2,
  CornerDownRight,
  Check,
  AtSign,
  Smile,
  Lock,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { ConnectMessage, ChannelAudience } from "@/types/connect";
import MentionAutocomplete, { MentionMember } from "./MentionAutocomplete";
import ReactionPicker from "./ReactionPicker";

interface MessageComposerProps {
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  isArchived?: boolean;
  isReadOnly?: boolean;
  canManage?: boolean;
  audience?: ChannelAudience;
  editingMessage?: ConnectMessage | null;
  replyingToMessage?: ConnectMessage | null;
  teamMembers?: MentionMember[];
  onSendMessage: (
    content: string,
    parentMessageId?: string | null,
    mentionedUserIds?: string[],
    visibility?: "INTERNAL" | "CLIENT_SHARED"
  ) => Promise<void> | void;
  onSaveEdit?: (messageId: string, content: string) => Promise<void> | void;
  onCancelEdit?: () => void;
  onCancelReply?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export default function MessageComposer({
  placeholder = "Type a message...",
  disabled = false,
  sending = false,
  isArchived = false,
  isReadOnly = false,
  canManage = false,
  audience = "INTERNAL",
  editingMessage = null,
  replyingToMessage = null,
  teamMembers = [],
  onSendMessage,
  onSaveEdit,
  onCancelEdit,
  onCancelReply,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [messageVisibility, setMessageVisibility] = useState<"INTERNAL" | "CLIENT_SHARED">(
    audience === "CLIENT_SHARED" ? "CLIENT_SHARED" : "INTERNAL"
  );

  useEffect(() => {
    setMessageVisibility(audience === "CLIENT_SHARED" ? "CLIENT_SHARED" : "INTERNAL");
  }, [audience]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync content when entering / leaving edit mode
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Focus composer when reply is set
  useEffect(() => {
    if (replyingToMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingToMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Typing activity trigger
    if (onTypingStart) {
      onTypingStart();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop?.();
      }, 2000);
    }

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const lastAt = textBefore.lastIndexOf("@");
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBefore[lastAt - 1]))) {
      const q = textBefore.slice(lastAt + 1);
      if (!q.includes(" ")) {
        setMentionQuery(q);
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleSelectMention = (member: MentionMember) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = content.slice(0, cursor);
    const textAfter = content.slice(cursor);
    const lastAt = textBefore.lastIndexOf("@");
    const newContent = textBefore.slice(0, lastAt) + `@${member.name} ` + textAfter;
    setContent(newContent);
    setMentionQuery(null);
    textareaRef.current.focus();
  };

  const isComposerLocked = disabled || isArchived || (isReadOnly && !canManage);
  const effectivePlaceholder = isArchived
    ? "This channel is archived. Message sending is disabled."
    : isReadOnly && !canManage
    ? "This channel is read-only. Only channel admins can post."
    : editingMessage
    ? "Edit your message..."
    : replyingToMessage
    ? `Reply to ${replyingToMessage.sender?.name || "user"}...`
    : placeholder;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent || sending || isComposerLocked) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTypingStop?.();

    if (editingMessage && onSaveEdit) {
      await onSaveEdit(editingMessage.id, cleanContent);
      setContent("");
    } else {
      // Find mentioned user IDs
      const mentionedUserIds: string[] = [];
      teamMembers.forEach((tm) => {
        if (cleanContent.includes(`@${tm.name}`)) {
          mentionedUserIds.push(tm.id);
        }
      });

      setContent("");
      setMentionQuery(null);
      await onSendMessage(
        cleanContent,
        replyingToMessage ? replyingToMessage.id : null,
        mentionedUserIds,
        messageVisibility
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null) return; // allow mention autocomplete to capture Enter / Tab
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
      className="p-3 md:p-4 bg-surface border-t border-border shrink-0 relative"
    >
      {/* Mention Autocomplete Popup */}
      {mentionQuery !== null && (
        <MentionAutocomplete
          isOpen={true}
          query={mentionQuery}
          members={teamMembers}
          onSelect={handleSelectMention}
          onClose={() => setMentionQuery(null)}
        />
      )}

      {/* Emoji Picker Popover */}
      {isEmojiPickerOpen && (
        <ReactionPicker
          isOpen={true}
          onClose={() => setIsEmojiPickerOpen(false)}
          onSelectEmoji={(emoji) => {
            setContent((prev) => prev + emoji);
            textareaRef.current?.focus();
          }}
          className="left-4 bottom-full mb-2"
        />
      )}

      <div className={`bg-surface-hover border rounded-2xl overflow-hidden transition-all shadow-inner ${
        isComposerLocked ? "opacity-75 border-border bg-surface-hover/60" : "border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary focus-within:bg-surface"
      }`}>
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
        <form onSubmit={handleSubmit} className="flex flex-col">
          <textarea
            ref={textareaRef}
            id="message-composer-input"
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            disabled={isComposerLocked || sending}
            className="w-full px-4 pt-3 pb-1 bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none resize-none max-h-32 min-h-[36px] disabled:cursor-not-allowed"
          />

          {/* Action Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-light">
            <div className="flex items-center gap-1.5 text-text-muted">
              {/* Add @ mention */}
              <button
                type="button"
                disabled={isComposerLocked}
                onClick={() => {
                  setContent((prev) => prev + "@");
                  setMentionQuery("");
                  textareaRef.current?.focus();
                }}
                className="p-1.5 hover:text-primary hover:bg-surface rounded-lg transition-colors flex items-center gap-1 text-[11px] disabled:opacity-40"
                title="Mention a teammate (@)"
              >
                <AtSign size={14} />
              </button>

              {/* Add Emoji */}
              <button
                type="button"
                disabled={isComposerLocked}
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                className="p-1.5 hover:text-primary hover:bg-surface rounded-lg transition-colors disabled:opacity-40"
                title="Insert emoji"
              >
                <Smile size={14} />
              </button>

              {/* Client vs Internal Visibility Toggle (Audience Controls) */}
              {audience === "CLIENT_SHARED" && !isComposerLocked && (
                <div className="ml-2 flex items-center gap-0.5 bg-surface rounded-lg p-0.5 border border-border text-[10px]">
                  <button
                    type="button"
                    onClick={() => setMessageVisibility("CLIENT_SHARED")}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold transition-all ${
                      messageVisibility === "CLIENT_SHARED"
                        ? "bg-blue-500 text-white shadow-2xs"
                        : "text-text-muted hover:text-text"
                    }`}
                    title="Visible to clients and portal"
                  >
                    <Globe size={11} />
                    <span>Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageVisibility("INTERNAL")}
                    className={`px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold transition-all ${
                      messageVisibility === "INTERNAL"
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-text-muted hover:text-text"
                    }`}
                    title="Internal staff note (Hidden from clients)"
                  >
                    <Lock size={11} />
                    <span>Internal</span>
                  </button>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center gap-1.5">
              {editingMessage ? (
                <div className="flex items-center gap-1">
                  <button
                    id="save-edit-btn"
                    type="submit"
                    disabled={isComposerLocked || sending || !content.trim()}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
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
                  disabled={isComposerLocked || sending || !content.trim()}
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
          </div>
        </form>
      </div>
    </div>
  );
}
