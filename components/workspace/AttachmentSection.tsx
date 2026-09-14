"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Attachment,
  AttachmentEntityType,
  createAttachment,
  getAttachments,
  updateAttachmentMetadata,
  detachAttachment,
  archiveAttachment,
  getAttachmentDownloadUrl,
} from "@/lib/api/attachmentApi";
import { uploadDocument } from "@/lib/api/documentsApi";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import {
  Paperclip,
  UploadCloud,
  FileText,
  FileImage,
  FileCode,
  File,
  Eye,
  Download,
  Trash2,
  Archive,
  Edit2,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  X,
  Sparkles,
} from "lucide-react";

interface AttachmentSectionProps {
  entityType: AttachmentEntityType;
  entityId: string;
  title?: string;
  compact?: boolean;
  canManage?: boolean;
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  entityType,
  entityId,
  title = "Files & Attachments",
  compact = false,
  canManage = true,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal & Edit state
  const [previewTarget, setPreviewTarget] = useState<Attachment | null>(null);
  const [detachTarget, setDetachTarget] = useState<Attachment | null>(null);
  const [isDetaching, setIsDetaching] = useState<boolean>(false);

  const [editTarget, setEditTarget] = useState<Attachment | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // In-flight action tracking
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<string, boolean>>({});

  /* -------------------------------------------------------------------------- */
  /* FETCH ATTACHMENTS                                                          */
  /* -------------------------------------------------------------------------- */
  const fetchAttachmentsList = useCallback(async () => {
    if (!entityId || entityId === "[id]") return;
    setIsLoading(true);
    setError(null);
    try {
      const isArchivedParam = activeTab === "ALL" ? undefined : activeTab === "ARCHIVED";
      const res = await getAttachments({
        entityType,
        entityId,
        isArchived: isArchivedParam,
        search: searchQuery.trim() || undefined,
      });
      setAttachments(res.items || []);
    } catch (err: any) {
      console.error("Failed to load attachments:", err);
      setError(err.message || "Failed to load attachments.");
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, activeTab, searchQuery]);

  useEffect(() => {
    fetchAttachmentsList();
  }, [fetchAttachmentsList]);

  /* -------------------------------------------------------------------------- */
  /* FILE UPLOAD & ATTACH FLOW                                                  */
  /* -------------------------------------------------------------------------- */
  const handleUploadAndAttach = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !entityId || entityId === "[id]") return;
    setIsUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Existing Upload flow (POST /documents/upload or /uploads/file)
        const uploadedDoc = await uploadDocument(file, (percent) => {
          setUploadProgress(percent);
        });

        // 2. Attach relationship via POST /attachments
        const fileUploadId = uploadedDoc.id || (uploadedDoc as any).fileUploadId;
        if (!fileUploadId) {
          throw new Error("Upload completed but no file identifier was returned.");
        }

