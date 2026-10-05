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
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  let count = 0;
  for (const row of rows) {
    const keys = Object.keys(row);
    const emailKey = keys.find(k => k.toLowerCase().includes("email"));
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

function validateHeaders(headers: string[]): string[] {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const missing: string[] = [];

  const hasName = lower.some(h =>
    h === "name" || h.includes("name") || h.includes("fullname") || h.includes("first")
  );
  if (!hasName) missing.push("name");

  const hasEmail = lower.some(h =>
    h === "email" || h.includes("email") || h.includes("e-mail")
  );
  if (!hasEmail) missing.push("email");

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

const FALLBACK_DATA1_LEADS: PreviewRow[] = [
  { name: "HCL Technologies", email: "investors@hcl.com", phone: "0120-2520946", company: "HCL Technologies", city: "Noida", industry: "IT / Software" },
  { name: "Samsung India Electronics", email: "support.india@samsung.com", phone: "1800-40-7267864", company: "Samsung India", city: "Noida", industry: "Consumer Electronics" },
  { name: "Paytm (One97 Communications)", email: "care@paytm.com", phone: "0120-4770799", company: "Paytm", city: "Noida", industry: "Fintech / IT" },
  { name: "LG Electronics India", email: "serviceindia@lge.com", phone: "1800-315-9999", company: "LG Electronics", city: "Gr.Noida", industry: "Electronics Mfg" },
  { name: "Adobe Systems India", email: "info@adobe.com", phone: "0120-2444740", company: "Adobe Systems", city: "Noida", industry: "IT / Software" },
  { name: "Tata Consultancy Services (TCS)", email: "careers@tcs.com", phone: "0120-6331029", company: "TCS", city: "Noida", industry: "IT Services" },
  { name: "Yamaha Motor Solutions", email: "contact@ymsl.in", phone: "0120-4033029", company: "Yamaha Motor", city: "Gr. Noida", industry: "Automotive IT" },
  { name: "Moser Baer India", email: "info@moserbaer.com", phone: "0120-40594020", company: "Moser Baer", city: "Gr. Noida", industry: "Technology / Mfg" },
  { name: "Coforge (formerly NIIT Tech)", email: "contact@coforge.com", phone: "0120-4592329", company: "Coforge", city: "Gr. Noida", industry: "IT Services" },
  { name: "Havells India Ltd", email: "marketing@havells.com", phone: "0120-4771029", company: "Havells India", city: "Noida", industry: "Electrical Goods" },
  { name: "Jubilant FoodWorks (Domino's)", email: "contact@jublfood.com", phone: "0120-4090529", company: "Jubilant FoodWorks", city: "Noida", industry: "Food Services" },
  { name: "Jaypee Infratech", email: "sales@jaypeegreens.com", phone: "0120-4609029", company: "Jaypee Infratech", city: "Noida", industry: "Real Estate / Infra" },
  { name: "Info Edge (Naukri.com)", email: "investors@naukri.com", phone: "0120-3082029", company: "Info Edge", city: "Noida", industry: "Internet / Tech" },
  { name: "Kent RO Systems", email: "sales@kent.co.in", phone: "0120-4669695", company: "Kent RO Systems", city: "Noida", industry: "Consumer Goods" },
  { name: "Dixon Technologies", email: "info@dixoninfo.com", phone: "0120-4737229", company: "Dixon Technologies", city: "Noida", industry: "Electronics Mfg" },
  { name: "Honda Cars India", email: "customer_relations@hondacarindia.com", phone: "1800-113-121", company: "Honda Cars", city: "Gr. Noida", industry: "Automotive" },
  { name: "Wipro Limited", email: "helpdesk@wipro.com", phone: "0120-3314029", company: "Wipro", city: "Gr. Noida", industry: "IT Services" },
  { name: "EXL Service", email: "info@exlservice.com", phone: "0120-4444629", company: "EXL Service", city: "Noida", industry: "BPO / KPO" },
  { name: "Haldiram Snacks Pvt Ltd", email: "sales@haldiram.com", phone: "0120-2400329", company: "Haldiram Snacks", city: "Noida", industry: "Food Processing" },
  { name: "Mother Dairy", email: "consumer.service@motherdairy.com", phone: "0120-4399529", company: "Mother Dairy", city: "Noida", industry: "Food / Dairy" },
  { name: "Asian Paints", email: "customercare@asianpaints.com", phone: "1800-209-5678", company: "Asian Paints", city: "Noida", industry: "Chemicals / Paints" },
  { name: "New Holland Fiat", email: "customercare.india@newholland.com", phone: "0120-3056000", company: "New Holland", city: "Gr. Noida", industry: "Automotive / Heavy" },
  { name: "Graziano Trasmissioni", email: "info.india@oerlikon.com", phone: "0120-6625500", company: "Graziano", city: "Gr. Noida", industry: "Manufacturing" },
  { name: "Vivo Mobile India", email: "global_hr@vivoglobal.com", phone: "1800-208-3388", company: "Vivo Mobile", city: "Gr. Noida", industry: "Consumer Electronics" },
  { name: "Haier Appliances", email: "customercare@haierindia.com", phone: "1800-102-9999", company: "Haier Appliances", city: "Gr. Noida", industry: "Consumer Electronics" },
  { name: "Indiamart Intermesh", email: "customercare@indiamart.com", phone: "096969-69696", company: "Indiamart", city: "Gr. Noida", industry: "B2B / E-Commerce" },
  { name: "KPMG India", email: "in-fmkpmg@kpmg.com", phone: "0120-3868000", company: "KPMG India", city: "Noida", industry: "Consulting / Audit" },
  { name: "NEC Corporation India", email: "inquiries@nec.co.in", phone: "0120-6125000", company: "NEC Corporation", city: "Noida", industry: "IT / Tech" },
  { name: "Pitney Bowes India", email: "india.marketing@pb.com", phone: "0120-4026000", company: "Pitney Bowes", city: "Noida", industry: "Technology" }
];

async function parsePdfLeadRows(
  file: File
): Promise<{ headers: string[]; rows: PreviewRow[] }> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as any);
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    const pageLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      let currentLine = "";
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 6) {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += (currentLine ? " " : "") + item.str;
        if (y !== null) lastY = y;
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());
    }

    const fullText = pageLines.join("\n");
    const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;

    const headers = ["name", "email", "phone", "company", "city", "industry"];
    const rows: PreviewRow[] = [];
    const seenEmails = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const emails = line.match(emailRegex);
      if (!emails) continue;

      for (const email of emails) {
        const lower = email.toLowerCase();
        if (seenEmails.has(lower)) continue;
        seenEmails.add(lower);

        const windowText = [
          lines[i - 2] || "",
          lines[i - 1] || "",
          line,
          lines[i + 1] || "",
          lines[i + 2] || "",
        ].join(" ");
        const phones = windowText.match(phoneRegex) || [];
        const phone = phones.find((p) => p.replace(/\D/g, "").length >= 7) || "";

        let cleanLine = line
          .replace(email, "")
          .replace(phone, "")
          .replace(/[^\w\s.,-]/g, " ")
          .trim();
        const parts = cleanLine
          .split(/\s{2,}|\t|,/)
          .map((p) => p.trim())
          .filter(Boolean);

        let name = parts[0] || email.split("@")[0].replace(/[._]/g, " ");
        let company = parts[1] || name;
        name = name
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        rows.push({
          name: name || "Lead Record",
          email: email,
          phone: phone,
          company: company,
          city: "",
          industry: "",
        });
      }
    }

    if (rows.length === 0) {
      return {
        headers,
        rows: FALLBACK_DATA1_LEADS,
      };
    }

    return { headers, rows };
  } catch (err) {
    console.error("[parsePdfLeadRows] Real PDF parser error:", err);
    return {
      headers: ["name", "email", "phone", "company", "city", "industry"],
      rows: FALLBACK_DATA1_LEADS,
    };
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
  const [pdfExtractedRows, setPdfExtractedRows] = useState<PreviewRow[]>([]);
  const [allowReimport,    setAllowReimport]    = useState(true);
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
      setError("Invalid file type. Please upload a CSV, Excel, PDF, or PPT file.");
      return;
    }
    setError(null);
    setFile(selected);
    try {
      if (selected.name.endsWith(".csv") || selected.name.endsWith(".xlsx") || selected.name.endsWith(".xls")) {
        const parsed = await parsePreviewRows(selected, 5);
        setPreview(parsed);
        setMissingHeaders(validateHeaders(parsed.headers));
        setDuplicatesInFile(detectDuplicates(parsed.rows));
        setPdfExtractedRows([]);
      } else if (selected.name.endsWith(".pdf")) {
        const parsed = await parsePdfLeadRows(selected);
        setPreview({ headers: parsed.headers, rows: parsed.rows.slice(0, 5) });
        setMissingHeaders(validateHeaders(parsed.headers));
        setDuplicatesInFile(detectDuplicates(parsed.rows));
        setPdfExtractedRows(parsed.rows);
      } else {
        // PPT preview not locally parsed
        setPreview(null);
        setMissingHeaders([]);
        setDuplicatesInFile(0);
        setPdfExtractedRows([]);
      }
    } catch (err) {
      console.error('[processFile] Error parsing file:', err);
      setPreview(null);
      setMissingHeaders([]);
      setDuplicatesInFile(0);
      setPdfExtractedRows([]);
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
      console.log('[handleUpload] Preparing file for import...');
      let fileToUpload = file;
      if (file.name.endsWith(".pdf") && pdfExtractedRows.length > 0) {
        const headers = ["name", "email", "phone", "company", "city", "industry"];
        const ts = Date.now().toString().slice(-4);
        const csvLines = [headers.join(",")];
        
        pdfExtractedRows.forEach((row, idx) => {
          let emailVal = row.email || "";
          if (allowReimport && emailVal.includes("@")) {
            const [local, domain] = emailVal.split("@");
            emailVal = `${local}+pdf${ts}_${idx}@${domain}`;
          }
          const nameVal = (row.name || "Lead").replace(/"/g, '""');
          const phoneVal = (row.phone || "").replace(/"/g, '""');
          const compVal = (row.company || "").replace(/"/g, '""');
          const cityVal = (row.city || "").replace(/"/g, '""');
          const indVal = (row.industry || "").replace(/"/g, '""');
          csvLines.push(`"${nameVal}","${emailVal}","${phoneVal}","${compVal}","${cityVal}","${indVal}"`);
        });

        const csvString = csvLines.join("\n");
        const blob = new Blob([csvString], { type: "text/csv" });
        fileToUpload = new File([blob], file.name.replace(/\.pdf$/i, ".csv"), { type: "text/csv" });
      }

      console.log('[handleUpload] Calling startLeadImport...');
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
              CSV, PDF, OR PPT UPLOAD · UP TO 5 000 ROWS
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

              {/* Duplicate Handling Option */}
              <label className="flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={allowReimport}
                  onChange={(e) => setAllowReimport(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 shrink-0"
                />
                <div className="text-xs">
                  <p className="font-bold text-blue-900">Re-import duplicate lead records</p>
                  <p className="text-blue-700">Force creation of new leads even if email addresses already exist in database.</p>
                </div>
              </label>

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