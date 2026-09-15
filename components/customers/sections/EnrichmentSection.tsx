"use client";

import React, { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { useCustomerEnrichment } from "@/hooks/useCustomerEnrichment";
import type {
  FieldEnrichmentStatus,
  RefreshEnrichmentPayload,
} from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";

const FRESHNESS_STYLES: Record<string, string> = {
  FRESH: "bg-success-light text-success-foreground border-success/30",
  STALE: "bg-warning-light text-warning-foreground border-warning/30",
  EXPIRED: "bg-error-light text-error-foreground border-error/30",
  UNKNOWN: "bg-background-secondary text-text-secondary border-border",
};

export interface EnrichmentSectionProps {
  customerId: string;
}

export function EnrichmentSection({ customerId }: EnrichmentSectionProps) {
  const { status, loading, refreshing, error, reload, triggerRefresh } =
    useCustomerEnrichment(customerId);

  const [modalOpen, setModalOpen] = useState(false);
  const [provider, setProvider] = useState<string>("apollo");
  const [force, setForce] = useState<boolean>(false);
  const [fieldsInput, setFieldsInput] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleRefreshSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const fieldList = fieldsInput
        ? fieldsInput.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

      const payload: RefreshEnrichmentPayload = {
        provider: provider || undefined,
        force,
        fields: fieldList,
      };

      const res = await triggerRefresh(payload);
      setModalOpen(false);
      setFeedback({
        type: "success",
        message: `Enrichment refreshed successfully! ${
          res?.updatedFields?.length ? `Updated fields: ${res.updatedFields.join(", ")}` : ""
        }`,
      });
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: `Enrichment refresh failed: ${err?.message || "Unknown error"}`,
      });
    }
  };

  const rawFields = status?.fields;
  const fieldsList: FieldEnrichmentStatus[] = Array.isArray(rawFields)
    ? rawFields
    : rawFields && typeof rawFields === "object"
    ? Object.entries(rawFields).map(([name, item]) => {
        if (typeof item === "object" && item !== null) {
          return { fieldName: name, ...item };
        }
        return { fieldName: name, freshness: String(item) };
      })
    : [];

  const overall = status?.overallStatus ?? "UNKNOWN";
  const lastRefreshed = status?.lastRefreshedAt ?? null;
  const currentProvider = status?.provider ?? null;

  return (
    <>
      <SectionCard
        id="enrichment"
        title="Customer Enrichment & Provenance"
        icon={Sparkles}
        description="Data freshness details per field, external provenance, and on-demand sync"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh Enrichment"}
            </button>
            <button
              type="button"
              onClick={reload}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface-hover"
            >
              Check Status
            </button>
          </div>
        }
      >
        {feedback && (
          <div
            className={`mb-4 flex items-center justify-between rounded-lg p-3 text-xs font-medium ${
              feedback.type === "error"
                ? "bg-error-light text-error-foreground border border-error/30"
                : "bg-success-light text-success-foreground border border-success/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{feedback.message}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="hover:opacity-75">
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <SectionLoading label="Checking customer enrichment status…" />
        ) : error ? (
          <SectionError message={error.message} onRetry={reload} />
        ) : !status ? (
          <SectionEmpty
            title="No enrichment status"
            description="Trigger a refresh to enrich account data from external intelligence providers."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Main Freshness Overview Card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-light bg-background-secondary/40 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Overall Status:
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-extrabold uppercase ${
                      FRESHNESS_STYLES[overall] ?? FRESHNESS_STYLES.UNKNOWN
                    }`}
                  >
                    {overall}
                  </span>
                </div>

                {currentProvider && (
                  <div className="flex items-center gap-1 text-xs text-text-secondary">
                    <Database size={13} className="text-primary" />
                    <span className="font-semibold text-text">{currentProvider}</span>
                  </div>
                )}
              </div>

              {lastRefreshed && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock size={13} />
                  <span>Refreshed {new Date(lastRefreshed).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Field level details */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-muted">
                <span>Field Provenance & Freshness ({fieldsList.length})</span>
                <span>Freshness State</span>
              </div>

              {fieldsList.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {fieldsList.map((f, idx) => {
                    const freshState = (f.freshness ?? "UNKNOWN").toUpperCase();
                    const badgeStyle = FRESHNESS_STYLES[freshState] ?? FRESHNESS_STYLES.UNKNOWN;

                    return (
                      <li
                        key={f.fieldName ?? idx}
                        className="flex flex-col gap-1 rounded-lg border border-border-light bg-surface px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text capitalize">
                              {f.fieldName.replace(/([A-Z])/g, " $1")}
                            </span>
                            {f.userOverridden && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-warning-light px-1.5 py-0.5 text-[10px] font-bold text-warning-foreground"
                                title="User manual edit protected — enrichment refresh did not overwrite"
                              >
                                <UserCheck size={11} /> User Override
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${badgeStyle}`}
                            >
                              {freshState}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-text-muted">
                          {f.lastObservedAt ? (
                            <span>Observed: {new Date(f.lastObservedAt).toLocaleString()}</span>
                          ) : (
                            <span>No timestamp reported</span>
                          )}

                          {f.provenance ? (
                            <ProvenanceBadge provenance={f.provenance} />
                          ) : f.source ? (
                            <span className="font-mono text-[10px] text-text-secondary">
                              Source: {f.source}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-text-muted">No individual field status records found.</p>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Refresh Enrichment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h3 className="text-base font-bold text-text">Refresh Customer Enrichment</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-text-secondary hover:bg-surface-hover hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRefreshSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Enrichment Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background-secondary p-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="apollo">Apollo.io</option>
                  <option value="clearbit">Clearbit</option>
                  <option value="zoominfo">ZoomInfo</option>
                  <option value="salesforce">Salesforce CRM</option>
                  <option value="hubspot">HubSpot CRM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Specific Fields (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. industry, financials, segment (comma-separated)"
                  value={fieldsInput}
                  onChange={(e) => setFieldsInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background-secondary p-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-[11px] text-text-muted">
                  Leave blank to refresh all available fields.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="force-override"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="force-override" className="text-xs text-text font-medium cursor-pointer">
                  Force overwrite user manual overrides
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refreshing}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refreshing…" : "Start Enrichment Sync"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
