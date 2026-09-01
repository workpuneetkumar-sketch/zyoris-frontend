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
} from "@/types/integrations";
import {
  getIntegrationMappingsApi,
  createIntegrationMappingApi,
  updateIntegrationMappingApi,
  deleteIntegrationMappingApi,
  previewTransformationApi,
} from "@/lib/api/integrationsApi";
import {
  Layers,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
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
  const [previewStates, setPreviewStates] = useState<Record<string, { loading: boolean; result?: string; error?: string }>>({});
  const [savingFieldKeys, setSavingFieldKeys] = useState<Record<string, boolean>>({});

  // 1. Resolve Available Target Modules & Entities dynamically from Connector configSchema or Default Catalog
  const availableModules = useMemo<TargetModuleDefinition[]>(() => {
    if (connector?.configSchema?.modules && Array.isArray(connector.configSchema.modules) && connector.configSchema.modules.length > 0) {
      // Convert connector module schema if provided by backend
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

  // 2. Discovered External Source Entities & Fields from Schema Discovery Step
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

  // Flatten discovered fields with dot-notation for nested structures
  const flattenedSourceFields = useMemo(() => {
    const result: Array<{ path: string; name: string; type: string; label?: string; required?: boolean; sampleValue?: any; description?: string }> = [];

    // 1. If discovered schema has fields, use them
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
            sampleValue: f.sampleValue ?? f.sample ?? f.example ?? (f.name ? activeDiscoveredEntity?.sampleRecords?.[0]?.[f.name] : undefined),
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

    // 2. If connector has configSchema fields or endpoint fields, use them
    if (connector?.configSchema?.fields && Array.isArray(connector.configSchema.fields) && connector.configSchema.fields.length > 0) {
      connector.configSchema.fields.forEach((cf) => {
        result.push({
          path: cf.name,
          name: cf.name,
          type: cf.type || "string",
          label: cf.label || cf.name,
          required: cf.required || false,
          sampleValue: cf.defaultValue ?? "sample_data",
          description: cf.description,
        });
      });
      return result;
    }

    // 3. Fallback candidate provider schema fields for testing / demonstration
    const providerName = (connector?.provider || connector?.name || "Provider").toLowerCase();
    const candidateFields: Array<{ path: string; name: string; type: string; label: string; required?: boolean; sampleValue?: any; description?: string }> = providerName.includes("stripe")
      ? [
          { path: "id", name: "id", type: "string", label: "Object ID", required: true, sampleValue: "ch_3MtwBwLkdIwHu7ix28a3tqPa" },
          { path: "amount", name: "amount", type: "number", label: "Amount (cents)", required: true, sampleValue: 2000 },
          { path: "currency", name: "currency", type: "string", label: "Currency", required: false, sampleValue: "usd" },
          { path: "customer.email", name: "email", type: "string", label: "Customer Email", required: true, sampleValue: "customer@example.com" },
          { path: "customer.name", name: "name", type: "string", label: "Customer Name", required: false, sampleValue: "Jane Doe" },
          { path: "status", name: "status", type: "string", label: "Status", required: false, sampleValue: "succeeded" },
          { path: "description", name: "description", type: "string", label: "Description", required: false, sampleValue: "Monthly subscription" },
        ]
      : providerName.includes("hubspot") || providerName.includes("crm") || providerName.includes("salesforce") || providerName.includes("zoho")
      ? [
          { path: "properties.firstname", name: "firstname", type: "string", label: "First Name", required: true, sampleValue: "Sarah" },
          { path: "properties.lastname", name: "lastname", type: "string", label: "Last Name", required: true, sampleValue: "Connor" },
          { path: "properties.email", name: "email", type: "string", label: "Email Address", required: true, sampleValue: "sarah.connor@example.com" },
          { path: "properties.phone", name: "phone", type: "string", label: "Phone Number", required: false, sampleValue: "+1-555-0199" },
          { path: "properties.company", name: "company", type: "string", label: "Company", required: false, sampleValue: "Cyberdyne Systems" },
          { path: "properties.dealname", name: "dealname", type: "string", label: "Deal Name", required: true, sampleValue: "Enterprise License Q3" },
          { path: "properties.amount", name: "amount", type: "number", label: "Deal Value", required: true, sampleValue: 45000 },
          { path: "properties.dealstage", name: "dealstage", type: "string", label: "Deal Stage", required: false, sampleValue: "presentationscheduled" },
        ]
      : [
          { path: "id", name: "id", type: "string", label: "Identifier", required: true, sampleValue: "rec_1001" },
          { path: "name", name: "name", type: "string", label: "Full Name", required: true, sampleValue: "Alex Morgan" },
          { path: "email", name: "email", type: "string", label: "Email", required: true, sampleValue: "alex@example.com" },
          { path: "phone", name: "phone", type: "string", label: "Phone", required: false, sampleValue: "+1-202-555-0143" },
          { path: "amount", name: "amount", type: "number", label: "Amount", required: false, sampleValue: 1250 },
          { path: "status", name: "status", type: "string", label: "Status", required: false, sampleValue: "ACTIVE" },
        ];

    return candidateFields;
  }, [activeDiscoveredEntity, connector]);

  // 3. Load Existing Mappings from Backend if active integrationId is present
  const loadBackendMappings = useCallback(async () => {
    if (!integrationId) return;

    setIsLoadingBackendMappings(true);
    setBackendError(null);

    try {
      const backendMappings = await getIntegrationMappingsApi(integrationId, {
        targetEntity: currentEntity.name,
      });

      setMappingEntries((prev) => {
        const next = { ...prev };
        backendMappings.forEach((bm) => {
          if (bm.targetField) {
            next[bm.targetField] = {
              targetField: bm.targetField,
              sourceField: bm.sourceField || "",
              transformationType: (bm.transformation?.type as TransformationRuleType) || "none",
              transformationConfig: bm.transformation?.config,
              defaultValue: bm.transformation?.defaultValue,
              backendMappingId: bm.id,
              status: bm.status || "ACTIVE",
              isDirty: false,
              isPersisted: true,
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

  // Seed initial mappings once if passed from parent form state
  const isInitializedRef = React.useRef(false);
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
            };
          }
        });
        return next;
      });
    }
  }, [initialMappings]);

  // 4. Smart Auto-Map Matching
  const handleAutoMap = () => {
    if (flattenedSourceFields.length === 0) {
      toast.info("No discovered external fields available to auto-map.");
      return;
    }

    let mappedCount = 0;
    setMappingEntries((prev) => {
      const next = { ...prev };

      currentEntity.targetFields.forEach((tf) => {
        if (!next[tf.key]?.sourceField) {
          const tfKeyLower = tf.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const tfLabelLower = (tf.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");

          // Find best matching source field
          const directMatch = flattenedSourceFields.find((sf) => {
            const sfPathLower = sf.path.toLowerCase().replace(/[^a-z0-9]/g, "");
            const sfNameLower = sf.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            const sfLabelLower = (sf.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");

            return (
              sfPathLower === tfKeyLower ||
              sfNameLower === tfKeyLower ||
              sfLabelLower === tfLabelLower ||
              sfPathLower.includes(tfKeyLower) ||
              tfKeyLower.includes(sfNameLower)
            );
          });

          if (directMatch) {
            next[tf.key] = {
              ...(next[tf.key] || {
                targetField: tf.key,
                transformationType: "none",
                status: "ACTIVE",
              }),
              targetField: tf.key,
              sourceField: directMatch.path,
              isDirty: true,
            };
            mappedCount++;
          }
        }
      });

      return next;
    });

    if (mappedCount > 0) {
      toast.success(`Auto-mapped ${mappedCount} fields based on schema attribute matching!`);
    } else {
      toast.info("No new matching field pairs found automatically.");
    }
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
        // Clear mapping
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
          isDirty: true,
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
        },
      };
    });
  };

  // 5. Direct Save Mapping to Backend API
  const handleSaveMappingDirectly = async (targetKey: string) => {
    if (!integrationId) return;

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
          },
        }));
        toast.success(`Saved mapping for ${targetKey}`);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to persist mapping";
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

  // 6. Test / Preview Transformation
  const handlePreviewTransformation = async (targetKey: string) => {
    const entry = mappingEntries[targetKey];
    if (!entry || !entry.sourceField || !integrationId) return;

    const sourceFieldObj = flattenedSourceFields.find((f) => f.path === entry.sourceField);
    const sampleVal = String(sourceFieldObj?.sampleValue ?? "Sample Value");

    setPreviewStates((prev) => ({ ...prev, [targetKey]: { loading: true } }));

    try {
      const rules = [];
      if (entry.transformationType && entry.transformationType !== "none") {
        rules.push({
          type: entry.transformationType,
          params: entry.transformationType === "DEFAULT_VALUE" ? { defaultValue: entry.defaultValue } : entry.transformationConfig,
        });
      }

      if (rules.length === 0) {
        setPreviewStates((prev) => ({
          ...prev,
          [targetKey]: { loading: false, result: sampleVal },
        }));
        return;
      }

      const res = await previewTransformationApi(integrationId, {
        sampleValue: sampleVal,
        rules,
      });

      setPreviewStates((prev) => ({
        ...prev,
        [targetKey]: {
          loading: false,
          result: res?.data?.transformedValue || String(res),
        },
      }));
    } catch (err: any) {
      setPreviewStates((prev) => ({
        ...prev,
        [targetKey]: {
          loading: false,
          error: err?.response?.data?.message || err?.message || "Transformation preview failed",
        },
      }));
    }
  };

  // 7. Compute Required Field Validation & Notify Parent
  const validationStatus = useMemo(() => {
    const requiredFields = currentEntity.targetFields.filter((tf) => tf.required);
    const missingFields: string[] = [];

    requiredFields.forEach((rf) => {
      const mapped = mappingEntries[rf.key];
      if (!mapped || !mapped.sourceField || mapped.sourceField.trim() === "") {
        missingFields.push(rf.label || rf.key);
      }
    });

    const isSatisfied = missingFields.length === 0;
    const totalCount = currentEntity.targetFields.length;
    // Strictly count only mapped fields that belong to the active currentEntity
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
  }, [currentEntity.targetFields, mappingEntries]);

  // Synchronize validation & mappings changes to parent safely (prevent infinite update loops)
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
                Source Discovered Entity
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

      {/* ── Action Toolbar: Auto-Map, Clear, Search, Mapping Stats ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAutoMap}
            disabled={disabled || flattenedSourceFields.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold transition-all shadow-xs disabled:opacity-50"
            title="Auto-match remote fields to target fields based on name and semantic similarity"
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
        <div className="flex-1 overflow-y-auto border border-border rounded-xl bg-surface max-h-[380px] relative">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 shadow-xs bg-white">
              <tr>
                <th className="bg-surface-secondary py-2.5 px-3 font-bold uppercase text-[10px] w-5/12 text-text-muted border-b border-border sticky top-0 z-20">
                  Zyoris Target Field ({currentEntity.label})
                </th>
                <th className="bg-surface-secondary py-2.5 px-2 font-bold uppercase text-[10px] text-center w-8 text-text-muted border-b border-border sticky top-0 z-20">
                  Map
                </th>
                <th className="bg-surface-secondary py-2.5 px-3 font-bold uppercase text-[10px] w-5/12 text-text-muted border-b border-border sticky top-0 z-20">
                  Discovered Source Field ({connector?.name || "Provider"})
                </th>
                <th className="bg-surface-secondary py-2.5 px-2 font-bold uppercase text-[10px] text-right w-16 text-text-muted border-b border-border sticky top-0 z-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTargetFields.map((tf) => {
                const entry = mappingEntries[tf.key];
                const isMapped = !!entry?.sourceField;
                const isRequired = !!tf.required;
                const isMissingRequired = isRequired && !isMapped;
                const isExpanded = expandedTransformField === tf.key;
                const isSaving = !!savingFieldKeys[tf.key];

                return (
                  <React.Fragment key={tf.key}>
                    <tr
                      className={`hover:bg-surface-hover transition-colors ${
                        isMissingRequired ? "bg-error/5" : ""
                      }`}
                    >
                      {/* Target Field Info */}
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
                      </td>

                      {/* Direction Arrow */}
                      <td className="py-3 px-2 text-center align-middle">
                        <ArrowRight
                          className={`w-3.5 h-3.5 mx-auto ${
                            isMapped ? "text-primary font-bold" : "text-text-muted opacity-40"
                          }`}
                        />
                      </td>

                      {/* Source Field Select Dropdown */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1.5">
                          <select
                            value={entry?.sourceField || ""}
                            disabled={disabled || isSaving}
                            onChange={(e) => handleSourceFieldSelect(tf.key, e.target.value)}
                            className={`w-full px-3 py-1.5 rounded-lg bg-surface text-text text-xs border focus:outline-none font-mono transition-colors ${
                              isMissingRequired
                                ? "border-error focus:border-error"
                                : isMapped
                                ? "border-primary/50 focus:border-primary"
                                : "border-border focus:border-primary"
                            }`}
                          >
                            <option value="">-- Select Discovered Source Field --</option>
                            {flattenedSourceFields.map((sf) => (
                              <option key={sf.path} value={sf.path}>
                                {sf.path} ({sf.type}) {sf.required ? "• Required" : ""}
                              </option>
                            ))}
                          </select>

                          {/* Source Field Sample Value / Metadata preview */}
                          {entry?.sourceField && (
                            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono px-1">
                              <span className="truncate max-w-[200px]">
                                Sample:{" "}
                                {String(
                                  flattenedSourceFields.find((f) => f.path === entry.sourceField)?.sampleValue ?? "null"
                                )}
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
                                  {entry.transformationType && entry.transformationType !== "none"
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

                      {/* Row Actions */}
                      <td className="py-3 px-2 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          {integrationId && isMapped && (
                            <button
                              type="button"
                              onClick={() => handleSaveMappingDirectly(tf.key)}
                              disabled={disabled || isSaving}
                              title={entry?.isPersisted && !entry.isDirty ? "Saved to backend" : "Save mapping to backend"}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                entry?.isPersisted && !entry.isDirty
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
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Transformation Configuration Drawer */}
                    {isExpanded && isMapped && (
                      <tr className="bg-surface-secondary/50">
                        <td colSpan={4} className="p-3 border-t border-b border-border/70">
                          <div className="p-3 rounded-lg bg-surface border border-border space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-text flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5 text-primary" />
                                Transformation Rule for {tf.label}
                              </span>
                              <span className="text-[11px] text-text-muted">
                                Applied before syncing into Zyoris
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                                  Rule Type
                                </label>
                                <select
                                  value={entry.transformationType || "none"}
                                  onChange={(e) =>
                                    handleTransformationTypeChange(
                                      tf.key,
                                      e.target.value as TransformationRuleType
                                    )
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-md bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none"
                                >
                                  <option value="none">None (Direct Pass-through)</option>
                                  <option value="TRIM">TRIM (Strip whitespace)</option>
                                  <option value="UPPERCASE">UPPERCASE</option>
                                  <option value="LOWERCASE">LOWERCASE</option>
                                  <option value="PARSE_DATE">PARSE_DATE (ISO format)</option>
                                  <option value="DEFAULT_VALUE">DEFAULT_VALUE (Fallback)</option>
                                  <option value="REGEX_REPLACE">REGEX_REPLACE</option>
                                </select>
                              </div>

                              {entry.transformationType === "DEFAULT_VALUE" && (
                                <div>
                                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                                    Default Fallback Value
                                  </label>
                                  <input
                                    type="text"
                                    value={entry.defaultValue || ""}
                                    onChange={(e) =>
                                      handleDefaultValueChange(tf.key, e.target.value)
                                    }
                                    placeholder="Enter fallback value..."
                                    className="w-full px-2.5 py-1.5 rounded-md bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Preview Transformation Button & Output */}
                            {integrationId && (
                              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewTransformation(tf.key)}
                                  disabled={previewStates[tf.key]?.loading}
                                  className="px-3 py-1 rounded-md bg-surface-secondary border border-border hover:bg-surface-hover text-text font-semibold flex items-center gap-1.5 text-[11px]"
                                >
                                  {previewStates[tf.key]?.loading ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                  ) : (
                                    <Code className="w-3 h-3 text-primary" />
                                  )}
                                  <span>Test / Preview Transformation</span>
                                </button>

                                {previewStates[tf.key]?.result && (
                                  <span className="font-mono text-[11px] text-success">
                                    Result: &quot;{previewStates[tf.key]?.result}&quot;
                                  </span>
                                )}
                                {previewStates[tf.key]?.error && (
                                  <span className="text-[11px] text-error">
                                    {previewStates[tf.key]?.error}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
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
