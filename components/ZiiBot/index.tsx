"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { ZiiBotPanel } from "./ZiiBotPanel";
import { useZiiBotChat } from "./useZiiBotChat";
import { useAuth } from "@/context/AuthContext";

const DOCK_STORAGE_KEY = "ziibot-dock-mode";
const THEME_STORAGE_KEY = "ziibot-theme-dark";

export function ZiiBot() {
  const pathname = usePathname();
  const { isAuthenticated, sessionStatus } = useAuth();

  const [panelOpen, setPanelOpen] = useState(false);
  const [dockMode, setDockMode] = useState<"side" | "bottom">("side");
  // Chatbot-only independent theme (default to dark mode like Resend)
  const [isDark, setIsDark] = useState<boolean>(true);

  const chat = useZiiBotChat();

  // Load persisted chatbot-only settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedDock = localStorage.getItem(DOCK_STORAGE_KEY);
      if (savedDock === "side" || savedDock === "bottom") {
        setDockMode(savedDock);
      }
      const savedDark = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedDark !== null) {
        setIsDark(savedDark === "true");
      }
    } catch {}
  }, []);

  // Toggle ONLY chatbot dark/light mode (never touches the website's global theme)
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleDock = useCallback(() => {
    setDockMode((prev) => {
      const next = prev === "side" ? "bottom" : "side";
      try {
        localStorage.setItem(DOCK_STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

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
      if (detail?.seedMessage) {
        setTimeout(() => {
          chat.sendMessage(detail.seedMessage);
        }, 150);
      }
    };
    window.addEventListener("zii:open-with-context", handleOpenWithContext);
    return () => window.removeEventListener("zii:open-with-context", handleOpenWithContext);
  }, [chat]);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelOpen) {
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen]);

  const openWithPrompt = useCallback(
    (promptText: string) => {
      setPanelOpen(true);
      setTimeout(() => {
        chat.sendMessage(promptText);
      }, 150);
    },
    [chat]
  );

  // Requirement: "the ask anything should be after login n from the dashboard it should be visible"
  // Hide completely when user is not authenticated or session is checking
  if (sessionStatus === "checking" || !isAuthenticated) {
    return null;
  }

  // Also hide on explicit unauthenticated auth routes
  if (
    pathname === "/login" ||
    pathname?.startsWith("/login") ||
    pathname === "/admin/login" ||
    pathname?.startsWith("/admin/login") ||
    pathname === "/register" ||
    pathname?.startsWith("/register") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return null;
  }

  return (
    <>
      {/* ── Main Resend-Style Assistant Panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <ZiiBotPanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            dockMode={dockMode}
            onToggleDock={toggleDock}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            chat={chat}
          />
        )}
      </AnimatePresence>

      {/* ── Resend Minimal Bottom Trigger Bar ── */}
      <div
        className={`fixed z-40 transition-all duration-200 select-none ${
          panelOpen && dockMode === "bottom"
            ? "bottom-2 right-4"
            : "bottom-4 right-4"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-1.5 p-1 rounded-full backdrop-blur-md transition-colors ${
            isDark
              ? "bg-zinc-950/90 border border-zinc-800 text-zinc-300 shadow-xl"
              : "bg-white/95 border border-zinc-200 text-zinc-700 shadow-lg"
          }`}
        >
          {/* Quick prompt trigger pill (shown when closed) */}
          {!panelOpen && (
            <button
              type="button"
              onClick={() => openWithPrompt("What can you do for me across the OS?")}
              className={`px-3 py-1 rounded-full text-xs transition-colors truncate max-w-[170px] ${
                isDark
                  ? "text-zinc-400 hover:text-white hover:bg-zinc-900/80"
                  : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
              }`}
            >
              what can you do for me
            </button>
          )}

          {/* Primary Trigger: + Ask anything */}
          <button
            type="button"
            data-tour="ziibot-button"
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-label={panelOpen ? "Close Ask anything" : "Ask anything"}
            title="Ask anything"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              panelOpen
                ? isDark
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "bg-zinc-900 text-white hover:bg-black"
                : isDark
                ? "text-zinc-200 hover:text-white hover:bg-zinc-900"
                : "text-zinc-800 hover:text-black hover:bg-zinc-100"
            }`}
          >
            <Plus size={13} className={panelOpen ? "rotate-45 transition-transform" : "transition-transform"} />
            <span>Ask anything</span>
          </button>
        </motion.div>
      </div>
    </>
  );
}
