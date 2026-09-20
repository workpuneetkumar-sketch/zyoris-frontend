"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Attachment, getAttachmentPreview, getAttachmentDownloadUrl } from "@/lib/api/attachmentApi";
import {
  X,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  HardDrive,
  Calendar,
  Layers,
  Archive,
} from "lucide-react";

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  attachment: Attachment | null;
  onClose: () => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  isOpen,
  attachment,
  onClose,
}) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("UNSUPPORTED");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !attachment) {
      setPreviewUrl(null);
      setPreviewType("UNSUPPORTED");
      setIsLoading(false);
      setError(null);
      setZoomLevel(1);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadPreview() {
      try {
        const res = await getAttachmentPreview(attachment!.id);
        if (!isMounted) return;

        let derivedType = res.previewType ? res.previewType.toUpperCase() : "UNSUPPORTED";
        const fileExt = (attachment!.name || "").split(".").pop()?.toLowerCase() || "";
        const fallbackUrl =
          attachment!.fileUpload?.s3Url ||
          attachment!.fileUpload?.url ||
          (attachment!.metadata as any)?.s3Url ||
          (attachment!.metadata as any)?.objectUrl;
        const targetUrl = res.previewUrl || fallbackUrl || null;

        if (
          derivedType === "IMAGE" ||
          ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(fileExt)
        ) {
          derivedType = "IMAGE";
        } else if (derivedType === "PDF" || fileExt === "pdf") {
          derivedType = "PDF";
        }

        setPreviewType(derivedType);
        setPreviewUrl(targetUrl);
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Signed preview fetch notice:", err);
        const fallbackUrl =
          attachment!.fileUpload?.s3Url ||
          attachment!.fileUpload?.url ||
          (attachment!.metadata as any)?.s3Url ||
          (attachment!.metadata as any)?.objectUrl;
        const fileExt = (attachment!.name || "").split(".").pop()?.toLowerCase() || "";
        if (fallbackUrl && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(fileExt)) {
          setPreviewType("IMAGE");
          setPreviewUrl(fallbackUrl);
        } else if (fallbackUrl && fileExt === "pdf") {
          setPreviewType("PDF");
          setPreviewUrl(fallbackUrl);
        } else {
          setPreviewType("UNSUPPORTED");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, attachment]);

  if (!isOpen || !attachment) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const url = await getAttachmentDownloadUrl(attachment.id);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Download failed:", err);
      alert(err.message || "Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen || !attachment || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Main Preview Screen */}
        <div className="flex-1 bg-slate-950 flex flex-col min-w-0 relative overflow-hidden">
          {/* Top Control Bar */}
          <div className="h-14 px-4 bg-slate-900/80 backdrop-blur-xs border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <Eye className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-200 truncate max-w-xs md:max-w-md">
                {attachment.name}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {previewType === "IMAGE" && (
                <div className="flex items-center space-x-1 bg-slate-800 rounded-xl p-1 text-slate-300">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 hover:bg-slate-700 rounded-lg transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1 min-w-[36px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="p-1 hover:bg-slate-700 rounded-lg transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-slate-700 rounded-lg transition"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Canvas Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
            {isLoading ? (
              <div className="flex flex-col items-center space-y-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-xs font-medium">Generating secure preview...</span>
              </div>
            ) : error ? (
              <div className="text-center p-6 max-w-sm">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium mb-3">{error}</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Download File Directly
                </button>
              </div>
            ) : previewType === "IMAGE" && previewUrl ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto">
                <img
                  src={previewUrl}
                  alt={attachment.name}
                  style={{ transform: `scale(${zoomLevel})` }}
                  className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out rounded-lg shadow-2xl"
                />
              </div>
            ) : previewType === "PDF" && previewUrl ? (
              <iframe
                src={previewUrl}
                title={attachment.name}
                className="w-full h-full border-none rounded-xl bg-white"
              />
            ) : (
              <div className="text-center p-8 bg-slate-900/60 border border-slate-800 rounded-3xl max-w-md">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-200 mb-1">
                  Preview Not Available
                </h4>
                <p className="text-xs text-slate-400 mb-6">
                  Preview is not supported for this file format ({attachment.fileType || "document"}). You can download it directly.
                </p>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download File</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Metadata Sidebar */}
        <div className="w-full md:w-80 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Attachment Details
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 break-words">
                {attachment.name}
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center space-x-2">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  <span>Size</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {formatFileSize(attachment.fileSize)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center space-x-2">
                  <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Type</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 uppercase">
                  {attachment.fileType || "File"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Attached To</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {attachment.entityType}
                </span>
              </div>

              {attachment.createdAt && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Created</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {new Date(attachment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {attachment.isArchived && (
                <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-semibold py-1">
                  <Archive className="w-3.5 h-3.5" />
                  <span>This attachment is archived</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition shadow-sm"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Signed File</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
