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
  Smile,
  Pin,
  Bookmark,
  Link as LinkIcon,
  MessageSquare,
  Lock,
  Globe,
  CheckSquare,
  Target,
  Briefcase,
  FolderKanban,
  Calendar,
  FileText,
  User,
  Building,
  X,
} from "lucide-react";
import { ConnectMessage, BusinessEntityType } from "@/types/connect";
import MessageContextMenu from "./MessageContextMenu";
import ReactionPicker from "./ReactionPicker";

interface MessageItemProps {
  message: ConnectMessage;
  currentUserId?: string | null;
  canManage?: boolean;
  onReply: (message: ConnectMessage) => void;
  onEdit: (message: ConnectMessage) => void;
  onDelete: (message: ConnectMessage) => void;
  onRetrySend?: (message: ConnectMessage) => void;
  onReact?: (message: ConnectMessage, emoji: string) => void;
  onMention?: (message: ConnectMessage) => void;
  onPin?: (message: ConnectMessage) => void;
  onSave?: (message: ConnectMessage) => void;
  onLinkEntity?: (message: ConnectMessage) => void;
  onUnlinkEntity?: (message: ConnectMessage, linkId: string) => void;
  onOpenThread?: (message: ConnectMessage) => void;
}

export default function MessageItem({
  message,
  currentUserId,
  canManage = false,
  onReply,
  onEdit,
  onDelete,
  onRetrySend,
  onReact,
  onMention,
  onPin,
  onSave,
  onLinkEntity,
  onUnlinkEntity,
  onOpenThread,
}: MessageItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);

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

  // Render mentions with styled badge
  const renderMessageContent = (content: string) => {
    // Match @Word or @First Last pattern
    const mentionRegex = /(@[A-Za-z0-9_.\s]+?)(?=\s|$|[.,!?])/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const mentionText = match[0].trim();
      const isMentioningMe =
        currentUserId &&
        (mentionText.toLowerCase() === `@you` ||
          (senderName && mentionText.toLowerCase().includes(senderName.toLowerCase())));

      parts.push(
        <span
          key={match.index}
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
            isMentioningMe
              ? "bg-amber-400/20 text-amber-900 border border-amber-300 dark:text-amber-200"
              : "bg-primary/15 text-primary border border-primary/20"
          }`}
        >
          {mentionText}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div
      id={`message-item-${message.id}`}
      onContextMenu={handleContextMenu}
      className={`group relative flex items-start gap-3 transition-colors py-1.5 ${
        isSelf ? "flex-row-reverse" : "flex-row"
      }`}
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
        className={`max-w-[82%] md:max-w-[72%] space-y-1 relative ${
          isSelf ? "items-end text-right" : "items-start text-left"
        }`}
      >
        {/* Author & Timestamp Header */}
        <div
          className={`flex items-center gap-2 text-[11px] text-text-muted px-1 ${
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
          {message.isPinned && (
            <span
              id={`pinned-badge-${message.id}`}
              className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200"
            >
              <Pin size={10} />
              <span>Pinned</span>
            </span>
          )}
          {message.isSaved && (
            <span
              id={`saved-badge-${message.id}`}
              className="flex items-center gap-0.5 text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20"
            >
              <Bookmark size={10} />
              <span>Saved</span>
            </span>
          )}
          {message.visibility === "INTERNAL" && (
            <span
              id={`visibility-badge-${message.id}`}
              className="flex items-center gap-0.5 text-[9px] text-amber-700 font-semibold bg-amber-50/80 px-1.5 py-0.2 rounded border border-amber-200"
              title="Internal staff note (Hidden from clients)"
            >
              <Lock size={9} />
              <span>Internal</span>
            </span>
          )}
          {message.visibility === "CLIENT_SHARED" && (
            <span
              id={`visibility-badge-${message.id}`}
              className="flex items-center gap-0.5 text-[9px] text-blue-700 font-semibold bg-blue-50/80 px-1.5 py-0.2 rounded border border-blue-200"
              title="Client Visible"
            >
              <Globe size={9} />
              <span>Client</span>
            </span>
          )}
        </div>

        {/* Parent Message Reply Preview (if quoting a parent) */}
        {message.parentMessageId && (
          <div
            id={`reply-quote-${message.id}`}
            onClick={() => onOpenThread?.(message)}
            className="msg-reply-quote text-[11px] px-2.5 py-1 mb-1 max-w-full text-left truncate flex items-center gap-1.5 text-text-secondary opacity-90 cursor-pointer hover:underline"
          >
            <CornerDownRight size={12} className="shrink-0 text-primary" />
            <span className="font-semibold text-text truncate">
              {message.parentMessage?.sender?.name || "Replying"}:
            </span>
            <span className="truncate italic">
              {message.parentMessage?.content || "Referenced thread message"}
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
          <div className="whitespace-pre-wrap">{renderMessageContent(message.content)}</div>

          {/* Business Entity Link Badges */}
          {message.businessLinks && message.businessLinks.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border-light flex flex-wrap gap-1.5">
              {message.businessLinks.map((link) => {
                let Icon = LinkIcon;
                let colorClass = "text-primary";
                if (link.targetType === "TASK") {
                  Icon = CheckSquare;
                  colorClass = "text-amber-500";
                } else if (link.targetType === "LEAD") {
                  Icon = Target;
                  colorClass = "text-blue-500";
                } else if (link.targetType === "DEAL") {
                  Icon = Briefcase;
                  colorClass = "text-emerald-500";
                } else if (link.targetType === "PROJECT") {
                  Icon = FolderKanban;
                  colorClass = "text-cyan-500";
                } else if (link.targetType === "MEETING") {
                  Icon = Calendar;
                  colorClass = "text-rose-500";
                } else if (link.targetType === "DOCUMENT") {
                  Icon = FileText;
                  colorClass = "text-orange-500";
                } else if (link.targetType === "CONTACT") {
                  Icon = User;
                  colorClass = "text-indigo-500";
                } else if (link.targetType === "COMPANY") {
                  Icon = Building;
                  colorClass = "text-purple-500";
                }

                return (
                  <span
                    key={link.id}
                    className="group/link inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface border border-border text-[10px] font-semibold text-text hover:border-primary transition-all shadow-2xs"
                    title={`Linked ${link.targetType}: ${link.title || link.targetId}`}
                  >
                    <Icon size={12} className={colorClass} />
                    <span className="font-bold uppercase text-[9px] text-text-muted">{link.targetType}:</span>
                    <span className="truncate max-w-[130px]">{link.title || link.targetId}</span>
                    {onUnlinkEntity && (canManage || isSelf) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnlinkEntity(message, link.id);
                        }}
                        title="Unlink entity"
                        className="opacity-50 hover:opacity-100 hover:text-error transition-opacity ml-0.5 p-0.5 rounded"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
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

        {/* Live Reaction Pills Stream */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            id={`reactions-bar-${message.id}`}
            className={`flex flex-wrap items-center gap-1 mt-1 ${isSelf ? "justify-end" : "justify-start"}`}
          >
            {message.reactions.map((reaction) => {
              const tooltipNames = reaction.users?.map((u) => u.name).join(", ") || `${reaction.count} reactions`;
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => onReact?.(message, reaction.emoji)}
                  title={`${tooltipNames} reacted with ${reaction.emoji}`}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all active:scale-95 ${
                    reaction.hasReacted
                      ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
                      : "bg-surface hover:bg-surface-hover border-border text-text"
                  }`}
                >
                  <span className="text-xs">{reaction.emoji}</span>
                  <span className="text-[10px] font-bold">{reaction.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread Replies Indicator Pill */}
        {Boolean(message.replyCount && message.replyCount > 0) && (
          <div className={`mt-1.5 flex ${isSelf ? "justify-end" : "justify-start"}`}>
            <button
              onClick={() => onOpenThread?.(message)}
              className="px-2.5 py-1 rounded-xl bg-surface-hover hover:bg-surface border border-border hover:border-primary text-text text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs group"
            >
              <MessageSquare size={13} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="text-primary">
                {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
              </span>
              <span className="text-[10px] text-text-muted font-normal">View thread →</span>
            </button>
          </div>
        )}

        {/* Quick Action Bar (Visible on Hover) */}
        {!isSending && (
          <div
            id={`action-bar-${message.id}`}
            className={`msg-action-bar absolute -top-3 hidden group-hover:flex items-center p-0.5 z-20 shadow-md ${
              isSelf ? "right-full mr-2" : "left-full ml-2"
            }`}
          >
            {/* Quick Emoji Reaction Buttons */}
            {["👍", "❤️", "😂"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message, emoji)}
                title={`React with ${emoji}`}
                className="p-1 text-xs hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}

            {/* Reaction Picker Button */}
            <button
              id={`reaction-picker-btn-${message.id}`}
              onClick={() => setIsReactionPickerOpen((prev) => !prev)}
              title="Add Reaction"
              className="msg-action-btn p-1.5 rounded"
            >
              <Smile size={13} />
            </button>

            {/* Reaction Picker Popover */}
            {isReactionPickerOpen && (
              <ReactionPicker
                isOpen={true}
                onClose={() => setIsReactionPickerOpen(false)}
                onSelectEmoji={(emoji) => onReact?.(message, emoji)}
                className={isSelf ? "right-0 bottom-full mb-1" : "left-0 bottom-full mb-1"}
              />
            )}

            {/* Reply in Thread Button */}
            <button
              id={`quick-thread-reply-${message.id}`}
              onClick={() => onOpenThread?.(message) || onReply(message)}
              title="Reply in Thread"
              className="msg-action-btn p-1.5 rounded"
            >
              <Reply size={13} />
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
              onReply={onReply}
              onOpenThread={onOpenThread}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onMention={onMention}
              onPin={onPin}
              onSave={onSave}
              onLinkEntity={onLinkEntity}
            />
          </div>
        )}
      </div>
    </div>
  );
}
