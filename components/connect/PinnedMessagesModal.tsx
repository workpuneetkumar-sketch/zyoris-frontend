"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Pin,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { ConnectMessage } from "@/types/connect";
import { getChannelPins, getConversationPins, unpinMessage } from "@/lib/api/connectApi";
import MessageAttachmentRenderer from "./MessageAttachmentRenderer";

interface PinnedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "channel" | "conversation";
  targetId: string;
  targetTitle: string;
  canUnpin?: boolean;
  onJumpToMessage?: (messageId: string) => void;
  onUnpinned?: (messageId: string) => void;
}

export default function PinnedMessagesModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  canUnpin = true,
  onJumpToMessage,
  onUnpinned,
}: PinnedMessagesModalProps) {
  const [pins, setPins] = useState<ConnectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unpinningId, setUnpinningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadPins();
  }, [isOpen, targetId, targetType]);

  const loadPins = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: ConnectMessage[] = [];
      if (targetType === "channel") {
        data = await getChannelPins(targetId);
      } else {
        data = await getConversationPins(targetId);
      }
      setPins(data);
    } catch (err: any) {
      console.error("Failed to load pinned messages:", err);
      setError("Failed to load pinned messages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (messageId: string) => {
    if (!canUnpin) {
      alert("You are not authorized to unpin messages.");
      return;
    }
    setUnpinningId(messageId);
    try {
      const ok = await unpinMessage(messageId);
      if (ok) {
        setPins((prev) => prev.filter((p) => p.id !== messageId));
        if (onUnpinned) onUnpinned(messageId);
      }
    } catch (err) {
      console.error("Failed to unpin message:", err);
      alert("Failed to unpin message. Please try again.");
    } finally {
      setUnpinningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-hover flex items-center justify-center text-primary border border-border">
              <Pin size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Pinned Messages</h3>
              <p className="text-[11px] text-text-muted truncate max-w-xs">{targetTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs">Loading pinned messages...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-error-light text-error text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : pins.length === 0 ? (
            <div className="py-12 text-center text-text-muted space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-surface-hover mx-auto flex items-center justify-center border border-border">
                <Pin size={22} className="text-text-muted" />
              </div>
              <p className="text-xs font-semibold text-text">No pinned messages</p>
              <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                Pin important messages from the message menu to keep them visible for everyone.
              </p>
            </div>
          ) : (
            pins.map((pin) => {
              const author = pin.sender?.name || `User ${pin.senderId?.slice(-4) || ""}`;
              const time = new Date(pin.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={pin.id}
                  className="p-3.5 rounded-xl bg-surface-hover border border-border space-y-2 group hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-text">{author}</span>
                      <span className="text-[10px] text-text-muted">{time}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onJumpToMessage && (
                        <button
                          onClick={() => {
                            onJumpToMessage(pin.id);
                            onClose();
                          }}
                          className="px-2 py-1 text-[11px] font-medium rounded-lg text-primary hover:bg-surface border border-transparent hover:border-border flex items-center gap-1 transition-colors"
                          title="Jump to message"
                        >
                          <ExternalLink size={12} />
                          <span>Jump</span>
                        </button>
                      )}

                      {canUnpin && (
                        <button
                          onClick={() => handleUnpin(pin.id)}
                          disabled={unpinningId === pin.id}
                          className="p-1 rounded-lg text-text-muted hover:text-error hover:bg-surface transition-colors"
                          title="Unpin message"
                        >
                          {unpinningId === pin.id ? (
                            <Loader2 size={13} className="animate-spin text-error" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">{pin.content}</p>

                  {pin.attachments && pin.attachments.length > 0 && (
                    <MessageAttachmentRenderer attachments={pin.attachments} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
