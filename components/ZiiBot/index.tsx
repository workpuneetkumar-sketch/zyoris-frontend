"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
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

      {/* ── Resend Exact Bottom Bar (Responsive to Dark/Light, Aligned with Sidebar) ── */}
      <footer
        className={`fixed bottom-0 left-0 md:left-[220px] right-0 h-8 z-30 border-t flex items-center justify-between px-4 text-xs font-mono select-none transition-colors duration-150 ${
          isDark
            ? "bg-[#000000] border-zinc-800 text-zinc-400"
            : "bg-gradient-to-r from-blue-50/90 via-sky-50/80 to-white/95 border-blue-200/70 text-slate-700 backdrop-blur-xs shadow-2xs"
        }`}
      >
        {/* Left: Cleared (/docs removed per design requirements) */}
        <div className="flex items-center gap-1" />

        {/* Right: what can you do for me + Ask anything */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => openWithPrompt("What can you do for me across the OS?")}
            className={`transition-colors font-sans text-xs ${
              isDark
                ? "text-zinc-400 hover:text-white"
                : "text-blue-600 hover:text-blue-800 font-medium"
            }`}
          >
            what can you do for me
          </button>

          <button
            type="button"
            data-tour="ziibot-button"
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-label={panelOpen ? "Close Ask anything" : "Ask anything"}
            title="Ask anything"
            className={`flex items-center gap-1 font-sans text-xs font-medium transition-colors ${
              panelOpen
                ? isDark
                  ? "text-white"
                  : "text-blue-900 font-semibold"
                : isDark
                ? "text-zinc-300 hover:text-white"
                : "text-blue-700 hover:text-blue-900"
            }`}
          >
            <Plus
              size={13}
              className={panelOpen ? "rotate-45 transition-transform text-blue-600" : "transition-transform text-blue-600"}
            />
            <span>Ask anything</span>
          </button>
        </div>
      </footer>
    </>
  );
}
