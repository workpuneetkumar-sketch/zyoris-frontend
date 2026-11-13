"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { getSharedSocket } from "@/lib/socketClient";
import { playNotificationSound } from "@/lib/notificationSound";
import { showBrowserNotification } from "@/lib/browserPushPermission";
import { getCachedChannels } from "@/lib/api/connectApi";

export interface ConnectNotificationItem {
  id: string;
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  conversationId?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  createdAt: string;
}

export interface ActiveChatTarget {
  type: "channel" | "conversation";
  id: string;
}

interface ConnectNotificationContextType {
  toasts: ConnectNotificationItem[];
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  activeTarget: ActiveChatTarget | null;
  setActiveChatTarget: (target: ActiveChatTarget | null) => void;
  subscribeToChannels: (channels: Array<{ id: string; name?: string }>) => void;
}

const ConnectNotificationContext = createContext<
  ConnectNotificationContextType | undefined
>(undefined);

export function ConnectNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState<ConnectNotificationItem[]>([]);
  const [activeTarget, setActiveTargetState] = useState<ActiveChatTarget | null>(
    null
  );

  const activeTargetRef = useRef<ActiveChatTarget | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastSoundTime = useRef<number>(0);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  const setActiveChatTarget = useCallback(
    (target: ActiveChatTarget | null) => {
      activeTargetRef.current = target;
      setActiveTargetState(target);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAllToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const triggerSound = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTime.current > 1200) {
      lastSoundTime.current = now;
      void playNotificationSound();
    }
  }, []);

  const subscribeToChannels = useCallback(
    (channelsToJoin: Array<{ id: string; name?: string }>) => {
      const socket = getSharedSocket();
      if (!socket) return;
      channelsToJoin.forEach((ch) => {
        const key = ch.id;
        if (!subscribedChannelsRef.current.has(key)) {
          subscribedChannelsRef.current.add(key);
          socket.emit("channel:join", {
            channel: ch.name || ch.id,
            channelId: ch.id,
          });
        }
      });
    },
    []
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.id || typeof window === "undefined") return;

    const socket = getSharedSocket();
    if (!socket) return;

    const handleMessage = (payload: any) => {
      if (!payload) return;

      const senderId = payload.senderId || payload.sender?.id;
      // 1. Avoid showing notifications for messages sent by the currently authenticated user
      if (senderId && senderId === user.id) return;

      const conversationId =
        payload.conversationId || payload.receiverId || null;
      const channelId = payload.channelId || null;
      const channelName = payload.channel || null;
      const targetId = channelId || conversationId;

      // 2. Avoid unnecessary notifications when user is already viewing the target
      const currentActive = activeTargetRef.current;
      if (currentActive) {
        if (
          currentActive.type === "conversation" &&
          conversationId &&
          currentActive.id === conversationId
        ) {
          return;
        }
        if (
          currentActive.type === "channel" &&
          ((channelId && currentActive.id === channelId) ||
            (channelName && currentActive.id === channelName))
        ) {
          return;
        }
      }

      // 3. Prevent duplicate notifications using canonical message ID
      const msgId = payload.id || payload.messageId;
      if (msgId) {
        if (seenMessageIds.current.has(msgId)) return;
        seenMessageIds.current.add(msgId);
        // Bound set size to prevent memory leaks
        if (seenMessageIds.current.size > 500) {
          const oldest = seenMessageIds.current.values().next().value;
          if (oldest) seenMessageIds.current.delete(oldest);
        }
      }

      // 4. Content preview extraction
      let content = (payload.content || payload.text || "").trim();
      if (!content) {
        if (payload.attachments && payload.attachments.length > 0) {
          content = "Sent an attachment";
        } else {
          return;
        }
      }

      const senderName =
        payload.sender?.name || payload.senderName || "Colleague";
      const senderAvatar = payload.sender?.avatarUrl || null;

      // 5. Debounced notification audio chime
      triggerSound();

      // 6. Browser push notification if user has minimized or switched tab
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        const preview =
          content.length > 80 ? `${content.slice(0, 77)}...` : content;
        const title = channelName
          ? `${senderName} in #${channelName}`
          : senderName;
        showBrowserNotification(title, {
          body: preview,
          icon: senderAvatar || "/logo.jpeg",
          tag: `msg-${targetId || msgId}`,
        });
      }

      // 7. Enqueue new toast popup (Maximum 3 visible)
      const toastId = `toast-${msgId || Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const newToast: ConnectNotificationItem = {
        id: toastId,
        messageId: msgId || toastId,
        senderId: senderId || "",
        senderName,
        senderAvatar,
        content,
        conversationId,
        channelId,
        channelName,
        createdAt: payload.createdAt || new Date().toISOString(),
      };

      setToasts((prev) => {
        const next = [newToast, ...prev];
        if (next.length > 3) {
          const dropped = next.slice(3);
          dropped.forEach((d) => {
            const timer = timersRef.current.get(d.id);
            if (timer) clearTimeout(timer);
            timersRef.current.delete(d.id);
          });
          return next.slice(0, 3);
        }
        return next;
      });

      // 8. Auto-dismiss after 5 seconds
      const autoDismissTimer = setTimeout(() => {
        dismissToast(toastId);
      }, 5000);
      timersRef.current.set(toastId, autoDismissTimer);
    };

    // Auto-join cached channels on mount/login
    const cachedChannels = getCachedChannels();
    if (cachedChannels.length > 0) {
      subscribeToChannels(cachedChannels);
    }

    socket.on("message:new", handleMessage);
    socket.on("newMessage", handleMessage);

    return () => {
      socket.off("message:new", handleMessage);
      socket.off("newMessage", handleMessage);
    };
  }, [
    isAuthenticated,
    user?.id,
    dismissToast,
    triggerSound,
    subscribeToChannels,
  ]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ConnectNotificationContext.Provider
      value={{
        toasts,
        dismissToast,
        dismissAllToasts,
        activeTarget,
        setActiveChatTarget,
        subscribeToChannels,
      }}
    >
      {children}
    </ConnectNotificationContext.Provider>
  );
}

export function useConnectNotifications(): ConnectNotificationContextType {
  const context = useContext(ConnectNotificationContext);
  if (!context) {
    throw new Error(
      "useConnectNotifications must be used within a ConnectNotificationProvider"
    );
  }
  return context;
}

