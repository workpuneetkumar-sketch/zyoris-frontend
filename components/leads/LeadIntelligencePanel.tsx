"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  Brain,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";

import { Lead } from "@/types/leads";
import { AiExtractionPanel } from "@/components/ai/AiExtractionPanel";
import {
  getLeadIntelligence,
  getLeadScoreConfig,
  getLeadScorePreview,
  postLeadSignal,
  updateLeadScoreConfig,
  LeadIntelligenceSnapshot,
  LeadScoreConfig,
  LeadScoreConfigDimension,
  LeadScoreConfigPayload,
  LeadScorePreviewResponse,
} from "@/lib/api/leadIntelligenceApi";

type WeightRow = { key: string; value: number };

type ConfigDraft = {
  sourceWeights: WeightRow[];
  statusWeights: WeightRow[];
  emailWeight: number;
  callWeight: number;
  meetingWeight: number;
  assignedWeight: number;
  newLeadWeight: number;
  agingPenaltyPerDay: number;
  dimensions: LeadScoreConfigDimension[];
};

const CONFIG_NUMBER_FIELDS: Array<{ label: string; key: keyof Pick<ConfigDraft, "emailWeight" | "callWeight" | "meetingWeight" | "assignedWeight" | "newLeadWeight" | "agingPenaltyPerDay"> }> = [
  { label: "Email", key: "emailWeight" },
  { label: "Call", key: "callWeight" },
  { label: "Meeting", key: "meetingWeight" },
  { label: "Assigned", key: "assignedWeight" },
  { label: "New Lead", key: "newLeadWeight" },
  { label: "Aging Penalty", key: "agingPenaltyPerDay" },
];

interface LeadIntelligencePanelProps {
  lead: Lead;
}

const DEFAULT_SOURCE_WEIGHTS: WeightRow[] = [
  { key: "Referral", value: 12 },
  { key: "LinkedIn", value: 10 },
  { key: "Website", value: 8 },
  { key: "Cold Call", value: 6 },
];

const DEFAULT_STATUS_WEIGHTS: WeightRow[] = [
  { key: "CLOSED", value: 25 },
  { key: "NEGOTIATION", value: 23 },
  { key: "PROPOSAL", value: 20 },
  { key: "QUALIFIED", value: 17 },
  { key: "HOT", value: 15 },
  { key: "WARM", value: 12 },
  { key: "CONTACTED", value: 10 },
  { key: "NEW", value: 8 },
  { key: "DEAD", value: 2 },
];

const DEFAULT_DIMENSIONS: LeadScoreConfigDimension[] = [
  { key: "status", label: "Status", description: "Current lifecycle stage", weight: 0.35 },
  { key: "value", label: "Estimated Value", description: "Opportunity size and buying intent", weight: 0.25 },
  { key: "source", label: "Lead Source", description: "Acquisition source quality", weight: 0.2 },
  { key: "profile", label: "Profile Completeness", description: "Presence of contact and company data", weight: 0.2 },
];

function weightMapToRows(map: Record<string, number> | undefined, fallback: WeightRow[]): WeightRow[] {
  const entries = map ? Object.entries(map) : [];
  if (entries.length === 0) return fallback.map((row) => ({ ...row }));
  return entries.map(([key, value]) => ({ key, value: Number(value) || 0 }));
}

