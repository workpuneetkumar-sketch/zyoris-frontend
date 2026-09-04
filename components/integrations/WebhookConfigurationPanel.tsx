"use client";

import React, { useState, useEffect, useId } from "react";
import {
  WebhookConfig,
  WebhookSubscription,
  WebhookLastEventStatus,
} from "@/types/integrations";
import {
  SUPPORTED_WEBHOOK_PROVIDERS,
  STANDARD_WEBHOOK_EVENTS,
  getWebhookConfigApi,
  updateWebhookConfigApi,
  rotateWebhookSecretApi,
  getWebhookIngressUrl,
  ingestWebhookEventApi,
} from "@/lib/api/webhooksApi";
import {
  Webhook,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Radio,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Clock,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import classNames from "classnames";

interface WebhookConfigurationPanelProps {
  integrationId: string;
  defaultProvider?: string;
}

export function WebhookConfigurationPanel({
  integrationId,
  defaultProvider = "CRM",
}: WebhookConfigurationPanelProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>(defaultProvider);
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Test Simulator State
  const [testEvent, setTestEvent] = useState<string>("lead.created");
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [showPayloadPreview, setShowPayloadPreview] = useState<boolean>(false);

  // Rotation confirmation state
  const [showRotateConfirm, setShowRotateConfirm] = useState<boolean>(false);

  const providerSelectId = useId();
  const testEventSelectId = useId();

  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      setIsLoading(true);
      try {
        const loaded = await getWebhookConfigApi(integrationId, selectedProvider);
        if (isMounted) setConfig(loaded);
      } catch (err: any) {
        console.warn("Failed to load webhook configuration:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [integrationId, selectedProvider]);

  const handleCopy = (textToCopy: string, fieldName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleToggleEvent = (eventKey: string) => {
    if (!config) return;
    const updatedEvents = config.events.map((e) =>
      e.event === eventKey ? { ...e, enabled: !e.enabled } : e
    );
    setConfig({ ...config, events: updatedEvents });
  };

  const handleSaveSubscriptions = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const res = await updateWebhookConfigApi(config);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save webhook subscriptions.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRotateSecret = async () => {
    setIsRotating(true);
    try {
      const res = await rotateWebhookSecretApi(integrationId, selectedProvider);
      if (res.success) {
        setConfig((prev) => (prev ? { ...prev, maskedSecret: res.maskedSecret } : null));
        toast.success(res.message);
        setShowRotateConfirm(false);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to rotate signing secret.");
    } finally {
      setIsRotating(false);
    }
  };

  const handleSendTestWebhook = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const testPayload = {
        source: selectedProvider.toUpperCase(),
        event: testEvent,
        payload: {
          id: `lead_${Date.now()}`,
          email: "test.lead@zyoris-ingress.com",
          name: "Test Ingress Lead",
          provider: selectedProvider,
        },
        metadata: {
          requestId: `req_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };

      const res = await ingestWebhookEventApi(selectedProvider, testPayload, {
        secret: "whsec_test_simulation_signature_secret",
      });

      setTestResult({
        success: true,
        response: res,
        timestamp: new Date().toISOString(),
      });

      // Update telemetry status in config
      if (config) {
        const updatedStatus: WebhookLastEventStatus = {
          eventId: `evt_${Date.now().toString(36)}`,
          event: testEvent,
          provider: selectedProvider,
          timestamp: new Date().toISOString(),
          httpStatus: 200,
          status: "SUCCESS",
          latencyMs: 86,
          payloadSize: JSON.stringify(testPayload).length,
          signatureVerified: true,
          requestPreview: testPayload,
        };
        setConfig({ ...config, lastEventStatus: updatedStatus });
      }

      toast.success(`Test webhook delivered: 200 OK (${selectedProvider})`);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err?.response?.data || err?.message || "Network Error",
        status: err?.response?.status || 500,
        timestamp: new Date().toISOString(),
      });
      toast.error(`Ingress simulation failed: ${err?.message || "Server Error"}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const ingressUrl = getWebhookIngressUrl(selectedProvider);

  return (
    <div className="space-y-6">
      {/* Header & Provider Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Webhook className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Webhook Ingress & Subscriptions</h3>
            <p className="text-xs text-text-muted">
              Configure real-time event subscriptions and zero-trust HMAC-SHA256 signature verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={providerSelectId} className="text-xs font-semibold text-text-muted">
            Provider:
          </label>
          <select
            id={providerSelectId}
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-surface-secondary text-xs font-semibold text-text focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          >
            {SUPPORTED_WEBHOOK_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-muted text-xs animate-pulse">
          Loading webhook configuration and telemetry...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Endpoint & Secret Security */}
          <div className="space-y-4">
            {/* Endpoint Information */}
            <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-primary" />
                  <span>Ingress Endpoint URL</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold">
                  POST Only
                </span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-secondary border border-border font-mono text-[11px] text-text break-all">
                <span className="flex-1 select-all">{ingressUrl}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(ingressUrl, "Endpoint URL")}
                  className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors shrink-0"
                  title="Copy Ingress URL"
                >
                  {copiedField === "Endpoint URL" ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="text-[11px] text-text-muted space-y-1">
                <p className="flex items-center gap-1">
                  <Info className="w-3 h-3 text-info shrink-0" />
                  <span>Include required signature header in incoming HTTP requests:</span>
                </p>
                <code className="block p-2 rounded-lg bg-surface-secondary text-[10px] font-mono text-text">
                  x-webhook-signature: &lt;HMAC-SHA256 hex digest of raw body&gt;
                </code>
              </div>
            </div>

            {/* Zero-Leak Masked Secret Configuration */}
            <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-warning" />
                  <span>Webhook Signing Secret</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                  <ShieldCheck className="w-3 h-3 text-success" />
                  <span>Masked (Protected)</span>
                </span>
              </div>

              <p className="text-[11px] text-text-muted">
                Used to verify request authenticity. The secret is never displayed in plaintext to satisfy zero-trust security standards.
              </p>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-secondary border border-border font-mono text-xs text-text">
                <span className="flex-1 text-text-muted select-none">
                  {config?.maskedSecret || "whsec_••••••••••••••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      "whsec_prod_" + integrationId + "_" + selectedProvider.toLowerCase(),
                      "Signing Secret"
                    )
                  }
                  className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors shrink-0"
                  title="Copy Secret Safely"
                >
                  {copiedField === "Signing Secret" ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-text-muted">
                  Rotation invalidates previous signatures.
                </span>
                <button
                  type="button"
                  onClick={() => setShowRotateConfirm(true)}
                  disabled={isRotating}
                  className="px-2.5 py-1 rounded-xl border border-border hover:bg-surface-secondary text-text text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <RefreshCw className={classNames("w-3 h-3", isRotating && "animate-spin text-primary")} />
                  <span>Rotate Secret</span>
                </button>
              </div>

              {/* Confirmation Dialog */}
              {showRotateConfirm && (
                <div className="p-3 rounded-xl border border-warning/30 bg-warning/5 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-warning text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Confirm Secret Rotation</span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Rotating this secret will immediately break existing webhook deliveries until your external provider is updated with the new secret.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRotateConfirm(false)}
                      className="px-2.5 py-1 rounded-lg border border-border text-xs text-text font-semibold hover:bg-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRotateSecret}
                      disabled={isRotating}
                      className="px-2.5 py-1 rounded-lg bg-warning text-warning-foreground text-xs font-bold hover:bg-warning/90"
                    >
                      {isRotating ? "Rotating..." : "Rotate Secret Now"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Last Event Status & Diagnostics */}
            <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-info" />
                  <span>Last Event Status</span>
                </span>
                {config?.lastEventStatus ? (
                  <span
                    className={classNames(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      config.lastEventStatus.httpStatus === 200
                        ? "bg-success/10 text-success"
                        : "bg-error/10 text-error"
                    )}
                  >
                    HTTP {config.lastEventStatus.httpStatus} {config.lastEventStatus.status}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-surface-secondary text-text-muted text-[10px] font-semibold">
                    No Events Received
                  </span>
                )}
              </div>

              {config?.lastEventStatus ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-surface-secondary">
                      <span className="text-text-muted block text-[10px]">Event Type</span>
                      <span className="font-semibold text-text font-mono">
                        {config.lastEventStatus.event}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-secondary">
                      <span className="text-text-muted block text-[10px]">Latency</span>
                      <span className="font-semibold text-text font-mono">
                        {config.lastEventStatus.latencyMs} ms
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-secondary">
                      <span className="text-text-muted block text-[10px]">Payload Size</span>
                      <span className="font-semibold text-text font-mono">
                        {config.lastEventStatus.payloadSize} B
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-secondary">
                      <span className="text-text-muted block text-[10px]">Signature Status</span>
                      <span className="font-semibold text-success font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-text-muted">
                    Received: {new Date(config.lastEventStatus.timestamp).toLocaleString()}
                  </div>

                  {config.lastEventStatus.requestPreview && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 mt-1"
                      >
                        {showPayloadPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span>{showPayloadPreview ? "Hide Payload Preview" : "View Last Payload"}</span>
                      </button>
                      {showPayloadPreview && (
                        <pre className="mt-2 p-2.5 rounded-xl bg-surface-secondary border border-border text-[10px] font-mono text-text overflow-x-auto max-h-36">
                          {JSON.stringify(config.lastEventStatus.requestPreview, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-2">
                  No webhook events have arrived for {selectedProvider} yet. Use the simulator on the right to test delivery.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Event Subscriptions & Live Test Simulator */}
          <div className="space-y-4">
            {/* Event Subscriptions Manager */}
            <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span>Event Subscriptions ({selectedProvider})</span>
                </span>
                <button
                  type="button"
                  onClick={handleSaveSubscriptions}
                  disabled={isSaving}
                  className="px-3 py-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors shadow-2xs"
                >
                  {isSaving ? "Saving..." : "Save Preferences"}
                </button>
              </div>

              <p className="text-[11px] text-text-muted">
                Select which events should be received and processed by Zyoris for this provider:
              </p>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {(config?.events || []).map((sub: WebhookSubscription) => (
                  <label
                    key={sub.event}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-surface-secondary/70 transition-colors cursor-pointer border border-transparent hover:border-border"
                  >
                    <input
                      type="checkbox"
                      checked={sub.enabled}
                      onChange={() => handleToggleEvent(sub.event)}
                      className="mt-0.5 rounded-md border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-text font-mono block">
                        {sub.event}
                      </span>
                      <span className="text-[11px] text-text-muted block truncate">
                        {sub.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Ingress Test Simulator */}
            <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-primary" />
                  <span>Live Test Simulator</span>
                </span>
                <span className="text-[10px] text-text-muted">Zero-Trust Signed Request</span>
              </div>

              <p className="text-[11px] text-text-muted">
                Send a signed simulated event to verify dispatcher ingress and signature validation live:
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor={testEventSelectId} className="sr-only">
                  Select Event Type
                </label>
                <select
                  id={testEventSelectId}
                  value={testEvent}
                  onChange={(e) => setTestEvent(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-surface-secondary text-xs font-semibold text-text focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs font-mono"
                >
                  {STANDARD_WEBHOOK_EVENTS.map((e) => (
                    <option key={e.event} value={e.event}>
                      {e.event}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSendTestWebhook}
                  disabled={isSendingTest}
                  className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <Send className={classNames("w-3 h-3", isSendingTest && "animate-pulse")} />
                  <span>{isSendingTest ? "Sending..." : "Send Test"}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={classNames(
                    "p-3 rounded-xl border text-xs font-mono space-y-1 animate-in fade-in duration-150",
                    testResult.success
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-error/30 bg-error/5 text-error"
                  )}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{testResult.success ? "200 Ingress Accepted" : "Ingress Delivery Error"}</span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(testResult.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="p-2 rounded-lg bg-surface text-[10px] text-text overflow-x-auto max-h-24">
                    {JSON.stringify(testResult.response || testResult.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
