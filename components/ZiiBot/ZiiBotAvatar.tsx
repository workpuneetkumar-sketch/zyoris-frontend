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
  message: { px: 36, rounded: "rounded-xl", ring: "ring-2 ring-blue-500/20 border border-blue-400/50" },
  panel: { px: 44, rounded: "rounded-2xl", ring: "ring-2 ring-blue-500/30 border-2 border-blue-500/60" },
  button: { px: 58, rounded: "rounded-full", ring: "ring-4 ring-blue-500/30 border-2 border-blue-600 shadow-[0_8px_25px_rgba(37,99,235,0.35)]" },
  large: { px: 80, rounded: "rounded-3xl", ring: "ring-4 ring-blue-500/25 border-2 border-blue-500/60" },
  hero: { px: 96, rounded: "rounded-3xl", ring: "ring-4 ring-blue-500/30 border-2 border-blue-600 shadow-[0_12px_32px_rgba(37,99,235,0.25)]" },
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
        className={`relative w-full h-full ${cfg.rounded} overflow-hidden bg-gradient-to-b from-blue-50/90 via-white to-sky-50/90 ${cfg.ring} transition-all duration-300 ${
          isTyping
            ? "shadow-blue-500/40 ring-4 ring-blue-500/60 scale-105"
            : "hover:shadow-lg"
        }`}
        animate={
          isTyping
            ? {
                scale: [1, 1.06, 1],
                boxShadow: [
                  "0 0 12px rgba(37, 99, 235, 0.35)",
                  "0 0 24px rgba(37, 99, 235, 0.6)",
                  "0 0 12px rgba(37, 99, 235, 0.35)",
                ],
              }
            : isIdle
            ? {
                y: [0, -2, 0],
                transition: { repeat: Infinity, duration: 3.2, ease: "easeInOut" },
              }
            : {}
        }
        transition={
          isTyping
            ? { repeat: Infinity, duration: 1.1, ease: "easeInOut" }
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
            className="w-full h-full object-contain select-none pointer-events-none p-0.5 filter drop-shadow-xs"
          />
        ) : (
          /* High-fidelity fallback if image is missing */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold shadow-inner">
            <span className="text-xs tracking-wider">ZII</span>
          </div>
        )}

        {/* Soft luminous pulse overlay while typing */}
        {isTyping && (
          <motion.div
            className="absolute inset-0 bg-blue-500/15 pointer-events-none"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}
      </motion.div>

      {/* Online indicator badge */}
      {showStatus && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm z-10 flex items-center justify-center"
          title="ZII BOT is Online"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </span>
      )}
    </div>
  );
}
