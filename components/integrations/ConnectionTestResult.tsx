import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { AsyncRequestStatus } from "@/hooks/useAsyncRequest";
import { NormalizedConnectionTestResult } from "@/types/integrations";
import { connectionErrorMessages } from "@/lib/api/connectionTest";

interface ConnectionTestResultProps {
  status: AsyncRequestStatus;
  result: NormalizedConnectionTestResult | null;
  isRetrying?: boolean;
  onRetry?: () => void;
  compact?: boolean;
}

const errorLabels = {
  AUTH: "Authentication",
  TIMEOUT: "Timeout",
  NETWORK: "Network",
  RATE_LIMIT: "Rate limited",
  CONFIG: "Configuration",
  SERVER: "Server",
  UNKNOWN: "Connection test",
};

export function ConnectionTestResult({
  status,
  result,
  isRetrying = false,
  onRetry,
  compact = false,
}: ConnectionTestResultProps) {
  if (status === "idle") {
    return <p className="text-xs text-text-muted">Connection has not been tested.</p>;
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-primary" role="status" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{isRetrying ? "Retrying connection test..." : "Testing connection..."}</span>
      </div>
    );
  }

  if (!result) return null;

  const isSuccess = result.success;
  const category = result.errorCategory || "UNKNOWN";
  const showStatusCode =
    typeof result.statusCode === "number" &&
    (isSuccess ? result.statusCode < 400 : result.statusCode >= 400);

  return (
    <div className={`p-3 rounded-xl border text-xs space-y-2 ${isSuccess ? "bg-success/10 border-success/20 text-success" : "bg-error/10 border-error/20 text-error"}`}>
      <div className="flex items-start gap-2">
        {isSuccess ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-bold">{isSuccess ? "Connection successful" : "Connection failed"}</p>
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
              {showStatusCode && <span>HTTP {result.statusCode}</span>}
              {typeof result.latencyMs === "number" && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{result.latencyMs}ms</span>}
              {!isSuccess && <span className="font-sans uppercase font-bold">{errorLabels[category]}</span>}
            </div>
          </div>
          <p className="leading-relaxed">{result.message || connectionErrorMessages[category]}</p>
          {isSuccess && (typeof result.recordsDetected === "number" || typeof result.entitiesDetected === "number") && (
            <p className="text-[11px]">{result.recordsDetected ?? 0} records, {result.entitiesDetected ?? 0} entities detected</p>
          )}
          {!compact && result.diagnostics && <p className="text-[11px] opacity-80 break-all">{result.diagnostics}</p>}
        </div>
      </div>
      {!isSuccess && onRetry && (
        <button type="button" onClick={onRetry} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 font-semibold disabled:opacity-50">
          {isRetrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>{isRetrying ? "Retrying..." : "Retry test"}</span>
        </button>
      )}
    </div>
  );
}