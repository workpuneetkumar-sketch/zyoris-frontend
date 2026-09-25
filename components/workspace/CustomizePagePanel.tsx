"use client";

/**
 * FE2-01 · Customize Page
 * Slide-over panel for page appearance: icon, cover image, layout width,
 * small text, and full-width toggle.
 *
 * TODO (backend — Ayush): Confirm PATCH /workspace/pages/:id/settings endpoint.
 * Expected request:  { icon?, coverImage?, layoutWidth?, smallText?, fullWidth? }
 * Expected response: WorkspacePageSettings
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Smile,
  Image as ImageIcon,
  LayoutTemplate,
  Type,
  Maximize2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { savePageSettings } from "@/lib/api/workspaceApi";
import type { WorkspacePage, PageLayoutWidth } from "@/types/workspace";

// ── Emoji list (mirrors WorkspacePageView) ────────────────────────────────────
const EMOJI_LIST = [
  "📄","📝","🚀","💡","📊","⚡","📁","🧠","🔍","🎯","📌","✨","🛠️","⚙️","🌟",
  "🏆","📅","🔒","🌐","💬","📣","🎨","🧩","🔖","📬","📈","🗂️","🤝","🧪","🎯",
];

// ── Cover image presets (mirrors WorkspacePageView) ───────────────────────────
const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface CustomizePagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  page: WorkspacePage;
  /** Called after a successful save so the parent can re-render with new values */
  onSaved: (updated: {
    icon?: string | null;
    coverImage?: string | null;
    layoutWidth?: PageLayoutWidth;
    smallText?: boolean;
  }) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const CustomizePagePanel: React.FC<CustomizePagePanelProps> = ({
  isOpen,
  onClose,
  page,
  onSaved,
}) => {
  const [mounted, setMounted] = useState(false);

  // Local draft state — only persisted on "Save"
  const [icon, setIcon] = useState<string>(page.icon ?? "📄");
  const [coverImage, setCoverImage] = useState<string | null>(page.coverImage ?? null);
  const [layoutWidth, setLayoutWidth] = useState<PageLayoutWidth>(
    page.layoutWidth ?? "default"
  );
  const [smallText, setSmallText] = useState<boolean>(page.smallText ?? false);

  // Track unsaved changes
  const isDirty =
    icon !== (page.icon ?? "📄") ||
    coverImage !== (page.coverImage ?? null) ||
    layoutWidth !== (page.layoutWidth ?? "default") ||
    smallText !== (page.smallText ?? false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // Reset draft when panel opens with latest page values
  useEffect(() => {
    if (isOpen) {
      setIcon(page.icon ?? "📄");
      setCoverImage(page.coverImage ?? null);
      setLayoutWidth(page.layoutWidth ?? "default");
      setSmallText(page.smallText ?? false);
      setSaveStatus("idle");
      setSaveError(null);
    }
  }, [isOpen, page]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key and outside click close (with unsaved-changes guard)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Discard them and close?")) return;
    }
    onClose();
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      await savePageSettings(page.id, {
        icon,
        coverImage,
        layoutWidth,
        smallText,
      });
      setSaveStatus("saved");
      onSaved({ icon, coverImage, layoutWidth, smallText });
      // Auto-close after brief confirmation
      setTimeout(onClose, 900);
    } catch (err: any) {
      setSaveStatus("error");
      setSaveError(
        err?.response?.data?.message ?? err?.message ?? "Failed to save settings."
      );
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customize Page"
        className="fixed right-0 top-0 h-full z-[9999] w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <LayoutTemplate className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Customize Page
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close customize panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

          {/* ── Icon ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Smile className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Page Icon
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 text-lg flex items-center justify-center rounded-xl border transition ${
                    icon === emoji
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/60 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  aria-label={`Set icon to ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIcon("📄")}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2"
            >
              Reset to default
            </button>
          </section>

          {/* ── Cover Image ───────────────────────────────────── */}
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cover Image
              </h3>
            </div>

            {/* Current cover preview */}
            {coverImage && (
              <div className="relative mb-3 rounded-xl overflow-hidden h-24 border border-slate-200 dark:border-slate-700">
                <img
                  src={coverImage}
                  alt="Current cover"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 px-2 py-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold backdrop-blur-sm transition"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {COVER_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCoverImage(preset)}
                  className={`h-16 rounded-xl overflow-hidden border-2 transition ${
                    coverImage === preset
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                  aria-label={`Cover preset ${idx + 1}`}
                >
                  <img
                    src={preset}
                    alt={`Preset ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </section>

          {/* ── Layout Width ──────────────────────────────────── */}
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Layout Width
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["default", "full"] as PageLayoutWidth[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setLayoutWidth(w)}
                  className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs font-semibold transition ${
                    layoutWidth === w
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-base mb-1">
                    {w === "default" ? "◻" : "⬜"}
                  </span>
                  <span>{w === "default" ? "Default" : "Full Width"}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Text Size ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center space-x-2 mb-3">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Text Size
              </h3>
            </div>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Small Text
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Reduce font size across the page body
                </p>
              </div>
              <div
                role="switch"
                aria-checked={smallText}
                onClick={() => setSmallText((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  smallText ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    smallText ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </label>
          </section>

          {/* ── Future-safe settings placeholder ─────────────── */}
          <section className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 text-slate-400">
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">More settings coming soon</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {saveStatus === "error" && saveError && (
            <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {saveStatus === "saved" && (
            <div className="flex items-center space-x-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Settings saved!</span>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saveStatus === "saving"}
              className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saveStatus === "saving"}
              className="flex-1 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
