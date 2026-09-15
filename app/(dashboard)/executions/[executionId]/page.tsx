"use client";

/**
 * app/(dashboard)/executions/[executionId]/page.tsx
 * ─────────────────────────────────────────────────────────────
 * ExecutionDetail — full lifecycle view for a single execution.
 *
 * Shows: plan → chronological tool-call timeline (collapsible)
 * → outputs → errors → approval states.
 *
 * All colors from CSS variable tokens only.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getExecution } from "@/lib/api/executionsApi";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Zap,
  ShieldCheck,
  Terminal,
  Layers,
} from "lucide-react";
import { ExecutionStatusBadge } from "@/components/executions/ExecutionStatusBadge";
import type { ExecutionDetail, ToolCallEntry, ExecutionApprovalRef } from "@/types/executions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms?: number): string {
  if (ms == null) return "—";
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`;
}

function formatTs(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return iso; }
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); }
  catch { return iso; }
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-5 w-28 bg-[color:var(--color-background-secondary)] rounded-lg" />
      <div className="h-32 bg-[color:var(--color-background-secondary)] rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="h-48 bg-[color:var(--color-background-secondary)] rounded-2xl" />
          <div className="h-64 bg-[color:var(--color-background-secondary)] rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="h-40 bg-[color:var(--color-background-secondary)] rounded-2xl" />
          <div className="h-36 bg-[color:var(--color-background-secondary)] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Info block wrapper ───────────────────────────────────────────────────────

function InfoBlock({
  icon,
  title,
  accent = "slate",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: "slate" | "blue" | "green" | "red" | "amber" | "violet";
  children: React.ReactNode;
}) {
  const header: Record<string, string> = {
    slate:  "text-[color:var(--color-text-secondary)] border-[color:var(--color-border)]",
    blue:   "text-[color:var(--color-info-foreground)] border-[color:var(--color-info-light)]",
    green:  "text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    red:    "text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    amber:  "text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    violet: "text-[color:var(--color-cat-comm)] border-[color:var(--color-cat-comm-bg)]",
  };
  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${header[accent]}`}>
        {icon}
        <h3 className="text-xs font-extrabold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Tool call timeline entry ─────────────────────────────────────────────────

function ToolCallItem({
  call,
  isLast,
}: {
  call: ToolCallEntry;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    SUCCESS: <CheckCircle2 size={15} className="text-[color:var(--color-success)]" />,
    FAILED:  <XCircle     size={15} className="text-[color:var(--color-error)]"   />,
    PENDING: <Clock       size={15} className="text-[color:var(--color-warning)]"  />,
    SKIPPED: <Loader2     size={15} className="text-[color:var(--color-text-muted)]" />,
  }[call.status] ?? <Clock size={15} className="text-[color:var(--color-text-muted)]" />;

  const pillCls = {
    SUCCESS: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    FAILED:  "bg-[color:var(--color-error-light)]   text-[color:var(--color-error-foreground)]   border-[color:var(--color-error-light)]",
    PENDING: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    SKIPPED: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  }[call.status] ?? "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]";

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 bg-[color:var(--color-surface)] ${
          call.status === "SUCCESS"
            ? "border-[color:var(--color-success)]"
            : call.status === "FAILED"
            ? "border-[color:var(--color-error)]"
            : "border-[color:var(--color-border)]"
        }`}>
          {statusIcon}
        </div>
        {!isLast && <div className="w-px flex-1 min-h-[20px] bg-[color:var(--color-border)] mt-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
        <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-1.5 py-0.5 rounded font-mono">
              #{call.sequence}
            </span>
            <span className="text-sm font-semibold text-[color:var(--color-text)] font-mono">
              {call.toolName}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pillCls}`}>
              {call.status}
            </span>
            {call.approvalId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]">
                Approval required
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[color:var(--color-text-muted)] shrink-0">
            <span>{formatTs(call.calledAt)}</span>
            {call.durationMs != null && <span>· {formatDuration(call.durationMs)}</span>}
          </div>
        </div>

        {/* At-a-glance summary */}
        {(call.inputSummary || call.outputSummary) && (
          <div className="mt-1 space-y-0.5">
            {call.inputSummary && (
              <p className="text-[11px] text-[color:var(--color-text-secondary)]">
                <span className="font-semibold text-[color:var(--color-text-muted)]">In:</span>{" "}
                {call.inputSummary}
              </p>
            )}
            {call.outputSummary && (
              <p className="text-[11px] text-[color:var(--color-text-secondary)]">
                <span className="font-semibold text-[color:var(--color-text-muted)]">Out:</span>{" "}
                {call.outputSummary}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {call.error && (
          <p className="mt-1 text-[11px] font-medium text-[color:var(--color-error)] flex items-center gap-1">
            <AlertCircle size={11} /> {call.error}
          </p>
        )}

        {/* Expand toggle for full input/output */}
        {(call.input || call.output) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-primary)] hover:underline"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Hide" : "Expand"} details
          </button>
        )}

        {expanded && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {call.input && (
              <div>
                <p className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest mb-1">Input</p>
                <pre className="text-[11px] font-mono bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] rounded-xl p-3 overflow-x-auto text-[color:var(--color-text-secondary)] leading-relaxed">
                  {JSON.stringify(call.input, null, 2)}
                </pre>
              </div>
            )}
            {call.output && (
              <div>
                <p className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest mb-1">Output</p>
                <pre className="text-[11px] font-mono bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] rounded-xl p-3 overflow-x-auto text-[color:var(--color-text-secondary)] leading-relaxed">
                  {JSON.stringify(call.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Approval ref card ────────────────────────────────────────────────────────

function ApprovalRefCard({ ref: approval }: { ref: ExecutionApprovalRef }) {
  const statusCls = {
    PENDING:  "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    APPROVED: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    REJECTED: "bg-[color:var(--color-error-light)]   text-[color:var(--color-error-foreground)]   border-[color:var(--color-error-light)]",
    EXPIRED:  "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  }[approval.status] ?? "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]";

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
      <ShieldCheck size={16} className="text-[color:var(--color-warning-foreground)] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-semibold text-[color:var(--color-text)] font-mono">
            {approval.toolName}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCls}`}>
            {approval.status}
          </span>
        </div>
        <p className="text-[10px] text-[color:var(--color-text-muted)] font-mono">{approval.approvalId}</p>
        {approval.decidedAt && (
          <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
            Decided {formatDateTime(approval.decidedAt)}{approval.decidedBy ? ` by ${approval.decidedBy}` : ""}
          </p>
        )}
        {approval.rejectionReason && (
          <p className="text-[10px] text-[color:var(--color-error)] mt-0.5">
            Reason: {approval.rejectionReason}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExecutionDetailPage() {
  const { user, token, isInitializing } = useAuth();
  const router = useRouter();
  const params = useParams();
  const executionId =
    typeof params?.executionId === "string"
      ? params.executionId
      : Array.isArray(params?.executionId)
      ? params.executionId[0]
      : undefined;

  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, isInitializing, router]);

  const fetchDetail = useCallback(async () => {
    if (!token || !executionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getExecution(executionId as string);
      setExecution(data);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load execution.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, executionId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (!user) return null;
  if (loading) return <DetailSkeleton />;

  if (error && !execution) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-[1400px] mx-auto">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Execution</h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{error}</p>
        <div className="flex gap-3">
          <button onClick={fetchDetail} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all">
            <RefreshCw size={14} /> Retry
          </button>
          <button onClick={() => router.push("/executions")} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>
    );
  }

  if (!execution) return null;

  const hasErrors = execution.errors && execution.errors.length > 0;
  const hasApprovals = execution.approvals && execution.approvals.length > 0;

  const metaRows = [
    { label: "Execution ID",  value: execution.id,            mono: true  },
    { label: "Agent",         value: execution.agentName || execution.agentId },
    { label: "Initiator",     value: execution.initiatorType  },
    { label: "Model",         value: execution.modelUsed,      mono: true  },
    { label: "Model version", value: execution.modelVersion ? `v${execution.modelVersion}` : undefined, mono: true },
    { label: "Tool calls",    value: execution.toolCalls?.length ?? execution.toolCallCount ?? 0 },
    { label: "Started",       value: execution.startedAt ? new Date(execution.startedAt).toLocaleString() : undefined },
    { label: "Completed",     value: execution.completedAt ? new Date(execution.completedAt).toLocaleString() : undefined },
    { label: "Duration",      value: execution.durationMs != null ? formatDuration(execution.durationMs) : undefined },
  ].filter((r) => r.value !== undefined && r.value !== "");

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[color:var(--color-text-muted)]">
        <button
          onClick={() => router.push("/executions")}
          className="hover:text-[color:var(--color-primary)] font-medium transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={12} /> Execution Ledger
        </button>
        <ChevronRight size={12} />
        <span className="text-[color:var(--color-text)] font-semibold font-mono truncate max-w-[200px]">
          {execution.id}
        </span>
      </nav>

      {/* Hero header */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-info-light)] border border-[color:var(--color-info-light)] flex items-center justify-center shrink-0">
            <Bot size={22} className="text-[color:var(--color-info)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-[color:var(--color-text)] tracking-tight">
                {execution.agentName || execution.agentId}
              </h1>
              <span className="text-[11px] font-mono text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-2 py-0.5 rounded-md border border-[color:var(--color-border)]">
                {execution.id}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <ExecutionStatusBadge status={execution.status} />
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)] border border-[color:var(--color-border)]">
                {execution.initiatorType}
              </span>
              {execution.modelUsed && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]">
                  {execution.modelUsed}
                </span>
              )}
            </div>
            {execution.plan && (
              <p className="mt-3 text-sm text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
                {execution.plan}
              </p>
            )}
          </div>
          <button onClick={fetchDetail} className="p-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-hover)] rounded-lg transition-all shrink-0" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: plan detail + tool-call timeline */}
        <div className="lg:col-span-2 space-y-5">

          {/* Plan detail */}
          {execution.planDetail && (
            <InfoBlock icon={<FileText size={13} />} title="Execution Plan" accent="blue">
              <pre className="text-xs text-[color:var(--color-text)] leading-relaxed whitespace-pre-wrap font-sans">
                {execution.planDetail}
              </pre>
            </InfoBlock>
          )}

          {/* Tool-call timeline */}
          <InfoBlock icon={<Layers size={13} />} title="Tool Call Timeline" accent="slate">
            {!execution.toolCalls || execution.toolCalls.length === 0 ? (
              <p className="text-xs text-[color:var(--color-text-muted)] italic">No tool calls recorded.</p>
            ) : (
              <div>
                {execution.toolCalls.map((call, idx) => (
                  <ToolCallItem
                    key={`${call.sequence}-${call.toolName}`}
                    call={call}
                    isLast={idx === execution.toolCalls.length - 1}
                  />
                ))}
              </div>
            )}
          </InfoBlock>

          {/* Outputs */}
          {execution.outputs && (
            <InfoBlock icon={<Terminal size={13} />} title="Outputs" accent="green">
              {typeof execution.outputs === "string" ? (
                <p className="text-sm text-[color:var(--color-text)] leading-relaxed">{execution.outputs}</p>
              ) : (
                <pre className="text-[11px] font-mono bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] rounded-xl p-3 overflow-x-auto text-[color:var(--color-text-secondary)] leading-relaxed">
                  {JSON.stringify(execution.outputs, null, 2)}
                </pre>
              )}
            </InfoBlock>
          )}

          {/* Errors — visually distinct */}
          {hasErrors && (
            <InfoBlock icon={<XCircle size={13} />} title="Errors" accent="red">
              <div className="space-y-2">
                {execution.errors!.map((err, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
                    <AlertCircle size={14} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-[color:var(--color-error-foreground)] leading-relaxed">{err}</p>
                  </div>
                ))}
              </div>
            </InfoBlock>
          )}
        </div>

        {/* Right: meta + approvals */}
        <div className="space-y-5">

          {/* Metadata */}
          <InfoBlock icon={<Zap size={13} />} title="Execution Details" accent="slate">
            <dl className="space-y-2.5">
              {metaRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 text-xs">
                  <dt className="text-[color:var(--color-text-muted)] font-medium shrink-0">{row.label}</dt>
                  <dd className={`text-right break-all text-[color:var(--color-text)] ${row.mono ? "font-mono text-[11px]" : ""}`}>
                    {String(row.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </InfoBlock>

          {/* Approvals — visually distinct */}
          {hasApprovals && (
            <InfoBlock icon={<ShieldCheck size={13} />} title="Approval States" accent="amber">
              <div className="space-y-3">
                {execution.approvals!.map((a) => (
                  <ApprovalRefCard key={a.approvalId} ref={a} />
                ))}
              </div>
            </InfoBlock>
          )}

          {/* Jump to approvals */}
          {hasApprovals && (
            <button
              onClick={() => router.push("/approvals")}
              className="w-full flex items-center justify-between px-4 py-3 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] rounded-xl transition-all text-sm font-semibold text-[color:var(--color-text-secondary)]"
            >
              <span>View in Approval Queue</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
