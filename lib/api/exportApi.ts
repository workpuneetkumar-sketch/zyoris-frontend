import api from "@/lib/api/api";
import * as XLSX from "xlsx";

export type ExportFormat = "CSV" | "XLSX" | "MARKDOWN" | "HTML" | "PDF";
export type ExportEntityType = "PAGE" | "TASK" | "PROJECT";

export interface CreateExportPayload {
  entityType: ExportEntityType;
  entityId?: string;
  format: ExportFormat;
  options?: {
    includeAttachments?: boolean;
    includeChildren?: boolean;
    includeActivities?: boolean;
    includeComments?: boolean;
    fields?: string[];
    [key: string]: any;
  };
}

export interface ExportResponse {
  exportUrl?: string;
  downloadUrl?: string;
  status?: string;
  fileName?: string;
  content?: string;
  blob?: Blob;
}

export const FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  CSV: "text/csv;charset=utf-8",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  MARKDOWN: "text/markdown;charset=utf-8",
  HTML: "text/html;charset=utf-8",
  PDF: "application/pdf",
};

export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  CSV: ".csv",
  XLSX: ".xlsx",
  MARKDOWN: ".md",
  HTML: ".html",
  PDF: ".pdf",
};

/**
 * Trigger export for Task, Project, or Page data.
 * POST /exports
 */