function configToDraft(config: LeadScoreConfig | null): ConfigDraft {
  if (!config) {
    return {
      sourceWeights: DEFAULT_SOURCE_WEIGHTS.map((row) => ({ ...row })),
      statusWeights: DEFAULT_STATUS_WEIGHTS.map((row) => ({ ...row })),
      emailWeight: 0,
      callWeight: 0,
      meetingWeight: 0,
      assignedWeight: 0,
      newLeadWeight: 0,
      agingPenaltyPerDay: 0,
      dimensions: DEFAULT_DIMENSIONS.map((dimension) => ({ ...dimension })),
    };
  }

  return {
    sourceWeights: weightMapToRows(config.sourceWeights, DEFAULT_SOURCE_WEIGHTS),
    statusWeights: weightMapToRows(config.statusWeights, DEFAULT_STATUS_WEIGHTS),
    emailWeight: Number(config.emailWeight) || 0,
    callWeight: Number(config.callWeight) || 0,
    meetingWeight: Number(config.meetingWeight) || 0,
    assignedWeight: Number(config.assignedWeight) || 0,
    newLeadWeight: Number(config.newLeadWeight) || 0,
    agingPenaltyPerDay: Number(config.agingPenaltyPerDay) || 0,
    dimensions: Array.isArray(config.dimensions) && config.dimensions.length > 0
      ? config.dimensions.map((dimension) => ({ ...dimension }))
      : DEFAULT_DIMENSIONS.map((dimension) => ({ ...dimension })),
  };
}

function rowsToWeightMap(rows: WeightRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const trimmedKey = row.key.trim();
    if (!trimmedKey) return acc;
    acc[trimmedKey] = Number.isFinite(Number(row.value)) ? Number(row.value) : 0;
    return acc;
  }, {});
}

function formatDate(dateValue?: string) {
  if (!dateValue) return "—";
  try {
    return new Date(dateValue).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateValue;
  }
}

function scoreTone(score: number) {
  if (score >= 70) return { border: "#10b981", text: "#059669", label: "High Quality" };
  if (score >= 40) return { border: "#f59e0b", text: "#d97706", label: "Moderate" };
  return { border: "#ef4444", text: "#dc2626", label: "Low Priority" };
}