        await createAttachment({
          fileUploadId,
          entityType,
          entityId,
          name: file.name,
          metadata: {
            originalSize: file.size,
            mimeType: file.type,
          },
        });
      }

      await fetchAttachmentsList();
    } catch (err: any) {
      console.error("Failed to upload/attach file:", err);
      setError(err.message || "File upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadAndAttach(e.dataTransfer.files);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* DOWNLOAD HANDLER                                                           */
  /* -------------------------------------------------------------------------- */
  const handleDownload = async (attachment: Attachment) => {
    const actionKey = `download-${attachment.id}`;
    if (actionLoadingIds[actionKey]) return;

    setActionLoadingIds((prev) => ({ ...prev, [actionKey]: true }));
    try {
      const signedUrl = await getAttachmentDownloadUrl(attachment.id);
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = attachment.name || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || "Failed to download file");
    } finally {
      setActionLoadingIds((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  /* -------------------------------------------------------------------------- */
  /* ARCHIVE / UNARCHIVE HANDLER                                               */
  /* -------------------------------------------------------------------------- */
  const handleToggleArchive = async (attachment: Attachment) => {
    const actionKey = `archive-${attachment.id}`;
    if (actionLoadingIds[actionKey]) return;

    setActionLoadingIds((prev) => ({ ...prev, [actionKey]: true }));
    try {
      const nextState = !attachment.isArchived;
      await archiveAttachment(attachment.id, nextState);
      setAttachments((prev) =>
        prev.map((item) => (item.id === attachment.id ? { ...item, isArchived: nextState } : item))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update archive status");
    } finally {
      setActionLoadingIds((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  /* -------------------------------------------------------------------------- */
  /* DETACH HANDLER (RELATIONSHIP REMOVAL)                                     */
  /* -------------------------------------------------------------------------- */
  const handleConfirmDetach = async () => {
    if (!detachTarget) return;
    setIsDetaching(true);
    try {
      await detachAttachment(detachTarget.id);
      setAttachments((prev) => prev.filter((a) => a.id !== detachTarget.id));
      setDetachTarget(null);
    } catch (err: any) {
      alert(err.message || "Failed to detach attachment");
    } finally {
      setIsDetaching(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* EDIT METADATA HANDLER                                                     */
  /* -------------------------------------------------------------------------- */
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setIsSavingEdit(true);
    try {
      const updatedMeta = {
        ...(editTarget.metadata || {}),
        notes: editNotes.trim(),
        displayName: editName.trim(),
      };
      const updated = await updateAttachmentMetadata(editTarget.id, updatedMeta);
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === editTarget.id ? { ...a, name: editName.trim() || a.name, metadata: updatedMeta } : a
        )
      );
      setEditTarget(null);
    } catch (err: any) {
      alert(err.message || "Failed to save metadata");
    } finally {
      setIsSavingEdit(false);
    }
  };

  /* Helper icon finder */
  const getFileIcon = (fileName: string, fileType?: string | null) => {
    const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      return <FileImage className="w-4 h-4 text-emerald-500" />;
    }
    if (["js", "ts", "tsx", "html", "css", "json", "py"].includes(ext)) {
      return <FileCode className="w-4 h-4 text-purple-500" />;
    }
    if (ext === "pdf") {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <File className="w-4 h-4 text-blue-500" />;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-4 ${compact ? "p-0" : "p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>{title}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {attachments.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Attach files to this {entityType.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium text-slate-500">
          {(["ACTIVE", "ARCHIVED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg transition capitalize ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs"
                  : "hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={(e) => e.target.files && handleUploadAndAttach(e.target.files)}
          className="hidden"
          id={`file-upload-input-${entityType}-${entityId}`}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xs text-blue-500">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          {isUploading ? (
            <div className="w-full max-w-xs space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <span>Uploading & Attaching...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Drag and drop files here, or{" "}
                <label
                  htmlFor={`file-upload-input-${entityType}-${entityId}`}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  browse files
                </label>
              </p>
              <p className="text-[10px] text-slate-400">
                Supports Images, PDFs, Documents, & Code files up to 25MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Attachment List Area */}
      {isLoading ? (
        <div className="space-y-2 py-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Paperclip className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">No attachments found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {searchQuery ? "No attachments match your search query." : `No files attached to this ${entityType.toLowerCase()} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((item) => (
            <div
              key={item.id}
              className={`group flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-2xl transition ${
                item.isArchived
                  ? "border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 opacity-70"
                  : "border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-xs"
              }`}
            >
              {/* Info */}
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0">
                  {getFileIcon(item.name, item.fileType)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {item.name}
                    </span>
                    {item.isArchived && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-0.5">
                    <span>{formatFileSize(item.fileSize)}</span>
                    {item.createdAt && (
                      <>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition">
                <button
                  onClick={() => setPreviewTarget(item)}
                  title="Preview File"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDownload(item)}
                  disabled={actionLoadingIds[`download-${item.id}`]}
                  title="Download Signed File"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition disabled:opacity-50"
                >
                  {actionLoadingIds[`download-${item.id}`] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setEditTarget(item);
                    setEditName(item.name || "");
                    setEditNotes(item.metadata?.notes || "");
                  }}
                  title="Edit Metadata"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleToggleArchive(item)}
                  disabled={actionLoadingIds[`archive-${item.id}`]}
                  title={item.isArchived ? "Unarchive Attachment" : "Archive Attachment"}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition disabled:opacity-50"
                >
                  {actionLoadingIds[`archive-${item.id}`] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => setDetachTarget(item)}
                  title="Detach Attachment (Remove Relationship)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTarget && (
        <AttachmentPreviewModal
          isOpen={!!previewTarget}
          attachment={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      {/* Detach Confirmation Dialog */}
      {detachTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-500">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Detach Attachment
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to detach <strong>&quot;{detachTarget.name}&quot;</strong> from this {entityType.toLowerCase()}?
            </p>
            <p className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              ℹ️ <strong>Note:</strong> Detaching removes the attachment relationship from this {entityType.toLowerCase()}. The original uploaded S3 file asset will remain preserved.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDetachTarget(null)}
                disabled={isDetaching}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDetach}
                disabled={isDetaching}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isDetaching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Detach Attachment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                <span>Edit Attachment Metadata</span>
              </h3>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  File Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Notes / Metadata
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add custom notes or metadata..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setEditTarget(null)}
                disabled={isSavingEdit}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Save Metadata</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
