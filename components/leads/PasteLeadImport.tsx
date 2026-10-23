"use client";

import React, { useState } from "react";
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowRight,
  ClipboardPaste,
  Building2,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  X,
  FileText,
} from "lucide-react";
import { importLeadsFromText, TextLeadImportResponse, ExtractedLeadItem } from "@/lib/api/leadsApi";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface PasteLeadImportProps {
  onSuccess?: () => Promise<void> | void;
  onClose?: () => void;
  showListingRedirect?: boolean;
}

const SAMPLE_TEMPLATES = {
  single: `John Doe
VP of Sales at Acme Corporation
Email: john.doe@acme.com
Phone: +1 (555) 234-5678
Location: New York, USA
Budget: $50,000
Notes: Met at TechExpo 2026. Highly interested in our Enterprise AI CRM integration.`,

  multipleBlocks: `Sarah Connor
Chief Technology Officer at Cyberdyne Systems
Email: sarah.connor@cyberdyne.io
Phone: +1 415-555-0144
City: San Francisco
Status: HOT
Notes: Urgent need for automated data migration pipeline.

Bruce Wayne
Managing Director, Wayne Enterprises
Email: bruce@waynecorp.com
Phone: +1 (212) 555-0199
Designation: Managing Director
City: Gotham
Estimated Value: 120000

Diana Prince
Curator at Themyscira Cultural Corp
Email: diana.prince@themyscira.org
Phone: +30 210 555 0199
City: Athens
Notes: Interested in multi-lingual workflow tools.`,

  delimited: `1. Michael Scott | Dunder Mifflin Paper | michael@dundermifflin.com | +1 570-555-0123 | Regional Manager | Scranton
2. Dwight Schrute | Schrute Farms & Paper | dwight@schrute.com | +1 570-555-0144 | Assistant Regional Manager | Scranton
3. Pam Beesly | Dunder Mifflin Paper | pam@dundermifflin.com | +1 570-555-0155 | Office Administrator | Scranton`,
};

export default function PasteLeadImport({
  onSuccess,
  onClose,
  showListingRedirect = true,
}: PasteLeadImportProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TextLeadImportResponse | null>(null);

  const handleUpload = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please paste some lead text into the box before uploading.");
      return;
    }

    if (trimmed.length < 5) {
      setError("Pasted text is too short to extract lead information.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await importLeadsFromText(trimmed);
      setResult(response);

      if (response.importedCount > 0) {
        toast.success(`Successfully imported ${response.importedCount} lead${response.importedCount === 1 ? "" : "s"}!`);
        if (onSuccess) {
          try {
            await onSuccess();
          } catch (err) {
            console.warn("[PasteLeadImport] onSuccess handler error:", err);
          }
        }
      } else if (response.totalExtracted === 0) {
        toast.info("No identifiable lead details found in the pasted text.");
      } else {
        toast.warning("No new leads were imported (all detected leads were duplicates or invalid).");
      }
    } catch (err: any) {
      console.error("[PasteLeadImport] Error importing leads from text:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to import leads from pasted text. Please check your text and try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setText("");
    setResult(null);
    setError(null);
  };

  const handleApplySample = (key: keyof typeof SAMPLE_TEMPLATES) => {
    setText(SAMPLE_TEMPLATES[key]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* ─── RESULT SUMMARY VIEW ─── */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Detected</p>
                <p className="text-2xl font-black text-blue-950 mt-1">{result.totalExtracted}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Imported Successfully</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">{result.importedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className={`rounded-2xl p-4 flex items-center justify-between border ${
              result.failedCount > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
            }`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${
                  result.failedCount > 0 ? "text-amber-700" : "text-slate-500"
                }`}>
                  Failed / Skipped
                </p>
                <p className={`text-2xl font-black mt-1 ${
                  result.failedCount > 0 ? "text-amber-950" : "text-slate-800"
                }`}>
                  {result.failedCount}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                result.failedCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
              }`}>
                {result.failedCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {result.importedCount > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  {result.importedCount} {result.importedCount === 1 ? "lead was" : "leads were"} imported successfully!
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Each lead has been created in your database and appears in the main Leads listing.
                </p>
              </div>
            </div>
          )}

          {/* List of Imported Leads */}
          {result.importedLeads && result.importedLeads.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Imported Leads ({result.importedLeads.length})
                </h4>
                <span className="text-xs text-slate-500">Structured & Persisted</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {result.importedLeads.map((lead: any, idx: number) => (
                  <div key={lead.id || idx} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{lead.name}</span>
                        {lead.jobTitle && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Briefcase size={12} />
                            {lead.jobTitle}
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {lead.status || "NEW"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {lead.company && (
                          <span className="flex items-center gap-1">
                            <Building2 size={13} className="text-slate-400" />
                            {lead.company}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={13} className="text-slate-400" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={13} className="text-slate-400" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400" />
                            {lead.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed / Skipped Records Breakdown */}
          {result.failedLeads && result.failedLeads.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle size={15} className="text-amber-600" />
                Skipped / Failed Records ({result.failedLeads.length})
              </div>
              <p className="text-xs text-amber-800">
                The following leads could not be imported because of existing duplicates or validation constraints:
              </p>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {result.failedLeads.map((f, i) => (
                  <div key={i} className="bg-white/90 border border-amber-200 rounded-xl p-2.5 text-xs text-slate-700 flex items-start justify-between gap-3 shadow-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{f.lead.name || "Unnamed Record"}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {f.lead.email || f.lead.phone || f.lead.company || "No contact info"}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-lg shrink-0">
                      {f.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs"
            >
              <RefreshCw size={14} />
              Import More Leads
            </button>

            {showListingRedirect && (
              <button
                onClick={() => {
                  if (onClose) onClose();
                  router.push("/leads");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
              >
                <span>View All Leads</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── INPUT / TEXTAREA VIEW ─── */}
      {!result && (
        <div className="space-y-5">
          {/* Instructions banner */}
          <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/60 rounded-2xl flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
              <Sparkles size={16} />
            </div>
            <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-900">
                Paste unstructured text from emails, LinkedIn, spreadsheets, or notes.
              </p>
              <p>
                Our AI extraction engine automatically detects individual contacts, extracts their name, company, email, phone, designation, and location, and directly structures and saves each lead into your database.
              </p>
            </div>
          </div>

          {/* Quick Sample Presets */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-slate-500">Quick Test Samples:</span>
            <button
              type="button"
              onClick={() => handleApplySample("single")}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              Single Lead
            </button>
            <button
              type="button"
              onClick={() => handleApplySample("multipleBlocks")}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              Multiple Leads (Blocks)
            </button>
            <button
              type="button"
              onClick={() => handleApplySample("delimited")}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              Delimited List
            </button>
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                className="px-2.5 py-1 text-rose-600 hover:text-rose-700 font-medium ml-auto"
              >
                Clear
              </button>
            )}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              rows={8}
              placeholder={`Paste any text containing one or more leads here...\n\nExample:\nJohn Smith\nCTO at Acme Technologies\nEmail: john@acme.com\nPhone: +1 (555) 0199\nCity: Boston`}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 p-4 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-y min-h-[180px]"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mt-1.5">
              <span>{text.split(/\n+/).filter(Boolean).length} lines</span>
              <span>{text.length} characters</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload / Import Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isLoading || !text.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Extracting & Importing Leads...</span>
                </>
              ) : (
                <>
                  <Upload size={15} />
                  <span>Upload / Import Leads</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
