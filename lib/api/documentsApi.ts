import api from "@/lib/api/api"; // your pre-configured axios instance

// ── Types ───────────────────────────────────────────────────────────────
export interface Document {
  id: string;
  organizationId: string;
  uploadedById: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  s3Url: string;           // may be private – don't use directly for download
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

// ── API Methods ──────────────────────────────────────────────────────────

/** Fetch all documents */
export async function getDocuments(): Promise<Document[]> {
  try {
    const res = await api.get("/documents/get-documents");
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch documents");
  }
}

/** Get single document by ID (simulated via full list – replace with real endpoint if available) */
export async function getDocumentById(id: string): Promise<Document> {
  const all = await getDocuments();
  const doc = all.find((d) => d.id === id);
  if (!doc) throw new Error("Document not found");
  return doc;
}

/** Upload a file (with optional progress callback) */
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
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percent);
        }
      },
    });
    return res.data?.data || res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Upload failed");
  }
}

/** Delete a document */
export async function deleteDocument(id: string): Promise<void> {
  try {
    await api.delete(`/documents/delete/${id}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete document");
  }
}

/**
 * Download a document securely.
 * Fetches the file as a blob with auth headers, then triggers a browser download.
 */
export async function downloadDocument(id: string, fileName: string): Promise<void> {
  try {
    const response = await api.get(`/documents/download/${id}`, {
      responseType: "blob",
    });

    // Create a blob URL and force download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    // If the backend returns an error as JSON, parse it (error.response.data may be a blob)
    let message = "Failed to download document";
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        message = parsed.message || message;
      } catch {}
    }
    throw new Error(message);
  }
}

/** Link a document to an entity (Lead, Deal, Project) */
export async function linkDocumentToEntity(
  id: string,
  payload: LinkEntityPayload
): Promise<Document> {
  try {
    const res = await api.patch(`/documents/${id}/link`, payload);
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error("Link document error:", error.response?.status, error.response?.data);
    throw new Error(error.response?.data?.message || "Failed to link document");
  }
}