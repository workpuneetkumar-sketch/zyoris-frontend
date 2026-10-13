"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  Download,
  FileSpreadsheet,
  FileCode,
  File,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";
import { MessageAttachment } from "@/types/connect";
import { downloadUploadedFile, getUploadDownloadUrl } from "@/lib/api/uploadsApi";

interface MessageAttachmentRendererProps {
  attachments?: MessageAttachment[];
  isSelf?: boolean;
}

/**
 * Image attachment item that automatically resolves signed download URL
 * for secure image viewing and lightbox preview.
 */
function ImageAttachmentItem({
  att,
  onOpenPreview,
  onDownload,
  isDownloading,
}: {
  att: MessageAttachment;
  onOpenPreview: (url: string) => void;
  onDownload: (e: React.MouseEvent, att: MessageAttachment) => void;
  isDownloading: boolean;
}) {
  const initialUrl = att.url && /^https?:\/\//i.test(att.url) && !att.url.includes("/uploads/") ? att.url : "";
  const [resolvedUrl, setResolvedUrl] = useState<string>(initialUrl);
  const [loading, setLoading] = useState<boolean>(!initialUrl);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (resolvedUrl) return;

    const fileId = att.fileUploadId || att.id;
    if (!fileId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getUploadDownloadUrl(fileId)
      .then((url) => {
        if (isMounted && url) {
          setResolvedUrl(url);
        }
      })
      .catch((err) => {
        console.warn(`Could not pre-fetch signed download URL for image ${fileId}:`, err);
        if (isMounted) setHasError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [att.fileUploadId, att.id, resolvedUrl]);

  const displayUrl = resolvedUrl || att.url || "";

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-surface text-text-muted text-xs max-w-xs">
        <Loader2 size={16} className="animate-spin text-primary shrink-0" />
        <span className="truncate">Loading {att.name || "image"}...</span>
      </div>
    );
  }

  if (hasError || !displayUrl) {
    // If image could not be loaded as image, render fallback card with download action
    return null;
  }

  return (
    <div className="relative group/att inline-block max-w-full">
      <div
        onClick={() => onOpenPreview(displayUrl)}
        className="msg-attachment-image relative overflow-hidden rounded-xl border border-border shadow-xs cursor-pointer bg-surface"
      >
        <img
          src={displayUrl}
          alt={att.name || "Attachment"}
          className="max-h-48 max-w-xs object-cover rounded-xl hover:scale-[1.02] transition-transform"
          onError={() => setHasError(true)}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="p-1.5 rounded-lg bg-surface text-text text-xs font-medium shadow flex items-center gap-1">
            <ExternalLink size={12} />
            <span>View</span>
          </span>
          <button
            type="button"
            onClick={(e) => onDownload(e, att)}
            disabled={isDownloading}
            className="p-1.5 rounded-lg bg-surface text-text text-xs font-medium shadow hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            title="Download image"
          >
            {isDownloading ? (
              <Loader2 size={12} className="animate-spin text-primary" />
            ) : (
              <Download size={12} />
            )}
          </button>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted max-w-xs truncate">
        <span className="truncate">{att.name}</span>
        {att.size ? <span className="ml-2 shrink-0">{formatFileSize(att.size)}</span> : null}
      </div>
    </div>
  );
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageAttachmentRenderer({
  attachments,
  isSelf = false,
}: MessageAttachmentRendererProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});

  if (!attachments || attachments.length === 0) return null;

  const isImageFile = (att: MessageAttachment) => {
    const mime = att.mimeType || att.type || "";
    if (mime.startsWith("image/")) return true;
    const name = (att.name || "").toLowerCase();
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  };

  const getFileIcon = (att: MessageAttachment) => {
    const name = (att.name || "").toLowerCase();
    const mime = att.mimeType || att.type || "";
    if (mime.includes("pdf") || name.endsWith(".pdf")) {
      return <FileText size={18} className="text-error shrink-0" />;
    }
    if (
      mime.includes("sheet") ||
      mime.includes("excel") ||
      mime.includes("csv") ||
      /\.(xlsx?|csv)$/i.test(name)
    ) {
      return <FileSpreadsheet size={18} className="text-success shrink-0" />;
    }
    if (
      mime.includes("javascript") ||
      mime.includes("json") ||
      mime.includes("html") ||
      /\.(js|ts|tsx|jsx|json|html|css|py)$/i.test(name)
    ) {
      return <FileCode size={18} className="text-primary shrink-0" />;
    }
    return <File size={18} className="text-text-muted shrink-0" />;
  };

  const handleDownload = async (e: React.MouseEvent, att: MessageAttachment) => {
    e.preventDefault();
    e.stopPropagation();

    const fileId = att.fileUploadId || att.id;
    const idKey = fileId || att.name;

    // If att.url is already a fully qualified external/signed url (e.g. S3 presigned URL)
    if (att.url && /^https?:\/\//i.test(att.url) && !att.url.includes("/uploads/")) {
      window.open(att.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (!fileId) {
      if (att.url) {
        window.open(att.url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    setDownloadingIds((prev) => ({ ...prev, [idKey]: true }));
    try {
      // Calls authenticated GET /uploads/:fileUploadId/download and triggers direct download
      await downloadUploadedFile(fileId, att.name);
    } catch (err: any) {
      console.error("Failed to download file via /uploads/:fileUploadId/download:", err);
      // Fallback: If downloadUploadedFile failed, try opening att.url if available
      if (att.url && att.url !== `/uploads/${fileId}/download`) {
        window.open(att.url, "_blank", "noopener,noreferrer");
      } else {
        alert(err?.message || "Failed to download file. Please try again.");
      }
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [idKey]: false }));
    }
  };

  const handlePreviewDocument = async (e: React.MouseEvent, att: MessageAttachment) => {
    e.preventDefault();
    e.stopPropagation();

    const fileId = att.fileUploadId || att.id;
    if (att.url && /^https?:\/\//i.test(att.url) && !att.url.includes("/uploads/")) {
      window.open(att.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (fileId) {
      try {
        const signedUrl = await getUploadDownloadUrl(fileId);
        if (signedUrl) {
          window.open(signedUrl, "_blank", "noopener,noreferrer");
          return;
        }
      } catch (err) {
        console.warn("Failed to get preview URL for document:", err);
      }
    }

    if (att.url) {
      window.open(att.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((att, idx) => {
        const isImg = isImageFile(att);
        const fileId = att.fileUploadId || att.id;
        const idKey = fileId || att.name || String(idx);
        const isDownloading = !!downloadingIds[idKey];

        if (isImg) {
          return (
            <React.Fragment key={att.id || idx}>
              <ImageAttachmentItem
                att={att}
                onOpenPreview={(url) => setPreviewImage(url)}
                onDownload={handleDownload}
                isDownloading={isDownloading}
              />
            </React.Fragment>
          );
        }

        return (
          <div
            key={att.id || idx}
            className={`msg-attachment-card flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
              isSelf
                ? "bg-surface text-text border-border shadow-xs"
                : "bg-surface-hover text-text border-border shadow-xs"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border shrink-0">
                {getFileIcon(att)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text truncate max-w-[180px] md:max-w-[220px]">
                  {att.name || "Attachment"}
                </p>
                <p className="text-[10px] text-text-muted">
                  {formatFileSize(att.size) || "File attachment"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => handlePreviewDocument(e, att)}
                className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors border border-transparent hover:border-border cursor-pointer"
                title={`Preview ${att.name || "file"}`}
              >
                <ExternalLink size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => handleDownload(e, att)}
                disabled={isDownloading}
                className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors border border-transparent hover:border-border cursor-pointer disabled:opacity-50"
                title={`Download ${att.name || "file"}`}
              >
                {isDownloading ? (
                  <Loader2 size={14} className="animate-spin text-primary" />
                ) : (
                  <Download size={14} />
                )}
              </button>
            </div>
          </div>
        );
      })}

      {/* Lightbox Modal for Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden border border-border p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 px-2 border-b border-border">
              <span className="text-xs font-semibold text-text">Image Preview</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  download="attachment-image"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                  title="Open original"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewImage}
                alt="Enlarged attachment"
                className="max-h-[75vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
