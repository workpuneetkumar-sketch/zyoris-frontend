// hooks/useConnectSocket.ts
// Real-time Socket.IO integration for Connect workspace
// Conforming to Sakshi's Day 1 & Day 2 Socket Event Contracts

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getEffectiveAuthToken } from "@/lib/api/api";
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

  // Connect socket
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = getEffectiveAuthToken();
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://zyoris.onrender.com").replace(/\/+$/, "");

    setStatus("connecting");

    const socket = io(backendUrl, {
      auth: (callback) => {
        callback({ token: getEffectiveAuthToken() || token });
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
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
      const lastSync = localStorage.getItem("zyoris_last_sync") || new Date(Date.now() - 3600000).toISOString();
      socket.emit("recovery:sync", { since: lastSync });
    });

    socket.on("disconnect", () => {
      setStatus("offline");
      localStorage.setItem("zyoris_last_sync", new Date().toISOString());
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
      setStatus("offline");
    });

    // Sakshi's Event: message:new
    socket.on("message:new", (payload: any) => {
      callbacksRef.current.onNewMessage?.(payload);
    });

    // Fallback generic message
    socket.on("newMessage", (payload: any) => {
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
    });

    // Sakshi's Event: message:update
    socket.on("message:update", (payload: any) => {
      callbacksRef.current.onUpdateMessage?.({
        messageId: payload.messageId || payload.id,
        channelId: payload.channelId,
        conversationId: payload.conversationId,
        content: payload.content || payload.text,
        updatedAt: payload.updatedAt || payload.editedAt,
        editedAt: payload.editedAt || payload.updatedAt,
      });
    });

    // Sakshi's Event: message:delete
    socket.on("message:delete", (payload: any) => {
      callbacksRef.current.onDeleteMessage?.({
        messageId: payload.messageId || payload.id,
        channelId: payload.channelId,
        conversationId: payload.conversationId,
      });
    });

    // Sakshi's Event: channel:updated
    socket.on("channel:updated", (payload: any) => {
      callbacksRef.current.onChannelUpdated?.(payload);
    });

    // Sakshi's Event: conversation:updated
    socket.on("conversation:updated", (payload: any) => {
      callbacksRef.current.onConversationUpdated?.(payload);
    });

    // Sakshi's Day 2 Event: reaction:add
    socket.on("reaction:add", (payload: any) => {
      callbacksRef.current.onReactionAdd?.(payload);
    });

    // Sakshi's Day 2 Event: reaction:remove
    socket.on("reaction:remove", (payload: any) => {
      callbacksRef.current.onReactionRemove?.(payload);
    });

    // Sakshi's Day 2 Event: thread:reply
    socket.on("thread:reply", (payload: any) => {
      callbacksRef.current.onThreadReply?.(payload);
    });

    // Sakshi's Day 2 Event: typing:start
    socket.on("typing:start", (payload: any) => {
      callbacksRef.current.onTypingStart?.(payload);
    });

    // Sakshi's Day 2 Event: typing:stop
    socket.on("typing:stop", (payload: any) => {
      callbacksRef.current.onTypingStop?.(payload);
    });

    // Sakshi's Day 2 Event: presence:update
    socket.on("presence:update", (payload: any) => {
      callbacksRef.current.onPresenceUpdate?.(payload);
    });

    // Sakshi's Day 2 Event: message:read
    socket.on("message:read", (payload: any) => {
      callbacksRef.current.onMessageRead?.(payload);
    });

    // Sakshi's Day 2 Event: message:sync
    socket.on("message:sync", (payload: any) => {
      callbacksRef.current.onMessageSync?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Run on mount

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
  const emitSendMessage = useCallback((payload: {
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
        socketPayload.receiverId = payload.receiverId || payload.conversationId;
      }
      if (payload.clientMessageId || payload.messageId) {
        socketPayload.clientMessageId = payload.clientMessageId || payload.messageId;
      }
      if (payload.attachments && payload.attachments.length > 0) {
        socketPayload.attachments = payload.attachments;
      }
      socketRef.current.emit("message:send", socketPayload);
    }
  }, []);

  const emitThreadReply = useCallback((payload: { messageId: string; content: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("thread:reply", payload);
    }
  }, []);

  const emitReactionAdd = useCallback((payload: { messageId: string; emoji: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("reaction:add", payload);
    }
  }, []);

  const emitReactionRemove = useCallback((payload: { messageId: string; emoji: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("reaction:remove", payload);
    }
  }, []);

  const emitMentionNew = useCallback((payload: { messageId: string; mentionedUserIds: string[] }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("mention:new", payload);
    }
  }, []);

  const emitTypingStart = useCallback((payload: { channel?: string; conversationId?: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("typing:start", payload);
    }
  }, []);

  const emitTypingStop = useCallback((payload: { channel?: string; conversationId?: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("typing:stop", payload);
    }
  }, []);

  const emitPresenceUpdate = useCallback((payload: { status: PresenceStatus; customStatus?: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("presence:update", payload);
    }
  }, []);

  const emitMessageRead = useCallback((payload: { messageId: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("message:read", payload);
    }
  }, []);

  const emitRecoverySync = useCallback((payload: { since: string }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("recovery:sync", payload);
    }
  }, []);

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
