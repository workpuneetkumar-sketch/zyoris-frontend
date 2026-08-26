import React, { useState, useRef, useEffect } from "react";
import {
  Connector,
  ConnectorCategory,
  IntegrationStatus,
} from "@/types/integrations";
import {
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  RefreshCw,
  Settings,
  MoreVertical,
  Key,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Zap,
  Layers,
  Database,
  Unlink,
  Play,
  Pause,
} from "lucide-react";

interface ConnectorCardProps {
  connector: Connector;
  onConnect: (connector: Connector) => void;
  onConfigure: (connector: Connector) => void;
  onRotateCredentials?: (connector: Connector) => void;
  onSyncNow?: (connector: Connector) => Promise<void>;
  onTestConnection?: (connector: Connector) => Promise<void>;
  onViewSchema?: (connector: Connector) => void;
  onTogglePause?: (connector: Connector) => Promise<void>;
  onReconnect?: (connector: Connector) => void | Promise<void>;
  onDisconnect?: (connector: Connector) => void;
  canManage?: boolean;
}

export function ConnectorCard({
  connector,
  onConnect,
  onConfigure,
  onRotateCredentials,
  onSyncNow,
  onTestConnection,
  onViewSchema,
  onTogglePause,
  onReconnect,
  onDisconnect,
  canManage = true,
}: ConnectorCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const isConnected = !!connector.isConnected;
  const status = (connector.status || (isConnected ? "CONNECTED" : "NOT_CONNECTED")).toUpperCase();
  const isPaused = status === "PAUSED";
  const isError = status === "ERROR" || (connector.connectionState?.errorCount && connector.connectionState.errorCount > 0);

  // Category badge styling helper using semantic CSS tokens
  const getCategoryClasses = (category?: string) => {
    const cat = (category || "CUSTOM").toUpperCase();
    switch (cat) {
      case "CRM":
        return "bg-cat-crm-bg text-cat-crm border-cat-crm/20";
      case "FINANCE":
        return "bg-cat-finance-bg text-cat-finance border-cat-finance/20";
      case "MARKETING":
        return "bg-cat-marketing-bg text-cat-marketing border-cat-marketing/20";
      case "COMMUNICATIONS":
        return "bg-cat-comm-bg text-cat-comm border-cat-comm/20";
      case "HR":
        return "bg-cat-hr-bg text-cat-hr border-cat-hr/20";
      case "PROJECTS":
        return "bg-cat-projects-bg text-cat-projects border-cat-projects/20";
      default:
        return "bg-cat-custom-bg text-cat-custom border-cat-custom/20";
    }
  };

  const handleSyncClick = async () => {
    if (!onSyncNow || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncNow(connector);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestClick = async () => {
    if (!onTestConnection || isTesting) return;
    setIsTesting(true);
    try {
      await onTestConnection(connector);
    } finally {
      setIsTesting(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface hover:border-border-light transition-all shadow-sm flex flex-col justify-between p-5 group relative">
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logo / Icon */}
            <div className="w-12 h-12 rounded-xl bg-surface-secondary border border-border flex items-center justify-center overflow-hidden flex-shrink-0 text-text font-bold text-base shadow-sm">
              {connector.iconUrl || connector.logoUrl ? (
                <img
                  src={connector.iconUrl || connector.logoUrl}
                  alt={connector.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    // Fallback to text initials on image error
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>{(connector.name || "CO").substring(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-semibold text-text leading-snug">
                  {connector.name}
                </h3>
                {connector.popular && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Popular
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getCategoryClasses(
                    connector.category
                  )}`}
                >
                  {connector.category || "Custom"}
                </span>
                {connector.version && (
                  <span className="text-[11px] text-text-muted">
                    v{connector.version}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div>
            {isConnected ? (
              isError ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Attention
                </span>
              ) : isPaused ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                  <PauseCircle className="w-3.5 h-3.5" />
                  Paused
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Connected
                </span>
              )
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-secondary text-text-muted border border-border">
                Available
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed">
          {connector.description || "Seamless integration connector for Zyoris platform."}
        </p>

        {/* Capabilities Tags */}
        {connector.capabilities && connector.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {connector.capabilities.slice(0, 3).map((cap, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-secondary text-text-secondary border border-border"
              >
                {cap}
              </span>
            ))}
            {connector.capabilities.length > 3 && (
              <span className="text-[10px] text-text-muted self-center">
                +{connector.capabilities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Metadata Details */}
        <div className="mt-4 pt-3 border-t border-border-light grid grid-cols-2 gap-2 text-xs text-text-muted">
          <div>
            <span className="block text-[10px] uppercase font-semibold text-text-muted">
              Auth Method
            </span>
            <span className="font-medium text-text-secondary">
              {connector.authType || "OAuth 2.0 / API Key"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-text-muted">
              Sync Mode
            </span>
            <span className="font-medium text-text-secondary">
              {connector.supportedSyncDirections?.join(", ") || "Bidirectional"}
            </span>
          </div>
        </div>

        {/* Last sync / error status banner if connected */}
        {isConnected && connector.connectionState?.lastSyncAt && (
          <div className="mt-3 p-2 rounded-lg bg-surface-secondary text-[11px] text-text-secondary flex items-center justify-between">
            <span>Last synced:</span>
            <span className="font-medium text-text">
              {new Date(connector.connectionState.lastSyncAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {isConnected && isError && connector.connectionState?.lastError && (
          <div className="mt-2 p-2 rounded-lg bg-error/10 text-[11px] text-error flex items-start gap-1.5 border border-error/20">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              {connector.connectionState.lastError}
            </span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
        {isConnected ? (
          <>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onConfigure(connector)}
                disabled={!canManage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={canManage ? "Configure Integration" : "Permission required"}
              >
                <Settings className="w-3.5 h-3.5 text-text-muted" />
                <span>Configure</span>
              </button>

              {onSyncNow && (
                <button
                  onClick={handleSyncClick}
                  disabled={!canManage || isSyncing || isPaused}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:text-text hover:bg-surface-hover text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Trigger Manual Sync"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`}
                  />
                  <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                </button>
              )}
            </div>

            {/* Overflow Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover border border-transparent hover:border-border transition-colors"
                aria-label="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1 w-52 rounded-xl border border-border bg-surface shadow-xl py-1.5 z-20 text-xs">
                  {onRotateCredentials && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRotateCredentials(connector);
                      }}
                      disabled={!canManage}
                      className="w-full text-left px-3 py-2 text-text hover:bg-surface-hover flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-warning" />
                      <span>Rotate Credentials</span>
                    </button>
                  )}

                  {onReconnect && (
                    <button
                      onClick={async () => {
                        setIsMenuOpen(false);
                        await onReconnect(connector);
                      }}
                      disabled={!canManage}
                      className="w-full text-left px-3 py-2 text-text hover:bg-surface-hover flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-primary" />
                      <span>Reconnect</span>
                    </button>
                  )}

                  {onTogglePause && (
                    <button
                      onClick={async () => {
                        setIsMenuOpen(false);
                        await onTogglePause(connector);
                      }}
                      disabled={!canManage}
                      className="w-full text-left px-3 py-2 text-text hover:bg-surface-hover flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 text-success" />
                          <span>Resume Sync</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-warning" />
                          <span>Pause Sync</span>
                        </>
                      )}
                    </button>
                  )}

                  {onTestConnection && (
                    <button
                      onClick={handleTestClick}
                      disabled={isTesting || !canManage}
                      className="w-full text-left px-3 py-2 text-text hover:bg-surface-hover flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span>{isTesting ? "Testing..." : "Test Connection"}</span>
                    </button>
                  )}

                  {onViewSchema && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onViewSchema(connector);
                      }}
                      className="w-full text-left px-3 py-2 text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                    >
                      <Database className="w-3.5 h-3.5 text-info" />
                      <span>View Schema</span>
                    </button>
                  )}

                  {connector.docsUrl && (
                    <a
                      href={connector.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-left px-3 py-2 text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                      <span>Documentation</span>
                    </a>
                  )}

                  {onDisconnect && (
                    <div className="pt-1 mt-1 border-t border-border">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onDisconnect(connector);
                        }}
                        disabled={!canManage}
                        className="w-full text-left px-3 py-2 text-error hover:bg-error/10 flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            {connector.docsUrl ? (
              <a
                href={connector.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-text-muted hover:text-text flex items-center gap-1 transition-colors"
              >
                <span>Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <div />
            )}

            <button
              onClick={() => onConnect(connector)}
              disabled={!canManage}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={canManage ? "Connect to service" : "Permission required"}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
