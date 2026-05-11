"use client";

import { useState, DragEvent, ChangeEvent } from "react";
import api from "@/lib/api";
import type { UploadAnalysisData } from "./UploadAnalysisSection";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";

type Status = "idle" | "uploading" | "success" | "error";

type UploadPanelProps = {
  onAnalysis?: (analysis: UploadAnalysisData) => void;
};

export function UploadPanel({ onAnalysis }: UploadPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function uploadSelectedFile(selected: File | null) {
    if (!selected) {
      setMessage("Please select a CSV or Excel file first.");
      setStatus("error");
      return;
    }
    setStatus("uploading");
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", selected);
      const res = await api.post("/ingestion/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("success");
      const rows = res.data.rowsIngested ?? res.data.rows ?? 0;
      setMessage(
        rows > 0
          ? `Ingested ${rows} rows from ${selected.name}. Analysis and charts are below.`
          : `Processed ${selected.name}. Analysis and charts are below.`
      );
      if (res.data.analysis && onAnalysis) onAnalysis(res.data.analysis as UploadAnalysisData);
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.response?.data?.error ?? "Upload failed. Please check file format.");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;
    setFile(list[0]);
    setStatus("idle");
    setMessage(null);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    setFile(list[0]);
    setStatus("idle");
    setMessage(null);
  }

  function clearFile() {
    setFile(null);
    setStatus("idle");
    setMessage(null);
  }

  return (
    <div className="space-y-3">

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden"
        style={{
          borderColor: isDragging
            ? "#2563EB"
            : status === "error"
              ? "#FCA5A5"
              : "#E5E7EB",
          background: isDragging
            ? "rgba(37,99,235,0.04)"
            : status === "error"
              ? "rgba(254,242,242,0.5)"
              : "#FAFAFA",
        }}
      >
        <input
          type="file"
          accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {/* ↓ py-6 instead of py-10, icon shrunk to w-12/h-12 */}
        <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-6 text-center">

          {/* Icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
            style={{
              background: isDragging ? "rgba(37,99,235,0.1)" : "#EFF6FF",
            }}
          >
            <UploadCloud
              size={22}
              className="transition-colors"
              style={{ color: isDragging ? "#1D4ED8" : "#3B82F6" }}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700">
              {isDragging ? "Drop your file here" : "Drag & drop file here"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              or{" "}
              <span className="text-blue-600 font-medium">click to browse</span>
              . Supports CSV and Excel exports from your CRM, ERP, or finance systems.
            </p>
          </div>

          <p className="text-xs text-gray-300 max-w-sm leading-relaxed">
            Zyoris will ingest recognizable columns into revenue, deals,
            expenses, marketing, or inventory tables.
          </p>

          {/* Format chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[".CSV", ".XLS", ".XLSX"].map((ext) => (
              <span
                key={ext}
                className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400"
              >
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Selected file pill */}
      {file && status !== "success" && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={15} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800 truncate">{file.name}</p>
            <p className="text-xs text-blue-400">
              {(file.size / 1024).toFixed(1)} KB · Ready to upload
            </p>
          </div>
          <button
            onClick={clearFile}
            className="p-1.5 rounded-lg text-blue-300 hover:text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Success state */}
      {status === "success" && message && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">{message}</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && message && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 font-medium">{message}</p>
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => uploadSelectedFile(file)}
        disabled={!file || status === "uploading"}
        className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200"
        style={{
          background: !file
            ? "#E5E7EB"
            : status === "uploading"
              ? "#93C5FD"
              : "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
          color: !file ? "#9CA3AF" : "white",
          boxShadow:
            !file || status === "uploading"
              ? "none"
              : "0 4px 14px 0 rgba(37,99,235,0.3)",
          cursor: !file ? "not-allowed" : "pointer",
        }}
      >
        {status === "uploading" ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <UploadCloud size={15} />
            {file ? "Upload file" : "Select a file first"}
          </>
        )}
      </button>
    </div>
  );
}