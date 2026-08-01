"use client";

import React, { useState } from "react";
import { X, Pin, Check } from "lucide-react";
import { Note, CreateNotePayload, UpdateNotePayload } from "@/lib/api/notesApi";
import { NOTE_COLORS, hexToRgba } from "./noteStyles";

// ── Props ───────────────────────────────────────────────────────────────
interface NoteModalProps {
  isOpen: boolean;
  initialData?: Note | null;
  onClose: () => void;
  onSave: (data: CreateNotePayload | UpdateNotePayload) => void;
}

// ── Component ───────────────────────────────────────────────────────────
export function NoteModal({ isOpen, initialData, onClose, onSave }: NoteModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [color, setColor] = useState<string | null>(initialData?.color ?? null);
  const [isPinned, setIsPinned] = useState(initialData?.isPinned || false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload: CreateNotePayload = {
      title: title.trim(),
      content: content.trim(),
      color,
      isPinned,
    };
    onSave(payload);
  };

  if (!isOpen) return null;

  const divider = color ? hexToRgba(color, 0.15) : "#e2e8f0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl shadow-2xl ring-1 ring-slate-900/10 flex flex-col max-h-[92vh] overflow-hidden bg-white">
        {color && (
          <span
            className="h-1 w-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: divider }}
        >
          <h2 className="text-lg font-bold text-slate-900">
            {initialData ? "Edit note" : "New note"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Title */}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
            }}
            className={`w-full text-xl font-bold text-slate-900 bg-transparent placeholder:text-slate-400 focus:outline-none border-b pb-2 transition-colors ${
              errors.title ? "border-rose-300" : "border-slate-200 focus:border-indigo-400"
            }`}
          />
          {errors.title && <p className="-mt-3 text-xs text-rose-500">{errors.title}</p>}

          {/* Content */}
          <textarea
            rows={10}
            placeholder="Start typing..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-[15px] text-slate-700 bg-transparent focus:outline-none resize-y min-h-[220px] leading-relaxed placeholder:text-slate-400"
            style={{ fontFamily: "inherit" }}
          />

          {/* Color */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
              Color
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {NOTE_COLORS.map((c) => {
                const selected = color === c.value;
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => setColor(c.value)}
                    className={`relative w-8 h-8 rounded-full transition-all ${
                      selected
                        ? "ring-2 ring-offset-2 ring-slate-800 scale-110"
                        : "ring-1 ring-slate-900/10 hover:scale-110"
                    }`}
                    style={
                      c.value
                        ? { backgroundColor: c.value }
                        : {
                            background:
                              "linear-gradient(135deg, #fff 42%, #e2e8f0 42%, #e2e8f0 58%, #fff 58%)",
                          }
                    }
                  >
                    {selected && (
                      <Check
                        size={14}
                        className={`absolute inset-0 m-auto ${
                          c.value ? "text-white" : "text-slate-700"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pinned */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPinned((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isPinned
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200/70"
              }`}
            >
              <Pin size={15} className={isPinned ? "fill-amber-500 text-amber-500" : ""} />
              {isPinned ? "Pinned" : "Pin this note"}
            </button>
            {color && <span className="text-xs text-slate-400">Saved with a custom color accent</span>}
          </div>

          {/* Actions */}
          <div
            className="pt-4 flex items-center justify-end gap-3 border-t"
            style={{ borderColor: divider }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {initialData ? "Update note" : "Save note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
