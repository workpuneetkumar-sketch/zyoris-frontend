// components/deals/OrgRisksModal.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Filter,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";
import { DealRisk, RiskSeverityType } from "@/types/dealHealth";
import {
  fetchOrganizationRisks,
  fetchRiskById,
  resolveRisk,
} from "@/lib/api/dealHealthApi";

interface OrgRisksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRiskResolved?: () => void;
}

export function OrgRisksModal({ isOpen, onClose, onRiskResolved }: OrgRisksModalProps) {
  const [risks, setRisks] = useState<DealRisk[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Single Risk modal state (GET /deals/risks/:riskId)
  const [inspectingRisk, setInspectingRisk] = useState<DealRisk | null>(null);
  const [inspectingLoading, setInspectingLoading] = useState(false);

  // Resolve Single Risk modal state (PATCH /deals/risks/:riskId/resolve)
  const [resolvingRisk, setResolvingRisk] = useState<DealRisk | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvingSubmitting, setResolvingSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const loadOrgRisks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (severityFilter !== "ALL") filters.severity = severityFilter as RiskSeverityType;
      if (activeFilter === "ACTIVE") filters.isActive = "true";
      if (activeFilter === "RESOLVED") filters.isActive = "false";

      const res = await fetchOrganizationRisks(filters);
      setRisks(res.risks || []);
      setTotalCount(res.total ?? (res.risks ? res.risks.length : 0));
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load organization risks"
      );
    } finally {
      setLoading(false);
    }
  }, [severityFilter, activeFilter]);

  useEffect(() => {
    if (isOpen) {
      loadOrgRisks();
    }
  }, [isOpen, loadOrgRisks]);

  // Inspect Risk details with structured evidence (GET /deals/risks/:riskId)
  const handleInspect = async (risk: DealRisk) => {
    setInspectingRisk(risk);
    setInspectingLoading(true);
    try {
      const detailed = await fetchRiskById(risk.id);
      if (detailed) {
        setInspectingRisk(detailed);
      }
    } catch {
      // Keep initial risk data on failure
    } finally {
      setInspectingLoading(false);
    }
  };

  // Open resolve modal
  const handleOpenResolve = (risk: DealRisk) => {
    setResolvingRisk(risk);
    setResolutionNotes("");
    setResolveError(null);
  };

  // Submit risk resolution (PATCH /deals/risks/:riskId/resolve)
  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingRisk) return;
    setResolvingSubmitting(true);
    setResolveError(null);
    try {
      await resolveRisk(resolvingRisk.id, {
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
      setResolvingRisk(null);
      await loadOrgRisks();
      if (onRiskResolved) onRiskResolved();
    } catch (err: any) {
      setResolveError(
        err.response?.data?.message || err.message || "Failed to resolve risk"
      );
    } finally {
      setResolvingSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    const s = (sev || "").toUpperCase();
    if (s === "CRITICAL") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (s === "HIGH") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s === "MEDIUM") {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const filteredRisks = risks.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.dealId && r.dealId.toLowerCase().includes(q)) ||
      (r.riskType && r.riskType.toLowerCase().includes(q)) ||
      (typeof r.evidence === "string" && r.evidence.toLowerCase().includes(q)) ||
      (typeof (r.evidence as any)?.summary === "string" &&
        (r.evidence as any).summary.toLowerCase().includes(q))
    );
  });

  const criticalCount = risks.filter((r) => r.severity === "CRITICAL" && r.status !== "RESOLVED").length;
  const highCount = risks.filter((r) => r.severity === "HIGH" && r.status !== "RESOLVED").length;
  const activeCount = risks.filter((r) => r.status !== "RESOLVED").length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-xs">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Organization Risk Radar</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {totalCount} detected
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Organization-wide detected risks, AI signals & audited resolutions (GET /deals/risks/all)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadOrgRisks}
              disabled={loading}
              title="Refresh risks"
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-white">
          <div className="p-3.5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
              Active Detected Risks
            </span>
            <span className="text-xl font-black text-gray-900">{activeCount}</span>
          </div>
          <div className="p-3.5 text-center bg-red-50/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-0.5">
              Critical Severity
            </span>
            <span className="text-xl font-black text-red-600">{criticalCount}</span>
          </div>
          <div className="p-3.5 text-center bg-amber-50/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-0.5">
              High Severity
            </span>
            <span className="text-xl font-black text-amber-600">{highCount}</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity Filter */}
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shadow-xs">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    severityFilter === sev
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shadow-xs">
              {["ALL", "ACTIVE", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    activeFilter === st
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search risk, deal, or signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 h-8 pl-8 pr-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium">Scanning organization risks from backend...</p>
            </div>
          ) : filteredRisks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center text-gray-400">
              <ShieldCheck size={36} className="text-emerald-500" />
              <p className="text-sm font-bold text-gray-800">No matching risks found</p>
              <p className="text-xs text-gray-400">All deals appear healthy for current filter criteria.</p>
            </div>
          ) : (
            filteredRisks.map((risk) => {
              const isResolved = risk.status === "RESOLVED" || risk.isActive === false;
              const evidenceSummary =
                typeof risk.evidence === "string"
                  ? risk.evidence
                  : (risk.evidence as any)?.summary ||
                    "Detected AI trigger and deterministic risk signal.";

              return (
                <div
                  key={risk.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isResolved
                      ? "bg-gray-50/50 border-gray-100 opacity-75"
                      : "bg-white border-gray-100 hover:border-gray-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase ${getSeverityBadge(
                            risk.severity
                          )}`}
                        >
                          {risk.severity}
                        </span>

                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-800 font-mono">
                          {risk.riskType}
                        </span>

                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            <CheckCircle2 size={10} />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                            <AlertTriangle size={10} />
                            Active
                          </span>
                        )}

                        {risk.dealId && (
                          <span className="text-[11px] text-gray-400">
                            Deal: <strong className="text-gray-700 font-mono">{risk.dealId}</strong>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-700 font-medium line-clamp-2 mt-1">
                        {evidenceSummary}
                      </p>

                      {isResolved && risk.resolutionNotes && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 mt-2">
                          <strong>Resolution:</strong> {risk.resolutionNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Inspect Evidence (GET /deals/risks/:riskId) */}
                      <button
                        onClick={() => handleInspect(risk)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-xs"
                      >
                        <FileText size={12} className="text-blue-600" />
                        <span>Evidence</span>
                      </button>

                      {/* Resolve Risk (PATCH /deals/risks/:riskId/resolve) */}
                      {!isResolved && (
                        <button
                          onClick={() => handleOpenResolve(risk)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors shadow-xs shadow-emerald-200"
                        >
                          <CheckCircle2 size={12} />
                          <span>Resolve</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Showing {filteredRisks.length} of {totalCount} total risks across organization
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Inspect Single Risk Evidence Modal (GET /deals/risks/:riskId) ── */}
      {inspectingRisk && (
        <div className="fixed inset-0 z-60 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Risk Evidence & Signals</h3>
                  <p className="text-[11px] text-gray-400">ID: {inspectingRisk.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingRisk(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {inspectingLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">
                        Risk Type
                      </span>
                      <span className="font-bold text-gray-800">{inspectingRisk.riskType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">
                        Severity
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(
                          inspectingRisk.severity
                        )}`}
                      >
                        {inspectingRisk.severity}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">
                        Deal ID
                      </span>
                      <span className="font-mono text-gray-800">{inspectingRisk.dealId || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">
                        Status
                      </span>
                      <span className="font-bold text-gray-800">{inspectingRisk.status || "ACTIVE"}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Structured Evidence Data
                    </h4>
                    <pre className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono text-gray-700 overflow-x-auto">
                      {typeof inspectingRisk.evidence === "string"
                        ? inspectingRisk.evidence
                        : JSON.stringify(inspectingRisk.evidence || {}, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setInspectingRisk(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Single Risk Modal (PATCH /deals/risks/:riskId/resolve) ── */}
      {resolvingRisk && (
        <div className="fixed inset-0 z-60 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Resolve Risk</h3>
                  <p className="text-[11px] text-gray-400">{resolvingRisk.riskType} on deal</p>
                </div>
              </div>
              <button
                onClick={() => setResolvingRisk(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} className="p-6 space-y-4">
              {resolveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {resolveError}
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed">
                Resolving this risk will audit the action and trigger an immediate recalculation of the deal’s health score.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Resolution Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Conducted executive alignment meeting and resolved buyer sentiment objections."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResolvingRisk(null)}
                  disabled={resolvingSubmitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolvingSubmitting || !resolutionNotes.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200"
                >
                  {resolvingSubmitting && <Loader2 size={13} className="animate-spin" />}
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
