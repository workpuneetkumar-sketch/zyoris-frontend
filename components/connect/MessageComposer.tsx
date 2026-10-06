"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Loader2,
  X,
  Edit2,
  CornerDownRight,
  Check,
  Paperclip,
  File,
  AlertCircle,
} from "lucide-react";
import { ConnectMessage, MessageAttachment } from "@/types/connect";
import { uploadMessageAttachment } from "@/lib/api/connectApi";
import { TeamMember } from "@/lib/api/organizationsApi";

interface MessageComposerProps {
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  editingMessage?: ConnectMessage | null;
  replyingToMessage?: ConnectMessage | null;
  teamMembers?: TeamMember[];
  onSendMessage: (
    content: string,
    parentMessageId?: string | null,
    attachments?: MessageAttachment[],
    mentionedUserIds?: string[]
  ) => Promise<void> | void;
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
  teamMembers = [],
  onSendMessage,
  onSaveEdit,
  onCancelEdit,
  onCancelReply,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachments State
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await uploadMessageAttachment(file, (percent) => {
          setUploadProgress(percent);
        });
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err: any) {
      console.error("Failed to upload attachment:", err);
      setUploadError(err.message || "Failed to upload file. Please check size (max 25MB).");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Detect mention trigger
    const lastAtPos = val.lastIndexOf("@");
    if (lastAtPos !== -1 && lastAtPos === val.length - 1) {
      setMentionQuery("");
    } else if (lastAtPos !== -1 && !/\s/.test(val.slice(lastAtPos + 1))) {
      setMentionQuery(val.slice(lastAtPos + 1));
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (member: TeamMember) => {
    if (!member.name) return;
    const lastAtPos = content.lastIndexOf("@");
    if (lastAtPos !== -1) {
      const newText = `${content.slice(0, lastAtPos)}@${member.name} `;
      setContent(newText);
      if (member.id && !selectedMentionIds.includes(member.id)) {
        setSelectedMentionIds((prev) => [...prev, member.id]);
      }
    }
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const filteredMembers = mentionQuery !== null
    ? teamMembers.filter((m) =>
        (m.name || "").toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanContent = content.trim();
    if ((!cleanContent && attachments.length === 0) || sending || disabled || uploading) return;

    if (editingMessage && onSaveEdit) {
      await onSaveEdit(editingMessage.id, cleanContent);
      setContent("");
    } else {
      const toSendAttachments = [...attachments];
      const toSendMentionIds = [...selectedMentionIds];
      setContent("");
      setAttachments([]);
      setSelectedMentionIds([]);
      await onSendMessage(
        cleanContent,
        replyingToMessage ? replyingToMessage.id : null,
        toSendAttachments.length > 0 ? toSendAttachments : undefined,
        toSendMentionIds.length > 0 ? toSendMentionIds : undefined
      );
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

        {/* Upload Error Alert */}
        {uploadError && (
          <div className="px-3 py-1.5 bg-error-light text-error text-[11px] flex items-center justify-between border-b border-error">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={12} className="shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="p-0.5 hover:opacity-75">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="h-1 bg-surface w-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${uploadProgress || 20}%` }}
            />
          </div>
        )}

        {/* Attachment preview chips */}
        {attachments.length > 0 && (
          <div className="px-3 py-2 border-b border-border flex items-center gap-2 overflow-x-auto bg-surface">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-hover border border-border text-xs text-text shrink-0"
              >
                <File size={12} className="text-primary" />
                <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-text-muted hover:text-error ml-1 p-0.5"
                  title="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mention Dropdown Autocomplete */}
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="border-b border-border bg-surface p-1 shadow-md max-h-36 overflow-y-auto space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase">Mention Teammate</div>
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMention(m)}
                className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[10px]">
                  {(m.name || "U").slice(0, 1)}
                </div>
                <span className="font-semibold">{m.name}</span>
                <span className="text-[10px] text-text-muted truncate">({m.email})</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-2">
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {!editingMessage && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading || sending}
              className="p-2 text-text-muted hover:text-primary hover:bg-surface rounded-xl transition-colors shrink-0 disabled:opacity-40"
              title="Attach files (max 25MB)"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <Paperclip size={16} />
              )}
            </button>
          )}

          <textarea
            ref={textareaRef}
            id="message-composer-input"
            rows={1}
            value={content}
            onChange={handleContentChange}
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
                disabled={disabled || sending || (!content.trim() && attachments.length === 0)}
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
