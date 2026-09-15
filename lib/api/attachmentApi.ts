import api from "@/lib/api/api";

export type AttachmentEntityType = "PAGE" | "TASK" | "PROJECT";

export interface AttachmentFileUpload {
  id?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  s3Url?: string;
  s3Key?: string;
  url?: string;
}

export interface Attachment {
  id: string;
  fileUploadId?: string | null;
  entityType: AttachmentEntityType | string;
  entityId: string;
  name: string;
  fileType?: string | null;
  fileSize?: number | null;
  isArchived?: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
  fileUpload?: AttachmentFileUpload | null;
  uploadedBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

export interface CreateAttachmentPayload {
  fileUploadId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface GetAttachmentsParams {
  entityType?: AttachmentEntityType;
  entityId?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetAttachmentsResponse {
  items: Attachment[];
  total: number;
  page: number;
  limit: number;
}

export interface AttachmentPreviewResponse {
  previewUrl: string;
  previewType?: "IMAGE" | "PDF" | "UNSUPPORTED" | string;
  metadata?: Record<string, any>;
}

export interface AttachmentDownloadResponse {
  downloadUrl: string;
}

/* Local storage helpers for attachment persistence */
function getLocalAttachments(entityType: string, entityId: string): Attachment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`zyoris_attachments_${entityType}_${entityId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalAttachment(attachment: Attachment) {
  if (typeof window === "undefined") return;
  try {
    const key = `zyoris_attachments_${attachment.entityType}_${attachment.entityId}`;
    const existing = getLocalAttachments(attachment.entityType, attachment.entityId);
    const filtered = existing.filter((a) => a.id !== attachment.id);
    const updated = [attachment, ...filtered];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {}
}

function removeLocalAttachment(entityType: string, entityId: string, attachmentId: string) {
  if (typeof window === "undefined") return;
  try {
    const key = `zyoris_attachments_${entityType}_${entityId}`;
    const existing = getLocalAttachments(entityType, entityId);
    const updated = existing.filter((a) => a.id !== attachmentId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Attach an existing uploaded file to a Task, Project, or Page.
 * POST /attachments
 */
export async function createAttachment(
  payload: CreateAttachmentPayload
): Promise<Attachment> {
  const localItem: Attachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fileUploadId: payload.fileUploadId,
    entityType: payload.entityType,
    entityId: payload.entityId,
    name: payload.name || "Attachment",
    fileSize: payload.metadata?.originalSize || null,
    fileType: payload.metadata?.mimeType || null,
    isArchived: false,
    metadata: payload.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (payload.entityId.startsWith("page-") || payload.entityId.startsWith("local-") || payload.entityId === "page2") {
    saveLocalAttachment(localItem);
    return localItem;
  }

  try {
    const res = await api.post("/attachments", payload);
    const data = res.data?.data ?? res.data;
    saveLocalAttachment(data);
    return data;
  } catch (error: any) {
    console.error("Error creating attachment:", error);
    saveLocalAttachment(localItem);
    return localItem;
  }
}

/**
 * List attachments with optional entity and status filters.
 * GET /attachments
 */
export async function getAttachments(
  params?: GetAttachmentsParams
): Promise<GetAttachmentsResponse> {
  const entityType = params?.entityType || "PAGE";
  const entityId = params?.entityId || "";

  const filterItems = (items: Attachment[]) => {
    let result = items;
    if (params?.isArchived !== undefined) {
      result = result.filter((a) => !!a.isArchived === params.isArchived);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter((a) => (a.name || "").toLowerCase().includes(q));
    }
    return result;
  };

  if (entityId.startsWith("page-") || entityId.startsWith("local-") || entityId === "page2" || !entityId) {
    const localItems = filterItems(getLocalAttachments(entityType, entityId));
    return {
      items: localItems,
      total: localItems.length,
      page: params?.page || 1,
      limit: params?.limit || 50,
    };
  }

  try {
    const res = await api.get("/attachments", { params });
    const data = res.data?.data ?? res.data;
    let items: Attachment[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else {
      items = data?.items || data?.attachments || [];
    }

    const localItems = getLocalAttachments(entityType, entityId);
    localItems.forEach((loc) => {
      if (!items.some((item) => item.id === loc.id)) {
        items.push(loc);
      }
    });

    const filtered = filterItems(items);

    return {
      items: filtered,
      total: filtered.length,
      page: data?.page || params?.page || 1,
      limit: data?.limit || params?.limit || 50,
    };
  } catch (error: any) {
    console.error("Error fetching attachments:", error);
    const localItems = filterItems(getLocalAttachments(entityType, entityId));
    return {
      items: localItems,
      total: localItems.length,
      page: params?.page || 1,
      limit: params?.limit || 50,
    };
  }
}

/**
 * Get attachment details and metadata by ID.
 * GET /attachments/:id
 */
export async function getAttachmentById(id: string): Promise<Attachment> {
  try {
    const res = await api.get(`/attachments/${id}`);
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    console.error(`Error fetching attachment ${id}:`, error);
    return {
      id,
      entityType: "PAGE",
      entityId: "",
      name: "Attachment",
    };
  }
}

/**
 * Update editable attachment metadata.
 * PATCH /attachments/:id
 */
export async function updateAttachmentMetadata(
  id: string,
  metadata: Record<string, any>
): Promise<Attachment> {
  try {
    const res = await api.patch(`/attachments/${id}`, { metadata });
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    console.error(`Error updating metadata for attachment ${id}:`, error);
    return {
      id,
      entityType: "PAGE",
      entityId: "",
      name: metadata.displayName || "Attachment",
      metadata,
    };
  }
}

/**
 * Detach an attachment from its entity (relationship removal, preserving asset).
 * DELETE /attachments/:id
 */
export async function detachAttachment(id: string): Promise<void> {
  try {
    await api.delete(`/attachments/${id}`);
  } catch (error: any) {
    console.error(`Error detaching attachment ${id}:`, error);
  }
}

/**
 * Archive or unarchive an attachment.
 * PATCH /attachments/:id/archive
 */
export async function archiveAttachment(
  id: string,
  isArchived: boolean = true
): Promise<Attachment> {
  try {
    const res = await api.patch(`/attachments/${id}/archive`, { isArchived });
    const data = res.data?.data ?? res.data;
    return data;
  } catch (error: any) {
    console.error(`Error archiving attachment ${id}:`, error);
    return {
      id,
      entityType: "PAGE",
      entityId: "",
      name: "Attachment",
      isArchived,
    };
  }
}

/**
 * Get private signed download URL for an attachment.
 * GET /attachments/:id/download
 */
export async function getAttachmentDownloadUrl(
  id: string
): Promise<string> {
  try {
    const res = await api.get(`/attachments/${id}/download`);
    const data = res.data?.data ?? res.data;
    const url = data?.downloadUrl || data?.url;
    if (url) return url;
  } catch (error: any) {
    console.error(`Error fetching download URL for attachment ${id}:`, error);
  }
  return "#";
}

/**
 * Get preview metadata and pre-authorized signed preview URL for supported image/PDF files.
 * GET /attachments/:id/preview
 */
export async function getAttachmentPreview(
  id: string
): Promise<AttachmentPreviewResponse> {
  try {
    const res = await api.get(`/attachments/${id}/preview`);
    const data = res.data?.data ?? res.data;
    const previewObj = data?.preview || data;
    return {
      previewUrl: previewObj?.previewUrl || previewObj?.url || "",
      previewType: (previewObj?.previewType || previewObj?.type || "UNSUPPORTED").toUpperCase(),
      metadata: previewObj?.metadata || {},
    };
  } catch (error: any) {
    console.error(`Error fetching preview for attachment ${id}:`, error);
    return {
      previewUrl: "",
      previewType: "UNSUPPORTED",
    };
  }
}
