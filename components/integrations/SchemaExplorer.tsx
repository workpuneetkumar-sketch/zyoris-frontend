import React, { useState, useMemo, useCallback } from "react";
import {
  DiscoveredSchemaResponse,
  DiscoveredEntity,
  DiscoveredField,
  DiscoveredPagination,
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
  AlertTriangle,
  Info,
  RefreshCw,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Braces,
  ListTree,
  AlertCircle,
  Loader2,
  FolderTree,
  SlidersHorizontal,
  FileJson,
  ChevronsDownUp,
  ChevronsUpDown,
  Lock,
  Sparkles,
  Link,
} from "lucide-react";

/**
 * Preview truncation constants to prevent browser freeze on large payloads
 */
export const MAX_SCHEMA_PREVIEW_BYTES = 150 * 1024; // 150 KB
export const MAX_SCHEMA_PREVIEW_LINES = 300;

export interface SchemaExplorerProps {
  schemaResponse?: DiscoveredSchemaResponse | null;
  entities?: DiscoveredEntity[];
  pagination?: DiscoveredPagination | null;
  sampleRecords?: Record<string, any>[];
  provider?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectField?: (fieldPath: string, field: DiscoveredField) => void;
  mappings?: FieldMapping[];
  onSaveMapping?: (mapping: FieldMapping) => Promise<void> | void;
  isSavingMapping?: boolean;
  className?: string;
}

interface TreeNode {
  id: string; // full dot path, e.g. "customer.address.city"
  name: string; // display name, e.g. "city"
  path: string; // full dot path
  depth: number;
  inferredType: string;
  required: boolean;
  nullable: boolean;
  readOnly: boolean;
  description?: string;
  sampleValue?: any;
  rawField?: DiscoveredField;
  children: TreeNode[];
  isExpanded?: boolean;
}

/**
 * Inferred Type Badge styling & icon helper
 */
function getTypeBadgeDetails(typeStr: string) {
  const t = (typeStr || "unknown").toLowerCase();

  if (t.includes("string") || t.includes("text") || t.includes("varchar")) {
    return {
      label: "STRING",
      bgColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      icon: Type,
    };
  }
  if (t.includes("int") || t.includes("number") || t.includes("float") || t.includes("decimal") || t.includes("double")) {
    return {
      label: "NUMBER",
      bgColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      icon: Hash,
    };
  }
  if (t.includes("bool")) {
    return {
      label: "BOOLEAN",
      bgColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      icon: ToggleLeft,
    };
  }
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) {
    return {
      label: "DATETIME",
      bgColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      icon: Calendar,
    };
  }
  if (t.includes("array") || t.includes("list") || t.endsWith("[]")) {
    return {
      label: "ARRAY",
      bgColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      icon: ListTree,
    };
  }
  if (t.includes("object") || t.includes("json") || t.includes("map") || t.includes("record")) {
    return {
      label: "OBJECT",
      bgColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      icon: Braces,
    };
  }
  if (t.includes("null")) {
    return {
      label: "NULL",
      bgColor: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      icon: Info,
    };
  }

  return {
    label: (typeStr || "UNKNOWN").toUpperCase(),
    bgColor: "bg-surface-secondary text-text-secondary border-border",
    icon: Info,
  };
}

/**
 * Traverses nested object to find sample value for a given dot-notation path
 */
function getSampleValueForPath(records: Record<string, any>[], dotPath: string): any {
  if (!records || !Array.isArray(records) || records.length === 0) return undefined;

  const parts = dotPath.split(".");
  for (const record of records) {
    if (!record || typeof record !== "object") continue;

    let current: any = record;
    let found = true;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }

    if (found && current !== undefined) {
      return current;
    }
  }

  return undefined;
}

/**
 * Builds hierarchical TreeNode structure from flat and nested field definitions
 */
