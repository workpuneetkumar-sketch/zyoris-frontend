"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  TargetModuleDefinition,
  TargetEntityDefinition,
  TargetFieldDefinition,
  DiscoveredEntity,
  DiscoveredField,
  FieldMapping,
  SchemaMappingPayload,
  MappingTransformation,
} from "@/types/integrations";
import {
  FlatSourceField,
  flattenDiscoveredFields,
  getFieldTypeIcon,
} from "./SourceFieldSelector";
import { MappingRow, MappingRowData } from "./MappingRow";
import {
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Filter,
  ArrowRight,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Database,
  Tag,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import classNames from "classnames";
import { toast } from "sonner";

export type MappingFilterType = "ALL" | "MAPPED" | "UNMAPPED" | "REQUIRED" | "UNSAVED";

export interface MappingWorkspaceProps {
  sourceEntities: DiscoveredEntity[];
  targetModules: TargetModuleDefinition[];
  selectedSourceEntityName?: string;
  onSelectSourceEntity?: (name: string) => void;
  selectedTargetModuleId?: string;
  onSelectTargetModule?: (moduleId: string) => void;
  selectedTargetEntityId?: string;
  onSelectTargetEntity?: (entityId: string) => void;
  initialMappings?: FieldMapping[];
  onSaveMappings: (payload: SchemaMappingPayload) => Promise<void>;
  integrationId?: string;
  isSaving?: boolean;
  disabled?: boolean;
  className?: string;
}

function parseTransformation(t?: string | MappingTransformation): MappingTransformation | undefined {
  if (!t) return undefined;
  if (typeof t === "string") {
    return { type: t as any };
  }
  return t;
}

export const MappingWorkspace: React.FC<MappingWorkspaceProps> = ({
  sourceEntities,
  targetModules,
  selectedSourceEntityName,
  onSelectSourceEntity,
  selectedTargetModuleId = "leads",
  onSelectTargetModule,
  selectedTargetEntityId,
  onSelectTargetEntity,
  initialMappings = [],
  onSaveMappings,
  integrationId,
  isSaving = false,
  disabled = false,
  className,
}) => {
  // 1. Resolve Target Module & Entity
  const currentModule = useMemo(() => {
    return (
      targetModules.find((m) => m.id === selectedTargetModuleId) ||
      targetModules[0] || { id: "leads", label: "Leads", entities: [] }
    );
  }, [targetModules, selectedTargetModuleId]);

  const currentTargetEntity = useMemo(() => {
    if (!currentModule?.entities || currentModule.entities.length === 0) {
      return null;
    }
    if (selectedTargetEntityId) {
      return (
        currentModule.entities.find((e) => e.id === selectedTargetEntityId || e.name === selectedTargetEntityId) ||
        currentModule.entities[0]
      );
    }
    return currentModule.entities[0];
  }, [currentModule, selectedTargetEntityId]);

  // 2. Resolve Source Entity & Source Fields
  const currentSourceEntity = useMemo(() => {
    if (sourceEntities.length === 0) return null;
    if (selectedSourceEntityName) {
      return (
        sourceEntities.find(
          (e) => e.name === selectedSourceEntityName || e.label === selectedSourceEntityName
        ) || sourceEntities[0]
      );
    }
    return sourceEntities[0];
  }, [sourceEntities, selectedSourceEntityName]);

  const flatSourceFields = useMemo(() => {
    if (!currentSourceEntity?.fields) return [];
    return flattenDiscoveredFields(currentSourceEntity.fields);
  }, [currentSourceEntity]);

  // 3. Local Mapping State & Custom Target Fields
  const [customFields, setCustomFields] = useState<TargetFieldDefinition[]>([]);
  const [localMappings, setLocalMappings] = useState<Record<string, MappingRowData>>(() => {
    const initial: Record<string, MappingRowData> = {};
    for (const m of initialMappings) {
      if (m.targetField) {
        initial[m.targetField] = {
          targetFieldKey: m.targetField,
          sourceFieldPath: m.sourceField,
          sourceType: m.sourceType,
          transformation: parseTransformation(m.transformation),
          skipped: false,
          isDirty: false,
        };
      }
    }
    return initial;
  });

  // Search & Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceSearchQuery, setSourceSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<MappingFilterType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showSourceSidebar, setShowSourceSidebar] = useState(true);
  const [backendValidationError, setBackendValidationError] = useState<string | null>(null);

  // Combined Target Fields (Standard + Custom)
  const allTargetFields = useMemo(() => {
    const standard = currentTargetEntity?.targetFields || [];
    return [...standard, ...customFields];
  }, [currentTargetEntity, customFields]);

  // Sample records map for live evaluation
  const sampleData = useMemo<Record<string, any>>(() => {
    const samples = currentSourceEntity?.sampleRecords;
    if (Array.isArray(samples) && samples.length > 0 && typeof samples[0] === "object") {
      return samples[0] as Record<string, any>;
    }
    return typeof samples === "object" && samples !== null && !Array.isArray(samples)
      ? (samples as Record<string, any>)
      : {};
  }, [currentSourceEntity]);

  // Filtered Source Fields for Sidebar Drag & Drop
  const filteredSourceFields = useMemo(() => {
    if (!sourceSearchQuery.trim()) return flatSourceFields;
    const q = sourceSearchQuery.toLowerCase().trim();
    return flatSourceFields.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q)
    );
  }, [flatSourceFields, sourceSearchQuery]);

  // 4. Update Single Mapping
  const handleUpdateRow = useCallback((data: MappingRowData) => {
    setBackendValidationError(null);
    setLocalMappings((prev) => ({
      ...prev,
      [data.targetFieldKey]: {
        ...data,
        isDirty: true,
      },
    }));
  }, []);

  const handleRemoveRow = useCallback((targetKey: string) => {
    setBackendValidationError(null);
    setLocalMappings((prev) => {
      const next = { ...prev };
      delete next[targetKey];
      return next;
    });
  }, []);

  // 5. Smart Auto-Mapping
  const handleAutoMap = useCallback(() => {
    setBackendValidationError(null);
    let matchCount = 0;
    const updated = { ...localMappings };

    for (const target of allTargetFields) {
      // If already mapped and not dirty, skip unless unmapped
      if (updated[target.key]?.sourceFieldPath) continue;

      const targetNorm = target.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetLabelNorm = target.label.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Find exact or normalized match in flatSourceFields
      const matched = flatSourceFields.find((s) => {
        const sNameNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const sPathNorm = s.path.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          sNameNorm === targetNorm ||
          sNameNorm === targetLabelNorm ||
          sPathNorm === targetNorm ||
          s.path.toLowerCase().endsWith(`.${targetNorm}`)
        );
      });

      if (matched) {
        updated[target.key] = {
          targetFieldKey: target.key,
          sourceFieldPath: matched.path,
          sourceType: matched.type,
          skipped: false,
          isDirty: true,
        };
        matchCount++;
      }
    }

    setLocalMappings(updated);
    if (matchCount > 0) {
      toast.success(`Auto-mapped ${matchCount} matching fields.`);
    } else {
      toast.info("No new matching field names found for auto-mapping.");
    }
  }, [allTargetFields, flatSourceFields, localMappings]);

  // 6. Reset / Revert Mappings
  const handleRevert = useCallback(() => {
    setBackendValidationError(null);
    const initial: Record<string, MappingRowData> = {};
    for (const m of initialMappings) {
      if (m.targetField) {
        initial[m.targetField] = {
          targetFieldKey: m.targetField,
          sourceFieldPath: m.sourceField,
          sourceType: m.sourceType,
          transformation: parseTransformation(m.transformation),
          skipped: false,
          isDirty: false,
        };
      }
    }
    setLocalMappings(initial);
    toast.info("Reverted all unsaved mapping modifications.");
  }, [initialMappings]);

  // 7. Save Mappings
  const handleSave = async () => {
    setBackendValidationError(null);

    // Validate required target fields
    const missingReq = allTargetFields.filter((t) => {
      if (!t.required) return false;
      const m = localMappings[t.key];
      return !m || !m.sourceFieldPath || m.skipped;
    });

    if (missingReq.length > 0) {
      const msg = `Required target field(s) unmapped: ${missingReq.map((f) => f.label).join(", ")}`;
      setBackendValidationError(msg);
      toast.error(msg);
      return;
    }

    const mappingsList: FieldMapping[] = Object.values(localMappings)
      .filter((m) => m.sourceFieldPath && !m.skipped)
      .map((m) => ({
        sourceField: m.sourceFieldPath!,
        targetField: m.targetFieldKey,
        sourceType: m.sourceType,
        transformation: m.transformation,
      }));

    const payload: SchemaMappingPayload = {
      integrationId,
      mappings: mappingsList,
      targetModule: currentModule.id,
      targetEntity: currentTargetEntity?.id || currentTargetEntity?.name || "Lead",
    };

    try {
      await onSaveMappings(payload);
      // Clear dirty flags
      setLocalMappings((prev) => {
        const next: Record<string, MappingRowData> = {};
        for (const [k, v] of Object.entries(prev)) {
          next[k] = { ...v, isDirty: false };
        }
        return next;
      });
      toast.success("Field mappings persisted successfully.");
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save schema mappings due to invalid integration or entity reference.";
      setBackendValidationError(errMsg);
      toast.error(errMsg);
    }
  };

  // 8. Stats & Counts
  const totalTargetCount = allTargetFields.length;
  const mappedCount = useMemo(() => {
    return Object.values(localMappings).filter(
      (m) => m.sourceFieldPath && !m.skipped
    ).length;
  }, [localMappings]);

  const unmappedCount = totalTargetCount - mappedCount;

  const unsavedCount = useMemo(() => {
    return Object.values(localMappings).filter((m) => m.isDirty).length;
  }, [localMappings]);

  const missingRequiredFields = useMemo(() => {
    return allTargetFields.filter((t) => {
      if (!t.required) return false;
      const m = localMappings[t.key];
      return !m || !m.sourceFieldPath || m.skipped;
    });
  }, [allTargetFields, localMappings]);

  // 9. Filtered Target Fields
  const filteredTargetFields = useMemo(() => {
    return allTargetFields.filter((field) => {
      const mapping = localMappings[field.key];
      const isFieldMapped = Boolean(mapping?.sourceFieldPath && !mapping?.skipped);

      // Filter by Type
      if (filterType === "MAPPED" && !isFieldMapped) return false;
      if (filterType === "UNMAPPED" && isFieldMapped) return false;
      if (filterType === "REQUIRED" && !field.required) return false;
      if (filterType === "UNSAVED" && !mapping?.isDirty) return false;

      // Filter by Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const keyMatch = field.key.toLowerCase().includes(q);
        const labelMatch = field.label.toLowerCase().includes(q);
        const srcMatch = mapping?.sourceFieldPath?.toLowerCase().includes(q);
        if (!keyMatch && !labelMatch && !srcMatch) return false;
      }

      return true;
    });
  }, [allTargetFields, localMappings, filterType, searchQuery]);

  // 10. Pagination
  const effectivePageSize = pageSize === 0 ? filteredTargetFields.length || 1 : pageSize;
  const totalPages = Math.ceil(filteredTargetFields.length / effectivePageSize) || 1;
  const paginatedFields = useMemo(() => {
    if (pageSize === 0) return filteredTargetFields;
    const start = (currentPage - 1) * pageSize;
    return filteredTargetFields.slice(start, start + pageSize);
  }, [filteredTargetFields, currentPage, pageSize]);

  return (
    <div className={classNames("flex flex-col h-full space-y-3.5", className)}>
      {/* Top Bar: Entity & Module Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-2xl border border-border bg-surface-secondary/40">
        {/* Source Entity Picker */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5 mb-1.5">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span>Source Discovered Entity</span>
          </label>
          <select
            value={currentSourceEntity?.name || ""}
            onChange={(e) => onSelectSourceEntity?.(e.target.value)}
            disabled={disabled || sourceEntities.length <= 1}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-text focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          >
            {sourceEntities.map((ent) => (
              <option key={ent.name || ent.label} value={ent.name || ent.label}>
                {ent.label || ent.name} ({ent.fields?.length || 0} fields)
              </option>
            ))}
          </select>
        </div>

        {/* Target Module Picker */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-info" />
            <span>Target Zyoris Data Module</span>
          </label>
          <select
            value={selectedTargetModuleId}
            onChange={(e) => onSelectTargetModule?.(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-text focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          >
            {targetModules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats and Unsaved Changes Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-surface shadow-xs">
        {/* Statistics Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-xs flex items-center gap-1.5">
            <span className="text-text-muted">Total:</span>
            <span className="font-bold text-text">{totalTargetCount}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-success/10 border border-success/20 text-xs text-success flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mapped:</span>
            <span className="font-bold">{mappedCount}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-xs flex items-center gap-1.5">
            <span className="text-text-muted">Unmapped:</span>
            <span className="font-bold text-text-muted">{unmappedCount}</span>
          </div>

          {missingRequiredFields.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-error/10 border border-error/20 text-xs text-error flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Required Missing:</span>
              <span className="font-bold">{missingRequiredFields.length}</span>
            </div>
          )}

          {unsavedCount > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Unsaved:</span>
              <span className="font-bold">{unsavedCount}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSourceSidebar(!showSourceSidebar)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text text-xs font-medium transition-colors shadow-xs"
            title="Toggle Draggable Source Fields Sidebar"
          >
            {showSourceSidebar ? (
              <PanelLeftClose className="w-3.5 h-3.5 text-text-muted" />
            ) : (
              <PanelLeftOpen className="w-3.5 h-3.5 text-text-muted" />
            )}
            <span className="hidden sm:inline">
              {showSourceSidebar ? "Hide Drag Tray" : "Show Drag Tray"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAutoMap}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Map</span>
          </button>

          {unsavedCount > 0 && (
            <button
              type="button"
              onClick={handleRevert}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text text-xs font-semibold transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
              <span>Revert</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || isSaving || unsavedCount === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Mappings</span>
          </button>
        </div>
      </div>

      {/* Backend Validation Feedback Error Banner */}
      {backendValidationError && (
        <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex items-start justify-between gap-2.5 text-xs text-error">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Validation Feedback / Save Rejected</p>
              <p className="opacity-90">{backendValidationError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBackendValidationError(null)}
            className="text-error hover:opacity-75"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search mapped or target fields..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-surface-secondary/60 p-1 rounded-xl border border-border text-xs overflow-x-auto">
            {(["ALL", "REQUIRED", "MAPPED", "UNMAPPED", "UNSAVED"] as MappingFilterType[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setFilterType(tab);
                    setCurrentPage(1);
                  }}
                  className={classNames(
                    "px-3 py-1 rounded-lg font-semibold text-xs transition-colors capitalize whitespace-nowrap",
                    filterType === tab
                      ? "bg-surface text-text shadow-xs border border-border"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  {tab.toLowerCase()}
                </button>
              )
            )}
          </div>

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 rounded-xl border border-border bg-surface text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={0}>All fields</option>
          </select>
        </div>
      </div>

      {/* Main Workspace Area (Split: Left Drag Tray + Right Mapping Canvas) */}
      <div className="flex-1 flex gap-3 min-h-60 overflow-hidden">
        {/* Left Drag Tray: Available Source Fields */}
        {showSourceSidebar && (
          <div className="w-64 flex-shrink-0 flex flex-col border border-border rounded-2xl bg-surface-secondary/30 p-3 space-y-2 hidden lg:flex">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-text flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" />
                <span>Source Fields ({flatSourceFields.length})</span>
              </span>
            </div>

            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={sourceSearchQuery}
                onChange={(e) => setSourceSearchQuery(e.target.value)}
                placeholder="Search drag fields..."
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-border bg-surface text-[11px] text-text placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {filteredSourceFields.length === 0 ? (
                <p className="text-[11px] text-text-muted text-center py-4">
                  No source fields match
                </p>
              ) : (
                filteredSourceFields.map((f) => (
                  <div
                    key={f.path}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/x-zyoris-field",
                        JSON.stringify({ path: f.path, type: f.type, name: f.name })
                      );
                      e.dataTransfer.setData("text/plain", f.path);
                    }}
                    className="p-2 rounded-xl border border-border bg-surface hover:border-primary/50 hover:bg-surface-hover cursor-grab transition-all shadow-2xs group flex items-center justify-between gap-1.5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <GripVertical className="w-3 h-3 text-text-muted opacity-40 group-hover:opacity-100 flex-shrink-0" />
                      {getFieldTypeIcon(f.type)}
                      <span className="font-mono text-[11px] text-text font-medium truncate">
                        {f.path}
                      </span>
                    </div>
                    <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-surface-secondary text-text-muted border border-border flex-shrink-0">
                      {f.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Right Mapping Canvas Table */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {paginatedFields.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface/50 space-y-2">
              <Tag className="w-8 h-8 text-text-muted mx-auto" />
              <h4 className="text-sm font-bold text-text">No Mapping Fields Found</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No target schema fields matched your current search or active filter settings.
              </p>
            </div>
          ) : (
            paginatedFields.map((targetField) => {
              const mappingData = localMappings[targetField.key];
              const sampleVal = mappingData?.sourceFieldPath
                ? sampleData?.[mappingData.sourceFieldPath]
                : undefined;

              return (
                <MappingRow
                  key={targetField.key}
                  targetField={targetField}
                  sourceFields={flatSourceFields}
                  mapping={mappingData}
                  onUpdateMapping={handleUpdateRow}
                  onRemoveMapping={() => handleRemoveRow(targetField.key)}
                  sampleSourceValue={sampleVal}
                  integrationId={integrationId}
                  disabled={disabled}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && pageSize > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-muted">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} -{" "}
            {Math.min(currentPage * pageSize, filteredTargetFields.length)} of{" "}
            {filteredTargetFields.length} fields
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-text">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
