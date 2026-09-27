"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, FileText, Database, ChevronDown } from "lucide-react";

interface CreateMenuProps {
  onOpenCreatePageModal: (parentId?: string | null) => void;
}

interface DropdownCoords {
  top?: number;
  bottom?: number;
  right?: number;
  left?: number;
}

export const CreateMenu: React.FC<CreateMenuProps> = ({ onOpenCreatePageModal }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [coords, setCoords] = useState<DropdownCoords>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuHeight = dropdownRef.current?.offsetHeight || 136;
    const menuWidth = dropdownRef.current?.offsetWidth || 224;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    const margin = 8;
    const viewportPadding = 12;

    let top: number | undefined;
    let bottom: number | undefined;

    // Viewport-aware vertical positioning:
    // If not enough space below AND more space above, open above the button
    if (spaceBelow < menuHeight + margin && spaceAbove > spaceBelow) {
      bottom = viewportHeight - buttonRect.top + margin;
      // If it would overflow top of viewport, clamp to viewportPadding
      if (viewportHeight - bottom - menuHeight < viewportPadding) {
        bottom = undefined;
        top = viewportPadding;
      }
    } else {
      top = buttonRect.bottom + margin;
      // If it would overflow bottom of viewport, clamp to viewportPadding from bottom
      if (top + menuHeight > viewportHeight - viewportPadding) {
        top = Math.max(viewportPadding, viewportHeight - menuHeight - viewportPadding);
      }
    }

    // Viewport-aware horizontal positioning:
    // Default: align right edge with right edge of button
    let right = viewportWidth - buttonRect.right;
    if (right < viewportPadding) {
      right = viewportPadding;
    } else if (viewportWidth - right - menuWidth < viewportPadding) {
      right = viewportWidth - menuWidth - viewportPadding;
    }

    setCoords({ top, bottom, right });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const frameId = requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition"
      >
        <Plus className="w-4 h-4" />
        <span>Create</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              right: coords.right !== undefined ? `${coords.right}px` : undefined,
              zIndex: 9999,
            }}
            className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 animate-in fade-in duration-150"
          >
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Universal Create
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCreatePageModal(null);
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition"
            >
              <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Page</div>
                <div className="text-[10px] text-slate-400">Document or note page</div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCreatePageModal(null);
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition"
            >
              <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Database</div>
                <div className="text-[10px] text-slate-400">Structured data view</div>
              </div>
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
