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
  message: { px: 36, rounded: "rounded-xl" },
  panel: { px: 42, rounded: "rounded-2xl" },
  button: { px: 56, rounded: "rounded-full" },
  large: { px: 80, rounded: "rounded-3xl" },
  hero: { px: 96, rounded: "rounded-3xl" },
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
        className={`relative w-full h-full ${cfg.rounded} overflow-hidden bg-white shadow-sm border border-slate-200/80 transition-shadow duration-300 ${
          isTyping
            ? "shadow-blue-500/30 ring-2 ring-blue-500/50"
            : "hover:shadow-md"
        }`}
        animate={
          isTyping
            ? {
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 0 10px rgba(59, 130, 246, 0.3)",
                  "0 0 20px rgba(59, 130, 246, 0.5)",
                  "0 0 10px rgba(59, 130, 246, 0.3)",
                ],
              }
            : isIdle
            ? {
                y: [0, -2, 0],
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
            className="w-full h-full object-contain select-none pointer-events-none p-0.5 bg-white"
          />
        ) : (
          /* High-fidelity fallback if image is missing */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold">
            <span className="text-xs tracking-wider">ZII</span>
          </div>
        )}

        {/* Soft pulse overlay while typing */}
        {isTyping && (
          <motion.div
            className="absolute inset-0 bg-blue-500/10 pointer-events-none"
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}
      </motion.div>

      {/* Online indicator badge */}
      {showStatus && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
          title="ZII BOT is Online"
        >
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </span>
      )}
    </div>
  );
}
