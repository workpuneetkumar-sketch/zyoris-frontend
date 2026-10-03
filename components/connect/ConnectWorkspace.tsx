"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Hash,
  Lock,
  MessageSquare,
  Users,
  ChevronLeft,
} from "lucide-react";
import ConnectSidebar from "./ConnectSidebar";
import CreateChannelModal from "./CreateChannelModal";
import ChannelMembersModal from "./ChannelMembersModal";
import CreateDirectMessageModal from "./CreateDirectMessageModal";
import CreateGroupConversationModal from "./CreateGroupConversationModal";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import {
  Channel,
  Conversation,
  ConnectMessage,
  ActiveTarget,
  SocketMessageNewPayload,
  SocketMessageUpdatePayload,
  SocketMessageDeletePayload,
  SocketChannelUpdatedPayload,
  SocketConversationUpdatedPayload,
  SendMessagePayload,
} from "@/types/connect";
import {
  getChannels,
  getConversations,
  getChannelMessages,
  getConversationMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
} from "@/lib/api/connectApi";
import { getTeamMembers, TeamMember } from "@/lib/api/organizationsApi";
import { getEmployees } from "@/lib/api/hrApi";
import { useConnectSocket } from "@/hooks/useConnectSocket";

export default function ConnectWorkspace() {
  // Navigation & Data State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);

  // Messages State
  const [messages, setMessages] = useState<ConnectMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Unread badge tracking
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Modals
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isChannelMembersOpen, setIsChannelMembersOpen] = useState(false);
  const [isCreateDirectOpen, setIsCreateDirectOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Message Editing & Replying Modes
  const [editingMessage, setEditingMessage] = useState<ConnectMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ConnectMessage | null>(null);

  const activeTargetRef = useRef<ActiveTarget | null>(null);
  activeTargetRef.current = activeTarget;

  // Stale request prevention: AbortController ref
  const abortControllerRef = useRef<AbortController | null>(null);

  // Current user ID resolution
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("zyoris-auth");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const uid = parsed?.user?.id || parsed?.id;
          if (uid) setCurrentUserId(uid);
        } catch (e) {}
      }
    }
    loadInitialData();
  }, []);

  // Fetch all initial server-backed data
  const loadInitialData = async () => {
    try {
      const [channelsData, convsData, teamData, empData] = await Promise.all([
        getChannels(),
        getConversations(),
        getTeamMembers().catch(() => []),
        getEmployees().catch(() => []),
      ]);

      setChannels(channelsData);
      setConversations(convsData);

      // Merge and deduplicate team members and employees
      const memberMap = new Map<string, TeamMember>();
      teamData.forEach((m) => {
        if (m.id) memberMap.set(m.id, m);
      });
      empData.forEach((e) => {
        const uid = e.userId || e.id;
        if (uid && !memberMap.has(uid)) {
          memberMap.set(uid, {
            id: uid,
            name: e.name || "Employee",
            email: e.email || "",
            role: e.role || "EMPLOYEE",
            department: e.department,
          });
        }
      });
      setTeamMembers(Array.from(memberMap.values()));

      // Automatically select first channel or conversation if none active
      if (!activeTargetRef.current) {
        if (channelsData.length > 0) {
          selectChannel(channelsData[0]);
        } else if (convsData.length > 0) {
          selectConversation(convsData[0]);
        }
      }
    } catch (err: any) {
      console.error("Failed to load initial Connect data:", err);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                        SERVER-DRIVEN MESSAGE FETCHING                      */
  /* -------------------------------------------------------------------------- */

  const loadMessagesForTarget = useCallback(async (target: ActiveTarget) => {
    // Prevent stale requests: cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessagesLoading(true);
    setMessagesError(null);
    setEditingMessage(null);
    setReplyingToMessage(null);

    try {
      let res: { data: ConnectMessage[]; nextCursor?: string | null };
      if (target.type === "channel") {
        res = await getChannelMessages(target.id, 50, undefined, controller.signal);
      } else {
        res = await getConversationMessages(target.id, 50, undefined, controller.signal);
      }

      if (!controller.signal.aborted) {
        setMessages(res.data);
      }
    } catch (err: any) {
      if (err.name === "CanceledError" || err.name === "AbortError" || controller.signal.aborted) {
        return; // Ignore aborted stale request
      }
      console.error("Failed to load messages for target:", err);
      setMessagesError("Unable to load message history. Please check your network connection.");
    } finally {
      if (!controller.signal.aborted) {
        setMessagesLoading(false);
      }
    }
  }, []);

  // Reload messages whenever active context changes
  useEffect(() => {
    if (!activeTarget) {
      setMessages([]);
      return;
    }

    // Clear unread count for opened context
    setUnreadMap((prev) => {
      if (!prev[activeTarget.id]) return prev;
      const copy = { ...prev };
      delete copy[activeTarget.id];
      return copy;
    });

    loadMessagesForTarget(activeTarget);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeTarget?.id, activeTarget?.type, loadMessagesForTarget]);

  /* -------------------------------------------------------------------------- */
  /*                          SOCKET EVENT HANDLERS                             */
  /* -------------------------------------------------------------------------- */

  const handleSocketNewMessage = useCallback(
    (payload: SocketMessageNewPayload) => {
      if (!payload) return;

      const targetChannelId =
        payload.channelId ||
        (payload.channel && channels.find((c) => c.name === payload.channel || c.id === payload.channel)?.id);
      const targetConvId = payload.conversationId || payload.receiverId;
      const msgId = payload.id || payload.messageId || `socket-${Date.now()}`;

      const newMsg: ConnectMessage = {
        id: msgId,
        organizationId: payload.organizationId || "",
        senderId: payload.senderId || payload.sender?.id || "",
        channelId: targetChannelId,
        conversationId: targetConvId,
        parentMessageId: payload.parentMessageId || null,
        content: payload.content || "",
        type: payload.type || "TEXT",
        createdAt: payload.createdAt || new Date().toISOString(),
        sender: payload.sender,
        status: "sent",
      };

      const current = activeTargetRef.current;
      const isForActiveTarget =
        (current?.type === "channel" &&
          (current.id === targetChannelId ||
            current.id === payload.channelId ||
            (current.item as Channel)?.name === payload.channel)) ||
        (current?.type === "conversation" &&
          (current.id === targetConvId || current.id === payload.conversationId));

      if (isForActiveTarget) {
        setMessages((prev) => {
          // Deduplicate: If message already present by canonical ID, do nothing
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }

          // Reconcile optimistic message: if tempId or sending matches same content & sender
          const optIndex = prev.findIndex(
            (m) =>
              m.id.startsWith("opt-") &&
              (m.clientMessageId === payload.clientMessageId ||
                (m.content === newMsg.content && m.senderId === newMsg.senderId))
          );

          if (optIndex !== -1) {
            const copy = [...prev];
            copy[optIndex] = newMsg;
            return copy;
          }

          return [...prev, newMsg];
        });
      } else {
        // Mark as unread in sidebar for inactive channels/conversations
        const targetId = targetChannelId || targetConvId;
        if (targetId) {
          setUnreadMap((prev) => ({
            ...prev,
            [targetId]: (prev[targetId] || 0) + 1,
          }));
        }
      }

      // Update last message in channels / conversations list
      if (targetChannelId) {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === targetChannelId
              ? { ...c, lastMessage: newMsg.content, lastMessageAt: newMsg.createdAt }
              : c
          )
        );
      } else if (targetConvId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? { ...c, lastMessage: newMsg.content, lastMessageAt: newMsg.createdAt }
              : c
          )
        );
      }
    },
    [channels]
  );

  const handleSocketUpdateMessage = useCallback((payload: SocketMessageUpdatePayload) => {
    const targetMsgId = payload.messageId || payload.id;
    if (!targetMsgId) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetMsgId
          ? {
              ...m,
              content: payload.content,
              editedAt: payload.editedAt || payload.updatedAt || new Date().toISOString(),
            }
          : m
      )
    );
  }, []);

  const handleSocketDeleteMessage = useCallback((payload: SocketMessageDeletePayload) => {
    const targetMsgId = payload.messageId || payload.id;
    if (!targetMsgId) return;

    setMessages((prev) => prev.filter((m) => m.id !== targetMsgId));
  }, []);

  const handleSocketChannelUpdated = useCallback((payload: SocketChannelUpdatedPayload) => {
    getChannels().then((data) => setChannels(data));
  }, []);

  const handleSocketConversationUpdated = useCallback(
    (payload: SocketConversationUpdatedPayload) => {
      getConversations().then((data) => setConversations(data));
    },
    []
  );

  // Active channel name for socket room subscription
  const activeChannelName = useMemo(() => {
    if (activeTarget?.type === "channel") {
      const ch = channels.find((c) => c.id === activeTarget.id) || (activeTarget.item as Channel);
      return ch?.name || null;
    }
    return null;
  }, [activeTarget, channels]);

  // Hook into real-time socket
  const { status: socketStatus } = useConnectSocket({
    activeChannelId: activeTarget?.type === "channel" ? activeTarget.id : null,
    activeChannelName,
    activeConversationId: activeTarget?.type === "conversation" ? activeTarget.id : null,
    onNewMessage: handleSocketNewMessage,
    onUpdateMessage: handleSocketUpdateMessage,
    onDeleteMessage: handleSocketDeleteMessage,
    onChannelUpdated: handleSocketChannelUpdated,
    onConversationUpdated: handleSocketConversationUpdated,
  });

  /* -------------------------------------------------------------------------- */
  /*                            NAVIGATION ACTIONS                              */
  /* -------------------------------------------------------------------------- */

  const selectChannel = (channel: Channel) => {
    setActiveTarget({ type: "channel", id: channel.id, item: channel });
    setShowMobileChat(true);
  };

  const selectConversation = (conv: Conversation) => {
    setActiveTarget({ type: "conversation", id: conv.id, item: conv });
    setShowMobileChat(true);
  };

  const handleChannelCreated = (newChannel: Channel) => {
    setChannels((prev) => [newChannel, ...prev]);
    selectChannel(newChannel);
  };

  const handleConversationCreated = (newConv: Conversation) => {
    setConversations((prev) => {
      if (prev.some((c) => c.id === newConv.id)) return prev;
      return [newConv, ...prev];
    });
    selectConversation(newConv);
  };

  const handleChannelUpdated = (updated: Channel) => {
    setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (activeTarget?.id === updated.id) {
      setActiveTarget({ type: "channel", id: updated.id, item: updated });
    }
  };

  const handleChannelDeleted = (channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    if (activeTarget?.id === channelId) {
      setActiveTarget(null);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                      CANONICAL MESSAGE ACTIONS & LIFECYCLE                 */
  /* -------------------------------------------------------------------------- */

  /**
   * Send Message: POST /api/communications/messages
   * Flow: types -> optimistic message (status: sending) -> POST API -> server response -> reconcile
   */
  const handleSendMessage = async (content: string, parentMessageId?: string | null) => {
    const target = activeTargetRef.current;
    if (!target || !content.trim() || sending) return;

    setSending(true);

    const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage: ConnectMessage = {
      id: tempId,
      organizationId: "",
      senderId: currentUserId || "me",
      channelId: target.type === "channel" ? target.id : null,
      conversationId: target.type === "conversation" ? target.id : null,
      parentMessageId: parentMessageId || null,
      content,
      type: "TEXT",
      createdAt: new Date().toISOString(),
      status: "sending",
      sender: {
        id: currentUserId || "me",
        name: "You",
        email: "",
      },
    };

    // Optimistic UI display
    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyingToMessage(null);

    try {
      const payload: SendMessagePayload = {
        channelId: target.type === "channel" ? target.id : undefined,
        conversationId: target.type === "conversation" ? target.id : undefined,
        content,
        parentMessageId: parentMessageId || undefined,
      };

      const canonicalMsg = await sendMessage(payload);

      // Reconcile temporary message with canonical server response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...canonicalMsg, status: "sent" }
            : m
        )
      );

      // Update sidebar preview
      if (target.type === "channel") {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === target.id
              ? { ...c, lastMessage: content, lastMessageAt: canonicalMsg.createdAt }
              : c
          )
        );
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === target.id
              ? { ...c, lastMessage: content, lastMessageAt: canonicalMsg.createdAt }
              : c
          )
        );
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      // Mark as failed and preserve content so user can Retry
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, status: "failed", error: "Failed to send message" }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  /**
   * Retry failed message send
   */
  const handleRetrySend = async (failedMsg: ConnectMessage) => {
    const target = activeTargetRef.current;
    if (!target) return;

    // Guard against retrying stale requests if user switched context
    const isCurrentContext =
      (target.type === "channel" && failedMsg.channelId === target.id) ||
      (target.type === "conversation" && failedMsg.conversationId === target.id);
    if (!isCurrentContext) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sending", error: undefined } : m))
    );

    try {
      const payload: SendMessagePayload = {
        channelId: target.type === "channel" ? target.id : undefined,
        conversationId: target.type === "conversation" ? target.id : undefined,
        content: failedMsg.content,
        parentMessageId: failedMsg.parentMessageId || undefined,
      };

      const canonicalMsg = await sendMessage(payload);

      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...canonicalMsg, status: "sent" } : m))
      );
    } catch (err) {
      console.error("Failed to retry send:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "failed", error: "Retry failed" } : m))
      );
    }
  };

  /**
   * Edit Message: PATCH /api/communications/messages/:messageId
   */
  const handleStartEdit = (msg: ConnectMessage) => {
    setReplyingToMessage(null);
    setEditingMessage(msg);
  };

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const updated = await updateMessage(messageId, newContent.trim());
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updated, content: newContent.trim() } : m))
      );
      setEditingMessage(null);
    } catch (err) {
      console.error("Failed to update message:", err);
      alert("Failed to update message. Please check your connection and try again.");
    }
  };

  /**
   * Reply foundation
   */
  const handleStartReply = (msg: ConnectMessage) => {
    setEditingMessage(null);
    setReplyingToMessage(msg);
  };

  /**
   * Delete Message: DELETE /api/communications/messages/:messageId
   */
  const handleDeleteMessage = async (msg: ConnectMessage) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const ok = await deleteMessage(msg.id);
      if (ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      alert("Failed to delete message. Please try again.");
    }
  };

  /**
   * Extensible Action Handlers
   */
  const handleReact = (msg: ConnectMessage, reaction: string) => {
    // Prepared for future reactions API
    console.info(`[Action Architecture] Reaction ${reaction} on message ${msg.id}`);
  };

  const handleMention = (msg: ConnectMessage) => {
    // Prepared for future mentions API
    console.info(`[Action Architecture] Mention author of message ${msg.id}`);
  };

  const handlePin = (msg: ConnectMessage) => {
    // Prepared for future pin API
    console.info(`[Action Architecture] Pin message ${msg.id}`);
  };

  const handleSave = (msg: ConnectMessage) => {
    // Prepared for future save API
    console.info(`[Action Architecture] Save bookmark for message ${msg.id}`);
  };

  /* -------------------------------------------------------------------------- */
  /*                            ACTIVE TARGET DETAILS                           */
  /* -------------------------------------------------------------------------- */

  const activeHeaderDetails = useMemo(() => {
    if (!activeTarget) return null;

    if (activeTarget.type === "channel") {
      const ch = channels.find((c) => c.id === activeTarget.id) || (activeTarget.item as Channel);
      return {
        title: `#${ch?.name || "channel"}`,
        subtitle: ch?.description || "Channel for team discussions",
        isPrivate: ch?.visibility === "PRIVATE",
        type: "channel" as const,
        channel: ch,
      };
    } else {
      const conv =
        conversations.find((c) => c.id === activeTarget.id) ||
        (activeTarget.item as Conversation);

      if (conv?.type === "DIRECT") {
        const other = conv.members?.find((m) => m.userId !== currentUserId);
        const name = other?.user?.name || other?.user?.email || "Direct Message";
        return {
          title: name,
          subtitle: other?.user?.email || "1-on-1 Direct Chat",
          isPrivate: false,
          type: "direct" as const,
          conv,
        };
      } else {
        return {
          title: conv?.name || "Group Conversation",
          subtitle: `${conv?.members?.length || 0} members in group`,
          isPrivate: false,
          type: "group" as const,
          conv,
        };
      }
    }
  }, [activeTarget, channels, conversations, currentUserId]);

  const activeChannelForModal = useMemo(() => {
    if (activeTarget?.type === "channel") {
      return channels.find((c) => c.id === activeTarget.id) || (activeTarget.item as Channel);
    }
    return null;
  }, [activeTarget, channels]);

  const canManageCurrent = useMemo(() => {
    if (activeTarget?.type === "channel") {
      const ch = channels.find((c) => c.id === activeTarget.id);
      return (
        ch?.createdById === currentUserId ||
        ch?.members?.some((m) => m.userId === currentUserId && (m.role === "OWNER" || m.role === "ADMIN"))
      );
    }
    return false;
  }, [activeTarget, channels, currentUserId]);

  return (
    <div
      id="connect-workspace-root"
      className="flex h-[calc(100vh-theme(spacing.16))] p-0 md:p-3 lg:p-6 bg-background font-sans"
    >
      <div className="w-full max-w-7xl mx-auto flex bg-surface md:rounded-3xl shadow-xl border border-border overflow-hidden relative">
        {/* Left Structured Connect Navigation */}
        <ConnectSidebar
          channels={channels}
          conversations={conversations}
          activeTarget={activeTarget}
          onSelectChannel={selectChannel}
          onSelectConversation={selectConversation}
          onOpenCreateChannel={() => setIsCreateChannelOpen(true)}
          onOpenCreateDirect={() => setIsCreateDirectOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenManageChannel={(ch) => {
            selectChannel(ch);
            setIsChannelMembersOpen(true);
          }}
          currentUserId={currentUserId}
          socketStatus={socketStatus}
          unreadMap={unreadMap}
          className={`w-full md:w-[320px] lg:w-[360px] shrink-0 ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        />

        {/* Right Message Area */}
        <div
          id="connect-message-area"
          className={`flex-1 flex-col bg-surface overflow-hidden ${
            showMobileChat ? "flex" : "hidden md:flex"
          }`}
        >
          {activeHeaderDetails ? (
            <>
              {/* Header */}
              <div
                id="connect-chat-header"
                className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0"
              >
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    id="mobile-back-to-sidebar-btn"
                    onClick={() => setShowMobileChat(false)}
                    className="p-1.5 -ml-1 text-text-muted hover:text-text hover:bg-surface-hover rounded-lg md:hidden"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        activeHeaderDetails.type === "channel"
                          ? activeHeaderDetails.isPrivate
                            ? "bg-warning-light text-warning"
                            : "bg-surface-hover text-primary"
                          : activeHeaderDetails.type === "group"
                          ? "bg-surface-hover text-text"
                          : "bg-surface-hover text-success"
                      }`}
                    >
                      {activeHeaderDetails.type === "channel" ? (
                        activeHeaderDetails.isPrivate ? (
                          <Lock size={18} />
                        ) : (
                          <Hash size={18} />
                        )
                      ) : activeHeaderDetails.type === "group" ? (
                        <Users size={18} />
                      ) : (
                        <MessageSquare size={18} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-text tracking-tight">
                          {activeHeaderDetails.title}
                        </h3>
                        {activeHeaderDetails.type === "channel" && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              activeHeaderDetails.isPrivate
                                ? "bg-warning-light text-warning border border-border"
                                : "bg-surface-hover text-primary border border-border"
                            }`}
                          >
                            {activeHeaderDetails.isPrivate ? "Private" : "Public"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted truncate max-w-md">
                        {activeHeaderDetails.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  {activeHeaderDetails.type === "channel" && (
                    <button
                      id="manage-channel-members-btn"
                      onClick={() => setIsChannelMembersOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-primary hover:bg-surface-hover border border-border rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Users size={14} />
                      <span>Manage Members</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message List Stream */}
              <MessageList
                channelId={activeTarget.type === "channel" ? activeTarget.id : null}
                conversationId={activeTarget.type === "conversation" ? activeTarget.id : null}
                messages={messages}
                loading={messagesLoading}
                error={messagesError}
                currentUserId={currentUserId}
                canManage={canManageCurrent}
                emptyTitle={`Welcome to ${activeHeaderDetails.title}`}
                emptySubtitle={
                  activeHeaderDetails.type === "channel"
                    ? "This is the very start of the channel. Send a message below to connect with your team!"
                    : "This is the start of your direct conversation."
                }
                onRetryFetch={() => loadMessagesForTarget(activeTarget)}
                onReply={handleStartReply}
                onEdit={handleStartEdit}
                onDelete={handleDeleteMessage}
                onRetrySend={handleRetrySend}
                onReact={handleReact}
                onMention={handleMention}
                onPin={handlePin}
                onSave={handleSave}
              />

              {/* Message Composer */}
              <MessageComposer
                placeholder={`Message ${activeHeaderDetails.title}...`}
                disabled={messagesLoading}
                sending={sending}
                editingMessage={editingMessage}
                replyingToMessage={replyingToMessage}
                onSendMessage={handleSendMessage}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingMessage(null)}
                onCancelReply={() => setReplyingToMessage(null)}
              />
            </>
          ) : (
            /* Empty State when no conversation or channel is selected */
            <div
              id="no-selection-empty-state"
              className="h-full flex flex-col items-center justify-center p-8 text-center text-text-muted"
            >
              <div className="w-16 h-16 rounded-3xl bg-surface-hover flex items-center justify-center mb-4 border border-border">
                <MessageSquare size={32} className="text-text-muted" />
              </div>
              <h3 className="text-base font-bold text-text mb-1">Connect Workspace</h3>
              <p className="text-xs text-text-muted max-w-sm">
                Select a channel or direct conversation on the left, or create a new one to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onCreated={handleChannelCreated}
        teamMembers={teamMembers}
      />

      {activeChannelForModal && (
        <ChannelMembersModal
          isOpen={isChannelMembersOpen}
          onClose={() => setIsChannelMembersOpen(false)}
          channel={activeChannelForModal}
          currentUserId={currentUserId}
          teamMembers={teamMembers}
          onChannelUpdated={handleChannelUpdated}
          onChannelDeleted={handleChannelDeleted}
        />
      )}

      <CreateDirectMessageModal
        isOpen={isCreateDirectOpen}
        onClose={() => setIsCreateDirectOpen(false)}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        onConversationCreated={handleConversationCreated}
      />

      <CreateGroupConversationModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
