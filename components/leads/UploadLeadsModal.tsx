"use client";

import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import {
  Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
  Eye, FileSpreadsheet, SkipForward, AlertTriangle, RefreshCw,
  Download, Info, ChevronDown, ChevronUp, SlidersHorizontal, ArrowRight,
} from "lucide-react";
import {
  startLeadImport,
  getLeadImportStatus,
  downloadLeadImportErrors,
  LeadImportJobStatus,
} from "@/lib/api/leadsApi";
import * as XLSX from "xlsx";
import {
  extractLeadsFromPdf,
  autoMapField,
  convertMappedRowsToCsv,
  TARGET_LEAD_FIELDS,
  TargetLeadFieldKey,
} from "@/lib/utils/pdfLeadExtractor";

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
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

function isValidFile(f: File) {
  return (
    ALLOWED_MIME.includes(f.type) ||
    f.name.endsWith(".csv") ||
    f.name.endsWith(".xlsx") ||
    f.name.endsWith(".xls") ||
    f.name.endsWith(".pdf") ||
    f.name.endsWith(".ppt") ||
    f.name.endsWith(".pptx") ||
    f.name.endsWith(".png") ||
    f.name.endsWith(".jpg") ||
    f.name.endsWith(".jpeg")
  );
}

function parsePreviewRows(
  file: File,
  maxRows = 5000
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
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  let count = 0;
  for (const row of rows) {
    const keys = Object.keys(row);
    const emailKey = keys.find(k => k.toLowerCase().includes("email") || k.toLowerCase().includes("mail"));
    const phoneKey = keys.find(k => k.toLowerCase().includes("phone") || k.toLowerCase().includes("mobile"));
    
    const emailVal = emailKey ? row[emailKey].toLowerCase().trim() : "";
    const phoneVal = phoneKey ? row[phoneKey].replace(/\D/g, "") : "";
    
    let isDup = false;
    if (emailVal && seenEmail.has(emailVal)) isDup = true;
    else if (emailVal) seenEmail.add(emailVal);
    
    if (phoneVal && phoneVal.length >= 7 && seenPhone.has(phoneVal)) isDup = true;
    else if (phoneVal && phoneVal.length >= 7) seenPhone.add(phoneVal);

    if (isDup) count++;
  }
  return count;
}

