// components/deals/RiskDetectorConfigModal.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  RefreshCw,
  AlertCircle,
  Save,
  Activity,
  Clock,
  MessageSquare,
  Users,
  Building,
} from "lucide-react";
import { RiskDetectorConfig, RiskSeverityType } from "@/types/dealHealth";
import {
  fetchRiskDetectorConfig,
  updateRiskDetectorConfig,
} from "@/lib/api/dealHealthApi";

interface RiskDetectorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RiskDetectorConfigModal({
  isOpen,
  onClose,
}: RiskDetectorConfigModalProps) {
  const [configs, setConfigs] = useState<RiskDetectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active detector being edited
  const [editingDetector, setEditingDetector] = useState<RiskDetectorConfig | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editSeverity, setEditSeverity] = useState<RiskSeverityType>("HIGH");
  const [editParamsJson, setEditParamsJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRiskDetectorConfig();
      if (Array.isArray(data) && data.length > 0) {
        setConfigs(data);
      } else {
        // Fallback default detector set if organization has not initialized custom detectors yet
        setConfigs([
          {
            detector: "INACTIVITY",
            isEnabled: true,
            severity: "HIGH",
            parameters: { thresholdDays: 14, alertCooldownHours: 48 },
          },
          {
            detector: "SENTIMENT",
            isEnabled: true,
            severity: "CRITICAL",
            parameters: { minSentimentScore: 0.3, requireAiAnalysis: true },
          },
          {
            detector: "VELOCITY",
            isEnabled: true,
            severity: "MEDIUM",
            parameters: { maxDaysInStage: 30, minTouchpoints: 3 },
          },
          {
            detector: "COMPETITOR",
            isEnabled: true,
            severity: "HIGH",
            parameters: { requireExecutiveAlignment: true },
          },
        ]);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load detector configurations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
      setSaveSuccess(null);
      setSaveError(null);
    }
  }, [isOpen, loadConfigs]);

  const handleOpenEdit = (cfg: RiskDetectorConfig) => {
    setEditingDetector(cfg);
    setEditEnabled(cfg.isEnabled ?? true);
    setEditSeverity(cfg.severity || "HIGH");
    setEditParamsJson(
      cfg.parameters && Object.keys(cfg.parameters).length > 0
        ? JSON.stringify(cfg.parameters, null, 2)
        : '{\n  "thresholdDays": 14\n}'
    );
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetector) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      let parsedParams: Record<string, unknown> = {};
      if (editParamsJson.trim()) {
        try {
          parsedParams = JSON.parse(editParamsJson);
        } catch {
          setSaveError("Invalid JSON in detector parameters.");
          setSaving(false);
          return;
        }
      }

      await updateRiskDetectorConfig(editingDetector.detector, {
        isEnabled: editEnabled,
        severity: editSeverity,
        parameters: parsedParams,
      });

      setSaveSuccess(`Updated configuration for ${editingDetector.detector}`);
      setEditingDetector(null);
      await loadConfigs();
    } catch (err: any) {
      setSaveError(
        err.response?.data?.message || err.message || "Failed to update detector configuration"
      );
    } finally {
      setSaving(false);
    }
  };

  const getDetectorIcon = (name: string) => {
    const s = (name || "").toUpperCase();
    if (s.includes("INACTIV") || s.includes("TIME")) return <Clock size={16} />;
    if (s.includes("SENTIMENT") || s.includes("EMAIL")) return <MessageSquare size={16} />;
    if (s.includes("COMPETIT")) return <Building size={16} />;
    if (s.includes("STAKEHOLDER") || s.includes("CONTACT")) return <Users size={16} />;
    return <Activity size={16} />;
  };

  const getSeverityBadge = (sev: string) => {
    const s = (sev || "").toUpperCase();
    if (s === "CRITICAL") return "bg-red-50 text-red-700 border-red-200";
    if (s === "HIGH") return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === "MEDIUM") return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Risk Detector Configurations</h3>
              <p className="text-[11px] text-gray-400">
                Manage detection rules, sensitivity thresholds & default severity (GET /deals/risk-detectors/config)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadConfigs}
              disabled={loading}
              title="Refresh configurations"
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{saveSuccess}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium">Loading detector configurations...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map((cfg) => {
                const isEnabled = cfg.isEnabled !== false;
                return (
                  <div
                    key={cfg.detector}
                    className={`p-4 rounded-2xl border transition-all ${
                      isEnabled
                        ? "bg-white border-gray-100 shadow-xs hover:border-gray-200"
                        : "bg-gray-50/70 border-gray-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          {getDetectorIcon(cfg.detector)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 font-mono">
                            {cfg.detector}
                          </h4>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase ${getSeverityBadge(
                              cfg.severity
                            )}`}
                          >
                            {cfg.severity}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isEnabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-[11px] text-gray-500 truncate max-w-[180px]">
                        {cfg.parameters && Object.keys(cfg.parameters).length > 0
                          ? `${Object.keys(cfg.parameters).length} parameter(s) set`
                          : "Default parameters"}
                      </div>
                      <button
                        onClick={() => handleOpenEdit(cfg)}
                        className="px-3 py-1 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Manager or Admin credentials required to modify risk detector parameters.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Edit Detector Configuration Modal (PUT /deals/risk-detectors/config/:detector) ── */}
      {editingDetector && (
        <div className="fixed inset-0 z-60 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Configure: {editingDetector.detector}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    PUT /deals/risk-detectors/config/{editingDetector.detector}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingDetector(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-6 space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {saveError}
                </div>
              )}

              {/* Enabled Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <label className="text-xs font-bold text-gray-900 block">Detector Active</label>
                  <p className="text-[11px] text-gray-400">Enable automated evaluation for deals</p>
                </div>
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Severity Selection */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Default Detected Severity
                </label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value as RiskSeverityType)}
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* Parameters JSON */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Detection Thresholds & Parameters (JSON)
                </label>
                <textarea
                  rows={4}
                  value={editParamsJson}
                  onChange={(e) => setEditParamsJson(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingDetector(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
