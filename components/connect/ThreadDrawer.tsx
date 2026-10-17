"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Loader2,
  Paperclip,
  CornerDownRight,
  MessageSquare,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  ConnectMessage,
  MessageAttachment,
  SendReplyPayload,
} from "@/types/connect";
import { getMessageReplies, sendReply, uploadMessageAttachment } from "@/lib/api/connectApi";
import MessageAttachmentRenderer from "./MessageAttachmentRenderer";
import { TeamMember } from "@/lib/api/organizationsApi";

interface ThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: ConnectMessage | null;
  currentUserId?: string | null;
  teamMembers?: TeamMember[];
  onReplySent?: (parentMessageId: string, reply: ConnectMessage) => void;
}

export default function ThreadDrawer({
  isOpen,
  onClose,
  parentMessage,
  currentUserId,
  teamMembers = [],
  onReplySent,
}: ThreadDrawerProps) {
  const [replies, setReplies] = useState<ConnectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Attachments in reply
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen || !parentMessage) {
      setReplies([]);
      setNextCursor(null);
      return;
    }

    loadReplies(parentMessage.id);
  }, [isOpen, parentMessage?.id]);

  const loadReplies = async (msgId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMessageReplies(msgId, 50);
      setReplies(res.data);
      setNextCursor(res.nextCursor || null);
    } catch (err: any) {
      console.error("Failed to load thread replies:", err);
      setError("Failed to load thread replies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreReplies = async () => {
    if (!parentMessage || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getMessageReplies(parentMessage.id, 50, nextCursor);
      setReplies((prev) => [...res.data, ...prev]);
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error("Failed to load more replies:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll to bottom when replies change
  useEffect(() => {
    if (replies.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [replies.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await uploadMessageAttachment(file);
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err: any) {
      console.error("Failed to upload attachment:", err);
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyText(val);

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
    const lastAtPos = replyText.lastIndexOf("@");
    if (lastAtPos !== -1) {
      const newText = `${replyText.slice(0, lastAtPos)}@${member.name} `;
      setReplyText(newText);
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!parentMessage || (!replyText.trim() && attachments.length === 0) || sending) return;

    setSending(true);

    const tempReply: ConnectMessage = {
      id: `opt-reply-${Date.now()}`,
      organizationId: parentMessage.organizationId,
      senderId: currentUserId || "me",
      parentMessageId: parentMessage.id,
      content: replyText.trim(),
      attachments,
      createdAt: new Date().toISOString(),
      status: "sending",
      sender: {
        id: currentUserId || "me",
        name: "You",
      },
    };

    setReplies((prev) => [...prev, tempReply]);
    const sentText = replyText.trim();
    const sentAttachments = [...attachments];
    const sentMentionIds = [...selectedMentionIds];

    setReplyText("");
    setAttachments([]);
    setSelectedMentionIds([]);

    try {
      const payload: SendReplyPayload = {
        content: sentText,
        attachments: sentAttachments.length > 0 ? sentAttachments : undefined,
        mentionedUserIds: sentMentionIds.length > 0 ? sentMentionIds : undefined,
      };

      const realReply = await sendReply(parentMessage.id, payload);

      setReplies((prev) =>
        prev.map((r) => (r.id === tempReply.id ? { ...realReply, status: "sent" } : r))
      );

      if (onReplySent) {
        onReplySent(parentMessage.id, realReply);
      }
    } catch (err: any) {
      console.error("Failed to send reply:", err);
      setReplies((prev) =>
        prev.map((r) => (r.id === tempReply.id ? { ...r, status: "failed", error: "Failed to send reply" } : r))
      );
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !parentMessage) return null;

  const parentSenderName = parentMessage.sender?.name || `User ${parentMessage.senderId.slice(-4)}`;

  return (
    <div
      id="thread-drawer-container"
      className="w-full md:w-[380px] lg:w-[420px] h-full flex flex-col bg-surface border-l border-border shrink-0 shadow-lg z-20"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-surface">
        <div className="flex items-center gap-2">
          <CornerDownRight size={18} className="text-primary" />
          <h3 className="text-sm font-bold text-text">Thread</h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-hover text-text-muted border border-border">
            {replies.length} replies
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          title="Close Thread"
        >
          <X size={18} />
        </button>
      </div>

      {/* Thread Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Parent Message Highlight */}
        <div className="p-3.5 rounded-2xl bg-surface-hover border border-border space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs overflow-hidden">
              {parentMessage.sender?.avatarUrl ? (
                <img src={parentMessage.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                parentSenderName.slice(0, 2).toUpperCase()
              )}
            </div>
            <span className="font-bold text-text">{parentSenderName}</span>
            <span className="text-[10px] text-text-muted">
              {new Date(parentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">{parentMessage.content}</p>
          {parentMessage.attachments && parentMessage.attachments.length > 0 && (
            <MessageAttachmentRenderer attachments={parentMessage.attachments} />
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted">
          <div className="h-px bg-border flex-1" />
          <span>Replies</span>
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Load more button */}
        {nextCursor && (
          <div className="text-center">
            <button
              onClick={loadMoreReplies}
              disabled={loadingMore}
              className="px-3 py-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load older replies"}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs">Loading replies...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-error-light text-error text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : replies.length === 0 ? (
          <div className="py-12 text-center text-text-muted space-y-2">
            <div className="w-10 h-10 rounded-xl bg-surface-hover mx-auto flex items-center justify-center border border-border">
              <MessageSquare size={20} className="text-text-muted" />
            </div>
            <p className="text-xs font-semibold text-text">No replies yet</p>
            <p className="text-[11px] text-text-muted max-w-xs mx-auto">
              Be the first to reply in this thread!
            </p>
          </div>
        ) : (
          /* Replies Stream */
          <div className="space-y-3">
            {replies.map((reply) => {
              const isSelf = reply.senderId === currentUserId || reply.sender?.id === currentUserId || reply.id.startsWith("opt-");
              const rSenderName = reply.sender?.name || (isSelf ? "You" : "Teammate");

              return (
                <div key={reply.id} className="flex items-start gap-2.5 group">
                  <div className="w-6 h-6 rounded-full bg-surface-hover text-text font-bold flex items-center justify-center text-[10px] shrink-0 border border-border">
                    {rSenderName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-bold text-text">{rSenderName}</span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mt-1 p-2.5 rounded-xl bg-surface-hover border border-border text-xs leading-relaxed text-text whitespace-pre-wrap">
                      {reply.content}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <MessageAttachmentRenderer attachments={reply.attachments} />
                      )}
                      {reply.status === "sending" && (
                        <div className="mt-1 text-[10px] text-text-muted flex items-center gap-1">
                          <Clock size={10} className="animate-spin" />
                          <span>Sending reply...</span>
                        </div>
                      )}
                      {reply.status === "failed" && (
                        <div className="mt-1 text-[10px] text-error flex items-center gap-1">
                          <AlertCircle size={10} />
                          <span>Failed to send reply</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={bottomRef} className="h-px" />
      </div>

      {/* Attachment upload error */}
      {uploadError && (
        <div className="px-4 py-1.5 bg-error-light text-error text-[11px] flex items-center justify-between border-t border-error">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Attachment preview chips */}
      {attachments.length > 0 && (
        <div className="px-3 py-2 border-t border-border flex items-center gap-2 overflow-x-auto bg-surface">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-hover border border-border text-xs text-text shrink-0"
            >
              <Paperclip size={12} className="text-primary" />
              <span className="truncate max-w-[120px] font-medium">{att.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-text-muted hover:text-error ml-1"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention autocomplete dropdown */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="border-t border-border bg-surface p-1 shadow-lg max-h-36 overflow-y-auto space-y-0.5">
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

      {/* Reply Composer */}
      <div className="p-3 border-t border-border bg-surface shrink-0">
        <form onSubmit={handleSend} className="bg-surface-hover border border-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-primary focus-within:bg-surface transition-all">
          <textarea
            ref={textareaRef}
            rows={2}
            value={replyText}
            onChange={handleTextChange}
            placeholder={`Reply to ${parentSenderName}...`}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="w-full bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none resize-none min-h-[36px]"
          />

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors disabled:opacity-40"
                title="Attach file (max 25MB)"
              >
                {uploading ? <Loader2 size={14} className="animate-spin text-primary" /> : <Paperclip size={14} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={(!replyText.trim() && attachments.length === 0) || sending || uploading}
              className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-40 transition-all flex items-center gap-1"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Reply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
