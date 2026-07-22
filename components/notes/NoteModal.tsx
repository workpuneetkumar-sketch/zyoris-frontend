"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Note, CreateNotePayload, UpdateNotePayload } from "@/lib/api/notesApi";

// ── Topics for quick selection ──────────────────────────────────────
const TOPICS = [
  "Project Planning",
  "Meeting Notes",
  "Ideas",
  "Tasks",
  "Research",
  "Learning",
  "Personal",
  "Work",
  "Other",
];

// ── Props ───────────────────────────────────────────────────────────
interface NoteModalProps {
  isOpen: boolean;
  initialData?: Note | null;
  onClose: () => void;
  onSave: (data: CreateNotePayload | UpdateNotePayload) => void;
}

// ── Format date for input[type=date] ────────────────────────────────
const toDateInputValue = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
};

// ── Component ───────────────────────────────────────────────────────
export function NoteModal({ isOpen, initialData, onClose, onSave }: NoteModalProps) {
  const [date, setDate] = useState(() =>
    initialData ? toDateInputValue(initialData.date) : new Date().toISOString().split("T")[0]
  );
  const [topic, setTopic] = useState(initialData?.topic || "");
  const [topicCustom, setTopicCustom] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = "Date is required";
    if (!topic.trim()) newErrors.topic = "Topic is required";
    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload: CreateNotePayload = {
      date,
      topic: topic.trim(),
      title: title.trim(),
      description: description.trim(),
    };
    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? "Edit Note" : "Create New Note"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: "" }));
              }}
              className={`w-full px-4 py-2.5 border ${
                errors.date ? "border-red-300 ring-2 ring-red-200" : "border-gray-200"
              } rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white`}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Topic <span className="text-red-500">*</span>
            </label>
            {!topicCustom ? (
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTopic(t);
                      if (errors.topic) setErrors((prev) => ({ ...prev, topic: "" }));
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      topic === t
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setTopicCustom(true);
                    setTopic("");
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  + Custom
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter custom topic..."
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (errors.topic) setErrors((prev) => ({ ...prev, topic: "" }));
                  }}
                  autoFocus
                  className={`flex-1 px-4 py-2.5 border ${
                    errors.topic ? "border-red-300 ring-2 ring-red-200" : "border-gray-200"
                  } rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setTopicCustom(false);
                    setTopic("");
                  }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Back
                </button>
              </div>
            )}
            {errors.topic && (
              <p className="mt-1 text-xs text-red-500">{errors.topic}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              className={`w-full px-4 py-2.5 border ${
                errors.title ? "border-red-300 ring-2 ring-red-200" : "border-gray-200"
              } rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description / Note Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={10}
              placeholder="Write your notes here..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
              }}
              className={`w-full px-4 py-3 border ${
                errors.description ? "border-red-300 ring-2 ring-red-200" : "border-gray-200"
              } rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y min-h-[200px] leading-relaxed`}
              style={{ fontFamily: "inherit" }}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              {initialData ? "Update Note" : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
