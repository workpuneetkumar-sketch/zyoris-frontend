import React, { useState, useMemo } from "react";
import { Connector, ReconnectPayload } from "@/types/integrations";
import {
  extractConnectorConfigFields,
  isSecretConfigField,
  buildReconnectModalPayload,
} from "@/lib/utils/integrationContracts";
import {
  RefreshCw,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

interface ReconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onReconnect: (
    id: string,
    payload?: ReconnectPayload | Record<string, any>
  ) => Promise<any>;
  canManage?: boolean;
}

export function ReconnectModal({
  isOpen,
  onClose,
  connector,
  onReconnect,
  canManage = true,
}: ReconnectModalProps) {
  const [updateCredentials, setUpdateCredentials] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
  const [showSecret, setShowSecret] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const connectorConfigFields = useMemo(
    () => extractConnectorConfigFields(connector),
    [connector]
  );

  const nonSecretConfigFields = useMemo(
    () => connectorConfigFields.filter((f) => !isSecretConfigField(f)),
    [connectorConfigFields]
  );

  const secretConfigFields = useMemo(
    () => connectorConfigFields.filter((f) => isSecretConfigField(f)),
    [connectorConfigFields]
  );

  React.useEffect(() => {
    if (isOpen && connector) {
      setUpdateCredentials(false);
      setApiKey("");
      setApiSecret("");
      setAccessToken("");
      setPassword("");
      setWebhookSecret("");
      setShowSecret(false);

      const savedConfig =
        (connector.connectionState?.config as Record<string, any> | undefined) ||
        {};
      const seeded: Record<string, any> = {};
      for (const field of connectorConfigFields) {
        if (isSecretConfigField(field)) continue;
        const val = savedConfig[field.name];
        if (val !== undefined && val !== null && val !== "") {
          seeded[field.name] = val;
        } else if (field.defaultValue !== undefined) {
          seeded[field.name] = field.defaultValue;
        }
      }
      setDynamicFields(seeded);
    }
  }, [isOpen, connector, connectorConfigFields]);

  const handleClose = () => {
    setApiKey("");
    setApiSecret("");
    setAccessToken("");
    setPassword("");
    setWebhookSecret("");
    setDynamicFields({});
    setShowSecret(false);
    setUpdateCredentials(false);
    onClose();
  };

  if (!isOpen || !connector) return null;

  const targetId =
    connector.connectionId || connector.connectionState?.id || connector.id;
  const authType = (connector.authType || "API_KEY").toUpperCase();
  const requiresApiSecret = secretConfigFields.some(
    (f) => f.name === "apiSecret"
  );
  const supportsExtraWebhookSecret =
    authType !== "WEBHOOK_SECRET" &&
    secretConfigFields.some((f) => f.name === "webhookSecret");

  const handleReconnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetId) {
      toast.error("Missing integration instance ID.");
      return;
    }

    if (!canManage) {
      toast.error("Permission denied. Manage integration permission required.");
      return;
    }

    for (const field of nonSecretConfigFields) {
      if (!field.required) continue;
      const val = dynamicFields[field.name];
      if (val === undefined || val === null || String(val).trim() === "") {
        toast.error(
          `Please complete required field: ${field.label || field.name}`
        );
        return;
      }
    }

    const payload = buildReconnectModalPayload({
      updateCredentials,
      authType,
      apiKey,
      apiSecret,
      accessToken,
      password,
      webhookSecret,
      dynamicFields,
    });

    setIsReconnecting(true);
    try {
      const res = await onReconnect(targetId, payload);
      if (res?.authorizationUrl) {
        toast.info(`Redirecting to ${connector.name} for re-authorization...`);
        window.location.href = res.authorizationUrl;
        return;
      }
      toast.success(
        res?.message || `Reconnected ${connector.name} successfully.`
      );
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to reconnect ${connector.name}.`;
      toast.error(msg);
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Reconnect Integration
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

        {/* Content */}
        <form onSubmit={handleReconnectSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="p-3.5 rounded-xl bg-surface-secondary/40 border border-border text-xs text-text-secondary space-y-2">
            <div className="flex items-center gap-2 text-text font-medium">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span>Encrypted Vault Verification</span>
            </div>
            <p className="leading-relaxed">
              Reconnecting tests the connection pipeline and resets any active error counts. You can either re-verify existing encrypted vault credentials or provide fresh credentials below.
            </p>
          </div>

          {nonSecretConfigFields.length > 0 && (
            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>{connector.name} Settings</span>
              </div>
              {nonSecretConfigFields.map((field) => {
                const val =
                  dynamicFields[field.name] ?? field.defaultValue ?? "";
                const inputId = `reconnect-dyn-${field.name}`;
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
                  </div>
                );
              })}
            </div>
          )}

          {/* Toggle to update credentials */}
          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateCredentials}
                onChange={(e) => setUpdateCredentials(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Provide updated credentials for reconnect</span>
            </label>
          </div>

          {/* Conditional Credential Inputs */}
          {updateCredentials && (
            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                <span>New Credential ({authType})</span>
              </div>

              {(authType === "API_KEY" || authType === "NONE") && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter new API key..."
                      className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      aria-label="Toggle secret"
                    >
                      {showSecret ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {(authType === "BEARER_TOKEN" || authType === "OAUTH2") && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    Access / Bearer Token
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Enter new token..."
                      className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      aria-label="Toggle secret"
                    >
                      {showSecret ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {authType === "BASIC_AUTH" && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    Password / Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password..."
                      className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      aria-label="Toggle secret"
                    >
                      {showSecret ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {authType === "WEBHOOK_SECRET" && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    Webhook Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Enter new webhook secret..."
                      className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                      aria-label="Toggle secret"
                    >
                      {showSecret ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {requiresApiSecret && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    API Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Leave blank to keep existing API secret..."
                      className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {supportsExtraWebhookSecret && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    Webhook Secret (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Leave blank to keep existing webhook secret..."
                      className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isReconnecting}
              className="px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReconnecting || !canManage}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isReconnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Reconnecting...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Confirm Reconnect</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
