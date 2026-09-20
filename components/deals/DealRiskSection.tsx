// components/deals/DealRiskSection.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Check,
  X,
  FileText,
  Filter,
} from "lucide-react";
import { DealRisk, RiskSeverityType } from "@/types/dealHealth";
import { fetchDealRisks, resolveRisk, fetchRiskById } from "@/lib/api/dealHealthApi";

interface DealRiskSectionProps {
  dealId: string;
  onRiskResolved?: () => void;
}

export function DealRiskSection({ dealId, onRiskResolved }: DealRiskSectionProps) {
  const [risks, setRisks] = useState<DealRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // Modals
  const [selectedRisk, setSelectedRisk] = useState<DealRisk | null>(null);
  const [inspectRiskLoading, setInspectRiskLoading] = useState(false);
  const [resolvingRisk, setResolvingRisk] = useState<DealRisk | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const loadRisks = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (severityFilter !== "ALL") filters.severity = severityFilter as RiskSeverityType;
      if (activeFilter === "ACTIVE") filters.isActive = "true";
      if (activeFilter === "RESOLVED") filters.isActive = "false";

      const data = await fetchDealRisks(dealId, filters);
      setRisks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load deal risks");
    } finally {
      setLoading(false);
    }
  }, [dealId, severityFilter, activeFilter]);

  useEffect(() => {
    loadRisks();
  }, [loadRisks]);

  const handleInspectRisk = async (risk: DealRisk) => {
    setSelectedRisk(risk);
    setInspectRiskLoading(true);
    try {
      const detailed = await fetchRiskById(risk.id);
      setSelectedRisk(detailed);
    } catch {
      // fallback to current risk object if detail call fails
    } finally {
      setInspectRiskLoading(false);
    }
  };

  const handleOpenResolve = (risk: DealRisk) => {
    setResolvingRisk(risk);
    setResolutionNotes("");
    setResolveError(null);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingRisk) return;
    setResolvingLoading(true);
    setResolveError(null);
    try {
      await resolveRisk(resolvingRisk.id, {
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
      setResolvingRisk(null);
      await loadRisks();
      if (onRiskResolved) onRiskResolved();
    } catch (err: any) {
      setResolveError(
        err.response?.data?.message || err.message || "Failed to resolve risk"
      );
    } finally {
      setResolvingLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const s = (severity || "").toUpperCase();
    if (s === "CRITICAL") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (s === "HIGH") {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (s === "MEDIUM") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const renderEvidence = (evidence: any) => {
    if (!evidence) return "No structured evidence provided";
    if (typeof evidence === "string") return evidence;
    if (evidence.summary) return evidence.summary;
    if (Array.isArray(evidence.detectedSignals)) {
      return evidence.detectedSignals.join(", ");
    }
    try {
      return JSON.stringify(evidence);
    } catch {
      return "Structured evidence recorded";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Detected Risks</h3>
            <p className="text-[11px] text-gray-400">
              Inactivity, competitor presence & deal blockers
            </p>
          </div>
        </div>

        {/* Severity & Status Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs">
            <Filter size={11} className="text-gray-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-gray-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent text-gray-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Loader2 className="animate-spin text-blue-600" size={20} />
          <p className="text-xs text-gray-400">Loading risks...</p>
        </div>
      ) : risks.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-10 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 size={20} />
          </div>
          <h4 className="text-xs font-bold text-gray-900 mb-0.5">No Active Risks Detected</h4>
          <p className="text-[11px] text-gray-400 max-w-xs">
            This deal has no active automated risk triggers or stagnation alerts.
          </p>
        </div>
      ) : (
        /* Risk List */
        <div className="space-y-3">
          {risks.map((risk) => {
            const isResolved =
              risk.status?.toUpperCase() === "RESOLVED" || risk.isActive === false;
            return (
              <div
                key={risk.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isResolved
                    ? "bg-gray-50/40 border-gray-100 opacity-70"
                    : "bg-white border-gray-100 hover:border-gray-200 shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getSeverityBadge(
                        risk.severity
                      )}`}
                    >
                      {risk.severity}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{risk.riskType}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isResolved
                        ? "bg-gray-100 text-gray-600"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {risk.status || (risk.isActive ? "ACTIVE" : "RESOLVED")}
                  </span>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-3">
                  {renderEvidence(risk.evidence)}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400">
                    {risk.createdAt ? new Date(risk.createdAt).toLocaleDateString() : ""}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInspectRisk(risk)}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Info size={12} />
                      Evidence
                    </button>

                    {!isResolved && (
                      <button
                        onClick={() => handleOpenResolve(risk)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 border border-emerald-200"
                      >
                        <Check size={12} />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Inspect Evidence Modal ── */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Risk Evidence</h3>
                  <p className="text-[11px] text-gray-400">{selectedRisk.riskType}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRisk(null)}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getSeverityBadge(
                    selectedRisk.severity
                  )}`}
                >
                  {selectedRisk.severity}
                </span>
                <span className="text-xs text-gray-500 font-mono">ID: {selectedRisk.id}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Structured Evidence
                </span>
                {inspectRiskLoading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={20} />
                  </div>
                ) : (
                  <pre className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto">
                    {typeof selectedRisk.evidence === "object"
                      ? JSON.stringify(selectedRisk.evidence, null, 2)
                      : String(selectedRisk.evidence || "No additional evidence")}
                  </pre>
                )}
              </div>

              {selectedRisk.resolutionNotes && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Resolution Notes
                  </span>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-900 font-medium">
                    {selectedRisk.resolutionNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedRisk(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Risk Modal ── */}
      {resolvingRisk && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Resolve Risk</h3>
                  <p className="text-[11px] text-gray-400">{resolvingRisk.riskType}</p>
                </div>
              </div>
              <button
                onClick={() => setResolvingRisk(null)}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
              {resolveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {resolveError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Resolution Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Customer clarified budget timeline and confirmed executive alignment."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Resolving this risk will audit the action on the backend and recalculate deal health.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResolvingRisk(null)}
                  disabled={resolvingLoading}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolvingLoading || !resolutionNotes.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200"
                >
                  {resolvingLoading && <Loader2 size={14} className="animate-spin" />}
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
