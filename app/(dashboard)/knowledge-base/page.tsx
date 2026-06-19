"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  BookOpen,
  Folder,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  BookMarked,
  Clock,
  Tag,
} from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  searchArticles,
  Category,
  KnowledgeArticle,
  CreateArticlePayload,
  UpdateArticlePayload,
} from "@/lib/api/knowledgeApi";
import {
  CategoryModal,
  ArticleModal,
  ReaderModal,
} from "@/components/knowledge/KnowledgeBaseModals";

/* ── Helpers ──────────────────────────────────────────────────────────── */
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/* ── Page Component ──────────────────────────────────────────────────── */
export default function KnowledgeBasePage() {
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [searchResults, setSearchResults] = useState<KnowledgeArticle[]>([]);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading / Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [showReaderModal, setShowReaderModal] = useState(false);
  const [readerArticle, setReaderArticle] = useState<KnowledgeArticle | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Load data ──────────────────────────────────────────────────────── */
  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err: any) {
      showToast("error", err.message);
    }
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArticles();
      setArticles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadArticles();
  }, [loadCategories, loadArticles]);

  /* ── Search handler (uses API) ─────────────────────────────────────── */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchArticles(searchQuery);
        setSearchResults(results);
      } catch (err: any) {
        showToast("error", err.message);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  /* ── Computed display list ───────────────────────────────────────── */
  const displayedArticles = searchQuery.trim()
    ? searchResults
    : selectedCategoryId
    ? articles.filter((a) => a.categoryId === selectedCategoryId)
    : articles;

  /* ── Stats ──────────────────────────────────────────────────────────── */
  const stats = {
    totalArticles: articles.length,
    totalCategories: categories.length,
    recentArticles: [...articles]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3),
  };

  /* ── Category CRUD ──────────────────────────────────────────────────── */
  const handleCreateCategory = async (name: string) => {
    try {
      const newCat = await createCategory({ name });
      setCategories((prev) => [...prev, newCat]);
      showToast("success", "Category created");
      setShowCategoryModal(false);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    try {
      const updated = await updateCategory(id, { name });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast("success", "Category updated");
      setEditingCategory(null);
      setShowCategoryModal(false);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      showToast("success", "Category deleted");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  /* ── Article CRUD (live) ────────────────────────────────────────────── */
  const handleCreateArticle = async (payload: CreateArticlePayload) => {
    try {
      const newArticle = await createArticle(payload);
      setArticles((prev) => [newArticle, ...prev]);
      showToast("success", "Article created");
      setShowArticleModal(false);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleUpdateArticle = async (id: string, payload: UpdateArticlePayload) => {
    try {
      const updated = await updateArticle(id, payload);
      setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSearchResults((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast("success", "Article updated");
      setEditingArticle(null);
      setShowArticleModal(false);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDeleteArticle = async () => {
    if (!deletingArticleId) return;
    try {
      await deleteArticle(deletingArticleId);
      setArticles((prev) => prev.filter((a) => a.id !== deletingArticleId));
      setSearchResults((prev) => prev.filter((a) => a.id !== deletingArticleId));
      showToast("success", "Article deleted");
      setShowDeleteModal(false);
      setDeletingArticleId(null);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const openReader = async (articleId: string) => {
    try {
      const article = await getArticleById(articleId);
      setReaderArticle(article);
      setShowReaderModal(true);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  /* ── Inject animation CSS (client‑side only) ────────────────────────── */
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
              <BookOpen className="w-8 h-8 text-indigo-600" />
            </div>
            Knowledge Base
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-12">Documentation, guides, and internal resources</p>
        </div>
        <button
          onClick={() => {
            setEditingArticle(null);
            setShowArticleModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-0.5"
        >
          <Plus size={18} />
          New Article
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Articles",
            value: stats.totalArticles,
            icon: BookMarked,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Categories",
            value: stats.totalCategories,
            icon: Folder,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Recent Updates",
            value: stats.recentArticles.length,
            icon: Clock,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "Search Results",
            value: searchQuery ? searchResults.length : displayedArticles.length,
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

      {/* Main layout: sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Categories Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Folder size={18} className="text-indigo-500" />
                Categories
              </h2>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryModal(true);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus size={18} className="text-gray-500 hover:text-indigo-600" />
              </button>
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selectedCategoryId === null
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  All Articles
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id} className="group flex items-center">
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                      selectedCategoryId === cat.id
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {cat.name}
                  </button>
                  <div className="hidden group-hover:flex items-center gap-1 mr-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(cat);
                        setShowCategoryModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete category "${cat.name}"?`)) {
                          handleDeleteCategory(cat.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Articles Area */}
        <main className="flex-1 min-w-0">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm transition-all"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 size={18} className="animate-spin text-indigo-500" />
              </div>
            )}
          </div>

          {/* Articles List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={loadArticles} className="mt-4 text-indigo-600 font-semibold">
                Try again
              </button>
            </div>
          ) : displayedArticles.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">
                {searchQuery ? "No articles match your search" : "No articles found"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-indigo-600 font-semibold"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => openReader(article.id)}
                        className="text-lg font-semibold text-gray-900 hover:text-indigo-600 text-left line-clamp-1"
                      >
                        {article.title}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {article.category && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
                            <Folder size={12} />
                            {article.category.name}
                          </span>
                        )}
                        {article.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-100"
                          >
                            <Tag size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Updated {formatDate(article.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openReader(article.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingArticle(article);
                          setShowArticleModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingArticleId(article.id);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showCategoryModal && (
        <CategoryModal
          isOpen={showCategoryModal}
          initialData={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={(name) => {
            if (editingCategory) {
              handleUpdateCategory(editingCategory.id, name);
            } else {
              handleCreateCategory(name);
            }
          }}
        />
      )}

      {showArticleModal && (
        <ArticleModal
          isOpen={showArticleModal}
          initialData={editingArticle}
          categories={categories}
          onClose={() => {
            setShowArticleModal(false);
            setEditingArticle(null);
          }}
          onSave={(data) => {
            // Type assertions to satisfy the union type
            if (editingArticle) {
              handleUpdateArticle(editingArticle.id, data as UpdateArticlePayload);
            } else {
              handleCreateArticle(data as CreateArticlePayload);
            }
          }}
        />
      )}

      {showReaderModal && readerArticle && (
        <ReaderModal
          article={readerArticle}
          onClose={() => setShowReaderModal(false)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && deletingArticleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Article</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this article? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteArticle}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}