function buildSchemaTree(
  fields: DiscoveredField[],
  sampleRecords: Record<string, any>[]
): TreeNode[] {
  if (!fields || !Array.isArray(fields)) return [];

  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort fields so shallow paths come before deeper paths
  const sorted = [...fields].sort((a, b) => {
    const pathA = (a.path || a.name || "").split(".").length;
    const pathB = (b.path || b.name || "").split(".").length;
    return pathA - pathB;
  });

  for (const field of sorted) {
    const rawPath = field.path || field.nestedPath || field.name || "";
    if (!rawPath) continue;

    const segments = rawPath.split(".");
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}.${segment}` : segment;

      if (!nodeMap.has(currentPath)) {
        const isLeaf = i === segments.length - 1;
        const inferredType = isLeaf
          ? field.type || "string"
          : "object";

        const sample = isLeaf
          ? (field.sampleValue ?? field.sample ?? field.example ?? getSampleValueForPath(sampleRecords, currentPath))
          : undefined;

        const newNode: TreeNode = {
          id: currentPath,
          name: segment,
          path: currentPath,
          depth: i,
          inferredType,
          required: isLeaf
            ? field.required ?? (field.nullable !== undefined ? !field.nullable : false)
            : false,
          nullable: isLeaf
            ? field.nullable ?? (field.required !== undefined ? !field.required : true)
            : true,
          readOnly: isLeaf ? (field.readOnly ?? false) : false,
          description: isLeaf ? field.description : undefined,
          sampleValue: sample,
          rawField: isLeaf ? field : undefined,
          children: [],
        };

        nodeMap.set(currentPath, newNode);

        if (prevPath && nodeMap.has(prevPath)) {
          const parent = nodeMap.get(prevPath)!;
          if (!parent.children.some((c) => c.id === newNode.id)) {
            parent.children.push(newNode);
          }
        } else if (i === 0) {
          rootNodes.push(newNode);
        }
      }
    }
  }

  // Handle nested children if present on DiscoveredField objects
  const processNestedChildren = (parentField: DiscoveredField, parentNode: TreeNode) => {
    if (parentField.children && Array.isArray(parentField.children)) {
      for (const childField of parentField.children) {
        const childPath = childField.path || `${parentNode.path}.${childField.name}`;
        const segment = childField.name || childPath.split(".").pop() || "";
        
        let childNode = nodeMap.get(childPath);
        if (!childNode) {
          const sample = childField.sampleValue ?? childField.sample ?? childField.example ?? getSampleValueForPath(sampleRecords, childPath);
          childNode = {
            id: childPath,
            name: segment,
            path: childPath,
            depth: parentNode.depth + 1,
            inferredType: childField.type || "string",
            required:
              childField.required ??
              (childField.nullable !== undefined ? !childField.nullable : false),
            nullable:
              childField.nullable ??
              (childField.required !== undefined ? !childField.required : true),
            readOnly: childField.readOnly ?? false,
            description: childField.description,
            sampleValue: sample,
            rawField: childField,
            children: [],
          };
          nodeMap.set(childPath, childNode);
          parentNode.children.push(childNode);
        }
        processNestedChildren(childField, childNode);
      }
    }
  };

  for (const field of fields) {
    const rawPath = field.path || field.nestedPath || field.name || "";
    const node = nodeMap.get(rawPath);
    if (node) {
      processNestedChildren(field, node);
    }
  }

  return rootNodes;
}

/**
 * Filter tree nodes recursively based on search query
 */
function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;

  const q = query.toLowerCase().trim();

  const filterNode = (node: TreeNode): TreeNode | null => {
    const nameMatch = node.name.toLowerCase().includes(q);
    const pathMatch = node.path.toLowerCase().includes(q);
    const typeMatch = node.inferredType.toLowerCase().includes(q);
    const descMatch = node.description?.toLowerCase().includes(q);

    const filteredChildren = node.children
      .map((child) => filterNode(child))
      .filter((c): c is TreeNode => c !== null);

    if (nameMatch || pathMatch || typeMatch || descMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  return nodes
    .map((node) => filterNode(node))
    .filter((n): n is TreeNode => n !== null);
}

/**
 * Collect all node IDs in a tree
 */
function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const traverse = (list: TreeNode[]) => {
    for (const item of list) {
      ids.push(item.id);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    }
  };
  traverse(nodes);
  return ids;
}

/**
 * Advanced Schema Explorer & Data Preview Component
 */
export function SchemaExplorer({
  schemaResponse,
  entities: initialEntities,
  pagination: initialPagination,
  sampleRecords: initialSampleRecords,
  provider,
  isLoading = false,
  error = null,
  onRetry,
  onSelectField,
  mappings = [],
  onSaveMapping,
  isSavingMapping = false,
  className = "",
}: SchemaExplorerProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tree" | "preview">("tree");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Pagination metadata
  const pagination: DiscoveredPagination | null =
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

  // Select first entity by default or when entities load
  React.useEffect(() => {
    if (entities.length > 0) {
      if (!selectedEntityName || !entities.some((e) => e.name === selectedEntityName)) {
        setSelectedEntityName(entities[0].name);
      }
    }
  }, [entities, selectedEntityName]);

  const activeEntity: DiscoveredEntity | null = useMemo(() => {
    if (entities.length === 0) return null;
    return entities.find((e) => e.name === selectedEntityName) || entities[0];
  }, [entities, selectedEntityName]);

  // Derive sample records
  const sampleRecords = useMemo(() => {
    if (activeEntity?.sampleRecords && activeEntity.sampleRecords.length > 0) {
      return activeEntity.sampleRecords;
    }
    if (activeEntity?.sampleData && activeEntity.sampleData.length > 0) {
      return activeEntity.sampleData;
    }
    if (activeEntity?.records && activeEntity.records.length > 0) {
      return activeEntity.records;
    }
    if (schemaResponse?.sampleRecords && schemaResponse.sampleRecords.length > 0) {
      return schemaResponse.sampleRecords;
    }
    if (schemaResponse?.sampleData && schemaResponse.sampleData.length > 0) {
      return schemaResponse.sampleData;
    }
    if (initialSampleRecords && initialSampleRecords.length > 0) {
      return initialSampleRecords;
    }
    return [];
  }, [activeEntity, schemaResponse, initialSampleRecords]);

  // Derive fields
  const fields: DiscoveredField[] = useMemo(() => {
    if (activeEntity?.fields && Array.isArray(activeEntity.fields) && activeEntity.fields.length > 0) {
      return activeEntity.fields;
    }
    if (schemaResponse?.fields && Array.isArray(schemaResponse.fields) && schemaResponse.fields.length > 0) {
      return schemaResponse.fields;
    }
    return [];
  }, [activeEntity, schemaResponse]);

  // Build full hierarchical tree
  const fullTree = useMemo(() => {
    return buildSchemaTree(fields, sampleRecords);
  }, [fields, sampleRecords]);

  // Filtered tree based on search query
  const displayedTree = useMemo(() => {
    return filterTreeNodes(fullTree, searchQuery);
  }, [fullTree, searchQuery]);

  // Auto-expand all matching nodes when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const allMatchingIds = getAllNodeIds(displayedTree);
      setExpandedNodes(new Set(allMatchingIds));
    }
  }, [searchQuery, displayedTree]);

  // Total record count from various sources
  const totalRecordCount =
    activeEntity?.recordCount ??
    activeEntity?.totalRecords ??
    schemaResponse?.recordCount ??
    schemaResponse?.totalRecords ??
    (sampleRecords.length > 0 ? sampleRecords.length : null);

  // Toggle single node expansion
  const toggleExpand = useCallback((nodeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    setExpandedNodes(new Set(getAllNodeIds(fullTree)));
  }, [fullTree]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Handle field selection
  const handleSelectNode = useCallback(
    (node: TreeNode) => {
      setSelectedPath(node.id);
      if (onSelectField && node.rawField) {
        onSelectField(node.path, node.rawField);
      }
    },
    [onSelectField]
  );

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
        setTransformationInput(existing.transformation || "DIRECT");
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
    try {
      if (sampleRecords.length > 0) {
        return JSON.stringify(sampleRecords, null, 2);
      }
      if (schemaResponse?.rawSchema) {
        return JSON.stringify(schemaResponse.rawSchema, null, 2);
      }
      return "";
    } catch {
      return "";
    }
  }, [sampleRecords, schemaResponse]);

  const isOversizedPreview = useMemo(() => {
    if (!sampleJsonString) return false;
    const byteLength = new Blob([sampleJsonString]).size;
    const lineCount = sampleJsonString.split("\n").length;
    return byteLength > MAX_SCHEMA_PREVIEW_BYTES || lineCount > MAX_SCHEMA_PREVIEW_LINES;
  }, [sampleJsonString]);

  const safeSamplePreview = useMemo(() => {
    if (!sampleJsonString) return "";
    if (!isOversizedPreview) return sampleJsonString;

    // Truncate to maximum lines and append safe indicator
    const lines = sampleJsonString.split("\n");
    const truncatedLines = lines.slice(0, MAX_SCHEMA_PREVIEW_LINES);
    return `${truncatedLines.join("\n")}\n\n// ... [Preview truncated: payload exceeds ${MAX_SCHEMA_PREVIEW_LINES} lines / 150KB] ...\n// Use 'Copy Full Payload' to view complete JSON.`;
  }, [sampleJsonString, isOversizedPreview]);

  // -------------------------------------------------------------------------
  // Edge Case State 1: LOADING
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 space-y-4 rounded-xl border border-border bg-surface ${className}`}>
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
            <Database className="w-6 h-6 animate-spin" />
          </div>
          <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-bounce" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-semibold text-text">
            Discovering Remote Schema...
          </h3>
          <p className="text-xs text-text-muted max-w-sm">
            Extracting hierarchical field paths, data types, and sample payloads from {provider || "integration"}.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Edge Case State 2: MALFORMED RESPONSE OR ERROR
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className={`p-8 rounded-xl border border-error/20 bg-error/5 flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-semibold text-text">
            Schema Discovery Failed
          </h3>
          <p className="text-xs text-text-secondary">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-xs font-semibold text-text shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Discovery</span>
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Edge Case State 3: UNSUPPORTED SCHEMA (Non-object, non-array or missing fields)
  // -------------------------------------------------------------------------
  const isUnsupportedSchema =
    schemaResponse &&
    typeof schemaResponse === "object" &&
    entities.length === 0 &&
    fields.length === 0 &&
    !schemaResponse.rawSchema &&
    !schemaResponse.sampleRecords;

  if (isUnsupportedSchema) {
    return (
      <div className={`p-8 rounded-xl border border-warning/20 bg-warning/5 flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-semibold text-text">
            Unsupported Schema Structure
          </h3>
          <p className="text-xs text-text-secondary">
            The remote provider returned a response format that cannot be inferred automatically into structured entity fields.
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover text-xs font-semibold text-text shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Schema</span>
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Edge Case State 4: NO RECORDS FOUND
  // -------------------------------------------------------------------------
  if (entities.length === 0 && fields.length === 0) {
    return (
      <div className={`p-10 rounded-xl border border-dashed border-border bg-surface-secondary/20 flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-surface-secondary flex items-center justify-center text-text-muted">
          <Layers className="w-5 h-5 opacity-50" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-text">
            No Schema Records Detected
          </h3>
          <p className="text-xs text-text-muted max-w-xs">
            No entities or schema fields could be inferred from {provider || "this integration"}. Test your connection or verify sample data.
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover text-xs font-medium text-text transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Discover Again</span>
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
    const badge = getTypeBadgeDetails(node.inferredType);
    const IconComponent = badge.icon;

    // Check if this field has an active mapping
    const existingMapping = mappings.find((m) => m.sourceField === node.path);

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => handleSelectNode(node)}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
            isSelected
              ? "bg-primary/10 border border-primary/30 text-text font-medium"
              : "hover:bg-surface-hover text-text-secondary hover:text-text border border-transparent"
          }`}
          style={{ paddingLeft: `${node.depth * 18 + 8}px` }}
        >
          {/* Left section: expand chevron, type icon, name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 rounded hover:bg-surface text-text-muted hover:text-text transition-colors"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 flex-shrink-0" />
            )}

            <span className={`p-1 rounded ${badge.bgColor} flex-shrink-0`}>
              <IconComponent className="w-3 h-3" />
            </span>

            <span className="font-mono text-xs truncate" title={node.path}>
              {node.name}
            </span>

            {/* Constraints tag */}
            {node.required && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                Required
              </span>
            )}
            {node.readOnly && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-secondary text-text-muted border border-border flex items-center gap-0.5 flex-shrink-0">
                <Lock className="w-2.5 h-2.5" /> Read-Only
              </span>
            )}
            {existingMapping && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-success/10 text-success border border-success/20 flex items-center gap-0.5 flex-shrink-0">
                <Link className="w-2.5 h-2.5" /> → {existingMapping.targetField}
              </span>
            )}
          </div>

          {/* Right section: sample value preview & type pill */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {node.sampleValue !== undefined && (
              <span
                className="font-mono text-[11px] text-text-muted max-w-[140px] truncate hidden sm:inline"
                title={String(node.sampleValue)}
              >
                {typeof node.sampleValue === "object"
                  ? JSON.stringify(node.sampleValue)
                  : String(node.sampleValue)}
              </span>
            )}

            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${badge.bgColor}`}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {/* Render child nodes if expanded */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Indent Guide Line */}
            <div
              className="absolute top-0 bottom-0 border-l border-border/40 pointer-events-none"
              style={{ left: `${node.depth * 18 + 15}px` }}
            />
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border border-border bg-surface shadow-xs overflow-hidden ${className}`}
    >
      {/* ------------------------------------------------------------------- */}
      {/* Header Bar: Collection Metadata & Record Count */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-4 border-b border-border bg-surface-secondary/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text">
                {activeEntity?.label || activeEntity?.name || provider || "Discovered Schema"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/20">
                Live Inferred
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
              <span>{fields.length} detected fields</span>
              {totalRecordCount !== null && (
                <>
                  <span>•</span>
                  <span>{totalRecordCount.toLocaleString()} total records</span>
                </>
              )}
              {pagination?.pageSize && (
                <>
                  <span>•</span>
                  <span>Page Size: {pagination.pageSize}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("tree")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "tree"
                ? "bg-surface text-text shadow-xs border border-border/50"
                : "text-text-muted hover:text-text"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Schema Tree</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "preview"
                ? "bg-surface text-text shadow-xs border border-border/50"
                : "text-text-muted hover:text-text"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Sample JSON</span>
            {isOversizedPreview && (
              <span
                className="w-2 h-2 rounded-full bg-warning"
                title="Sample preview exceeds 150KB limit"
              />
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Multi-Entity Switcher if multiple entities detected */}
      {/* ------------------------------------------------------------------- */}
      {entities.length > 1 && (
        <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex-shrink-0">
            Entities:
          </span>
          <div className="flex items-center gap-1.5 flex-1">
            {entities.map((ent) => (
              <button
                key={ent.name}
                type="button"
                onClick={() => {
                  setSelectedEntityName(ent.name);
                  setSelectedPath(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 flex items-center gap-1.5 ${
                  selectedEntityName === ent.name
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-surface-secondary text-text-secondary hover:text-text hover:bg-surface-hover border border-border"
                }`}
              >
                <span>{ent.label || ent.name}</span>
                <span className="text-[10px] opacity-75">
                  ({ent.fields?.length || 0})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Main Content Area */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search and tree controls toolbar */}
        {activeTab === "tree" && (
          <div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-surface">
            {/* Search filter input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nested field paths, types, or names..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-surface-secondary text-text text-xs border border-border focus:border-primary focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tree expansion toggles */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExpandAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-hover text-text text-xs font-medium border border-border transition-colors"
                title="Expand all tree branches"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-text-muted" />
                <span className="hidden sm:inline">Expand All</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-hover text-text text-xs font-medium border border-border transition-colors"
                title="Collapse all tree branches"
              >
                <ChevronsDownUp className="w-3.5 h-3.5 text-text-muted" />
                <span className="hidden sm:inline">Collapse All</span>
              </button>
            </div>
          </div>
        )}

        {/* Body Split View: Tree + Field Details Inspector */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {activeTab === "tree" ? (
            <>
              {/* Left: Hierarchical Tree List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-0.5 divide-y divide-border/20 border-r border-border">
                {displayedTree.length === 0 ? (
                  <div className="p-8 text-center text-text-muted space-y-2">
                    <Search className="w-6 h-6 mx-auto opacity-40" />
                    <p className="text-xs">
                      No fields match &quot;{searchQuery}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear search filter
                    </button>
                  </div>
                ) : (
                  displayedTree.map((node) => renderTreeNode(node))
                )}
              </div>

              {/* Right: Selected Field Inspector Drawer */}
              <div className="w-full md:w-80 border-t md:border-t-0 border-border bg-surface-secondary/20 p-4 overflow-y-auto flex flex-col space-y-4">
                {selectedNode ? (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          Field Details
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            getTypeBadgeDetails(selectedNode.inferredType).bgColor
                          }`}
                        >
                          {getTypeBadgeDetails(selectedNode.inferredType).label}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-text font-mono break-all">
                        {selectedNode.name}
                      </h4>
                    </div>

                    {/* Dot Path with Copy */}
                    <div className="p-2.5 rounded-lg bg-surface border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted font-medium">
                          Hierarchical Path
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedNode.path, selectedNode.id)}
                          className="flex items-center gap-1 text-primary hover:text-primary-dark font-medium transition-colors"
                        >
                          {copiedPath === selectedNode.id ? (
                            <>
                              <Check className="w-3 h-3 text-success" />
                              <span className="text-success text-[10px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-[10px]">Copy Path</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="font-mono text-xs text-text bg-surface-secondary p-1.5 rounded border border-border break-all selection:bg-primary/20">
                        {selectedNode.path}
                      </p>
                    </div>

                    {/* Field Metadata Constraints */}
                    <div className="p-3 rounded-lg bg-surface border border-border space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-border">
                        <span className="text-text-muted">Depth Level</span>
                        <span className="font-mono font-medium text-text">
                          {selectedNode.depth}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border">
                        <span className="text-text-muted">Required</span>
                        <span
                          className={`font-semibold ${
                            selectedNode.required ? "text-primary" : "text-text-muted"
                          }`}
                        >
                          {selectedNode.required ? "Yes" : "Optional"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border">
                        <span className="text-text-muted">Nullable</span>
                        <span className="text-text">
                          {selectedNode.nullable ? "True" : "False"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-text-muted">Read-Only</span>
                        <span className="text-text">
                          {selectedNode.readOnly ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    {/* Sample Value Preview */}
                    <div className="p-3 rounded-lg bg-surface border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-muted">
                          Sample Inferred Value
                        </span>
                        {selectedNode.sampleValue !== undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                typeof selectedNode.sampleValue === "object"
                                  ? JSON.stringify(selectedNode.sampleValue, null, 2)
                                  : String(selectedNode.sampleValue)
                              )
                            }
                            className="text-text-muted hover:text-text"
                            title="Copy sample value"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="p-2 rounded bg-surface-secondary border border-border font-mono text-xs text-text max-h-32 overflow-y-auto break-all">
                        {selectedNode.sampleValue !== undefined ? (
                          typeof selectedNode.sampleValue === "object" ? (
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(selectedNode.sampleValue, null, 2)}
                            </pre>
                          ) : (
                            String(selectedNode.sampleValue)
                          )
                        ) : (
                          <span className="text-text-muted italic">
                            No sample value captured for this field.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Field Mapping Action Card */}
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
