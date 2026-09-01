import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  DiscoveredSchemaResponse,
  DiscoveredEntity,
  DiscoveredField,
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
  Search,
  ChevronRight,
  ChevronDown,
  FileCode,
  Sliders,
  Table,
  Hash,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  testIntegrationConnectionApi,
  getIntegrationSchemaApi,
  createIntegrationMappingApi,
  updateIntegrationMappingApi,
} from "@/lib/api/integrationsApi";
import { WizardProgress } from "./wizard/WizardProgress";
import { WizardFooter } from "./wizard/WizardFooter";
import { integrationWizardSteps } from "./wizard/wizardSteps";
import {
  DEFAULT_REST_CONFIGURATION,
  REST_CONTENT_TYPES,
  parseRequestBody,
} from "./wizard/restConfiguration";
import {
  EntitySelectionMappingFlow,
  FieldMappingEntry,
} from "./wizard/EntitySelectionMappingFlow";

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
  onFetchSchema?: (id: string) => Promise<DiscoveredSchemaResponse>;
  onDiscoverSchema?: (id: string, payload?: any) => Promise<DiscoveredSchemaResponse>;
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
    "CUSTOM",
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
  // Dynamic field mappings: targetField -> remoteFieldPath
  fieldMappings: z.record(z.string(), z.string()).optional(),
  // Additional dynamic config
  dynamicFields: z.record(z.string(), z.any()).optional(),
});

type FormValues = z.infer<typeof integrationFormSchema>;

const AVAILABLE_MODULES = [
  {
    id: "leads",
    label: "Leads (CRM)",
    entity: "Lead",
    targetFields: [
      { key: "name", label: "Full Name", required: true },
      { key: "email", label: "Email Address", required: true },
      { key: "company", label: "Company Name" },
      { key: "phone", label: "Phone Number" },
      { key: "status", label: "Lead Status" },
      { key: "source", label: "Lead Source" },
      { key: "value", label: "Estimated Value" },
      { key: "notes", label: "Notes / Description" },
    ],
  },
  {
    id: "deals",
    label: "Deals / Pipeline (CRM)",
    entity: "Deal",
    targetFields: [
      { key: "title", label: "Deal Title", required: true },
      { key: "amount", label: "Deal Value / Amount", required: true },
      { key: "stage", label: "Pipeline Stage" },
      { key: "company", label: "Associated Company" },
      { key: "closeDate", label: "Expected Close Date" },
      { key: "owner", label: "Deal Owner" },
    ],
  },
  {
    id: "contacts",
    label: "Contacts (CRM)",
    entity: "Contact",
    targetFields: [
      { key: "firstName", label: "First Name", required: true },
      { key: "lastName", label: "Last Name", required: true },
      { key: "email", label: "Email Address", required: true },
      { key: "phone", label: "Phone Number" },
      { key: "jobTitle", label: "Job Title" },
      { key: "department", label: "Department" },
    ],
  },
  {
    id: "companies",
    label: "Companies (CRM)",
    entity: "Company",
    targetFields: [
      { key: "name", label: "Company Name", required: true },
      { key: "domain", label: "Website / Domain" },
      { key: "industry", label: "Industry" },
      { key: "size", label: "Employee Count" },
      { key: "city", label: "City" },
      { key: "country", label: "Country" },
    ],
  },
  {
    id: "finance",
    label: "Invoices & Payments (Finance)",
    entity: "Invoice",
    targetFields: [
      { key: "invoiceNumber", label: "Invoice Number", required: true },
      { key: "amount", label: "Total Amount", required: true },
      { key: "currency", label: "Currency Code" },
      { key: "dueDate", label: "Due Date" },
      { key: "status", label: "Payment Status" },
      { key: "customerEmail", label: "Customer Email" },
    ],
  },
  {
    id: "hr",
    label: "Employees & Attendance (HR)",
    entity: "Employee",
    targetFields: [
      { key: "employeeId", label: "Employee ID", required: true },
      { key: "name", label: "Full Name", required: true },
      { key: "email", label: "Work Email", required: true },
      { key: "role", label: "Designation" },
      { key: "department", label: "Department" },
      { key: "status", label: "Employment Status" },
    ],
  },
  {
    id: "tasks",
    label: "Tasks & Workflows",
    entity: "Task",
    targetFields: [
      { key: "title", label: "Task Title", required: true },
      { key: "description", label: "Description" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "dueDate", label: "Due Date" },
    ],
  },
  {
    id: "communications",
    label: "Communications (Email/Chat)",
    entity: "Message",
    targetFields: [
      { key: "subject", label: "Subject / Header", required: true },
      { key: "body", label: "Message Content" },
      { key: "sender", label: "Sender" },
      { key: "recipient", label: "Recipient" },
      { key: "sentAt", label: "Timestamp" },
    ],
  },
  {
    id: "projects",
    label: "Projects & Boards",
    entity: "Project",
    targetFields: [
      { key: "name", label: "Project Name", required: true },
      { key: "description", label: "Description" },
      { key: "status", label: "Status" },
      { key: "budget", label: "Budget" },
    ],
  },
  {
    id: "custom",
    label: "Custom Entity",
    entity: "CustomRecord",
    targetFields: [
      { key: "externalId", label: "External Record ID", required: true },
      { key: "title", label: "Title / Name", required: true },
      { key: "data", label: "Payload Data" },
      { key: "updatedAt", label: "Last Modified" },
    ],
  },
];

