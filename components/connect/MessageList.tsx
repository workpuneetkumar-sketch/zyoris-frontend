"use client";

import React, { useEffect, useRef } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Hash,
  MessageSquare,
} from "lucide-react";
import { ConnectMessage } from "@/types/connect";
import MessageItem from "./MessageItem";

interface MessageListProps {
  channelId?: string | null;
  conversationId?: string | null;
  messages: ConnectMessage[];
  loading?: boolean;
  error?: string | null;
  currentUserId?: string | null;
  canManage?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  onRetryFetch?: () => void;
  onReply: (message: ConnectMessage) => void;
  onEdit: (message: ConnectMessage) => void;
  onDelete: (message: ConnectMessage) => void;
  onRetrySend?: (message: ConnectMessage) => void;
  onReact?: (message: ConnectMessage, reaction: string) => void;
  onMention?: (message: ConnectMessage) => void;
  onPin?: (message: ConnectMessage) => void;
  onSave?: (message: ConnectMessage) => void;
}

export default function MessageList({
  channelId,
  conversationId,
  messages,
  loading = false,
  error = null,
  currentUserId,
  canManage = false,
  emptyTitle,
  emptySubtitle,
  onRetryFetch,
  onReply,
  onEdit,
  onDelete,
  onRetrySend,
  onReact,
  onMention,
  onPin,
  onSave,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages array changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.id]);

  return (
    <div
      id="message-list-container"
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-background relative"
    >
      {/* Loading State */}
      {loading ? (
        <div
          id="messages-loading-state"
          className="h-full flex flex-col items-center justify-center gap-3 text-text-muted"
        >
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-xs font-medium text-text-secondary">
            Loading messages...
          </p>
        </div>
      ) : error ? (
        /* Error State with Retry */
        <div
          id="messages-error-state"
          className="h-full flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-error-light text-error flex items-center justify-center mb-3">
            <AlertCircle size={24} />
          </div>
          <h4 className="text-sm font-bold text-text mb-1">
            Failed to load messages
          </h4>
          <p className="text-xs text-text-muted max-w-sm mb-4">{error}</p>
          {onRetryFetch && (
            <button
              id="retry-fetch-messages-btn"
              onClick={onRetryFetch}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Retry Loading</span>
            </button>
          )}
        </div>
      ) : messages.length === 0 ? (
        /* Empty State */
        <div
          id="messages-empty-state"
          className="h-full flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-surface-hover border border-border text-primary flex items-center justify-center mb-3 shadow-xs">
            {channelId ? <Hash size={28} /> : <MessageSquare size={28} />}
          </div>
          <h4 className="text-base font-bold text-text mb-1">
            {emptyTitle || "No messages yet"}
          </h4>
          <p className="text-xs text-text-muted max-w-sm">
            {emptySubtitle ||
              "This is the start of the conversation. Send a message below to connect with your team!"}
          </p>
        </div>
      ) : (
        /* Message Stream */
        <div id="messages-stream" className="space-y-2">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              canManage={canManage}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onRetrySend={onRetrySend}
              onReact={onReact}
              onMention={onMention}
              onPin={onPin}
              onSave={onSave}
            />
          ))}
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={bottomRef} className="h-px" />
    </div>
  );
}
