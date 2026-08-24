"use client";

import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import {
  Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
  Eye, FileSpreadsheet, SkipForward, AlertTriangle, RefreshCw,
  Download, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  startLeadImport,
  getLeadImportStatus,
  downloadLeadImportErrors,
  LeadImportJobStatus,
} from "@/lib/api/leadsApi";
import * as XLSX from "xlsx";

interface UploadLeadsModalProps {
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

type UploadPhase =
  | "idle"          // file picker
  | "previewing"    // file parsed, showing preview + warnings
  | "uploading"     // POST /leads/import in flight
  | "polling"       // polling GET /leads/import/{jobId}
  | "completed"     // job COMPLETED
  | "failed"        // job FAILED or network error
  | "error";        // validation/upload error before job created

interface PreviewRow { [key: string]: string; }

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

function parsePreviewRows(
  file: File,
  maxRows = 5
): Promise<{ headers: string[]; rows: PreviewRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
        if (!json.length) { resolve({ headers: [], rows: [] }); return; }
        const headers = (json[0] as string[]).map((h) => String(h ?? "").trim()).filter(Boolean);
        const rows: PreviewRow[] = (json.slice(1, maxRows + 1) as string[][]).map((row) => {
          const obj: PreviewRow = {};
          headers.forEach((h, i) => { obj[h] = String(row[i] ?? ""); });
          return obj;
        });
        resolve({ headers, rows });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}

function detectDuplicates(rows: PreviewRow[]): number {
  const seen = new Set<string>();
  let count = 0;
  for (const row of rows) {
    const key =
      (row["email"] || row["Email"] || row["EMAIL"] || "") + "|" +
      (row["name"]  || row["Name"]  || row["NAME"]  || "");
    if (key !== "|") { if (seen.has(key)) count++; else seen.add(key); }
  }
  return count;
}

function validateHeaders(headers: string[]): string[] {
  const required = ["name", "email"];
  const lower = headers.map((h) => h.toLowerCase());
  return required.filter((r) => !lower.includes(r));
}

// ─── Status label helper ───────────────────────────────────────────────────
function statusLabel(status: LeadImportJobStatus["status"]): string {
  switch (status) {
    case "PENDING":    return "Queued — waiting to start…";
    case "PROCESSING": return "Processing rows…";
    case "COMPLETED":  return "Import completed";
    case "FAILED":     return "Import failed";
    case "CANCELLED":  return "Import cancelled";
    default:           return status;
  }
}

export default function UploadLeadsModal({ onClose, onSuccess }: UploadLeadsModalProps) {
  const [file,             setFile]             = useState<File | null>(null);
  const [phase,            setPhase]            = useState<UploadPhase>("idle");
  const [error,            setError]            = useState<string | null>(null);
  const [isDragging,       setIsDragging]       = useState(false);
  const [jobId,            setJobId]            = useState<string | null>(null);
  const [jobStatus,        setJobStatus]        = useState<LeadImportJobStatus | null>(null);
  const [preview,          setPreview]          = useState<{ headers: string[]; rows: PreviewRow[] } | null>(null);
  const [missingHeaders,   setMissingHeaders]   = useState<string[]>([]);
  const [duplicatesInFile, setDuplicatesInFile] = useState(0);
  const [hasErrorCsv,      setHasErrorCsv]      = useState(false);
  const [downloadingErrors,setDownloadingErrors]= useState(false);
  const [showFormatGuide,  setShowFormatGuide]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stop polling on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  // ── Poll job status ────────────────────────────────────────────────────────
  const pollJob = useCallback(async (id: string) => {
    try {
      console.log('[pollJob] Polling job:', id);
      const job = await getLeadImportStatus(id);
      console.log('[pollJob] Status response:', job);
      
      setJobStatus(job);

      if (job.status === "COMPLETED") {
        setPhase("completed");
        setHasErrorCsv(job.failedRows > 0 && !!job.errorCsvPath);
        await onSuccess().catch(() => {});
        return;
      }
      if (job.status === "FAILED" || job.status === "CANCELLED") {
        setPhase("failed");
        return;
      }
      // Still PENDING or PROCESSING — poll again in 2 s
      pollRef.current = setTimeout(() => pollJob(id), 2000);
    } catch (err: any) {
      console.error('[pollJob] Error polling:', err);
      // Transient network error — retry after 3 s
      pollRef.current = setTimeout(() => pollJob(id), 3000);
    }
  }, [onSuccess]);

  // ── File selection ─────────────────────────────────────────────────────────
  const processFile = useCallback(async (selected: File) => {
    console.log('[processFile] File selected:', {
      name: selected.name,
      type: selected.type,
      size: selected.size,
      lastModified: new Date(selected.lastModified),
    });
    
    if (!isValidFile(selected)) {
      setError("Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls).");
      return;
    }
    setError(null);
    setFile(selected);
    try {
      const parsed = await parsePreviewRows(selected, 5);
      setPreview(parsed);
      setMissingHeaders(validateHeaders(parsed.headers));
      setDuplicatesInFile(detectDuplicates(parsed.rows));
      console.log('[processFile] Preview parsed:', {
        headers: parsed.headers,
        rows: parsed.rows.length,
      });
    } catch (err) {
      console.error('[processFile] Error parsing file:', err);
      setPreview(null);
      setMissingHeaders([]);
      setDuplicatesInFile(0);
    }
    setPhase("previewing");
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processFile(dropped);
  };

  // ── Upload → start import job ──────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) {
      console.error('[handleUpload] No file selected');
      setError("No file selected");
      return;
    }
    
    console.log('[handleUpload] Starting upload for file:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    
    setPhase("uploading");
    setError(null);
    
    try {
      console.log('[handleUpload] Calling startLeadImport...');
      const res = await startLeadImport(file);
      console.log('[handleUpload] Import started successfully:', res);
      
      if (!res.jobId) {
        throw new Error('No jobId returned from server');
      }
      
      setJobId(res.jobId);
      setPhase("polling");
      pollJob(res.jobId);
    } catch (err: any) {
      console.error('[handleUpload] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Upload failed. Please check the file and try again.";
      setError(msg);
      setPhase("error");
    }
  };

  // ── Download error CSV ─────────────────────────────────────────────────────
  const handleDownloadErrors = async () => {
    if (!jobId) return;
    setDownloadingErrors(true);
    try {
      const blob = await downloadLeadImportErrors(jobId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `lead-import-errors-${jobId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[handleDownloadErrors] Error:', err);
      // swallow — error CSV may not exist
    } finally {
      setDownloadingErrors(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setFile(null); setPhase("idle"); setError(null);
    setJobId(null); setJobStatus(null);
    setPreview(null); setMissingHeaders([]); setDuplicatesInFile(0);
    setHasErrorCsv(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const progressPct = jobStatus?.progress ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/60">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-white">Bulk Import Leads</h3>
            <p className="text-xs text-blue-100 font-semibold uppercase tracking-widest mt-0.5">
              CSV file upload · up to 5 000 rows
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={phase === "uploading" || phase === "polling"}
            className="text-blue-100 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* ── IDLE: file picker ─────────────────────────────────────────── */}
          {phase === "idle" && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging ? "border-blue-500 bg-blue-50/40" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-extrabold text-slate-900 mb-1">
                  {isDragging ? "Drop CSV here" : "Choose a file or drag & drop"}
                </p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  CSV only · max 10 MB / 5 000 rows
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-red-700">{error}</p>
                </div>
              )}

              {/* ── CSV Format Guide ─────────────────────────────────────── */}
              <div className="border border-blue-100 rounded-2xl overflow-hidden">
                {/* Collapsible header */}
                <button
                  type="button"
                  onClick={() => setShowFormatGuide((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-blue-500 shrink-0" />
                    <span className="text-xs font-bold text-blue-700">What should my CSV look like?</span>
                  </div>
                  {showFormatGuide
                    ? <ChevronUp size={14} className="text-blue-400" />
                    : <ChevronDown size={14} className="text-blue-400" />}
                </button>

                {showFormatGuide && (
                  <div className="px-4 py-4 space-y-4 bg-white">

                    {/* Required / Optional columns */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                          Required columns
                        </p>
                        <div className="space-y-1.5">
                          {[
                            { col: "name",  desc: "Full name of the lead" },
                            { col: "email", desc: "Email address" },
                          ].map(({ col, desc }) => (
                            <div key={col} className="flex items-start gap-2">
                              <span className="font-mono text-[11px] bg-red-50 text-red-600 border border-red-100 rounded px-1.5 py-0.5 shrink-0">
                                {col}
                              </span>
                              <span className="text-[11px] text-gray-500 leading-tight pt-0.5">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                          Optional columns
                        </p>
                        <div className="space-y-1.5">
                          {[
                            { col: "phone",          desc: "Phone number" },
                            { col: "company",        desc: "Company name" },
                            { col: "owner",          desc: "Assigned rep name" },
                            { col: "status",         desc: "NEW · WARM · HOT · COLD · DEAD" },
                            { col: "source",         desc: "Website · LinkedIn · Referral…" },
                            { col: "estimatedValue", desc: "Deal value (number)" },
                            { col: "score",          desc: "Lead score 0–100" },
                          ].map(({ col, desc }) => (
                            <div key={col} className="flex items-start gap-2">
                              <span className="font-mono text-[11px] bg-gray-50 text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 shrink-0">
                                {col}
                              </span>
                              <span className="text-[11px] text-gray-500 leading-tight pt-0.5">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Sample row */}
                    <div>
                      <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                        Sample row
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                        <table className="w-full text-[11px] min-w-max">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              {["name","email","phone","company","owner","status","source","estimatedValue","score"].map((h) => (
                                <th key={h} className="text-left px-2.5 py-1.5 font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">John Smith</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">john@techcorp.com</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">+1-555-0192</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">TechCorp Inc.</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">Sarah Johnson</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">HOT</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">Website</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">15000</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">85</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Rules list */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 space-y-1">
                      <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-1">
                        Good to know
                      </p>
                      {[
                        "Column headers are case-insensitive (Name, name, NAME all work).",
                        "Duplicate rows (same email) are detected and skipped automatically.",
                        "The owner column must match an existing team member's name.",
                        "status must be one of: NEW, WARM, HOT, COLD, DEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED.",
                        "Maximum 5 000 rows and 10 MB per file.",
                      ].map((rule, i) => (
                        <p key={i} className="text-[11px] text-amber-700 leading-snug flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">•</span>
                          <span>{rule}</span>
                        </p>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PREVIEWING ────────────────────────────────────────────────── */}
          {phase === "previewing" && file && (
            <>
              {/* File pill */}
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <FileSpreadsheet size={18} className="text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-blue-800 truncate">{file.name}</p>
                  <p className="text-xs text-blue-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={handleReset} className="p-1.5 rounded-lg text-blue-300 hover:text-blue-600 hover:bg-blue-100 transition-colors" aria-label="Remove">
                  <X size={13} />
                </button>
              </div>

              {/* Missing columns warning */}
              {missingHeaders.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 mb-0.5">Missing recommended columns</p>
                    <p className="text-xs text-amber-600">
                      <span className="font-semibold">{missingHeaders.join(", ")}</span> — recommended for full records. You can still import.
                    </p>
                  </div>
                </div>
              )}

              {/* In-file duplicates warning */}
              {duplicatesInFile > 0 && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                  <SkipForward size={15} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-800 mb-0.5">
                      {duplicatesInFile} potential duplicate row{duplicatesInFile > 1 ? "s" : ""} in preview
                    </p>
                    <p className="text-xs text-orange-600">
                      The server will detect duplicates against your database and skip them.
                    </p>
                  </div>
                </div>
              )}

              {/* Data preview table */}
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
                            <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                          {preview.headers.length > 6 && <th className="px-3 py-2 text-gray-400 text-center">+{preview.headers.length - 6} more</th>}
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
                    {preview.headers.length} column{preview.headers.length !== 1 ? "s" : ""} detected · showing first {preview.rows.length} data row{preview.rows.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1">
                <button
                  onClick={handleUpload}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> Start Import
                </button>
                <button onClick={handleReset} className="w-full py-3 bg-white hover:bg-slate-50 text-slate-600 text-sm font-extrabold rounded-2xl border border-slate-200 transition-all">
                  Choose Different File
                </button>
              </div>
            </>
          )}

          {/* ── UPLOADING (POST in flight) ────────────────────────────────── */}
          {phase === "uploading" && (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                <Loader2 size={28} className="text-blue-600 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-gray-900 mb-1">Sending file…</h4>
                <p className="text-xs text-gray-400">{file?.name}</p>
              </div>
              <p className="text-xs text-gray-400">Uploading to server, please wait…</p>
            </div>
          )}

          {/* ── POLLING (job running) ─────────────────────────────────────── */}
          {phase === "polling" && (
            <div className="flex flex-col items-center text-center py-4 space-y-5">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                <Loader2 size={28} className="text-blue-600 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-gray-900 mb-1">
                  {jobStatus ? statusLabel(jobStatus.status) : "Starting import…"}
                </h4>
                <p className="text-xs text-gray-400">{file?.name}</p>
              </div>

              {/* Progress bar — driven by real job.progress */}
              <div className="w-full">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>
                    {jobStatus
                      ? `${jobStatus.processedRows.toLocaleString()} / ${jobStatus.totalRows.toLocaleString()} rows`
                      : "Waiting for server…"}
                  </span>
                  <span className="font-bold tabular-nums">{Math.round(progressPct)}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {jobStatus && (
                <div className="w-full grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                    <p className="text-lg font-extrabold text-gray-800">{jobStatus.totalRows}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">Total</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                    <p className="text-lg font-extrabold text-emerald-700">{jobStatus.successRows}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">Success</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2.5 border border-red-100">
                    <p className="text-lg font-extrabold text-red-700">{jobStatus.failedRows}</p>
                    <p className="text-[10px] text-red-600 font-semibold">Failed</p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-400">
                Import is running in the background. Do not close this window.
              </p>
            </div>
          )}

          {/* ── COMPLETED ────────────────────────────────────────────────── */}
          {phase === "completed" && jobStatus && (() => {
            const allDuplicates = jobStatus.successRows === 0 && jobStatus.failedRows > 0;
            const partialSuccess = jobStatus.successRows > 0 && jobStatus.failedRows > 0;

            return (
              <div className="flex flex-col items-center text-center py-4 space-y-4">
                {/* Icon — amber for all-duplicates, green for success */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                  allDuplicates
                    ? "bg-amber-50 border-amber-100"
                    : "bg-emerald-50 border-emerald-100"
                }`}>
                  {allDuplicates
                    ? <SkipForward size={32} className="text-amber-500" />
                    : <CheckCircle2 size={32} className="text-emerald-500" />}
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-gray-900 mb-1">
                    {allDuplicates ? "All Rows Already Exist" : "Import Completed"}
                  </h4>
                  <p className="text-xs text-gray-400">{file?.name}</p>
                </div>

                {/* All-duplicates explanation banner */}
                {allDuplicates && (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left space-y-1">
                    <p className="text-xs font-bold text-amber-800">
                      Every lead in this file is already in your database.
                    </p>
                    <p className="text-xs text-amber-700 leading-snug">
                      The server skipped all {jobStatus.failedRows} row{jobStatus.failedRows !== 1 ? "s" : ""} because their email addresses already exist.
                      This is not an error — duplicate detection is working correctly.
                    </p>
                    <p className="text-xs text-amber-600 leading-snug mt-1">
                      To import new leads, use a CSV with different email addresses.
                    </p>
                  </div>
                )}

                {/* Partial success explanation */}
                {partialSuccess && (
                  <div className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-left">
                    <p className="text-xs font-bold text-blue-800 mb-0.5">Partial import completed.</p>
                    <p className="text-xs text-blue-700 leading-snug">
                      {jobStatus.successRows} lead{jobStatus.successRows !== 1 ? "s" : ""} imported successfully.{" "}
                      {jobStatus.failedRows} row{jobStatus.failedRows !== 1 ? "s" : ""} were skipped — download the error report to see why.
                    </p>
                  </div>
                )}

                {/* Result summary grid */}
                <div className="w-full grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-gray-800">{jobStatus.totalRows}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Total Rows</p>
                  </div>
                  <div className={`border rounded-xl p-3 text-center ${
                    jobStatus.successRows === 0
                      ? "bg-gray-50 border-gray-100"
                      : "bg-emerald-50 border-emerald-100"
                  }`}>
                    <p className={`text-2xl font-extrabold ${jobStatus.successRows === 0 ? "text-gray-400" : "text-emerald-700"}`}>
                      {jobStatus.successRows}
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 ${jobStatus.successRows === 0 ? "text-gray-400" : "text-emerald-600"}`}>
                      Imported
                    </p>
                  </div>
                  <div className={`border rounded-xl p-3 text-center ${
                    jobStatus.failedRows === 0
                      ? "bg-gray-50 border-gray-100"
                      : allDuplicates
                        ? "bg-amber-50 border-amber-100"
                        : "bg-red-50 border-red-100"
                  }`}>
                    <p className={`text-2xl font-extrabold ${
                      jobStatus.failedRows === 0 ? "text-gray-400" : allDuplicates ? "text-amber-600" : "text-red-700"
                    }`}>
                      {jobStatus.failedRows}
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 ${
                      jobStatus.failedRows === 0 ? "text-gray-400" : allDuplicates ? "text-amber-600" : "text-red-600"
                    }`}>
                      {allDuplicates ? "Duplicates Skipped" : "Failed Rows"}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-blue-700">{Math.round(jobStatus.progress)}%</p>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">Completion</p>
                  </div>
                </div>

                {/* Download error CSV — shown for failures and duplicates alike */}
                {hasErrorCsv && (
                  <button
                    onClick={handleDownloadErrors}
                    disabled={downloadingErrors}
                    className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-2xl border transition-all disabled:opacity-50 ${
                      allDuplicates
                        ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    }`}
                  >
                    {downloadingErrors ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {downloadingErrors
                      ? "Downloading…"
                      : allDuplicates
                        ? `Download Duplicate Report (${jobStatus.failedRows} rows)`
                        : `Download Error Report (${jobStatus.failedRows} rows)`}
                  </button>
                )}

                {!allDuplicates && (
                  <p className="text-sm text-gray-500">
                    Imported leads are now visible in your Leads list.
                  </p>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all"
                >
                  Done
                </button>
              </div>
            );
          })()}

          {/* ── FAILED (job failed) ───────────────────────────────────────── */}
          {phase === "failed" && (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center border border-red-100">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-gray-900 mb-1">Import Failed</h4>
                <p className="text-sm text-gray-500">
                  {jobStatus
                    ? `The import job ended with status: ${jobStatus.status}.`
                    : "The import job failed on the server."}
                  {" "}Please check your CSV and try again.
                </p>
              </div>
              {hasErrorCsv && (
                <button
                  onClick={handleDownloadErrors}
                  disabled={downloadingErrors}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-2xl border border-red-200 transition-all disabled:opacity-50"
                >
                  {downloadingErrors ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {downloadingErrors ? "Downloading…" : "Download Error Report"}
                </button>
              )}
              <div className="flex gap-3 w-full">
                <button onClick={handleReset} className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={14} /> Try Again
                </button>
                <button onClick={onClose} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all">
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR (before job created) ────────────────────────────────── */}
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
                <button onClick={handleReset} className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={14} /> Try Again
                </button>
                <button onClick={onClose} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all">
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}