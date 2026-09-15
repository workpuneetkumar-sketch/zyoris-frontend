'use client';

import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  Upload,
  Download,
  Eye,
  Trash2,
  Loader2,
  FileCode,
  FileSpreadsheet,
  FileType,
  AlertCircle
} from 'lucide-react';
import { uploadDocument } from '@/lib/api/documentsApi';
import { createAttachment, getAttachmentDownloadUrl, detachAttachment, Attachment } from '@/lib/api/attachmentApi';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface AttachmentBlockProps {
  blockId: string;
  pageId: string;
  blockType: string; // 'attachment' | 'file' | 'image'
  content?: string; // stored text JSON or URL
  formatting?: Record<string, any>;
  canEdit?: boolean;
  onUpdateBlock: (updatedFields: { text?: string; formatting?: Record<string, any> }) => void;
  onDeleteBlock: () => void;
}

export const AttachmentBlock: React.FC<AttachmentBlockProps> = ({
  blockId,
  pageId,
  blockType,
  content = '',
  formatting = {},
  canEdit = true,
  onUpdateBlock,
  onDeleteBlock,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Parsed metadata from formatting or content
  const attachmentId = formatting?.attachmentId;
  const fileName = formatting?.fileName || content || 'Attached File';
  const fileUrl = formatting?.fileUrl;
  const fileType = formatting?.fileType || 'raw';
  const fileSize = formatting?.fileSize;
  const mimeType = formatting?.mimeType || '';

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      // Step 1: Upload raw document to S3/Server
      setUploadProgress(30);
      const docRes = await uploadDocument(file);
      setUploadProgress(70);

      // Step 2: Create formal Attachment link to current page
      let attRes: Attachment | null = null;
      try {
        attRes = await createAttachment({
          fileUploadId: docRes.id,
          entityType: 'PAGE',
          entityId: pageId,
          name: file.name,
        });
      } catch (attErr) {
        console.warn('Failed to bind attachment entity record, continuing with document record:', attErr);
      }

      setUploadProgress(100);

      // Update block formatting and text
      onUpdateBlock({
        text: file.name,
        formatting: {
          ...formatting,
          attachmentId: attRes?.id || docRes.id,
          fileUploadId: docRes.id,
          fileName: file.name,
          fileUrl: docRes.s3Url || '',
          fileSize: file.size,
          mimeType: file.type,
          fileType: file.type.startsWith('image/')
            ? 'image'
            : file.type === 'application/pdf'
            ? 'pdf'
            : 'document',
        },
      });
    } catch (err: any) {
      console.error('Attachment block upload failed:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEdit || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (attachmentId) {
        const downloadUrl = await getAttachmentDownloadUrl(attachmentId);
        if (downloadUrl) {
          window.open(downloadUrl, '_blank');
          return;
        }
      }
      if (fileUrl) {
        window.open(fileUrl, '_blank');
      }
    } catch (err) {
      console.error('Download error:', err);
      if (fileUrl) window.open(fileUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLaunchPreview = () => {
    const fakeItem: Attachment = {
      id: attachmentId || blockId,
      entityType: 'PAGE',
      entityId: pageId,
      name: fileName,
      fileType: fileType,
      fileSize: fileSize,
      fileUpload: {
        id: attachmentId,
        fileName: fileName,
        fileType: mimeType,
        fileSize: fileSize,
        s3Url: fileUrl,
        url: fileUrl,
      },
      createdAt: new Date().toISOString(),
    };
    setPreviewAttachment(fakeItem);
  };

  // Helper icon selector
  const renderFileIcon = () => {
    if (mimeType.startsWith('image/') || blockType === 'image') return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    if (mimeType === 'application/pdf') return <FileType className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (mimeType.includes('json') || mimeType.includes('code') || mimeType.includes('javascript')) return <FileCode className="w-5 h-5 text-amber-500" />;
    return <Paperclip className="w-5 h-5 text-slate-500" />;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // State A: Empty attachment / Upload dropzone state
  if (!fileUrl && !attachmentId && !isUploading) {
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className="my-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 transition-colors"
      >
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Upload {blockType === 'image' ? 'an Image' : 'a File'}
            </p>
            <p className="text-xs text-slate-400">
              Drag & drop here or click to browse
            </p>
          </div>
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Choose File</span>
            <input
              type="file"
              className="hidden"
              accept={blockType === 'image' ? 'image/*' : '*'}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
          </label>
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // State B: Uploading state
  if (isUploading) {
    return (
      <div className="my-2 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <div className="flex-1">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span>Uploading attachment...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State C: Uploaded Attachment Card / Image View
  const isImage = fileType === 'image' || mimeType.startsWith('image/');

  return (
    <div className="my-2 group relative">
      {isImage && fileUrl ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-950">
          <div className="relative max-h-96 flex items-center justify-center bg-slate-950/20">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-96 w-auto object-contain rounded-t-xl"
            />
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white">
              <button
                type="button"
                onClick={handleLaunchPreview}
                title="Preview image"
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                title="Download"
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={onDeleteBlock}
                  title="Remove block"
                  className="p-1.5 hover:bg-red-500/80 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">{fileName}</span>
            <span>{formatBytes(fileSize)}</span>
          </div>
        </div>
      ) : (
        /* File Card */
        <div className="flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-900 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
              {renderFileIcon()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {fileName}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                {fileSize && <span>{formatBytes(fileSize)}</span>}
                {mimeType && <span className="uppercase text-[10px] font-mono">{mimeType.split('/')[1] || mimeType}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <button
              type="button"
              onClick={handleLaunchPreview}
              title="Preview attachment"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              title="Download file"
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={onDeleteBlock}
                title="Remove block"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          isOpen={!!previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
};
