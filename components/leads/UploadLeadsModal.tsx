"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadLeadsFile } from "@/lib/api/uploadsApi";

interface UploadLeadsModalProps {
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function UploadLeadsModal({ onClose, onSuccess }: UploadLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
        setError("Invalid file type. Please upload a CSV or Excel file.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      await uploadLeadsFile(file);
      setSuccess(true);
      
      // Refresh leads list
      await onSuccess();
      
      // Close modal after success delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.response?.data?.message || err.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/60 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white">Upload Leads</h3>
            <p className="text-xs text-blue-100 font-bold uppercase tracking-widest mt-1">Ingest leads via CSV/Excel</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-blue-100 hover:text-white p-2 transition-colors"
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-black text-slate-900 mb-2">Upload Successful!</h4>
              <p className="text-sm text-slate-500">Your leads are being processed and will appear in the list shortly.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm font-bold text-red-800">{error}</p>
                </div>
              )}

              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  file ? "border-blue-400 bg-blue-50/30" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  file ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                }`}>
                  <Upload size={28} />
                </div>
                
                <div className="text-center">
                  <p className="text-sm font-black text-slate-900 mb-1">
                    {file ? file.name : "Choose a file or drag & drop"}
                  </p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "CSV or Excel files only"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText size={18} />}
                  {isUploading ? "Uploading..." : "Start Upload"}
                </button>
                <button
                  onClick={onClose}
                  disabled={isUploading}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-600 text-sm font-black rounded-2xl border border-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
