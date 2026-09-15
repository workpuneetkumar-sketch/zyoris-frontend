import React, { useState, useEffect } from "react";
import {
  Connector,
  UpdateIntegrationPayload,
  SyncDirection,
  SyncFrequency,
  HttpMethod,
} from "@/types/integrations";
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

  // Sensitive credential update state - strictly in-memory
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (connector) {
      setDisplayName(
        connector.connectionState?.displayName || connector.name || ""
      );
      setSyncFrequency("HOURLY");
      setSyncDirection("BIDIRECTIONAL");
      setApiUrl(connector.configSchema?.endpoint?.defaultUrl || "");
      setHttpMethod(
        (connector.configSchema?.endpoint?.defaultMethod as HttpMethod) || "POST"
      );

      // Initialize default headers from schema if available
      if (connector.configSchema?.endpoint?.headers) {
        const schemaHeaders = Object.entries(
          connector.configSchema.endpoint.headers
        ).map(([k, v]) => ({ key: k, value: String(v) }));
        setHeaders(schemaHeaders);
      } else {
        setHeaders([]);
      }

      // Reset sensitive fields
      setIsUpdatingCredentials(false);
      setApiKeyName("X-API-Key");
      setApiKeyValue("");
      setBearerToken("");
      setBasicUsername("");
      setBasicPassword("");
      setWebhookSecret("");
      setShowSecrets({});
    }
  }, [connector, isOpen]);

  const handleClose = () => {
    // Clear sensitive state from memory immediately
    setApiKeyValue("");
    setBearerToken("");
    setBasicUsername("");
    setBasicPassword("");
    setWebhookSecret("");
    setShowSecrets({});
    setIsUpdatingCredentials(false);
    onClose();
  };

  if (!isOpen || !connector) return null;

  const targetId =
    connector.connectionId || connector.connectionState?.id || connector.id;
  const authType = (connector.authType || "API_KEY").toUpperCase();

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

    // Assemble headers
    const headerObject: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim() && h.value.trim()) {
        headerObject[h.key.trim()] = h.value.trim();
      }
    });

    // Construct PATCH payload safely
    const payload: UpdateIntegrationPayload = {
      displayName: displayName.trim(),
      syncFrequency,
      syncDirection,
      ...(apiUrl.trim() ? { apiUrl: apiUrl.trim() } : {}),
      ...(httpMethod ? { httpMethod } : {}),
      ...(Object.keys(headerObject).length > 0 ? { headers: headerObject } : {}),
    };

    // ONLY send credentials if the user intentionally checked "Update Stored Credentials"
    // and provided non-empty secret values. This guarantees we NEVER overwrite existing
    // vault credentials with blank values!
    if (isUpdatingCredentials) {
      const credentialsObj: Record<string, any> = {};

      if (authType === "API_KEY" && apiKeyValue.trim()) {
        credentialsObj.headerName = apiKeyName.trim() || "X-API-Key";
        credentialsObj.apiKey = apiKeyValue.trim();
      } else if (authType === "BEARER_TOKEN" && bearerToken.trim()) {
        credentialsObj.token = bearerToken.trim();
      } else if (authType === "BASIC_AUTH") {
        if (basicUsername.trim()) credentialsObj.username = basicUsername.trim();
        if (basicPassword.trim()) credentialsObj.password = basicPassword.trim();
      } else if (authType === "WEBHOOK_SECRET" && webhookSecret.trim()) {
        credentialsObj.secret = webhookSecret.trim();
      }

      if (Object.keys(credentialsObj).length > 0) {
        payload.credentials = credentialsObj;
      }
    }

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
