import React, { useState, useEffect, useMemo } from "react";
import {
  Connector,
  UpdateIntegrationPayload,
  SyncDirection,
  SyncFrequency,
  HttpMethod,
} from "@/types/integrations";
import { getIntegrationByIdApi } from "@/lib/api/integrationsApi";
import {
  extractConnectorConfigFields,
  isSecretConfigField,
  buildEditIntegrationPayload,
} from "@/lib/utils/integrationContracts";
import {
  X,
  Settings,
  Loader2,
  Save,
  Globe,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Plus,
  Trash2,
  KeyRound,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

interface EditIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onUpdate: (id: string, payload: UpdateIntegrationPayload) => Promise<any>;
  canConfigure?: boolean;
}

export function EditIntegrationModal({
  isOpen,
  onClose,
  connector,
  onUpdate,
  canConfigure = true,
}: EditIntegrationModalProps) {
  // Non-sensitive configuration
  const [displayName, setDisplayName] = useState("");
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("HOURLY");
  const [syncDirection, setSyncDirection] = useState<SyncDirection>("BIDIRECTIONAL");
  const [apiUrl, setApiUrl] = useState("");
  const [httpMethod, setHttpMethod] = useState<HttpMethod>("POST");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});

  // Sensitive credential update state - strictly in-memory
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [dynamicSecrets, setDynamicSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  const connectorConfigFields = useMemo(
    () => extractConnectorConfigFields(connector),
    [connector]
  );

  const nonSecretConfigFields = useMemo(
    () =>
      connectorConfigFields.filter(
        (field) => !isSecretConfigField(field) && field.name !== "baseUrl"
      ),
    [connectorConfigFields]
  );

  const authType = (connector?.authType || "API_KEY").toUpperCase();

  const extraSecretConfigFields = useMemo(
    () =>
      connectorConfigFields.filter((field) => {
        if (!isSecretConfigField(field)) return false;
        if ((authType === "API_KEY" || authType === "NONE") && field.name === "apiKey") {
          return false;
        }
        if (
          (authType === "BEARER_TOKEN" || authType === "OAUTH2") &&
          field.name === "accessToken"
        ) {
          return false;
        }
        if (authType === "BASIC_AUTH" && field.name === "password") {
          return false;
        }
        if (authType === "WEBHOOK_SECRET" && field.name === "webhookSecret") {
          return false;
        }
        return true;
      }),
    [connectorConfigFields, authType]
  );

  useEffect(() => {
    if (!connector || !isOpen) return;
    let isCancelled = false;

    const applySavedState = (
      savedName?: string,
      savedConfig?: Record<string, any> | null
    ) => {
      const cfg = savedConfig && typeof savedConfig === "object" ? savedConfig : {};
      setDisplayName(
        savedName ||
          connector.connectionState?.name ||
          connector.connectionState?.displayName ||
          (typeof cfg.displayName === "string" ? cfg.displayName : "") ||
          connector.name ||
          ""
      );
      setSyncFrequency(
        (cfg.syncFrequency as SyncFrequency) || "HOURLY"
      );
      setSyncDirection(
        (cfg.syncDirection as SyncDirection) || "BIDIRECTIONAL"
      );
      setApiUrl(
        (typeof cfg.baseUrl === "string" && cfg.baseUrl) ||
          (typeof cfg.apiUrl === "string" && cfg.apiUrl) ||
          connector.configSchema?.endpoint?.defaultUrl ||
          ""
      );
      setHttpMethod(
        (cfg.httpMethod as HttpMethod) ||
          (connector.configSchema?.endpoint?.defaultMethod as HttpMethod) ||
          "POST"
      );

      if (cfg.headers && typeof cfg.headers === "object" && !Array.isArray(cfg.headers)) {
        setHeaders(
          Object.entries(cfg.headers).map(([k, v]) => ({ key: k, value: String(v) }))
        );
      } else if (connector.configSchema?.endpoint?.headers) {
        setHeaders(
          Object.entries(connector.configSchema.endpoint.headers).map(([k, v]) => ({
            key: k,
            value: String(v),
          }))
        );
      } else {
        setHeaders([]);
      }

      const seededDyn: Record<string, any> = {};
      for (const field of connectorConfigFields) {
        if (isSecretConfigField(field)) continue;
        const val = cfg[field.name];
        if (val !== undefined && val !== null && val !== "") {
          seededDyn[field.name] = val;
        } else if (field.defaultValue !== undefined) {
          seededDyn[field.name] = field.defaultValue;
        }
      }
      setDynamicFields(seededDyn);
      if (typeof cfg.authHeaderName === "string" && cfg.authHeaderName.trim()) {
        setApiKeyName(cfg.authHeaderName.trim());
      } else {
        setApiKeyName("X-API-Key");
      }
    };

    const existingConfig = connector.connectionState?.config || null;
    applySavedState(connector.connectionState?.name, existingConfig);

    // Reset sensitive fields
    setIsUpdatingCredentials(false);
    setApiKeyValue("");
    setBearerToken("");
    setBasicUsername("");
    setBasicPassword("");
    setWebhookSecret("");
    setDynamicSecrets({});
    setShowSecrets({});

    const existingId =
      connector.connectionId ||
      connector.connectionState?.id ||
      (connector.isConnected ? connector.id : null);

    if (!existingConfig && existingId) {
      getIntegrationByIdApi(existingId)
        .then((res) => {
          if (isCancelled) return;
          const record = (res as any)?.integration || res;
          if (record && (record.config || record.name)) {
            applySavedState(record.name, record.config || null);
          }
        })
        .catch(() => {
          // Non-fatal: keep catalog/defaults when detail hydration is unavailable
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [connector, isOpen, connectorConfigFields]);

  const handleClose = () => {
    // Clear sensitive state from memory immediately
    setApiKeyValue("");
    setBearerToken("");
    setBasicUsername("");
    setBasicPassword("");
    setWebhookSecret("");
    setDynamicSecrets({});
    setShowSecrets({});
    setIsUpdatingCredentials(false);
    onClose();
  };

  if (!isOpen || !connector) return null;

  const targetId =
    connector.connectionId || connector.connectionState?.id || connector.id;

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddHeader = () => {
    setHeaders((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    setHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: val } : h))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetId) {
      toast.error("No active connection instance found to update.");
      return;
    }

    if (!canConfigure) {
      toast.error("Permission denied. You do not have permission to update configuration.");
      return;
    }

    for (const field of nonSecretConfigFields) {
      if (!field.required) continue;
      const val = dynamicFields[field.name];
      if (val === undefined || val === null || String(val).trim() === "") {
        toast.error(`Please complete required field: ${field.label || field.name}`);
        return;
      }
    }

    const payload = buildEditIntegrationPayload({
      provider: connector.provider,
      displayName,
      syncFrequency,
      syncDirection,
      apiUrl,
      httpMethod,
      headers,
      dynamicFields,
      isUpdatingCredentials,
      authType,
      apiKeyName,
      apiKeyValue,
      bearerToken,
      basicUsername,
      basicPassword,
      webhookSecret,
      dynamicSecrets,
    });

    setIsSaving(true);
    try {
      await onUpdate(targetId, payload);
      toast.success("Integration settings updated successfully.");
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update integration configuration.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Edit Integration Settings
              </h3>
              <p className="text-xs text-text-muted">{connector.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
            />
          </div>

          {/* Sync Frequency & Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                Sync Frequency
              </label>
              <select
                value={syncFrequency}
                onChange={(e) =>
                  setSyncFrequency(e.target.value as SyncFrequency)
                }
                className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
              >
                <option value="REALTIME">Realtime</option>
                <option value="HOURLY">Hourly</option>
                <option value="EVERY_6_HOURS">Every 6 Hours</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MANUAL">Manual Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                Sync Direction
              </label>
              <select
                value={syncDirection}
                onChange={(e) =>
                  setSyncDirection(e.target.value as SyncDirection)
                }
                className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
              >
                <option value="BIDIRECTIONAL">Bidirectional</option>
                <option value="INBOUND">Inbound</option>
                <option value="OUTBOUND">Outbound</option>
              </select>
            </div>
          </div>

          {/* API URL & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                Target API URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.connector.com/v1"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                HTTP Method
              </label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as HttpMethod)}
                className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          {/* Custom Headers */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text uppercase tracking-wider">
                Custom Headers
              </label>
              <button
                type="button"
                onClick={handleAddHeader}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Header</span>
              </button>
            </div>

            {headers.length === 0 ? (
              <p className="text-xs text-text-muted p-2 rounded-lg bg-surface-secondary/40 border border-dashed border-border text-center">
                No custom headers configured.
              </p>
            ) : (
              <div className="space-y-2">
                {headers.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={h.key}
                      onChange={(e) =>
                        handleHeaderChange(idx, "key", e.target.value)
                      }
                      placeholder="Header Name"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={h.value}
                      onChange={(e) =>
                        handleHeaderChange(idx, "value", e.target.value)
                      }
                      placeholder="Header Value"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(idx)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-surface-hover rounded-lg transition-colors"
                      aria-label="Remove header"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider-Specific Configuration Fields */}
          {nonSecretConfigFields.length > 0 && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text">
                <Sliders className="w-4 h-4 text-primary" />
                <span>{connector.name} Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nonSecretConfigFields.map((field) => {
                  const val =
                    dynamicFields[field.name] ?? field.defaultValue ?? "";
                  const inputId = `edit-dyn-${field.name}`;
                  return (
                    <div key={field.name} className="space-y-1">
                      <label
                        htmlFor={inputId}
                        className="block text-xs text-text-muted"
                      >
                        {field.label || field.name}
                        {field.required && (
                          <span className="text-error ml-0.5">*</span>
                        )}
                      </label>
                      {field.type === "select" && Array.isArray(field.options) ? (
                        <select
                          id={inputId}
                          value={String(val)}
                          onChange={(e) =>
                            setDynamicFields((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none"
                        >
                          {!field.required && (
                            <option value="">Select an option...</option>
                          )}
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <label
                          htmlFor={inputId}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-text cursor-pointer"
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) =>
                              setDynamicFields((prev) => ({
                                ...prev,
                                [field.name]: e.target.checked,
                              }))
                            }
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                          <span>{field.helpText || "Enabled"}</span>
                        </label>
                      ) : (
                        <input
                          id={inputId}
                          type={
                            field.type === "number"
                              ? "number"
                              : field.type === "url"
                                ? "url"
                                : "text"
                          }
                          value={String(val)}
                          onChange={(e) =>
                            setDynamicFields((prev) => ({
                              ...prev,
                              [field.name]:
                                field.type === "number"
                                  ? e.target.value === ""
                                    ? ""
                                    : Number(e.target.value)
                                  : e.target.value,
                            }))
                          }
                          placeholder={
                            field.placeholder ||
                            (field.defaultValue !== undefined
                              ? String(field.defaultValue)
                              : `Enter ${field.label || field.name}`)
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                        />
                      )}
                      {(field.helpText || field.description) &&
                        field.type !== "boolean" && (
                          <p className="text-[11px] text-text-muted">
                            {field.helpText || field.description}
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Credential Update Section */}
          <div className="pt-3 border-t border-border space-y-3">
            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck className="w-4 h-4 text-success" />
                <div>
                  <p className="font-semibold text-text">
                    Stored Credentials ({authType})
                  </p>
                  <p className="text-text-muted text-[11px]">
                    Encrypted and masked in backend vault
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-primary font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUpdatingCredentials}
                  onChange={(e) => setIsUpdatingCredentials(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Update Credentials</span>
              </label>
            </div>

            {/* Controlled in-memory credential inputs */}
            {isUpdatingCredentials && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span>Enter New Credentials</span>
                </div>

                {(authType === "API_KEY" || authType === "NONE") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Header Name
                      </label>
                      <input
                        type="text"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                        placeholder="X-API-Key"
                        className="w-full px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        API Key Value
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets["apiKey"] ? "text" : "password"}
                          value={apiKeyValue}
                          onChange={(e) => setApiKeyValue(e.target.value)}
                          placeholder="New API Key..."
                          className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility("apiKey")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                          aria-label="Toggle visibility"
                        >
                          {showSecrets["apiKey"] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(authType === "BEARER_TOKEN" || authType === "OAUTH2") && (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      New Bearer / Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets["bearer"] ? "text" : "password"}
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                        placeholder="New Bearer Token..."
                        className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility("bearer")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        aria-label="Toggle visibility"
                      >
                        {showSecrets["bearer"] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {authType === "BASIC_AUTH" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={basicUsername}
                        onChange={(e) => setBasicUsername(e.target.value)}
                        placeholder="api_user"
                        className="w-full px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets["basic"] ? "text" : "password"}
                          value={basicPassword}
                          onChange={(e) => setBasicPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility("basic")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                          aria-label="Toggle visibility"
                        >
                          {showSecrets["basic"] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {authType === "WEBHOOK_SECRET" && (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      New Webhook Signing Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets["webhook"] ? "text" : "password"}
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="whsec_..."
                        className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility("webhook")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        aria-label="Toggle visibility"
                      >
                        {showSecrets["webhook"] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {extraSecretConfigFields.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-2.5">
                    <div className="text-[11px] font-semibold text-text-secondary">
                      Additional Secrets (leave blank to keep existing)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {extraSecretConfigFields.map((field) => {
                        const toggleKey = `edit_${field.name}`;
                        return (
                          <div key={field.name}>
                            <label className="block text-xs text-text-muted mb-1">
                              {field.label || field.name}
                            </label>
                            <div className="relative">
                              <input
                                type={showSecrets[toggleKey] ? "text" : "password"}
                                value={dynamicSecrets[field.name] || ""}
                                onChange={(e) =>
                                  setDynamicSecrets((prev) => ({
                                    ...prev,
                                    [field.name]: e.target.value,
                                  }))
                                }
                                placeholder="Leave blank to preserve existing..."
                                className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => toggleSecretVisibility(toggleKey)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                                aria-label={`Toggle ${field.label || field.name} visibility`}
                              >
                                {showSecrets[toggleKey] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !canConfigure}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
