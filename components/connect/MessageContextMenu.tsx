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
} from "lucide-react";
import { ConnectMessage, MessageActionItem } from "@/types/connect";

interface MessageContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number } | null;
  message: ConnectMessage;
  isSelf: boolean;
  canManage?: boolean;
  onReply: (message: ConnectMessage) => void;
  onEdit: (message: ConnectMessage) => void;
  onDelete: (message: ConnectMessage) => void;
  onReact?: (message: ConnectMessage, reaction: string) => void;
  onMention?: (message: ConnectMessage) => void;
  onPin?: (message: ConnectMessage) => void;
  onSave?: (message: ConnectMessage) => void;
}

export default function MessageContextMenu({
  isOpen,
  onClose,
  position,
  message,
  isSelf,
  canManage = false,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onMention,
  onPin,
  onSave,
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

  // Extensible Message Action Architecture
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

  const futureActions: MessageActionItem[] = [
    {
      id: "react",
      label: "Add Reaction",
      icon: Smile,
      badge: "Soon",
      disabled: false,
      onClick: (msg) => {
        onReact?.(msg, "👍");
        onClose();
      },
    },
    {
      id: "mention",
      label: "Mention Author",
      icon: AtSign,
      badge: "Soon",
      disabled: false,
      onClick: (msg) => {
        onMention?.(msg);
        onClose();
      },
    },
    {
      id: "pin",
      label: "Pin to Channel",
      icon: Pin,
      badge: "Soon",
      disabled: false,
      onClick: (msg) => {
        onPin?.(msg);
        onClose();
      },
    },
    {
      id: "save",
      label: "Save Bookmark",
      icon: Bookmark,
      badge: "Soon",
      disabled: false,
      onClick: (msg) => {
        onSave?.(msg);
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      id={`msg-context-menu-${message.id}`}
      className="msg-context-menu absolute right-0 top-full mt-1 w-52 p-1.5 shadow-xl rounded-xl z-50 text-xs"
    >
      {/* Primary Actions */}
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
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  action.isDestructive
                    ? "msg-context-item-danger font-medium"
                    : "msg-context-item font-medium"
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

      {/* Separator */}
      <div className="h-px bg-border my-1.5" />

      {/* Extensible Future Foundation Actions */}
      <div className="space-y-0.5">
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Quick Actions
        </div>
        {futureActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              id={`context-action-${action.id}-${message.id}`}
              onClick={() => action.onClick(message)}
              className="msg-context-item w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 text-text-secondary">
                <Icon size={14} className="shrink-0 text-text-muted" />
                <span>{action.label}</span>
              </div>
              {action.badge && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface-hover text-text-muted border border-border-light">
                  {action.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
