import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  File,
  Copy,
  Download,
  Link,
  Trash2,
} from "lucide-react";
import { Document } from "@/lib/api/documentsApi";

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
  handleDownload: (doc: Document) => Promise<void>;
  showToast: (type: "success" | "error", msg: string) => void;
  formatBytes: (bytes: number) => string;
  fileCategory: (fileType: string) => string;
  getFileIcon: (fileType: string) => React.ComponentType<any>;
  StatusBadge: React.FC<{ status: string }>;
}

// ── Upload Modal ──
function UploadModal({
  onClose,
  onUpload,
  showToast,
  formatBytes,
}: {
  onClose: () => void;
  onUpload: (file: File, onProgress?: (p: number) => void) => Promise<void>;
  showToast: (type: "success" | "error", msg: string) => void;
  formatBytes: (bytes: number) => string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 100 * 1024 * 1024) {
      showToast("error", "File size must be under 100 MB");
      return;
    }
    setFile(selectedFile);
    setProgress(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file, (p) => setProgress(p));
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setUploading(false);
      setFile(null);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Upload File</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-300 hover:border-indigo-400"
            }`}
          >
            {!file ? (
              <div>
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium">
                  Drag & drop your file here
                </p>
                <p className="text-xs text-gray-500 mt-1">or</p>
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
              </div>
            ) : (
              <div>
                <File className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                {uploading && (
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setFile(null);
                      setProgress(0);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Remove
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {uploading ? `Uploading ${progress}%` : "Upload"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Document Detail Modal ──
function DocumentDetailModal({
  document,
  onClose,
  onCopyUrl,
  onDownload,
  onDelete,
  onLinkEntity,
  formatBytes,
  fileCategory,
  getFileIcon,
  StatusBadge,
}: {
  document: Document;
  onClose: () => void;
  onCopyUrl: (url: string) => void;
  onDownload: (doc: Document) => void;
  onDelete: () => void;
  onLinkEntity: () => void;
  formatBytes: (bytes: number) => string;
  fileCategory: (fileType: string) => string;
  getFileIcon: (fileType: string) => React.ComponentType<any>;
  StatusBadge: React.FC<{ status: string }>;
}) {
  const DetailItem = ({
    label,
    value,
    className,
  }: {
    label: string;
    value: React.ReactNode;
    className?: string;
  }) => (
    <div className={className}>
      <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
      <div className="mt-0.5 text-gray-900 font-medium break-words">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Document Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              {React.createElement(getFileIcon(document.fileType), {
                className: "w-8 h-8 text-indigo-500",
              })}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {document.fileName}
              </h3>
              <p className="text-sm text-gray-500">
                {fileCategory(document.fileType)} •{" "}
                {formatBytes(document.fileSize)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem
              label="Status"
              value={<StatusBadge status={document.status} />}
            />
            <DetailItem
              label="Uploaded By"
              value={document.uploadedBy?.name || "—"}
            />
            <DetailItem
              label="Upload Date"
              value={new Date(document.createdAt).toLocaleString()}
            />
            <DetailItem
              label="Entity Type"
              value={document.entityType || "None"}
            />
            <DetailItem label="Entity ID" value={document.entityId || "—"} />
            <DetailItem label="File Type" value={document.fileType} />
            <DetailItem
              label="S3 Key"
              value={document.s3Key}
              className="col-span-2 truncate"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onCopyUrl(document.s3Url)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Copy size={15} /> Copy URL
            </button>
            <button
              onClick={() => onDownload(document)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Download size={15} /> Download
            </button>
            <button
              onClick={onLinkEntity}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
            >
              <Link size={15} /> Link
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Link Entity Modal ──
function LinkEntityModal({
  document,
  onClose,
  onLink,
}: {
  document: Document;
  onClose: () => void;
  onLink: (
    entityType: "LEAD" | "DEAL" | "PROJECT",
    entityId: string
  ) => void;
}) {
  const [entityType, setEntityType] = useState<"LEAD" | "DEAL" | "PROJECT">(
    "LEAD"
  );
  const [entityId, setEntityId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entityId.trim()) onLink(entityType, entityId.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Link to Entity</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as any)}
              className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="LEAD">Lead</option>
              <option value="DEAL">Deal</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Entity ID
            </label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter entity ID"
              required
              className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
            >
              Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──
function DeleteConfirmationModal({
  fileName,
  onClose,
  onDelete,
}: {
  fileName: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          Delete Document
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete “{fileName}”? This action cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700"
          >
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Modals Wrapper ──
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
  return (
    <>
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          showToast={showToast}
          formatBytes={formatBytes}
        />
      )}

      {showDetailModal && selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDoc(null);
          }}
          onCopyUrl={copyToClipboard}
          onDownload={handleDownload}
          onDelete={() => {
            setShowDetailModal(false);
            setShowDeleteModal(true);
          }}
          onLinkEntity={() => setShowLinkModal(true)}
          formatBytes={formatBytes}
          fileCategory={fileCategory}
          getFileIcon={getFileIcon}
          StatusBadge={StatusBadge}
        />
      )}

      {showLinkModal && selectedDoc && (
        <LinkEntityModal
          document={selectedDoc}
          onClose={() => setShowLinkModal(false)}
          onLink={handleLinkEntity}
        />
      )}

      {showDeleteModal && selectedDoc && (
        <DeleteConfirmationModal
          fileName={selectedDoc.fileName}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}