export function LeadIntelligencePanel({ lead }: LeadIntelligencePanelProps) {
  const [intelligence, setIntelligence] = useState<LeadIntelligenceSnapshot | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(true);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  const [configDraft, setConfigDraft] = useState<ConfigDraft | null>(null);
  const [originalConfigDraft, setOriginalConfigDraft] = useState<ConfigDraft | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const [scorePreview, setScorePreview] = useState<LeadScorePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [signalStatus, setSignalStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    if (!lead.id) return;

    let active = true;

    setIntelligenceLoading(true);
    setConfigLoading(true);
    setPreviewLoading(true);
    setIntelligenceError(null);
    setConfigError(null);
    setPreviewError(null);
    setSignalStatus("sending");

    void postLeadSignal({
      leadId: lead.id,
      source: "LEAD",
      eventType: "LEAD.VIEWED",
      occurredAt: new Date().toISOString(),
      idempotencyKey: `lead-view:${lead.id}`,
      payload: {
        leadName: lead.name,
        status: lead.status,
        sourceValue: lead.source,
        company: lead.company,
        path: `/leads/${lead.id}`,
      },
    })
      .then(() => {
        if (active) setSignalStatus("sent");
      })
      .catch(() => {
        if (active) setSignalStatus("failed");
      });

    void Promise.allSettled([
      getLeadIntelligence(lead.id),
      getLeadScoreConfig(),
      getLeadScorePreview(lead.id, "weekly"),
    ])
      .then(([intelligenceResult, configResult, previewResult]) => {
        if (!active) return;

        if (intelligenceResult.status === "fulfilled") {
          setIntelligence(intelligenceResult.value);
        } else {
          setIntelligenceError(
            intelligenceResult.reason?.message || "Unable to load lead intelligence."
          );
        }

        if (configResult.status === "fulfilled") {
          const draft = configToDraft(configResult.value);
          setConfigDraft(draft);
          setOriginalConfigDraft(draft);
        } else {
          setConfigError(
            configResult.reason?.message || "Unable to load lead score configuration."
          );
          setConfigDraft((current) => current ?? configToDraft(null));
          setOriginalConfigDraft((current) => current ?? configToDraft(null));
        }

        if (previewResult.status === "fulfilled") {
          setScorePreview(previewResult.value);
        } else {
          setPreviewError(
            previewResult.reason?.message || "Unable to load lead score preview."
          );
        }
      })
      .finally(() => {
        if (!active) return;
        setIntelligenceLoading(false);
        setConfigLoading(false);
        setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lead.id, lead.name, lead.company, lead.source, lead.status]);

  const saveConfig = async () => {
    if (!configDraft) return;

    setSavingConfig(true);
    try {
      const payload: LeadScoreConfigPayload = {
        sourceWeights: rowsToWeightMap(configDraft.sourceWeights),
        statusWeights: rowsToWeightMap(configDraft.statusWeights),
        emailWeight: Number(configDraft.emailWeight) || 0,
        callWeight: Number(configDraft.callWeight) || 0,
        meetingWeight: Number(configDraft.meetingWeight) || 0,
        assignedWeight: Number(configDraft.assignedWeight) || 0,
        newLeadWeight: Number(configDraft.newLeadWeight) || 0,
        agingPenaltyPerDay: Number(configDraft.agingPenaltyPerDay) || 0,
        dimensions: configDraft.dimensions
          .filter((dimension) => dimension.key.trim() || dimension.label.trim())
          .map((dimension) => ({
            key: dimension.key.trim(),
            label: dimension.label.trim(),
            description: dimension.description.trim(),
            weight: Number(dimension.weight) || 0,
          })),
      };

      const updated = await updateLeadScoreConfig(payload);
      const draft = configToDraft(updated);
      setConfigDraft(draft);
      setOriginalConfigDraft(draft);
      toast.success("Lead score configuration updated");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to update lead score configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const updateRow = (
    section: "sourceWeights" | "statusWeights",
    index: number,
    field: keyof WeightRow,
    value: string,
  ) => {
    setConfigDraft((current) => {
      if (!current) return current;

      const nextRows = current[section].map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return {
          ...row,
          [field]: field === "value" ? Number(value) : value,
        } as WeightRow;
      });

      return {
        ...current,
        [section]: nextRows,
      };
    });
  };

  const addRow = (section: "sourceWeights" | "statusWeights") => {
    setConfigDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [section]: [...current[section], { key: "", value: 0 }],
      };
    });
  };

  const removeRow = (section: "sourceWeights" | "statusWeights", index: number) => {
    setConfigDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [section]: current[section].filter((_, rowIndex) => rowIndex !== index),
      };
    });
  };

  const updateDimension = (index: number, field: keyof LeadScoreConfigDimension, value: string) => {
    setConfigDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        dimensions: current.dimensions.map((dimension, dimensionIndex) => {
          if (dimensionIndex !== index) return dimension;
          return {
            ...dimension,
            [field]: field === "weight" ? Number(value) : value,
          } as LeadScoreConfigDimension;
        }),
      };
    });
  };

  const addDimension = () => {
    setConfigDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        dimensions: [
          ...current.dimensions,
          { key: "", label: "", description: "", weight: 0 },
        ],
      };
    });
  };

  const removeDimension = (index: number) => {
    setConfigDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        dimensions: current.dimensions.filter((_, dimensionIndex) => dimensionIndex !== index),
      };
    });
  };

  const score = intelligence?.score.total ?? lead.score ?? 0;
  const total = intelligence?.score.max ?? 100;
  const tone = scoreTone(score);
  const livePreview = scorePreview?.data;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 bg-gradient-to-r from-sky-50/80 to-white flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Brain size={14} className="text-sky-500" /> Lead Intelligence
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Canonical signal, versioned snapshot, and live score config.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${signalStatus === "sent" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : signalStatus === "failed" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
            {signalStatus === "sent" ? <CheckCircle2 size={11} /> : signalStatus === "failed" ? <AlertCircle size={11} /> : <Clock3 size={11} />}
            Signal {signalStatus === "sent" ? "saved" : signalStatus === "failed" ? "queued" : "capturing"}
          </span>
          {intelligence?.score?.configVersion != null && (
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              v{intelligence.score.configVersion}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5 bg-gray-50/20">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Brain size={14} className="text-sky-500" /> Live Score Preview
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Weekly cadence snapshot without persisting</p>
              </div>
              {previewLoading ? (
                <Loader2 size={14} className="animate-spin text-sky-500" />
              ) : (
                <span className="px-2 py-1 rounded-full bg-sky-50 text-sky-700 text-[10px] font-semibold border border-sky-200">
                  {livePreview?.momentum?.trend ?? "N/A"}
                </span>
              )}
            </div>

            {previewError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{previewError}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Fit</div>
                  <div className="mt-2 text-lg font-bold text-gray-800">{livePreview?.fit?.score ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Engagement</div>
                  <div className="mt-2 text-lg font-bold text-gray-800">{livePreview?.engagement?.score ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Intent</div>
                  <div className="mt-2 text-lg font-bold text-gray-800">{livePreview?.intent?.score ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Momentum</div>
                  <div className="mt-2 text-lg font-bold text-gray-800">{livePreview?.momentum?.change ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Risk</div>
                  <div className="mt-2 text-lg font-bold text-gray-800">{livePreview?.risk?.score ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Total</div>
                  <div className="mt-2 text-lg font-bold text-gray-800">{livePreview?.total ?? "—"}</div>
                </div>
              </div>
            )}

            {livePreview && (
              <div className="space-y-3 text-xs text-gray-600">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="font-semibold text-gray-700 mb-1">Risk</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">Level</span>
                    <span className="font-semibold text-gray-800">{livePreview.risk.level}</span>
                  </div>
                  {livePreview.risk.reasons?.length ? (
                    <ul className="mt-2 list-disc list-inside space-y-1 text-gray-600">
                      {livePreview.risk.reasons.map((reason, idx) => (
                        <li key={`${reason}-${idx}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="font-semibold text-gray-700 mb-1">Intent evidence</div>
                  {livePreview.intent.reasons?.length ? (
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {livePreview.intent.reasons.map((reason, idx) => (
                        <li key={`${reason}-${idx}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">No accepted evidence yet.</span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 bg-white p-3 text-[11px] text-gray-500">
              {livePreview ? (
                <span>
                  λ={livePreview.engagement.lambda ?? "—"} · trend={livePreview.momentum.trend ?? "—"} · risk={livePreview.risk.level ?? "—"}
                </span>
              ) : (
                <span>Preview data is not available yet.</span>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center shrink-0 border-4 font-extrabold text-2xl"
                style={{ borderColor: tone.border, color: tone.text }}
              >
                {intelligenceLoading ? <Loader2 size={22} className="animate-spin" /> : score}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold`} style={{ color: tone.text }}>
                    {intelligenceLoading ? "Loading intelligence" : tone.label}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold">
                    {score}/{total || 100}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: tone.border }}
                  />
                </div>
                <div className="text-[11px] text-gray-500">
                  Generated {formatDate(intelligence?.score.generatedAt)}
                </div>
              </div>
            </div>

            {intelligenceError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{intelligenceError}</span>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={13} className="text-sky-500" />
                    <p className="text-xs font-semibold text-gray-600">Dimensions</p>
                  </div>
                  <div className="space-y-2">
                    {(intelligence?.dimensions?.length ? intelligence.dimensions : DEFAULT_DIMENSIONS.map((dimension) => ({
                      key: dimension.key,
                      label: dimension.label,
                      score: 0,
                      maxScore: 0,
                      evidence: [],
                    }))).map((dimension) => (
                      <div key={dimension.key} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">{dimension.label}</span>
                          <span className="text-xs font-bold text-gray-500 tabular-nums">
                            {dimension.score}/{dimension.maxScore || 0}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${dimension.maxScore > 0 ? Math.round((dimension.score / dimension.maxScore) * 100) : 0}%` }}
                          />
                        </div>
                        {dimension.evidence?.[0] && (() => {
                          const firstEvidence = dimension.evidence[0];
                          const evidencePayload = firstEvidence.evidence as Record<string, unknown> | undefined;
                          const evidenceText = String(evidencePayload?.reason ?? evidencePayload?.note ?? "Evidence captured in snapshot.");

                          return (
                            <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">
                              <span className="font-semibold text-gray-600">{firstEvidence.factorKey}:</span>{" "}
                              {evidenceText}
                            </p>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={13} className="text-violet-500" />
                    <p className="text-xs font-semibold text-gray-600">Next Best Actions</p>
                  </div>
                  <div className="space-y-2">
                    {(intelligence?.nextBestActions?.length ? intelligence.nextBestActions : [
                      {
                        action: "Follow up",
                        rationale: "No automated action returned yet.",
                        priority: 1,
                        metadata: {},
                      },
                    ]).map((action) => (
                      <div key={`${action.action}-${action.priority}`} className="rounded-xl border border-gray-100 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{action.action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{action.rationale}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold">
                            P{action.priority}
                          </span>
                        </div>
                        {Object.keys(action.metadata || {}).length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-2 truncate">
                            {JSON.stringify(action.metadata)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart2 size={14} className="text-blue-500" /> Lead Score Config
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Update the active version for the organization.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfigDraft(originalConfigDraft ? JSON.parse(JSON.stringify(originalConfigDraft)) : configToDraft(null))}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={13} /> Reset
                </button>
                <button
                  onClick={saveConfig}
                  disabled={savingConfig || configLoading || !configDraft}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 disabled:opacity-70 transition-colors"
                >
                  {savingConfig ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
              </div>
            </div>

            {configError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{configError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CONFIG_NUMBER_FIELDS.map(({ label, key }) => (
                <label key={key} className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                  <input
                    type="number"
                    value={configDraft ? Number(configDraft[key]) : 0}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setConfigDraft((current) => current ? { ...current, [key]: nextValue } : current);
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-gray-600">Source Weights</p>
                  <button
                    onClick={() => addRow("sourceWeights")}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {configDraft?.sourceWeights.map((row, index) => (
                    <div key={`source-${index}`} className="grid grid-cols-[1fr_92px_auto] gap-2">
                      <input
                        value={row.key}
                        onChange={(event) => updateRow("sourceWeights", index, "key", event.target.value)}
                        placeholder="Source key"
                        className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={row.value}
                        onChange={(event) => updateRow("sourceWeights", index, "value", event.target.value)}
                        className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => removeRow("sourceWeights", index)}
                        className="h-9 w-9 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                        aria-label="Remove source weight"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-gray-600">Status Weights</p>
                  <button
                    onClick={() => addRow("statusWeights")}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {configDraft?.statusWeights.map((row, index) => (
                    <div key={`status-${index}`} className="grid grid-cols-[1fr_92px_auto] gap-2">
                      <input
                        value={row.key}
                        onChange={(event) => updateRow("statusWeights", index, "key", event.target.value)}
                        placeholder="Status key"
                        className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={row.value}
                        onChange={(event) => updateRow("statusWeights", index, "value", event.target.value)}
                        className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => removeRow("statusWeights", index)}
                        className="h-9 w-9 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                        aria-label="Remove status weight"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-gray-600">Dimensions</p>
                  <button
                    onClick={addDimension}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {configDraft?.dimensions.map((dimension, index) => (
                    <div key={`dimension-${index}`} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={dimension.key}
                          onChange={(event) => updateDimension(index, "key", event.target.value)}
                          placeholder="Key"
                          className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          value={dimension.label}
                          onChange={(event) => updateDimension(index, "label", event.target.value)}
                          placeholder="Label"
                          className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <input
                        value={dimension.description}
                        onChange={(event) => updateDimension(index, "description", event.target.value)}
                        placeholder="Description"
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <input
                          type="number"
                          step="0.01"
                          value={dimension.weight}
                          onChange={(event) => updateDimension(index, "weight", event.target.value)}
                          className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeDimension(index)}
                          className="h-9 w-9 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                          aria-label="Remove dimension"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Conversation Extraction ───────────────────────────── */}
        <AiExtractionPanel />

        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ArrowUpRight size={13} className="text-sky-500" />
            <span>
              Lead signal: <span className="font-semibold text-gray-700">LEAD.VIEWED</span> persisted with stable idempotency.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              Config version {intelligence?.score?.configVersion ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              Lead ID {lead.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}