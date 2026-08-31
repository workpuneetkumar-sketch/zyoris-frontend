import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Connector,
  AuthType,
  SyncDirection,
  SyncFrequency,
  HttpMethod,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
  TestConnectionResponse,
  NormalizedConnectionTestResult,
} from "@/types/integrations";
import { AsyncRequestError, useAsyncRequest } from "@/hooks/useAsyncRequest";
import {
  normalizeConnectionError,
  normalizeConnectionSuccess,
} from "@/lib/api/connectionTest";
import { ConnectionTestResult } from "./ConnectionTestResult";
import {
  X,
  Zap,
  ShieldCheck,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Globe,
  Lock,
  Sparkles,
  Database,
  RefreshCw,
  Clock,
  Activity,
  Layers,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { WizardProgress } from "./wizard/WizardProgress";
import { WizardFooter } from "./wizard/WizardFooter";
import { integrationWizardSteps } from "./wizard/wizardSteps";
import {
  DEFAULT_REST_CONFIGURATION,
  REST_CONTENT_TYPES,
  parseRequestBody,
} from "./wizard/restConfiguration";

interface IntegrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  availableConnectors: Connector[];
  onSubmit: (payload: CreateIntegrationPayload) => Promise<any>;
  onTestConnection?: (
    id: string,
    payload?: Record<string, any>
  ) => Promise<TestConnectionResponse>;
  onOAuthConnect: (provider: string, payload?: Record<string, any>) => Promise<any>;
  onUpdateIntegration?: (id: string, payload: UpdateIntegrationPayload) => Promise<any>;
  onFetchSchema?: (id: string) => Promise<any>;
  onDiscoverSchema?: (id: string, payload?: any) => Promise<any>;
  onGetMapping?: (id: string) => Promise<any>;
  onSaveMapping?: (id: string, payload: any) => Promise<any>;
  onViewSchema?: (connector: Connector) => void;
}

