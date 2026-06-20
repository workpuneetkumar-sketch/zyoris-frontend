import api from "@/lib/api/api";

// ─── Types ──────────────────────────────────────────────────────────────
export interface Document {
  id: string;
  organizationId: string;
  uploadedById: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  s3Url: string;
  detectedType: string;
  status: string;          // "DONE" | "PROCESSING" | "FAILED"
  rowsTotal: number;
  leadsCreated: number;
  rowsIngested: number;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface LinkEntityPayload {
  entityType: "LEAD" | "DEAL" | "PROJECT";
  entityId: string;
}

// ─── Helper: presigned download URL प्राप्त करें ──────────────────────
export async function getDocumentDownloadUrl(id: string): Promise<string> {
  try {
    const res = await api.get(`/documents/download/${id}`);
    const data = res.data?.data || res.data;
    const url = data.downloadUrl;
    if (!url) throw new Error("No download URL in response");
    return url;
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to get download URL";
    throw new Error(message);
  }
}

// ─── डाउनलोड – a टैग + download एट्रिब्यूट (कोई नया टैब नहीं) ──────
export async function downloadDocument(id: string, fileName: string): Promise<void> {
  try {
    const downloadUrl = await getDocumentDownloadUrl(id);
    // एक invisible a टैग बनाएँ
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;          // इससे ब्राउज़र डाउनलोड करेगा, नेविगेट नहीं
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error: any) {
    throw new Error(error.message || "Download failed");
  }
}

// ─── सभी डॉक्यूमेंट प्राप्त करें ──────────────────────────────────────
export async function getDocuments(): Promise<Document[]> {
  try {
    const res = await api.get("/documents/get-documents");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch documents");
  }
}

// ─── एक डॉक्यूमेंट (ID से) ─────────────────────────────────────────────
export async function getDocumentById(id: string): Promise<Document> {
  const all = await getDocuments();
  const doc = all.find((d) => d.id === id);
  if (!doc) throw new Error("Document not found");
  return doc;
}

// ─── अपलोड ──────────────────────────────────────────────────────────────
export async function uploadDocument(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Document> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Upload failed");
  }
}

// ─── डिलीट ──────────────────────────────────────────────────────────────
export async function deleteDocument(id: string): Promise<void> {
  try {
    await api.delete(`/documents/delete/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete document");
  }
}

// ─── Entity से लिंक करें ───────────────────────────────────────────────
export async function linkDocumentToEntity(
  id: string,
  payload: LinkEntityPayload
): Promise<Document> {
  try {
    const res = await api.patch(`/documents/${id}/link`, payload);
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to link document");
  }
}