function validateMappedHeaders(mapping: Record<string, TargetLeadFieldKey>): string[] {
  const mapped = Object.values(mapping);
  const missing: string[] = [];
  if (!mapped.includes("name")) missing.push("Full Name");
  if (!mapped.includes("email")) missing.push("Email Address");
  return missing;
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
  const [file,              setFile]              = useState<File | null>(null);
  const [phase,             setPhase]             = useState<UploadPhase>("idle");
  const [error,             setError]             = useState<string | null>(null);
  const [isDragging,        setIsDragging]        = useState(false);
  const [jobId,             setJobId]             = useState<string | null>(null);
  const [jobStatus,         setJobStatus]         = useState<LeadImportJobStatus | null>(null);
  const [preview,           setPreview]           = useState<{ headers: string[]; rows: PreviewRow[] } | null>(null);
  const [missingHeaders,    setMissingHeaders]    = useState<string[]>([]);
  const [duplicatesInFile,  setDuplicatesInFile]  = useState(0);
  const [allExtractedRows,  setAllExtractedRows]  = useState<PreviewRow[]>([]);
  const [fieldMapping,      setFieldMapping]      = useState<Record<string, TargetLeadFieldKey>>({});
  const [isParsingPdf,      setIsParsingPdf]      = useState(false);
  const [allowReimport,     setAllowReimport]     = useState(false);
  const [hasErrorCsv,       setHasErrorCsv]       = useState(false);
  const [downloadingErrors, setDownloadingErrors] = useState(false);
  const [showFormatGuide,   setShowFormatGuide]   = useState(false);
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
        if (job.successRows > 0) {
          await onSuccess().catch(() => {});
        }
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
      pollRef.current = setTimeout(() => pollJob(id), 3000);
    }
  }, [onSuccess]);

  // ── Field mapping change handler ───────────────────────────────────────────
  const handleMappingChange = (sourceCol: string, targetKey: TargetLeadFieldKey) => {
    const updated = { ...fieldMapping, [sourceCol]: targetKey };
    setFieldMapping(updated);
    setMissingHeaders(validateMappedHeaders(updated));
  };

  // ── File selection ─────────────────────────────────────────────────────────
  const processFile = useCallback(async (selected: File) => {
    console.log('[processFile] File selected:', {
      name: selected.name,
      type: selected.type,
      size: selected.size,
      lastModified: new Date(selected.lastModified),
    });
    
    if (!isValidFile(selected)) {
      setError("Invalid file type. Please upload a CSV, Excel, or PDF file.");
      return;
    }
    setError(null);
    setFile(selected);

    try {
      const lowerName = selected.name.toLowerCase();
      if (lowerName.endsWith(".csv") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
        const parsed = await parsePreviewRows(selected, 5000);
        setAllExtractedRows(parsed.rows);
        const initialMapping: Record<string, TargetLeadFieldKey> = {};
        parsed.headers.forEach((h) => {
          initialMapping[h] = autoMapField(h);
        });
        setFieldMapping(initialMapping);
        setPreview({ headers: parsed.headers, rows: parsed.rows.slice(0, 5) });
        setMissingHeaders(validateMappedHeaders(initialMapping));
        setDuplicatesInFile(detectDuplicates(parsed.rows));
        setPhase("previewing");
      } else if (lowerName.endsWith(".pdf")) {
        setIsParsingPdf(true);
        const extracted = await extractLeadsFromPdf(selected);
        setIsParsingPdf(false);

        if (extracted.totalLeadsFound === 0) {
          setError("No readable lead records could be retrieved from this PDF. Please ensure the PDF contains contact text or table rows.");
          setPhase("error");
          return;
        }

        setAllExtractedRows(extracted.rows);
        const initialMapping: Record<string, TargetLeadFieldKey> = {};
        extracted.headers.forEach((h) => {
          initialMapping[h] = autoMapField(h);
        });

        // Smart fallback: if email or name was not auto-mapped from header name, inspect row values
        const mappedTargets = Object.values(initialMapping);
        if (!mappedTargets.includes("email") && extracted.rows.length > 0) {
          const emailCol = extracted.headers.find((h) =>
            extracted.rows.some((r) => r[h] && r[h].includes("@") && r[h].includes("."))
          );
          if (emailCol) initialMapping[emailCol] = "email";
        }
        if (!mappedTargets.includes("name") && extracted.rows.length > 0) {
          const nameCol = extracted.headers.find(
            (h) =>
              initialMapping[h] === "__skip__" &&
              extracted.rows.some((r) => {
                const val = (r[h] || "").trim();
                return val.length >= 2 && !/^\d+$/.test(val) && !val.includes("@");
              })
          );
          if (nameCol) initialMapping[nameCol] = "name";
        }

        setFieldMapping(initialMapping);
        setPreview({ headers: extracted.headers, rows: extracted.rows.slice(0, 5) });
        setMissingHeaders(validateMappedHeaders(initialMapping));
        setDuplicatesInFile(detectDuplicates(extracted.rows));
        setPhase("previewing");
      } else {
        setPreview(null);
        setMissingHeaders([]);
        setDuplicatesInFile(0);
        setAllExtractedRows([]);
        setFieldMapping({});
        setPhase("previewing");
      }
    } catch (err: any) {
      console.error('[processFile] Error parsing file:', err);
      setIsParsingPdf(false);
      setError(err?.message || "Error reading file. Please check file format.");
      setPhase("error");
    }
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

    if (missingHeaders.length > 0) {
      setError(`Please map ${missingHeaders.join(" and ")} before starting import.`);
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    
    setPhase("uploading");
    setError(null);
    
    try {
      console.log('[handleUpload] Preparing file for import...');
      let fileToUpload = file;

      // For PDF files or customized mappings, convert mapped rows into clean CSV
      if (file.name.toLowerCase().endsWith(".pdf") || allExtractedRows.length > 0) {
        let rowsToExport = allExtractedRows;
        if (allowReimport) {
          const ts = Date.now().toString().slice(-4);
          rowsToExport = allExtractedRows.map((r, idx) => {
            const copy = { ...r };
            for (const [col, target] of Object.entries(fieldMapping)) {
              if (target === "email" && copy[col] && copy[col].includes("@")) {
                const [local, domain] = copy[col].split("@");
                copy[col] = `${local}+reimport${ts}_${idx}@${domain}`;
              }
            }
            return copy;
          });
        }

        const csvString = convertMappedRowsToCsv(rowsToExport, fieldMapping);
        const blob = new Blob([csvString], { type: "text/csv" });
        const cleanName = file.name.replace(/\.[^/.]+$/, "") + "_import.csv";
        fileToUpload = new File([blob], cleanName, { type: "text/csv" });
      }

      console.log('[handleUpload] Calling startLeadImport with:', fileToUpload.name, fileToUpload.size);
      const res = await startLeadImport(fileToUpload);
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
    setAllExtractedRows([]); setFieldMapping({}); setIsParsingPdf(false);
    setHasErrorCsv(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const progressPct = jobStatus?.progress ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl shadow-2xl w-full overflow-hidden border border-slate-200/60 transition-all duration-200 ${
        phase === "previewing" ? "max-w-2xl" : "max-w-lg"
      }`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-white">Bulk Import Leads</h3>
            <p className="text-xs text-blue-100 font-semibold uppercase tracking-widest mt-0.5">
              CSV, EXCEL, OR PDF · BULK INGESTION & FIELD MAPPING
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={phase === "uploading" || phase === "polling" || isParsingPdf}
            className="text-blue-100 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">

          {/* ── PARSING PDF STATE ── */}
          {isParsingPdf && (
            <div className="flex flex-col items-center text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner">
                <Loader2 size={32} className="text-blue-600 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 mb-1">Analyzing PDF Document…</h4>
                <p className="text-xs text-slate-500 font-medium">Decompressing document streams and extracting lead records…</p>
              </div>
            </div>
          )}

          {/* ── IDLE: file picker ─────────────────────────────────────────── */}
          {!isParsingPdf && phase === "idle" && (
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
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-extrabold text-slate-900 mb-1">
                  {isDragging ? "Drop file here" : "Choose a file or drag & drop"}
                </p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  CSV, PDF, PPT · MAX 10 MB / 5 000 ROWS
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

                    {/* All 21 Schema Attributes breakdown */}
                    <div>
                      <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                        Supported Import Fields (21 Lead Attributes)
                      </p>
                      
                      <div className="space-y-3 text-xs">
                        {/* Required */}
                        <div className="bg-red-50/60 border border-red-100 rounded-xl p-2.5">
                          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5">Required Fields</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-red-800">
                              <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-red-200">name</span>
                              <span className="text-red-600 font-sans text-[10px]">(or Full Name, Contact Name)</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-red-800">
                              <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-red-200">email</span>
                              <span className="text-red-600 font-sans text-[10px]">(or Email Address, Contact Email)</span>
                            </div>
                          </div>
                        </div>

                        {/* Optional categories */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Contact & Location</p>
                            <p><span className="font-mono font-bold text-slate-700">phone</span> · Mobile / Phone number</p>
                            <p><span className="font-mono font-bold text-slate-700">city</span>, <span className="font-mono font-bold text-slate-700">state</span>, <span className="font-mono font-bold text-slate-700">country</span></p>
                            <p><span className="font-mono font-bold text-slate-700">pinCode</span> (Zip), <span className="font-mono font-bold text-slate-700">language</span>, <span className="font-mono font-bold text-slate-700">territory</span></p>
                          </div>

                          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Company & Position</p>
                            <p><span className="font-mono font-bold text-slate-700">company</span> · Company / Org name</p>
                            <p><span className="font-mono font-bold text-slate-700">industry</span> · Tech, Healthcare, Retail…</p>
                            <p><span className="font-mono font-bold text-slate-700">companySize</span> · 10-50, 100-500…</p>
                            <p><span className="font-mono font-bold text-slate-700">jobTitle</span> · Designation / Title</p>
                          </div>

                          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Pipeline & Assignee</p>
                            <p><span className="font-mono font-bold text-slate-700">status</span> · NEW, WARM, HOT, COLD, DEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED</p>
                            <p><span className="font-mono font-bold text-slate-700">owner</span> / <span className="font-mono font-bold text-slate-700">assignedToId</span> · Rep name / ID</p>
                            <p><span className="font-mono font-bold text-slate-700">source</span> · Website, LinkedIn, Referral…</p>
                          </div>

                          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Value & Intelligence</p>
                            <p><span className="font-mono font-bold text-slate-700">estimatedValue</span> (budget) · Deal amount</p>
                            <p><span className="font-mono font-bold text-slate-700">product</span> · Interested product/service</p>
                            <p><span className="font-mono font-bold text-slate-700">externalId</span>, <span className="font-mono font-bold text-slate-700">tags</span>, <span className="font-mono font-bold text-slate-700">note</span>, <span className="font-mono font-bold text-slate-700">score</span></p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Sample row */}
                    <div>
                      <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                        Sample Header Row (CSV / XLSX / XLS)
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                        <table className="w-full text-[11px] min-w-max">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 font-mono text-[10px]">
                              {["name","email","phone","company","industry","jobTitle","city","status","source","estimatedValue","externalId","tags","note"].map((h) => (
                                <th key={h} className="text-left px-2.5 py-1.5 font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap font-medium">Jane Doe</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">jane@acme.com</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">+1-555-0192</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">Acme Corp</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">Software</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">CTO</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">Austin</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap text-amber-600 font-bold">HOT</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">Website</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">50000</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap font-mono">EXT-101</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">enterprise, vip</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">Q4 Rollout candidate</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Rules list */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 space-y-1">
                      <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-1">
                        Backend Validation & Ingestion Features
                      </p>
                      {[
                        "Supports .CSV, .XLSX, and .XLS file formats up to 10 MB / 5,000 rows.",
                        "Dynamic header resolution maps aliases like 'Email Address', 'Full Name', 'Deal Value', 'Zip Code' automatically.",
                        "Tenant-isolated deduplication on normalized Email & Phone within your organization.",
                        "Preserves explicit assignee (owner / assignedToId); auto-assignment rule applies when empty.",
                        "Data normalization standardizes emails, phones, numeric budgets, tags, and status values.",
                        "Error CSV download report preserves all 21 fields with row numbers and exact failure reasons.",
                      ].map((rule, i) => (
                        <p key={i} className="text-[11px] text-amber-800 leading-snug flex items-start gap-1.5">
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
              <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-100 rounded-2xl px-4 py-3">
                {file.name.toLowerCase().endsWith(".pdf") ? (
                  <FileText size={22} className="text-red-500 shrink-0" />
                ) : (
                  <FileSpreadsheet size={22} className="text-blue-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{file.name}</p>
                    {file.name.toLowerCase().endsWith(".pdf") ? (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        PDF
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Spreadsheet
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB · <span className="font-semibold text-blue-700">{allExtractedRows.length} lead records retrieved</span>
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                  aria-label="Remove"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Missing required columns warning */}
              {missingHeaders.length > 0 ? (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900 mb-0.5">Required field mapping missing</p>
                    <p className="text-xs text-amber-700 leading-snug">
                      Please map <span className="font-bold">{missingHeaders.join(" and ")}</span> using the field selectors below to proceed with lead creation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold text-emerald-800">
                    All required fields (Full Name, Email Address) are mapped and ready for import.
                  </p>
                </div>
              )}

              {/* In-file duplicates warning */}
              {duplicatesInFile > 0 && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                  <SkipForward size={15} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-800 mb-0.5">
                      {duplicatesInFile} potential duplicate row{duplicatesInFile > 1 ? "s" : ""} detected
                    </p>
                    <p className="text-xs text-orange-600">
                      The server will automatically deduplicate against your existing leads database.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Field Mapping Configuration Card ── */}
              {preview && preview.headers.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal size={15} className="text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Field Mapping</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {Object.values(fieldMapping).filter(v => v !== "__skip__").length} of {preview.headers.length} Columns Mapped
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug">
                    Confirm or adjust how the detected columns connect to standard Zyoris Lead attributes:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {preview.headers.map((h) => {
                      const current = fieldMapping[h] || "__skip__";
                      const isReq = current === "name" || current === "email";
                      return (
                        <div
                          key={h}
                          className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition-colors ${
                            isReq
                              ? "bg-blue-50/60 border-blue-200"
                              : current === "__skip__"
                              ? "bg-slate-100/50 border-slate-200/60 opacity-80"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 truncate" title={h}>{h}</p>
                            <p className="text-[10px] text-slate-400">File column</p>
                          </div>
                          <ArrowRight size={12} className="text-slate-400 shrink-0" />
                          <select
                            value={current}
                            onChange={(e) => handleMappingChange(h, e.target.value as TargetLeadFieldKey)}
                            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 max-w-[140px] truncate"
                          >
                            <optgroup label="Required">
                              <option value="name">Full Name *</option>
                              <option value="email">Email Address *</option>
                            </optgroup>
                            <optgroup label="Contact Info">
                              <option value="phone">Phone Number</option>
                              <option value="city">City / Location</option>
                              <option value="state">State / Province</option>
                              <option value="country">Country</option>
                            </optgroup>
                            <optgroup label="Company Info">
                              <option value="company">Company / Org</option>
                              <option value="jobTitle">Job Title / Role</option>
                              <option value="industry">Industry</option>
                            </optgroup>
                            <optgroup label="Lead Details">
                              <option value="status">Status</option>
                              <option value="source">Source</option>
                              <option value="estimatedValue">Deal Value</option>
                              <option value="tags">Tags</option>
                              <option value="note">Notes / Details</option>
                            </optgroup>
                            <option value="__skip__">— Do Not Import —</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data preview table */}
              {preview && preview.headers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Eye size={13} className="text-slate-400" />
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        Preview — First {preview.rows.length} of {allExtractedRows.length} Leads
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400">Showing first {preview.rows.length} rows</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs max-h-52 overflow-y-auto">
                    <table className="w-full text-xs min-w-max border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                        <tr className="border-b border-slate-200">
                          {preview.headers.map((h) => {
                            const target = fieldMapping[h];
                            const isReq = target === "name" || target === "email";
                            const label = TARGET_LEAD_FIELDS.find(f => f.key === target)?.label;
                            return (
                              <th key={h} className="text-left px-3 py-2 font-bold text-slate-700 uppercase tracking-wide whitespace-nowrap">
                                <div>{h}</div>
                                {target && target !== "__skip__" ? (
                                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                                    isReq ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    → {label || target} {isReq ? "*" : ""}
                                  </span>
                                ) : (
                                  <span className="inline-block text-[9px] text-slate-400 font-normal px-1.5 py-0.5 bg-slate-200/60 rounded mt-0.5">
                                    Skipped
                                  </span>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            {preview.headers.map((h) => (
                              <td key={h} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[150px] truncate">
                                {row[h] || <span className="text-slate-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Duplicate Handling Option */}
              <label className="flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={allowReimport}
                  onChange={(e) => setAllowReimport(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 shrink-0"
                />
                <div className="text-xs">
                  <p className="font-bold text-blue-900">Allow duplicate email re-imports</p>
                  <p className="text-blue-700">Appends a unique suffix to re-import leads that already exist in your database.</p>
                </div>
              </label>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  onClick={handleUpload}
                  disabled={missingHeaders.length > 0}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> Start Import ({allExtractedRows.length} Leads)
                </button>
                <button onClick={handleReset} className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl border border-slate-200 transition-all">
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
                  {jobStatus 
                    ? (jobStatus.totalRows === 0 && file?.name.match(/\.(pdf|ppt|pptx)$/i)
                        ? "Extracting leads from document…"
                        : statusLabel(jobStatus.status))
                    : "Starting import…"}
                </h4>
                <p className="text-xs text-gray-400">{file?.name}</p>
              </div>

              {/* Progress bar — driven by real job.progress */}
              <div className="w-full">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>
                    {jobStatus
                      ? (jobStatus.totalRows === 0 && file?.name.match(/\.(pdf|ppt|pptx)$/i)
                          ? "Parsing document text..."
                          : `${jobStatus.processedRows.toLocaleString()} / ${jobStatus.totalRows.toLocaleString()} rows`)
                      : "Waiting for server…"}
                  </span>
                  {!(jobStatus?.totalRows === 0 && file?.name.match(/\.(pdf|ppt|pptx)$/i)) && (
                    <span className="font-bold tabular-nums">{Math.round(progressPct)}%</span>
                  )}
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full bg-blue-600 rounded-full transition-all duration-500 ${jobStatus?.totalRows === 0 && file?.name.match(/\.(pdf|ppt|pptx)$/i) ? 'w-full animate-pulse opacity-75' : ''}`}
                    style={{ width: jobStatus?.totalRows === 0 && file?.name.match(/\.(pdf|ppt|pptx)$/i) ? '100%' : `${progressPct}%` }}
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
                      To import new leads, upload a file with different email addresses.
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

                {/* When all rows were duplicates (email already exists) — just close.
                    Do NOT show "Review & Merge Duplicates" — the Duplicates tab scans
                    for fuzzy/similar leads, not email-exact blocks. These rows were
                    prevented from entering the DB, so nothing to merge. */}
                {allDuplicates && (
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold rounded-2xl transition-all"
                  >
                    Got it, Close
                  </button>
                )}

                {/* When partial/full success, just show Done */}
                {!allDuplicates && (
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl transition-all"
                  >
                    Done
                  </button>
                )}
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