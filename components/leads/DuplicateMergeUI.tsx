"use client";

// components/leads/DuplicateMergeUI.tsx
// Duplicate Lead Merge workflow UI — Task 1

import { useEffect } from "react";
import {
  GitMerge,
  Users,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Star,
  Loader2,
  ArrowLeft,
  Eye,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useDuplicates } from "@/hooks/useDuplicates";
import { DuplicateGroup, FieldConflict } from "@/types/duplicates";
import { Lead } from "@/types/leads";

// ── Similarity score badge ────────────────────────────────────────────────────

function SimilarityBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-red-50 text-red-600 border-red-100"
      : score >= 75
      ? "bg-amber-50 text-amber-600 border-amber-100"
      : "bg-blue-50 text-blue-600 border-blue-100";

  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {score}% match
    </span>
  );
}

// ── Lead mini card ────────────────────────────────────────────────────────────

function LeadMiniCard({
  lead,
  isPrimary,
  isSelectable,
  onSelect,
}: {
  lead: Lead;
  isPrimary: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
}) {
  const initials = lead.name
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div
      onClick={isSelectable ? onSelect : undefined}
      className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
        isPrimary
          ? "border-blue-500 bg-blue-50/50 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      } ${isSelectable ? "cursor-pointer" : ""}`}
    >
      {isPrimary && (
        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          Primary
        </span>
      )}
      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
        {lead.email && <p className="text-xs text-gray-500 truncate">{lead.email}</p>}
        {lead.company && <p className="text-xs text-gray-400 truncate">{lead.company}</p>}
        <div className="flex items-center gap-2 mt-1">
          {lead.status && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {lead.status}
            </span>
          )}
          {typeof lead.score === "number" && (
            <span className="text-[10px] text-gray-400">Score: {lead.score}</span>
          )}
        </div>
      </div>
      {isSelectable && (
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            isPrimary ? "border-blue-600 bg-blue-600" : "border-gray-300"
          }`}
        >
          {isPrimary && <Check size={11} className="text-white" />}
        </div>
      )}
    </div>
  );
}

// ── Field conflict row ────────────────────────────────────────────────────────

function FieldConflictRow({
  conflict,
  leads,
  onResolve,
}: {
  conflict: FieldConflict;
  leads: Lead[];
  onResolve: (field: string, leadId: string) => void;
}) {
  return (
    <div className="border border-amber-100 bg-amber-50/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={13} className="text-amber-500" />
        <span className="text-xs font-semibold text-gray-700">{conflict.label}</span>
        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
          Conflict
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {conflict.values.map((val) => {
          const lead = leads.find((l) => l.id === val.leadId);
          const isWinner = conflict.winningLeadId === val.leadId;
          const displayVal = val.value == null || val.value === "" ? "—" : String(val.value);

          return (
            <button
              key={val.leadId}
              onClick={() => onResolve(conflict.field, val.leadId)}
              className={`text-left p-2.5 rounded-lg border transition-all ${
                isWinner
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400 font-medium truncate">
                  {lead?.name ?? val.leadId}
                </span>
                {isWinner && <Check size={11} className="text-blue-600 shrink-0" />}
              </div>
              <span
                className={`text-xs font-medium ${
                  displayVal === "—" ? "text-gray-300 italic" : "text-gray-800"
                }`}
              >
                {displayVal}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step: Group list ──────────────────────────────────────────────────────────

function GroupListStep({
  groups,
  loading,
  error,
  onSelect,
  onLoad,
}: {
  groups: DuplicateGroup[];
  loading: boolean;
  error: string | null;
  onSelect: (group: DuplicateGroup) => void;
  onLoad: () => void;
}) {
  useEffect(() => {
    onLoad();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm text-gray-400">Scanning for duplicate leads…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={onLoad}
          className="text-xs text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-green-500" />
        </div>
        <p className="text-sm font-medium text-gray-700">No similar leads found</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          This scanner looks for leads with similar names, phones, or companies — not email-exact matches.
        </p>
        <button
          onClick={onLoad}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-1"
        >
          <RefreshCw size={12} />
          Re-scan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Found <span className="font-semibold text-gray-700">{groups.length}</span> duplicate group(s)
      </p>
      {groups.map((group) => (
        <button
          key={group.groupId}
          onClick={() => onSelect(group)}
          className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">
                {group.leads[0]?.name}
              </span>
              <span className="text-xs text-gray-400">+{group.leads.length - 1} similar</span>
            </div>
            <div className="flex items-center gap-2">
              <SimilarityBadge score={group.similarityScore} />
              <ChevronRight
                size={16}
                className="text-gray-300 group-hover:text-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {group.leads.slice(0, 3).map((lead) => (
              <div
                key={lead.id}
                className="shrink-0 flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5"
              >
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">
                  {lead.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 truncate max-w-[100px]">
                    {lead.name}
                  </p>
                  {lead.email && (
                    <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{lead.email}</p>
                  )}
                </div>
              </div>
            ))}
            {group.leads.length > 3 && (
              <div className="shrink-0 flex items-center px-2 text-xs text-gray-400">
                +{group.leads.length - 3} more
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Step: Compare & Select Primary ───────────────────────────────────────────

function CompareStep({
  group,
  primaryLeadId,
  fieldConflicts,
  onSetPrimary,
  onResolve,
  onAutoResolve,
  onBack,
  onContinue,
}: {
  group: DuplicateGroup;
  primaryLeadId: string | null;
  fieldConflicts: FieldConflict[];
  onSetPrimary: (id: string) => void;
  onResolve: (field: string, leadId: string) => void;
  onAutoResolve: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Compare Duplicates</h3>
          <p className="text-xs text-gray-400">
            {group.leads.length} leads · <SimilarityBadge score={group.similarityScore} />
          </p>
        </div>
      </div>

      {/* Primary selection */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Select Primary Lead (winner)
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {group.leads.map((lead) => (
            <LeadMiniCard
              key={lead.id}
              lead={lead}
              isPrimary={lead.id === primaryLeadId}
              isSelectable
              onSelect={() => onSetPrimary(lead.id)}
            />
          ))}
        </div>
      </div>

      {/* Field conflicts */}
      {fieldConflicts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Field Conflicts ({fieldConflicts.length})
            </p>
            <button
              onClick={onAutoResolve}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
            >
              <Star size={11} />
              Use primary for all
            </button>
          </div>
          <div className="space-y-2">
            {fieldConflicts.map((conflict) => (
              <FieldConflictRow
                key={conflict.field}
                conflict={conflict}
                leads={group.leads}
                onResolve={onResolve}
              />
            ))}
          </div>
        </div>
      )}

      {fieldConflicts.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
          <CheckCircle2 size={16} className="text-green-500 shrink-0" />
          <p className="text-xs text-green-700">
            No field conflicts — all fields match or only one lead has values.
          </p>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!primaryLeadId}
        className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Preview Merge
      </button>
    </div>
  );
}

// ── Step: Preview ─────────────────────────────────────────────────────────────

function PreviewStep({
  mergedPreview,
  primaryLeadId,
  group,
  merging,
  mergeError,
  onBack,
  onMerge,
}: {
  mergedPreview: Partial<Lead>;
  primaryLeadId: string | null;
  group: DuplicateGroup;
  merging: boolean;
  mergeError: string | null;
  onBack: () => void;
  onMerge: () => void;
}) {
  const DISPLAY_FIELDS: Array<{ key: keyof Lead; label: string }> = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
    { key: "owner", label: "Owner" },
    { key: "estimatedValue", label: "Est. Value" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Merge Preview</h3>
          <p className="text-xs text-gray-400">
            {group.leads.length - 1} duplicate(s) will be removed
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-2">
          <Eye size={13} />
          Merged record preview
        </p>
        <div className="space-y-2">
          {DISPLAY_FIELDS.map(({ key, label }) => {
            const value = mergedPreview[key];
            if (value == null || value === "") return null;
            return (
              <div key={key} className="flex items-start gap-2">
                <span className="text-[11px] text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
                <span className="text-[12px] font-medium text-gray-800 flex-1">
                  {key === "estimatedValue" && typeof value === "number"
                    ? `₹${value.toLocaleString("en-IN")}`
                    : String(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">Leads to be removed:</p>
        <div className="space-y-1">
          {group.leads
            .filter((l) => l.id !== primaryLeadId)
            .map((lead) => (
              <div key={lead.id} className="flex items-center gap-2">
                <X size={12} className="text-red-400 shrink-0" />
                <span className="text-xs text-gray-600">
                  {lead.name} ({lead.email || lead.phone || lead.id})
                </span>
              </div>
            ))}
        </div>
      </div>

      {mergeError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{mergeError}</p>
        </div>
      )}

      <button
        onClick={onMerge}
        disabled={merging}
        className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {merging ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Merging…
          </>
        ) : (
          <>
            <GitMerge size={16} />
            Confirm Merge
          </>
        )}
      </button>
    </div>
  );
}

// ── Step: Success ─────────────────────────────────────────────────────────────

function SuccessStep({
  group,
  onMergeAnother,
  onBack,
}: {
  group: DuplicateGroup;
  onMergeAnother: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-12 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">Merge Successful!</h3>
        <p className="text-sm text-gray-400 mt-1">
          {group.leads.length} leads merged into one record.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-xs">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back to List
        </button>
        <button
          onClick={onMergeAnother}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <GitMerge size={15} />
          Merge Another
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DuplicateMergeUI({ onGroupCountChange }: { onGroupCountChange?: (count: number) => void }) {
  const {
    groups,
    loading,
    error,
    step,
    selectedGroup,
    primaryLeadId,
    fieldConflicts,
    fieldResolutions,
    mergedPreview,
    merging,
    mergeSuccess,
    mergeError,
    loadDuplicates,
    handleSelectGroup,
    handleSetPrimaryLead,
    handleResolveField,
    handleAutoResolve,
    handleContinueToPreview,
    handleBackToCompare,
    handleBackToList,
    handleExecuteMerge,
    handleMergeAnother,
  } = useDuplicates();

  // Notify parent of group count whenever it changes (used for tab badge)
  useEffect(() => {
    if (!loading) onGroupCountChange?.(groups.length);
  }, [groups.length, loading, onGroupCountChange]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <GitMerge size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Duplicate Lead Merge</h2>
          <p className="text-xs text-gray-400">
            Find leads with similar names, phones, or companies and merge them into one
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        {step === "select" && (
          <GroupListStep
            groups={groups}
            loading={loading}
            error={error}
            onSelect={handleSelectGroup}
            onLoad={loadDuplicates}
          />
        )}

        {step === "compare" && selectedGroup && (
          <CompareStep
            group={selectedGroup}
            primaryLeadId={primaryLeadId}
            fieldConflicts={fieldConflicts}
            onSetPrimary={handleSetPrimaryLead}
            onResolve={handleResolveField}
            onAutoResolve={handleAutoResolve}
            onBack={handleBackToList}
            onContinue={handleContinueToPreview}
          />
        )}

        {step === "preview" && selectedGroup && (
          <PreviewStep
            mergedPreview={mergedPreview}
            primaryLeadId={primaryLeadId}
            group={selectedGroup}
            merging={merging}
            mergeError={mergeError}
            onBack={handleBackToCompare}
            onMerge={handleExecuteMerge}
          />
        )}

        {step === "success" && selectedGroup && (
          <SuccessStep
            group={selectedGroup}
            onMergeAnother={handleMergeAnother}
            onBack={handleBackToList}
          />
        )}
      </div>
    </div>
  );
}
