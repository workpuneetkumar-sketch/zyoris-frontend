"use client";

import React, { useState, useRef, useEffect } from "react";
import { Circle, ChevronDown, Check } from "lucide-react";
import { PresenceStatus } from "@/types/connect";

interface PresenceSelectorProps {
  currentStatus: PresenceStatus;
  onChangeStatus: (status: PresenceStatus, customStatus?: string) => void;
  className?: string;
}

const STATUS_CONFIG: Record<PresenceStatus, { label: string; color: string; dotClass: string }> = {
  ONLINE: { label: "Online", color: "text-emerald-500", dotClass: "bg-emerald-500 shadow-emerald-500/50" },
  AWAY: { label: "Away", color: "text-amber-500", dotClass: "bg-amber-500" },
  BUSY: { label: "Do Not Disturb", color: "text-rose-500", dotClass: "bg-rose-500" },
  OFFLINE: { label: "Offline", color: "text-gray-400", dotClass: "bg-gray-400" },
};

export default function PresenceSelector({
  currentStatus,
  onChangeStatus,
  className = "",
}: PresenceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.ONLINE;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors text-xs font-medium"
        title="Change your presence status"
      >
        <span className={`w-2 h-2 rounded-full shadow-xs ${activeConfig.dotClass}`} />
        <span className="truncate max-w-[80px]">{activeConfig.label}</span>
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-1 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border-light mb-0.5">
            Set Presence
          </div>
          {(Object.keys(STATUS_CONFIG) as PresenceStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const isSelected = currentStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onChangeStatus(status);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isSelected ? "bg-primary/10 text-primary font-semibold" : "text-text hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                  <span>{cfg.label}</span>
                </div>
                {isSelected && <Check size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
