"use client";

import React, { useMemo } from "react";
import {
  Connector,
  DiscoveredSchemaResponse,
  AuthType,
  HttpMethod,
  SyncDirection,
  SyncFrequency,
} from "@/types/integrations";
import { FieldMappingEntry } from "./EntitySelectionMappingFlow";
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Database,
  Lock,
  Activity,
  Calendar,
  Sparkles,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileCode,
} from "lucide-react";

export interface ReviewAndEnableStepProps {
  connector: Connector | null;
  displayName: string;
  targetModule: string;
  targetEntity: string;
  apiUrl: string;
  httpMethod: HttpMethod;
  authType: AuthType;
  syncDirection: SyncDirection;
  syncFrequency: SyncFrequency;
  customHeadersCount: number;
  discoveredSchema: DiscoveredSchemaResponse | null;
  mappedFields: Record<string, string>;
  rawMappingEntries: FieldMappingEntry[];
  requiredFieldsMissing: string[];
  isSubmitting: boolean;
  activationSuccess: boolean;
  isConfirmed: boolean;
  setIsConfirmed: (val: boolean) => void;
  onOpenDashboard?: () => void;
}

export function ReviewAndEnableStep({
  connector,
  displayName,
  targetModule,
  targetEntity,
  apiUrl,
  httpMethod,
  authType,
  syncDirection,
  syncFrequency,
  customHeadersCount,
  discoveredSchema,
  mappedFields,
  rawMappingEntries,
  requiredFieldsMissing,
  isSubmitting,
  activationSuccess,
  isConfirmed,
  setIsConfirmed,
  onOpenDashboard,
}: ReviewAndEnableStepProps) {
  const mappedCount = useMemo(() => {
    return Object.keys(mappedFields).filter((k) => !!mappedFields[k]).length;
  }, [mappedFields]);

  const transformationsCount = useMemo(() => {
    return rawMappingEntries.filter(
      (e) => e.transformationType && e.transformationType !== "none"
    ).length;
  }, [rawMappingEntries]);

  // Large-Import Warning: Check if recordCount from discovered schema is large (e.g. >= 5,000) or metadata specifies it
  const recordCount = discoveredSchema?.recordCount ?? discoveredSchema?.sampleRecords?.length ?? 0;
  const isLargeImport = recordCount > 5000;

  const authLabelMap: Record<AuthType, string> = {
    API_KEY: "API Key Header (Encrypted)",
    BEARER_TOKEN: "Bearer Token (Encrypted)",
    BASIC_AUTH: "Basic HTTP Auth (Encrypted)",
    OAUTH2: "OAuth 2.0 Delegated Token",
    WEBHOOK_SECRET: "HMAC Webhook Signing Secret",
    CUSTOM: "Custom Token Configuration",
    NONE: "No Authentication (Public)",
  };

  if (activationSuccess) {
    return (
      <div className="p-8 rounded-2xl border border-success/30 bg-success/5 flex flex-col items-center justify-center text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center text-success shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h3 className="text-lg font-bold text-text">
            Integration Successfully Activated!
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-text">{displayName || connector?.name}</span> is now active. Background synchronization will run on a{" "}
            <span className="font-medium text-text">{syncFrequency.toLowerCase()}</span> schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onOpenDashboard && (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-md transition-all"
            >
              <Activity className="w-4 h-4" />
              <span>Go to Live Integration Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Required Fields Blocking Alert */}
      {requiredFieldsMissing.length > 0 && (
        <div className="p-4 rounded-xl border border-error/30 bg-error/10 text-error flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold">Cannot Enable: Missing Required Target Fields</h4>
            <p className="text-error/90">
              The following required fields must be mapped before activation:{" "}
              <span className="font-semibold">{requiredFieldsMissing.join(", ")}</span>
            </p>
          </div>
        </div>
      )}

      {/* Large-Import Warning */}
      {isLargeImport && (
        <div className="p-4 rounded-xl border border-warning/30 bg-warning/10 text-warning-foreground flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warning mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-warning">Large Dataset Import Warning</h4>
            <p className="text-text-secondary">
              Discovered approximately <span className="font-semibold text-text">{recordCount.toLocaleString()}</span> records. Initial synchronization may take several minutes to complete depending on rate limits.
            </p>
          </div>
        </div>
      )}

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connector & Entity Summary */}
        <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
              {connector?.iconUrl ? (
                <img src={connector.iconUrl} alt={connector.name} className="w-4 h-4 object-contain" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                Integration & Target
              </h4>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Connector:</span>
              <span className="font-semibold text-text">{connector?.name || "Custom Connector"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Display Name:</span>
              <span className="font-medium text-text">{displayName || `${connector?.name} Integration`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Target Module / Entity:</span>
              <span className="font-mono text-primary font-semibold">
                {targetModule} / {targetEntity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Discovered Entity:</span>
              <span className="font-mono text-text">
                {discoveredSchema?.entities?.[0]?.label || discoveredSchema?.entities?.[0]?.name || "Default Schema"}
              </span>
            </div>
          </div>
        </div>

        {/* Authentication & Security Summary */}
        <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="w-7 h-7 rounded-lg bg-success/10 border border-success/20 text-success flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                Security & Authentication
              </h4>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Auth Protocol:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {authLabelMap[authType] || authType}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Credential Storage:</span>
              <span className="flex items-center gap-1 font-medium text-success">
                <Lock className="w-3 h-3" /> Encrypted at Rest (AES-256-GCM)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Raw Secrets:</span>
              <span className="font-mono text-[11px] text-text-muted">•••••••••••••••• (Masked)</span>
            </div>
          </div>
        </div>

        {/* Protocol & Endpoint Configuration */}
        <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="w-7 h-7 rounded-lg bg-info/10 border border-info/20 text-info flex items-center justify-center font-bold">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                Endpoint & Sync Schedule
              </h4>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Method / Endpoint:</span>
              <div className="flex items-center gap-1.5 max-w-[200px] truncate">
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-surface-secondary text-text border border-border">
                  {httpMethod}
                </span>
                <span className="font-mono text-[11px] text-text truncate" title={apiUrl}>
                  {apiUrl || "N/A"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Sync Direction:</span>
              <span className="font-medium text-text">{syncDirection}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Sync Frequency:</span>
              <span className="font-medium text-text">{syncFrequency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Custom Headers:</span>
              <span className="font-medium text-text">{customHeadersCount} configured</span>
            </div>
          </div>
        </div>

        {/* Mappings & Transformations Summary */}
        <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <div className="w-7 h-7 rounded-lg bg-warning/10 border border-warning/20 text-warning flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                Mapping & Transformations
              </h4>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Fields Mapped:</span>
              <span className="font-semibold text-text">
                {mappedCount} field{mappedCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Transformations Configured:</span>
              <span className="font-semibold text-primary">
                {transformationsCount} rule{transformationsCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Required Fields Status:</span>
              {requiredFieldsMissing.length === 0 ? (
                <span className="flex items-center gap-1 font-semibold text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All Satisfied
                </span>
              ) : (
                <span className="font-semibold text-error">
                  {requiredFieldsMissing.length} Missing
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Activation Confirmation Toggle */}
      <div className="p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            disabled={isSubmitting || requiredFieldsMissing.length > 0}
            className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 disabled:opacity-50 cursor-pointer"
          />
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-text block">
              I confirm and authorize live activation of this integration
            </span>
            <p className="text-text-secondary leading-relaxed">
              Enabling will activate background synchronization according to the configured <span className="font-medium text-text">{syncFrequency.toLowerCase()}</span> schedule. Data will flow into the <span className="font-mono font-medium text-text">{targetModule}</span> module.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
