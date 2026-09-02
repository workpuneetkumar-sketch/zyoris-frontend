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
  isSaving?: boolean;
  disabled?: boolean;
  className?: string;
}

const PAGE_SIZE = 10;

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
  const [filterType, setFilterType] = useState<MappingFilterType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

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

  // 4. Update Single Mapping
  const handleUpdateRow = useCallback((data: MappingRowData) => {
    setLocalMappings((prev) => ({
      ...prev,
      [data.targetFieldKey]: {
        ...data,
        isDirty: true,
      },
    }));
  }, []);

  const handleRemoveRow = useCallback((targetKey: string) => {
    setLocalMappings((prev) => {
      const next = { ...prev };
      delete next[targetKey];
      return next;
    });
  }, []);

  // 5. Smart Auto-Mapping
  const handleAutoMap = useCallback(() => {
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
    const mappingsList: FieldMapping[] = Object.values(localMappings)
      .filter((m) => m.sourceFieldPath && !m.skipped)
      .map((m) => ({
        sourceField: m.sourceFieldPath!,
        targetField: m.targetFieldKey,
        sourceType: m.sourceType,
        transformation: m.transformation,
      }));

    const payload: SchemaMappingPayload = {
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
      toast.success("Field mappings saved successfully.");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to save schema mappings."
      );
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
  const totalPages = Math.ceil(filteredTargetFields.length / PAGE_SIZE) || 1;
  const paginatedFields = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTargetFields.slice(start, start + PAGE_SIZE);
  }, [filteredTargetFields, currentPage]);

  return (
    <div className={classNames("flex flex-col h-full space-y-4", className)}>
      {/* Top Bar: Entity & Module Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-2xl border border-border bg-surface-secondary/40">
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

        {/* Target Module & Entity Picker */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-info" />
            <span>Target Zyoris Data Module</span>
          </label>
          <div className="flex gap-2">
            <select
              value={selectedTargetModuleId}
              onChange={(e) => onSelectTargetModule?.(e.target.value)}
              disabled={disabled}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-text focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
            >
              {targetModules.map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats and Unsaved Changes Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-surface shadow-xs">
        {/* Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-xs flex items-center gap-1.5">
            <span className="text-text-muted">Total Fields:</span>
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
              <span>Unsaved changes:</span>
              <span className="font-bold">{unsavedCount}</span>
            </div>
          )}
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoMap}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Map Fields</span>
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

      {/* Validation Warning Alert if Required Fields are Missing */}
      {missingRequiredFields.length > 0 && (
        <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2.5 text-xs text-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Required fields unmapped:</strong>{" "}
            {missingRequiredFields.map((f) => f.label).join(", ")}. Please map or configure these fields to ensure successful synchronization.
          </span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Search */}
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

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-surface-secondary/60 p-1 rounded-xl border border-border text-xs w-full sm:w-auto overflow-x-auto">
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
      </div>

      {/* Main Mapping Canvas Table / List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-60">
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
                disabled={disabled}
              />
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-muted">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(currentPage * PAGE_SIZE, filteredTargetFields.length)} of{" "}
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
