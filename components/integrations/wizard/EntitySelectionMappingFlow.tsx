import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Connector,
  DiscoveredSchemaResponse,
  DiscoveredEntity,
  DiscoveredField,
  IntegrationMapping,
  CreateMappingRequest,
  UpdateMappingRequest,
  TransformationRuleType,
  TargetFieldDefinition,
  TargetEntityDefinition,
  TargetModuleDefinition,
  TransformationStepTrace,
} from "@/types/integrations";
import {
  getIntegrationMappingsApi,
  createIntegrationMappingApi,
  updateIntegrationMappingApi,
  deleteIntegrationMappingApi,
  previewTransformationApi,
  getSchemaMappingApi,
  saveSchemaMappingApi,
} from "@/lib/api/integrationsApi";
import {
  generateMappingSuggestions,
  calculateMatchConfidence,
  validateFieldAcceptance,
  SuggestedMapping,
  ConfidenceTier,
} from "@/lib/transformations/suggestions";
import { executeTransformationPipeline } from "@/lib/transformations/engine";
import { TransformationRuleEditor } from "./TransformationRuleEditor";
import {
  Layers,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Trash2,
  Save,
  RotateCcw,
  Search,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Database,
  Tag,
  Code,
  Info,
  ExternalLink,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Standard Zyoris Target Modules Catalog with comprehensive target entities & fields metadata
 */
export const DEFAULT_TARGET_MODULES: TargetModuleDefinition[] = [
  {
    id: "leads",
    label: "Leads (CRM)",
    description: "Capture, qualify, and route inbound sales leads into Zyoris CRM",
    entities: [
      {
        id: "Lead",
        name: "Lead",
        label: "Lead Record",
        description: "Prospects and inbound inquiries awaiting qualification",
        targetFields: [
          { key: "name", label: "Full Name", type: "string", required: true, description: "Full name of the lead contact" },
          { key: "email", label: "Email Address", type: "string", required: true, description: "Primary email address for communications" },
          { key: "company", label: "Company Name", type: "string", required: false, description: "Organization or employer name" },
          { key: "phone", label: "Phone Number", type: "string", required: false, description: "Direct or mobile phone number" },
          { key: "status", label: "Lead Status", type: "string", required: false, description: "Lead stage (e.g., NEW, CONTACTED, QUALIFIED)" },
          { key: "source", label: "Lead Source", type: "string", required: false, description: "Acquisition channel or marketing campaign" },
          { key: "value", label: "Estimated Value", type: "number", required: false, description: "Potential deal value in default currency" },
          { key: "notes", label: "Notes / Description", type: "string", required: false, description: "Context, inquiry details, or initial requirements" },
        ],
      },
    ],
  },
  {
    id: "deals",
    label: "Deals & Pipeline (CRM)",
    description: "Manage sales opportunities, pipeline stages, and revenue forecasts",
    entities: [
      {
        id: "Deal",
        name: "Deal",
        label: "Deal Opportunity",
        description: "Active sales deals tracked through pipeline stages",
        targetFields: [
          { key: "title", label: "Deal Title", type: "string", required: true, description: "Descriptive name for the opportunity" },
          { key: "amount", label: "Deal Amount", type: "number", required: true, description: "Total contracted or estimated revenue" },
          { key: "stage", label: "Pipeline Stage", type: "string", required: false, description: "Current stage in the sales cycle" },
          { key: "company", label: "Associated Company", type: "string", required: false, description: "Company account associated with deal" },
          { key: "closeDate", label: "Expected Close Date", type: "date", required: false, description: "Target closing date for revenue projection" },
          { key: "owner", label: "Deal Owner", type: "string", required: false, description: "Sales representative responsible for deal" },
        ],
      },
    ],
  },
  {
    id: "contacts",
    label: "Contacts (CRM)",
    description: "Centralized directory of people, stakeholders, and decision makers",
    entities: [
      {
        id: "Contact",
        name: "Contact",
        label: "Contact Profile",
        description: "Individual stakeholder or customer contact",
        targetFields: [
          { key: "firstName", label: "First Name", type: "string", required: true, description: "Given name of contact" },
          { key: "lastName", label: "Last Name", type: "string", required: true, description: "Family or surname of contact" },
          { key: "email", label: "Email Address", type: "string", required: true, description: "Primary email for contact" },
          { key: "phone", label: "Phone Number", type: "string", required: false, description: "Direct telephone number" },
          { key: "jobTitle", label: "Job Title", type: "string", required: false, description: "Professional designation" },
          { key: "department", label: "Department", type: "string", required: false, description: "Organizational unit or division" },
        ],
      },
    ],
  },
  {
    id: "companies",
    label: "Companies & Accounts",
    description: "Account profiles, business hierarchies, and firmographic data",
    entities: [
      {
        id: "Company",
        name: "Company",
        label: "Company Account",
        description: "Business organization or client account",
        targetFields: [
          { key: "name", label: "Company Name", type: "string", required: true, description: "Legal or trading entity name" },
          { key: "domain", label: "Website / Domain", type: "string", required: false, description: "Corporate web domain (e.g. zyoris.com)" },
          { key: "industry", label: "Industry", type: "string", required: false, description: "Primary business sector" },
          { key: "size", label: "Employee Count", type: "string", required: false, description: "Company headcount range" },
          { key: "city", label: "City", type: "string", required: false, description: "Headquarters location city" },
          { key: "country", label: "Country", type: "string", required: false, description: "Headquarters country" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Invoices & Payments (Finance)",
    description: "Financial transactions, billing records, invoices, and payouts",
    entities: [
      {
        id: "Invoice",
        name: "Invoice",
        label: "Invoice Record",
        description: "Customer or vendor billing invoice",
        targetFields: [
          { key: "invoiceNumber", label: "Invoice Number", type: "string", required: true, description: "Unique invoice identifier" },
          { key: "amount", label: "Total Amount", type: "number", required: true, description: "Gross invoice amount" },
          { key: "currency", label: "Currency Code", type: "string", required: false, description: "ISO currency code (e.g. USD, EUR, INR)" },
          { key: "dueDate", label: "Due Date", type: "date", required: false, description: "Payment deadline" },
          { key: "status", label: "Payment Status", type: "string", required: false, description: "Status (e.g. PAID, PENDING, OVERDUE)" },
          { key: "customerEmail", label: "Customer Email", type: "string", required: false, description: "Billing contact email address" },
        ],
      },
    ],
  },
  {
    id: "hr",
    label: "HR & Employee Directory",
    description: "Personnel records, employee profiles, and organizational assignments",
    entities: [
      {
        id: "Employee",
        name: "Employee",
        label: "Employee Profile",
        description: "Staff member record and employment details",
        targetFields: [
          { key: "employeeId", label: "Employee ID", type: "string", required: true, description: "Unique staff ID" },
          { key: "name", label: "Full Name", type: "string", required: true, description: "Employee full name" },
          { key: "email", label: "Work Email", type: "string", required: true, description: "Corporate email address" },
          { key: "role", label: "Role / Designation", type: "string", required: false, description: "Position title" },
          { key: "department", label: "Department", type: "string", required: false, description: "Assigned department or team" },
          { key: "status", label: "Employment Status", type: "string", required: false, description: "Active, On Leave, Terminated" },
        ],
      },
    ],
  },
  {
    id: "tasks",
    label: "Tasks & Workflows",
    description: "Action items, task management, and project deliverables",
    entities: [
      {
        id: "Task",
        name: "Task",
        label: "Task Item",
        description: "Assignable task or workflow item",
        targetFields: [
          { key: "title", label: "Task Title", type: "string", required: true, description: "Task summary or title" },
          { key: "description", label: "Description", type: "string", required: false, description: "Detailed task instructions" },
          { key: "status", label: "Status", type: "string", required: false, description: "Pending, In Progress, Completed" },
          { key: "priority", label: "Priority", type: "string", required: false, description: "LOW, MEDIUM, HIGH, URGENT" },
          { key: "dueDate", label: "Due Date", type: "date", required: false, description: "Task completion deadline" },
        ],
      },
    ],
  },
  {
    id: "communications",
    label: "Communications & Messages",
    description: "Inbound and outbound messages, emails, and notes",
    entities: [
      {
        id: "Message",
        name: "Message",
        label: "Communication Message",
        description: "Email, chat, or webhook interaction record",
        targetFields: [
          { key: "subject", label: "Subject / Header", type: "string", required: true, description: "Message header or summary" },
          { key: "body", label: "Message Body", type: "string", required: false, description: "Full text content" },
          { key: "sender", label: "Sender", type: "string", required: false, description: "Origin email or handle" },
          { key: "recipient", label: "Recipient", type: "string", required: false, description: "Target email or handle" },
          { key: "sentAt", label: "Timestamp", type: "date", required: false, description: "Sent or received timestamp" },
        ],
      },
    ],
  },
  {
    id: "custom",
    label: "Custom Entity",
    description: "Generic schema mapping for custom webhook and API objects",
    entities: [
      {
        id: "CustomRecord",
        name: "CustomRecord",
        label: "Custom Data Record",
        description: "Arbitrary structured data record",
        targetFields: [
          { key: "recordId", label: "External Record ID", type: "string", required: true, description: "Unique identifier in source system" },
          { key: "title", label: "Primary Title / Label", type: "string", required: true, description: "Primary human-readable label" },
          { key: "data", label: "Payload / JSON Data", type: "string", required: false, description: "Full or nested payload object" },
        ],
      },
    ],
  },
];

export interface FieldMappingEntry {
  targetField: string;
  sourceField: string;
  transformationType: TransformationRuleType;
  transformationConfig?: Record<string, any>;
  defaultValue?: any;
  backendMappingId?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "ERROR";
  isDirty?: boolean;
  isPersisted?: boolean;
  validationError?: string | null;
  confidence?: number;
  confidenceTier?: ConfidenceTier;
  matchReason?: string;
  isSuggested?: boolean;
  isConfirmed?: boolean;
}

export interface EntitySelectionMappingFlowProps {
  connector: Connector | null;
  integrationId?: string | null;
  discoveredSchema: DiscoveredSchemaResponse | null;
  selectedModuleId: string;
  selectedEntityId?: string;
  onModuleChange: (moduleId: string, entityName: string) => void;
  onValidationChange?: (isValid: boolean, missingRequiredFields: string[]) => void;
  onMappingsChange?: (mappingsRecord: Record<string, string>, rawEntries: FieldMappingEntry[]) => void;
  initialMappings?: Record<string, string>;
  disabled?: boolean;
}

export function EntitySelectionMappingFlow({
  connector,
  integrationId,
  discoveredSchema,
  selectedModuleId,
  selectedEntityId,
  onModuleChange,
  onValidationChange,
  onMappingsChange,
  initialMappings,
  disabled = false,
}: EntitySelectionMappingFlowProps) {
  // Mapping state: targetField -> FieldMappingEntry
  const [mappingEntries, setMappingEntries] = useState<Record<string, FieldMappingEntry>>({});
  const [isLoadingBackendMappings, setIsLoadingBackendMappings] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [selectedDiscoveredEntityName, setSelectedDiscoveredEntityName] = useState<string>("");
  const [expandedTransformField, setExpandedTransformField] = useState<string | null>(null);
  const [fieldFilterQuery, setFieldFilterQuery] = useState<string>("");
  const [previewStates, setPreviewStates] = useState<
    Record<
      string,
      {
        loading: boolean;
        original?: string;
        result?: string;
        error?: string;
        steps?: TransformationStepTrace[];
      }
    >
  >({});
  const [savingFieldKeys, setSavingFieldKeys] = useState<Record<string, boolean>>({});

  // 1. Resolve Available Target Modules & Entities dynamically from Connector configSchema or Default Catalog
  const availableModules = useMemo<TargetModuleDefinition[]>(() => {
    if (connector?.configSchema?.modules && Array.isArray(connector.configSchema.modules) && connector.configSchema.modules.length > 0) {
      return connector.configSchema.modules.map((m: any) => {
        const matchingDefault = DEFAULT_TARGET_MODULES.find((dm) => dm.id.toLowerCase() === (m.id || "").toLowerCase());
        const entities: TargetEntityDefinition[] = Array.isArray(m.entities)
          ? m.entities.map((e: any) => {
            if (typeof e === "string") {
              const defEntity = matchingDefault?.entities.find((de) => de.name.toLowerCase() === e.toLowerCase()) || {
                id: e,
                name: e,
                label: e,
                targetFields: [
                  { key: "id", label: "Identifier", type: "string", required: true },
                  { key: "name", label: "Name / Title", type: "string", required: true },
                  { key: "data", label: "Attributes", type: "string", required: false },
                ],
              };
              return defEntity;
            }
            return e;
          })
          : matchingDefault?.entities || [
            {
              id: m.id || "Entity",
              name: m.name || m.id || "Entity",
              label: m.name || m.id || "Entity",
              targetFields: matchingDefault?.entities[0]?.targetFields || [
                { key: "id", label: "Record ID", type: "string", required: true },
                { key: "name", label: "Name / Label", type: "string", required: true },
              ],
            },
          ];

        return {
          id: m.id,
          label: m.name || m.id,
          description: m.description || matchingDefault?.description,
          entities,
        };
      });
    }
    return DEFAULT_TARGET_MODULES;
  }, [connector]);

  // Selected Target Module
  const currentModule = useMemo(() => {
    return availableModules.find((m) => m.id === selectedModuleId) || availableModules[0];
  }, [availableModules, selectedModuleId]);

  // Selected Target Entity
  const currentEntity = useMemo(() => {
    if (selectedEntityId) {
      const match = currentModule.entities.find((e) => e.id === selectedEntityId || e.name === selectedEntityId);
      if (match) return match;
    }
    return currentModule.entities[0];
  }, [currentModule, selectedEntityId]);

  // 2. Discovered External Source Entities & Fields from Schema Discovery Step ONLY
  const discoveredEntities = useMemo<DiscoveredEntity[]>(() => {
    return discoveredSchema?.entities || [];
  }, [discoveredSchema]);

  const activeDiscoveredEntity = useMemo<DiscoveredEntity | null>(() => {
    if (discoveredEntities.length === 0) return null;
    if (selectedDiscoveredEntityName) {
      const match = discoveredEntities.find((e) => e.name === selectedDiscoveredEntityName || e.id === selectedDiscoveredEntityName);
      if (match) return match;
    }
    return discoveredEntities[0];
  }, [discoveredEntities, selectedDiscoveredEntityName]);

  // Flatten discovered fields with dot-notation for nested structures — ZERO MOCK DATA
  const flattenedSourceFields = useMemo(() => {
    const result: Array<{
      path: string;
      name: string;
      type: string;
      label?: string;
      required?: boolean;
      sampleValue?: any;
      description?: string;
    }> = [];

    // 1. If active discovered entity has fields, extract recursively
    if (activeDiscoveredEntity?.fields && activeDiscoveredEntity.fields.length > 0) {
      function traverse(fields: DiscoveredField[], parentPath = "") {
        for (const f of fields) {
          const fieldName = f.name || f.path || "field";
          const fullPath = f.path || (parentPath ? `${parentPath}.${fieldName}` : fieldName);

          result.push({
            path: fullPath,
            name: fieldName,
            type: f.type || f.dataType || "string",
            label: f.label || fieldName,
            required: f.required || f.isRequired || false,
            sampleValue:
              f.sampleValue ??
              f.sample ??
              f.example ??
              (f.name ? activeDiscoveredEntity?.sampleRecords?.[0]?.[f.name] : undefined) ??
              (f.path ? activeDiscoveredEntity?.sampleRecords?.[0]?.[f.path] : undefined),
            description: f.description,
          });

          if (Array.isArray(f.fields) && f.fields.length > 0) {
            traverse(f.fields, fullPath);
          } else if (Array.isArray(f.children) && f.children.length > 0) {
            traverse(f.children, fullPath);
          }
        }
      }
      traverse(activeDiscoveredEntity.fields);
      return result;
    }

    // 2. If top-level discovered schema has fields directly
    if (discoveredSchema?.fields && discoveredSchema.fields.length > 0) {
      discoveredSchema.fields.forEach((f) => {
        const fieldName = f.name || f.path || "field";
        result.push({
          path: f.path || fieldName,
          name: fieldName,
          type: f.type || "string",
          label: f.label || fieldName,
          required: f.required || false,
          sampleValue: f.sampleValue ?? f.sample ?? f.example,
          description: f.description,
        });
      });
      return result;
    }

    // 3. If connector has configSchema fields
    if (connector?.configSchema?.fields && Array.isArray(connector.configSchema.fields) && connector.configSchema.fields.length > 0) {
      connector.configSchema.fields.forEach((cf) => {
        result.push({
          path: cf.name,
          name: cf.name,
          type: cf.type || "string",
          label: cf.label || cf.name,
          required: cf.required || false,
          sampleValue: cf.defaultValue,
          description: cf.description,
        });
      });
      return result;
    }

    // Return strictly empty array if schema discovery has not been completed
    return result;
  }, [activeDiscoveredEntity, discoveredSchema, connector]);

  // 3. Load Existing Mappings from Backend if active integrationId is present
  const loadBackendMappings = useCallback(async () => {
    if (!integrationId) return;

    setIsLoadingBackendMappings(true);
    setBackendError(null);

    try {
      let rawMappings: any[] = [];
      try {
        const schemaRes = await getSchemaMappingApi(integrationId);
        if (schemaRes && Array.isArray(schemaRes.mappings) && schemaRes.mappings.length > 0) {
          rawMappings = schemaRes.mappings;
        }
      } catch {
        // Fallback to /api/v1/integrations/:id/mappings
      }

      if (rawMappings.length === 0) {
        rawMappings = await getIntegrationMappingsApi(integrationId, {
          targetEntity: currentEntity.name,
        });
      }

      setMappingEntries((prev) => {
        const next = { ...prev };
        rawMappings.forEach((bm) => {
          if (bm.targetField) {
            const isSugg = Boolean(bm.isSuggested || bm.status === "SUGGESTED");
            const conf = typeof bm.confidence === "number" ? bm.confidence : 1.0;
            const tier: ConfidenceTier = conf >= 0.8 ? "high" : conf >= 0.6 ? "medium" : "low";

            next[bm.targetField] = {
              targetField: bm.targetField,
              sourceField: bm.sourceField || "",
              transformationType:
                (bm.transformation?.type as TransformationRuleType) ||
                (typeof bm.transformation === "string" ? bm.transformation : "none"),
              transformationConfig: bm.transformation?.config,
              defaultValue: bm.defaultValue ?? bm.transformation?.defaultValue,
              backendMappingId: bm.id,
              status: bm.status || "ACTIVE",
              isDirty: false,
              isPersisted: true,
              confidence: conf,
              confidenceTier: tier,
              matchReason: bm.matchReason || (isSugg ? "Backend suggested mapping" : "User confirmed mapping"),
              isSuggested: isSugg,
              isConfirmed: !isSugg,
              validationError: null,
            };
          }
        });
        return next;
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load existing integration mappings";
      setBackendError(msg);
    } finally {
      setIsLoadingBackendMappings(false);
    }
  }, [integrationId, currentEntity.name]);

  useEffect(() => {
    if (integrationId) {
      loadBackendMappings();
    }
  }, [integrationId, loadBackendMappings]);

  // Automatically compute suggested mappings from discovered source schema
  useEffect(() => {
    if (flattenedSourceFields.length === 0 || currentEntity.targetFields.length === 0) return;

    const suggestions = generateMappingSuggestions(
      currentEntity.targetFields,
      flattenedSourceFields,
      mappingEntries
    );

    setMappingEntries((prev) => {
      let hasUpdates = false;
      const next = { ...prev };

      suggestions.forEach((sugg) => {
        const existing = next[sugg.targetFieldKey];
        // Never override an existing user-confirmed mapping
        if (existing?.isConfirmed) return;

        // If field is unmapped or currently an unconfirmed suggestion, apply suggestion
        if (!existing?.sourceField || existing.isSuggested) {
          next[sugg.targetFieldKey] = {
            targetField: sugg.targetFieldKey,
            sourceField: sugg.sourceFieldPath,
            transformationType: existing?.transformationType || "none",
            transformationConfig: existing?.transformationConfig,
            defaultValue: existing?.defaultValue,
            backendMappingId: existing?.backendMappingId,
            status: "ACTIVE",
            isDirty: existing?.isDirty || false,
            isPersisted: existing?.isPersisted || false,
            confidence: sugg.confidence,
            confidenceTier: sugg.confidenceTier,
            matchReason: sugg.reason,
            isSuggested: true,
            isConfirmed: false,
            validationError: null,
          };
          hasUpdates = true;
        }
      });

      return hasUpdates ? next : prev;
    });
  }, [flattenedSourceFields, currentEntity.targetFields]);

  // Seed initial mappings once if passed from parent form state
  const isInitializedRef = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isInitializedRef.current && initialMappings && Object.keys(initialMappings).length > 0) {
      isInitializedRef.current = true;
      setMappingEntries((prev) => {
        const next = { ...prev };
        Object.entries(initialMappings).forEach(([targetKey, sourcePath]) => {
          if (!next[targetKey] && sourcePath) {
            next[targetKey] = {
              targetField: targetKey,
              sourceField: sourcePath,
              transformationType: "none",
              status: "ACTIVE",
              isDirty: true,
              isPersisted: false,
              isConfirmed: true,
              isSuggested: false,
              confidence: 1.0,
              confidenceTier: "high",
              validationError: null,
            };
          }
        });
        return next;
      });
    }
  }, [initialMappings]);

  // 4. Accept a single suggested mapping with strict required-field validation
  const handleAcceptSuggestion = (targetKey: string) => {
    const targetDef = currentEntity.targetFields.find((tf) => tf.key === targetKey);
    if (!targetDef) return;

    const entry = mappingEntries[targetKey];
    if (!entry) return;

    // Strict Required Field Validation Guard:
    const check = validateFieldAcceptance(
      targetDef,
      {
        sourceFieldPath: entry.sourceField,
        defaultValue: entry.defaultValue,
        transformation:
          entry.transformationType && entry.transformationType !== "none"
            ? {
              type: entry.transformationType,
              defaultValue: entry.defaultValue,
              config: entry.transformationConfig,
            }
            : undefined,
      },
      flattenedSourceFields.map((f) => f.path)
    );

    if (!check.canAccept) {
      toast.error(check.error || `Cannot accept required field '${targetDef.label}'.`);
      setMappingEntries((prev) => ({
        ...prev,
        [targetKey]: {
          ...prev[targetKey],
          validationError: check.error,
        },
      }));
      return;
    }

    setMappingEntries((prev) => ({
      ...prev,
      [targetKey]: {
        ...prev[targetKey],
        isConfirmed: true,
        isSuggested: false,
        isDirty: true,
        validationError: null,
      },
    }));

    toast.success(`Confirmed mapping for ${targetDef.label}`);
  };

  // Reject a single suggestion
  const handleRejectSuggestion = (targetKey: string) => {
    const targetDef = currentEntity.targetFields.find((tf) => tf.key === targetKey);
    setMappingEntries((prev) => {
      const next = { ...prev };
      delete next[targetKey];
      return next;
    });
    toast.info(`Rejected suggestion for ${targetDef?.label || targetKey}`);
  };

  // Edit suggestion or confirmed mapping
  const handleEditMapping = (targetKey: string) => {
    setExpandedTransformField((prev) => (prev === targetKey ? null : targetKey));
  };

  // Accept all valid suggestions
  const handleAcceptAllValidSuggestions = () => {
    let acceptedCount = 0;
    const blockedRequired: string[] = [];

    setMappingEntries((prev) => {
      const next = { ...prev };

      currentEntity.targetFields.forEach((tf) => {
        const entry = next[tf.key];
        if (entry && entry.isSuggested && !entry.isConfirmed) {
          const check = validateFieldAcceptance(
            tf,
            {
              sourceFieldPath: entry.sourceField,
              defaultValue: entry.defaultValue,
              transformation:
                entry.transformationType && entry.transformationType !== "none"
                  ? {
                    type: entry.transformationType,
                    defaultValue: entry.defaultValue,
                    config: entry.transformationConfig,
                  }
                  : undefined,
            },
            flattenedSourceFields.map((f) => f.path)
          );

          if (check.canAccept) {
            next[tf.key] = {
              ...entry,
              isConfirmed: true,
              isSuggested: false,
              isDirty: true,
              validationError: null,
            };
            acceptedCount++;
          } else {
            blockedRequired.push(tf.label || tf.key);
            next[tf.key] = {
              ...entry,
              validationError: check.error,
            };
          }
        }
      });

      return next;
    });

    if (acceptedCount > 0) {
      toast.success(`Accepted ${acceptedCount} suggested mappings.`);
    }

    if (blockedRequired.length > 0) {
      toast.error(
        `${blockedRequired.length} required field(s) could not be accepted automatically: ${blockedRequired.join(
          ", "
        )}. Please assign valid source fields or explicit default values.`
      );
    } else if (acceptedCount === 0) {
      toast.info("No pending suggestions available to accept.");
    }
  };

  // Reject all unconfirmed suggestions
  const handleRejectAllSuggestions = () => {
    let count = 0;
    setMappingEntries((prev) => {
      const next = { ...prev };
      currentEntity.targetFields.forEach((tf) => {
        const entry = next[tf.key];
        if (entry && entry.isSuggested && !entry.isConfirmed) {
          delete next[tf.key];
          count++;
        }
      });
      return next;
    });
    if (count > 0) {
      toast.info(`Rejected ${count} suggestions.`);
    } else {
      toast.info("No pending suggestions to reject.");
    }
  };

  // 5. Smart Auto-Map Matching
  const handleAutoMap = () => {
    if (flattenedSourceFields.length === 0) {
      toast.info("No discovered external schema fields available to auto-map.");
      return;
    }

    handleAcceptAllValidSuggestions();
  };

  // Clear all mappings
  const handleClearAllMappings = () => {
    setMappingEntries({});
    setExpandedTransformField(null);
    setSavingFieldKeys({});
    if (onMappingsChange) {
      onMappingsChange({}, []);
    }
    toast.info("Cleared all field mappings.");
  };

  // Update a single mapping entry
  const handleSourceFieldSelect = (targetKey: string, sourcePath: string) => {
    setMappingEntries((prev) => {
      const existing = prev[targetKey];
      if (!sourcePath) {
        const updated = { ...prev };
        delete updated[targetKey];
        return updated;
      }
      return {
        ...prev,
        [targetKey]: {
          targetField: targetKey,
          sourceField: sourcePath,
          transformationType: existing?.transformationType || "none",
          transformationConfig: existing?.transformationConfig,
          defaultValue: existing?.defaultValue,
          backendMappingId: existing?.backendMappingId,
          status: existing?.status || "ACTIVE",
          isDirty: true,
          isPersisted: existing?.isPersisted || false,
          validationError: null,
        },
      };
    });
  };

  // Transformation update
  const handleTransformationTypeChange = (targetKey: string, ruleType: TransformationRuleType) => {
    setMappingEntries((prev) => {
      const existing = prev[targetKey];
      if (!existing) return prev;
      return {
        ...prev,
        [targetKey]: {
          ...existing,
          transformationType: ruleType,
          transformationConfig: {},
          isDirty: true,
          validationError: null,
        },
      };
    });
  };

  const handleTransformationConfigParamChange = (targetKey: string, paramKey: string, value: any) => {
    setMappingEntries((prev) => {
      const existing = prev[targetKey];
      if (!existing) return prev;
      return {
        ...prev,
        [targetKey]: {
          ...existing,
          transformationConfig: {
            ...(existing.transformationConfig || {}),
            [paramKey]: value,
          },
          isDirty: true,
          validationError: null,
        },
      };
    });
  };

  const handleDefaultValueChange = (targetKey: string, defaultVal: string) => {
    setMappingEntries((prev) => {
      const existing = prev[targetKey];
      if (!existing) return prev;
      return {
        ...prev,
        [targetKey]: {
          ...existing,
          defaultValue: defaultVal,
          isDirty: true,
          validationError: null,
        },
      };
    });
  };

  // 5. Direct Save Mapping to Backend API
  const handleSaveMappingDirectly = async (targetKey: string) => {
    if (!integrationId) {
      toast.error("Save is only available after the integration instance has been created.");
      return;
    }

    const entry = mappingEntries[targetKey];
    if (!entry || !entry.sourceField) {
      toast.error("Please select a source field first.");
      return;
    }

    setSavingFieldKeys((prev) => ({ ...prev, [targetKey]: true }));

    try {
      const sourceEntName = activeDiscoveredEntity?.name || activeDiscoveredEntity?.label || "DefaultEntity";
      const targetEntName = currentEntity.name;

      const transformationPayload = {
        type: entry.transformationType || "none",
        config: entry.transformationConfig || {},
        defaultValue: entry.defaultValue || undefined,
      };

      if (entry.backendMappingId) {
        // PATCH /api/v1/integrations/:id/mappings/:mappingId
        const updatePayload: UpdateMappingRequest = {
          sourceEntity: sourceEntName,
          sourceField: entry.sourceField,
          targetEntity: targetEntName,
          targetField: targetKey,
          status: entry.status,
          transformation: transformationPayload,
        };
        const updated = await updateIntegrationMappingApi(integrationId, entry.backendMappingId, updatePayload);
        setMappingEntries((prev) => ({
          ...prev,
          [targetKey]: {
            ...prev[targetKey],
            backendMappingId: updated.id,
            isDirty: false,
            isPersisted: true,
            validationError: null,
          },
        }));
        toast.success(`Updated mapping for ${targetKey}`);
      } else {
        // POST /api/v1/integrations/:id/mappings
        const createPayload: CreateMappingRequest = {
          sourceEntity: sourceEntName,
          sourceField: entry.sourceField,
          targetEntity: targetEntName,
          targetField: targetKey,
          status: entry.status || "ACTIVE",
          confidence: 1,
          required: currentEntity.targetFields.find((tf) => tf.key === targetKey)?.required || false,
          transformation: transformationPayload,
        };
        const created = await createIntegrationMappingApi(integrationId, createPayload);
        setMappingEntries((prev) => ({
          ...prev,
          [targetKey]: {
            ...prev[targetKey],
            backendMappingId: created.id,
            isDirty: false,
            isPersisted: true,
            validationError: null,
          },
        }));
        toast.success(`Saved mapping for ${targetKey}`);
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to persist mapping";
      setMappingEntries((prev) => ({
        ...prev,
        [targetKey]: {
          ...prev[targetKey],
          validationError: errMsg,
        },
      }));
      toast.error(errMsg);
    } finally {
      setSavingFieldKeys((prev) => ({ ...prev, [targetKey]: false }));
    }
  };

  // Direct Delete Mapping from Backend API
  const handleDeleteMappingDirectly = async (targetKey: string) => {
    const entry = mappingEntries[targetKey];
    if (!entry) return;

    if (integrationId && entry.backendMappingId) {
      setSavingFieldKeys((prev) => ({ ...prev, [targetKey]: true }));
      try {
        await deleteIntegrationMappingApi(integrationId, entry.backendMappingId);
        toast.success(`Deleted mapping for ${targetKey}`);
      } catch (err: any) {
        const errMsg = err?.response?.data?.message || err?.message || "Failed to delete mapping";
        toast.error(errMsg);
        setSavingFieldKeys((prev) => ({ ...prev, [targetKey]: false }));
        return;
      } finally {
        setSavingFieldKeys((prev) => ({ ...prev, [targetKey]: false }));
      }
    }

    setMappingEntries((prev) => {
      const next = { ...prev };
      delete next[targetKey];
      return next;
    });
  };

  // 6. Test / Preview Transformation (Deterministic Sandboxed Engine + Live Backend API)
  const handlePreviewTransformation = async (targetKey: string) => {
    const entry = mappingEntries[targetKey];
    if (!entry || !entry.sourceField) return;

    const sourceFieldObj = flattenedSourceFields.find((f) => f.path === entry.sourceField);
    const sampleVal = String(sourceFieldObj?.sampleValue ?? "Sample Value");

    const rules = [];
    if (entry.transformationType && entry.transformationType !== "none") {
      rules.push({
        type: entry.transformationType,
        params:
          entry.transformationType === "DEFAULT_VALUE"
            ? { defaultValue: entry.defaultValue }
            : entry.transformationConfig,
      });
    }

    // 1. Run immediate deterministic transformation locally
    const clientTrace = executeTransformationPipeline(sampleVal, rules);
    setPreviewStates((prev) => ({
      ...prev,
      [targetKey]: {
        loading: false,
        original: clientTrace.originalValue,
        result: clientTrace.transformedValue,
        steps: clientTrace.steps,
      },
    }));

    // 2. If integrationId is present, optionally sync with backend preview
    if (integrationId && rules.length > 0) {
      try {
        const res = await previewTransformationApi(integrationId, {
          sampleValue: sampleVal,
          rules,
        });

        if (res?.data?.transformedValue) {
          setPreviewStates((prev) => ({
            ...prev,
            [targetKey]: {
              loading: false,
              original: res?.data?.originalValue || clientTrace.originalValue,
              result: res?.data?.transformedValue,
              steps: res?.data?.steps || clientTrace.steps,
            },
          }));
        }
      } catch {
        // Fallback to pure deterministic client output already shown
      }
    }
  };

  // 7. Compute Required Field Validation & Safeguards
  const validationStatus = useMemo(() => {
    const requiredFields = currentEntity.targetFields.filter((tf) => tf.required);
    const missingFields: string[] = [];

    requiredFields.forEach((rf) => {
      const mapped = mappingEntries[rf.key];
      const acceptance = validateFieldAcceptance(
        rf,
        mapped
          ? {
            sourceFieldPath: mapped.sourceField,
            defaultValue: mapped.defaultValue,
            transformation:
              mapped.transformationType && mapped.transformationType !== "none"
                ? {
                  type: mapped.transformationType,
                  defaultValue: mapped.defaultValue,
                  config: mapped.transformationConfig,
                }
                : undefined,
          }
          : null,
        flattenedSourceFields.map((f) => f.path)
      );

      if (!acceptance.canAccept) {
        missingFields.push(rf.label || rf.key);
      }
    });

    const isSatisfied = missingFields.length === 0;
    const totalCount = currentEntity.targetFields.length;
    const mappedCount = currentEntity.targetFields.filter(
      (tf) => mappingEntries[tf.key]?.sourceField && mappingEntries[tf.key]?.sourceField.trim() !== ""
    ).length;

    return {
      isValid: isSatisfied,
      missingRequiredFields: missingFields,
      totalCount,
      mappedCount,
      requiredCount: requiredFields.length,
      satisfiedRequiredCount: requiredFields.length - missingFields.length,
    };
  }, [currentEntity.targetFields, mappingEntries, flattenedSourceFields]);

  // Synchronize validation & mappings changes to parent safely
  const prevValidationRef = useRef<string>("");
  useEffect(() => {
    if (onValidationChange) {
      const serialized = JSON.stringify({
        isValid: validationStatus.isValid,
        missing: validationStatus.missingRequiredFields,
      });
      if (prevValidationRef.current !== serialized) {
        prevValidationRef.current = serialized;
        onValidationChange(validationStatus.isValid, validationStatus.missingRequiredFields);
      }
    }
  }, [validationStatus.isValid, validationStatus.missingRequiredFields, onValidationChange]);

  const prevMappingsRef = useRef<string>("");
  useEffect(() => {
    if (onMappingsChange) {
      const record: Record<string, string> = {};
      const entries: FieldMappingEntry[] = [];
      Object.entries(mappingEntries).forEach(([k, entry]) => {
        if (entry.sourceField) {
          record[k] = entry.sourceField;
          entries.push(entry);
        }
      });
      const serialized = JSON.stringify(record);
      if (prevMappingsRef.current !== serialized) {
        prevMappingsRef.current = serialized;
        onMappingsChange(record, entries);
      }
    }
  }, [mappingEntries, onMappingsChange]);

  // Filtered target fields for search
  const filteredTargetFields = useMemo(() => {
    if (!fieldFilterQuery.trim()) return currentEntity.targetFields;
    const q = fieldFilterQuery.toLowerCase().trim();
    return currentEntity.targetFields.filter((tf) => {
      return (
        tf.key.toLowerCase().includes(q) ||
        tf.label.toLowerCase().includes(q) ||
        (tf.description || "").toLowerCase().includes(q) ||
        (tf.type || "").toLowerCase().includes(q)
      );
    });
  }, [currentEntity.targetFields, fieldFilterQuery]);

  // Counts of automatic suggestions vs confirmed mappings
  const suggestionsCount = useMemo(() => {
    return Object.values(mappingEntries).filter((m) => m.isSuggested && !m.isConfirmed).length;
  }, [mappingEntries]);

  const confirmedCount = useMemo(() => {
    return Object.values(mappingEntries).filter((m) => m.isConfirmed && m.sourceField).length;
  }, [mappingEntries]);

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      {/* ── Top Target Entity & Module Selection Bar ──────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Target Module Selector */}
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-text flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Zyoris Target Module
            </label>
            <select
              value={selectedModuleId}
              disabled={disabled}
              onChange={(e) => {
                const newModId = e.target.value;
                const newMod = availableModules.find((m) => m.id === newModId) || availableModules[0];
                const newEntityName = newMod.entities[0]?.name || newMod.id;
                setMappingEntries({});
                setExpandedTransformField(null);
                setSavingFieldKeys({});
                if (onMappingsChange) {
                  onMappingsChange({}, []);
                }
                onModuleChange(newModId, newEntityName);
              }}
              className="w-full px-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-medium transition-colors"
            >
              {availableModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            {currentModule.description && (
              <p className="text-[11px] text-text-muted mt-0.5">{currentModule.description}</p>
            )}
          </div>

          {/* Target Entity Selector (if module has multiple entities) */}
          {currentModule.entities.length > 1 && (
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-text flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-info" />
                Target Entity
              </label>
              <select
                value={currentEntity.id}
                disabled={disabled}
                onChange={(e) => {
                  const newEntityName = e.target.value;
                  setMappingEntries({});
                  setExpandedTransformField(null);
                  setSavingFieldKeys({});
                  if (onMappingsChange) {
                    onMappingsChange({}, []);
                  }
                  onModuleChange(currentModule.id, newEntityName);
                }}
                className="w-full px-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-medium transition-colors"
              >
                {currentModule.entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.label} ({ent.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Source Discovered Entity Selector (if remote has multiple discovered entities) */}
          {discoveredEntities.length > 1 && (
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-text flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-warning" />
                Discovered Source Entity
              </label>
              <select
                value={activeDiscoveredEntity?.name || ""}
                disabled={disabled}
                onChange={(e) => setSelectedDiscoveredEntityName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none font-medium transition-colors"
              >
                {discoveredEntities.map((de) => (
                  <option key={de.name || de.id} value={de.name || de.id}>
                    {de.label || de.name} ({de.fields?.length || 0} fields)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty Schema Discovery Warning Banner (No fake data!) ────────────────────────── */}
      {flattenedSourceFields.length === 0 && (
        <div className="p-4 rounded-xl border border-warning/30 bg-warning/10 text-warning flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-warning" />
          <div className="text-xs">
            <h5 className="font-bold text-warning">No Discovered Schema Fields Detected</h5>
            <p className="text-text-secondary mt-0.5">
              Source fields are populated directly from the Schema Discovery step. Ensure you have run schema discovery
              against the connected connector before proceeding with field mapping.
            </p>
          </div>
        </div>
      )}

      {/* ── Required Field Validation Alert Banner ────────────────────────────────────────── */}
      {!validationStatus.isValid && (
        <div className="p-3.5 rounded-xl border border-error/30 bg-error/10 text-error flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-error" />
          <div className="text-xs flex-1">
            <h5 className="font-bold text-error">
              Required Target Fields Missing ({validationStatus.missingRequiredFields.length})
            </h5>
            <p className="text-text-secondary mt-0.5">
              Before proceeding, all required Zyoris target fields must be mapped to external schema fields:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {validationStatus.missingRequiredFields.map((fieldLabel) => (
                <span
                  key={fieldLabel}
                  className="px-2 py-0.5 rounded-md bg-error/20 text-error border border-error/30 font-semibold text-[11px]"
                >
                  * {fieldLabel}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Action Toolbar: Auto-Map, Suggestions, Clear, Search, Mapping Stats ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {suggestionsCount > 0 && (
            <button
              type="button"
              onClick={handleAcceptAllValidSuggestions}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-xs disabled:opacity-50"
              title="Accept all automatic suggestions that satisfy validation requirements"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept All Suggestions ({suggestionsCount})</span>
            </button>
          )}

          {suggestionsCount > 0 && (
            <button
              type="button"
              onClick={handleRejectAllSuggestions}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:text-error hover:border-error/30 transition-colors font-medium text-[11px]"
              title="Reject all unconfirmed automatic suggestions"
            >
              <X className="w-3 h-3 text-text-muted hover:text-error" />
              <span>Reject All</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAutoMap}
            disabled={disabled || flattenedSourceFields.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold transition-all shadow-xs disabled:opacity-50"
            title="Auto-match remote fields to target fields based on name similarity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Map Matching Fields</span>
          </button>

          {validationStatus.mappedCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllMappings}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:text-text hover:bg-surface-hover transition-colors font-medium text-[11px]"
            >
              <RotateCcw className="w-3 h-3 text-text-muted" />
              <span>Reset</span>
            </button>
          )}

          {confirmedCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {confirmedCount} Confirmed
            </span>
          )}

          <span className="px-2.5 py-1 rounded-lg bg-surface border border-border font-semibold text-text text-[11px]">
            {validationStatus.mappedCount} of {validationStatus.totalCount} Mapped (
            {validationStatus.satisfiedRequiredCount}/{validationStatus.requiredCount} Required)
          </span>
        </div>

        {/* Search / Filter Target Fields */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={fieldFilterQuery}
            onChange={(e) => setFieldFilterQuery(e.target.value)}
            placeholder="Filter target fields..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none"
          />
          {fieldFilterQuery && (
            <button
              type="button"
              onClick={() => setFieldFilterQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              aria-label="Clear filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Mapping Grid Table ───────────────────────────────────────────────────────────── */}
      {isLoadingBackendMappings ? (
        <div className="p-10 border border-border rounded-xl bg-surface flex flex-col items-center justify-center text-center space-y-2 flex-1">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-xs font-semibold text-text">Loading configured mappings from backend...</p>
        </div>
      ) : backendError ? (
        <div className="p-6 border border-error/30 bg-error/5 rounded-xl flex items-center justify-between text-xs text-error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{backendError}</span>
          </div>
          <button
            type="button"
            onClick={loadBackendMappings}
            className="px-3 py-1 rounded-lg bg-error text-white font-semibold hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-surface overflow-y-auto min-h-[300px] max-h-[420px] shadow-xs relative">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 shadow-xs bg-white">
              <tr>
                <th className="bg-surface-secondary py-2.5 px-3 font-bold uppercase text-[10px] w-4/12 text-text-muted border-b border-border sticky top-0 z-20">
                  Zyoris Target Field ({currentEntity.label})
                </th>
                <th className="bg-surface-secondary py-2.5 px-2 font-bold uppercase text-[10px] w-3/12 text-text-muted border-b border-border sticky top-0 z-20">
                  Status & Confidence
                </th>
                <th className="bg-surface-secondary py-2.5 px-3 font-bold uppercase text-[10px] w-3/12 text-text-muted border-b border-border sticky top-0 z-20">
                  Discovered Source Field ({connector?.name || "Provider"})
                </th>
                <th className="bg-surface-secondary py-2.5 px-2 font-bold uppercase text-[10px] text-right w-2/12 text-text-muted border-b border-border sticky top-0 z-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTargetFields.map((tf) => {
                const entry = mappingEntries[tf.key];
                const isMapped = !!entry?.sourceField;
                const isRequired = !!tf.required;
                const isSuggested = Boolean(entry?.isSuggested && !entry?.isConfirmed);
                const isConfirmed = Boolean(entry?.isConfirmed && (isMapped || entry?.defaultValue));
                const isMissingRequired = isRequired && !isMapped && !entry?.defaultValue;
                const isExpanded = expandedTransformField === tf.key;
                const isSaving = !!savingFieldKeys[tf.key];

                const confidence = entry?.confidence ?? 0;
                const confidencePct = Math.round(confidence * 100);
                const confidenceTier =
                  entry?.confidenceTier ||
                  (confidence >= 0.8 ? "high" : confidence >= 0.6 ? "medium" : "low");

                return (
                  <React.Fragment key={tf.key}>
                    <tr
                      className={`hover:bg-surface-hover transition-colors ${isMissingRequired
                          ? "bg-error/5 border-l-4 border-l-error"
                          : isSuggested
                            ? "bg-indigo-50/15 dark:bg-indigo-950/20 border-l-4 border-l-indigo-500"
                            : isConfirmed
                              ? "bg-emerald-50/10 dark:bg-emerald-950/10 border-l-4 border-l-emerald-500"
                              : ""
                        }`}
                    >
                      {/* 1. Target Field Info */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-text">{tf.label}</span>
                          {isRequired ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-error/15 text-error border border-error/30">
                              * Required
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted font-mono">optional</span>
                          )}
                          {tf.type && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface-secondary text-text-muted border border-border">
                              {tf.type}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted mt-0.5">
                          {currentModule.id}.{currentEntity.name}.{tf.key}
                        </div>
                        {tf.description && (
                          <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-1">
                            {tf.description}
                          </p>
                        )}
                        {entry?.validationError && (
                          <div className="mt-1 text-[11px] text-error flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{entry.validationError}</span>
                          </div>
                        )}
                      </td>

                      {/* 2. Status & Confidence Column */}
                      <td className="py-3 px-2 align-top">
                        {isSuggested ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 shadow-2xs">
                                <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                                Suggested
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${confidenceTier === "high"
                                    ? "bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : confidenceTier === "medium"
                                      ? "bg-amber-100/80 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                                      : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                              >
                                {confidencePct}% Match • {confidenceTier.toUpperCase()}
                              </span>
                            </div>
                            {entry?.matchReason && (
                              <p
                                className="text-[10px] text-indigo-900 dark:text-indigo-300 italic line-clamp-1"
                                title={entry.matchReason}
                              >
                                {entry.matchReason}
                              </p>
                            )}
                          </div>
                        ) : isConfirmed ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Confirmed
                            </span>
                            <div className="text-[10px] text-text-muted font-mono pl-0.5">
                              User Verified
                            </div>
                          </div>
                        ) : isMissingRequired ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-error/15 text-error border border-error/30">
                              <AlertCircle className="w-3 h-3 text-error" />
                              Unmapped
                            </span>
                            <div className="text-[10px] text-error font-medium">
                              Mapping required
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] text-text-muted font-mono bg-surface-secondary border border-border">
                            Unmapped
                          </span>
                        )}
                      </td>

                      {/* 3. Discovered Source Field Select Dropdown */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1.5">
                          <select
                            value={entry?.sourceField || ""}
                            disabled={disabled || isSaving || flattenedSourceFields.length === 0}
                            onChange={(e) => handleSourceFieldSelect(tf.key, e.target.value)}
                            className={`w-full px-3 py-1.5 rounded-lg bg-surface text-text text-xs border focus:outline-none font-mono transition-colors ${isMissingRequired
                                ? "border-error focus:border-error"
                                : isSuggested
                                  ? "border-indigo-400 focus:border-indigo-500 bg-indigo-50/10"
                                  : isMapped
                                    ? "border-primary/50 focus:border-primary"
                                    : "border-border focus:border-primary"
                              }`}
                          >
                            <option value="">
                              {flattenedSourceFields.length === 0
                                ? "-- Run Schema Discovery First --"
                                : "-- Select Discovered Source Field --"}
                            </option>
                            {flattenedSourceFields.map((sf) => (
                              <option key={sf.path} value={sf.path}>
                                {sf.path} ({sf.type}) {sf.required ? "• Required" : ""}
                              </option>
                            ))}
                          </select>

                          {/* Source Field Sample Value / Metadata preview */}
                          {(entry?.sourceField || entry?.defaultValue) && (
                            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono px-1">
                              <span
                                className="truncate max-w-[180px]"
                                title={
                                  entry?.sourceField
                                    ? String(
                                      flattenedSourceFields.find((f) => f.path === entry.sourceField)
                                        ?.sampleValue ?? "null"
                                    )
                                    : `Default: ${entry?.defaultValue}`
                                }
                              >
                                {entry?.sourceField
                                  ? `Sample: ${String(
                                    flattenedSourceFields.find((f) => f.path === entry.sourceField)
                                      ?.sampleValue ?? "null"
                                  )}`
                                  : `Default: ${entry?.defaultValue}`}
                              </span>

                              {/* Toggle Transformation Editor */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTransformField(isExpanded ? null : tf.key)
                                }
                                className="text-primary hover:underline flex items-center gap-1 font-sans font-semibold text-[10px]"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>
                                  {entry?.transformationType && entry.transformationType !== "none"
                                    ? `Rule: ${entry.transformationType}`
                                    : "Transform"}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Row Actions */}
                      <td className="py-3 px-2 text-right align-top">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isSuggested ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptSuggestion(tf.key)}
                                disabled={disabled || isSaving}
                                title="Accept automatic suggestion"
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>Accept</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectSuggestion(tf.key)}
                                disabled={disabled || isSaving}
                                title="Reject automatic suggestion"
                                className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-surface text-text-secondary hover:text-error hover:border-error/30 hover:bg-error/10 font-semibold text-[11px] transition-colors"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditMapping(tf.key)}
                                disabled={disabled || isSaving}
                                title="Customize / Edit mapping"
                                className="p-1 rounded-md border border-border bg-surface text-text-secondary hover:text-primary hover:border-primary/30 text-[11px] transition-colors"
                              >
                                <Sliders className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              {integrationId && isMapped && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveMappingDirectly(tf.key)}
                                  disabled={disabled || isSaving}
                                  title={
                                    entry?.isPersisted && !entry.isDirty
                                      ? "Saved to backend"
                                      : "Save mapping to backend"
                                  }
                                  className={`p-1.5 rounded-lg border transition-colors ${entry?.isPersisted && !entry.isDirty
                                      ? "bg-success/10 text-success border-success/30"
                                      : "bg-surface hover:bg-surface-hover text-text border-border"
                                    }`}
                                >
                                  {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                  ) : entry?.isPersisted && !entry.isDirty ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {isMapped && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMappingDirectly(tf.key)}
                                  disabled={disabled || isSaving}
                                  title="Remove mapping"
                                  className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-error hover:border-error/30 hover:bg-error/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Transformation Configuration Drawer */}
                    {isExpanded && (
                      <tr className="bg-surface-secondary/50">
                        <td colSpan={4} className="p-3 border-t border-b border-border/70">
                          <TransformationRuleEditor
                            initialType={(entry.transformationType as any) || "none"}
                            initialConfig={entry.transformationConfig || {}}
                            initialDefaultValue={entry.defaultValue || ""}
                            initialRules={
                              Array.isArray(entry.transformationConfig?.rules)
                                ? entry.transformationConfig.rules
                                : undefined
                            }
                            sourceSampleValue={
                              flattenedSourceFields.find((f) => f.path === entry?.sourceField)?.sampleValue ??
                              entry?.defaultValue ??
                              undefined
                            }
                            targetFieldLabel={tf.label}
                            targetFieldKey={tf.key}
                            integrationId={integrationId || undefined}
                            disabled={disabled}
                            onChange={({ primaryType, config, defaultValue, rules }) => {
                              handleTransformationTypeChange(tf.key, primaryType);
                              if (defaultValue !== undefined) {
                                handleDefaultValueChange(tf.key, defaultValue);
                              }
                              handleTransformationConfigParamChange(tf.key, "rules", rules);
                              Object.entries(config).forEach(([k, v]) => {
                                handleTransformationConfigParamChange(tf.key, k, v);
                              });
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
