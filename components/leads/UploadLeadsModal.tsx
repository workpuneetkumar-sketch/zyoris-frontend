"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  FileSpreadsheet,
  SkipForward,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { uploadLeadsFile } from "@/lib/api/uploadsApi";
import * as XLSX from "xlsx";

interface UploadLeadsModalProps {
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

type UploadPhase = "idle" | "previewing" | "uploading" | "success" | "error";

interface PreviewRow {
  [key: string]: string;
}

interface ImportResult {
  created?: number;
  updated?: number;
  skipped?: number;
  duplicates?: number;
  errors?: string[];
  rowsIngested?: number;
  fileName?: string;
}

const ALLOWED_MIME = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

function isValidFile(f: File) {
  return (
    ALLOWED_MIME.includes(f.type) ||
    f.name.endsWith(".csv") ||
    f.name.endsWith(".xlsx") ||
    f.name.endsWith(".xls")
  );
}

/** Parse the first N rows from a CSV or Excel file using the xlsx library. */
function parsePreviewRows(file: File, maxRows = 5): Promise<{ headers: string[]; rows: PreviewRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][];

        if (!json.length) {
          resolve({ headers: [], rows: [] });
          return;
        }

        const rawHeaders = json[0].map((h) => String(h ?? "").trim());
        const headers = rawHeaders.filter(Boolean);
        const rows: PreviewRow[] = json.slice(1, maxRows + 1).map((row) => {
          const obj: PreviewRow = {};
          headers.forEach((h, i) => {
            obj[h] = String(row[i] ?? "");
          });
          return obj;
        });

        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}

/** Detect likely duplicate candidates by matching a "name" or "email" column. */
function detectDuplicates(rows: PreviewRow[]): number {
  const seen = new Set<string>();
  let count = 0;
  for (const row of rows) {
    const key =
      (row["email"] || row["Email"] || row["EMAIL"] || "") +
      "|" +
      (row["name"] || row["Name"] || row["NAME"] || "");
    if (key !== "|") {
      if (seen.has(key)) count++;
      else seen.add(key);
    }
  }
  return count;
}

/** Validate required headers exist. Returns list of missing required fields. */
function validateHeaders(headers: string[]): string[] {
  const required = ["name", "email"];
  const lower = headers.map((h) => h.toLowerCase());
  return required.filter((r) => !lower.includes(r));
}

