// hooks/useConnectSocket.ts
// Real-time Socket.IO integration for Connect workspace
// Conforming to Sakshi's Day 1 & Day 2 Socket Event Contracts
// Reuses the singleton shared socket client to avoid duplicate connections.

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSharedSocket } from "@/lib/socketClient";
import {
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
  SocketMessageReadPayload,
  SocketMessageSyncPayload,
  PresenceStatus,
} from "@/types/connect";

export type SocketStatus = "connected" | "connecting" | "offline";

interface UseConnectSocketOptions {
  activeChannelId?: string | null;
  activeChannelName?: string | null;
  activeConversationId?: string | null;
  // Day 1
  onNewMessage?: (payload: SocketMessageNewPayload) => void;
  onUpdateMessage?: (payload: SocketMessageUpdatePayload) => void;
  onDeleteMessage?: (payload: SocketMessageDeletePayload) => void;
  onChannelUpdated?: (payload: SocketChannelUpdatedPayload) => void;
  onConversationUpdated?: (payload: SocketConversationUpdatedPayload) => void;
  // Day 2
  onReactionAdd?: (payload: SocketReactionAddPayload) => void;
  onReactionRemove?: (payload: SocketReactionRemovePayload) => void;
  onThreadReply?: (payload: SocketThreadReplyPayload) => void;
  onTypingStart?: (payload: SocketTypingEventPayload) => void;
  onTypingStop?: (payload: SocketTypingEventPayload) => void;
  onPresenceUpdate?: (payload: SocketPresenceUpdatePayload) => void;
  onMessageRead?: (payload: SocketMessageReadPayload) => void;
  onMessageSync?: (payload: SocketMessageSyncPayload) => void;
}

