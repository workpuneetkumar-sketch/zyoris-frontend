"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ZiiBotAvatar } from "./ZiiBotAvatar";
import { ZiiBotPanel } from "./ZiiBotPanel";
import { useZiiBotChat } from "./useZiiBotChat";

function useDarkMode(): boolean {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const fn = () => setDark(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return dark;
}

export function ZiiBot() {
  const pathname = usePathname();
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const darkMode = useDarkMode();
  const chat = useZiiBotChat();

  // Listen for page "Use with AI" trigger
  useEffect(() => {
    const handleOpenWithContext = (e: Event) => {
      const detail = (e as CustomEvent<{
        pageId: string;
        pageTitle: string;
        contextMarkdown: string;
        seedMessage: string;
      }>).detail;
      setPanelOpen(true);
      setFullscreen(false);
      if (detail?.seedMessage) {
        setTimeout(() => {
          chat.sendMessage(detail.seedMessage);
        }, 150);
      }
    };
    window.addEventListener("zii:open-with-context", handleOpenWithContext);
    return () => window.removeEventListener("zii:open-with-context", handleOpenWithContext);
  }, [chat]);

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    setFullscreen(false);
  }, []);

  const closePanel = useCallback(() => {
    setFullscreen(false);
    setPanelOpen(false);
  }, []);

  const toggleFullscreen = useCallback(() => setFullscreen((f) => !f), []);

  // Hide chatbot on login and register routes
  if (
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/admin/login" ||
    pathname?.startsWith("/admin/login") ||
    pathname === "/register" ||
    pathname?.startsWith("/register")
  ) {
    return null;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {panelOpen && (
          <ZiiBotPanel
            key={fullscreen ? "fullscreen" : "floating"}
            isOpen={panelOpen}
            onClose={closePanel}
            isFullscreen={fullscreen}
            onToggleFullscreen={toggleFullscreen}
            chat={chat}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      {/* ── Mascot Floating Action Button (FAB) ── */}
      {!fullscreen && (
        <motion.button
          type="button"
          data-tour="ziibot-button"
          className={`zii-fab${
            pathname === "/whatsapp" || pathname?.startsWith("/whatsapp")
              ? " zii-fab--whatsapp"
              : ""
          }`}
          onClick={panelOpen ? closePanel : openPanel}
          aria-label={panelOpen ? "Close ZII BOT" : "Ask ZII BOT — CRM Intelligence"}
          title="ZII BOT — CRM Intelligence Assistant"
          initial={false}
          animate={{
            scale: 1,
            boxShadow: [
              "0 8px 32px rgba(14, 165, 233, 0.4), 0 0 0 0 rgba(14, 165, 233, 0.3)",
              "0 8px 40px rgba(14, 165, 233, 0.6), 0 0 0 14px rgba(14, 165, 233, 0)",
              "0 8px 32px rgba(14, 165, 233, 0.4), 0 0 0 0 rgba(14, 165, 233, 0.3)",
            ],
          }}
          transition={{
            boxShadow: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <ZiiBotAvatar
            isIdle={!chat.isTyping}
            isTyping={chat.isTyping}
            size="button"
            showStatus={true}
          />
        </motion.button>
      )}
    </>
  );
}
