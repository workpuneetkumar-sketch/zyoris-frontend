"use client";

import React from "react";
import { Eye, Download, Info, Trash2 } from "lucide-react";
import { Document } from "@/lib/api/documentsApi";
import { DocumentPermissions } from "@/utils/documentPermissions";

interface DocumentCardProps {
  doc: Document;
  perms: DocumentPermissions;
  formatBytes: (bytes: number) => string;
  fileCategory: (fileType: string) => string;
  getFileIcon: (fileType: string) => React.ComponentType<any>;
  StatusBadge: React.FC<{ status: string }>;
  handlePreview: (doc: Document) => void;
  handleViewDetail: (doc: Document) => void;
  handleDownload: (doc: Document) => void;
  onDeleteRequest: (doc: Document) => void;
}

/**
 * Reusable document tile used by both the flat grid and the folder-open grid.
 * Action buttons are permission-gated.
 */
export default function DocumentCard({
  doc,
  perms,
  formatBytes,
  fileCategory,
  getFileIcon,
  StatusBadge,
  handlePreview,
  handleViewDetail,
  handleDownload,
  onDeleteRequest,
}: DocumentCardProps) {
  const Icon = getFileIcon(doc.fileType);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <button
          onClick={() => perms.canPreview && handlePreview(doc)}
          className="p-2 bg-gray-50 rounded-lg"
          title={perms.canPreview ? "Preview" : "File"}
        >
          <Icon className="w-8 h-8 text-indigo-500" />
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {perms.canPreview && (
            <button
              onClick={() => handlePreview(doc)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              title="Preview"
            >
              <Eye size={15} />
            </button>
          )}
          {perms.canDownload && (
            <button
              onClick={() => handleDownload(doc)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              title="Download"
            >
              <Download size={15} />
            </button>
          )}
          <button
            onClick={() => handleViewDetail(doc)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
            title="Details"
          >
            <Info size={15} />
          </button>
          {perms.canDelete && (
            <button
              onClick={() => onDeleteRequest(doc)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <h3
        className="font-medium text-gray-900 text-sm truncate"
        title={doc.fileName}
      >
        {doc.fileName}
      </h3>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>{fileCategory(doc.fileType)}</span>
        <span>•</span>
        <span>{formatBytes(doc.fileSize)}</span>
      </div>
      {doc.uploadedBy?.name && (
        <p className="mt-1 text-xs text-gray-400 truncate">
          By {doc.uploadedBy.name}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={doc.status} />
        <span className="text-xs text-gray-400">
          {new Date(doc.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