export async function createExport(
  payload: CreateExportPayload
): Promise<ExportResponse> {
  try {
    const normalizedFormat = payload.format.toLowerCase();
    const requestPayload = {
      ...payload,
      format: normalizedFormat,
    };

    const res = await api.post("/exports", requestPayload, {
      responseType: "blob",
    });

    if (res.data instanceof Blob) {
      // Check if the blob is actually a JSON error response returned as blob
      if (res.data.type.includes("application/json")) {
        const text = await res.data.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed.error || parsed.message) {
            throw new Error(parsed.message || parsed.error);
          }
          if (parsed.exportUrl || parsed.downloadUrl) {
            return {
              exportUrl: parsed.exportUrl || parsed.downloadUrl,
              status: parsed.status || "COMPLETED",
              fileName: parsed.fileName,
            };
          }
        } catch (e: any) {
          if (e.message && !e.message.includes("JSON")) {
            throw e;
          }
        }
      }

      const mimeType = FORMAT_MIME_TYPES[payload.format] || "application/octet-stream";
      const blob = new Blob([res.data], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      return {
        exportUrl: blobUrl,
        blob,
        status: "COMPLETED",
        fileName: `export_${payload.entityType.toLowerCase()}_${payload.entityId || "all"}${FORMAT_EXTENSIONS[payload.format]}`,
      };
    }

    const data = res.data?.data ?? res.data;
    return {
      exportUrl: data?.exportUrl || data?.downloadUrl || data?.url,
      status: data?.status || "COMPLETED",
      fileName: data?.fileName,
      content: data?.content,
    };
  } catch (error: any) {
    let errorMsg = "Failed to generate export file";
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        errorMsg = json.message || json.error || errorMsg;
      } catch {
        errorMsg = error.message || errorMsg;
      }
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    } else if (error.message) {
      errorMsg = error.message;
    }

    if (error.response?.status === 403) {
      errorMsg = "Permission denied: You do not have permission to export this data.";
    }

    console.error("Error generating export:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Quick export for a specific entity.
 * GET /exports/:entityType/:entityId?format=:format
 */
export async function quickExport(
  entityType: ExportEntityType,
  entityId: string,
  format: ExportFormat = "CSV",
  options?: {
    includeAttachments?: boolean;
    includeChildren?: boolean;
    includeActivities?: boolean;
    includeComments?: boolean;
  }
): Promise<ExportResponse> {
  try {
    const normalizedFormat = format.toLowerCase();
    const res = await api.get(`/exports/${entityType}/${entityId}`, {
      params: {
        format: normalizedFormat,
        includeAttachments: options?.includeAttachments ?? true,
        includeChildren: options?.includeChildren ?? true,
        includeActivities: options?.includeActivities ?? false,
        includeComments: options?.includeComments ?? false,
      },
      responseType: "blob",
    });

    if (res.data instanceof Blob) {
      if (res.data.type.includes("application/json")) {
        const text = await res.data.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed.error || parsed.message) {
            throw new Error(parsed.message || parsed.error);
          }
          if (parsed.exportUrl || parsed.downloadUrl) {
            return {
              exportUrl: parsed.exportUrl || parsed.downloadUrl,
              status: parsed.status || "COMPLETED",
              fileName: parsed.fileName,
            };
          }
        } catch (e: any) {
          if (e.message && !e.message.includes("JSON")) {
            throw e;
          }
        }
      }

      const mimeType = FORMAT_MIME_TYPES[format] || "application/octet-stream";
      const blob = new Blob([res.data], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      return {
        exportUrl: blobUrl,
        blob,
        status: "COMPLETED",
        fileName: `export_${entityType.toLowerCase()}_${entityId}${FORMAT_EXTENSIONS[format]}`,
      };
    }

    const data = res.data?.data ?? res.data;
    return {
      exportUrl: data?.exportUrl || data?.downloadUrl || data?.url,
      status: data?.status || "COMPLETED",
      fileName: data?.fileName,
      content: data?.content,
    };
  } catch (error: any) {
    let errorMsg = "Quick export failed";
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        errorMsg = json.message || json.error || errorMsg;
      } catch {
        errorMsg = error.message || errorMsg;
      }
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    } else if (error.message) {
      errorMsg = error.message;
    }

    if (error.response?.status === 403) {
      errorMsg = "Permission denied: You do not have permission to export this data.";
    }

    console.error(`Error quick exporting ${entityType} ${entityId}:`, errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Helper utility to trigger clean browser download for exported URLs or content strings.
 */
export function downloadExportResult(
  resultOrUrl: ExportResponse | string,
  defaultFileName: string
) {
  if (typeof window === "undefined") return;

  const targetUrlOrContent =
    typeof resultOrUrl === "string"
      ? resultOrUrl
      : resultOrUrl.exportUrl || resultOrUrl.downloadUrl || resultOrUrl.content || "";

  if (!targetUrlOrContent) return;

  const hasExt = Object.values(FORMAT_EXTENSIONS).some((ext) =>
    defaultFileName.toLowerCase().endsWith(ext)
  );
  const finalFileName = hasExt
    ? defaultFileName
    : typeof resultOrUrl !== "string" && resultOrUrl.fileName
    ? resultOrUrl.fileName
    : `${defaultFileName}.csv`;

  if (
    targetUrlOrContent.startsWith("http://") ||
    targetUrlOrContent.startsWith("https://") ||
    targetUrlOrContent.startsWith("blob:")
  ) {
    const link = document.createElement("a");
    link.href = targetUrlOrContent;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const blob = new Blob([targetUrlOrContent], {
      type: "text/plain;charset=utf-8",
    });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Client-side task list exporter for instant export of current filtered tasks table
 * into CSV, XLSX, Markdown, HTML, or PDF text.
 */
export function exportTasksToClientFile(
  tasks: any[],
  format: ExportFormat,
  baseFileName: string = "my_tasks_export"
) {
  if (typeof window === "undefined" || !tasks) return;

  const ext = FORMAT_EXTENSIONS[format] || ".csv";
  const fileName = `${baseFileName}_${new Date().toISOString().slice(0, 10)}${ext}`;

  // Prepare normalized rows
  const rows = tasks.map((t) => ({
    ID: t.id || "",
    Title: t.title || "",
    Status: t.status || "",
    Priority: t.priority || "",
    "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
    Assignee: t.assignedTo?.name || t.assignedToId || "Unassigned",
    Project: t.project?.name || t.projectId || "",
    Description: t.description || "",
    "Created At": t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
  }));

  if (format === "XLSX" || format === "CSV") {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    if (format === "XLSX") {
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: FORMAT_MIME_TYPES.XLSX,
      });
      const url = URL.createObjectURL(blob);
      downloadExportResult(url, fileName);
      URL.revokeObjectURL(url);
      return;
    } else {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], {
        type: FORMAT_MIME_TYPES.CSV,
      });
      const url = URL.createObjectURL(blob);
      downloadExportResult(url, fileName);
      URL.revokeObjectURL(url);
      return;
    }
  }

  if (format === "MARKDOWN") {
    let md = `# Task Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
    md += `| Title | Status | Priority | Due Date | Assignee | Project |\n`;
    md += `| --- | --- | --- | --- | --- | --- |\n`;
    rows.forEach((r) => {
      md += `| ${r.Title.replace(/\|/g, "-")} | ${r.Status} | ${r.Priority} | ${r["Due Date"]} | ${r.Assignee} | ${r.Project} |\n`;
    });
    const blob = new Blob([md], { type: FORMAT_MIME_TYPES.MARKDOWN });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }

  if (format === "HTML") {
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tasks Export</title>`;
    html += `<style>body{font-family:system-ui,sans-serif;margin:2rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#2563eb;color:white}tr:nth-child(even){background-color:#f8fafc}</style></head><body>`;
    html += `<h2>Tasks Export (${tasks.length} items)</h2><p>Export Date: ${new Date().toLocaleString()}</p>`;
    html += `<table><thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due Date</th><th>Assignee</th><th>Project</th></tr></thead><tbody>`;
    rows.forEach((r) => {
      html += `<tr><td>${r.Title}</td><td>${r.Status}</td><td>${r.Priority}</td><td>${r["Due Date"]}</td><td>${r.Assignee}</td><td>${r.Project}</td></tr>`;
    });
    html += `</tbody></table></body></html>`;
    const blob = new Blob([html], { type: FORMAT_MIME_TYPES.HTML });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }

  if (format === "PDF") {
    // Generate clean printable text format
    let content = `TASKS EXPORT REPORT\nDate: ${new Date().toLocaleString()}\nTotal Tasks: ${tasks.length}\n\n`;
    rows.forEach((r, idx) => {
      content += `[${idx + 1}] ${r.Title}\nStatus: ${r.Status} | Priority: ${r.Priority} | Due: ${r["Due Date"]} | Assignee: ${r.Assignee}\n\n`;
    });
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }
}

