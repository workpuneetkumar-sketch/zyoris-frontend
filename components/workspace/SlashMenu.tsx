"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Code,
  Link as LinkIcon,
  Search,
} from "lucide-react";

export interface BlockOption {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  keywords: string[];
}

export const SUPPORTED_BLOCK_TYPES: BlockOption[] = [
  {
    type: "paragraph",
    label: "Text",
    description: "Just start writing with plain text.",
    icon: Type,
    keywords: ["p", "text", "paragraph", "normal"],
  },
  {
    type: "heading_1",
    label: "Heading 1",
    description: "Big section heading.",
    icon: Heading1,
    keywords: ["h1", "heading1", "title", "header"],
  },
  {
    type: "heading_2",
    label: "Heading 2",
    description: "Medium section heading.",
    icon: Heading2,
    keywords: ["h2", "heading2", "subheading"],
  },
  {
    type: "heading_3",
    label: "Heading 3",
    description: "Small section heading.",
    icon: Heading3,
    keywords: ["h3", "heading3", "subsubheading"],
  },
  {
    type: "bulleted_list_item",
    label: "Bulleted List",
    description: "Create a simple bulleted list.",
    icon: List,
    keywords: ["bullet", "list", "bulleted", "ul"],
  },
  {
    type: "numbered_list_item",
    label: "Numbered List",
    description: "Create a numbered ordered list.",
    icon: ListOrdered,
    keywords: ["number", "numbered", "ordered", "ol"],
  },
  {
    type: "to_do",
    label: "Checklist",
    description: "Track tasks with a todo checkbox.",
    icon: CheckSquare,
    keywords: ["todo", "checkbox", "check", "task"],
  },
  {
    type: "quote",
    label: "Quote",
    description: "Capture a block quote or callout quote.",
    icon: Quote,
    keywords: ["quote", "cite", "blockquote"],
  },
  {
    type: "divider",
    label: "Divider",
    description: "Visually divide blocks with a line.",
    icon: Minus,
    keywords: ["divider", "hr", "line", "rule"],
  },
  {
    type: "code",
    label: "Code",
    description: "Display a code snippet with formatting.",
    icon: Code,
    keywords: ["code", "script", "snippet", "pre"],
  },
  {
    type: "link",
    label: "Link",
    description: "Insert a URL link reference.",
    icon: LinkIcon,
    keywords: ["link", "url", "href", "website"],
  },
];

interface SlashMenuProps {
  isOpen: boolean;
  onSelect: (blockType: string) => void;
  onClose: () => void;
  filterText?: string;
  position?: { top: number; left: number };
}

export const SlashMenu: React.FC<SlashMenuProps> = ({
  isOpen,
  onSelect,
  onClose,
  filterText = "",
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredOptions = SUPPORTED_BLOCK_TYPES.filter((opt) => {
    if (!filterText) return true;
    const query = filterText.toLowerCase();
    return (
      opt.label.toLowerCase().includes(query) ||
      opt.type.toLowerCase().includes(query) ||
      opt.keywords.some((k) => k.includes(query))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? (filteredOptions.length || 1) - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOptions[selectedIndex]) {
          onSelect(filteredOptions[selectedIndex].type);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredOptions, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={
        position
          ? {
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
            }
          : undefined
      }
      className="z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-in fade-in duration-100 max-h-80 overflow-y-auto"
    >
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span>Basic Blocks</span>
        {filterText && <span className="lowercase text-blue-500">/{filterText}</span>}
      </div>

      {filteredOptions.length > 0 ? (
        <div className="p-1 space-y-0.5">
          {filteredOptions.map((opt, idx) => {
            const Icon = opt.icon;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onSelect(opt.type)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center space-x-3 px-2.5 py-2 rounded-xl text-left transition ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div
                  className={`p-2 rounded-lg border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate leading-tight">
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-xs text-slate-400 italic">
          No matching block types found
        </div>
      )}
    </div>
  );
};
