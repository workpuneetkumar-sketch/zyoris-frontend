"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export const ZII_GREETING =
  "Hi 👋 I'm ZII BOT, your Zyoris CRM Intelligence Assistant. Ask me about your leads, deals, tasks, pipelines, or CRM workflows!";

interface ZiiBotAvatarProps {
  isIdle?: boolean;
  isTyping?: boolean;
  size?: "button" | "panel" | "message" | "large" | "hero";
  className?: string;
  showStatus?: boolean;
}

const sizeConfig = {
  message: { px: 36, rounded: "rounded-xl", ring: "ring-1" },
  panel: { px: 44, rounded: "rounded-2xl", ring: "ring-2" },
  button: { px: 56, rounded: "rounded-full", ring: "ring-2" },
  large: { px: 80, rounded: "rounded-3xl", ring: "ring-4" },
  hero: { px: 96, rounded: "rounded-3xl", ring: "ring-4" },
};

export function ZiiBotAvatar({
  isIdle = true,
  isTyping = false,
  size = "button",
  className = "",
  showStatus = false,
}: ZiiBotAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const cfg = sizeConfig[size] || sizeConfig.button;

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: cfg.px, height: cfg.px }}
    >
      <motion.div
        className={`relative w-full h-full ${cfg.rounded} overflow-hidden shadow-lg transition-shadow duration-300 ${
          isTyping
            ? "shadow-blue-500/50 ring-2 ring-cyan-400"
            : "shadow-indigo-500/30 ring-1 ring-blue-400/30"
        } bg-gradient-to-br from-[#0c1427] via-[#0f172a] to-[#1e1b4b]`}
        animate={
          isTyping
            ? {
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 0 12px rgba(56, 189, 248, 0.4)",
                  "0 0 24px rgba(56, 189, 248, 0.7)",
                  "0 0 12px rgba(56, 189, 248, 0.4)",
                ],
              }
            : isIdle
            ? {
                y: [0, -3, 0],
                transition: { repeat: Infinity, duration: 3, ease: "easeInOut" },
              }
            : {}
        }
        transition={
          isTyping
            ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
            : undefined
        }
      >
        {!imageError ? (
          <Image
            src="/zii-bot-avatar.png"
            alt="ZII BOT CRM Assistant"
            width={cfg.px * 2}
            height={cfg.px * 2}
            priority={size === "button" || size === "hero"}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          /* High-fidelity fallback SVG if image is blocked or missing */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold">
            <span className="text-sm tracking-wider">ZII</span>
          </div>
        )}

        {/* Subtle neon glow overlay on typing */}
        {isTyping && (
          <motion.div
            className="absolute inset-0 bg-cyan-400/10 pointer-events-none"
            animate={{ opacity: [0.1, 0.35, 0.1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}
      </motion.div>

      {/* Online indicator badge */}
      {showStatus && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-sm"
          title="ZII BOT is Online"
        >
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </span>
      )}
    </div>
  );
}
