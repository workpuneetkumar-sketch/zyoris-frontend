"use client";

import React, { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Download,
  FileSpreadsheet,
  FileCode,
  File,
  ExternalLink,
  X,
} from "lucide-react";
import { MessageAttachment } from "@/types/connect";

interface MessageAttachmentRendererProps {
  attachments?: MessageAttachment[];
  isSelf?: boolean;
}

export default function MessageAttachmentRenderer({
  attachments,
  isSelf = false,
}: MessageAttachmentRendererProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const isImageFile = (att: MessageAttachment) => {
    const mime = att.mimeType || att.type || "";
    if (mime.startsWith("image/")) return true;
    const name = (att.name || "").toLowerCase();
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((att, idx) => {
        const isImg = isImageFile(att);
        const downloadUrl = att.url || `/uploads/${att.fileUploadId || att.id}/download`;

        if (isImg && att.url) {
          return (
            <div key={att.id || idx} className="relative group/att inline-block max-w-full">
              <div
                onClick={() => setPreviewImage(att.url || null)}
                className="msg-attachment-image relative overflow-hidden rounded-xl border border-border shadow-xs cursor-pointer bg-surface"
              >
                <img
                  src={att.url}
                  alt={att.name || "Attachment"}
                  className="max-h-48 max-w-xs object-cover rounded-xl hover:scale-[1.02] transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="p-1.5 rounded-lg bg-surface text-text text-xs font-medium shadow flex items-center gap-1">
                    <ExternalLink size={12} />
                    <span>View</span>
                  </span>
                  <a
                    href={downloadUrl}
                    download={att.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-surface text-text text-xs font-medium shadow hover:text-primary transition-colors"
                    title="Download image"
                  >
                    <Download size={12} />
                  </a>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted max-w-xs truncate">
                <span className="truncate">{att.name}</span>
                {att.size ? <span className="ml-2 shrink-0">{formatFileSize(att.size)}</span> : null}
              </div>
            </div>
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

            <a
              href={downloadUrl}
              download={att.name}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors shrink-0 border border-transparent hover:border-border"
              title={`Download ${att.name || "file"}`}
            >
              <Download size={14} />
            </a>
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
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              >
                <X size={16} />
              </button>
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
