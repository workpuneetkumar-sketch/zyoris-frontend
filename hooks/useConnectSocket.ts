// hooks/useConnectSocket.ts
// Real-time Socket.IO integration for Connect workspace
// Conforming to Sakshi's Day 1 Socket Event Contracts

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getEffectiveAuthToken } from "@/lib/api/api";
import {
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
} from "@/types/connect";

export type SocketStatus = "connected" | "connecting" | "offline";

interface UseConnectSocketOptions {
  activeChannelId?: string | null;
  activeChannelName?: string | null;
  activeConversationId?: string | null;
  onNewMessage?: (payload: SocketMessageNewPayload) => void;
  onUpdateMessage?: (payload: SocketMessageUpdatePayload) => void;
  onDeleteMessage?: (payload: SocketMessageDeletePayload) => void;
  onChannelUpdated?: (payload: SocketChannelUpdatedPayload) => void;
  onConversationUpdated?: (payload: SocketConversationUpdatedPayload) => void;
  onChannelRead?: (payload: SocketChannelReadPayload) => void;
  onConversationRead?: (payload: SocketConversationReadPayload) => void;
  onMessageRead?: (payload: SocketMessageReadPayload) => void;
  onReaction?: (payload: SocketReactionPayload) => void;
  onPinUpdated?: (payload: SocketPinPayload) => void;
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
  onChannelRead,
  onConversationRead,
  onMessageRead,
  onReaction,
  onPinUpdated,
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
    onChannelRead,
    onConversationRead,
    onMessageRead,
    onReaction,
    onPinUpdated,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onUpdateMessage,
      onDeleteMessage,
      onChannelUpdated,
      onConversationUpdated,
      onChannelRead,
      onConversationRead,
      onMessageRead,
      onReaction,
      onPinUpdated,
    };
  }, [
    onNewMessage,
    onUpdateMessage,
    onDeleteMessage,
    onChannelUpdated,
    onConversationUpdated,
    onChannelRead,
    onConversationRead,
    onMessageRead,
    onReaction,
    onPinUpdated,
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
    });

    socket.on("disconnect", () => {
      setStatus("offline");
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
      setStatus("offline");
    });

    // Sakshi's Event 2: message:new
    socket.on("message:new", (payload: any) => {
      callbacksRef.current.onNewMessage?.(payload);
    });

    // Also support fallback generic message events if emitted by other microservices
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

    // Sakshi's Event 3: message:update
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

    // Sakshi's Event 4: message:delete
    socket.on("message:delete", (payload: any) => {
      callbacksRef.current.onDeleteMessage?.({
        messageId: payload.messageId || payload.id,
        channelId: payload.channelId,
        conversationId: payload.conversationId,
      });
    });

    // Sakshi's Event 9: channel:updated
    socket.on("channel:updated", (payload: any) => {
      callbacksRef.current.onChannelUpdated?.(payload);
    });

    // Sakshi's Event 10: conversation:updated
    socket.on("conversation:updated", (payload: any) => {
      callbacksRef.current.onConversationUpdated?.(payload);
    });

    // Sakshi's Live Read Events
    socket.on("channel:read", (payload: any) => {
      callbacksRef.current.onChannelRead?.(payload);
    });

    socket.on("conversation:read", (payload: any) => {
      callbacksRef.current.onConversationRead?.(payload);
    });

    socket.on("message:read", (payload: any) => {
      callbacksRef.current.onMessageRead?.(payload);
    });

    // Sakshi's Live Message Reaction Events
    socket.on("message:reaction", (payload: any) => {
      callbacksRef.current.onReaction?.(payload);
    });

    socket.on("reaction:add", (payload: any) => {
      callbacksRef.current.onReaction?.({ ...payload, action: "add" });
    });

    socket.on("reaction:remove", (payload: any) => {
      callbacksRef.current.onReaction?.({ ...payload, action: "remove" });
    });

    // Sakshi's Live Pin / Unpin Events
    socket.on("message:pinned", (payload: any) => {
      callbacksRef.current.onPinUpdated?.({ ...payload, isPinned: true });
    });

    socket.on("message:unpinned", (payload: any) => {
      callbacksRef.current.onPinUpdated?.({ ...payload, isPinned: false });
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

  // Client emission: message:send
  const emitSendMessage = useCallback((payload: {
    messageId?: string;
    clientMessageId?: string;
    channelId?: string | null;
    channel?: string | null;
    conversationId?: string | null;
    receiverId?: string | null;
    content: string;
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
      socketRef.current.emit("message:send", socketPayload);
    }
  }, []);

  return {
    status,
    emitSendMessage,
  };
}

