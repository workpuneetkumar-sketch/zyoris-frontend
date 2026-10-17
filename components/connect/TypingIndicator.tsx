"use client";

import React from "react";
import { TypingIndicatorInfo } from "@/types/connect";

interface TypingIndicatorProps {
  typingUsers: TypingIndicatorInfo[];
  currentUserId?: string | null;
  className?: string;
}

export default function TypingIndicator({
  typingUsers,
  currentUserId,
  className = "",
}: TypingIndicatorProps) {
  // Filter out self
  const others = typingUsers.filter((u) => u.userId !== currentUserId);

  if (others.length === 0) return null;

  let text = "";
  if (others.length === 1) {
    text = `${others[0].userName || "Someone"} is typing`;
  } else if (others.length === 2) {
    text = `${others[0].userName || "Someone"} and ${others[1].userName || "Someone"} are typing`;
  } else {
    text = "Several people are typing";
  }

  return (
    <div
      id="live-typing-indicator"
      className={`px-4 py-1 flex items-center gap-2 text-xs text-text-muted transition-all duration-200 animate-in fade-in ${className}`}
    >
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
      </div>
      <span className="font-medium italic text-[11px] text-text-secondary">{text}...</span>
    </div>
  );
}
