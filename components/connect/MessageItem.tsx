"use client";

import React, { useState } from "react";
import {
  Reply,
  Edit2,
  Trash2,
  MoreHorizontal,
  Clock,
  AlertCircle,
  RefreshCw,
  CornerDownRight,
  Pin,
  Bookmark,
  Smile,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import { ConnectMessage } from "@/types/connect";
import MessageContextMenu from "./MessageContextMenu";
import MessageAttachmentRenderer from "./MessageAttachmentRenderer";

interface MessageItemProps {
  message: ConnectMessage;
  currentUserId?: string | null;
  canManage?: boolean;
  canPin?: boolean;
  isHighlighted?: boolean;
  onReply: (message: ConnectMessage) => void;
  onEdit: (message: ConnectMessage) => void;
  onDelete: (message: ConnectMessage) => void;
  onRetrySend?: (message: ConnectMessage) => void;
  onReact?: (message: ConnectMessage, emoji: string) => void;
  onPin?: (message: ConnectMessage) => void;
  onSave?: (message: ConnectMessage) => void;
  onOpenThread?: (message: ConnectMessage) => void;
  onOpenLinkModal?: (message: ConnectMessage) => void;
}

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "🎉", "🚀", "😂"];

export default function MessageItem({
  message,
  currentUserId,
  canManage = false,
  canPin = true,
  isHighlighted = false,
  onReply,
  onEdit,
  onDelete,
  onRetrySend,
  onReact,
  onPin,
  onSave,
  onOpenThread,
  onOpenLinkModal,
}: MessageItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isSelf = Boolean(
    (currentUserId && message.senderId === currentUserId) ||
      message.sender?.id === currentUserId ||
      message.id.startsWith("opt-")
  );

  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";

  const senderName =
    message.sender?.name ||
    (isSelf ? "You" : `User ${message.senderId?.slice(-4) || ""}`);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(true);
  };

  const handleEmojiClick = (emoji: string) => {
    onReact?.(message, emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div
      id={`message-item-${message.id}`}
      onContextMenu={handleContextMenu}
      className={`group relative flex items-start gap-3 transition-colors py-1.5 px-2 rounded-2xl ${
        isSelf ? "flex-row-reverse" : "flex-row"
      } ${isHighlighted ? "msg-highlight-pulse bg-primary/5" : "hover:bg-surface-hover/40"}`}
    >
      {/* Sender Avatar */}
      <div
        id={`avatar-${message.id}`}
        className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 shadow-xs overflow-hidden ${
          isSelf
            ? "bg-primary text-primary-foreground"
            : "bg-surface-hover text-text-secondary border border-border"
        }`}
      >
        {message.sender?.avatarUrl ? (
          <img
            src={message.sender.avatarUrl}
            alt={senderName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{senderName.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      {/* Message Body & Bubble */}
      <div
        className={`max-w-[85%] md:max-w-[75%] space-y-1 relative ${
          isSelf ? "items-end text-right" : "items-start text-left"
        }`}
      >
        {/* Author, Timestamp, Pin & Bookmark Header */}
        <div
          className={`flex items-center gap-2 text-[11px] text-text-muted px-1 flex-wrap ${
            isSelf ? "justify-end" : "justify-start"
          }`}
        >
          <span className="font-semibold text-text">{senderName}</span>
          <span>{formattedTime}</span>

          {message.editedAt && (
            <span
              id={`edited-badge-${message.id}`}
              className="text-[10px] italic text-text-muted opacity-80"
            >
              (edited)
            </span>
          )}

          {/* Pinned Badge */}
          {message.isPinned && (
            <span
              id={`pinned-badge-${message.id}`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-warning-light text-warning-foreground border border-warning/30"
              title="Pinned message"
            >
              <Pin size={10} className="fill-warning-foreground" />
              <span>Pinned</span>
            </span>
          )}

          {/* Saved Badge */}
          {message.isSaved && (
            <span
              id={`saved-badge-${message.id}`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
              title="Bookmarked message"
            >
              <Bookmark size={10} className="fill-primary" />
              <span>Saved</span>
            </span>
          )}
        </div>

        {/* Parent Message Reply Preview (if quoting parent inline) */}
        {message.parentMessageId && message.parentMessage && (
          <div
            id={`reply-quote-${message.id}`}
            onClick={() => onOpenThread?.(message)}
            className="msg-reply-quote text-[11px] px-2.5 py-1 mb-1 max-w-full text-left truncate flex items-center gap-1.5 text-text-secondary opacity-90 cursor-pointer hover:opacity-100"
          >
            <CornerDownRight size={12} className="shrink-0 text-primary" />
            <span className="font-semibold text-text truncate">
              {message.parentMessage?.sender?.name || "Replying"}:
            </span>
            <span className="truncate italic">
              {message.parentMessage?.content || "Referenced message"}
            </span>
          </div>
        )}

        {/* Message Content Bubble */}
        <div
          id={`content-bubble-${message.id}`}
          className={`p-3.5 text-xs leading-relaxed break-words relative shadow-xs transition-all ${
            isSelf ? "msg-bubble-self text-left" : "msg-bubble-peer text-left"
          } ${isFailed ? "border-error border" : ""}`}
        >
          {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}

          {/* Attachments rendering */}
          {message.attachments && message.attachments.length > 0 && (
            <MessageAttachmentRenderer attachments={message.attachments} isSelf={isSelf} />
          )}

          {/* Sending / Failed Status Indicators */}
          {(isSending || isFailed) && (
            <div
              id={`status-indicator-${message.id}`}
              className="mt-1.5 flex items-center gap-1.5 text-[10px] opacity-90"
            >
              {isSending && (
                <div className="flex items-center gap-1 text-text-muted">
                  <Clock size={11} className="animate-spin shrink-0" />
                  <span>Sending...</span>
                </div>
              )}
              {isFailed && (
                <div className="flex items-center gap-1 text-error">
                  <AlertCircle size={11} className="shrink-0" />
                  <span>Failed to send</span>
                  {onRetrySend && (
                    <button
                      id={`retry-btn-${message.id}`}
                      onClick={() => onRetrySend(message)}
                      className="ml-1 px-1.5 py-0.5 rounded bg-surface hover:bg-surface-hover text-error font-medium underline flex items-center gap-1"
                      title="Retry sending message"
                    >
                      <RefreshCw size={10} />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Business Entity Links badges */}
        {message.links && message.links.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {message.links.map((link) => (
              <button
                key={link.id}
                onClick={() => onOpenLinkModal?.(message)}
                className="msg-link-badge group/link cursor-pointer"
                title={`Linked ${link.targetType}: ${link.metadata?.title || link.targetId}`}
              >
                <LinkIcon size={11} className="text-primary shrink-0" />
                <span className="font-semibold text-text uppercase text-[9px] px-1 py-0.2 rounded bg-surface border border-border">
                  {link.targetType}
                </span>
                <span className="truncate max-w-[140px] text-text-secondary">
                  {link.metadata?.title || link.targetId.slice(-6)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Reactions Bar */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {message.reactions.map((react, i) => {
              const active = Boolean(
                react.hasReacted ||
                  (currentUserId && react.userIds?.includes(currentUserId))
              );

              return (
                <button
                  key={`${react.emoji}-${i}`}
                  onClick={() => onReact?.(message, react.emoji)}
                  className={`msg-reaction-pill ${
                    active ? "msg-reaction-pill-active" : ""
                  }`}
                  title={`${react.count} reaction${react.count > 1 ? "s" : ""}`}
                >
                  <span>{react.emoji}</span>
                  <span>{react.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread Replies Link / Summary */}
        {Boolean(message.replyCount && message.replyCount > 0) && (
          <div className="pt-0.5">
            <button
              onClick={() => onOpenThread?.(message)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <MessageSquare size={13} />
              <span>
                {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
              </span>
              <span className="text-[10px] text-text-muted font-normal">• View thread</span>
            </button>
          </div>
        )}

        {/* Quick Action Bar (Visible on Hover) */}
        {!isSending && (
          <div
            id={`action-bar-${message.id}`}
            className={`msg-action-bar absolute top-0 hidden group-hover:flex items-center p-0.5 z-20 ${
              isSelf ? "right-full mr-2" : "left-full ml-2"
            }`}
          >
            {/* Quick Emoji Reaction Toggle */}
            <div className="relative">
              <button
                id={`quick-react-${message.id}`}
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                title="Add Reaction"
                className="msg-action-btn p-1.5 rounded"
              >
                <Smile size={13} />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-1 p-1 bg-surface border border-border shadow-lg rounded-xl flex items-center gap-1 z-30">
                  {QUICK_REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="p-1 hover:scale-125 transition-transform text-xs"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Reply in Thread */}
            <button
              id={`quick-reply-${message.id}`}
              onClick={() => {
                if (onOpenThread) onOpenThread(message);
                else onReply(message);
              }}
              title="Reply in Thread"
              className="msg-action-btn p-1.5 rounded"
            >
              <Reply size={13} />
            </button>

            {/* Quick Pin / Unpin (Nitin's Authorization Rule) */}
            {canPin && (
              <button
                id={`quick-pin-${message.id}`}
                onClick={() => onPin?.(message)}
                title={message.isPinned ? "Unpin Message" : "Pin Message"}
                className={`msg-action-btn p-1.5 rounded ${
                  message.isPinned ? "text-warning" : ""
                }`}
              >
                <Pin size={13} />
              </button>
            )}

            {/* Quick Save / Bookmark */}
            <button
              id={`quick-save-${message.id}`}
              onClick={() => onSave?.(message)}
              title={message.isSaved ? "Remove Bookmark" : "Save Message"}
              className={`msg-action-btn p-1.5 rounded ${
                message.isSaved ? "text-primary" : ""
              }`}
            >
              <Bookmark size={13} />
            </button>

            {/* Quick Link to Business Record */}
            <button
              id={`quick-link-${message.id}`}
              onClick={() => onOpenLinkModal?.(message)}
              title="Link to Task or CRM Record"
              className="msg-action-btn p-1.5 rounded"
            >
              <LinkIcon size={13} />
            </button>

            {/* Quick Edit (Self author only) */}
            {isSelf && (
              <button
                id={`quick-edit-${message.id}`}
                onClick={() => onEdit(message)}
                title="Edit Message"
                className="msg-action-btn p-1.5 rounded"
              >
                <Edit2 size={13} />
              </button>
            )}

            {/* Quick Delete (Self author or Manager) */}
            {(isSelf || canManage) && (
              <button
                id={`quick-delete-${message.id}`}
                onClick={() => onDelete(message)}
                title="Delete Message"
                className="msg-action-btn msg-action-btn-danger p-1.5 rounded"
              >
                <Trash2 size={13} />
              </button>
            )}

            {/* More Context Actions */}
            <button
              id={`more-actions-${message.id}`}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title="More Actions"
              className="msg-action-btn p-1.5 rounded"
            >
              <MoreHorizontal size={13} />
            </button>

            {/* Context Menu Dropdown */}
            <MessageContextMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              message={message}
              isSelf={isSelf}
              canManage={canManage}
              canPin={canPin}
              onReply={(m) => {
                if (onOpenThread) onOpenThread(m);
                else onReply(m);
              }}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onPin={onPin}
              onSave={onSave}
              onOpenLinkModal={onOpenLinkModal}
            />
          </div>
        )}
      </div>
    </div>
  );
}
