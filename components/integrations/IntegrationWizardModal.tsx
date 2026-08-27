import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Connector,
  AuthType,
  SyncDirection,
  SyncFrequency,
  HttpMethod,
  CreateIntegrationPayload,
} from "@/types/integrations";
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
  Layers,
  Sparkles,
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
  ) => Promise<{ success: boolean; latencyMs?: number; message?: string }>;
  onOAuthConnect: (provider: string, payload?: Record<string, any>) => Promise<any>;
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
}: IntegrationWizardModalProps) {
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    initialConnector
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    setSelectedConnector(initialConnector);
    if (initialConnector) {
      setStep(2); // Jump straight to configuration if a connector was clicked directly
    } else {
      setStep(1); // Select connector first if opened without pre-selection
    }
  }, [initialConnector, isOpen]);

  const defaultValues: Partial<FormValues> = {
    displayName: selectedConnector ? `${selectedConnector.name} Integration` : "",
    targetModule: "leads",
    targetEntity: "Lead",
    apiUrl:
      selectedConnector?.configSchema?.endpoint?.defaultUrl ||
      (selectedConnector?.provider === "salesforce"
        ? "https://login.salesforce.com/services/data/v58.0"
        : selectedConnector?.provider === "hubspot"
        ? "https://api.hubapi.com/crm/v3/objects"
        : selectedConnector?.provider === "stripe"
        ? "https://api.stripe.com/v1"
        : "https://api.example.com/v1"),
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
    }
  }, [selectedConnector, setValue]);

  if (!isOpen) return null;

  const currentAuthType = watch("authType");
  const currentTargetModule = watch("targetModule");
  const currentHttpMethod = watch("httpMethod");
  const supportsRequestBody = ["POST", "PUT", "PATCH"].includes(
    currentHttpMethod
  );
  const existingIntegrationId =
    selectedConnector?.connectionId || selectedConnector?.connectionState?.id;

  const buildPayload = (data: FormValues): CreateIntegrationPayload => {
    if (!selectedConnector) {
      throw new Error("Please select a connector first.");
    }

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
      connectorId: selectedConnector.id,
      provider: selectedConnector.provider,
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

  // The backend test endpoint accepts an existing integration ID only.
  const handleTestConnection = async () => {
    const values = watch();
    if (!values.apiUrl) {
      toast.error("Please enter a valid API URL before testing connectivity.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      if (!existingIntegrationId || !onTestConnection) {
        throw new Error(
          "Test Connection is available after this integration is saved; the backend does not provide a test endpoint for unsaved configurations."
        );
      }

      const startTime = Date.now();
      const result = await onTestConnection(
        existingIntegrationId,
        buildPayload(values)
      );
      setTestResult({
        ...result,
        latencyMs: result.latencyMs ?? Date.now() - startTime,
      });
      if (result.success) toast.success("Connection test passed!");
      else toast.error(result.message || "Connection test failed.");
    } catch (err: any) {
      setTestResult({
        success: false,
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to reach target integration endpoint.",
      });
      toast.error("Connection test failed.");
    } finally {
      setIsTesting(false);
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
                {step === 4 && "Review & Verification"}
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

       <WizardProgress
  steps={integrationWizardSteps}
  currentStep={step}
  onStepChange={(nextStep) => {
    setStep(nextStep as 1 | 2 | 3 | 4);
  }}
/>

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
                        <span>Authorize Directly via {selectedConnector?.name || "OAuth Provider"}</span>
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

          {/* STEP 4: REVIEW & VERIFY */}
          {step === 4 && (
            <div className="space-y-5">
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

              {/* Test Connection Action */}
              <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <h5 className="text-xs font-bold text-text">
                    Verify Connectivity
                  </h5>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Test saved integration credentials against the remote service.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>
              {!existingIntegrationId && (
                <p className="text-xs text-text-muted">
                  The backend test endpoint accepts an existing integration ID. Save this configuration first, then test it from the integration list.
                </p>
              )}

              {/* Test Result Box */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? "bg-success/10 border-success/20 text-success"
                      : "bg-error/10 border-error/20 text-error"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {testResult.success
                        ? "Connection Test Succeeded"
                        : "Connection Test Failed"}
                    </p>
                    <p className="mt-0.5 opacity-90">{testResult.message}</p>
                    {testResult.latencyMs && (
                      <p className="text-[11px] mt-1 opacity-75 font-mono">
                        Latency: {testResult.latencyMs}ms
                      </p>
                    )}
                  </div>
                </div>
              )}
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
                  disabled={isSubmitting}
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
