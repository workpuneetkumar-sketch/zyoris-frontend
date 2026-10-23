"use client";

import React, { useEffect, useRef } from "react";
import { Smile } from "lucide-react";

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  className?: string;
}

const COMMON_EMOJIS = [
  "👍", "❤️", "😂", "🎉", "🔥", "🚀", 
  "👀", "👏", "💯", "🙌", "✨", "💡",
  "🤝", "✅", "😍", "🥳", "🤔", "😮",
  "🙏", "💪", "🎯", "🌟", "⚡", "☕",
];

export default function ReactionPicker({
  isOpen,
  onClose,
  onSelectEmoji,
  className = "",
}: ReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute z-50 p-2 bg-surface border border-border rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150 ${className}`}
      style={{ minWidth: "220px" }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[11px] font-semibold text-text-muted border-b border-border-light">
        <Smile size={13} />
        <span>Add Reaction</span>
      </div>
      <div className="grid grid-cols-6 gap-1 p-1">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-xl hover:bg-surface-hover hover:scale-125 transition-all duration-150 active:scale-95"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