/**
 * Sanitizes and redacts sensitive error messages before display
 */
function sanitizeDiagnosticMessage(msg?: string): string {
  if (!msg) return "";
  return msg
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    // Redact sensitive key/value pairs
    .replace(
      /(api_?key|password|secret|client_secret|access_token|refresh_token|authorization|auth|token)[=:\s]+[^\s,;&]+/gi,
      "$1: [REDACTED]"
    )
    // Redact credentials in URLs
    .replace(/:\/\/[^:]+:[^@]+@/g, "://[REDACTED]@")
    // Redact internal file system paths
    .replace(
      /([a-zA-Z]:\\[^\s:<>|"?*]+|\/(var|etc|usr|home|app|root|tmp)\/[^\s:<>|"?*]+)/gi,
      "[SERVER_PATH]"
    )
    .trim();
}

/**
 * Recursively flattens fields and preserves dot-notation hierarchical paths
 */
interface FlatDiscoveredField extends DiscoveredField {
  fullPath: string;
  depth: number;
  hasChildren: boolean;
}

function flattenFieldsTree(
  fields: DiscoveredField[],
  parentPath = "",
  depth = 0
): FlatDiscoveredField[] {
  const result: FlatDiscoveredField[] = [];

  for (const field of fields) {
    const fieldName = field.name || field.path || "field";
    const fullPath = field.path || (parentPath ? `${parentPath}.${fieldName}` : fieldName);
    const childList =
      field.fields ||
      field.children ||
      (field.properties ? Object.values(field.properties) : undefined);

    const hasChildren = Array.isArray(childList) && childList.length > 0;

    result.push({
      ...field,
      fullPath,
      depth,
      hasChildren,
    });

    if (hasChildren && childList) {
      const nested = flattenFieldsTree(childList, fullPath, depth + 1);
      result.push(...nested);
    }
  }

  return result;
}

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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Connection Test & Schema Discovery state
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);
  const connectionTest = useAsyncRequest<NormalizedConnectionTestResult>();
  const connectionTestStatus = connectionTest.status;
  const resetConnectionTest = connectionTest.reset;
  const isTesting = connectionTest.status === "loading";
  const [isSchemaUnlocked, setIsSchemaUnlocked] = useState(false);

  // Schema Discovery state — preserved in wizard state
  const [discoveredSchema, setDiscoveredSchema] = useState<DiscoveredSchemaResponse | null>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaSearchQuery, setSchemaSearchQuery] = useState("");
  const [selectedEntityName, setSelectedEntityName] = useState<string>("");
  const [showSampleRecordsDrawer, setShowSampleRecordsDrawer] = useState(false);

  // Field Mapping state — initialized from discovered schema and backend mappings
  const [mappedFields, setMappedFields] = useState<Record<string, string>>({});
  const [rawMappingEntries, setRawMappingEntries] = useState<FieldMappingEntry[]>([]);
  const [isMappingValid, setIsMappingValid] = useState<boolean>(true);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);

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
    setDiscoveredSchema(null);
    setSchemaError(null);
    setMappedFields({});
  }, [initialConnector, isOpen, resetConnectionTest]);

  const defaultValues: Partial<FormValues> = {
    displayName: selectedConnector ? `${selectedConnector.name} Integration` : "",
    targetModule: "leads",
    targetEntity: "Lead",
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
    fieldMappings: {},
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
    
    if (previousAuthTypeRef.current !== undefined && previousAuthTypeRef.current !== currentAuthType) {
      setValue("apiKeyName", "");
      setValue("apiKeyValue", "");
      setValue("bearerToken", "");
      setValue("basicUsername", "");
      setValue("basicPassword", "");
      setValue("oauthClientId", "");
      setValue("oauthClientSecret", "");
      setValue("oauthScopes", "");
      setValue("webhookSecret", "");

      if (currentAuthType === "API_KEY") {
        setValue("apiKeyName", "X-API-Key");
      }
      if (currentAuthType === "OAUTH2") {
        setValue("oauthScopes", "read, write");
      }
    }
    
    previousAuthTypeRef.current = currentAuthType;
  }, [watchedAuthType, watch, setValue]);

  const currentAuthType = watch("authType");
  const currentTargetModule = watch("targetModule");
  const currentHttpMethod = watch("httpMethod");
  const supportsRequestBody = ["POST", "PUT", "PATCH"].includes(
    currentHttpMethod
  );

  const currentModuleConfig = useMemo(() => {
    return (
      AVAILABLE_MODULES.find((m) => m.id === currentTargetModule) ||
      AVAILABLE_MODULES[0]
    );
  }, [currentTargetModule]);

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
            console.warn("Failed to sync updated configuration before test:", updateErr);
          }
        }

        if (!currentTargetId) {
          throw new Error(
            "An integration instance could not be established for your organization. Please verify your configuration."
          );
        }

        const testFn = onTestConnection || testIntegrationConnectionApi;

        try {
          const response = await testFn(currentTargetId, payload);
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

  /**
   * Real Schema Discovery Handler
   * Calls backend API: GET /api/v1/integrations/{id}/schema
   * Prevents unnecessary refetches when schema is already stored in wizard state
   */
  const handleDiscoverSchema = useCallback(
    async (forceRefetch = false) => {
      const targetId =
        activeIntegrationId ||
        selectedConnector?.connectionId ||
        selectedConnector?.connectionState?.id ||
        (selectedConnector?.isConnected ? selectedConnector?.id : null) ||
        selectedConnector?.id ||
        selectedConnector?.provider;

      if (!targetId) {
        toast.error("No active integration identifier available for schema discovery.");
        return;
      }

      if (discoveredSchema && !forceRefetch) {
        return;
      }

      if (isLoadingSchema) return;

      setIsLoadingSchema(true);
      setSchemaError(null);

      try {
        const schemaRes = onDiscoverSchema
          ? await onDiscoverSchema(targetId)
          : onFetchSchema
          ? await onFetchSchema(targetId)
          : await getIntegrationSchemaApi(targetId);

        setDiscoveredSchema(schemaRes);

        const entityList = schemaRes?.entities || [];
        if (entityList.length > 0 && !selectedEntityName) {
          setSelectedEntityName(entityList[0].name || entityList[0].id || "Default");
        }

        // Auto-seed field mappings for matching names
        if (entityList.length > 0) {
          const firstEntityFields = flattenFieldsTree(entityList[0].fields || []);
          const initialMap: Record<string, string> = { ...mappedFields };

          currentModuleConfig.targetFields.forEach((tf) => {
            if (!initialMap[tf.key]) {
              const directMatch = firstEntityFields.find(
                (f) =>
                  f.name?.toLowerCase() === tf.key.toLowerCase() ||
                  f.fullPath?.toLowerCase() === tf.key.toLowerCase() ||
                  f.label?.toLowerCase() === tf.label.toLowerCase()
              );
              if (directMatch) {
                initialMap[tf.key] = directMatch.fullPath;
              }
            }
          });
          setMappedFields(initialMap);
        }

        toast.success("Remote schema discovered successfully!");
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to discover remote schema. Remote endpoint may be unreachable.";
        setSchemaError(sanitizeDiagnosticMessage(errMsg));
        toast.error("Schema discovery failed.");
      } finally {
        setIsLoadingSchema(false);
      }
    },
    [
      activeIntegrationId,
      selectedConnector,
      discoveredSchema,
      isLoadingSchema,
      onDiscoverSchema,
      onFetchSchema,
      selectedEntityName,
      mappedFields,
      currentModuleConfig.targetFields,
    ]
  );

  // Automatically trigger schema discovery when step 5 is active and schema not loaded yet
  useEffect(() => {
    if (step === 5 && isSchemaUnlocked && !discoveredSchema && !isLoadingSchema && !schemaError) {
      handleDiscoverSchema();
    }
  }, [step, isSchemaUnlocked, discoveredSchema, isLoadingSchema, schemaError, handleDiscoverSchema]);

  // Current entity schema
  const activeEntity = useMemo<DiscoveredEntity | null>(() => {
    if (!discoveredSchema?.entities || discoveredSchema.entities.length === 0) {
      return null;
    }
    return (
      discoveredSchema.entities.find(
        (e) => e.name === selectedEntityName || e.id === selectedEntityName
      ) || discoveredSchema.entities[0]
    );
  }, [discoveredSchema, selectedEntityName]);

  // Flattened field list for active entity
  const allFlatFields = useMemo<FlatDiscoveredField[]>(() => {
    if (!activeEntity?.fields) return [];
    return flattenFieldsTree(activeEntity.fields);
  }, [activeEntity]);

  // Filtered fields based on search query
  const filteredFields = useMemo(() => {
    if (!schemaSearchQuery.trim()) return allFlatFields;
    const q = schemaSearchQuery.toLowerCase().trim();
    return allFlatFields.filter((f) => {
      const matchPath = f.fullPath.toLowerCase().includes(q);
      const matchName = (f.name || "").toLowerCase().includes(q);
      const matchLabel = (f.label || "").toLowerCase().includes(q);
      const matchType = (f.type || "").toLowerCase().includes(q);
      const matchDesc = (f.description || "").toLowerCase().includes(q);
      return matchPath || matchName || matchLabel || matchType || matchDesc;
    });
  }, [allFlatFields, schemaSearchQuery]);

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
    if (step !== 6) {
      return;
    }

    if (!selectedConnector) {
      toast.error("Please select a connector first.");
      return;
    }

    if (step === 6 && !isMappingValid && missingRequiredFields.length > 0) {
      toast.error(
        `Required target fields missing: ${missingRequiredFields.join(
          ", "
        )}. Please map all required fields before completing setup.`
      );
      return;
    }

    const formatBackendError = (err: any): string => {
      const details = err?.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        const detailMsgs = details
          .map((d: any) => `${d.field || "Field"}: ${d.message}`)
          .join(" | ");
        return `${err?.response?.data?.message || "Validation failed"}: ${detailMsgs}`;
      }
      return (
        err?.response?.data?.message ||
        err?.message ||
        "Failed to finalize integration."
      );
    };

    if (activeIntegrationId && onUpdateIntegration) {
      setIsSubmitting(true);
      try {
        const payload = buildPayload(data);

        if (rawMappingEntries.length > 0) {
          const sourceEntName = activeEntity?.name || activeEntity?.label || "DefaultEntity";
          const targetEntName = data.targetEntity || "DefaultEntity";

          for (const entry of rawMappingEntries) {
            if (entry.sourceField && entry.isDirty) {
              try {
                if (entry.backendMappingId) {
                  await updateIntegrationMappingApi(activeIntegrationId, entry.backendMappingId, {
                    sourceEntity: sourceEntName,
                    sourceField: entry.sourceField,
                    targetEntity: targetEntName,
                    targetField: entry.targetField,
                    status: entry.status,
                    transformation: {
                      type: entry.transformationType || "none",
                      config: entry.transformationConfig,
                      defaultValue: entry.defaultValue,
                    },
                  });
                } else {
                  await createIntegrationMappingApi(activeIntegrationId, {
                    sourceEntity: sourceEntName,
                    sourceField: entry.sourceField,
                    targetEntity: targetEntName,
                    targetField: entry.targetField,
                    status: entry.status || "ACTIVE",
                    confidence: 1,
                    transformation: {
                      type: entry.transformationType || "none",
                      config: entry.transformationConfig,
                      defaultValue: entry.defaultValue,
                    },
                  });
                }
              } catch (mapErr) {
                console.warn(`Could not sync mapping for ${entry.targetField}:`, mapErr);
              }
            }
          }
        }

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
        const errorMsg = formatBackendError(err);
        toast.error(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload(data);

      const created = await onSubmit(payload);
      const newIntegrationId = created?.id;

      if (newIntegrationId && rawMappingEntries.length > 0) {
        const sourceEntName = activeEntity?.name || activeEntity?.label || "DefaultEntity";
        const targetEntName = data.targetEntity || "DefaultEntity";

        for (const entry of rawMappingEntries) {
          if (entry.sourceField) {
            try {
              await createIntegrationMappingApi(newIntegrationId, {
                sourceEntity: sourceEntName,
                sourceField: entry.sourceField,
                targetEntity: targetEntName,
                targetField: entry.targetField,
                status: entry.status || "ACTIVE",
                confidence: 1,
                transformation: {
                  type: entry.transformationType || "none",
                  config: entry.transformationConfig,
                  defaultValue: entry.defaultValue,
                },
              });
            } catch (mapErr) {
              console.warn(`Could not sync mapping for ${entry.targetField}:`, mapErr);
            }
          }
        }
      }

      toast.success(`Successfully connected ${selectedConnector.name}!`);
      reset();
      onClose();
    } catch (err: any) {
      const errorMsg = formatBackendError(err);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Sample Value Formatter
  const renderSampleValue = (val: any) => {
    if (val === undefined || val === null) {
      return <span className="text-text-muted italic text-[11px]">null</span>;
    }
    if (typeof val === "boolean") {
      return (
        <span className="font-mono text-[11px] font-semibold text-primary">
          {val ? "true" : "false"}
        </span>
      );
    }
    if (typeof val === "number") {
      return (
        <span className="font-mono text-[11px] font-semibold text-info">
          {val}
        </span>
      );
    }
    if (typeof val === "string") {
      const sanitized = sanitizeDiagnosticMessage(val);
      return (
        <span className="font-mono text-[11px] text-text truncate max-w-[180px] inline-block">
          &quot;{sanitized}&quot;
        </span>
      );
    }
    if (Array.isArray(val)) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 font-mono text-[10px]">
          Array[{val.length}]
        </span>
      );
    }
    if (typeof val === "object") {
      return (
        <span className="px-1.5 py-0.5 rounded bg-cat-comm-bg text-cat-comm border border-cat-comm/20 font-mono text-[10px]">
          Object&#123;...&#125;
        </span>
      );
    }
    return <span className="font-mono text-[11px] text-text">{String(val)}</span>;
  };

  // Memoized handlers for EntitySelectionMappingFlow to prevent re-render loops
  const handleMappingModuleChange = useCallback((moduleId: string, entityName: string) => {
    setValue("targetModule", moduleId);
    setValue("targetEntity", entityName);
  }, [setValue]);

  const handleValidationChange = useCallback((isValid: boolean, missing: string[]) => {
    setIsMappingValid((prev) => (prev !== isValid ? isValid : prev));
    setMissingRequiredFields((prev) => {
      if (prev.length === missing.length && prev.every((v, i) => v === missing[i])) {
        return prev;
      }
      return missing;
    });
  }, []);

  const handleMappingsChange = useCallback((record: Record<string, string>, entries: FieldMappingEntry[]) => {
    setMappedFields((prev) => {
      const prevKeys = Object.keys(prev);
      const newKeys = Object.keys(record);
      if (prevKeys.length === newKeys.length && prevKeys.every((k) => prev[k] === record[k])) {
        return prev;
      }
      return record;
    });
    setRawMappingEntries(entries);
    setValue("fieldMappings", record);
  }, [setValue]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-200 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
              {selectedConnector?.iconUrl ? (
                <img
                  src={selectedConnector.iconUrl}
                  alt={selectedConnector.name}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <Zap className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                {selectedConnector
                  ? `Configure ${selectedConnector.name}`
                  : "Setup New Integration"}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {step === 1 && "Step 1 of 6: Connector Selection"}
                {step === 2 && "Step 2 of 6: Protocol & Endpoint Configuration"}
                {step === 3 && "Step 3 of 6: Authentication & Credentials"}
                {step === 4 && "Step 4 of 6: Verification & Connection Test"}
                {step === 5 && "Step 5 of 6: Schema Discovery & Sample Data"}
                {step === 6 && "Step 6 of 6: Field Mapping & Review"}
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

        {/* Dynamic Wizard Progress Indicator */}
        <WizardProgress
          steps={integrationWizardSteps}
          currentStep={step}
          onStepChange={(s) => {
            setStep(s as any);
          }}
        />

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 6) {
              handleSubmit(onFormSubmit)(e);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && step !== 6) {
              e.preventDefault();
            }
          }}
          className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col"
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
                      onClick={() => {
                        setStep(5);
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-primary hover:bg-primary-dark text-primary-foreground shadow-sm cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Discover Schema & Mapping</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SCHEMA DISCOVERY & SAMPLE DATA */}
          {step === 5 && (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Header & Status Bar */}
              <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-info/10 border border-info/20 text-info flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-text">
                        Discovered External Schema
                      </h4>
                      {discoveredSchema && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Live Schema Ready
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Inspect field paths, types, required flags, and live sample values from{" "}
                      <span className="font-semibold text-text">
                        GET /api/integrations/{"{id}"}/schema
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {discoveredSchema?.sampleRecords && discoveredSchema.sampleRecords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSampleRecordsDrawer(!showSampleRecordsDrawer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {showSampleRecordsDrawer ? "Hide Sample JSON" : "View Sample JSON"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDiscoverSchema(true)}
                    disabled={isLoadingSchema}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors disabled:opacity-50"
                    title="Re-fetch schema from backend"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingSchema ? "animate-spin text-primary" : "text-text-muted"}`}
                    />
                    <span>{isLoadingSchema ? "Refetching..." : "Refresh Schema"}</span>
                  </button>
                </div>
              </div>

              {/* Sample Records JSON Drawer */}
              {showSampleRecordsDrawer && discoveredSchema?.sampleRecords && (
                <div className="p-4 rounded-xl border border-border bg-surface-secondary/50 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-primary" />
                      Detected Live Sample Records ({discoveredSchema.sampleRecords.length})
                    </span>
                    <span className="text-[11px] text-text-muted font-mono">
                      Read-only live API payload
                    </span>
                  </div>
                  <pre className="p-3 rounded-lg bg-surface text-text border border-border text-[11px] font-mono overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(discoveredSchema.sampleRecords, null, 2)}
                  </pre>
                </div>
              )}

              {/* Schema Body: Loading / Error / Content */}
              {isLoadingSchema ? (
                <div className="p-12 rounded-xl border border-border bg-surface flex flex-col items-center justify-center text-center space-y-3 flex-1 min-h-[260px]">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-semibold text-text">
                    Discovering schema from remote integration...
                  </p>
                  <p className="text-xs text-text-secondary max-w-sm">
                    Fetching field definitions, types, constraints, and sample data from the external provider endpoint.
                  </p>
                </div>
              ) : schemaError ? (
                <div className="p-8 rounded-xl border border-error/20 bg-error/5 flex flex-col items-center justify-center text-center space-y-3 flex-1 min-h-[260px]">
                  <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-text">
                    Schema Discovery Failed
                  </h4>
                  <p className="text-xs text-text-secondary max-w-md">
                    {schemaError}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDiscoverSchema(true)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary-dark transition-all inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Discovery</span>
                  </button>
                </div>
              ) : !activeEntity || allFlatFields.length === 0 ? (
                <div className="p-10 rounded-xl border border-dashed border-border bg-surface flex flex-col items-center justify-center text-center space-y-3 flex-1 min-h-[260px]">
                  <div className="w-10 h-10 rounded-xl bg-surface-secondary border border-border flex items-center justify-center text-text-muted">
                    <Layers className="w-5 h-5 opacity-50" />
                  </div>
                  <h4 className="text-sm font-bold text-text">
                    No Schema Fields Found
                  </h4>
                  <p className="text-xs text-text-secondary max-w-md">
                    The remote endpoint responded but returned no discoverable fields or entities for this configuration.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDiscoverSchema(true)}
                    className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-text transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
                    <span>Try Discovery Again</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  {/* Entity Selector Tabs & Search Filter Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Entity Tabs (if multiple) */}
                    {discoveredSchema?.entities && discoveredSchema.entities.length > 1 ? (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                        {discoveredSchema.entities.map((ent) => (
                          <button
                            key={ent.name || ent.id}
                            type="button"
                            onClick={() => setSelectedEntityName(ent.name || ent.id || "")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                              (activeEntity?.name === ent.name || activeEntity?.id === ent.id)
                                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                : "border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text"
                            }`}
                          >
                            <span>{ent.label || ent.name}</span>
                            <span className="text-[10px] opacity-75">
                              ({ent.fields?.length || 0})
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-text">
                          Entity: {activeEntity.label || activeEntity.name}
                        </span>
                        {typeof activeEntity.recordCount === "number" && (
                          <span className="px-2 py-0.5 rounded bg-surface-secondary text-text-secondary border border-border text-[10px]">
                            {activeEntity.recordCount} records
                          </span>
                        )}
                        {activeEntity.pagination && (
                          <span className="px-2 py-0.5 rounded bg-surface-secondary text-text-muted border border-border text-[10px]">
                            Page {activeEntity.pagination.page || 1}
                            {activeEntity.pagination.totalPages ? ` of ${activeEntity.pagination.totalPages}` : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Field Search Input */}
                    <div className="relative w-full sm:w-64 flex-shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={schemaSearchQuery}
                        onChange={(e) => setSchemaSearchQuery(e.target.value)}
                        placeholder="Search field path or name..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none"
                      />
                      {schemaSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSchemaSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-0.5"
                          aria-label="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Schema Summary Metadata Bar */}
                  <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                    <span>
                      Showing {filteredFields.length} of {allFlatFields.length} fields
                    </span>
                    <div className="flex items-center gap-3">
                      {discoveredSchema?.discoveredAt && (
                        <span>
                          Discovered: {new Date(discoveredSchema.discoveredAt).toLocaleTimeString()}
                        </span>
                      )}
                      {discoveredSchema?.recordCount !== undefined && (
                        <span className="font-medium text-text">
                          Total Records: {discoveredSchema.recordCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fields Table / Tree */}
                  <div className="flex-1 overflow-y-auto border border-border rounded-xl bg-surface max-h-[380px]">
                    {filteredFields.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-muted space-y-1">
                        <Search className="w-5 h-5 mx-auto opacity-40 mb-1" />
                        <p className="font-medium text-text">No matching fields found</p>
                        <p>No schema fields match query &quot;{schemaSearchQuery}&quot;</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-surface-secondary/70 text-text-muted border-b border-border sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">
                              Field Path & Hierarchy
                            </th>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">
                              Data Type
                            </th>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">
                              Attributes
                            </th>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">
                              Live Sample Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredFields.map((field, idx) => (
                            <tr
                              key={`${field.fullPath}-${idx}`}
                              className="hover:bg-surface-hover transition-colors group"
                            >
                              {/* Field Path with nesting indentation */}
                              <td className="py-2.5 px-3">
                                <div
                                  className="flex items-center gap-1.5"
                                  style={{ paddingLeft: `${field.depth * 14}px` }}
                                >
                                  {field.depth > 0 && (
                                    <span className="text-text-muted font-mono text-[10px]">
                                      └
                                    </span>
                                  )}
                                  <span className="font-mono font-semibold text-text">
                                    {field.name}
                                  </span>
                                  {field.fullPath !== field.name && (
                                    <span className="text-[10px] font-mono text-text-muted">
                                      ({field.fullPath})
                                    </span>
                                  )}
                                  {field.label && field.label !== field.name && (
                                    <span className="text-[10px] text-text-secondary">
                                      — {field.label}
                                    </span>
                                  )}
                                </div>
                                {field.description && (
                                  <p
                                    className="text-[10px] text-text-muted mt-0.5 line-clamp-1"
                                    style={{ paddingLeft: `${field.depth * 14 + (field.depth > 0 ? 16 : 0)}px` }}
                                  >
                                    {field.description}
                                  </p>
                                )}
                              </td>

                              {/* Data Type Badge */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded font-mono text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                                  {field.type || "string"}
                                </span>
                              </td>

                              {/* Attributes */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {field.required && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-error/10 text-error border border-error/20">
                                      Required
                                    </span>
                                  )}
                                  {field.nullable === false && !field.required && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20">
                                      Non-Nullable
                                    </span>
                                  )}
                                  {field.readOnly && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-secondary text-text-muted border border-border">
                                      Read-Only
                                    </span>
                                  )}
                                  {!field.required && field.nullable !== false && !field.readOnly && (
                                    <span className="text-[10px] text-text-muted font-mono">
                                      optional
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Sample Value */}
                              <td className="py-2.5 px-3">
                                {renderSampleValue(
                                  field.sampleValue ??
                                    field.sample ??
                                    field.example ??
                                    (field.name ? activeEntity.sampleRecords?.[0]?.[field.name] : undefined) ??
                                    activeEntity.sampleRecords?.[0]?.[field.fullPath]
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: ENTITY SELECTION & FIELD MAPPING */}
          {step === 6 && (
            <EntitySelectionMappingFlow
              connector={selectedConnector}
              integrationId={activeIntegrationId}
              discoveredSchema={discoveredSchema}
              selectedModuleId={watch("targetModule") || "leads"}
              selectedEntityId={watch("targetEntity") || "Lead"}
              onModuleChange={handleMappingModuleChange}
              onValidationChange={handleValidationChange}
              onMappingsChange={handleMappingsChange}
              initialMappings={mappedFields}
              disabled={isSubmitting}
            />
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

              {step < 6 ? (
                <button
                  type="button"
                  key={`wizard-next-step-${step}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!selectedConnector) {
                      toast.error("Please pick a connector first");
                      return;
                    }
                    setStep((prev) => Math.min(6, prev + 1) as any);
                  }}
                  className="flex items-center gap-1 px-5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  key="wizard-finish-step-6"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(onFormSubmit)(e);
                  }}
                  disabled={isSubmitting || isTesting || !isMappingValid}
                  title={
                    !isMappingValid
                      ? `Missing required fields: ${missingRequiredFields.join(", ")}`
                      : "Finish and connect integration"
                  }
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
