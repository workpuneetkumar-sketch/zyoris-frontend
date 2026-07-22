// lib/api/notesApi.ts

import api from "@/lib/api/api"; // your pre-configured axios instance

// ── Types ──────────────────────────────────────────────────────────────
export interface Note {
  id: string;
  date: string;
  topic: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  date: string;
  topic: string;
  title: string;
  description: string;
}

export interface UpdateNotePayload {
  date?: string;
  topic?: string;
  title?: string;
  description?: string;
}

// ── Mock Data (fallback when backend is unavailable) ──────────────────
const MOCK_NOTES: Note[] = [
  {
    id: "mock-1",
    date: new Date().toISOString().split("T")[0],
    topic: "Project Planning",
    title: "Dashboard Builder Ideas",
    description:
      "Brainstormed some ideas for the new dashboard builder feature:\n\n1. Drag and drop widgets\n2. Custom layout configurations\n3. Real-time data preview\n4. Export to PDF\n5. Template library for common dashboards",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    topic: "Meeting Notes",
    title: "Sprint Planning — Week 30",
    description:
      "Sprint goals:\n- Complete payment flow redesign\n- Fix dashboard builder layout persistence bug\n- Begin work on notes feature\n- Review PRs for AI insights module\n\nAction items:\n- @prince to finalize payment UI by Wed\n- Team to review dashboard builder PR by Fri",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock-3",
    date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
    topic: "Ideas",
    title: "Feature Requests from Client Meeting",
    description:
      "Key requests from client call:\n\n- Export reports as CSV/Excel\n- Custom email templates\n- Role-based dashboard access\n- Mobile app for field sales\n- Integration with their ERP system\n\nPriority: Mobile app and ERP integration are top priority.",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

// In-memory store for mock data (starts as a copy of MOCK_NOTES)
let mockStore: Note[] = [...MOCK_NOTES];

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ── API Methods ─────────────────────────────────────────────────────────

export async function getNotes(): Promise<Note[]> {
  try {
    const res = await api.get("/notes");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    // Fallback to mock data when backend is unavailable
    console.warn("Notes API unavailable, using mock data:", error.message);
    return [...mockStore].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}

export async function getNoteById(id: string): Promise<Note> {
  try {
    const res = await api.get(`/notes/${id}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    const mock = mockStore.find((n) => n.id === id);
    if (mock) return { ...mock };
    throw new Error(error.response?.data?.message || "Failed to fetch note");
  }
}

export async function createNote(data: CreateNotePayload): Promise<Note> {
  try {
    const res = await api.post("/notes", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    // Mock fallback
    const newNote: Note = {
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore = [newNote, ...mockStore];
    return { ...newNote };
  }
}

export async function updateNote(id: string, data: UpdateNotePayload): Promise<Note> {
  try {
    const res = await api.patch(`/notes/${id}`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    // Mock fallback
    const index = mockStore.findIndex((n) => n.id === id);
    if (index === -1) throw new Error("Note not found");
    mockStore[index] = {
      ...mockStore[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockStore[index] };
  }
}

export async function deleteNote(id: string): Promise<void> {
  try {
    await api.delete(`/notes/${id}`);
  } catch (error: any) {
    // Mock fallback
    mockStore = mockStore.filter((n) => n.id !== id);
  }
}

export async function searchNotes(query: string): Promise<Note[]> {
  try {
    const res = await api.get("/notes/search", { params: { q: query } });
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    // Mock fallback — search locally
    const q = query.toLowerCase();
    return mockStore.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.topic.toLowerCase().includes(q) ||
        note.description.toLowerCase().includes(q)
    ).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}