export function useConnectSocket({
  activeChannelId,
  activeChannelName,
  activeConversationId,
  onNewMessage,
  onUpdateMessage,
  onDeleteMessage,
  onChannelUpdated,
  onConversationUpdated,
  onReactionAdd,
  onReactionRemove,
  onThreadReply,
  onTypingStart,
  onTypingStop,
  onPresenceUpdate,
  onMessageRead,
  onMessageSync,
}: UseConnectSocketOptions) {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const socketRef = useRef<Socket | null>(null);

  // Keep callback refs stable to prevent socket reconnect storms
  const callbacksRef = useRef({
    onNewMessage,
    onUpdateMessage,
    onDeleteMessage,
    onChannelUpdated,
    onConversationUpdated,
    onReactionAdd,
    onReactionRemove,
    onThreadReply,
    onTypingStart,
    onTypingStop,
    onPresenceUpdate,
    onMessageRead,
    onMessageSync,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onUpdateMessage,
      onDeleteMessage,
      onChannelUpdated,
      onConversationUpdated,
      onReactionAdd,
      onReactionRemove,
      onThreadReply,
      onTypingStart,
      onTypingStop,
      onPresenceUpdate,
      onMessageRead,
      onMessageSync,
    };
  }, [
    onNewMessage,
    onUpdateMessage,
    onDeleteMessage,
    onChannelUpdated,
    onConversationUpdated,
    onReactionAdd,
    onReactionRemove,
    onThreadReply,
    onTypingStart,
    onTypingStop,
    onPresenceUpdate,
    onMessageRead,
    onMessageSync,
  ]);

  // Connect socket using shared instance
  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = getSharedSocket();
    if (!socket) return;

    socketRef.current = socket;
    setStatus(socket.connected ? "connected" : "connecting");

    const handleConnect = () => {
      setStatus("connected");
      // Re-join active room if set
      if (activeChannelId) {
        socket.emit("channel:join", {
          channel: activeChannelName || activeChannelId,
          channelId: activeChannelId,
        });
      }
      if (activeConversationId) {
        socket.emit("conversation:join", { conversationId: activeConversationId });
      }
      // Trigger recovery sync since last disconnect/now
      const lastSync =
        localStorage.getItem("zyoris_last_sync") ||
        new Date(Date.now() - 3600000).toISOString();
      socket.emit("recovery:sync", { since: lastSync });
    };

    const handleDisconnect = () => {
      setStatus("offline");
      localStorage.setItem("zyoris_last_sync", new Date().toISOString());
    };

    const handleConnectError = (err: any) => {
      console.warn("Socket connect error:", err?.message);
      setStatus("offline");
    };

    // Sakshi's Event: message:new
    const handleMessageNew = (payload: any) => {
      callbacksRef.current.onNewMessage?.(payload);
    };

    // Fallback generic message
    const handleNewMessage = (payload: any) => {
      callbacksRef.current.onNewMessage?.({
        id: payload.id,
        messageId: payload.id,
        content: payload.content || payload.text,
        senderId: payload.senderId,
        channelId: payload.channelId,
        conversationId: payload.conversationId || payload.receiverId,
        createdAt: payload.createdAt || payload.timestamp,
        sender: payload.sender,
      });
    };

    // Sakshi's Event: message:update
    const handleMessageUpdate = (payload: any) => {
      callbacksRef.current.onUpdateMessage?.({
        messageId: payload.messageId || payload.id,
        channelId: payload.channelId,
        conversationId: payload.conversationId,
        content: payload.content || payload.text,
        updatedAt: payload.updatedAt || payload.editedAt,
        editedAt: payload.editedAt || payload.updatedAt,
      });
    };

    // Sakshi's Event: message:delete
    const handleMessageDelete = (payload: any) => {
      callbacksRef.current.onDeleteMessage?.({
        messageId: payload.messageId || payload.id,
        channelId: payload.channelId,
        conversationId: payload.conversationId,
      });
    };

    // Sakshi's Event: channel:updated
    const handleChannelUpdated = (payload: any) => {
      callbacksRef.current.onChannelUpdated?.(payload);
    };

    // Sakshi's Event: conversation:updated
    const handleConversationUpdated = (payload: any) => {
      callbacksRef.current.onConversationUpdated?.(payload);
    };

    // Sakshi's Day 2 Event: reaction:add
    const handleReactionAdd = (payload: any) => {
      callbacksRef.current.onReactionAdd?.(payload);
    };

    // Sakshi's Day 2 Event: reaction:remove
    const handleReactionRemove = (payload: any) => {
      callbacksRef.current.onReactionRemove?.(payload);
    };

    // Sakshi's Day 2 Event: thread:reply
    const handleThreadReply = (payload: any) => {
      callbacksRef.current.onThreadReply?.(payload);
    };

    // Sakshi's Day 2 Event: typing:start
    const handleTypingStart = (payload: any) => {
      callbacksRef.current.onTypingStart?.(payload);
    };

    // Sakshi's Day 2 Event: typing:stop
    const handleTypingStop = (payload: any) => {
      callbacksRef.current.onTypingStop?.(payload);
    };

    // Sakshi's Day 2 Event: presence:update
    const handlePresenceUpdate = (payload: any) => {
      callbacksRef.current.onPresenceUpdate?.(payload);
    };

    // Sakshi's Day 2 Event: message:read
    const handleMessageRead = (payload: any) => {
      callbacksRef.current.onMessageRead?.(payload);
    };

    // Sakshi's Day 2 Event: message:sync
    const handleMessageSync = (payload: any) => {
      callbacksRef.current.onMessageSync?.(payload);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("message:new", handleMessageNew);
    socket.on("newMessage", handleNewMessage);
    socket.on("message:update", handleMessageUpdate);
    socket.on("message:delete", handleMessageDelete);
    socket.on("channel:updated", handleChannelUpdated);
    socket.on("conversation:updated", handleConversationUpdated);
    socket.on("reaction:add", handleReactionAdd);
    socket.on("reaction:remove", handleReactionRemove);
    socket.on("thread:reply", handleThreadReply);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("message:read", handleMessageRead);
    socket.on("message:sync", handleMessageSync);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("message:new", handleMessageNew);
      socket.off("newMessage", handleNewMessage);
      socket.off("message:update", handleMessageUpdate);
      socket.off("message:delete", handleMessageDelete);
      socket.off("channel:updated", handleChannelUpdated);
      socket.off("conversation:updated", handleConversationUpdated);
      socket.off("reaction:add", handleReactionAdd);
      socket.off("reaction:remove", handleReactionRemove);
      socket.off("thread:reply", handleThreadReply);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("message:read", handleMessageRead);
      socket.off("message:sync", handleMessageSync);
      socketRef.current = null;
    };
  }, [activeChannelId, activeChannelName, activeConversationId]);

  // Manage room subscription for active channel
  const prevChannelRef = useRef<string | null>(null);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    if (prevChannelRef.current && prevChannelRef.current !== activeChannelId) {
      socket.emit("channel:leave", {
        channel: prevChannelRef.current,
        channelId: prevChannelRef.current,
      });
    }

    if (activeChannelId) {
      socket.emit("channel:join", {
        channel: activeChannelName || activeChannelId,
        channelId: activeChannelId,
      });
    }

    prevChannelRef.current = activeChannelName || activeChannelId || null;
  }, [activeChannelId, activeChannelName, status]);

  // Manage room subscription for active conversation
  const prevConversationRef = useRef<string | null>(null);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    if (prevConversationRef.current && prevConversationRef.current !== activeConversationId) {
      socket.emit("conversation:leave", { conversationId: prevConversationRef.current });
    }

    if (activeConversationId) {
      socket.emit("conversation:join", { conversationId: activeConversationId });
    }

    prevConversationRef.current = activeConversationId || null;
  }, [activeConversationId, status]);

  // Client emissions
  const emitSendMessage = useCallback(
    (payload: {
      messageId?: string;
      clientMessageId?: string;
      channelId?: string | null;
      channel?: string | null;
      conversationId?: string | null;
      receiverId?: string | null;
      content: string;
      attachments?: string[];
    }) => {
      if (socketRef.current && socketRef.current.connected) {
        const socketPayload: Record<string, any> = {
          content: payload.content,
        };
        if (payload.channel || payload.channelId) {
          socketPayload.channel = payload.channel || payload.channelId;
        }
        if (payload.receiverId || payload.conversationId) {
          socketPayload.receiverId =
            payload.receiverId || payload.conversationId;
        }
        if (payload.clientMessageId || payload.messageId) {
          socketPayload.clientMessageId =
            payload.clientMessageId || payload.messageId;
        }
        if (payload.attachments && payload.attachments.length > 0) {
          socketPayload.attachments = payload.attachments;
        }
        socketRef.current.emit("message:send", socketPayload);
      }
    },
    []
  );

  const emitThreadReply = useCallback(
    (payload: { messageId: string; content: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("thread:reply", payload);
      }
    },
    []
  );

  const emitReactionAdd = useCallback(
    (payload: { messageId: string; emoji: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("reaction:add", payload);
      }
    },
    []
  );

  const emitReactionRemove = useCallback(
    (payload: { messageId: string; emoji: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("reaction:remove", payload);
      }
    },
    []
  );

  const emitMentionNew = useCallback(
    (payload: { messageId: string; mentionedUserIds: string[] }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("mention:new", payload);
      }
    },
    []
  );

  const emitTypingStart = useCallback(
    (payload: { channel?: string; conversationId?: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("typing:start", payload);
      }
    },
    []
  );

  const emitTypingStop = useCallback(
    (payload: { channel?: string; conversationId?: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("typing:stop", payload);
      }
    },
    []
  );

  const emitPresenceUpdate = useCallback(
    (payload: { status: PresenceStatus; customStatus?: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("presence:update", payload);
      }
    },
    []
  );

  const emitMessageRead = useCallback(
    (payload: { messageId: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("message:read", payload);
      }
    },
    []
  );

  const emitRecoverySync = useCallback(
    (payload: { since: string }) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("recovery:sync", payload);
      }
    },
    []
  );

  return {
    status,
    emitSendMessage,
    emitThreadReply,
    emitReactionAdd,
    emitReactionRemove,
    emitMentionNew,
    emitTypingStart,
    emitTypingStop,
    emitPresenceUpdate,
    emitMessageRead,
    emitRecoverySync,
  };
}
