import api from "@/lib/api/api";

export interface FileUploadResponse {
  id: string;
  fileUploadId?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  status: string; // e.g. "PROCESSING", "COMPLETED", "READY", "FAILED", "DONE"
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string;
  s3Url?: string;
  s3Key?: string;
  url?: string;
  downloadUrl?: string;
  [key: string]: any;
}

export interface UploadDownloadUrlResponse {
  url?: string;
  downloadUrl?: string;
  signedUrl?: string;
  s3Url?: string;
  [key: string]: any;
}

/**
 * Upload a file to storage.
 * POST /uploads/file
 *
 * @param file The file to upload (FormData field "file")
 * @param onProgress Optional progress callback (0 - 100)
 */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // NOTE: Do not set manual "Content-Type" header.
  // Axios and browser automatically supply multipart/form-data with boundary.
  const res = await api.post("/uploads/file", formData, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  const raw = res.data?.data || res.data;
  const id = raw?.id || raw?.fileUploadId || "";

  return {
    ...raw,
    id,
    fileUploadId: id,
    fileName: raw?.fileName || raw?.name || file.name,
    fileType: raw?.fileType || raw?.mimeType || file.type,
    fileSize: raw?.fileSize || raw?.size || file.size,
    status: raw?.status || "DONE",
    createdAt: raw?.createdAt || new Date().toISOString(),
  };
}

/**
 * Backward-compatible alias for existing imports
 */
export const uploadLeadsFile = uploadFile;

/**
 * Get the status and processing result of a file upload.
 * GET /uploads/:fileUploadId
 *
 * @param fileUploadId Identifier returned from POST /uploads/file
 */
export async function getUploadStatus(fileUploadId: string): Promise<FileUploadResponse> {
  if (!fileUploadId) {
    throw new Error("fileUploadId is required to fetch upload status");
  }
  const res = await api.get(`/uploads/${encodeURIComponent(fileUploadId)}`);
  const raw = res.data?.data || res.data;
  const id = raw?.id || raw?.fileUploadId || fileUploadId;
  return {
    ...raw,
    id,
    fileUploadId: id,
  };
}

/**
 * Get a temporary signed download URL for an uploaded file.
 * GET /uploads/:fileUploadId/download
 *
 * @param fileUploadId Identifier returned from POST /uploads/file
 * @returns Temporary signed URL string
 */
export async function getUploadDownloadUrl(fileUploadId: string): Promise<string> {
  if (!fileUploadId) {
    throw new Error("fileUploadId is required to obtain download URL");
  }
  const res = await api.get(`/uploads/${encodeURIComponent(fileUploadId)}/download`);
  const data = res.data?.data ?? res.data;

  if (typeof data === "string") {
    return data;
  }

  const url = data?.url || data?.downloadUrl || data?.signedUrl || data?.s3Url;
  if (!url || typeof url !== "string") {
    throw new Error("No download URL returned from /uploads/:fileUploadId/download");
  }
  return url;
}

/**
 * Trigger browser download for an uploaded file using its temporary signed URL.
 * GET /uploads/:fileUploadId/download -> browser download trigger
 *
 * @param fileUploadId Identifier of the uploaded file
 * @param fileName Optional target filename
 */
export async function downloadUploadedFile(fileUploadId: string, fileName?: string): Promise<void> {
  const downloadUrl = await getUploadDownloadUrl(fileUploadId);
  if (!downloadUrl) {
    throw new Error("Failed to resolve download URL");
  }

  if (typeof window !== "undefined") {
    const link = document.createElement("a");
    link.href = downloadUrl;
    if (fileName) {
      link.download = fileName;
    }
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

/**
 * Polls GET /uploads/:fileUploadId until status is complete or ready.
 *
 * @param fileUploadId Identifier of the uploaded file
 * @param maxAttempts Max poll retries (default 10)
 * @param intervalMs Delay between polls in ms (default 1500ms)
 */
export async function waitForUploadReady(
  fileUploadId: string,
  maxAttempts: number = 10,
  intervalMs: number = 1500
): Promise<FileUploadResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusRes = await getUploadStatus(fileUploadId);
    const st = (statusRes.status || "").toUpperCase();
    if (st === "COMPLETED" || st === "READY" || st === "DONE" || st === "SUCCESS") {
      return statusRes;
    }
    if (st === "FAILED" || st === "ERROR") {
      throw new Error(`Upload processing failed with status: ${statusRes.status}`);
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return await getUploadStatus(fileUploadId);
}
