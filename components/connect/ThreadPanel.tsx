"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  MessageSquare,
  Send,
  Loader2,
  CornerDownRight,
  Smile,
  AtSign,
  AlertCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { ConnectMessage, MessageReactionSummary } from "@/types/connect";
import { getThreadReplies, sendThreadReply, addReaction, removeReaction } from "@/lib/api/connectApi";
import ReactionPicker from "./ReactionPicker";
import MentionAutocomplete, { MentionMember } from "./MentionAutocomplete";

interface ThreadPanelProps {
  parentMessage: ConnectMessage | null;
  onClose: () => void;
  currentUserId?: string | null;
  teamMembers?: MentionMember[];
  onEmitThreadReply?: (payload: { messageId: string; content: string }) => void;
  onEmitReactionAdd?: (payload: { messageId: string; emoji: string }) => void;
  onEmitReactionRemove?: (payload: { messageId: string; emoji: string }) => void;
  onEmitMentionNew?: (payload: { messageId: string; mentionedUserIds: string[] }) => void;
}

export default function ThreadPanel({
  parentMessage,
  onClose,
  currentUserId,
  teamMembers = [],
  onEmitThreadReply,
  onEmitReactionAdd,
  onEmitReactionRemove,
  onEmitMentionNew,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<ConnectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  // Reaction picker state for thread replies
  const [activeReactionTargetId, setActiveReactionTargetId] = useState<string | null>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!parentMessage?.id) {
      setReplies([]);
      return;
    }
    loadReplies(parentMessage.id);
  }, [parentMessage?.id]);

  const loadReplies = async (messageId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getThreadReplies(messageId);
      setReplies(res.data);
      scrollToBottom();
    } catch (err: any) {
      console.error("Failed to load thread replies:", err);
      setError("Failed to load replies.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyContent(val);

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBeforeCursor[lastAt - 1]))) {
      const q = textBeforeCursor.slice(lastAt + 1);
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
    const textBefore = replyContent.slice(0, cursor);
    const textAfter = replyContent.slice(cursor);
    const lastAt = textBefore.lastIndexOf("@");
    const newText = textBefore.slice(0, lastAt) + `@${member.name} ` + textAfter;
    setReplyContent(newText);
    setMentionQuery(null);
    textareaRef.current.focus();
  };

  const handleSubmitReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!parentMessage || !replyContent.trim() || sending) return;

    const content = replyContent.trim();
    setSending(true);

    // Scan mentions
    const mentionedUserIds: string[] = [];
    teamMembers.forEach((tm) => {
      if (content.includes(`@${tm.name}`)) {
        mentionedUserIds.push(tm.id);
      }
    });

    const tempId = `thread-opt-${Date.now()}`;
    const optimisticReply: ConnectMessage = {
      id: tempId,
      organizationId: "",
      senderId: currentUserId || "me",
      parentMessageId: parentMessage.id,
      content,
      type: "TEXT",
      createdAt: new Date().toISOString(),
      status: "sending",
      sender: {
        id: currentUserId || "me",
        name: "You",
        email: "",
      },
      mentionedUserIds,
    };

    setReplies((prev) => [...prev, optimisticReply]);
    setReplyContent("");
    setMentionQuery(null);
    scrollToBottom();

    try {
      const sent = await sendThreadReply({
        messageId: parentMessage.id,
        content,
        mentionedUserIds,
      });

      setReplies((prev) =>
        prev.map((r) => (r.id === tempId ? { ...sent, status: "sent" } : r))
      );

      // Emit Day 2 Socket.IO contracts
      onEmitThreadReply?.({ messageId: parentMessage.id, content });
      if (mentionedUserIds.length > 0) {
        onEmitMentionNew?.({ messageId: sent.id || tempId, mentionedUserIds });
      }
    } catch (err) {
      console.error("Failed to send thread reply:", err);
      setReplies((prev) =>
        prev.map((r) => (r.id === tempId ? { ...r, status: "failed", error: "Failed to send" } : r))
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null) return; // let autocomplete handle Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleToggleReaction = async (message: ConnectMessage, emoji: string) => {
    const existing = message.reactions?.find((r) => r.emoji === emoji);
    const hasReacted = existing?.hasReacted;

    // Optimistic UI toggle for reply reactions
    setReplies((prev) =>
      prev.map((m) => {
        if (m.id !== message.id) return m;
        const copyReactions = [...(m.reactions || [])];
        const rIndex = copyReactions.findIndex((r) => r.emoji === emoji);
        if (hasReacted) {
          if (rIndex !== -1) {
            const count = copyReactions[rIndex].count - 1;
            if (count <= 0) copyReactions.splice(rIndex, 1);
            else copyReactions[rIndex] = { ...copyReactions[rIndex], count, hasReacted: false };
          }
        } else {
          if (rIndex !== -1) {
            copyReactions[rIndex] = {
              ...copyReactions[rIndex],
              count: copyReactions[rIndex].count + 1,
              hasReacted: true,
            };
          } else {
            copyReactions.push({
              emoji,
              count: 1,
              hasReacted: true,
              users: [{ id: currentUserId || "me", name: "You" }],
            });
          }
        }
        return { ...m, reactions: copyReactions };
      })
    );

    if (hasReacted) {
      await removeReaction(message.id, emoji);
      onEmitReactionRemove?.({ messageId: message.id, emoji });
    } else {
      await addReaction(message.id, emoji);
      onEmitReactionAdd?.({ messageId: message.id, emoji });
    }
  };

  if (!parentMessage) return null;

  const isParentDeleted = Boolean(parentMessage.deletedAt);
  const parentSenderName = parentMessage.sender?.name || (parentMessage.senderId === currentUserId ? "You" : "Teammate");

  return (
    <div
      id="connect-thread-panel"
      className="w-full md:w-[380px] lg:w-[420px] bg-surface border-l border-border flex flex-col h-full shrink-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200"
    >
      {/* Thread Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text tracking-tight">Thread</h3>
            <p className="text-[11px] text-text-muted">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          id="close-thread-panel-btn"
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-colors"
          title="Close Thread (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Parent Message Card */}
        <div className="p-3.5 bg-surface-hover border border-border rounded-2xl relative shadow-xs">
          {isParentDeleted ? (
            <div className="flex items-center gap-2 text-xs text-error font-medium p-2 bg-error/10 rounded-xl">
              <AlertCircle size={15} />
              <span>The parent message of this thread has been deleted.</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {parentMessage.sender?.avatarUrl ? (
                    <img src={parentMessage.sender.avatarUrl} alt={parentSenderName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{parentSenderName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text">{parentSenderName}</h4>
                  <span className="text-[10px] text-text-muted">
                    {new Date(parentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <div className="text-xs text-text leading-relaxed whitespace-pre-wrap pl-1">
                {parentMessage.content}
              </div>
            </div>
          )}
        </div>

        {/* Divider with replies count */}
        <div className="flex items-center gap-2 my-2">
          <div className="h-px bg-border flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">
            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
          </span>
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Replies List */}
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-text-muted">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-xs">Loading replies...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-error/10 text-error rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        ) : replies.length === 0 ? (
          <div className="py-10 text-center text-text-muted text-xs italic">
            No replies in this thread yet. Send the first response below!
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => {
              const isSelf = (currentUserId && reply.senderId === currentUserId) || reply.sender?.id === currentUserId;
              const name = reply.sender?.name || (isSelf ? "You" : "Teammate");

              return (
                <div key={reply.id} className="group relative flex items-start gap-2.5 py-1">
                  <div className="w-7 h-7 rounded-full bg-surface-hover text-text-secondary text-xs font-bold flex items-center justify-center shrink-0 border border-border overflow-hidden">
                    {reply.sender?.avatarUrl ? (
                      <img src={reply.sender.avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-text">{name}</span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface border border-border text-xs leading-relaxed text-text break-words shadow-xs">
                      <div className="whitespace-pre-wrap">{reply.content}</div>

                      {/* Reply Sending / Failed Status */}
                      {reply.status === "sending" && (
                        <div className="flex items-center gap-1 text-[10px] text-text-muted mt-1">
                          <Clock size={10} className="animate-spin" />
                          <span>Sending...</span>
                        </div>
                      )}
                    </div>

                    {/* Reactions Pill Stream for Reply */}
                    {reply.reactions && reply.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {reply.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => handleToggleReaction(reply, r.emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all ${
                              r.hasReacted
                                ? "bg-primary/10 border-primary/40 text-primary font-bold"
                                : "bg-surface hover:bg-surface-hover border-border text-text"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Button for Reply */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    <button
                      onClick={() => setActiveReactionTargetId(activeReactionTargetId === reply.id ? null : reply.id)}
                      className="p-1 text-text-muted hover:text-primary hover:bg-surface-hover rounded transition-colors"
                      title="Add reaction"
                    >
                      <Smile size={13} />
                    </button>
                    {activeReactionTargetId === reply.id && (
                      <ReactionPicker
                        isOpen={true}
                        onClose={() => setActiveReactionTargetId(null)}
                        onSelectEmoji={(emoji) => handleToggleReaction(reply, emoji)}
                        className="right-0 top-6"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Thread Composer */}
      <div className="p-3 bg-surface border-t border-border shrink-0 relative">
        {/* Mention Autocomplete floating above thread composer */}
        {mentionQuery !== null && (
          <MentionAutocomplete
            isOpen={true}
            query={mentionQuery}
            members={teamMembers}
            onSelect={handleSelectMention}
            onClose={() => setMentionQuery(null)}
          />
        )}

        <form onSubmit={handleSubmitReply} className="flex flex-col gap-2">
          <div className="bg-surface-hover border border-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-primary focus-within:bg-surface transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={replyContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Reply to thread... (type @ to mention)"
              disabled={sending}
              className="w-full bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-1 border-t border-border-light">
              <div className="flex items-center gap-1 text-text-muted">
                <button
                  type="button"
                  onClick={() => {
                    const next = replyContent + "@";
                    setReplyContent(next);
                    setMentionQuery("");
                    textareaRef.current?.focus();
                  }}
                  className="p-1 hover:text-primary hover:bg-surface rounded text-[11px] flex items-center gap-0.5"
                  title="Mention someone"
                >
                  <AtSign size={13} />
                </button>
              </div>

              <button
                type="submit"
                disabled={sending || !replyContent.trim()}
                className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold rounded-lg shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Reply</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
