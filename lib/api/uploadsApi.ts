import api from "@/lib/api/api";

export interface FileUploadResponse {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  createdAt: string;
}

/**
 * Upload a file for lead ingestion.
 * POST /uploads/file
 */
export async function uploadLeadsFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<FileUploadResponse>("/uploads/file", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

/**
 * Get file upload status.
 * GET /uploads/{fileUploadId}
 */
export async function getUploadStatus(fileUploadId: string): Promise<FileUploadResponse> {
  const res = await api.get<FileUploadResponse>(`/uploads/${fileUploadId}`);
  return res.data;
}
