"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Hash,
  Lock,
  MessageSquare,
  Users,
  ChevronLeft,
  Info,
  Pin,
  Settings,
} from "lucide-react";
import ConnectSidebar from "./ConnectSidebar";
import CreateChannelModal from "./CreateChannelModal";
import ChannelMembersModal from "./ChannelMembersModal";
import CreateDirectMessageModal from "./CreateDirectMessageModal";
import CreateGroupConversationModal from "./CreateGroupConversationModal";
import GroupMembersModal from "./GroupMembersModal";
import ChannelDetailsDrawer from "./ChannelDetailsDrawer";
import BusinessLinkModal from "./BusinessLinkModal";
import ThreadPanel from "./ThreadPanel";
import TypingIndicator from "./TypingIndicator";
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
  SocketReactionAddPayload,
  SocketReactionRemovePayload,
  SocketThreadReplyPayload,
  SocketTypingEventPayload,
  SocketPresenceUpdatePayload,
  SendMessagePayload,
  PresenceStatus,
  TypingIndicatorInfo,
  BusinessEntityLink,
} from "@/types/connect";
import {
  getChannels,
  getConversations,
  fetchChannelsResult,
  fetchConversationsResult,
  getCachedChannels,
  getCachedConversations,
  getChannelMessages,
  getConversationMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markChannelAsRead,
  markConversationAsRead,
  getUnreadSummary,
  pinMessage,
  unpinMessage,
  saveMessage,
  unsaveMessage,
  getChannelPins,
  getConversationPins,
  getSavedMessages,
} from "@/lib/api/connectApi";
import { getTeamMembers, TeamMember } from "@/lib/api/organizationsApi";
import { getEmployees } from "@/lib/api/hrApi";
import { useConnectSocket } from "@/hooks/useConnectSocket";
import { MentionMember } from "./MentionAutocomplete";

