"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  DiscoveredField,
  DiscoveredEntity,
  DiscoveredPagination,
  DiscoveredSchemaResponse,
  FieldMapping,
} from "@/types/integrations";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Database,
  Layers,
  FileCode,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  FileJson,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  Braces,
  List,
  Info,
  Maximize2,
  Minimize2,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderTree,
  Link,
  Plus,
  Loader2,
} from "lucide-react";
import classNames from "classnames";

export const MAX_SCHEMA_PREVIEW_BYTES = 150 * 1024; // 150KB
export const MAX_SCHEMA_PREVIEW_LINES = 300;

export interface SchemaExplorerProps {
  schemaResponse?: DiscoveredSchemaResponse | null;
  entities?: DiscoveredEntity[];
  fields?: DiscoveredField[];
  provider?: string;
  recordCount?: number | null;
  pagination?: DiscoveredPagination | null;
  sampledAt?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectField?: (field: TreeNode) => void;
  mappings?: FieldMapping[];
  onSaveMapping?: (mapping: FieldMapping) => Promise<void> | void;
  isSavingMapping?: boolean;
  className?: string;
}

export interface TreeNode {
  id: string; // Unique stable path: e.g. "customer.address.city"
  name: string; // Base name: e.g. "city"
  path: string; // Full dot path: e.g. "customer.address.city"
  label?: string;
  type: string;
  inferredType: string;
  required?: boolean;
  nullable?: boolean;
  readOnly?: boolean;
  description?: string;
  sampleValue?: any;
  hasSample: boolean;
  isObject: boolean;
  isArray: boolean;
  children: TreeNode[];
  depth: number;
}

