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
} from "lucide-react";
import { ConnectMessage } from "@/types/connect";
import MessageContextMenu from "./MessageContextMenu";

interface MessageItemProps {
  message: ConnectMessage;
  currentUserId?: string | null;
  canManage?: boolean;
  onReply: (message: ConnectMessage) => void;
  onEdit: (message: ConnectMessage) => void;
  onDelete: (message: ConnectMessage) => void;
  onRetrySend?: (message: ConnectMessage) => void;
  onReact?: (message: ConnectMessage, reaction: string) => void;
  onMention?: (message: ConnectMessage) => void;
  onPin?: (message: ConnectMessage) => void;
  onSave?: (message: ConnectMessage) => void;
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
}: MessageItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <div
      id={`message-item-${message.id}`}
      onContextMenu={handleContextMenu}
      className={`group relative flex items-start gap-3 transition-colors py-1 ${
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
        className={`max-w-[78%] md:max-w-[70%] space-y-1 relative ${
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
        </div>

        {/* Parent Message Reply Preview (if referencing a parent) */}
        {message.parentMessageId && (
          <div
            id={`reply-quote-${message.id}`}
            className="msg-reply-quote text-[11px] px-2.5 py-1 mb-1 max-w-full text-left truncate flex items-center gap-1.5 text-text-secondary opacity-90"
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
          <div className="whitespace-pre-wrap">{message.content}</div>

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

        {/* Quick Action Bar (Visible on Hover) */}
        {!isSending && (
          <div
            id={`action-bar-${message.id}`}
            className={`msg-action-bar absolute top-0 hidden group-hover:flex items-center p-0.5 z-20 ${
              isSelf ? "right-full mr-2" : "left-full ml-2"
            }`}
          >
            {/* Quick Reply */}
            <button
              id={`quick-reply-${message.id}`}
              onClick={() => onReply(message)}
              title="Reply"
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
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onMention={onMention}
              onPin={onPin}
              onSave={onSave}
            />
          </div>
        )}
      </div>
    </div>
  );
}
