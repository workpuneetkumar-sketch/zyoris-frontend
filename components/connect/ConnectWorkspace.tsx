"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Hash,
  Lock,
  MessageSquare,
  Users,
  ChevronLeft,
  Pin,
  Bookmark,
  Search,
} from "lucide-react";
import ConnectSidebar from "./ConnectSidebar";
import CreateChannelModal from "./CreateChannelModal";
import ChannelMembersModal from "./ChannelMembersModal";
import CreateDirectMessageModal from "./CreateDirectMessageModal";
import CreateGroupConversationModal from "./CreateGroupConversationModal";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import ThreadDrawer from "./ThreadDrawer";
import PinnedMessagesModal from "./PinnedMessagesModal";
import SavedMessagesModal from "./SavedMessagesModal";
import CommunicationSearchModal from "./CommunicationSearchModal";
import BusinessLinkModal from "./BusinessLinkModal";
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
  SocketChannelReadPayload,
  SocketConversationReadPayload,
  SocketMessageReadPayload,
  SocketReactionPayload,
  SocketPinPayload,
  SendMessagePayload,
  MessageAttachment,
  BusinessEntityLink,
  SearchMessageResult,
} from "@/types/connect";
import {
  getChannels,
  getConversations,
  getChannelMessages,
  getConversationMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  saveMessage,
  unsaveMessage,
  markChannelRead,
  markConversationRead,
  getUnreadCounts,
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

  // Day 2 Modals, Drawers & Navigation
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [activeThreadMessage, setActiveThreadMessage] = useState<ConnectMessage | null>(null);
  const [selectedMessageForLinks, setSelectedMessageForLinks] = useState<ConnectMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

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
      const [channelsData, convsData, teamData, empData, unreadData] = await Promise.all([
        getChannels(),
        getConversations(),
        getTeamMembers().catch(() => []),
        getEmployees().catch(() => []),
        getUnreadCounts().catch(() => ({ channels: {}, conversations: {}, total: 0 })),
      ]);

      setChannels(channelsData);
      setConversations(convsData);

      // Populate unread map from server
      const newUnreadMap: Record<string, number> = {};
      if (unreadData.channels) {
        Object.entries(unreadData.channels).forEach(([k, v]) => {
          if (v > 0) newUnreadMap[k] = v;
        });
      }
      if (unreadData.conversations) {
        Object.entries(unreadData.conversations).forEach(([k, v]) => {
          if (v > 0) newUnreadMap[k] = v;
        });
      }
      setUnreadMap(newUnreadMap);

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

    // Call server read state API
    if (activeTarget.type === "channel") {
      markChannelRead(activeTarget.id).catch(() => {});
    } else if (activeTarget.type === "conversation") {
      markConversationRead(activeTarget.id).catch(() => {});
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

          // Reconcile optimistic message
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

      // If this is a reply to an active message, update parent message's replyCount
      if (payload.parentMessageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.parentMessageId
              ? {
                  ...m,
                  replyCount: (m.replyCount || 0) + 1,
                  lastReplyAt: newMsg.createdAt,
                }
              : m
          )
        );
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

  // Sakshi's Live Read Events
  const handleSocketChannelRead = useCallback(
    (payload: SocketChannelReadPayload) => {
      if (!payload?.channelId) return;
      if (!payload.userId || payload.userId === currentUserId || activeTargetRef.current?.id === payload.channelId) {
        setUnreadMap((prev) => {
          if (!prev[payload.channelId]) return prev;
          const copy = { ...prev };
          delete copy[payload.channelId];
          return copy;
        });
      }
    },
    [currentUserId]
  );

  const handleSocketConversationRead = useCallback(
    (payload: SocketConversationReadPayload) => {
      if (!payload?.conversationId) return;
      if (!payload.userId || payload.userId === currentUserId || activeTargetRef.current?.id === payload.conversationId) {
        setUnreadMap((prev) => {
          if (!prev[payload.conversationId]) return prev;
          const copy = { ...prev };
          delete copy[payload.conversationId];
          return copy;
        });
      }
    },
    [currentUserId]
  );

  const handleSocketMessageRead = useCallback(
    (payload: SocketMessageReadPayload) => {
      const targetId = payload.channelId || payload.conversationId;
      if (targetId && (!payload.userId || payload.userId === currentUserId || activeTargetRef.current?.id === targetId)) {
        setUnreadMap((prev) => {
          if (!prev[targetId]) return prev;
          const copy = { ...prev };
          delete copy[targetId];
          return copy;
        });
      }
    },
    [currentUserId]
  );

  // Sakshi's Live Reaction Events
  const handleSocketReaction = useCallback(
    (payload: SocketReactionPayload) => {
      if (!payload?.messageId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== payload.messageId) return m;

          if (payload.reactions) {
            return { ...m, reactions: payload.reactions };
          }

          const existing = m.reactions || [];
          const match = existing.find((r) => r.emoji === payload.emoji);
          const isUser = payload.userId === currentUserId;

          if (payload.action === "remove") {
            if (!match) return m;
            if (match.count <= 1) {
              return { ...m, reactions: existing.filter((r) => r.emoji !== payload.emoji) };
            }
            return {
              ...m,
              reactions: existing.map((r) =>
                r.emoji === payload.emoji
                  ? {
                      ...r,
                      count: Math.max(0, r.count - 1),
                      hasReacted: isUser ? false : r.hasReacted,
                      userIds: r.userIds.filter((id) => id !== payload.userId),
                    }
                  : r
              ),
            };
          } else {
            if (match) {
              const userAlreadyIn = match.userIds.includes(payload.userId);
              return {
                ...m,
                reactions: existing.map((r) =>
                  r.emoji === payload.emoji
                    ? {
                        ...r,
                        count: userAlreadyIn ? r.count : r.count + 1,
                        hasReacted: isUser ? true : r.hasReacted,
                        userIds: userAlreadyIn ? r.userIds : [...r.userIds, payload.userId],
                      }
                    : r
                ),
              };
            } else {
              return {
                ...m,
                reactions: [
                  ...existing,
                  {
                    emoji: payload.emoji,
                    count: 1,
                    hasReacted: isUser,
                    userIds: [payload.userId],
                  },
                ],
              };
            }
          }
        })
      );
    },
    [currentUserId]
  );

  // Sakshi's Live Pin / Unpin Events
  const handleSocketPinUpdated = useCallback((payload: SocketPinPayload) => {
    if (!payload?.messageId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === payload.messageId ? { ...m, isPinned: payload.isPinned } : m
      )
    );
  }, []);

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
    onChannelRead: handleSocketChannelRead,
    onConversationRead: handleSocketConversationRead,
    onMessageRead: handleSocketMessageRead,
    onReaction: handleSocketReaction,
    onPinUpdated: handleSocketPinUpdated,
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
   */
  const handleSendMessage = async (
    content: string,
    parentMessageId?: string | null,
    attachments?: MessageAttachment[],
    mentionedUserIds?: string[]
  ) => {
    const target = activeTargetRef.current;
    if (!target || (!content.trim() && (!attachments || attachments.length === 0)) || sending) return;

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
      attachments,
      mentionedUserIds,
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
        content: content.trim(),
        parentMessageId: parentMessageId || undefined,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        mentionedUserIds: mentionedUserIds && mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
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
      console.error("Failed to send message:", err?.response?.data || err.message, err);
      // Mark as failed and preserve content so user can Retry
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, status: "failed", error: err?.response?.data?.message || "Failed to send message" }
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
        attachments: failedMsg.attachments,
        mentionedUserIds: failedMsg.mentionedUserIds,
      };

      const canonicalMsg = await sendMessage(payload);

      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...canonicalMsg, status: "sent" } : m))
      );
    } catch (err: any) {
      console.error("Failed to retry message:", err?.response?.data || err.message, err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id
            ? { ...m, status: "failed", error: err?.response?.data?.message || "Failed to send message" }
            : m
        )
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
   * Reply in thread foundation
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

  /* -------------------------------------------------------------------------- */
  /*                            DAY 2 ACTIONS                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Reactions: POST /api/communications/messages/:messageId/reactions
   * DELETE /api/communications/messages/:messageId/reactions/:emoji
   */
  const handleReact = async (msg: ConnectMessage, emoji: string) => {
    const existingReactions = msg.reactions || [];
    const currentReaction = existingReactions.find((r) => r.emoji === emoji);
    const hasUserReacted = Boolean(
      currentReaction?.hasReacted ||
        (currentUserId && currentReaction?.userIds?.includes(currentUserId))
    );

    // Optimistic reaction update
    let updatedReactions = [...existingReactions];
    if (hasUserReacted) {
      if (currentReaction && currentReaction.count <= 1) {
        updatedReactions = updatedReactions.filter((r) => r.emoji !== emoji);
      } else if (currentReaction) {
        updatedReactions = updatedReactions.map((r) =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.count - 1,
                hasReacted: false,
                userIds: currentUserId ? r.userIds.filter((id) => id !== currentUserId) : r.userIds,
              }
            : r
        );
      }
    } else {
      if (currentReaction) {
        updatedReactions = updatedReactions.map((r) =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.count + 1,
                hasReacted: true,
                userIds: currentUserId ? [...r.userIds, currentUserId] : r.userIds,
              }
            : r
        );
      } else {
        updatedReactions.push({
          emoji,
          count: 1,
          hasReacted: true,
          userIds: currentUserId ? [currentUserId] : [],
        });
      }
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, reactions: updatedReactions } : m))
    );

    try {
      if (hasUserReacted) {
        await removeReaction(msg.id, emoji);
      } else {
        await addReaction(msg.id, emoji);
      }
    } catch (err) {
      console.error("Failed to update reaction:", err);
      // Revert on failure
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, reactions: existingReactions } : m))
      );
    }
  };

  /**
   * Pin / Unpin Message: POST /api/communications/messages/:messageId/pin
   * DELETE /api/communications/messages/:messageId/pin
   * Nitin's Authorization Rule: Channel Owners/Admins for channels; participants for conversations.
   */
  const handlePin = async (msg: ConnectMessage) => {
    const isChannel = activeTarget?.type === "channel" || Boolean(msg.channelId);
    if (isChannel && !canManageCurrent) {
      alert("Only channel owners and admins are authorized to pin or unpin messages in this channel.");
      return;
    }

    const nextPinned = !msg.isPinned;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isPinned: nextPinned } : m))
    );

    try {
      if (nextPinned) {
        await pinMessage(msg.id);
      } else {
        await unpinMessage(msg.id);
      }
    } catch (err) {
      console.error("Failed to toggle pin state:", err);
      // Revert
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isPinned: !nextPinned } : m))
      );
      alert("Failed to update pin state. Please verify your permissions.");
    }
  };

  /**
   * Save / Unsave Message: POST /api/communications/messages/:messageId/save
   * DELETE /api/communications/messages/:messageId/save
   */
  const handleSave = async (msg: ConnectMessage) => {
    const nextSaved = !msg.isSaved;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isSaved: nextSaved } : m))
    );

    try {
      if (nextSaved) {
        await saveMessage(msg.id);
      } else {
        await unsaveMessage(msg.id);
      }
    } catch (err) {
      console.error("Failed to bookmark message:", err);
      // Revert
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isSaved: !nextSaved } : m))
      );
      alert("Failed to update bookmark state.");
    }
  };

  /**
   * Search result navigation: jump to message, select context, and highlight
   */
  const handleSelectSearchResult = (result: SearchMessageResult) => {
    if (result.channelId) {
      const ch = channels.find((c) => c.id === result.channelId);
      if (ch) selectChannel(ch);
    } else if (result.conversationId) {
      const conv = conversations.find((c) => c.id === result.conversationId);
      if (conv) selectConversation(conv);
    }

    setHighlightedMessageId(result.id);
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3500);
  };

  /**
   * Jump to saved message
   */
  const handleJumpToSavedMessage = (savedMsg: ConnectMessage) => {
    if (savedMsg.channelId) {
      const ch = channels.find((c) => c.id === savedMsg.channelId);
      if (ch) selectChannel(ch);
    } else if (savedMsg.conversationId) {
      const conv = conversations.find((c) => c.id === savedMsg.conversationId);
      if (conv) selectConversation(conv);
    }

    setHighlightedMessageId(savedMsg.id);
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3500);
  };

  /**
   * Jump to pinned message
   */
  const handleJumpToPinnedMessage = (pinnedMessageId: string) => {
    setHighlightedMessageId(pinnedMessageId);
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3500);
  };

  /**
   * Business entity links updated
   */
  const handleLinksUpdated = (messageId: string, updatedLinks: BusinessEntityLink[]) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, links: updatedLinks } : m))
    );
  };

  /**
   * Thread reply sent callback
   */
  const handleThreadReplySent = (parentMessageId: string, reply: ConnectMessage) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === parentMessageId
          ? {
              ...m,
              replyCount: (m.replyCount || 0) + 1,
              lastReplyAt: reply.createdAt,
            }
          : m
      )
    );
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
          onOpenSearchModal={() => setIsSearchOpen(true)}
          onOpenSavedModal={() => setIsSavedOpen(true)}
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
                  {/* Pinned Messages Button */}
                  <button
                    id="view-pinned-messages-btn"
                    onClick={() => setIsPinnedOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-primary hover:bg-surface-hover border border-border rounded-xl transition-all flex items-center gap-1.5"
                    title="View Pinned Messages"
                  >
                    <Pin size={14} className="text-warning" />
                    <span>Pinned</span>
                  </button>

                  {/* Search Button */}
                  <button
                    id="header-search-btn"
                    onClick={() => setIsSearchOpen(true)}
                    className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-hover border border-border rounded-xl transition-all"
                    title="Search Messages"
                  >
                    <Search size={16} />
                  </button>

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

              {/* Main Chat and Drawer Container */}
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Message List Stream */}
                  <MessageList
                    channelId={activeTarget?.type === "channel" ? activeTarget.id : null}
                    conversationId={activeTarget?.type === "conversation" ? activeTarget.id : null}
                    messages={messages}
                    loading={messagesLoading}
                    error={messagesError}
                    currentUserId={currentUserId}
                    canManage={canManageCurrent}
                    highlightedMessageId={highlightedMessageId}
                    emptyTitle={`Welcome to ${activeHeaderDetails.title}`}
                    emptySubtitle={
                      activeHeaderDetails.type === "channel"
                        ? "This is the very start of the channel. Send a message below to connect with your team!"
                        : "This is the start of your direct conversation."
                    }
                    onRetryFetch={() => { if (activeTarget) loadMessagesForTarget(activeTarget); }}
                    onReply={handleStartReply}
                    onEdit={handleStartEdit}
                    onDelete={handleDeleteMessage}
                    onRetrySend={handleRetrySend}
                    onReact={handleReact}
                    onPin={handlePin}
                    onSave={handleSave}
                    onOpenThread={(msg) => setActiveThreadMessage(msg)}
                    onOpenLinkModal={(msg) => setSelectedMessageForLinks(msg)}
                  />

                  {/* Message Composer */}
                  <MessageComposer
                    placeholder={`Message ${activeHeaderDetails.title}...`}
                    disabled={messagesLoading}
                    sending={sending}
                    editingMessage={editingMessage}
                    replyingToMessage={replyingToMessage}
                    teamMembers={teamMembers}
                    onSendMessage={handleSendMessage}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingMessage(null)}
                    onCancelReply={() => setReplyingToMessage(null)}
                  />
                </div>

                {/* Thread Drawer Panel */}
                {activeThreadMessage && (
                  <ThreadDrawer
                    isOpen={Boolean(activeThreadMessage)}
                    onClose={() => setActiveThreadMessage(null)}
                    parentMessage={activeThreadMessage}
                    currentUserId={currentUserId}
                    teamMembers={teamMembers}
                    onReplySent={handleThreadReplySent}
                  />
                )}
              </div>
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

      {/* Day 2 Modals */}
      {isSearchOpen && (
        <CommunicationSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          currentChannelId={activeTarget?.type === "channel" ? activeTarget.id : null}
          currentChannelName={activeHeaderDetails?.type === "channel" ? (activeHeaderDetails.channel?.name || null) : null}
          currentConversationId={activeTarget?.type === "conversation" ? activeTarget.id : null}
          onSelectResult={handleSelectSearchResult}
        />
      )}

      {isSavedOpen && (
        <SavedMessagesModal
          isOpen={isSavedOpen}
          onClose={() => setIsSavedOpen(false)}
          onJumpToSavedMessage={handleJumpToSavedMessage}
          onUnsaved={(msgId) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, isSaved: false } : m))
            );
          }}
        />
      )}

      {isPinnedOpen && activeTarget && (
        <PinnedMessagesModal
          isOpen={isPinnedOpen}
          onClose={() => setIsPinnedOpen(false)}
          targetType={activeTarget.type}
          targetId={activeTarget.id}
          targetTitle={activeHeaderDetails?.title || "Current Chat"}
          canUnpin={activeTarget.type === "channel" ? canManageCurrent : true}
          onJumpToMessage={handleJumpToPinnedMessage}
          onUnpinned={(msgId) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, isPinned: false } : m))
            );
          }}
        />
      )}

      {selectedMessageForLinks && (
        <BusinessLinkModal
          isOpen={Boolean(selectedMessageForLinks)}
          onClose={() => setSelectedMessageForLinks(null)}
          message={selectedMessageForLinks}
          onLinksUpdated={handleLinksUpdated}
        />
      )}
    </div>
  );
}
