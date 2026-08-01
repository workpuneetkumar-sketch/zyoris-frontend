// lib/api/notesApi.ts

import api from "@/lib/api/api"; // your pre-configured axios instance

// ── Types ──────────────────────────────────────────────────────────────
// Matches the backend note schema:
// { id, organizationId, userId, title, content, color, isPinned, createdAt, updatedAt }
export interface Note {
  id: string;
  organizationId?: string;
  userId?: string;
  title: string;
  content: string;
  color: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  title: string;
  content: string;
  color?: string | null;
  isPinned?: boolean;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  color?: string | null;
  isPinned?: boolean;
}

const getErrorMessage = (error: any, fallback: string): string =>
  error.response?.data?.message || error.message || fallback;

// ── API Methods ─────────────────────────────────────────────────────────

// GET /notes — List the current user's notes
export async function getNotes(): Promise<Note[]> {
  try {
    const res = await api.get("/notes");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to fetch notes"));
  }
}

// GET /notes/{id} — Get one note
export async function getNoteById(id: string): Promise<Note> {
  try {
    const res = await api.get(`/notes/${id}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to fetch note"));
  }
}

// POST /notes — Create a note
export async function createNote(data: CreateNotePayload): Promise<Note> {
  try {
    const res = await api.post("/notes", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to create note"));
  }
}

// PATCH /notes/{id} — Update a note
export async function updateNote(id: string, data: UpdateNotePayload): Promise<Note> {
  try {
    const res = await api.patch(`/notes/${id}`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to update note"));
  }
}

// DELETE /notes/{id} — Delete a note
export async function deleteNote(id: string): Promise<void> {
  try {
    await api.delete(`/notes/${id}`);
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to delete note"));
  }
}