// Zod Validation Schema
const integrationFormSchema = z.object({
  displayName: z
    .string()
    .min(2, "Integration name must be at least 2 characters")
    .max(80, "Integration name is too long"),
  targetModule: z.string().min(1, "Please select a target module / entity"),
  targetEntity: z.string().optional(),
  apiUrl: z
    .string()
    .min(1, "API URL is required")
    .refine(
      (val) => {
        try {
          const url = new URL(val);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid HTTP/HTTPS URL" }
    ),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"] as const),
  authType: z.enum([
    "OAUTH2",
    "API_KEY",
    "BEARER_TOKEN",
    "BASIC_AUTH",
    "WEBHOOK_SECRET",
    "NONE",
  ] as const),
  // Auth specific credentials
  apiKeyName: z.string().optional(),
  apiKeyValue: z.string().optional(),
  bearerToken: z.string().optional(),
  basicUsername: z.string().optional(),
  basicPassword: z.string().optional(),
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
  oauthScopes: z.string().optional(),
  webhookSecret: z.string().optional(),
  // Sync config
  syncDirection: z.enum(["INBOUND", "OUTBOUND", "BIDIRECTIONAL"] as const),
  syncFrequency: z.enum([
    "REALTIME",
    "HOURLY",
    "EVERY_6_HOURS",
    "DAILY",
    "WEEKLY",
    "MANUAL",
  ] as const),
  // Custom headers
  headers: z
    .array(
      z.object({
        key: z.string().min(1, "Header name required"),
        value: z.string().min(1, "Header value required"),
      })
    )
    .optional(),
  contentType: z.enum(REST_CONTENT_TYPES),
  queryParams: z
    .array(
      z.object({
        key: z.string().min(1, "Parameter name required"),
        value: z.string().min(1, "Parameter value required"),
      })
    )
    .optional(),
  requestBody: z.string().refine(
    (value) => {
      try {
        parseRequestBody(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Request body must contain valid JSON" }
  ),
  // Additional dynamic config
  dynamicFields: z.record(z.string(), z.any()).optional(),
});

type FormValues = z.infer<typeof integrationFormSchema>;

const AVAILABLE_MODULES = [
  { id: "leads", label: "Leads (CRM)", entity: "Lead" },
  { id: "deals", label: "Deals / Pipeline (CRM)", entity: "Deal" },
  { id: "contacts", label: "Contacts (CRM)", entity: "Contact" },
  { id: "companies", label: "Companies (CRM)", entity: "Company" },
  { id: "finance", label: "Invoices & Payments (Finance)", entity: "Invoice" },
  { id: "hr", label: "Employees & Attendance (HR)", entity: "Employee" },
  { id: "tasks", label: "Tasks & Workflows", entity: "Task" },
  { id: "communications", label: "Communications (Email/Chat)", entity: "Message" },
  { id: "projects", label: "Projects & Boards", entity: "Project" },
  { id: "custom", label: "Custom Entity", entity: "CustomRecord" },
];

export function IntegrationWizardModal({
  isOpen,
  onClose,
  connector: initialConnector,
  availableConnectors,
  onSubmit,
  onTestConnection,
  onOAuthConnect,
  onUpdateIntegration,
  onFetchSchema,
  onDiscoverSchema,
  onGetMapping,
  onSaveMapping,
  onViewSchema,
}: IntegrationWizardModalProps) {
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    initialConnector
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Connection Test & Schema Discovery state
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);
  const connectionTest = useAsyncRequest<NormalizedConnectionTestResult>();
  const connectionTestStatus = connectionTest.status;
  const resetConnectionTest = connectionTest.reset;
  const isTesting = connectionTest.status === "loading";
  const [isSchemaUnlocked, setIsSchemaUnlocked] = useState(false);

  useEffect(() => {
    setSelectedConnector(initialConnector);
    if (initialConnector) {
      const existingId =
        initialConnector.connectionId ||
        initialConnector.connectionState?.id ||
        (initialConnector.isConnected ? initialConnector.id : null);
      setActiveIntegrationId(existingId);
      setStep(2); // Jump straight to configuration if a connector was clicked directly
    } else {
      setActiveIntegrationId(null);
      setStep(1); // Select connector first if opened without pre-selection
    }
    resetConnectionTest();
    setIsSchemaUnlocked(false);
  }, [initialConnector, isOpen, resetConnectionTest]);

  const defaultValues: Partial<FormValues> = {
    displayName: selectedConnector ? `${selectedConnector.name} Integration` : "",
    targetModule: "leads",
    targetEntity: "Lead",
    // API URL: Use connector's configured default if available, otherwise require user input
    apiUrl: selectedConnector?.configSchema?.endpoint?.defaultUrl || "",
    httpMethod:
      (selectedConnector?.configSchema?.endpoint?.defaultMethod as HttpMethod) ||
      "POST",
    authType:
      (selectedConnector?.authType as AuthType) ||
      (selectedConnector?.supportedAuthTypes?.[0] as AuthType) ||
      "API_KEY",
    apiKeyName: "X-API-Key",
    apiKeyValue: "",
    bearerToken: "",
    basicUsername: "",
    basicPassword: "",
    oauthClientId: "",
    oauthClientSecret: "",
    oauthScopes: "read, write",
    webhookSecret: "",
    syncDirection: "BIDIRECTIONAL",
    syncFrequency: "HOURLY",
    headers: [],
    contentType: DEFAULT_REST_CONFIGURATION.contentType,
    queryParams: DEFAULT_REST_CONFIGURATION.queryParams,
    requestBody: DEFAULT_REST_CONFIGURATION.requestBody,
    dynamicFields: {},
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const testResult: NormalizedConnectionTestResult | null =
    connectionTest.data ||
    (connectionTest.error instanceof AsyncRequestError
      ? (connectionTest.error.data as NormalizedConnectionTestResult)
      : connectionTest.error
      ? normalizeConnectionError(connectionTest.error, undefined)
      : null);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "headers",
  });
  const {
    fields: queryParamFields,
    append: appendQueryParam,
    remove: removeQueryParam,
  } = useFieldArray({
    control,
    name: "queryParams",
  });

  // Keep form values updated when selected connector changes
  useEffect(() => {
    if (selectedConnector) {
      setValue("displayName", `${selectedConnector.name} Integration`);
      if (selectedConnector.configSchema?.endpoint?.defaultUrl) {
        setValue("apiUrl", selectedConnector.configSchema.endpoint.defaultUrl);
      }
      if (selectedConnector.authType) {
        setValue("authType", selectedConnector.authType as AuthType);
      }
      const existingId =
        selectedConnector.connectionId ||
        selectedConnector.connectionState?.id ||
        (selectedConnector.isConnected ? selectedConnector.id : null);
      setActiveIntegrationId(existingId);
    }
  }, [selectedConnector, setValue]);

  // Invalidate previous test result when sensitive credentials/endpoint change in step 2 or 3
  const watchedApiUrl = watch("apiUrl");
  const watchedHttpMethod = watch("httpMethod");
  const watchedAuthType = watch("authType");
  const watchedApiKeyValue = watch("apiKeyValue");
  const watchedBearerToken = watch("bearerToken");
  const watchedBasicPassword = watch("basicPassword");
  const watchedWebhookSecret = watch("webhookSecret");

  useEffect(() => {
    if (step < 4 && connectionTestStatus !== "idle") {
      resetConnectionTest();
      setIsSchemaUnlocked(false);
    }
  }, [
    step,
    connectionTestStatus,
    resetConnectionTest,
    watchedApiUrl,
    watchedHttpMethod,
    watchedAuthType,
    watchedApiKeyValue,
    watchedBearerToken,
    watchedBasicPassword,
    watchedWebhookSecret,
  ]);

  // Clear auth credentials when auth type changes to prevent old secrets from being submitted
  const previousAuthTypeRef = React.useRef<AuthType | undefined>();
  useEffect(() => {
    const currentAuthType = watch("authType");
    
    // Only clear when explicitly changing auth type (not on initial load)
    if (previousAuthTypeRef.current !== undefined && previousAuthTypeRef.current !== currentAuthType) {
      // Clear all auth-specific fields when switching auth type
      setValue("apiKeyName", "");
      setValue("apiKeyValue", "");
      setValue("bearerToken", "");
      setValue("basicUsername", "");
      setValue("basicPassword", "");
      setValue("oauthClientId", "");
      setValue("oauthClientSecret", "");
      setValue("oauthScopes", "");
      setValue("webhookSecret", "");

      // Reset to defaults for new auth type
      if (currentAuthType === "API_KEY") {
        setValue("apiKeyName", "X-API-Key");
      }
      if (currentAuthType === "OAUTH2") {
        setValue("oauthScopes", "read, write");
      }
    }
    
    previousAuthTypeRef.current = currentAuthType;
  }, [watchedAuthType, watch, setValue]);

  if (!isOpen) return null;

  const currentAuthType = watch("authType");
  const currentTargetModule = watch("targetModule");
  const currentHttpMethod = watch("httpMethod");
  const supportsRequestBody = ["POST", "PUT", "PATCH"].includes(
    currentHttpMethod
  );

  const getVerifiedExistingIntegrationId = (
    connector: Connector | null,
    payload?: CreateIntegrationPayload
  ): string | null => {
    if (!connector || !payload) return null;

    const connectorMatchesById =
      !!connector.id &&
      !!payload.connectorId &&
      connector.id.toLowerCase() === payload.connectorId.toLowerCase();

    const connectorMatchesByProvider =
      !!connector.provider &&
      !!payload.provider &&
      connector.provider.toLowerCase() === payload.provider.toLowerCase();

    if (!connectorMatchesById && !connectorMatchesByProvider) {
      return null;
    }

    return (
      connector.connectionId ||
      connector.connectionState?.id ||
      (connector.isConnected ? connector.id : null)
    );
  };

  const buildPayload = (data: FormValues): CreateIntegrationPayload => {
    const connector = selectedConnector || initialConnector || {
      id: "custom",
      provider: "custom",
      name: data.displayName || "Custom Integration",
    };

    const credentials: Record<string, any> = {};
    if (data.authType === "API_KEY") {
      credentials.headerName = data.apiKeyName || "X-API-Key";
      credentials.apiKey = data.apiKeyValue;
    } else if (data.authType === "BEARER_TOKEN") {
      credentials.token = data.bearerToken;
    } else if (data.authType === "BASIC_AUTH") {
      credentials.username = data.basicUsername;
      credentials.password = data.basicPassword;
    } else if (data.authType === "WEBHOOK_SECRET") {
      credentials.secret = data.webhookSecret;
    }

    const headers: Record<string, string> = {};
    data.headers?.forEach((header) => {
      if (header.key.trim() && header.value.trim()) {
        headers[header.key.trim()] = header.value.trim();
      }
    });

    return {
      connectorId: connector.id,
      provider: connector.provider,
      name: data.displayName,
      displayName: data.displayName,
      targetModule: data.targetModule,
      targetEntity: data.targetEntity,
      apiUrl: data.apiUrl,
      httpMethod: data.httpMethod,
      authType: data.authType,
      credentials,
      syncDirection: data.syncDirection,
      syncFrequency: data.syncFrequency,
      headers,
      config: {
        ...(data.dynamicFields || {}),
        contentType: data.contentType,
        queryParams: data.queryParams?.filter(
          (param) => param.key.trim() && param.value.trim()
        ),
        requestBody: parseRequestBody(data.requestBody),
      },
    };
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modId = e.target.value;
    setValue("targetModule", modId);
    const mod = AVAILABLE_MODULES.find((m) => m.id === modId);
    if (mod) {
      setValue("targetEntity", mod.entity);
    }
  };

  // Helper to extract integration database ID from various API response shapes
  const extractIntegrationId = (target: any): string | null => {
    if (!target) return null;
    if (typeof target === "string" && target.trim().length > 3) return target.trim();
    if (typeof target !== "object") return null;

    if (typeof target.id === "string" && target.id.trim()) return target.id.trim();
    if (typeof target._id === "string" && target._id.trim()) return target._id.trim();
    if (typeof target.integrationId === "string" && target.integrationId.trim()) return target.integrationId.trim();
    if (typeof target.connectionId === "string" && target.connectionId.trim()) return target.connectionId.trim();

    if (target.data) {
      const fromData = extractIntegrationId(target.data);
      if (fromData) return fromData;
    }
    if (target.integration) {
      const fromIntegration = extractIntegrationId(target.integration);
      if (fromIntegration) return fromIntegration;
    }
    if (target.result) {
      const fromResult = extractIntegrationId(target.result);
      if (fromResult) return fromResult;
    }
    if (Array.isArray(target) && target.length > 0) {
      const fromArray = extractIntegrationId(target[0]);
      if (fromArray) return fromArray;
    }
    return null;
  };

  // Real connection test handler for the integration test endpoint.
  const handleTestConnection = async () => {
    if (isTesting) return; // Prevent duplicate requests

    const values = watch();
    if (!values.apiUrl) {
      toast.error("Please enter a valid API URL before testing connectivity.");
      return;
    }

    const startTime = performance.now();

    try {
      const result = await connectionTest.execute(async () => {
        const payload = buildPayload(values);
        const verifiedExistingTargetId = getVerifiedExistingIntegrationId(
          selectedConnector,
          payload
        );

        let currentTargetId = activeIntegrationId || verifiedExistingTargetId || null;

        // For a brand-new integration, the test must use the newly-created ID from
        // the successful POST /api/integrations response. Any stale connector
        // connectionId from a different provider must not override that fresh ID.
        if (!currentTargetId && onSubmit) {
          try {
            const created = await onSubmit(payload);
            const createdId = extractIntegrationId(created);
            if (createdId) {
              currentTargetId = createdId;
              setActiveIntegrationId(createdId);
            }
          } catch (createErr: any) {
            const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
            const normalized = normalizeConnectionError(createErr, latencyMs);
            throw new AsyncRequestError(
              normalized,
              normalized.message || "Failed to establish integration target."
            );
          }
        }

        // If active integration was already created and user edited fields before re-testing, sync configuration
        if (activeIntegrationId && onUpdateIntegration) {
          try {
            await onUpdateIntegration(activeIntegrationId, {
              displayName: payload.displayName,
              apiUrl: payload.apiUrl,
              httpMethod: payload.httpMethod,
              credentials: payload.credentials,
              headers: payload.headers,
              config: payload.config,
              syncDirection: payload.syncDirection,
              syncFrequency: payload.syncFrequency,
            });
          } catch (updateErr) {
            // Non-fatal, continue with payload in test request
            console.warn("Failed to sync updated configuration before test:", updateErr);
          }
        }

        if (!currentTargetId) {
          throw new Error(
            "An integration instance could not be established for your organization. Please verify your configuration."
          );
        }

        if (!onTestConnection) {
          throw new Error("Test connection service is currently unavailable.");
        }

        try {
          const response = await onTestConnection(currentTargetId, payload);
          const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

          if (response.success) {
            const normalized = normalizeConnectionSuccess(response, latencyMs);
            return normalized;
          } else {
            const normalized = normalizeConnectionError(
              {
                response: {
                  status: response.statusCode || response.httpStatus || 400,
                  data: response,
                },
              },
              latencyMs
            );
            throw new AsyncRequestError(
              normalized,
              normalized.message || response.message || "Connection test failed."
            );
          }
        } catch (apiErr) {
          if (apiErr instanceof AsyncRequestError) {
            throw apiErr;
          }
          const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
          const normalized = normalizeConnectionError(apiErr, latencyMs);
          throw new AsyncRequestError(
            normalized,
            normalized.message || "Connection test failed."
          );
        }
      });

      if (!result) return;
      setIsSchemaUnlocked(true);
      toast.success("Connection test passed!");
      return result;
    } catch (err) {
      setIsSchemaUnlocked(false);
      const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
      const normalizedErr =
        err instanceof AsyncRequestError
          ? err.data
          : normalizeConnectionError(err, latencyMs);
      toast.error(normalizedErr.message || "Connection test failed.");
    }
  };

  const handleRetryConnection = async () => {
    const values = watch();
    const startTime = performance.now();
    try {
      const result = await connectionTest.retry();
      if (!result) return;
      setIsSchemaUnlocked(true);
      toast.success("Connection test passed!");
    } catch (err) {
      setIsSchemaUnlocked(false);
      const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
      const normalized =
        err instanceof AsyncRequestError
          ? err.data
          : normalizeConnectionError(err, latencyMs);
      toast.error(normalized.message || "Connection test failed.");
    }
  };

  // Trigger OAuth Connect
  const handleInitiateOAuth = async () => {
    if (!selectedConnector) return;
    setIsSubmitting(true);
    try {
      const values = watch();
      const res = await onOAuthConnect(selectedConnector.provider, {
        clientId: values.oauthClientId,
        clientSecret: values.oauthClientSecret,
        scopes: values.oauthScopes,
        targetModule: values.targetModule,
        targetEntity: values.targetEntity,
        apiUrl: values.apiUrl,
        httpMethod: values.httpMethod,
        syncDirection: values.syncDirection,
        syncFrequency: values.syncFrequency,
      });

      const targetUrl =
        res?.authorizationUrl ||
        res?.authUrl ||
        res?.url ||
        (res as any)?.redirectUrl ||
        (res as any)?.data?.authorizationUrl;

      if (targetUrl) {
        toast.info(
          `Redirecting to ${selectedConnector.name} for OAuth authorization...`
        );
        window.location.href = targetUrl;
      } else {
        toast.error(
          (res as any)?.message ||
            `No OAuth authorization URL returned by backend for ${selectedConnector.name}.`
        );
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to initiate OAuth authorization for ${selectedConnector.name}.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final Form Submission
  const onFormSubmit = async (data: FormValues) => {
    if (!selectedConnector) {
      toast.error("Please select a connector first.");
      return;
    }

    if (data.authType === "OAUTH2") {
      await handleInitiateOAuth();
      return;
    }

    // If integration was already created during the connection test, update if needed and close
    if (activeIntegrationId && onUpdateIntegration) {
      setIsSubmitting(true);
      try {
        const payload = buildPayload(data);

        await onUpdateIntegration(activeIntegrationId, {
          displayName: payload.displayName,
          syncDirection: payload.syncDirection,
          syncFrequency: payload.syncFrequency,
          apiUrl: payload.apiUrl,
          httpMethod: payload.httpMethod,
          headers: payload.headers,
          credentials: payload.credentials,
          config: payload.config,
        });
        toast.success(`Successfully configured ${selectedConnector.name}!`);
        reset();
        onClose();
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to finalize integration.";
        toast.error(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload(data);

      await onSubmit(payload);
      toast.success(`Successfully connected ${selectedConnector.name}!`);
      reset();
      onClose();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create integration. Please check your configuration.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                {selectedConnector
                  ? `Configure ${selectedConnector.name}`
                  : "Add New Integration"}
              </h2>
              <p className="text-xs text-text-muted">
                Step {step} of 4:{" "}
                {step === 1 && "Select Connector"}
                {step === 2 && "Endpoint & Module Mapping"}
                {step === 3 && "Authentication & Security"}
                {step === 4 && "Review & Connection Test"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div className="grid grid-cols-4 border-b border-border bg-surface-secondary/30 text-xs">
          {[
            { num: 1, label: "Connector" },
            { num: 2, label: "Endpoint" },
            { num: 3, label: "Authentication" },
            { num: 4, label: "Verify & Test" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num === 1 || selectedConnector) {
                  setStep(s.num as any);
                }
              }}
              className={`py-2.5 px-3 text-center border-b-2 font-medium transition-all ${
                step === s.num
                  ? "border-primary text-primary bg-primary/5"
                  : step > s.num
                  ? "border-success text-success"
                  : "border-transparent text-text-muted"
              }`}
            >
              <span className="hidden sm:inline">
                {s.num}. {s.label}
              </span>
              <span className="sm:hidden">Step {s.num}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* STEP 1: CONNECTOR SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-sm text-text-secondary">
                Choose a connector from the catalog to configure:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                {availableConnectors.map((c, idx) => {
                  const isSelected = selectedConnector?.id === c.id;
                  return (
                    <div
                      key={c.id ? `conn-${c.id}` : `conn-${c.provider || idx}`}
                      onClick={() => {
                        setSelectedConnector(c);
                        const existingId =
                          c.connectionId ||
                          c.connectionState?.id ||
                          (c.isConnected ? c.id : null);
                        setActiveIntegrationId(existingId);
                        setStep(2);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-surface hover:border-border-light hover:bg-surface-hover"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-surface-secondary border border-border flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {c.iconUrl ? (
                          <img
                            src={c.iconUrl}
                            alt={c.name}
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          c.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-text truncate">
                            {c.name}
                          </h4>
                          <span className="text-[10px] text-text-muted font-medium uppercase">
                            {c.category}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                          {c.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: ENDPOINT & MODULE MAPPING */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Integration Name */}
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  Integration Display Name *
                </label>
                <input
                  type="text"
                  {...register("displayName")}
                  placeholder="e.g. Production Salesforce Leads Sync"
                  className="w-full px-3.5 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                />
                {errors.displayName && (
                  <p className="text-xs text-error mt-1">
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              {/* Module & Entity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    Target Zyoris Module *
                  </label>
                  <select
                    value={currentTargetModule}
                    onChange={handleModuleChange}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                  >
                    {AVAILABLE_MODULES.map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {mod.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    Entity / Resource Type
                  </label>
                  <input
                    type="text"
                    {...register("targetEntity")}
                    placeholder="e.g. Lead, Contact, Invoice"
                    className="w-full px-3.5 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* API URL & Method */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    API Endpoint URL *
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="url"
                      {...register("apiUrl")}
                      placeholder="https://api.connector.com/v1/resource"
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  {errors.apiUrl && (
                    <p className="text-xs text-error mt-1">
                      {errors.apiUrl.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    HTTP Method *
                  </label>
                  <select
                    {...register("httpMethod")}
                    className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none transition-colors font-mono"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>

              {/* REST request configuration */}
              <div className="space-y-3 rounded-xl border border-border bg-surface-secondary/30 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                      Content Type
                    </label>
                    <select
                      {...register("contentType")}
                      className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                    >
                      {REST_CONTENT_TYPES.map((contentType) => (
                        <option key={contentType} value={contentType}>
                          {contentType}
                        </option>
                      ))}
                    </select>
                  </div>
                  {supportsRequestBody ? (
                    <div>
                      <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                        Request Body (JSON)
                      </label>
                      <textarea
                        {...register("requestBody")}
                        rows={3}
                        placeholder={'{"field": "value"}'}
                        className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                      />
                      {errors.requestBody && (
                        <p className="text-xs text-error mt-1">
                          {errors.requestBody.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="self-end text-xs text-text-muted pb-2">
                      {currentHttpMethod} requests do not send a request body.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text uppercase tracking-wider">
                      Query Parameters
                    </label>
                    <button
                      type="button"
                      onClick={() => appendQueryParam({ key: "", value: "" })}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Parameter</span>
                    </button>
                  </div>
                  {queryParamFields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        {...register(`queryParams.${idx}.key` as const)}
                        placeholder="Parameter name"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                      />
                      <input
                        type="text"
                        {...register(`queryParams.${idx}.value` as const)}
                        placeholder="Parameter value"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeQueryParam(idx)}
                        className="p-1.5 text-text-muted hover:text-error hover:bg-surface-hover rounded-lg transition-colors"
                        aria-label="Remove query parameter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Direction & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    Sync Direction *
                  </label>
                  <select
                    {...register("syncDirection")}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="BIDIRECTIONAL">
                      Bidirectional (In & Out)
                    </option>
                    <option value="INBOUND">
                      Inbound (From External to Zyoris)
                    </option>
                    <option value="OUTBOUND">
                      Outbound (From Zyoris to External)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    Sync Frequency *
                  </label>
                  <select
                    {...register("syncFrequency")}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="REALTIME">Realtime (Webhook driven)</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="EVERY_6_HOURS">Every 6 Hours</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MANUAL">Manual Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: AUTHENTICATION & SECURITY */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Auth Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-2">
                  Authentication Method *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "API_KEY", label: "API Key Header" },
                    { id: "BEARER_TOKEN", label: "Bearer Token" },
                    { id: "OAUTH2", label: "OAuth 2.0" },
                    { id: "BASIC_AUTH", label: "Basic Auth" },
                    { id: "WEBHOOK_SECRET", label: "Webhook Signature" },
                    { id: "NONE", label: "No Authentication" },
                  ].map((auth) => (
                    <button
                      key={auth.id}
                      type="button"
                      onClick={() => setValue("authType", auth.id as AuthType)}
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        currentAuthType === auth.id
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                          : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text"
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 mb-1 text-text-muted" />
                      <div>{auth.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Auth Fields */}
              <div className="p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-text">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Credential Details ({currentAuthType})</span>
                </div>

                {currentAuthType === "API_KEY" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Header Key Name
                      </label>
                      <input
                        type="text"
                        {...register("apiKeyName")}
                        placeholder="X-API-Key or Authorization"
                        className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        API Key Value *
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets["apiKey"] ? "text" : "password"}
                          {...register("apiKeyValue")}
                          placeholder="••••••••••••••••"
                          className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility("apiKey")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                          aria-label="Toggle secret visibility"
                        >
                          {showSecrets["apiKey"] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentAuthType === "BEARER_TOKEN" && (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Bearer Token *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets["bearer"] ? "text" : "password"}
                        {...register("bearerToken")}
                        placeholder="eyJh..."
                        className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility("bearer")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        aria-label="Toggle secret visibility"
                      >
                        {showSecrets["bearer"] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {currentAuthType === "BASIC_AUTH" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Username / Client ID
                      </label>
                      <input
                        type="text"
                        {...register("basicUsername")}
                        placeholder="api_user"
                        className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        Password / Secret *
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets["basic"] ? "text" : "password"}
                          {...register("basicPassword")}
                          placeholder="••••••••"
                          className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility("basic")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                          aria-label="Toggle secret visibility"
                        >
                          {showSecrets["basic"] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentAuthType === "OAUTH2" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-text-muted mb-1">
                          Client ID
                        </label>
                        <input
                          type="text"
                          {...register("oauthClientId")}
                          placeholder="oauth_client_id..."
                          className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">
                          Client Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets["oauth"] ? "text" : "password"}
                            {...register("oauthClientSecret")}
                            placeholder="••••••••••••••••"
                            className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecretVisibility("oauth")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                            aria-label="Toggle secret visibility"
                          >
                            {showSecrets["oauth"] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">
                        OAuth Scopes
                      </label>
                      <input
                        type="text"
                        {...register("oauthScopes")}
                        placeholder="read:contacts write:contacts offline_access"
                        className="w-full px-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleInitiateOAuth}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all"
                      >
                        <Zap className="w-4 h-4" />
                        <span>
                          Authorize Directly via{" "}
                          {selectedConnector?.name || "OAuth Provider"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {currentAuthType === "WEBHOOK_SECRET" && (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">
                      Webhook Signing Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets["webhook"] ? "text" : "password"}
                        {...register("webhookSecret")}
                        placeholder="whsec_..."
                        className="w-full pr-10 pl-3 py-2 rounded-lg bg-surface text-text text-sm border border-border focus:border-primary focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility("webhook")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        aria-label="Toggle secret visibility"
                      >
                        {showSecrets["webhook"] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {currentAuthType === "NONE" && (
                  <p className="text-xs text-text-muted">
                    No authentication credentials will be attached to outgoing sync requests.
                  </p>
                )}
              </div>

              {/* Custom HTTP Headers Editor */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text uppercase tracking-wider">
                    Custom Headers (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ key: "", value: "" })}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Header</span>
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-xs text-text-muted p-3 border border-dashed border-border rounded-lg text-center">
                    No custom headers added. Default headers (Content-Type: application/json) will be used.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          {...register(`headers.${idx}.key` as const)}
                          placeholder="Header Key (e.g. X-Org-ID)"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                        />
                        <input
                          type="text"
                          {...register(`headers.${idx}.value` as const)}
                          placeholder="Header Value"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => remove(idx)}
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
            </div>
          )}

          {/* STEP 4: REVIEW & LIVE CONNECTION TEST */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Configuration Summary Card */}
              <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-3">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                  Configuration Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-muted block">Connector:</span>
                    <span className="font-semibold text-text">
                      {selectedConnector?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Display Name:</span>
                    <span className="font-semibold text-text">
                      {watch("displayName")}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Target Module:</span>
                    <span className="font-semibold text-text uppercase">
                      {watch("targetModule")} ({watch("targetEntity")})
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">HTTP Method & Sync:</span>
                    <span className="font-semibold text-text font-mono">
                      {watch("httpMethod")} | {watch("syncFrequency")}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-muted block">Endpoint URL:</span>
                    <span className="font-mono text-text break-all">
                      {watch("apiUrl")}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Auth Type:</span>
                    <span className="font-semibold text-text">
                      {watch("authType")}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Custom Headers:</span>
                    <span className="font-semibold text-text">
                      {watch("headers")?.length || 0} configured
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Connection Test Action & Result Card */}
              <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-text">
                        Live Connection Test
                      </h5>
                      {testResult ? (
                        testResult.success ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Connection Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-error/10 text-error border border-error/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Connection Failed
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20">
                          Pending Test
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Verify live connectivity and authentication credentials against the remote provider (POST /api/integrations/{"{id}"}/test).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {testResult && !testResult.success && (
                      <button
                        type="button"
                        onClick={handleRetryConnection}
                        disabled={isTesting}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`}
                        />
                        <span>Retry Test</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing connection...</span>
                        </>
                      ) : testResult?.success ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Re-test Connection</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <ConnectionTestResult
                  status={connectionTest.status}
                  result={testResult}
                  isRetrying={connectionTest.isRetrying}
                  onRetry={handleRetryConnection}
                />
              </div>

              {/* Schema Discovery Gating Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isSchemaUnlocked
                    ? "bg-surface border-primary/30 shadow-sm"
                    : "bg-surface-secondary/40 border-border opacity-85"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSchemaUnlocked
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-surface-secondary text-text-muted border border-border"
                      }`}
                    >
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-text">
                          Schema Discovery & Entity Mapping
                        </h5>
                        {isSchemaUnlocked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/20 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Unlocked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-secondary text-text-muted border border-border flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Gated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        {isSchemaUnlocked
                          ? "Connection verified! You can now explore remote schema, discovered entities, and field structures."
                          : "Schema Discovery is locked. Test connection successfully to discover available entities and field definitions."}
                      </p>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      disabled={!isSchemaUnlocked}
                      onClick={() => {
                        if (isSchemaUnlocked && onViewSchema) {
                          const connectorToView: Connector = {
                            ...(selectedConnector || {
                              id: activeIntegrationId || "custom",
                              provider: "custom",
                              name: watch("displayName") || "Integration",
                              description: "",
                              category: "CUSTOM",
                            }),
                            connectionId:
                              activeIntegrationId || selectedConnector?.connectionId,
                            isConnected: true,
                            status: "ACTIVE",
                          };
                          onViewSchema(connectorToView);
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isSchemaUnlocked
                          ? "bg-primary hover:bg-primary-dark text-primary-foreground shadow-sm cursor-pointer"
                          : "bg-surface-secondary text-text-muted border border-border cursor-not-allowed opacity-60"
                      }`}
                    >
                      {isSchemaUnlocked ? (
                        <>
                          <Database className="w-3.5 h-3.5" />
                          <span>Discover Schema</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Schema Locked</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev - 1) as any)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text hover:bg-surface-hover text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedConnector) {
                      toast.error("Please pick a connector first");
                      return;
                    }
                    setStep((prev) => (prev + 1) as any);
                  }}
                  className="flex items-center gap-1 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || isTesting}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {currentAuthType === "OAUTH2"
                          ? "Redirecting to Provider..."
                          : "Saving Integration..."}
                      </span>
                    </>
                  ) : currentAuthType === "OAUTH2" ? (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>
                        Authorize with {selectedConnector?.name || "Provider"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Connect Integration</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
