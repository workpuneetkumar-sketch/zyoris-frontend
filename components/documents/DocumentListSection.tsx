"use client";

import React from "react";
import {
  Search,
  RefreshCw,
  Grid,
  List,
  FolderTree,
  Files,
  Clock,
  Link,
  HardDrive,
  AlertCircle,
  Eye,
  Download,
  Info,
  File,
  Trash2,
} from "lucide-react";
import { Document } from "@/lib/api/documentsApi";
import { DocumentPermissions } from "@/utils/documentPermissions";
import DocumentCard from "./DocumentCard";
import DocumentFolderView from "./DocumentFolderView";

interface DocumentListSectionProps {
  documents: Document[];
  loading: boolean;
  error: string | null;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  layout: "flat" | "folder";
  setLayout: (layout: "flat" | "folder") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  fileTypeFilter: string;
  setFileTypeFilter: (f: string) => void;
  dateFilter: string;
  setDateFilter: (d: string) => void;
  loadDocuments: () => void;
  filteredDocs: Document[];
  totalDocs: number;
  uploadedToday: number;
  linkedDocs: number;
  totalStorage: number;
  perms: DocumentPermissions;
  formatBytes: (bytes: number) => string;
  fileCategory: (fileType: string) => string;
  getFileIcon: (fileType: string) => React.ComponentType<any>;
  StatusBadge: React.FC<{ status: string }>;
  Skeleton: React.FC<{ className?: string }>;
  handlePreview: (doc: Document) => void;
  handleViewDetail: (doc: Document) => void;
  handleDownload: (doc: Document) => void;
  setSelectedDoc: (doc: Document) => void;
  setShowLinkModal: (show: boolean) => void;
  setShowDeleteModal: (show: boolean) => void;
}

export default function DocumentListSection(props: DocumentListSectionProps) {
  const {
    loading,
    error,
    viewMode,
    setViewMode,
    layout,
    setLayout,
    searchQuery,
    setSearchQuery,
    fileTypeFilter,
    setFileTypeFilter,
    dateFilter,
    setDateFilter,
    loadDocuments,
    filteredDocs,
    totalDocs,
    uploadedToday,
    linkedDocs,
    totalStorage,
    perms,
    formatBytes,
    fileCategory,
    getFileIcon,
    StatusBadge,
    Skeleton,
    handlePreview,
    handleViewDetail,
    handleDownload,
    setSelectedDoc,
    setShowLinkModal,
    setShowDeleteModal,
  } = props;

  const requestDelete = (doc: Document) => {
    setSelectedDoc(doc);
    setShowDeleteModal(true);
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Documents", value: totalDocs, icon: Files, color: "text-indigo-600 bg-indigo-50" },
          { label: "Uploaded Today", value: uploadedToday, icon: Clock, color: "text-emerald-600 bg-emerald-50" },
          { label: "Linked Documents", value: linkedDocs, icon: Link, color: "text-blue-600 bg-blue-50" },
          { label: "Storage Used", value: formatBytes(totalStorage), icon: HardDrive, color: "text-amber-600 bg-amber-50" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
        <select
          value={fileTypeFilter}
          onChange={(e) => setFileTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white cursor-pointer"
        >
          <option value="ALL">All Types</option>
          <option value="image/">Images</option>
          <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
            Spreadsheets
          </option>
          <option value="video/">Videos</option>
          <option value="application/pdf">PDFs</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white cursor-pointer"
        >
          <option value="ALL">Any Date</option>
          <option value="TODAY">Today</option>
          <option value="7D">Last 7 days</option>
          <option value="30D">Last 30 days</option>
        </select>

        {/* Layout: Folders vs Flat */}
        <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-white">
          <button
            onClick={() => setLayout("folder")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium ${
              layout === "folder" ? "bg-indigo-100 text-indigo-600" : "text-gray-500"
            }`}
            title="Folder view"
          >
            <FolderTree size={16} />
            <span className="hidden sm:inline">Folders</span>
          </button>
          <button
            onClick={() => setLayout("flat")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium ${
              layout === "flat" ? "bg-indigo-100 text-indigo-600" : "text-gray-500"
            }`}
            title="All documents"
          >
            <Files size={16} />
            <span className="hidden sm:inline">All</span>
          </button>
        </div>

        {/* Grid / List (only meaningful in flat layout) */}
        {layout === "flat" && (
          <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-white">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-indigo-100 text-indigo-600" : "text-gray-500"}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg ${viewMode === "list" ? "bg-indigo-100 text-indigo-600" : "text-gray-500"}`}
            >
              <List size={18} />
            </button>
          </div>
        )}
        <button
          onClick={loadDocuments}
          disabled={loading}
          className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Document List / Grid / Folders */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={loadDocuments} className="mt-4 text-indigo-600 font-semibold">
            Try again
          </button>
        </div>
      ) : layout === "folder" ? (
        <DocumentFolderView
          documents={filteredDocs}
          perms={perms}
          formatBytes={formatBytes}
          fileCategory={fileCategory}
          getFileIcon={getFileIcon}
          StatusBadge={StatusBadge}
          handlePreview={handlePreview}
          handleViewDetail={handleViewDetail}
          handleDownload={handleDownload}
          onDeleteRequest={requestDelete}
        />
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <File className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No documents found</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFileTypeFilter("ALL");
              setDateFilter("ALL");
            }}
            className="mt-2 text-indigo-600 font-semibold"
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredDocs.map((doc) => (
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
              onDeleteRequest={requestDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["File Name", "Type", "Size", "Status", "Uploaded", "Uploaded By", ""].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocs.map((doc) => {
                  const Icon = getFileIcon(doc.fileType);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Icon className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">{formatBytes(doc.fileSize)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{fileCategory(doc.fileType)}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatBytes(doc.fileSize)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {doc.uploadedBy?.name || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {perms.canPreview && (
                            <button
                              onClick={() => handlePreview(doc)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              title="Preview"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {perms.canDownload && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetail(doc)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="Details"
                          >
                            <Info size={16} />
                          </button>
                          {perms.canLink && (
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowLinkModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              title="Link to Entity"
                            >
                              <Link size={16} />
                            </button>
                          )}
                          {perms.canDelete && (
                            <button
                              onClick={() => requestDelete(doc)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredDocs.map((doc) => {
              const Icon = getFileIcon(doc.fileType);
              return (
                <div key={doc.id} className="p-4 flex items-center gap-4">
                  <Icon className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{fileCategory(doc.fileType)}</span>
                      <span>•</span>
                      <span>{formatBytes(doc.fileSize)}</span>
                      <span>•</span>
                      <StatusBadge status={doc.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {perms.canPreview && (
                      <button onClick={() => handlePreview(doc)} className="p-1.5 text-gray-500">
                        <Eye size={16} />
                      </button>
                    )}
                    {perms.canDownload && (
                      <button onClick={() => handleDownload(doc)} className="p-1.5 text-gray-500">
                        <Download size={16} />
                      </button>
                    )}
                    {perms.canDelete && (
                      <button
                        onClick={() => requestDelete(doc)}
                        className="p-1.5 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
