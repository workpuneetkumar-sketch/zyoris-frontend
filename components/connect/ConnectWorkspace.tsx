"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Send,
  Hash,
  Lock,
  MessageSquare,
  Users,
  Settings,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Info,
  CheckCheck,
} from "lucide-react";
import ConnectSidebar from "./ConnectSidebar";
import CreateChannelModal from "./CreateChannelModal";
import ChannelMembersModal from "./ChannelMembersModal";
import CreateDirectMessageModal from "./CreateDirectMessageModal";
import CreateGroupConversationModal from "./CreateGroupConversationModal";
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
} from "@/types/connect";
import {
  getChannels,
  getConversations,
  getConnectMessages,
  sendConnectMessage,
  updateConnectMessage,
  deleteConnectMessage,
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
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unread badge tracking
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Modals
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isChannelMembersOpen, setIsChannelMembersOpen] = useState(false);
  const [isCreateDirectOpen, setIsCreateDirectOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Message Editing
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeTargetRef = useRef<ActiveTarget | null>(null);
  activeTargetRef.current = activeTarget;

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
      setError(null);
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
      setError("Failed to load workspace data. Please check your connection.");
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages whenever active target changes
  useEffect(() => {
    if (!activeTarget) return;

    // Clear unread count for opened target
    setUnreadMap((prev) => {
      if (!prev[activeTarget.id]) return prev;
      const copy = { ...prev };
      delete copy[activeTarget.id];
      return copy;
    });

    loadMessagesForTarget(activeTarget);
  }, [activeTarget?.id, activeTarget?.type]);

  const loadMessagesForTarget = async (target: ActiveTarget) => {
    setMessagesLoading(true);
    try {
      const params =
        target.type === "channel"
          ? { channelId: target.id }
          : { conversationId: target.id };

      const res = await getConnectMessages(params);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages for target:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                          SOCKET EVENT HANDLERS                             */
  /* -------------------------------------------------------------------------- */

  const handleSocketNewMessage = useCallback((payload: SocketMessageNewPayload) => {
    const targetChannelId = payload.channelId;
    const targetConvId = payload.conversationId;
    const msgId = payload.id || payload.messageId || `socket-${Date.now()}`;

    const newMsg: ConnectMessage = {
      id: msgId,
      organizationId: "",
      senderId: payload.senderId || "",
      channelId: targetChannelId,
      conversationId: targetConvId,
      content: payload.content || "",
      createdAt: payload.createdAt || new Date().toISOString(),
      sender: payload.sender,
    };

    const current = activeTargetRef.current;
    const isForActiveTarget =
      (current?.type === "channel" && current.id === targetChannelId) ||
      (current?.type === "conversation" && current.id === targetConvId);

    if (isForActiveTarget) {
      setMessages((prev) => {
        // Prevent duplicate if sent optimistically
        if (prev.some((m) => m.id === newMsg.id || (m.content === newMsg.content && m.senderId === newMsg.senderId && m.id.startsWith("opt-")))) {
          return prev.map((m) =>
            m.content === newMsg.content && m.senderId === newMsg.senderId && m.id.startsWith("opt-")
              ? newMsg
              : m
          );
        }
        return [...prev, newMsg];
      });
    } else {
      // Mark as unread in sidebar!
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
  }, []);

  const handleSocketUpdateMessage = useCallback((payload: SocketMessageUpdatePayload) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === payload.messageId
          ? { ...m, content: payload.content, editedAt: payload.updatedAt || new Date().toISOString() }
          : m
      )
    );
  }, []);

  const handleSocketDeleteMessage = useCallback((payload: SocketMessageDeletePayload) => {
    setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
  }, []);

  const handleSocketChannelUpdated = useCallback((payload: SocketChannelUpdatedPayload) => {
    // Refetch channels to stay in sync
    getChannels().then((data) => setChannels(data));
  }, []);

  const handleSocketConversationUpdated = useCallback(
    (payload: SocketConversationUpdatedPayload) => {
      getConversations().then((data) => setConversations(data));
    },
    []
  );

  // Hook into real-time socket
  const { status: socketStatus, emitSendMessage } = useConnectSocket({
    activeChannelId: activeTarget?.type === "channel" ? activeTarget.id : null,
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
  /*                             MESSAGING ACTIONS                              */
  /* -------------------------------------------------------------------------- */

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeTarget || sending) return;

    const content = inputText.trim();
    setInputText("");
    setSending(true);

    const tempId = `opt-${Date.now()}`;
    const optimisticMessage: ConnectMessage = {
      id: tempId,
      organizationId: "",
      senderId: currentUserId || "me",
      channelId: activeTarget.type === "channel" ? activeTarget.id : null,
      conversationId: activeTarget.type === "conversation" ? activeTarget.id : null,
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId || "me",
        name: "You",
        email: "",
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const payload =
        activeTarget.type === "channel"
          ? { channelId: activeTarget.id, content }
          : { conversationId: activeTarget.id, content };

      const sent = await sendConnectMessage(payload);

      // Emit to Sakshi's Socket.IO server
      emitSendMessage({
        messageId: sent.id,
        channelId: sent.channelId,
        conversationId: sent.conversationId,
        content: sent.content,
      });

      // Replace optimistic message with actual persisted record
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? sent : m))
      );

      // Update sidebar preview
      if (activeTarget.type === "channel") {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === activeTarget.id
              ? { ...c, lastMessage: content, lastMessageAt: sent.createdAt }
              : c
          )
        );
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeTarget.id
              ? { ...c, lastMessage: content, lastMessageAt: sent.createdAt }
              : c
          )
        );
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      // Remove failed optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = (msg: ConnectMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim()) {
      handleCancelEdit();
      return;
    }

    try {
      const updated = await updateConnectMessage(msgId, editText.trim());
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? updated : m))
      );
      handleCancelEdit();
    } catch (err) {
      console.error("Failed to update message:", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const ok = await deleteConnectMessage(msgId);
      if (ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                            ACTIVE TARGET TITLE                             */
  /* -------------------------------------------------------------------------- */

  const activeHeaderDetails = useMemo(() => {
    if (!activeTarget) return null;

    if (activeTarget.type === "channel") {
      const ch = channels.find((c) => c.id === activeTarget.id) || (activeTarget.item as Channel);
      return {
        title: `#${ch?.name || "channel"}`,
        subtitle: ch?.description || "Public/Private Channel for team discussions",
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

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] p-0 md:p-3 lg:p-6 bg-gray-50/60 font-sans">
      <div className="w-full max-w-7xl mx-auto flex bg-white md:rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
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

        {/* Right Message Area (Tithi's Message Area Component) */}
        <div
          className={`flex-1 flex-col bg-white overflow-hidden ${
            showMobileChat ? "flex" : "hidden md:flex"
          }`}
        >
          {activeHeaderDetails ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="p-1.5 -ml-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg md:hidden"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        activeHeaderDetails.type === "channel"
                          ? activeHeaderDetails.isPrivate
                            ? "bg-amber-50 text-amber-600"
                            : "bg-blue-50 text-blue-600"
                          : activeHeaderDetails.type === "group"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-emerald-50 text-emerald-600"
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
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          {activeHeaderDetails.title}
                        </h3>
                        {activeHeaderDetails.type === "channel" && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              activeHeaderDetails.isPrivate
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {activeHeaderDetails.isPrivate ? "Private" : "Public"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate max-w-md">
                        {activeHeaderDetails.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  {activeHeaderDetails.type === "channel" && (
                    <button
                      onClick={() => setIsChannelMembersOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Users size={14} />
                      <span>Manage Members</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {messagesLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                    <Loader2 size={28} className="animate-spin text-blue-600" />
                    <p className="text-xs font-medium">Loading conversations...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                      {activeHeaderDetails.type === "channel" ? (
                        <Hash size={30} />
                      ) : (
                        <MessageSquare size={30} />
                      )}
                    </div>
                    <h4 className="text-base font-bold text-gray-800 mb-1">
                      Welcome to {activeHeaderDetails.title}
                    </h4>
                    <p className="text-xs text-gray-500 max-w-sm mb-4">
                      This is the very start of the conversation. Send a message below to connect with your team!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === currentUserId;
                    const isEditing = editingMessageId === msg.id;
                    const senderName =
                      msg.sender?.name || (isSelf ? "You" : `User ${msg.senderId?.slice(-4) || ""}`);
                    const time = new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`group flex items-start gap-3 transition-colors ${
                          isSelf ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                            isSelf
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {senderName.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Content Bubble */}
                        <div
                          className={`max-w-[75%] space-y-1 ${
                            isSelf ? "items-end text-right" : "items-start text-left"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 px-1">
                            <span className="font-semibold text-gray-700">{senderName}</span>
                            <span>{time}</span>
                            {msg.editedAt && <span className="text-[10px] italic">(edited)</span>}
                          </div>

                          {isEditing ? (
                            <div className="p-3 bg-white border border-blue-200 rounded-2xl shadow-md space-y-2 text-left">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full text-xs text-gray-900 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 text-xs">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-2.5 py-1 text-gray-500 hover:bg-gray-100 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="px-3 py-1 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words relative shadow-xs ${
                                isSelf
                                  ? "bg-blue-600 text-white rounded-tr-xs"
                                  : "bg-white text-gray-800 border border-gray-100 rounded-tl-xs"
                              }`}
                            >
                              {msg.content}

                              {/* Hover actions for author */}
                              {isSelf && (
                                <div className="absolute top-1 -left-16 hidden group-hover:flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-md">
                                  <button
                                    onClick={() => handleStartEdit(msg)}
                                    title="Edit Message"
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    title="Delete Message"
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-inner"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${activeHeaderDetails.title}...`}
                    disabled={sending}
                    className="flex-1 bg-transparent text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none py-1.5"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputText.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State when no conversation or channel is selected */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                <MessageSquare size={32} className="text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Connect Workspace</h3>
              <p className="text-xs text-gray-500 max-w-sm">
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
