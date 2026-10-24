"use client";

import React, { useEffect, useState } from "react";
import { AtSign, User } from "lucide-react";

export interface MentionMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
}

interface MentionAutocompleteProps {
  isOpen: boolean;
  query: string;
  members: MentionMember[];
  onSelect: (member: MentionMember) => void;
  onClose: () => void;
  className?: string;
}

export default function MentionAutocomplete({
  isOpen,
  query,
  members,
  onSelect,
  onClose,
  className = "",
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cleanQuery = query.toLowerCase().trim();
  const filtered = members
    .filter((m) =>
      m.name.toLowerCase().includes(cleanQuery) ||
      (m.email && m.email.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 6);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered.length > 0) {
          e.preventDefault();
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div
      className={`absolute bottom-full mb-2 left-4 z-50 w-72 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 ${className}`}
    >
      <div className="px-3 py-1.5 bg-surface-hover border-b border-border-light flex items-center justify-between text-[11px] font-semibold text-text-muted">
        <span className="flex items-center gap-1.5">
          <AtSign size={12} className="text-primary" />
          Mention Teammate
        </span>
        <span className="text-[10px] opacity-75">↑↓ Navigate • ↵ Select</span>
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-border-light p-1">
        {filtered.map((member, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={member.id}
              onClick={() => onSelect(member)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`px-3 py-2 flex items-center gap-2.5 rounded-xl cursor-pointer transition-colors ${
                isSelected
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-text hover:bg-surface-hover"
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{member.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs truncate font-medium">{member.name}</p>
                  {member.role && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted font-normal">
                      {member.role}
                    </span>
                  )}
                </div>
                {member.email && (
                  <p className="text-[10px] text-text-muted truncate">{member.email}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
