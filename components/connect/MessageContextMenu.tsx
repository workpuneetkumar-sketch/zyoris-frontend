"use client";

import React, { useEffect, useRef } from "react";
import {
  Reply,
  Edit2,
  Trash2,
  Pin,
  Bookmark,
  Link as LinkIcon,
} from "lucide-react";
import { ConnectMessage, MessageActionItem } from "@/types/connect";

interface MessageContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  message: ConnectMessage;
  isSelf: boolean;
  canManage?: boolean;
  canPin?: boolean;
  onReply: (message: ConnectMessage) => void;
  onEdit: (message: ConnectMessage) => void;
  onDelete: (message: ConnectMessage) => void;
  onReact?: (message: ConnectMessage, emoji: string) => void;
  onPin?: (message: ConnectMessage) => void;
  onSave?: (message: ConnectMessage) => void;
  onOpenLinkModal?: (message: ConnectMessage) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "🚀", "😂", "👀", "🙌"];

export default function MessageContextMenu({
  isOpen,
  onClose,
  message,
  isSelf,
  canManage = false,
  canPin = true,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onSave,
  onOpenLinkModal,
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

  const primaryActions: MessageActionItem[] = [
    {
      id: "reply",
      label: "Reply in Thread",
      icon: Reply,
      onClick: (msg) => {
        onReply(msg);
        onClose();
      },
    },
    {
      id: message.isPinned ? "unpin" : "pin",
      label: message.isPinned ? "Unpin Message" : "Pin Message",
      icon: Pin,
      hidden: !canPin,
      onClick: (msg) => {
        onPin?.(msg);
        onClose();
      },
    },
    {
      id: message.isSaved ? "unsave" : "save",
      label: message.isSaved ? "Remove Bookmark" : "Save Message",
      icon: Bookmark,
      onClick: (msg) => {
        onSave?.(msg);
        onClose();
      },
    },
    {
      id: "link",
      label: "Link to Business Record",
      icon: LinkIcon,
      onClick: (msg) => {
        onOpenLinkModal?.(msg);
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

  return (
    <div
      ref={menuRef}
      id={`msg-context-menu-${message.id}`}
      className="msg-context-menu absolute right-0 top-full mt-1 w-56 p-1.5 shadow-xl rounded-xl z-50 text-xs bg-surface border border-border"
    >
      {/* Quick emoji reactions bar */}
      <div className="px-2 py-1.5 mb-1 bg-surface-hover rounded-lg flex items-center justify-between border border-border/50">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReact?.(message, emoji);
              onClose();
            }}
            className="p-1 text-sm hover:scale-125 transition-transform"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Menu Actions */}
      <div className="space-y-0.5">
        {primaryActions
          .filter((a) => !a.hidden)
          .map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                id={`context-action-${action.id}-${message.id}`}
                onClick={() => action.onClick(message)}
                disabled={action.disabled}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors ${
                  action.isDestructive
                    ? "text-error hover:bg-error-light hover:text-error-foreground font-medium"
                    : "text-text hover:bg-surface-hover font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={14} className="shrink-0" />
                  <span>{action.label}</span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
