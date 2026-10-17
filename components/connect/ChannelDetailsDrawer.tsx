"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Info,
  Pin,
  Bookmark,
  Link as LinkIcon,
  Users,
  Shield,
  Lock,
  Hash,
  MessageSquare,
  Clock,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Channel,
  Conversation,
  ConnectMessage,
  BusinessEntityLink,
  ActiveTarget,
} from "@/types/connect";
import {
  getChannelPins,
  getConversationPins,
  unpinMessage,
  getSavedMessages,
  unsaveMessage,
  getChannelMembers,
} from "@/lib/api/connectApi";

interface ChannelDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTarget: ActiveTarget | null;
  currentUserId?: string | null;
  pinSaveVersion?: number;
  onJumpToMessage?: (messageId: string) => void;
  onMessageUnpinned?: (messageId: string) => void;
  onMessageUnsaved?: (messageId: string) => void;
}

export default function ChannelDetailsDrawer({
  isOpen,
  onClose,
  activeTarget,
  currentUserId,
  pinSaveVersion = 0,
  onJumpToMessage,
  onMessageUnpinned,
  onMessageUnsaved,
}: ChannelDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "pins" | "saved">("overview");
  const [pins, setPins] = useState<ConnectMessage[]>([]);
  const [saved, setSaved] = useState<ConnectMessage[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedFilter, setSavedFilter] = useState<"current" | "all">("current");

  // Load pins, saved messages, and overview immediately whenever drawer opens or target changes
  useEffect(() => {
    if (!isOpen || !activeTarget) return;

    loadPins();
    loadSaved();
    loadOverview();
  }, [isOpen, activeTarget?.id, activeTarget?.type, pinSaveVersion]);

  const loadPins = async () => {
    if (!activeTarget) return;
    setLoading(true);
    try {
      if (activeTarget.type === "channel") {
        const data = await getChannelPins(activeTarget.id);
        setPins(data);
      } else {
        const data = await getConversationPins(activeTarget.id);
        setPins(data);
      }
    } catch (e) {
      console.warn("Failed to load pins:", e);
      setPins([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSaved = async () => {
    setLoading(true);
    try {
      const res = await getSavedMessages();
      setSaved(res.data);
    } catch (e) {
      console.warn("Failed to load saved:", e);
      setSaved([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    if (!activeTarget) return;
    if (activeTarget.type === "channel") {
      try {
        const m = await getChannelMembers(activeTarget.id);
        setMembers(m);
      } catch (e) {}
    } else {
      const conv = activeTarget.item as Conversation;
      setMembers(conv?.members || []);
    }
  };

  const handleUnpin = async (messageId: string) => {
    const ok = await unpinMessage(messageId);
    if (ok) {
      setPins((prev) => prev.filter((p) => p.id !== messageId));
      onMessageUnpinned?.(messageId);
    }
  };

  const handleUnsave = async (messageId: string) => {
    const ok = await unsaveMessage(messageId);
    if (ok) {
      setSaved((prev) => prev.filter((s) => s.id !== messageId));
      onMessageUnsaved?.(messageId);
    }
  };

  if (!isOpen || !activeTarget) return null;

  const isChannel = activeTarget.type === "channel";
  const channel = isChannel ? (activeTarget.item as Channel) : null;
  const conversation = !isChannel ? (activeTarget.item as Conversation) : null;

  const title = isChannel
    ? `#${channel?.name || "channel"}`
    : conversation?.type === "DIRECT"
    ? conversation.members?.find((m) => m.userId !== currentUserId)?.user?.name || "Direct Message"
    : conversation?.name || "Group Chat";

  // Filter saved messages based on current target vs all
  const filteredSaved = saved.filter((item) => {
    if (savedFilter === "all") return true;
    if (isChannel) {
      return item.channelId === activeTarget.id;
    }
    return item.conversationId === activeTarget.id;
  });

  return (
    <div
      id="channel-details-drawer"
      className="w-full md:w-[360px] lg:w-[400px] bg-surface border-l border-border flex flex-col h-full shrink-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Info size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text truncate max-w-[200px]">{title}</h3>
            <p className="text-[11px] text-text-muted">Details & Resources</p>
          </div>
        </div>
        <button
          id="close-details-drawer-btn"
          onClick={onClose}
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2 border-b border-border flex items-center gap-1 overflow-x-auto text-xs">
        <button
          id="details-tab-overview"
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-2 font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "overview"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Info size={13} />
          <span>About</span>
        </button>
        <button
          id="details-tab-pins"
          onClick={() => setActiveTab("pins")}
          className={`px-3 py-2 font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "pins"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Pin size={13} />
          <span>Pinned ({pins.length})</span>
        </button>
        <button
          id="details-tab-saved"
          onClick={() => setActiveTab("saved")}
          className={`px-3 py-2 font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "saved"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Bookmark size={13} />
          <span>Saved ({filteredSaved.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Overview Card */}
            <div className="p-4 bg-surface-hover border border-border rounded-2xl space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Topic / Purpose
                </span>
                <p className="text-xs text-text mt-0.5">
                  {channel?.description || channel?.topic || "No topic set for this workspace discussion."}
                </p>
              </div>

              {isChannel && (
                <div className="flex items-center gap-2 pt-2 border-t border-border-light text-xs text-text-muted">
                  {channel?.visibility === "PRIVATE" ? (
                    <div className="flex items-center gap-1 text-warning font-medium">
                      <Lock size={13} />
                      <span>Private Channel</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-primary font-medium">
                      <Hash size={13} />
                      <span>Public Channel</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Members Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Users size={14} className="text-text-muted" />
                  Members ({members.length})
                </span>
              </div>
              <div className="divide-y divide-border-light border border-border rounded-2xl bg-surface overflow-hidden">
                {members.length === 0 ? (
                  <div className="p-4 text-center text-xs text-text-muted">No members found</div>
                ) : (
                  members.map((m: any) => {
                    const userName = m.user?.name || m.name || `User ${m.userId?.slice(-4) || ""}`;
                    const userEmail = m.user?.email || m.email || "";
                    const role = m.role || "MEMBER";
                    return (
                      <div key={m.id || m.userId} className="p-2.5 px-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {userName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-text">{userName}</p>
                            {userEmail && <p className="text-[10px] text-text-muted">{userEmail}</p>}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover border border-border text-text-muted font-medium">
                          {role}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "pins" && (
          <div>
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-text-muted">
                <Loader2 size={20} className="animate-spin text-primary mb-1" />
                <span className="text-xs">Loading pinned messages...</span>
              </div>
            ) : pins.length === 0 ? (
              <div id="pins-empty-state" className="py-12 text-center text-text-muted text-xs flex flex-col items-center gap-2">
                <Pin size={24} className="opacity-40" />
                <p>No pinned messages in this {isChannel ? "channel" : "conversation"}.</p>
                <p className="text-[11px] opacity-75">Pin important announcements or messages from the message menu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pins.map((pin) => {
                  const senderName = pin.sender?.name || (pin.senderId === currentUserId ? "You" : "Teammate");
                  const time = new Date(pin.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={pin.id}
                      id={`pinned-item-${pin.id}`}
                      className="p-3 bg-surface border border-border rounded-xl space-y-1.5 relative group hover:border-border-hover transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-text">{senderName}</span>
                          <span className="text-[10px] text-text-muted opacity-80">{time}</span>
                        </div>
                        <button
                          id={`unpin-btn-${pin.id}`}
                          onClick={() => handleUnpin(pin.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-all"
                          title="Unpin message"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">{pin.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="space-y-3">
            {/* Filter Toggle: Current Discussion vs All Bookmarks */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] text-text-muted font-medium">Filter Bookmarks</span>
              <div className="flex items-center gap-1 bg-surface-hover p-0.5 rounded-lg border border-border text-[10px]">
                <button
                  id="filter-saved-current"
                  onClick={() => setSavedFilter("current")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    savedFilter === "current"
                      ? "bg-surface font-semibold text-text shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  This Discussion ({saved.filter((s) => isChannel ? s.channelId === activeTarget.id : s.conversationId === activeTarget.id).length})
                </button>
                <button
                  id="filter-saved-all"
                  onClick={() => setSavedFilter("all")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    savedFilter === "all"
                      ? "bg-surface font-semibold text-text shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  All ({saved.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-text-muted">
                <Loader2 size={20} className="animate-spin text-primary mb-1" />
                <span className="text-xs">Loading saved bookmarks...</span>
              </div>
            ) : filteredSaved.length === 0 ? (
              <div id="saved-empty-state" className="py-12 text-center text-text-muted text-xs flex flex-col items-center gap-2">
                <Bookmark size={24} className="opacity-40" />
                <p>
                  {savedFilter === "current"
                    ? `No saved messages in this ${isChannel ? "channel" : "conversation"}.`
                    : "You haven't saved any messages yet."}
                </p>
                <p className="text-[11px] opacity-75">Click \"Save Bookmark\" on any message to reference it later.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSaved.map((item) => {
                  const senderName = item.sender?.name || (item.senderId === currentUserId ? "You" : "Teammate");
                  const time = new Date(item.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={item.id}
                      id={`saved-item-${item.id}`}
                      className="p-3 bg-surface border border-border rounded-xl space-y-1.5 relative group hover:border-border-hover transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-text">{senderName}</span>
                          <span className="text-[10px] text-text-muted opacity-80">{time}</span>
                        </div>
                        <button
                          id={`unsave-btn-${item.id}`}
                          onClick={() => handleUnsave(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-all"
                          title="Remove bookmark"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
