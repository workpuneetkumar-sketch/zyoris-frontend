"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useConnectNotifications } from "@/context/ConnectNotificationContext";
import { ConnectMessageToast } from "./ConnectMessageToast";

export function ConnectToastContainer() {
  const router = useRouter();
  const { toasts, dismissToast } = useConnectNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-[9990] flex flex-col-reverse gap-2.5 pointer-events-none max-w-[calc(100vw-2rem)] select-none"
      role="region"
      aria-live="polite"
      aria-label="Connect message notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.94,
              transition: { duration: 0.15, ease: "easeOut" },
            }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="pointer-events-auto"
          >
            <ConnectMessageToast
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
              onClick={() => {
                dismissToast(toast.id);
                if (toast.channelId) {
                  router.push(
                    `/messages?channelId=${encodeURIComponent(toast.channelId)}`
                  );
                } else if (toast.conversationId) {
                  router.push(
                    `/messages?conversationId=${encodeURIComponent(
                      toast.conversationId
                    )}`
                  );
                } else {
                  router.push("/messages");
                }
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
