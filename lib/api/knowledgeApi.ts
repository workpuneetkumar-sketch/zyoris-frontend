// lib/api/knowledgeApi.ts

import api from "@/lib/api/api"; // your pre-configured axios instance

// ── Types ──────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  category?: Category;
  tags?: string[];        // assuming the backend stores tags as JSON or comma-separated string
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticlePayload {
  title: string;
  content: string;
  categoryId?: string;
  tags?: string[];
}

export interface UpdateArticlePayload {
  title?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
}

export interface CreateCategoryPayload {
  name: string;
}

export interface UpdateCategoryPayload {
  name?: string;
}

// ── API Methods ─────────────────────────────────────────────────────────

// ---- Categories ----

export async function getCategories(): Promise<Category[]> {
  try {
    const res = await api.get("/knowledge/categories");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch categories");
  }
}

export async function createCategory(data: CreateCategoryPayload): Promise<Category> {
  try {
    const res = await api.post("/knowledge/categories", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create category");
  }
}

export async function updateCategory(id: string, data: UpdateCategoryPayload): Promise<Category> {
  try {
    const res = await api.patch(`/knowledge/categories/${id}`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update category");
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    await api.delete(`/knowledge/categories/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete category");
  }
}

// ---- Articles ----

export async function getArticles(): Promise<KnowledgeArticle[]> {
  try {
    const res = await api.get("/knowledge");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch articles");
  }
}

export async function getArticleById(id: string): Promise<KnowledgeArticle> {
  try {
    const res = await api.get(`/knowledge/${id}`);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch article");
  }
}

export async function createArticle(data: CreateArticlePayload): Promise<KnowledgeArticle> {
  try {
    const res = await api.post("/knowledge/create", data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create article");
  }
}

export async function updateArticle(id: string, data: UpdateArticlePayload): Promise<KnowledgeArticle> {
  try {
    const res = await api.patch(`/knowledge/${id}`, data);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update article");
  }
}

export async function deleteArticle(id: string): Promise<void> {
  try {
    await api.delete(`/knowledge/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete article");
  }
}

export async function searchArticles(query: string): Promise<KnowledgeArticle[]> {
  try {
    const res = await api.get("/knowledge/search", { params: { q: query } });
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Search failed");
  }
}