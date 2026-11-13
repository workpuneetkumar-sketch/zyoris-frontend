"use client";

import React, { useState, useEffect, useId } from "react";
import {
  Connector,
  ConnectorSchemaField,
  OAuthConnectResponse,
} from "@/types/integrations";
import { getOAuthPreAuthFields } from "@/lib/utils/integrationContracts";
import { X, Zap, ExternalLink, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface OAuthPreConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onInitiateOAuth: (
    provider: string,
    payload?: Record<string, any>
  ) => Promise<OAuthConnectResponse>;
}

export function OAuthPreConnectModal({
  isOpen,
  onClose,
  connector,
  onInitiateOAuth,
}: OAuthPreConnectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const titleId = useId();

  const preAuthFields: ConnectorSchemaField[] = React.useMemo(() => {
    return getOAuthPreAuthFields(connector);
  }, [connector]);

  // Seed default values when modal opens or connector changes
  useEffect(() => {
    if (isOpen && connector) {
      setIsSubmitting(false);
      setValidationErrors({});

      const initial: Record<string, any> = {};
      const savedConfig =
        (connector.connectionState?.config as Record<string, any> | undefined) || {};

      for (const field of preAuthFields) {
        const savedVal = savedConfig[field.name];
        if (savedVal !== undefined && savedVal !== null && savedVal !== "") {
          initial[field.name] = savedVal;
        } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
          initial[field.name] = field.defaultValue;
        } else if (field.type === "select" && field.options && field.options.length > 0) {
          initial[field.name] = field.options[0].value;
        } else {
          initial[field.name] = "";
        }
      }
      setDynamicFields(initial);
    }
  }, [isOpen, connector, preAuthFields]);

  if (!isOpen || !connector) return null;

  const handleFieldChange = (name: string, value: any) => {
    setDynamicFields((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    for (const field of preAuthFields) {
      if (field.required) {
        const val = dynamicFields[field.name];
        if (val === undefined || val === null || String(val).trim() === "") {
          errors[field.name] = `${field.label || field.name} is required.`;
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuthorize = async () => {
    if (isSubmitting) return;

    if (!validate()) {
      toast.error("Please complete all required fields before connecting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: `${connector.name} Integration`,
        config: { ...dynamicFields },
      };

      // Lift shopDomain / shop for Shopify compatibility
      if (dynamicFields.shopDomain) {
        payload.shop = String(dynamicFields.shopDomain).trim();
      }
      if (dynamicFields.dataCenter) {
        payload.dataCenter = String(dynamicFields.dataCenter).trim();
      }
      if (dynamicFields.environment) {
        payload.environment = String(dynamicFields.environment).trim();
      }

      const res = await onInitiateOAuth(connector.provider, payload);
      const authUrl =
        res?.authorizationUrl ||
        res?.authUrl ||
        res?.url ||
        (res as any)?.redirectUrl ||
        (res as any)?.data?.authorizationUrl;

      if (!authUrl) {
        throw new Error(`No authorization URL returned by ${connector.name} connector.`);
      }

      toast.info(`Redirecting to ${connector.name} for authorization...`);
      window.location.href = authUrl;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to initiate OAuth authorization for ${connector.name}.`;
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border p-2 flex items-center justify-center text-primary font-bold overflow-hidden flex-shrink-0">
              {connector.iconUrl || connector.logoUrl ? (
                <img
                  src={connector.iconUrl || connector.logoUrl}
                  alt={connector.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>{(connector.name || "CO").substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3 id={titleId} className="text-base font-bold text-text">
                Connect {connector.name}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                OAuth 2.0 Authorization Setup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>Provider-Managed OAuth 2.0</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              You will be securely redirected to {connector.name} to sign in and authorize permissions. No API credentials or passwords need to be entered manually.
            </p>
          </div>

          {preAuthFields.length > 0 && (
            <div className="space-y-3 pt-1">
              {preAuthFields.map((field) => {
                const val = dynamicFields[field.name] ?? "";
                const hasError = Boolean(validationErrors[field.name]);

                return (
                  <div key={field.name} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text">
                      {field.label || field.name}
                      {field.required && <span className="text-error ml-1">*</span>}
                    </label>

                    {field.type === "select" && field.options && field.options.length > 0 ? (
                      <select
                        value={String(val)}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 rounded-lg bg-surface text-text text-xs border focus:border-primary focus:outline-hidden transition-colors ${
                          hasError ? "border-error" : "border-border"
                        }`}
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label || opt.value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                        value={String(val)}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={isSubmitting}
                        placeholder={
                          field.placeholder ||
                          (field.defaultValue !== undefined
                            ? String(field.defaultValue)
                            : `Enter ${field.label || field.name}`)
                        }
                        className={`w-full px-3 py-2 rounded-lg bg-surface text-text text-xs border focus:border-primary focus:outline-hidden font-mono transition-colors ${
                          hasError ? "border-error" : "border-border"
                        }`}
                      />
                    )}

                    {hasError ? (
                      <p className="text-[11px] text-error flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors[field.name]}</span>
                      </p>
                    ) : field.description ? (
                      <p className="text-[11px] text-text-muted">{field.description}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-2.5 bg-surface-secondary/40 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAuthorize}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Authorize on {connector.name}</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