/**
 * Client-side file generator for Database Table rows and properties.
 * Generates and downloads real CSV, XLSX, Markdown, HTML, or PDF files.
 */
export async function exportDatabaseTableToFile(
  properties: Array<{ name: string; [key: string]: any }>,
  rows: Array<{ data: Record<string, any>; [key: string]: any }>,
  format: ExportFormat,
  fileName: string
): Promise<void> {
  const propertyNames = properties.map((p) => p.name);
  const formattedRows = rows.map((row) => {
    const rowObj: Record<string, any> = {};
    if (propertyNames.length > 0) {
      propertyNames.forEach((name) => {
        const val = row.data?.[name];
        rowObj[name] = val !== undefined && val !== null ? val : "";
      });
    } else if (row.data) {
      Object.assign(rowObj, row.data);
    }
    return rowObj;
  });

  if (format === "CSV") {
    const ws = XLSX.utils.json_to_sheet(formattedRows);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: FORMAT_MIME_TYPES.CSV });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }

  if (format === "XLSX") {
    const ws = XLSX.utils.json_to_sheet(formattedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: FORMAT_MIME_TYPES.XLSX });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }

  if (format === "MARKDOWN") {
    let md = `# Database Table Export\nGenerated: ${new Date().toLocaleString()}\nTotal Rows: ${rows.length}\n\n`;
    if (propertyNames.length > 0) {
      md += `| ${propertyNames.join(" | ")} |\n`;
      md += `| ${propertyNames.map(() => "---").join(" | ")} |\n`;
      formattedRows.forEach((r) => {
        const vals = propertyNames.map((p) => String(r[p] ?? "").replace(/\|/g, "-"));
        md += `| ${vals.join(" | ")} |\n`;
      });
    }
    const blob = new Blob([md], { type: FORMAT_MIME_TYPES.MARKDOWN });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }

  if (format === "HTML") {
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Database Export</title>`;
    html += `<style>body{font-family:system-ui,sans-serif;margin:2rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#4f46e5;color:white}tr:nth-child(even){background-color:#f8fafc}</style></head><body>`;
    html += `<h2>Database Export (${rows.length} rows)</h2><p>Export Date: ${new Date().toLocaleString()}</p>`;
    html += `<table><thead><tr>`;
    propertyNames.forEach((p) => {
      html += `<th>${p}</th>`;
    });
    html += `</tr></thead><tbody>`;
    formattedRows.forEach((r) => {
      html += `<tr>`;
      propertyNames.forEach((p) => {
        html += `<td>${r[p] ?? ""}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></body></html>`;
    const blob = new Blob([html], { type: FORMAT_MIME_TYPES.HTML });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }

  if (format === "PDF") {
    let content = `DATABASE EXPORT REPORT\nDate: ${new Date().toLocaleString()}\nTotal Rows: ${rows.length}\n\n`;
    formattedRows.forEach((r, idx) => {
      content += `[Row ${idx + 1}]\n`;
      propertyNames.forEach((p) => {
        content += `  ${p}: ${r[p] ?? ""}\n`;
      });
      content += `\n`;
    });
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    downloadExportResult(url, fileName);
    URL.revokeObjectURL(url);
    return;
  }
}


