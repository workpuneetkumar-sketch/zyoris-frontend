"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Files,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
} from "lucide-react";
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  linkDocumentToEntity,
  Document,
} from "@/lib/api/documentsApi";

// ── Helpers (no export – used only via props) ──
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return FileImage;
  if (fileType.includes("spreadsheet") || fileType.includes("excel"))
    return FileSpreadsheet;
  if (fileType.startsWith("video/")) return FileVideo;
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("zip") || fileType.includes("rar")) return FileArchive;
  return File;
};

const fileCategory = (fileType: string): string => {
  if (fileType.startsWith("image/")) return "Image";
  if (fileType.includes("spreadsheet") || fileType.includes("excel"))
    return "Spreadsheet";
  if (fileType.startsWith("video/")) return "Video";
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("zip") || fileType.includes("rar")) return "Archive";
  return "Other";
};

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    DONE: "bg-emerald-100 text-emerald-700",
    PROCESSING: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        colorMap[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// ── Components ──
import DocumentListSection from "@/components/documents/DocumentListSection";
import DocumentModals from "@/components/documents/DocumentModals";

export default function DocumentsPage() {
  // State (unchanged)
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("ALL");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      fileTypeFilter === "ALL" ||
      (fileTypeFilter === "OTHER" &&
        !["image/", "video/", "application/pdf"].some((prefix) =>
          doc.fileType.startsWith(prefix)
        ) &&
        !doc.fileType.includes("spreadsheet") &&
        !doc.fileType.includes("zip") &&
        !doc.fileType.includes("rar")) ||
      doc.fileType.startsWith(fileTypeFilter) ||
      (fileTypeFilter ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
        doc.fileType.includes("spreadsheet"));
    return matchesSearch && matchesType;
  });

  const totalDocs = documents.length;
  const uploadedToday = documents.filter((d) => {
    const today = new Date();
    const created = new Date(d.createdAt);
    return created.toDateString() === today.toDateString();
  }).length;
  const linkedDocs = documents.filter((d) => d.entityType && d.entityId).length;
  const totalStorage = documents.reduce((sum, d) => sum + d.fileSize, 0);

  const handleUpload = async (file: File, onProgress?: (p: number) => void) => {
    try {
      const newDoc = await uploadDocument(file, onProgress);
      setDocuments((prev) => [newDoc, ...prev]);
      showToast("success", "File uploaded successfully");
      setShowUploadModal(false);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    try {
      await deleteDocument(selectedDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== selectedDoc.id));
      showToast("success", "Document deleted");
      setShowDeleteModal(false);
      setSelectedDoc(null);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleLinkEntity = async (
    entityType: "LEAD" | "DEAL" | "PROJECT",
    entityId: string
  ) => {
    if (!selectedDoc) return;
    try {
      const updated = await linkDocumentToEntity(selectedDoc.id, {
        entityType,
        entityId,
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      setSelectedDoc(updated);
      setShowLinkModal(false);
      showToast("success", "Document linked to entity");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("success", "URL copied to clipboard");
  };

  const handleDownload = async (doc: Document) => {
    try {
      await downloadDocument(doc.id, doc.fileName);
      showToast("success", "Download started");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const handleViewDetail = async (doc: Document) => {
    try {
      const fullDoc = await getDocumentById(doc.id);
      setSelectedDoc(fullDoc);
    } catch (err: any) {
      showToast("error", err.message);
      setSelectedDoc(doc);
    }
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
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
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Files className="w-8 h-8 text-indigo-600" />
            Documents
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all your uploaded files and documents
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
        >
          <Upload size={18} />
          Upload File
        </button>
      </div>

      {/* Document List Section */}
      <DocumentListSection
        documents={documents}
        loading={loading}
        error={error}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        fileTypeFilter={fileTypeFilter}
        setFileTypeFilter={setFileTypeFilter}
        loadDocuments={loadDocuments}
        filteredDocs={filteredDocs}
        totalDocs={totalDocs}
        uploadedToday={uploadedToday}
        linkedDocs={linkedDocs}
        totalStorage={totalStorage}
        formatBytes={formatBytes}
        fileCategory={fileCategory}
        getFileIcon={getFileIcon}
        StatusBadge={StatusBadge}
        Skeleton={Skeleton}
        handleViewDetail={handleViewDetail}
        handleDownload={handleDownload}
        setSelectedDoc={setSelectedDoc}
        setShowLinkModal={setShowLinkModal}
        setShowDeleteModal={setShowDeleteModal}
      />

      {/* Modals */}
      <DocumentModals
        showUploadModal={showUploadModal}
        setShowUploadModal={setShowUploadModal}
        showDetailModal={showDetailModal}
        setShowDetailModal={setShowDetailModal}
        showLinkModal={showLinkModal}
        setShowLinkModal={setShowLinkModal}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        selectedDoc={selectedDoc}
        setSelectedDoc={setSelectedDoc}
        handleUpload={handleUpload}
        handleDelete={handleDelete}
        handleLinkEntity={handleLinkEntity}
        copyToClipboard={copyToClipboard}
        handleDownload={handleDownload}
        showToast={showToast}
        formatBytes={formatBytes}
        fileCategory={fileCategory}
        getFileIcon={getFileIcon}
        StatusBadge={StatusBadge}
      />
    </div>
  );
}

// Global CSS for toast animation
if (typeof document !== "undefined") {
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
}