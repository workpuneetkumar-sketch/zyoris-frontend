"use client";

import React, { useEffect, useState, useRef } from "react";
import { Bold, Italic, Underline, Strikethrough, Code, Link as LinkIcon, Check, X } from "lucide-react";
import { BlockFormatting } from "@/types/workspace";

interface FormattingToolbarProps {
  formatting?: BlockFormatting;
  onApplyFormatting: (updates: Partial<BlockFormatting>) => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  formatting = {},
  onApplyFormatting,
  containerRef,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isLinkInputOpen, setIsLinkInputOpen] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>(formatting.link || "");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        if (!isLinkInputOpen) {
          setIsVisible(false);
        }
        return;
      }

      // Check if selection is within containerRef if provided
      if (containerRef && containerRef.current) {
        let node: Node | null = selection.anchorNode;
        let isInside = false;
        while (node) {
          if (node === containerRef.current) {
            isInside = true;
            break;
          }
          node = node.parentNode;
        }
        if (!isInside) {
          setIsVisible(false);
          return;
        }
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setPosition({
        top: Math.max(10, rect.top - 46),
        left: Math.max(10, rect.left + rect.width / 2 - 120),
      });
      setIsVisible(true);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef, isLinkInputOpen]);

  if (!isVisible) return null;

  const toggleStyle = (key: keyof BlockFormatting) => {
    onApplyFormatting({ [key]: !formatting[key] });
  };

  const handleSaveLink = () => {
    onApplyFormatting({ link: linkUrl.trim() || null });
    setIsLinkInputOpen(false);
  };

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="z-50 flex items-center bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700/80 px-1.5 py-1 text-xs space-x-0.5 animate-in fade-in zoom-in-95 duration-100"
    >
      {!isLinkInputOpen ? (
        <>
          <button
            type="button"
            onClick={() => toggleStyle("bold")}
            title="Bold (Ctrl+B)"
            className={`p-1.5 rounded-lg transition ${
              formatting.bold
                ? "bg-blue-600 text-white font-bold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => toggleStyle("italic")}
            title="Italic (Ctrl+I)"
            className={`p-1.5 rounded-lg transition ${
              formatting.italic
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => toggleStyle("underline")}
            title="Underline (Ctrl+U)"
            className={`p-1.5 rounded-lg transition ${
              formatting.underline
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => toggleStyle("strikethrough")}
            title="Strikethrough"
            className={`p-1.5 rounded-lg transition ${
              formatting.strikethrough
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => toggleStyle("code")}
            title="Inline Code"
            className={`p-1.5 rounded-lg transition ${
              formatting.code
                ? "bg-blue-600 text-white font-mono"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsLinkInputOpen(true)}
            title="Add Link"
            className={`p-1.5 rounded-lg transition ${
              formatting.link
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <div className="flex items-center space-x-1 p-0.5">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Paste link https://..."
            autoFocus
            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveLink();
              if (e.key === "Escape") setIsLinkInputOpen(false);
            }}
          />
          <button
            type="button"
            onClick={handleSaveLink}
            className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsLinkInputOpen(false)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