export default function UploadLeadsModal({ onClose, onSuccess }: UploadLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: PreviewRow[] } | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [duplicatesInFile, setDuplicatesInFile] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File selection ─────────────────────────────────────────────────────────
  const processFile = useCallback(async (selected: File) => {
    if (!isValidFile(selected)) {
      setError("Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls).");
      return;
    }
    setError(null);
    setFile(selected);

    // Parse a preview
    try {
      const parsed = await parsePreviewRows(selected, 5);
      setPreview(parsed);
      const missing = validateHeaders(parsed.headers);
      setMissingHeaders(missing);
      const dups = detectDuplicates(parsed.rows);
      setDuplicatesInFile(dups);
      setPhase("previewing");
    } catch {
      setPreview(null);
      setMissingHeaders([]);
      setDuplicatesInFile(0);
      setPhase("previewing");
    }
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
    // Reset input value so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processFile(dropped);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);

    // Simulate progress while actual XHR upload runs
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 12;
      });
    }, 300);

    try {
      const result = await uploadLeadsFile(file);
      clearInterval(progressInterval);
      setProgress(100);

      // Give a moment for the bar to reach 100% visually
      await new Promise((r) => setTimeout(r, 400));

      setImportResult({
        rowsIngested: (result as any).rowsIngested ?? (result as any).rows ?? undefined,
        created: (result as any).created ?? (result as any).inserted ?? undefined,
        updated: (result as any).updated ?? undefined,
        skipped: (result as any).skipped ?? undefined,
        duplicates: (result as any).duplicates ?? undefined,
        errors: (result as any).errors ?? undefined,
        fileName: file.name,
      });

      setPhase("success");
      await onSuccess();
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Upload failed. Please check the file format and try again.";
      setError(msg);
      setPhase("error");
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setPhase("idle");
    setError(null);
    setProgress(0);
    setImportResult(null);
    setPreview(null);
    setMissingHeaders([]);
    setDuplicatesInFile(0);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/60">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-white">Bulk Import Leads</h3>
            <p className="text-xs text-blue-100 font-semibold uppercase tracking-widest mt-0.5">
              CSV / Excel file upload
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            disabled={phase === "uploading"}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* ── SUCCESS STATE ── */}
          {phase === "success" && (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-gray-900 mb-1">Import Successful</h4>
                {importResult?.fileName && (
                  <p className="text-xs text-gray-400 mb-3">{importResult.fileName}</p>
                )}
              </div>

              {/* Result summary */}
              <div className="w-full grid grid-cols-2 gap-3">
                {importResult?.rowsIngested != null && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-emerald-700">{importResult.rowsIngested}</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">Rows Processed</p>
                  </div>
                )}
                {importResult?.created != null && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-blue-700">{importResult.created}</p>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">Created</p>
                  </div>
                )}
                {importResult?.updated != null && (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-violet-700">{importResult.updated}</p>
                    <p className="text-xs text-violet-600 font-semibold mt-0.5">Updated</p>
                  </div>
                )}
                {importResult?.skipped != null && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-amber-700">{importResult.skipped}</p>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">Skipped</p>
                  </div>
                )}
                {importResult?.duplicates != null && importResult.duplicates > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-orange-700">{importResult.duplicates}</p>
                    <p className="text-xs text-orange-600 font-semibold mt-0.5">Duplicates</p>
                  </div>
                )}
              </div>

              {/* Error rows if any */}
              {importResult?.errors && importResult.errors.length > 0 && (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl p-3 text-left">
                  <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Row Errors ({importResult.errors.length})
                  </p>
                  <ul className="space-y-1 max-h-24 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="text-[11px] text-red-600">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-gray-500">
                Your leads are being indexed. They will appear in the list shortly.
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all"
              >
                Done
              </button>
            </div>
          )}

          {/* ── UPLOADING STATE ── */}
          {phase === "uploading" && (
            <div className="flex flex-col items-center text-center py-4 space-y-5">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                <Loader2 size={28} className="text-blue-600 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-gray-900 mb-1">Uploading…</h4>
                <p className="text-xs text-gray-400">{file?.name}</p>
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Upload progress</span>
                  <span className="font-bold tabular-nums">{Math.round(Math.min(progress, 100))}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Processing and validating your file on the server…
              </p>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {phase === "error" && (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center border border-red-100">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-gray-900 mb-1">Upload Failed</h4>
                <p className="text-sm text-red-600 max-w-sm">{error}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ── IDLE STATE: File picker ── */}
          {phase === "idle" && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-extrabold text-slate-900 mb-1">
                  {isDragging ? "Drop file here" : "Choose a file or drag & drop"}
                </p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  CSV or Excel files only
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-red-700">{error}</p>
                </div>
              )}
            </>
          )}

          {/* ── PREVIEW STATE ── */}
          {phase === "previewing" && file && (
            <>
              {/* Selected file info */}
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <FileSpreadsheet size={18} className="text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-blue-800 truncate">{file.name}</p>
                  <p className="text-xs text-blue-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-blue-300 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Validation warnings */}
              {missingHeaders.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 mb-0.5">Missing recommended columns</p>
                    <p className="text-xs text-amber-600">
                      {missingHeaders.join(", ")} — these columns are recommended for full lead records. You can still import.
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicate warning */}
              {duplicatesInFile > 0 && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                  <SkipForward size={15} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-800 mb-0.5">
                      {duplicatesInFile} potential duplicate row{duplicatesInFile > 1 ? "s" : ""} detected
                    </p>
                    <p className="text-xs text-orange-600">
                      Duplicate rows in the preview will be skipped or merged by the server.
                    </p>
                  </div>
                </div>
              )}

              {/* Import preview table */}
              {preview && preview.headers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={13} className="text-gray-400" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Preview — first {preview.rows.length} row{preview.rows.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                    <table className="w-full text-xs min-w-max">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {preview.headers.slice(0, 6).map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                          {preview.headers.length > 6 && (
                            <th className="px-3 py-2 text-gray-400 text-center">+{preview.headers.length - 6} more</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                            {preview.headers.slice(0, 6).map((h) => (
                              <td key={h} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate">
                                {row[h] || <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                            {preview.headers.length > 6 && <td />}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Detected {preview.headers.length} columns · Showing first {preview.rows.length} data rows
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-red-700">{error}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-1">
                <button
                  onClick={handleUpload}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Import {preview?.rows != null ? `(${preview.rows.length > 0 ? "~" + preview.rows.length + "+ rows" : "file"})` : "File"}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-slate-600 text-sm font-extrabold rounded-2xl border border-slate-200 transition-all"
                >
                  Choose Different File
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