// ---------------------------------------------------------------------------
// Type Inference Helper
// ---------------------------------------------------------------------------
export function inferDataType(explicitType?: string, sampleValue?: any): string {
  if (explicitType && typeof explicitType === "string") {
    const norm = explicitType.trim().toLowerCase();
    if (
      [
        "string",
        "text",
        "varchar",
        "char",
        "uuid",
        "email",
        "url",
      ].includes(norm)
    ) {
      return "string";
    }
    if (
      [
        "number",
        "int",
        "integer",
        "float",
        "double",
        "decimal",
        "numeric",
        "bigint",
      ].includes(norm)
    ) {
      return "number";
    }
    if (["boolean", "bool"].includes(norm)) {
      return "boolean";
    }
    if (["array", "list", "set"].includes(norm)) {
      return "array";
    }
    if (["object", "record", "json", "map", "dict"].includes(norm)) {
      return "object";
    }
    if (["date", "datetime", "timestamp", "time"].includes(norm)) {
      return "datetime";
    }
    if (norm !== "unknown" && norm !== "any" && norm !== "") {
      return norm;
    }
  }

  // Fallback to sample-based runtime inference
  if (sampleValue === null || sampleValue === undefined) {
    return "null";
  }
  if (Array.isArray(sampleValue)) {
    return "array";
  }
  if (typeof sampleValue === "boolean") {
    return "boolean";
  }
  if (typeof sampleValue === "number") {
    return Number.isInteger(sampleValue) ? "integer" : "number";
  }
  if (typeof sampleValue === "object") {
    return "object";
  }
  if (typeof sampleValue === "string") {
    // Check if ISO Date string
    if (
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(
        sampleValue.trim()
      )
    ) {
      return "datetime";
    }
    return "string";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Type Badge Style & Icon Mapping
// ---------------------------------------------------------------------------
export function getTypeBadgeInfo(type: string) {
  const t = (type || "").toLowerCase();
  switch (t) {
    case "string":
    case "text":
    case "email":
    case "url":
    case "uuid":
      return {
        label: "string",
        icon: Type,
        bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "number":
    case "integer":
    case "int":
    case "float":
    case "double":
    case "decimal":
      return {
        label: t === "integer" ? "int" : "number",
        icon: Hash,
        bgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "boolean":
    case "bool":
      return {
        label: "bool",
        icon: ToggleLeft,
        bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "object":
    case "json":
    case "record":
      return {
        label: "object",
        icon: Braces,
        bgClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    case "array":
    case "list":
      return {
        label: "array",
        icon: List,
        bgClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      };
    case "datetime":
    case "date":
    case "timestamp":
      return {
        label: "datetime",
        icon: Calendar,
        bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    case "null":
      return {
        label: "null",
        icon: Info,
        bgClass: "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20",
      };
    default:
      return {
        label: type || "unknown",
        icon: Info,
        bgClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      };
  }
}

// ---------------------------------------------------------------------------
// Build Recursive Tree from Discovered Fields
// ---------------------------------------------------------------------------
export function buildSchemaTree(
  fields: DiscoveredField[],
  sampleData?: Record<string, any> | Record<string, any>[]
): TreeNode[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    return [];
  }

  // Get first sample record if sampleData is array
  const sampleObj = Array.isArray(sampleData) ? sampleData[0] : sampleData;

  // Helper to extract nested value from sample object via dot path
  const getSampleValueForPath = (path: string, fieldSample?: any): any => {
    if (fieldSample !== undefined) return fieldSample;
    if (!sampleObj || typeof sampleObj !== "object") return undefined;

    const parts = path.split(".").map((p) => p.replace(/\[\d*\]$/, ""));
    let curr: any = sampleObj;
    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[part];
    }
    return curr;
  };

  // Map to store root and nested nodes
  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort fields to ensure parent paths are processed before child paths
  const sortedFields = [...fields].sort((a, b) => {
    const pathA = (a.nestedPath || a.path || a.name || "").toString();
    const pathB = (b.nestedPath || b.path || b.name || "").toString();
    return pathA.split(".").length - pathB.split(".").length;
  });

  for (const field of sortedFields) {
    const rawPath = (field.nestedPath || field.path || field.name || "").toString().trim();
    if (!rawPath) continue;

    const parts = rawPath.split(".");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const prevPath = currentPath;
      currentPath = prevPath ? `${prevPath}.${part}` : part;
      const isLeaf = i === parts.length - 1;

      if (!nodeMap.has(currentPath)) {
        const sampleVal = isLeaf
          ? getSampleValueForPath(
              currentPath,
              field.sampleValue ?? field.sample ?? field.example
            )
          : undefined;

        const rawType = isLeaf
          ? field.type || (typeof sampleVal)
          : "object";

        const inferred = inferDataType(rawType, sampleVal);
        const isObj = inferred === "object" || (field.fields && field.fields.length > 0) || !isLeaf;
        const isArr = inferred === "array";

        const node: TreeNode = {
          id: currentPath,
          name: part,
          path: currentPath,
          label: isLeaf ? field.label || part : part,
          type: rawType || inferred,
          inferredType: isObj ? "object" : isArr ? "array" : inferred,
          required: isLeaf ? (field.required ?? false) : false,
          nullable: isLeaf ? (field.nullable ?? true) : true,
          readOnly: isLeaf ? (field.readOnly ?? false) : false,
          description: isLeaf ? field.description : undefined,
          sampleValue: sampleVal,
          hasSample: sampleVal !== undefined,
          isObject: isObj,
          isArray: isArr,
          children: [],
          depth: i,
        };

        nodeMap.set(currentPath, node);

        if (prevPath && nodeMap.has(prevPath)) {
          const parent = nodeMap.get(prevPath)!;
          parent.isObject = true;
          if (!parent.children.some((c) => c.id === node.id)) {
            parent.children.push(node);
          }
        } else if (i === 0) {
          if (!rootNodes.some((n) => n.id === node.id)) {
            rootNodes.push(node);
          }
        }
      } else if (isLeaf) {
        // Update existing intermediate node with leaf metadata if explicitly defined
        const existing = nodeMap.get(currentPath)!;
        existing.label = field.label || existing.label;
        existing.required = field.required ?? existing.required;
        existing.nullable = field.nullable ?? existing.nullable;
        existing.readOnly = field.readOnly ?? existing.readOnly;
        existing.description = field.description || existing.description;
        const sampleVal = getSampleValueForPath(
          currentPath,
          field.sampleValue ?? field.sample ?? field.example
        );
        if (sampleVal !== undefined) {
          existing.sampleValue = sampleVal;
          existing.hasSample = true;
        }
      }
    }

    // If the field itself contains recursive child fields
    const directChildren = field.fields || field.children;
    if (Array.isArray(directChildren) && directChildren.length > 0) {
      const parentNode = nodeMap.get(rawPath);
      if (parentNode) {
        const childTree = buildSchemaTree(
          directChildren.map((c) => ({
            ...c,
            nestedPath: c.nestedPath || (c.path ? `${rawPath}.${c.path}` : `${rawPath}.${c.name}`),
          })),
          sampleObj
        );
        for (const child of childTree) {
          if (!parentNode.children.some((c) => c.id === child.id)) {
            parentNode.children.push(child);
          }
        }
        parentNode.isObject = true;
      }
    }
  }

  return rootNodes;
}

// ---------------------------------------------------------------------------
// Main SchemaExplorer Component
// ---------------------------------------------------------------------------
export function SchemaExplorer({
  schemaResponse,
  entities: initialEntities,
  fields: initialFields,
  provider: initialProvider,
  recordCount: initialRecordCount,
  pagination: initialPagination,
  sampledAt: initialSampledAt,
  isLoading = false,
  error = null,
  onRetry,
  onSelectField,
  mappings = [],
  onSaveMapping,
  isSavingMapping = false,
  className,
}: SchemaExplorerProps) {
  // Normalize input props
  const provider =
    schemaResponse?.provider || initialProvider || "External Provider";
  const sampledAt =
    schemaResponse?.sampledAt ||
    schemaResponse?.discoveredAt ||
    initialSampledAt ||
    null;
  const recordCount =
    schemaResponse?.recordCount ??
    schemaResponse?.totalRecords ??
    initialRecordCount ??
    null;
  const pagination =
    schemaResponse?.pagination || initialPagination || null;

  // Field mapping form state for selected node
  const [targetFieldInput, setTargetFieldInput] = useState<string>("");
  const [transformationInput, setTransformationInput] = useState<string>("DIRECT");
  const [mappingSavedSuccess, setMappingSavedSuccess] = useState<boolean>(false);

  // Derive entities and fields
  const entities: DiscoveredEntity[] = useMemo(() => {
    if (Array.isArray(schemaResponse?.entities) && schemaResponse.entities.length > 0) {
      return schemaResponse.entities;
    }
    if (Array.isArray(initialEntities) && initialEntities.length > 0) {
      return initialEntities;
    }
    return [];
  }, [schemaResponse, initialEntities]);

  const [selectedEntityName, setSelectedEntityName] = useState<string>("");

  // Sync selected entity name
  React.useEffect(() => {
    if (entities.length > 0 && !selectedEntityName) {
      setSelectedEntityName(entities[0].name);
    }
  }, [entities, selectedEntityName]);

  const activeEntity = useMemo(() => {
    if (entities.length === 0) return null;
    return (
      entities.find((e) => e.name === selectedEntityName) || entities[0]
    );
  }, [entities, selectedEntityName]);

  // Combined fields for active entity or top-level fields
  const allFields: DiscoveredField[] = useMemo(() => {
    if (activeEntity?.fields && activeEntity.fields.length > 0) {
      return activeEntity.fields;
    }
    if (Array.isArray(schemaResponse?.fields) && schemaResponse.fields.length > 0) {
      return schemaResponse.fields;
    }
    if (Array.isArray(initialFields) && initialFields.length > 0) {
      return initialFields;
    }
    return [];
  }, [activeEntity, schemaResponse, initialFields]);

  // Sample data records
  const sampleRecords = useMemo(() => {
    return (
      activeEntity?.sampleRecords ||
      activeEntity?.sampleData ||
      activeEntity?.records ||
      schemaResponse?.sampleRecords ||
      schemaResponse?.sampleData ||
      null
    );
  }, [activeEntity, schemaResponse]);

  // Build complete hierarchical tree
  const fullTree = useMemo(() => {
    return buildSchemaTree(allFields, sampleRecords || undefined);
  }, [allFields, sampleRecords]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tree" | "sampleJson">("tree");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Auto-expand all top-level object nodes initially
  React.useEffect(() => {
    const initialExpanded = new Set<string>();
    const collectParents = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.isObject || node.isArray || node.children.length > 0) {
          initialExpanded.add(node.id);
          collectParents(node.children);
        }
      }
    };
    collectParents(fullTree);
    setExpandedNodes(initialExpanded);
  }, [fullTree]);

  // Filter tree recursively while preserving parent ancestry
  const { filteredTree, matchingCount } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      let count = 0;
      const countNodes = (nodes: TreeNode[]) => {
        for (const n of nodes) {
          count++;
          countNodes(n.children);
        }
      };
      countNodes(fullTree);
      return { filteredTree: fullTree, matchingCount: count };
    }

    let matchCount = 0;

    const filterNode = (node: TreeNode): TreeNode | null => {
      const isDirectMatch =
        node.name.toLowerCase().includes(query) ||
        node.path.toLowerCase().includes(query) ||
        node.label?.toLowerCase().includes(query) ||
        node.inferredType.toLowerCase().includes(query) ||
        (node.description && node.description.toLowerCase().includes(query));

      const matchingChildren: TreeNode[] = [];
      for (const child of node.children) {
        const filteredChild = filterNode(child);
        if (filteredChild) {
          matchingChildren.push(filteredChild);
        }
      }

      if (isDirectMatch) {
        matchCount++;
      }

      if (isDirectMatch || matchingChildren.length > 0) {
        return {
          ...node,
          children: matchingChildren,
        };
      }

      return null;
    };

    const result: TreeNode[] = [];
    for (const root of fullTree) {
      const filteredRoot = filterNode(root);
      if (filteredRoot) {
        result.push(filteredRoot);
      }
    }

    return { filteredTree: result, matchingCount: matchCount };
  }, [fullTree, searchQuery]);

  // When searching, auto-expand nodes that have matching descendants
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const autoExpanded = new Set<string>();
      const expandAll = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.children.length > 0) {
            autoExpanded.add(node.id);
            expandAll(node.children);
          }
        }
      };
      expandAll(filteredTree);
      setExpandedNodes(autoExpanded);
    }
  }, [searchQuery, filteredTree]);

  // Toggle individual node expansion
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand / Collapse all
  const handleExpandAll = useCallback(() => {
    const all = new Set<string>();
    const collectAll = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) {
          all.add(n.id);
          collectAll(n.children);
        }
      }
    };
    collectAll(fullTree);
    setExpandedNodes(all);
  }, [fullTree]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Copy helper
  const handleCopy = (text: string, pathId?: string) => {
    navigator.clipboard.writeText(text);
    if (pathId) {
      setCopiedPath(pathId);
      setTimeout(() => setCopiedPath(null), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  // Find currently selected node in full tree
  const selectedNode = useMemo(() => {
    if (!selectedPath) return null;
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const n of nodes) {
        if (n.id === selectedPath) return n;
        const found = findNode(n.children);
        if (found) return found;
      }
      return null;
    };
    return findNode(fullTree);
  }, [selectedPath, fullTree]);

  // Sync mapping input when selected node changes
  React.useEffect(() => {
    if (selectedNode) {
      const existing = mappings.find(
        (m) => m.sourceField === selectedNode.path
      );
      if (existing) {
        setTargetFieldInput(existing.targetField || selectedNode.name);
        setTransformationInput(
          typeof existing.transformation === "string"
            ? existing.transformation
            : existing.transformation?.type || "DIRECT"
        );
      } else {
        setTargetFieldInput(selectedNode.name);
        setTransformationInput("DIRECT");
      }
      setMappingSavedSuccess(false);
    }
  }, [selectedNode, mappings]);

  // -------------------------------------------------------------------------
  // Oversized Sample Preview Check (> 150KB or > 300 lines)
  // -------------------------------------------------------------------------
  const sampleJsonString = useMemo(() => {
    if (!sampleRecords) return "";
    try {
      return JSON.stringify(sampleRecords, null, 2);
    } catch {
      return String(sampleRecords);
    }
  }, [sampleRecords]);

  const lineCount = useMemo(() => {
    return sampleJsonString ? sampleJsonString.split("\n").length : 0;
  }, [sampleJsonString]);

  const isOversizedPreview =
    sampleJsonString.length > MAX_SCHEMA_PREVIEW_BYTES ||
    lineCount > MAX_SCHEMA_PREVIEW_LINES;

  const safeSamplePreview = useMemo(() => {
    if (!isOversizedPreview) return sampleJsonString;
    const truncated = sampleJsonString.substring(0, MAX_SCHEMA_PREVIEW_BYTES);
    return (
      truncated +
      `\n\n/* ... [PREVIEW TRUNCATED: Payload exceeds ${Math.round(
        MAX_SCHEMA_PREVIEW_BYTES / 1024
      )}KB or ${MAX_SCHEMA_PREVIEW_LINES} lines. Use 'Copy Full Payload' to view complete JSON] ... */`
    );
  }, [sampleJsonString, isOversizedPreview]);

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Check for Malformed / Unsupported / No Records States
  // -------------------------------------------------------------------------
  const hasError = Boolean(error);
  const isMalformed =
    !hasError &&
    schemaResponse !== undefined &&
    schemaResponse !== null &&
    typeof schemaResponse !== "object";

  const isUnsupported =
    !hasError &&
    !isMalformed &&
    schemaResponse &&
    !Array.isArray(schemaResponse.fields) &&
    !Array.isArray(schemaResponse.entities) &&
    allFields.length === 0 &&
    !sampleRecords;

  const isNoRecords =
    !isLoading &&
    !hasError &&
    !isMalformed &&
    !isUnsupported &&
    allFields.length === 0 &&
    (!sampleRecords || (Array.isArray(sampleRecords) && sampleRecords.length === 0));

  // -------------------------------------------------------------------------
  // Render: Loading State
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={classNames("flex flex-col items-center justify-center p-12 space-y-4 text-center", className)}>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
          <Database className="w-6 h-6 animate-spin" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text">Inspecting Remote Schema</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm">
            Fetching real sample JSON, discovering nested field paths, and inferring data types from {provider}...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render State 11: Error State
  // -------------------------------------------------------------------------
  if (hasError) {
    return (
      <div className={classNames("p-8 flex flex-col items-center justify-center text-center space-y-3", className)}>
        <div className="w-12 h-12 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-text">Schema Discovery Failed</h3>
        <p className="text-xs text-text-secondary max-w-md">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-xs font-semibold text-text transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Discovery</span>
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render State 11b: Malformed Response State
  // -------------------------------------------------------------------------
  if (isMalformed) {
    return (
      <div className={classNames("p-8 flex flex-col items-center justify-center text-center space-y-3", className)}>
        <div className="w-12 h-12 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-text">Malformed Schema Response</h3>
        <p className="text-xs text-text-secondary max-w-md">
          The remote API returned a response structure that could not be parsed into valid schema metadata or fields.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-xs font-semibold text-text transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Discovery</span>
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render State 10: Unsupported Schema State
  // -------------------------------------------------------------------------
  if (isUnsupported) {
    return (
      <div className={classNames("p-8 flex flex-col items-center justify-center text-center space-y-3", className)}>
        <div className="w-12 h-12 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-text">Unsupported Schema Format</h3>
        <p className="text-xs text-text-secondary max-w-md">
          The schema format returned by {provider} is currently unsupported by the visual explorer. Raw payload mapping may be required.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render State 9: No Records State
  // -------------------------------------------------------------------------
  if (isNoRecords) {
    return (
      <div className={classNames("p-8 flex flex-col items-center justify-center text-center space-y-3", className)}>
        <div className="w-12 h-12 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-text-muted">
          <Layers className="w-6 h-6 opacity-60" />
        </div>
        <h3 className="text-sm font-bold text-text">No Discovered Schema or Records</h3>
        <p className="text-xs text-text-secondary max-w-md">
          Live connection to {provider} is established, but the endpoint currently returned 0 sample records and no discoverable schema fields.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-xs font-semibold text-text transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Schema</span>
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Recursive Tree Node Renderer
  // -------------------------------------------------------------------------
  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedPath === node.id;
    const typeInfo = getTypeBadgeInfo(node.inferredType);
    const TypeIcon = typeInfo.icon;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            setSelectedPath(node.id);
            onSelectField?.(node);
          }}
          className={classNames(
            "group flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs cursor-pointer transition-all border",
            isSelected
              ? "bg-primary/10 border-primary/40 text-text font-semibold shadow-xs"
              : "hover:bg-surface-hover border-transparent text-text-secondary hover:text-text"
          )}
          style={{ paddingLeft: `${node.depth * 18 + 10}px` }}
        >
          {/* Expand/Collapse Chevron */}
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-0.5 rounded hover:bg-surface-secondary text-text-muted hover:text-text transition-colors"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-text-muted transition-colors" />
            )}
          </div>

          {/* Type Badge Icon */}
          <span
            className={classNames(
              "px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border flex items-center gap-1 flex-shrink-0",
              typeInfo.bgClass
            )}
            title={`Type: ${node.type} (Inferred: ${node.inferredType})`}
          >
            <TypeIcon className="w-2.5 h-2.5" />
            <span>{typeInfo.label}</span>
          </span>

          {/* Field Name & Path */}
          <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
            <span
              className={classNames(
                "font-mono truncate",
                isSelected ? "text-primary font-bold" : "text-text"
              )}
            >
              {node.name}
            </span>
            {node.label && node.label !== node.name && (
              <span className="text-[10px] text-text-muted truncate hidden sm:inline">
                ({node.label})
              </span>
            )}
          </div>

          {/* Mapped target badge if defined */}
          {(() => {
            const mappedTarget = mappings.find((m) => m.sourceField === node.path);
            if (!mappedTarget) return null;
            return (
              <span
                className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5 flex-shrink-0"
                title={`Mapped to: ${mappedTarget.targetField}`}
              >
                <Link className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">→ {mappedTarget.targetField}</span>
              </span>
            );
          })()}

          {/* Constraints & Flags */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {node.required && (
              <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded">
                req
              </span>
            )}
            {node.readOnly && (
              <span className="px-1.5 py-0.2 text-[9px] font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded">
                readonly
              </span>
            )}
          </div>

          {/* Sample preview chip if available */}
          {node.hasSample && !node.isObject && (
            <div className="max-w-[140px] truncate text-[11px] font-mono text-text-muted bg-surface-secondary/80 px-2 py-0.5 rounded border border-border hidden md:block">
              {typeof node.sampleValue === "object"
                ? JSON.stringify(node.sampleValue)
                : String(node.sampleValue)}
            </div>
          )}

          {/* Copy Path Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(node.path, node.id);
            }}
            className="p-1 text-text-muted hover:text-text rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Copy path: ${node.path}`}
            aria-label="Copy field path"
          >
            {copiedPath === node.id ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Render Children if expanded */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Indentation guide line */}
            <div
              className="absolute left-0 top-0 bottom-0 border-l border-border/40"
              style={{ left: `${node.depth * 18 + 17}px` }}
            />
            {node.children.map(renderTreeNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={classNames("flex flex-col h-full bg-surface overflow-hidden", className)}>
      {/* ------------------------------------------------------------------- */}
      {/* Top Header: Collection Info & Pagination Metadata */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 border-b border-border bg-surface-secondary/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Collection info */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-text">
            <Database className="w-4 h-4 text-primary" />
            <span>{provider}</span>
          </div>

          {recordCount !== null && recordCount !== undefined && (
            <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium text-[11px] flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>
                {recordCount} {recordCount === 1 ? "record" : "records"} detected
              </span>
            </div>
          )}

          {sampledAt && (
            <div className="text-text-muted text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Sampled: {new Date(sampledAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Pagination Metadata Pills */}
        {pagination && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            {pagination.pageSize !== undefined && pagination.pageSize !== null && (
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                Page Size: <strong className="text-text">{pagination.pageSize}</strong>
              </span>
            )}
            {pagination.total !== undefined && pagination.total !== null && (
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                Total: <strong className="text-text">{pagination.total}</strong>
              </span>
            )}
            {pagination.hasNext !== undefined && (
              <span
                className={classNames(
                  "px-2 py-0.5 rounded border font-sans font-medium",
                  pagination.hasNext
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                )}
              >
                Has Next: {pagination.hasNext ? "Yes" : "No"}
              </span>
            )}
            {pagination.nextCursor && (
              <span
                className="px-2 py-0.5 rounded bg-surface border border-border text-text-muted truncate max-w-[120px]"
                title={`Next Cursor: ${pagination.nextCursor}`}
              >
                Cursor: {pagination.nextCursor}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Entity Selector (if multiple entities exist) */}
      {/* ------------------------------------------------------------------- */}
      {entities.length > 1 && (
        <div className="px-4 py-2 border-b border-border bg-surface-secondary/20 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex-shrink-0">
            Entities:
          </span>
          {entities.map((ent) => (
            <button
              key={ent.name}
              type="button"
              onClick={() => setSelectedEntityName(ent.name)}
              className={classNames(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0",
                selectedEntityName === ent.name
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-surface text-text-secondary border border-border hover:bg-surface-hover hover:text-text"
              )}
            >
              <span>{ent.label || ent.name}</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({ent.fields?.length || 0})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Main Body: Explorer Toolbar & Split Pane */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar: Search, View Switcher, Expand/Collapse */}
        <div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-2.5 bg-surface">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields, paths, data types..."
              className="w-full pl-8.5 pr-8 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted hover:text-text bg-surface-secondary px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Actions & Tabs */}
          <div className="flex items-center gap-2">
            {activeTab === "tree" && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="px-2.5 py-1 rounded bg-surface border border-border text-text-secondary hover:text-text hover:bg-surface-hover text-[11px] font-medium transition-colors"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="px-2.5 py-1 rounded bg-surface border border-border text-text-secondary hover:text-text hover:bg-surface-hover text-[11px] font-medium transition-colors"
                >
                  Collapse All
                </button>
              </div>
            )}

            {/* View Tabs */}
            <div className="flex items-center rounded-lg border border-border bg-surface-secondary p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("tree")}
                className={classNames(
                  "flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all",
                  activeTab === "tree"
                    ? "bg-surface text-text shadow-xs"
                    : "text-text-muted hover:text-text"
                )}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Tree</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sampleJson")}
                className={classNames(
                  "flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all",
                  activeTab === "sampleJson"
                    ? "bg-surface text-text shadow-xs"
                    : "text-text-muted hover:text-text"
                )}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Sample JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {activeTab === "tree" ? (
            <>
              {/* Left Column: Hierarchical Schema Tree */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredTree.length === 0 ? (
                  <div className="p-8 text-center text-text-muted space-y-2">
                    <Search className="w-8 h-8 opacity-40 mx-auto" />
                    <p className="text-xs">No fields match &quot;{searchQuery}&quot;</p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Clear search filter
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="px-2 py-1 text-[11px] font-medium text-text-muted flex items-center justify-between border-b border-border/40 pb-2 mb-1">
                      <span>Field Path & Data Type</span>
                      <span>{matchingCount} {matchingCount === 1 ? "field" : "fields"}</span>
                    </div>
                    {filteredTree.map(renderTreeNode)}
                  </>
                )}
              </div>

              {/* Right Column: Selected Field Details Panel */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-surface-secondary/20 p-4 flex flex-col overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>Field Details</span>
                  </h4>
                  {selectedNode && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedNode.path, selectedNode.id)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      {copiedPath === selectedNode.id ? (
                        <>
                          <Check className="w-3 h-3 text-success" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Path</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {selectedNode ? (
                  <div className="space-y-3.5 text-xs">
                    {/* Path Card */}
                    <div className="p-2.5 rounded-lg bg-surface border border-border space-y-1">
                      <span className="text-[10px] text-text-muted block uppercase font-bold">
                        Full Field Path
                      </span>
                      <div className="font-mono text-xs text-primary break-all font-semibold select-all">
                        {selectedNode.path}
                      </div>
                    </div>

                    {/* Type & Attributes Card */}
                    <div className="p-2.5 rounded-lg bg-surface border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-muted uppercase font-bold">
                          Data Type
                        </span>
                        {(() => {
                          const badge = getTypeBadgeInfo(selectedNode.inferredType);
                          const Icon = badge.icon;
                          return (
                            <span
                              className={classNames(
                                "px-2 py-0.5 rounded text-[11px] font-mono border flex items-center gap-1",
                                badge.bgClass
                              )}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{selectedNode.inferredType}</span>
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[11px]">
                        <span className="text-text-muted">Required:</span>
                        <span
                          className={classNames(
                            "font-semibold",
                            selectedNode.required ? "text-rose-600" : "text-text-secondary"
                          )}
                        >
                          {selectedNode.required ? "Yes" : "No"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-text-muted">Nullable:</span>
                        <span className="text-text-secondary font-medium">
                          {selectedNode.nullable ? "Yes" : "No"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-text-muted">Read Only:</span>
                        <span className="text-text-secondary font-medium">
                          {selectedNode.readOnly ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    {/* Sample Value Inspector */}
                    <div className="p-2.5 rounded-lg bg-surface border border-border space-y-1.5">
                      <span className="text-[10px] text-text-muted uppercase font-bold block">
                        Sample Value
                      </span>
                      {selectedNode.hasSample ? (
                        <div className="p-2 rounded bg-surface-secondary/70 font-mono text-[11px] text-text break-all max-h-36 overflow-y-auto select-all">
                          {typeof selectedNode.sampleValue === "object"
                            ? JSON.stringify(selectedNode.sampleValue, null, 2)
                            : String(selectedNode.sampleValue)}
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-muted italic">
                          No sample value provided in payload
                        </span>
                      )}
                    </div>

                    {/* Description if available */}
                    {selectedNode.description && (
                      <div className="p-2.5 rounded-lg bg-surface border border-border space-y-1">
                        <span className="text-[10px] text-text-muted uppercase font-bold block">
                          Description
                        </span>
                        <p className="text-[11px] text-text-secondary">
                          {selectedNode.description}
                        </p>
                      </div>
                    )}

                    {/* Field Mapping Editor Card if onSaveMapping is provided */}
                    {onSaveMapping && (
                      <div className="p-3 rounded-lg bg-surface border border-border space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-text-muted uppercase font-bold flex items-center gap-1">
                            <Link className="w-3 h-3 text-primary" />
                            <span>Map to Target Field</span>
                          </span>
                          {mappings.some((m) => m.sourceField === selectedNode.path) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                              Mapped
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] text-text-muted block mb-1">
                              Target Field Name
                            </label>
                            <input
                              type="text"
                              value={targetFieldInput}
                              onChange={(e) => {
                                setTargetFieldInput(e.target.value);
                                setMappingSavedSuccess(false);
                              }}
                              placeholder="e.g. email, phone, city"
                              className="w-full px-2.5 py-1.5 rounded-md bg-surface-secondary text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-text-muted block mb-1">
                              Transformation
                            </label>
                            <select
                              value={transformationInput}
                              onChange={(e) => {
                                setTransformationInput(e.target.value);
                                setMappingSavedSuccess(false);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-md bg-surface-secondary text-text text-xs border border-border focus:border-primary focus:outline-none font-mono"
                            >
                              <option value="DIRECT">DIRECT (No Transform)</option>
                              <option value="LOWERCASE">LOWERCASE</option>
                              <option value="UPPERCASE">UPPERCASE</option>
                              <option value="TRIM">TRIM</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            disabled={!targetFieldInput.trim() || isSavingMapping}
                            onClick={async () => {
                              if (!targetFieldInput.trim() || !selectedNode) return;
                              await onSaveMapping({
                                sourceField: selectedNode.path,
                                targetField: targetFieldInput.trim(),
                                transformation: transformationInput,
                                sourceType: selectedNode.inferredType,
                                required: selectedNode.required,
                              });
                              setMappingSavedSuccess(true);
                              setTimeout(() => setMappingSavedSuccess(false), 2500);
                            }}
                            className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                          >
                            {isSavingMapping ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving Mapping...</span>
                              </>
                            ) : mappingSavedSuccess ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-success" />
                                <span>Mapping Saved!</span>
                              </>
                            ) : (
                              <>
                                <Link className="w-3.5 h-3.5" />
                                <span>Save Field Mapping</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted space-y-2">
                    <FolderTree className="w-8 h-8 opacity-30" />
                    <p className="text-xs">
                      Select any field in the schema tree to view nested path, data type, constraints, and sample values.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* --------------------------------------------------------------- */
            /* Tab 2: Raw Sample JSON Viewer */
            /* --------------------------------------------------------------- */
            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
              {/* Oversized Preview Warning Banner if triggered */}
              {isOversizedPreview && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>Oversized Sample Preview:</strong> Full JSON exceeds 150KB and has been safely capped for fast rendering.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(sampleJsonString)}
                    className="px-2.5 py-1 rounded bg-warning/20 hover:bg-warning/30 text-warning font-semibold text-[11px] flex-shrink-0 transition-colors"
                  >
                    Copy Full Payload
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span>Real Sample Record JSON</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(sampleJsonString)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-text hover:bg-surface-hover text-xs font-semibold shadow-xs transition-colors"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-success">Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-surface-secondary/70 border border-border font-mono text-xs text-text selection:bg-primary/20">
                <pre className="whitespace-pre-wrap break-all">
                  {safeSamplePreview || "// No sample JSON records available."}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
