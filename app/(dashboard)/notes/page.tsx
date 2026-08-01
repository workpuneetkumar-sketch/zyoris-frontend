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
  Pin,
  Clock,
  Calendar,
  Inbox,
} from "lucide-react";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
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

const timeAgo = (dateString: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateString);
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
);

const STICKY_SKELETONS = ["h-32", "h-44", "h-36", "h-52", "h-32", "h-40", "h-48", "h-36"];

/* ── Note Card ────────────────────────────────────────────────────────── */
function NoteCard({
  note,
  onView,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: Note;
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
}) {
  return (
    <article
      onClick={() => onView(note)}
      className="group relative break-inside-avoid mb-4 rounded-lg border border-slate-200 bg-white p-4 cursor-pointer transition-all duration-200 hover:border-slate-300 hover:shadow-md"
    >
      {note.color && (
        <span
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-lg"
          style={{ backgroundColor: note.color }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">
          {note.title || "Untitled note"}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note);
          }}
          title={note.isPinned ? "Unpin" : "Pin"}
          className={`shrink-0 p-1.5 rounded-md transition-all ${
            note.isPinned
              ? "text-amber-500 bg-amber-50"
              : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-50"
          }`}
        >
          <Pin size={14} className={note.isPinned ? "fill-amber-500 text-amber-500" : ""} />
        </button>
      </div>

      {note.content && (
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {note.content}
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          <Clock size={11} />
          Updated {timeAgo(note.updatedAt)}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(note);
            }}
            title="Edit"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note);
            }}
            title="Delete"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Page Component ──────────────────────────────────────────────────── */
export default function NotesPage() {
  // Data
  const [notes, setNotes] = useState<Note[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
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
    window.setTimeout(() => setToast(null), 4000);
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

  /* ── Filter & Search ──────────────────────────────────────────────── */
  const displayedNotes = useMemo(() => {
    let filtered = [...notes];

    // Date filter (based on updatedAt since the backend has no separate date field)
    if (dateFilter !== "ALL") {
      const now = Date.now();
      filtered = filtered.filter((n) => {
        const noteDate = new Date(n.updatedAt).getTime();
        if (dateFilter === "TODAY") {
          return new Date(n.updatedAt).toDateString() === new Date().toDateString();
        }
        if (dateFilter === "7D") return now - noteDate <= 7 * 24 * 60 * 60 * 1000;
        if (dateFilter === "30D") return now - noteDate <= 30 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }

    // Pinned notes first, then by most recently updated
    return filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, searchQuery, dateFilter]);

  const pinnedNotes = useMemo(() => displayedNotes.filter((n) => n.isPinned), [displayedNotes]);
  const otherNotes = useMemo(() => displayedNotes.filter((n) => !n.isPinned), [displayedNotes]);

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

  const handleTogglePin = async (note: Note) => {
    try {
      const updated = await updateNote(note.id, { isPinned: !note.isPinned });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
      showToast("success", updated.isPinned ? "Note pinned" : "Note unpinned");
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

  /* ── Inject animation CSS ────────────────────────────────────────── */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .animate-toast-in { animation: toastIn 0.3s ease-out; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const openNewNote = () => {
    setEditingNote(null);
    setShowNoteModal(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setShowNoteModal(true);
  };

  const openDeleteConfirm = (note: Note) => {
    setDeletingNoteId(note.id);
    setShowDeleteModal(true);
  };

  const pinnedCount = notes.filter((n) => n.isPinned).length;

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-toast-in ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <StickyNote size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Notes</h1>
                <p className="text-sm text-slate-500">
                  {notes.length} note{notes.length === 1 ? "" : "s"}
                  {pinnedCount > 0 ? ` · ${pinnedCount} pinned` : ""}
                </p>
              </div>
            </div>

            <button
              onClick={openNewNote}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              New Note
            </button>
          </div>
        </div>
      </header>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="ALL">All time</option>
            <option value="TODAY">Today</option>
            <option value="7D">Last 7 days</option>
            <option value="30D">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* ── Notes content ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {STICKY_SKELETONS.map((h, i) => (
              <Skeleton key={i} className={`${h} w-full mb-4 break-inside-avoid`} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-50 text-rose-500 rounded-full ring-1 ring-rose-100 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Something went wrong</h3>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button
              onClick={loadNotes}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Loader2 size={16} />
              Try again
            </button>
          </div>
        ) : notes.length === 0 ? (
          /* Empty State — No notes at all */
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 text-indigo-500 rounded-xl ring-1 ring-indigo-100 mb-4">
              <StickyNote className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No notes yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Create your first note to capture ideas and to-dos.
            </p>
            <button
              onClick={openNewNote}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              Create your first note
            </button>
          </div>
        ) : displayedNotes.length === 0 ? (
          /* Empty State — No results */
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 text-slate-400 rounded-full ring-1 ring-slate-200 mb-4">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No matching notes</h3>
            <p className="text-sm text-slate-500 mb-6">
              Try a different search term, or clear your filters to see everything.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFilter("ALL");
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <X size={15} />
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Pin size={13} className="text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-700">Pinned</h2>
                  <span className="text-xs text-slate-400">{pinnedNotes.length}</span>
                  <div className="flex-1 h-px bg-slate-200 ml-1" />
                </div>
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onView={(n) => {
                        setViewingNote(n);
                        setShowViewModal(true);
                      }}
                      onEdit={openEditNote}
                      onDelete={openDeleteConfirm}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other notes section */}
            {otherNotes.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    {pinnedNotes.length > 0 ? "Others" : "Notes"}
                  </h2>
                  <span className="text-xs text-slate-400">{otherNotes.length}</span>
                  <div className="flex-1 h-px bg-slate-200 ml-1" />
                </div>
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onView={(n) => {
                        setViewingNote(n);
                        setShowViewModal(true);
                      }}
                      onEdit={openEditNote}
                      onDelete={openDeleteConfirm}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── Note Modal (Create / Edit) ──────────────────────────────── */}
      {showNoteModal && (
        <NoteModal
          key={editingNote?.id ?? "new"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/10 overflow-hidden max-h-[90vh] flex flex-col">
            {viewingNote.color && (
              <span
                className="h-1 w-full shrink-0"
                style={{ backgroundColor: viewingNote.color }}
              />
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {viewingNote.title}
                </h2>
                {viewingNote.isPinned && (
                  <Pin size={15} className="fill-amber-500 text-amber-500 shrink-0" />
                )}
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingNote(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Meta */}
            <div className="px-6 py-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 border-b border-slate-100">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                Created {formatDate(viewingNote.createdAt)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                Updated {timeAgo(viewingNote.updatedAt)}
              </span>
              {viewingNote.color && (
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: viewingNote.color }}
                  />
                  {viewingNote.color}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-5 flex-1 overflow-y-auto">
              <div className="whitespace-pre-wrap text-[15px] text-slate-700 leading-relaxed">
                {viewingNote.content || (
                  <span className="text-slate-400 italic">No content</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditNote(viewingNote);
                }}
                className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Edit size={14} className="inline mr-1.5" />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingNote(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────── */}
      {showDeleteModal && deletingNoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl ring-1 ring-slate-900/5">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete this note?</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500 ml-11">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingNoteId(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNote}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
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