export default function ConnectWorkspace() {
  // Navigation & Data State - initialized from local cache to prevent data loss on reload
  const [channels, setChannels] = useState<Channel[]>(() => {
    if (typeof window !== "undefined") {
      return getCachedChannels();
    }
    return [];
  });
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window !== "undefined") {
      return getCachedConversations();
    }
    return [];
  });
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
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

  // Modals & Drawers State
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isChannelMembersOpen, setIsChannelMembersOpen] = useState(false);
  const [isCreateDirectOpen, setIsCreateDirectOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
  const [isChannelDetailsOpen, setIsChannelDetailsOpen] = useState(false);
  const [linkingMessage, setLinkingMessage] = useState<ConnectMessage | null>(null);

  // Thread Panel State (Day 2)
  const [activeThreadMessage, setActiveThreadMessage] = useState<ConnectMessage | null>(null);

  // Typing Indicators State (Day 2)
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorInfo[]>([]);

  // Presence State (Day 2)
  const [currentUserPresence, setCurrentUserPresence] = useState<PresenceStatus>("ONLINE");
  const [userPresenceMap, setUserPresenceMap] = useState<Record<string, PresenceStatus>>({});

  // Pin & Save sync version for Details Drawer
  const [pinSaveVersion, setPinSaveVersion] = useState(0);

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
    setChannelsLoading(true);
    setConversationsLoading(true);
    try {
      const [channelsRes, convsRes, teamData, empData, unreadData] = await Promise.all([
        fetchChannelsResult(),
        fetchConversationsResult(),
        getTeamMembers().catch(() => []),
        getEmployees().catch(() => []),
        getUnreadSummary().catch(() => []),
      ]);

      // Channels state: only overwrite if successful or if result has data
      if (channelsRes.error) {
        setChannelsError(channelsRes.error);
        if (channelsRes.data.length > 0) {
          setChannels(channelsRes.data);
        }
      } else {
        setChannelsError(null);
        setChannels(channelsRes.data);
      }

      // Conversations state:
      if (convsRes.error) {
        setConversationsError(convsRes.error);
        if (convsRes.data.length > 0) {
          setConversations(convsRes.data);
        }
      } else {
        setConversationsError(null);
        setConversations(convsRes.data);
      }

      // Merge unread counts
      if (unreadData && unreadData.length > 0) {
        const map: Record<string, number> = {};
        unreadData.forEach((u) => {
          map[u.id] = u.unreadCount;
        });
        setUnreadMap(map);
      }

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
      const effectiveChannels = channelsRes.data.length > 0 ? channelsRes.data : channels;
      const effectiveConvs = convsRes.data.length > 0 ? convsRes.data : conversations;

      if (!activeTargetRef.current) {
        if (effectiveChannels.length > 0) {
          selectChannel(effectiveChannels[0]);
        } else if (effectiveConvs.length > 0) {
          selectConversation(effectiveConvs[0]);
        }
      }
    } catch (err: any) {
      console.error("[Connect] Failed to load initial Connect data:", err);
    } finally {
      setChannelsLoading(false);
      setConversationsLoading(false);
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
    setTypingUsers([]);

    try {
      const [messagesRes, pinsRes, savedRes] = await Promise.all([
        target.type === "channel"
          ? getChannelMessages(target.id, 50, undefined, controller.signal)
          : getConversationMessages(target.id, 50, undefined, controller.signal),
        target.type === "channel"
          ? getChannelPins(target.id)
          : getConversationPins(target.id),
        getSavedMessages(),
      ]);

      if (!controller.signal.aborted) {
        const pinnedIds = new Set(
          pinsRes.map((p) => p.id || (p as any).messageId)
        );
        const savedIds = new Set(
          savedRes.data.map((s) => s.id || (s as any).messageId)
        );

        const hydratedMessages = messagesRes.data.map((m) => ({
          ...m,
          isPinned: pinnedIds.has(m.id),
          isSaved: savedIds.has(m.id),
        }));

        setMessages(hydratedMessages);
        const lastMsgId = hydratedMessages[hydratedMessages.length - 1]?.id;
        if (lastMsgId) {
          if (target.type === "channel") {
            markChannelAsRead(target.id, lastMsgId);
          } else {
            markConversationAsRead(target.id, lastMsgId);
          }
        }
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

  // Reload messages whenever active context changes & mark as read
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
        attachments: payload.attachments,
        mentionedUserIds: payload.mentionedUserIds,
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

        if (newMsg?.id && !newMsg.id.startsWith("opt-") && !newMsg.id.startsWith("socket-")) {
          if (targetChannelId) {
            markChannelAsRead(targetChannelId, newMsg.id);
          } else if (targetConvId) {
            markConversationAsRead(targetConvId, newMsg.id);
          }
        }
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

  // Day 2 Reaction Event Handlers
  const handleSocketReactionAdd = useCallback((payload: SocketReactionAddPayload) => {
    if (!payload?.messageId || !payload?.emoji) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== payload.messageId) return msg;
        const currentReactions = [...(msg.reactions || [])];
        const rIndex = currentReactions.findIndex((r) => r.emoji === payload.emoji);

        if (rIndex !== -1) {
          const item = currentReactions[rIndex];
          const userExists = item.users.some((u) => u.id === payload.userId);
          const users = userExists
            ? item.users
            : [...item.users, { id: payload.userId, name: payload.userName || "Teammate" }];
          currentReactions[rIndex] = {
            ...item,
            count: item.count + (userExists ? 0 : 1),
            hasReacted: item.hasReacted || payload.userId === currentUserId,
            users,
          };
        } else {
          currentReactions.push({
            emoji: payload.emoji,
            count: 1,
            hasReacted: payload.userId === currentUserId,
            users: [{ id: payload.userId, name: payload.userName || "Teammate" }],
          });
        }
        return { ...msg, reactions: currentReactions };
      })
    );
  }, [currentUserId]);

  const handleSocketReactionRemove = useCallback((payload: SocketReactionRemovePayload) => {
    if (!payload?.messageId || !payload?.emoji) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== payload.messageId) return msg;
        const currentReactions = [...(msg.reactions || [])];
        const rIndex = currentReactions.findIndex((r) => r.emoji === payload.emoji);

        if (rIndex !== -1) {
          const item = currentReactions[rIndex];
          const newUsers = item.users.filter((u) => u.id !== payload.userId);
          const newCount = item.count - 1;
          if (newCount <= 0) {
            currentReactions.splice(rIndex, 1);
          } else {
            currentReactions[rIndex] = {
              ...item,
              count: newCount,
              hasReacted: item.hasReacted && payload.userId !== currentUserId,
              users: newUsers,
            };
          }
        }
        return { ...msg, reactions: currentReactions };
      })
    );
  }, [currentUserId]);

  // Day 2 Thread Reply Socket Handler
  const handleSocketThreadReply = useCallback((payload: SocketThreadReplyPayload) => {
    if (!payload?.messageId) return;

    // Increment reply count on parent message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === payload.messageId
          ? {
              ...m,
              replyCount: (m.replyCount || 0) + 1,
              lastReplyAt: new Date().toISOString(),
            }
          : m
      )
    );
  }, []);

  // Day 2 Typing Socket Handlers
  const handleSocketTypingStart = useCallback((payload: SocketTypingEventPayload) => {
    if (!payload?.userId || payload.userId === currentUserId) return;
    setTypingUsers((prev) => {
      const filtered = prev.filter((u) => u.userId !== payload.userId);
      return [
        ...filtered,
        {
          userId: payload.userId!,
          userName: payload.userName || "Someone",
          channelId: payload.channel,
          conversationId: payload.conversationId,
          timestamp: Date.now(),
        },
      ];
    });
  }, [currentUserId]);

  const handleSocketTypingStop = useCallback((payload: SocketTypingEventPayload) => {
    if (!payload?.userId) return;
    setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
  }, []);

  // Day 2 Presence Socket Handler
  const handleSocketPresenceUpdate = useCallback((payload: SocketPresenceUpdatePayload) => {
    if (!payload?.userId || !payload?.status) return;
    setUserPresenceMap((prev) => ({
      ...prev,
      [payload.userId]: payload.status,
    }));
  }, []);

  // Active channel name for socket room subscription
  const activeChannelName = useMemo(() => {
    if (activeTarget?.type === "channel") {
      const ch = channels.find((c) => c.id === activeTarget.id) || (activeTarget.item as Channel);
      return ch?.name || null;
    }
    return null;
  }, [activeTarget, channels]);

  // Hook into real-time socket with Day 1 & Day 2 contracts
  const {
    status: socketStatus,
    emitSendMessage,
    emitThreadReply,
    emitReactionAdd,
    emitReactionRemove,
    emitMentionNew,
    emitTypingStart,
    emitTypingStop,
    emitPresenceUpdate,
    emitMessageRead,
  } = useConnectSocket({
    activeChannelId: activeTarget?.type === "channel" ? activeTarget.id : null,
    activeChannelName,
    activeConversationId: activeTarget?.type === "conversation" ? activeTarget.id : null,
    onNewMessage: handleSocketNewMessage,
    onUpdateMessage: handleSocketUpdateMessage,
    onDeleteMessage: handleSocketDeleteMessage,
    onChannelUpdated: handleSocketChannelUpdated,
    onConversationUpdated: handleSocketConversationUpdated,
    onReactionAdd: handleSocketReactionAdd,
    onReactionRemove: handleSocketReactionRemove,
    onThreadReply: handleSocketThreadReply,
    onTypingStart: handleSocketTypingStart,
    onTypingStop: handleSocketTypingStop,
    onPresenceUpdate: handleSocketPresenceUpdate,
  });

  // Handle Presence change by current user
  const handleChangePresence = (status: PresenceStatus) => {
    setCurrentUserPresence(status);
    emitPresenceUpdate({ status });
  };

  /* -------------------------------------------------------------------------- */
  /*                            NAVIGATION ACTIONS                              */
  /* -------------------------------------------------------------------------- */

  const selectChannel = (channel: Channel) => {
    setActiveTarget({ type: "channel", id: channel.id, item: channel });
    setShowMobileChat(true);
    setActiveThreadMessage(null);
  };

  const selectConversation = (conv: Conversation) => {
    setActiveTarget({ type: "conversation", id: conv.id, item: conv });
    setShowMobileChat(true);
    setActiveThreadMessage(null);
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
    mentionedUserIds?: string[]
  ) => {
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
      mentionedUserIds,
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
        mentionedUserIds,
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

      // Emit mention socket event if any teammates were mentioned
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        emitMentionNew({
          messageId: canonicalMsg.id || tempId,
          mentionedUserIds,
        });
      }

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

      // Mark as read with newly sent canonical message ID
      if (canonicalMsg?.id) {
        if (target.type === "channel") {
          markChannelAsRead(target.id, canonicalMsg.id);
        } else {
          markConversationAsRead(target.id, canonicalMsg.id);
        }
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
   * Start in-composer reply
   */
  const handleStartReply = (msg: ConnectMessage) => {
    setEditingMessage(null);
    setReplyingToMessage(msg);
  };

  /**
   * Open dedicated side Thread Panel
   */
  const handleOpenThread = (msg: ConnectMessage) => {
    setActiveThreadMessage(msg);
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
        if (activeThreadMessage?.id === msg.id) {
          setActiveThreadMessage(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      alert("Failed to delete message. Please try again.");
    }
  };

  /**
   * Reaction handling (Day 2)
   */
  const handleReact = async (msg: ConnectMessage, emoji: string) => {
    const existing = msg.reactions?.find((r) => r.emoji === emoji);
    const hasReacted = existing?.hasReacted;

    // Optimistically update reactions
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msg.id) return m;
        const currentReactions = [...(m.reactions || [])];
        const rIndex = currentReactions.findIndex((r) => r.emoji === emoji);

        if (hasReacted) {
          if (rIndex !== -1) {
            const count = currentReactions[rIndex].count - 1;
            if (count <= 0) {
              currentReactions.splice(rIndex, 1);
            } else {
              currentReactions[rIndex] = {
                ...currentReactions[rIndex],
                count,
                hasReacted: false,
                users: currentReactions[rIndex].users.filter((u) => u.id !== currentUserId),
              };
            }
          }
        } else {
          if (rIndex !== -1) {
            currentReactions[rIndex] = {
              ...currentReactions[rIndex],
              count: currentReactions[rIndex].count + 1,
              hasReacted: true,
              users: [...currentReactions[rIndex].users, { id: currentUserId || "me", name: "You" }],
            };
          } else {
            currentReactions.push({
              emoji,
              count: 1,
              hasReacted: true,
              users: [{ id: currentUserId || "me", name: "You" }],
            });
          }
        }
        return { ...m, reactions: currentReactions };
      })
    );

    // Call REST API and emit socket event
    if (hasReacted) {
      await removeReaction(msg.id, emoji);
      emitReactionRemove({ messageId: msg.id, emoji });
    } else {
      await addReaction(msg.id, emoji);
      emitReactionAdd({ messageId: msg.id, emoji });
    }
  };

  /**
   * Pin message handling (Day 2)
   */
  const handlePin = async (msg: ConnectMessage) => {
    const isCurrentlyPinned = Boolean(msg.isPinned);
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isPinned: !isCurrentlyPinned } : m))
    );

    try {
      if (isCurrentlyPinned) {
        const ok = await unpinMessage(msg.id);
        if (!ok) {
          // Revert if rejected
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, isPinned: true } : m))
          );
        } else {
          setPinSaveVersion((v) => v + 1);
        }
      } else {
        const res = await pinMessage(msg.id);
        if (!res || !res.success) {
          // Revert if rejected
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, isPinned: false } : m))
          );
        } else {
          setPinSaveVersion((v) => v + 1);
        }
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isPinned: isCurrentlyPinned } : m))
      );
    }
  };

  /**
   * Save / bookmark message handling (Day 2)
   */
  const handleSave = async (msg: ConnectMessage) => {
    const isCurrentlySaved = Boolean(msg.isSaved);
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isSaved: !isCurrentlySaved } : m))
    );

    try {
      if (isCurrentlySaved) {
        const ok = await unsaveMessage(msg.id);
        if (!ok) {
          // Revert if rejected
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, isSaved: true } : m))
          );
        } else {
          setPinSaveVersion((v) => v + 1);
        }
      } else {
        const res = await saveMessage(msg.id);
        if (!res || !res.success) {
          // Revert if rejected
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, isSaved: false } : m))
          );
        } else {
          setPinSaveVersion((v) => v + 1);
        }
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isSaved: isCurrentlySaved } : m))
      );
    }
  };

  /**
   * Link message to Business Entity (Day 2)
   */
  const handleLinkEntity = (msg: ConnectMessage) => {
    setLinkingMessage(msg);
  };

  const handleEntityLinkCreated = (newLink: BusinessEntityLink) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === newLink.messageId
          ? {
              ...m,
              businessLinks: [...(m.businessLinks || []), newLink],
            }
          : m
      )
    );
  };

  /**
   * Mention author of message
   */
  const handleMentionAuthor = (msg: ConnectMessage) => {
    const name = msg.sender?.name;
    if (name) {
      // Focus composer with @name
      const el = document.getElementById("message-composer-input") as HTMLTextAreaElement;
      if (el) {
        el.value = el.value ? `${el.value} @${name} ` : `@${name} `;
        el.focus();
      }
    }
  };

  // Convert teamMembers to MentionMember format
  const mentionMembers: MentionMember[] = useMemo(
    () =>
      teamMembers.map((tm) => ({
        id: tm.id,
        name: tm.name,
        email: tm.email,
        role: tm.role,
        avatarUrl: tm.avatar || (tm as any).avatarUrl,
      })),
    [teamMembers]
  );

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
        const peerStatus = other?.userId ? userPresenceMap[other.userId] || "ONLINE" : "ONLINE";
        return {
          title: name,
          subtitle: other?.user?.email || `Status: ${peerStatus}`,
          isPrivate: false,
          type: "direct" as const,
          conv,
          peerStatus,
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
  }, [activeTarget, channels, conversations, currentUserId, userPresenceMap]);

  const activeChannelForModal = useMemo(() => {
    if (activeTarget?.type === "channel") {
      return channels.find((c) => c.id === activeTarget.id) || (activeTarget.item as Channel);
    }
    return null;
  }, [activeTarget, channels]);

  const activeGroupForModal = useMemo(() => {
    if (activeTarget?.type === "conversation") {
      const conv =
        conversations.find((c) => c.id === activeTarget.id) ||
        (activeTarget.item as Conversation);
      if (conv?.type === "GROUP") return conv;
    }
    return null;
  }, [activeTarget, conversations]);

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
          userPresenceMap={userPresenceMap}
          currentUserPresence={currentUserPresence}
          onChangePresence={handleChangePresence}
          channelsLoading={channelsLoading}
          channelsError={channelsError}
          conversationsLoading={conversationsLoading}
          conversationsError={conversationsError}
          onRetryLoad={loadInitialData}
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
                          ? "bg-surface-hover text-purple-600"
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
                  {/* Manage Group Button */}
                  {activeHeaderDetails.type === "group" && (
                    <button
                      id="manage-group-members-btn"
                      onClick={() => setIsGroupMembersOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-primary hover:bg-surface-hover border border-border rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Users size={14} />
                      <span>Group Members</span>
                    </button>
                  )}

                  {/* Manage Channel Members Button */}
                  {activeHeaderDetails.type === "channel" && (
                    <button
                      id="manage-channel-members-btn"
                      onClick={() => setIsChannelMembersOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-primary hover:bg-surface-hover border border-border rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Users size={14} />
                      <span>Members</span>
                    </button>
                  )}

                  {/* Channel / Chat Details Drawer Button (Task 8) */}
                  <button
                    id="channel-details-drawer-btn"
                    onClick={() => setIsChannelDetailsOpen((prev) => !prev)}
                    className={`p-2 rounded-xl border transition-all ${
                      isChannelDetailsOpen
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-text-muted hover:text-text hover:bg-surface-hover"
                    }`}
                    title="Channel Details & Resources"
                  >
                    <Info size={16} />
                  </button>
                </div>
              </div>

              {/* Message List Stream */}
              <MessageList
                channelId={activeTarget?.type === "channel" ? activeTarget.id : null}
                conversationId={activeTarget?.type === "conversation" ? activeTarget.id : null}
                messages={messages}
                loading={messagesLoading}
                error={messagesError}
                currentUserId={currentUserId}
                canManage={canManageCurrent}
                unreadCount={activeTarget ? unreadMap[activeTarget.id] || 0 : 0}
                emptyTitle={`Welcome to ${activeHeaderDetails.title}`}
                emptySubtitle={
                  activeHeaderDetails.type === "channel"
                    ? "This is the very start of the channel. Send a message below to connect with your team!"
                    : "This is the start of your direct conversation."
                }
                onRetryFetch={() => {
                  if (activeTarget) loadMessagesForTarget(activeTarget);
                }}
                onReply={handleStartReply}
                onOpenThread={handleOpenThread}
                onEdit={handleStartEdit}
                onDelete={handleDeleteMessage}
                onRetrySend={handleRetrySend}
                onReact={handleReact}
                onMention={handleMentionAuthor}
                onPin={handlePin}
                onSave={handleSave}
                onLinkEntity={handleLinkEntity}
              />

              {/* Live Typing Indicator (Task 7) */}
              <TypingIndicator
                typingUsers={typingUsers}
                currentUserId={currentUserId}
              />

              {/* Message Composer */}
              <MessageComposer
                placeholder={`Message ${activeHeaderDetails.title}...`}
                disabled={messagesLoading}
                sending={sending}
                editingMessage={editingMessage}
                replyingToMessage={replyingToMessage}
                teamMembers={mentionMembers}
                onSendMessage={handleSendMessage}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingMessage(null)}
                onCancelReply={() => setReplyingToMessage(null)}
                onTypingStart={() => {
                  if (activeTarget?.type === "channel") {
                    emitTypingStart({ channel: activeTarget.id });
                  } else if (activeTarget?.type === "conversation") {
                    emitTypingStart({ conversationId: activeTarget.id });
                  }
                }}
                onTypingStop={() => {
                  if (activeTarget?.type === "channel") {
                    emitTypingStop({ channel: activeTarget.id });
                  } else if (activeTarget?.type === "conversation") {
                    emitTypingStop({ conversationId: activeTarget.id });
                  }
                }}
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

        {/* Thread Panel (Task 3: Build thread panel and reply navigation) */}
        {activeThreadMessage && (
          <ThreadPanel
            parentMessage={activeThreadMessage}
            onClose={() => setActiveThreadMessage(null)}
            currentUserId={currentUserId}
            teamMembers={mentionMembers}
            onEmitThreadReply={emitThreadReply}
            onEmitReactionAdd={emitReactionAdd}
            onEmitReactionRemove={emitReactionRemove}
            onEmitMentionNew={emitMentionNew}
          />
        )}

        {/* Channel Details & Business-Links Drawer (Task 8) */}
        {isChannelDetailsOpen && activeTarget && (
          <ChannelDetailsDrawer
            isOpen={true}
            onClose={() => setIsChannelDetailsOpen(false)}
            activeTarget={activeTarget}
            currentUserId={currentUserId}
            pinSaveVersion={pinSaveVersion}
            onMessageUnpinned={(msgId) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, isPinned: false } : m))
              );
              setPinSaveVersion((v) => v + 1);
            }}
            onMessageUnsaved={(msgId) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, isSaved: false } : m))
              );
              setPinSaveVersion((v) => v + 1);
            }}
          />
        )}
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

      {activeGroupForModal && (
        <GroupMembersModal
          isOpen={isGroupMembersOpen}
          onClose={() => setIsGroupMembersOpen(false)}
          conversation={activeGroupForModal}
          currentUserId={currentUserId}
          teamMembers={teamMembers}
          onConversationUpdated={(updated) => {
            setConversations((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          }}
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

      {/* Business Entity Link Modal (Task 8) */}
      <BusinessLinkModal
        isOpen={Boolean(linkingMessage)}
        onClose={() => setLinkingMessage(null)}
        message={linkingMessage}
        onLinkCreated={handleEntityLinkCreated}
      />
    </div>
  );
}
