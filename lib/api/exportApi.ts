import api from "@/lib/api/api";

export type ExportFormat = "CSV" | "XLSX" | "MARKDOWN" | "HTML" | "PDF";
export type ExportEntityType = "PAGE" | "TASK" | "PROJECT";

export interface CreateExportPayload {
  entityType: ExportEntityType;
  entityId?: string;
  format: ExportFormat;
  options?: Record<string, any>;
}

export interface ExportResponse {
  exportUrl?: string;
  downloadUrl?: string;
  status?: string;
  fileName?: string;
  content?: string;
}

/**
 * Trigger export for Task, Project, or Page data.
 * POST /exports
 */
export async function createExport(
  payload: CreateExportPayload
): Promise<ExportResponse> {
  try {
    const res = await api.post("/exports", payload, {
      responseType: payload.format === "PDF" || payload.format === "XLSX" ? "blob" : "json",
    });

    if (res.data instanceof Blob) {
      const mimeTypes: Record<ExportFormat, string> = {
        CSV: "text/csv",
        XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        MARKDOWN: "text/markdown",
        HTML: "text/html",
        PDF: "application/pdf",
      };
      const blob = new Blob([res.data], { type: mimeTypes[payload.format] || "application/octet-stream" });
      const blobUrl = URL.createObjectURL(blob);
      return { exportUrl: blobUrl, status: "COMPLETED" };
    }

    const data = res.data?.data ?? res.data;
    return {
      exportUrl: data?.exportUrl || data?.downloadUrl || data?.url,
      status: data?.status || "COMPLETED",
      fileName: data?.fileName,
      content: data?.content,
    };
  } catch (error: any) {
    console.error("Error generating export:", error);
    throw new Error(
      error?.response?.data?.message || "Failed to generate export file"
    );
  }
}

/**
 * Quick export for a specific entity.
 * GET /exports/:entityType/:entityId?format=:format
 */
export async function quickExport(
  entityType: ExportEntityType,
  entityId: string,
  format: ExportFormat = "CSV"
): Promise<ExportResponse> {
  try {
    const res = await api.get(`/exports/${entityType}/${entityId}`, {
      params: { format },
      responseType: format === "PDF" || format === "XLSX" ? "blob" : "json",
    });

    if (res.data instanceof Blob) {
      const mimeTypes: Record<ExportFormat, string> = {
        CSV: "text/csv",
        XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        MARKDOWN: "text/markdown",
        HTML: "text/html",
        PDF: "application/pdf",
      };
      const blob = new Blob([res.data], { type: mimeTypes[format] || "application/octet-stream" });
      const blobUrl = URL.createObjectURL(blob);
      return { exportUrl: blobUrl, status: "COMPLETED" };
    }

    const data = res.data?.data ?? res.data;
    return {
      exportUrl: data?.exportUrl || data?.downloadUrl || data?.url,
      status: data?.status || "COMPLETED",
      fileName: data?.fileName,
      content: data?.content,
    };
  } catch (error: any) {
    console.error(`Error quick exporting ${entityType} ${entityId}:`, error);
    throw new Error(
      error?.response?.data?.message || "Quick export failed"
    );
  }
}

/**
 * Helper utility to trigger clean browser download for exported URLs or content strings.
 */
export function downloadExportResult(resultOrUrl: ExportResponse | string, defaultFileName: string) {
  const targetUrlOrContent =
    typeof resultOrUrl === "string"
      ? resultOrUrl
      : resultOrUrl.exportUrl || resultOrUrl.downloadUrl || resultOrUrl.content || "";

  if (!targetUrlOrContent) return;

  if (
    targetUrlOrContent.startsWith("http://") ||
    targetUrlOrContent.startsWith("https://") ||
    targetUrlOrContent.startsWith("blob:")
  ) {
    const link = document.createElement("a");
    link.href = targetUrlOrContent;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const blob = new Blob([targetUrlOrContent], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }
}
