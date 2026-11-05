// lib/socketClient.ts
// Single shared Socket.IO client instance for Zyoris frontend
// Ensures all subsystems (useNotifications, useConnectSocket, ConnectNotificationContext)
// share a single authenticated connection without opening multiple sockets.

import { io, Socket } from "socket.io-client";
import { getEffectiveAuthToken } from "@/lib/api/api";

let sharedSocket: Socket | null = null;
let currentToken: string | null = null;

export function getSharedSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://zyoris.onrender.com").replace(/\/+$/, "");
  const token = getEffectiveAuthToken();

  if (!token) {
    if (sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
      currentToken = null;
    }
    return null;
  }

  // If token changed, reconnect with new token
  if (sharedSocket && currentToken !== token) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  if (!sharedSocket) {
    currentToken = token;
    sharedSocket = io(backendUrl, {
      auth: (callback) => {
        callback({ token: getEffectiveAuthToken() || token });
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: 10,
      timeout: 10000,
    });
  } else if (sharedSocket.disconnected) {
    sharedSocket.connect();
  }

  return sharedSocket;
}

export function disconnectSharedSocket(): void {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    currentToken = null;
  }
}
