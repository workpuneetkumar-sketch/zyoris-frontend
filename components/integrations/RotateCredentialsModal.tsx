import React, { useState } from "react";
import {
  Connector,
  RotateCredentialsPayload,
  RotateCredentialsResponse,
} from "@/types/integrations";
import {
  KeyRound,
  X,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface RotateCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onRotate: (
    id: string,
    payload: RotateCredentialsPayload
  ) => Promise<RotateCredentialsResponse>;
  canConfigure?: boolean;
}

export function RotateCredentialsModal({
  isOpen,
  onClose,
  connector,
  onRotate,
  canConfigure = true,
}: RotateCredentialsModalProps) {
  // Sensitive form state - strictly in-memory only
  const [authType, setAuthType] = useState<string>("API_KEY");
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [password, setPassword] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [customSecrets, setCustomSecrets] = useState<
    Array<{ key: string; value: string }>
  >([]);

  // UI state
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isRotating, setIsRotating] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Initialize auth type from connector when modal opens
  React.useEffect(() => {
    if (connector) {
      const detected = (connector.authType || "API_KEY").toUpperCase();
      setAuthType(detected);
      // Reset form state
      setApiKey("");
      setAccessToken("");
      setRefreshToken("");
      setTokenExpiresAt("");
      setClientSecret("");
      setPassword("");
      setWebhookSecret("");
      setCustomSecrets([]);
      setShowSecrets({});
      setHasConfirmed(false);
    }
  }, [connector, isOpen]);

  // Clean up in-memory secrets on unmount/close
  const handleClose = () => {
    setApiKey("");
    setAccessToken("");
    setRefreshToken("");
    setTokenExpiresAt("");
    setClientSecret("");
    setPassword("");
    setWebhookSecret("");
    setCustomSecrets([]);
    setShowSecrets({});
    setHasConfirmed(false);
    onClose();
  };

  if (!isOpen || !connector) return null;

  const targetId =
    connector.connectionId || connector.connectionState?.id || connector.id;

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddCustomSecret = () => {
    setCustomSecrets((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveCustomSecret = (index: number) => {
    setCustomSecrets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomSecretChange = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    setCustomSecrets((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetId) {
      toast.error("Invalid integration instance. Target ID is missing.");
      return;
    }

    if (!canConfigure) {
      toast.error("Permission denied. You require configure privileges.");
      return;
    }

    if (!hasConfirmed) {
      toast.error("Please confirm that you understand the credential rotation implications.");
      return;
    }

    // Build rotation payload containing ONLY explicitly provided secrets
    const payload: RotateCredentialsPayload = {};

    if (apiKey.trim()) payload.apiKey = apiKey.trim();
    if (accessToken.trim()) payload.accessToken = accessToken.trim();
    if (refreshToken.trim()) payload.refreshToken = refreshToken.trim();
    if (tokenExpiresAt.trim()) payload.tokenExpiresAt = tokenExpiresAt.trim();
    if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();
    if (password.trim()) payload.password = password.trim();
    if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();

    if (customSecrets.length > 0) {
      const customObj: Record<string, any> = {};
      customSecrets.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          customObj[s.key.trim()] = s.value.trim();
        }
      });
      if (Object.keys(customObj).length > 0) {
        payload.customSecrets = customObj;
      }
    }

    // Ensure at least one credential is provided
    if (Object.keys(payload).length === 0) {
      toast.error("Please enter at least one new credential value to rotate.");
      return;
    }

    setIsRotating(true);
    try {
      const res = await onRotate(targetId, payload);
      toast.success(
        res?.message || `Credentials rotated successfully for ${connector.name}.`
      );
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to rotate credentials. Please verify your input.";
      toast.error(msg);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Rotate Credentials
              </h3>
              <p className="text-xs text-text-muted">
                {connector.name} &bull; Instance: {targetId?.substring(0, 12)}...
              </p>
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

        {/* Warning Banner */}
        <div className="p-4 bg-warning/10 border-b border-warning/20 text-warning text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-semibold">Security & Invalidation Notice</p>
            <p className="mt-0.5 text-warning/90">
              Rotating credentials will immediately invalidate and replace the existing vault credentials for this integration. Active background syncs will immediately switch to the new credentials upon encryption.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {/* Current Vault Status Indicator */}
          <div className="p-3 rounded-xl border border-border bg-surface-secondary/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span>Current Vault State:</span>
            </div>
            <span className="font-semibold text-text px-2 py-0.5 rounded bg-surface border border-border">
              Credentials Encrypted at Rest
            </span>
          </div>

          {/* Auth Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
              Target Authentication Type
            </label>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
            >
              <option value="API_KEY">API Key</option>
              <option value="BEARER_TOKEN">Bearer / Access Token</option>
              <option value="BASIC_AUTH">Basic Auth (Password / Secret)</option>
              <option value="OAUTH2">OAuth 2.0 Credentials (Client Secret / Token)</option>
              <option value="WEBHOOK_SECRET">Webhook Secret</option>
              <option value="CUSTOM">Custom Secrets</option>
            </select>
          </div>

          {/* Credential Fields according to Auth Type */}
          {(authType === "API_KEY" || authType === "CUSTOM") && (
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                New API Key *
              </label>
              <div className="relative">
                <input
                  type={showSecrets["apiKey"] ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter new API key..."
                  className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("apiKey")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  aria-label="Toggle visibility"
                >
                  {showSecrets["apiKey"] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {(authType === "BEARER_TOKEN" || authType === "OAUTH2") && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  New Access Token / Bearer Token
                </label>
                <div className="relative">
                  <input
                    type={showSecrets["accessToken"] ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("accessToken")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                    aria-label="Toggle visibility"
                  >
                    {showSecrets["accessToken"] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  New Refresh Token (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showSecrets["refreshToken"] ? "text" : "password"}
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    placeholder="rt_..."
                    className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("refreshToken")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                    aria-label="Toggle visibility"
                  >
                    {showSecrets["refreshToken"] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  Token Expiration (Optional ISO Date)
                </label>
                <input
                  type="datetime-local"
                  value={tokenExpiresAt}
                  onChange={(e) => setTokenExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {authType === "OAUTH2" && (
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                New OAuth Client Secret (Optional)
              </label>
              <div className="relative">
                <input
                  type={showSecrets["clientSecret"] ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="cs_..."
                  className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("clientSecret")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  aria-label="Toggle visibility"
                >
                  {showSecrets["clientSecret"] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {authType === "BASIC_AUTH" && (
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                New Password / Secret *
              </label>
              <div className="relative">
                <input
                  type={showSecrets["password"] ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("password")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  aria-label="Toggle visibility"
                >
                  {showSecrets["password"] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {authType === "WEBHOOK_SECRET" && (
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                New Webhook Signing Secret *
              </label>
              <div className="relative">
                <input
                  type={showSecrets["webhookSecret"] ? "text" : "password"}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("webhookSecret")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  aria-label="Toggle visibility"
                >
                  {showSecrets["webhookSecret"] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Custom Secrets Array */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text uppercase tracking-wider">
                Additional Custom Secrets (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddCustomSecret}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Secret</span>
              </button>
            </div>

            {customSecrets.map((secret, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={secret.key}
                  onChange={(e) =>
                    handleCustomSecretChange(idx, "key", e.target.value)
                  }
                  placeholder="Secret Key Name"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                />
                <input
                  type="password"
                  value={secret.value}
                  onChange={(e) =>
                    handleCustomSecretChange(idx, "value", e.target.value)
                  }
                  placeholder="Secret Value"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCustomSecret(idx)}
                  className="p-1.5 text-text-muted hover:text-error hover:bg-surface-hover rounded-lg transition-colors"
                  aria-label="Remove secret"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Explicit Confirmation Checkbox */}
          <div className="pt-3 border-t border-border">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-text select-none">
              <input
                type="checkbox"
                checked={hasConfirmed}
                onChange={(e) => setHasConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="leading-relaxed text-text-secondary">
                I understand that rotating credentials will immediately revoke the existing credentials and update all live synchronization jobs.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isRotating}
              className="px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRotating || !hasConfirmed || !canConfigure}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRotating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encrypting & Rotating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm Rotation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
