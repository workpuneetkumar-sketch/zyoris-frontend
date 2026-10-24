"use client";

import React, { useEffect, useRef } from "react";
import {
  Reply,
  Edit2,
  Trash2,
  Smile,
  AtSign,
  Pin,
  Bookmark,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import { ConnectMessage, MessageActionItem } from "@/types/connect";

interface MessageContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  message: ConnectMessage;
  isSelf: boolean;
  canManage?: boolean;
  onReply: (message: ConnectMessage) => void;
  onOpenThread?: (message: ConnectMessage) => void;
  onEdit: (message: ConnectMessage) => void;
  onDelete: (message: ConnectMessage) => void;
  onReact?: (message: ConnectMessage, reaction: string) => void;
  onMention?: (message: ConnectMessage) => void;
  onPin?: (message: ConnectMessage) => void;
  onSave?: (message: ConnectMessage) => void;
  onLinkEntity?: (message: ConnectMessage) => void;
}

export default function MessageContextMenu({
  isOpen,
  onClose,
  message,
  isSelf,
  canManage = false,
  onReply,
  onOpenThread,
  onEdit,
  onDelete,
  onReact,
  onMention,
  onPin,
  onSave,
  onLinkEntity,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions: MessageActionItem[] = [
    {
      id: "reply",
      label: "Reply in Thread",
      icon: MessageSquare,
      onClick: (msg) => {
        if (onOpenThread) onOpenThread(msg);
        else onReply(msg);
        onClose();
      },
    },
    {
      id: "react",
      label: "Add Reaction",
      icon: Smile,
      onClick: (msg) => {
        onReact?.(msg, "👍");
        onClose();
      },
    },
    {
      id: "pin",
      label: msgPinnedLabel(message),
      icon: Pin,
      onClick: (msg) => {
        onPin?.(msg);
        onClose();
      },
    },
    {
      id: "save",
      label: message.isSaved ? "Remove Bookmark" : "Save Bookmark",
      icon: Bookmark,
      onClick: (msg) => {
        onSave?.(msg);
        onClose();
      },
    },
    {
      id: "link",
      label: "Link to Business Entity",
      icon: LinkIcon,
      onClick: (msg) => {
        onLinkEntity?.(msg);
        onClose();
      },
    },
    {
      id: "mention",
      label: "Mention Author",
      icon: AtSign,
      onClick: (msg) => {
        onMention?.(msg);
        onClose();
      },
    },
    {
      id: "edit",
      label: "Edit Message",
      icon: Edit2,
      hidden: !isSelf,
      onClick: (msg) => {
        onEdit(msg);
        onClose();
      },
    },
    {
      id: "delete",
      label: "Delete Message",
      icon: Trash2,
      isDestructive: true,
      hidden: !isSelf && !canManage,
      onClick: (msg) => {
        onDelete(msg);
        onClose();
      },
    },
  ];

  function msgPinnedLabel(msg: ConnectMessage) {
    return msg.isPinned ? "Unpin Message" : msg.channelId ? "Pin to Channel" : "Pin Message";
  }

  return (
    <div
      ref={menuRef}
      id={`msg-context-menu-${message.id}`}
      className="msg-context-menu absolute right-0 top-full mt-1 w-56 p-1.5 shadow-2xl rounded-2xl z-50 text-xs border border-border bg-surface"
    >
      <div className="space-y-0.5">
        {actions
          .filter((a) => !a.hidden)
          .map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                id={`context-action-${action.id}-${message.id}`}
                onClick={() => action.onClick(message)}
                disabled={action.disabled}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-xl transition-colors ${
                  action.isDestructive
                    ? "text-error hover:bg-error/10 font-medium"
                    : "text-text hover:bg-surface-hover font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={14} className={action.isDestructive ? "text-error" : "text-text-muted"} />
                  <span>{action.label}</span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
