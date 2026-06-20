"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  File,
  AlertCircle,
  Copy,
  Download,
  Link,
  Trash2,
  Loader,
  Eye,
} from "lucide-react";
import { Document, getDocumentDownloadUrl } from "@/lib/api/documentsApi";

// ─── Props ──────────────────────────────────────────────────────────────
interface DocumentModalsProps {
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
  showDetailModal: boolean;
  setShowDetailModal: (show: boolean) => void;
  showLinkModal: boolean;
  setShowLinkModal: (show: boolean) => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  selectedDoc: Document | null;
  setSelectedDoc: (doc: Document | null) => void;
  handleUpload: (file: File, onProgress?: (p: number) => void) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleLinkEntity: (
    entityType: "LEAD" | "DEAL" | "PROJECT",
    entityId: string
  ) => Promise<void>;
  copyToClipboard: (url: string) => void;
  handleDownload: (doc: Document) => void;
  showToast: (type: "success" | "error", message: string) => void;
  formatBytes: (bytes: number) => string;
  fileCategory: (fileType: string) => string;
  getFileIcon: (fileType: string) => React.ComponentType<any>;
  StatusBadge: React.FC<{ status: string }>;
}

// ─── प्रीव्यू हुक – presigned URL का उपयोग करें ──────────────────────
const useDocumentPreview = (doc: Document | null) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!doc || !doc.fileType.startsWith("image/")) {
      setPreviewUrl(null);
      setError(false);
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = await getDocumentDownloadUrl(doc.id);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Preview fetch failed", err);
        setError(true);
        setPreviewUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [doc?.id, doc?.fileType]);

  return { previewUrl, loading, error };
};

// ─── मुख्य कंपोनेंट ─────────────────────────────────────────────────────
export default function DocumentModals({
  showUploadModal,
  setShowUploadModal,
  showDetailModal,
  setShowDetailModal,
  showLinkModal,
  setShowLinkModal,
  showDeleteModal,
  setShowDeleteModal,
  selectedDoc,
  setSelectedDoc,
  handleUpload,
  handleDelete,
  handleLinkEntity,
  copyToClipboard,
  handleDownload,
  showToast,
  formatBytes,
  fileCategory,
  getFileIcon,
  StatusBadge,
}: DocumentModalsProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [linkEntityType, setLinkEntityType] = useState<"LEAD" | "DEAL" | "PROJECT">("LEAD");
  const [linkEntityId, setLinkEntityId] = useState("");
  const { previewUrl, loading: previewLoading, error: previewError } = useDocumentPreview(selectedDoc);

  const handleUploadClick = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      await handleUpload(uploadFile, (progress) => setUploadProgress(progress));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFile(null);
    }
  };

  // अगर कोई मोडल खुला नहीं है तो कुछ न दिखाएँ
  if (!showUploadModal && !showDetailModal && !showLinkModal && !showDeleteModal) {
    return null;
  }

  return (
    <>
      {/* ─── Upload Modal ─── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Upload File</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-indigo-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 font-medium">
                  {uploadFile ? uploadFile.name : "Choose a file"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </label>

              {uploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadClick}
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {showDetailModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Document Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Preview area */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[200px]">
                {selectedDoc.fileType.startsWith("image/") ? (
                  previewLoading ? (
                    <Loader className="w-8 h-8 animate-spin text-indigo-500" />
                  ) : previewError ? (
                    <div className="text-center">
                      <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-2" />
                      <p className="text-sm text-red-600">Failed to load preview</p>
                    </div>
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={selectedDoc.fileName}
                      className="max-w-full max-h-64 rounded-lg object-contain"
                    />
                  ) : (
                    <File className="w-16 h-16 text-gray-300" />
                  )
                ) : (
                  <File className="w-16 h-16 text-gray-300" />
                )}
              </div>

              {/* File info */}
              <div>
                <h4 className="font-semibold text-gray-900 truncate">{selectedDoc.fileName}</h4>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span> {fileCategory(selectedDoc.fileType)}
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span> {formatBytes(selectedDoc.fileSize)}
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span> <StatusBadge status={selectedDoc.status} />
                  </div>
                  <div>
                    <span className="text-gray-500">Uploaded:</span>{" "}
                    {new Date(selectedDoc.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-500">Entity:</span>{" "}
                    {selectedDoc.entityType ? `${selectedDoc.entityType} #${selectedDoc.entityId}` : "—"}
                  </div>
                  <div>
                    <span className="text-gray-500">Uploaded by:</span> {selectedDoc.uploadedBy?.name || "—"}
                  </div>
                </div>
              </div>

              {/* ─── Action Buttons ─── */}
              <div className="flex flex-wrap gap-2 pt-2">
                {/* Download */}
                <button
                  onClick={() => handleDownload(selectedDoc)}
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
                >
                  <Download size={16} />
                  Download
                </button>

                {/* Copy URL (presigned URL) */}
                <button
                  onClick={async () => {
                    try {
                      const url = await getDocumentDownloadUrl(selectedDoc.id);
                      await navigator.clipboard.writeText(url);
                      showToast("success", "Image URL copied to clipboard");
                    } catch {
                      showToast("error", "Failed to get URL");
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  <Copy size={16} />
                  Copy URL
                </button>

                {/* View (new tab) */}
                <button
                  onClick={async () => {
                    try {
                      const url = await getDocumentDownloadUrl(selectedDoc.id);
                      window.open(url, "_blank");
                    } catch {
                      showToast("error", "Failed to open image");
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
                >
                  <Eye size={16} />
                  View
                </button>

                {/* Link to Entity */}
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowLinkModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
                >
                  <Link size={16} />
                  Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Link to Entity Modal ─── */}
      {showLinkModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Link to Entity</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                <select
                  value={linkEntityType}
                  onChange={(e) => setLinkEntityType(e.target.value as "LEAD" | "DEAL" | "PROJECT")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="LEAD">Lead</option>
                  <option value="DEAL">Deal</option>
                  <option value="PROJECT">Project</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity ID</label>
                <input
                  type="text"
                  value={linkEntityId}
                  onChange={(e) => setLinkEntityId(e.target.value)}
                  placeholder="e.g., 123"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (linkEntityId.trim()) {
                      handleLinkEntity(linkEntityType, linkEntityId.trim());
                      setLinkEntityId("");
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 text-center">
              <Trash2 className="w-12 h-12 mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Document?</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-medium">{selectedDoc.fileName}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}