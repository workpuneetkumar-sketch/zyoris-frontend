"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, Folder } from "lucide-react";
import { Document } from "@/lib/api/documentsApi";
import { DocumentPermissions } from "@/utils/documentPermissions";
import DocumentCard from "./DocumentCard";

interface DocumentFolderViewProps {
  documents: Document[];
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

interface FolderBucket {
  category: string;
  docs: Document[];
  totalSize: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  PDF: "text-red-500 bg-red-50",
  Image: "text-emerald-500 bg-emerald-50",
  Spreadsheet: "text-green-600 bg-green-50",
  Video: "text-purple-500 bg-purple-50",
  Archive: "text-amber-500 bg-amber-50",
  Other: "text-gray-500 bg-gray-100",
};

/**
 * Folder-based explorer. The backend has no folder field, so folders are
 * derived from `fileCategory()`. Root shows folder cards; opening one shows
 * its documents with a Back button.
 */
export default function DocumentFolderView({
  documents,
  perms,
  formatBytes,
  fileCategory,
  getFileIcon,
  StatusBadge,
  handlePreview,
  handleViewDetail,
  handleDownload,
  onDeleteRequest,
}: DocumentFolderViewProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const folders = useMemo<FolderBucket[]>(() => {
    const map = new Map<string, FolderBucket>();
    for (const doc of documents) {
      const category = fileCategory(doc.fileType);
      const bucket = map.get(category) || { category, docs: [], totalSize: 0 };
      bucket.docs.push(doc);
      bucket.totalSize += doc.fileSize;
      map.set(category, bucket);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.category.localeCompare(b.category)
    );
  }, [documents, fileCategory]);

  const activeFolder = folders.find((f) => f.category === openCategory) || null;

  // ─── Open folder: show its documents ───
  if (activeFolder) {
    return (
      <div>
        {/* Breadcrumb + Back */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setOpenCategory(null)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="text-sm text-gray-500">
            <span
              className="hover:text-gray-700 cursor-pointer"
              onClick={() => setOpenCategory(null)}
            >
              All Documents
            </span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-gray-800">
              {activeFolder.category}
            </span>
            <span className="ml-2 text-gray-400">
              ({activeFolder.docs.length})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {activeFolder.docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              perms={perms}
              formatBytes={formatBytes}
              fileCategory={fileCategory}
              getFileIcon={getFileIcon}
              StatusBadge={StatusBadge}
              handlePreview={handlePreview}
              handleViewDetail={handleViewDetail}
              handleDownload={handleDownload}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Root: folder cards ───
  if (folders.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
        <Folder className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">No documents found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {folders.map((folder) => (
        <button
          key={folder.category}
          onClick={() => setOpenCategory(folder.category)}
          className="text-left bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className={`p-3 rounded-xl ${
                CATEGORY_COLORS[folder.category] || CATEGORY_COLORS.Other
              }`}
            >
              <Folder className="w-7 h-7" />
            </div>
            <span className="text-xs font-semibold text-gray-400">
              {folder.docs.length} file{folder.docs.length !== 1 ? "s" : ""}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{folder.category}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {formatBytes(folder.totalSize)}
          </p>
        </button>
      ))}
    </div>
  );
}
