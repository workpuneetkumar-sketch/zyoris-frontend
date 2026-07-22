"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  StickyNote,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Tag,
  Clock,
  FileEdit,
} from "lucide-react";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  Note,
  CreateNotePayload,
  UpdateNotePayload,
} from "@/lib/api/notesApi";
import { NoteModal } from "@/components/notes/NoteModal";

/* ── Helpers ──────────────────────────────────────────────────────────── */
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatDateShort = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getUniqueTopics = (notes: Note[]): string[] => {
  const topics = new Set(notes.map((n) => n.topic));
  return Array.from(topics).sort();
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/* ── Page Component ──────────────────────────────────────────────────── */
export default function NotesPage() {
  // Data
  const [notes, setNotes] = useState<Note[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");

  // Loading / Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Load data ──────────────────────────────────────────────────────── */
  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  /* ── Derived data ────────────────────────────────────────────────── */
  const uniqueTopics = useMemo(() => getUniqueTopics(notes), [notes]);

  /* ── Filter & Search ──────────────────────────────────────────────── */
  const displayedNotes = useMemo(() => {
    let filtered = [...notes];

    // Topic filter
    if (topicFilter !== "ALL") {
      filtered = filtered.filter((n) => n.topic === topicFilter);
    }

    // Date filter
    if (dateFilter !== "ALL") {
      const now = Date.now();
      filtered = filtered.filter((n) => {
        const noteDate = new Date(n.date).getTime();
        if (dateFilter === "TODAY") {
          return new Date(n.date).toDateString() === new Date().toDateString();
        }
        if (dateFilter === "7D") {
          return now - noteDate <= 7 * 24 * 60 * 60 * 1000;
        }
        if (dateFilter === "30D") {
          return now - noteDate <= 30 * 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.topic.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [notes, searchQuery, topicFilter, dateFilter]);

  /* ── Note CRUD ────────────────────────────────────────────────────── */
  const handleCreateNote = async (data: CreateNotePayload) => {
    try {
      const newNote = await createNote(data);
      setNotes((prev) => [newNote, ...prev]);
      showToast("success", "Note created successfully");
      setShowNoteModal(false);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleUpdateNote = async (id: string, data: UpdateNotePayload) => {
    try {
      const updated = await updateNote(id, data);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      showToast("success", "Note updated successfully");
      setEditingNote(null);
      setShowNoteModal(false);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNoteId) return;
    try {
      await deleteNote(deletingNoteId);
      setNotes((prev) => prev.filter((n) => n.id !== deletingNoteId));
      showToast("success", "Note deleted");
      setShowDeleteModal(false);
      setDeletingNoteId(null);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleViewNote = (note: Note) => {
    setViewingNote(note);
    setShowViewModal(true);
  };

  /* ── Inject animation CSS ────────────────────────────────────────── */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .animate-slide-in {
        animation: slideIn 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <StickyNote className="w-8 h-8 text-indigo-600" />
            </div>
            Notes
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-12">
            Capture ideas, information, and important details for future reference.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingNote(null);
            setShowNoteModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-0.5"
        >
          <Plus size={18} />
          New Note
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Notes",
            value: notes.length,
            icon: StickyNote,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Topics",
            value: uniqueTopics.length,
            icon: Tag,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Recent (7 days)",
            value: notes.filter((n) => {
              const d = new Date(n.updatedAt).getTime();
              return Date.now() - d <= 7 * 24 * 60 * 60 * 1000;
            }).length,
            icon: Clock,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: searchQuery ? "Search Results" : "Total Displayed",
            value: searchQuery ? displayedNotes.length : displayedNotes.length,
            icon: Search,
            color: "text-blue-600 bg-blue-50",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder="Search notes by title, topic, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
            />
          </div>

          {/* Topic Filter */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[140px]"
          >
            <option value="ALL">All Topics</option>
            {uniqueTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[140px]"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Notes Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadNotes}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <Loader2 size={14} />
            Try again
          </button>
        </div>
      ) : notes.length === 0 ? (
        /* Empty State — No Notes at All */
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-4 bg-indigo-50 rounded-full inline-flex mb-6">
            <StickyNote className="w-12 h-12 text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes yet</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Create your first note to save important information for future reference.
          </p>
          <button
            onClick={() => {
              setEditingNote(null);
              setShowNoteModal(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-0.5"
          >
            <Plus size={18} />
            Create Your First Note
          </button>
        </div>
      ) : displayedNotes.length === 0 ? (
        /* Empty State — No Search Results */
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No notes found</h3>
          <p className="text-gray-500 mb-6">
            Try a different search term or create a new note.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSearchQuery("");
                setTopicFilter("ALL");
                setDateFilter("ALL");
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={() => {
                setEditingNote(null);
                setShowNoteModal(true);
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} className="inline mr-1" />
              New Note
            </button>
          </div>
        </div>
      ) : (
        /* Notes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col"
            >
              {/* Card Body */}
              <div
                className="flex-1 p-5 cursor-pointer"
                onClick={() => handleViewNote(note)}
              >
                {/* Topic Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
                    <Tag size={12} />
                    {note.topic}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium border border-gray-100">
                    <Calendar size={12} />
                    {formatDateShort(note.date)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-gray-900 line-clamp-1 mb-2 group-hover:text-indigo-600 transition-colors">
                  {note.title}
                </h3>

                {/* Description Preview */}
                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                  {note.description}
                </p>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Clock size={12} />
                  Updated {formatDate(note.updatedAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewNote(note);
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="View"
                  >
                    <FileEdit size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote(note);
                      setShowNoteModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingNoteId(note.id);
                      setShowDeleteModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Note Modal (Create / Edit) ──────────────────────────────── */}
      {showNoteModal && (
        <NoteModal
          isOpen={showNoteModal}
          initialData={editingNote}
          onClose={() => {
            setShowNoteModal(false);
            setEditingNote(null);
          }}
          onSave={(data) => {
            if (editingNote) {
              handleUpdateNote(editingNote.id, data as UpdateNotePayload);
            } else {
              handleCreateNote(data as CreateNotePayload);
            }
          }}
        />
      )}

      {/* ── View Note Modal ─────────────────────────────────────────── */}
      {showViewModal && viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{viewingNote.title}</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingNote(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Meta */}
            <div className="px-6 pt-5 pb-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
                <Tag size={14} />
                {viewingNote.topic}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm font-medium border border-gray-100">
                <Calendar size={14} />
                {formatDate(viewingNote.date)}
              </span>
            </div>

            {/* Timestamps */}
            <div className="px-6 pb-4 text-xs text-gray-400">
              Created {formatDate(viewingNote.createdAt)} &middot; Updated{" "}
              {formatDate(viewingNote.updatedAt)}
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {viewingNote.description}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setEditingNote(viewingNote);
                  setShowNoteModal(true);
                }}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <Edit size={14} className="inline mr-1.5" />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingNote(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────── */}
      {showDeleteModal && deletingNoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete this note?</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 ml-11">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingNoteId(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNote}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
