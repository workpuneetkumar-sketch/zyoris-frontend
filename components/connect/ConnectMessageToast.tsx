"use client";

import React from "react";
import { X, MessageSquare, Hash } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ConnectNotificationItem } from "@/context/ConnectNotificationContext";

interface ConnectMessageToastProps {
  toast: ConnectNotificationItem;
  onDismiss: () => void;
  onClick: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / 1000
    );
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "Just now";
  }
}

export function ConnectMessageToast({
  toast,
  onDismiss,
  onClick,
}: ConnectMessageToastProps) {
  const isChannel = Boolean(toast.channelId || toast.channelName);

  return (
    <div
      onClick={onClick}
      role="alert"
      className="w-full sm:w-[360px] max-w-[360px] bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800/90 shadow-[0_8px_28px_rgba(0,0,0,0.06),_0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md rounded-2xl p-3.5 transition-all duration-200 hover:border-blue-400/60 dark:hover:border-blue-500/50 hover:shadow-[0_12px_32px_rgba(37,99,235,0.1)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 cursor-pointer group flex items-start gap-3 select-none"
    >
      {/* Sender Avatar */}
      <div className="shrink-0 relative mt-0.5">
        <Avatar
          src={toast.senderAvatar || undefined}
          alt={toast.senderName}
          fallback={
            toast.senderName ? toast.senderName.charAt(0).toUpperCase() : "U"
          }
          size="md"
        />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
          {isChannel ? (
            <Hash size={9} strokeWidth={2.5} />
          ) : (
            <MessageSquare size={9} strokeWidth={2.5} />
          )}
        </div>
      </div>

      {/* Main Details */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Header row: Sender name + Conversation Badge + Timestamp */}
        <div className="flex items-center gap-1.5 leading-tight">
          <span className="font-semibold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[130px]">
            {toast.senderName}
          </span>

          {isChannel ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 px-1.5 py-0.5 rounded-full truncate max-w-[110px]">
              <Hash size={8} className="shrink-0 text-blue-500 dark:text-blue-400" />
              <span className="truncate">{toast.channelName || "channel"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70 px-1.5 py-0.5 rounded-full">
              Direct
            </span>
          )}

          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto shrink-0 font-normal">
            {formatRelativeTime(toast.createdAt)}
          </span>
        </div>

        {/* Message Preview */}
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-relaxed break-words font-normal">
          {toast.content}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss notification"
        className="shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer -mr-1 -mt-1"
      >
        <X size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}
