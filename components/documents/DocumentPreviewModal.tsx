"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Download,
  Loader,
  AlertCircle,
  FileQuestion,
  ExternalLink,
} from "lucide-react";
import { Document, getDocumentDownloadUrl } from "@/lib/api/documentsApi";

interface DocumentPreviewModalProps {
  doc: Document | null;
  isOpen: boolean;
  onClose: () => void;
  canDownload: boolean;
  onDownload: (doc: Document) => void;
  formatBytes: (bytes: number) => string;
  fileCategory: (fileType: string) => string;
}

type PreviewKind = "image" | "pdf" | "text" | "unsupported";

function resolveKind(doc: Document): PreviewKind {
  const type = (doc.fileType || "").toLowerCase();
  const name = (doc.fileName || "").toLowerCase();

  if (type.startsWith("image/")) return "image";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";

  const textExts = [".txt", ".csv", ".json", ".md", ".log", ".xml", ".yml", ".yaml"];
  if (type.startsWith("text/") || textExts.some((ext) => name.endsWith(ext))) {
    return "text";
  }
  return "unsupported";
}

export default function DocumentPreviewModal({
  doc,
  isOpen,
  onClose,
  canDownload,
  onDownload,
  formatBytes,
  fileCategory,
}: DocumentPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = doc ? resolveKind(doc) : "unsupported";

  useEffect(() => {
    if (!isOpen || !doc) {
      setUrl(null);
      setTextContent(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setTextContent(null);
      setUrl(null);
      try {
        const signedUrl = await getDocumentDownloadUrl(doc.id);
        if (cancelled) return;
        setUrl(signedUrl);

        if (resolveKind(doc) === "text") {
          const res = await fetch(signedUrl);
          if (!res.ok) throw new Error("Failed to load file content");
          const text = await res.text();
          if (cancelled) return;
          // Guard against huge files locking the UI.
          setTextContent(text.slice(0, 100_000));
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !doc) return null;

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
          <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading preview…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-sm font-medium text-red-600">{error}</p>
          {canDownload && (
            <button
              onClick={() => onDownload(doc)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Download size={16} /> Download instead
            </button>
          )}
        </div>
      );
    }

    if (kind === "image" && url) {
      return (
        <div className="flex items-center justify-center bg-gray-900/5 rounded-xl p-4 min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={doc.fileName}
            className="max-w-full max-h-[70vh] rounded-lg object-contain"
          />
        </div>
      );
    }

    if (kind === "pdf" && url) {
      return (
        <iframe
          src={url}
          title={doc.fileName}
          className="w-full h-[70vh] rounded-xl border border-gray-200 bg-white"
        />
      );
    }

    if (kind === "text") {
      return (
        <pre className="w-full max-h-[70vh] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800 whitespace-pre-wrap break-words">
          {textContent ?? ""}
        </pre>
      );
    }

    // Unsupported → download fallback
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <FileQuestion className="w-14 h-14 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">
          Preview isn&apos;t available for this file type
        </p>
        <p className="text-xs text-gray-500">
          {fileCategory(doc.fileType)} · {formatBytes(doc.fileSize)}
        </p>
        {canDownload ? (
          <button
            onClick={() => onDownload(doc)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Download size={16} /> Download file
          </button>
        ) : (
          <p className="mt-2 text-xs text-gray-400">
            You don&apos;t have permission to download this file.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h3
              className="text-lg font-semibold text-gray-900 truncate"
              title={doc.fileName}
            >
              {doc.fileName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {fileCategory(doc.fileType)} · {formatBytes(doc.fileSize)}
              {doc.uploadedBy?.name ? ` · Uploaded by ${doc.uploadedBy.name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canDownload && (
              <>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    title="Open in new tab"
                  >
                    <ExternalLink size={16} />
                    <span className="hidden sm:inline">Open</span>
                  </a>
                )}
                <button
                  onClick={() => onDownload(doc)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-auto">{renderBody()}</div>
      </div>
    </div>
  );
}
