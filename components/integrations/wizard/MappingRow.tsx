"use client";

import React, { useState } from "react";
import {
  TargetFieldDefinition,
  DiscoveredField,
  TransformationRuleType,
  MappingTransformation,
} from "@/types/integrations";
import {
  SourceFieldSelector,
  FlatSourceField,
  getFieldTypeIcon,
} from "./SourceFieldSelector";
import { TargetFieldSelector } from "./TargetFieldSelector";
import {
  ArrowRight,
  Sparkles,
  Sliders,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Check,
  Eye,
  EyeOff,
  Code,
  X,
  HelpCircle,
  Play,
  Loader2,
  GripVertical,
} from "lucide-react";
import classNames from "classnames";
import { previewTransformationApi } from "@/lib/api/integrationsApi";
import { executeTransformationPipeline } from "@/lib/transformations/engine";
import { TransformationRuleEditor } from "./TransformationRuleEditor";
import { toast } from "sonner";

export interface MappingRowData {
  targetFieldKey: string;
  sourceFieldPath?: string;
  sourceType?: string;
  transformation?: MappingTransformation;
  skipped?: boolean;
  isDirty?: boolean;
  error?: string;
  confidence?: number;
  confidenceTier?: "high" | "medium" | "low";
  matchReason?: string;
  isSuggested?: boolean;
  isConfirmed?: boolean;
}

export interface MappingRowProps {
  targetField: TargetFieldDefinition;
  sourceFields: DiscoveredField[] | FlatSourceField[];
  mapping?: MappingRowData;
  onUpdateMapping: (updated: MappingRowData) => void;
  onRemoveMapping: () => void;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
  disabled?: boolean;
  sampleSourceValue?: any;
  integrationId?: string;
  className?: string;
}

export function checkTypeCompatibility(
  sourceType?: string,
  targetType?: string
): { isCompatible: boolean; warning?: string; badge: string } {
  if (!sourceType || !targetType) {
    return { isCompatible: true, badge: "UNMAPPED" };
  }

  const s = sourceType.toLowerCase();
  const t = targetType.toLowerCase();

  if (s === t) {
    return { isCompatible: true, badge: "MATCH" };
  }

  if (t === "string") {
    return { isCompatible: true, badge: "AUTO-CONVERT" };
  }

  if (
    ["number", "int", "integer", "float", "double"].includes(t) &&
    ["number", "int", "integer", "float", "double"].includes(s)
  ) {
    return { isCompatible: true, badge: "MATCH" };
  }

  if (
    ["date", "datetime", "timestamp"].includes(t) &&
    ["date", "datetime", "timestamp", "string"].includes(s)
  ) {
    return { isCompatible: true, badge: "PARSE-DATE" };
  }

  return {
    isCompatible: false,
    warning: `Source type '${sourceType}' may require explicit transformation to target type '${targetType}'.`,
    badge: "MISMATCH",
  };
}

export function applyClientTransformation(
  value: any,
  transformation?: MappingTransformation
): string {
  if (!transformation || transformation.type === "none") {
    if (value === undefined || value === null) return "";
    return String(value);
  }

  const result = executeTransformationPipeline(value, [
    {
      type: transformation.type,
      params:
        transformation.type === "DEFAULT_VALUE"
          ? { defaultValue: transformation.defaultValue }
          : transformation.config,
    },
  ]);

  return result.transformedValue;
}

export const MappingRow: React.FC<MappingRowProps> = ({
  targetField,
  sourceFields,
  mapping,
  onUpdateMapping,
  onRemoveMapping,
  onAcceptSuggestion,
  onRejectSuggestion,
  disabled = false,
  sampleSourceValue,
  integrationId,
  className,
}) => {
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [selectedTransformType, setSelectedTransformType] =
    useState<TransformationRuleType>(mapping?.transformation?.type || "none");
  const [defaultVal, setDefaultVal] = useState<string>(
    mapping?.transformation?.defaultValue || ""
  );

  // Server Transformation Preview State
  const [isPreviewingServer, setIsPreviewingServer] = useState(false);
  const [serverPreviewResult, setServerPreviewResult] = useState<{
    originalValue?: string;
    transformedValue?: string;
    steps?: Array<{ ruleType: string; output: string; success: boolean }>;
  } | null>(null);

  const [pendingTransform, setPendingTransform] = useState<{
    primaryType: TransformationRuleType;
    config: Record<string, any>;
    defaultValue?: string;
    rules: Array<{ type: TransformationRuleType; params?: Record<string, any> }>;
  } | null>(null);

  // Drag & Drop State
  const [isDragOver, setIsDragOver] = useState(false);

  const isMapped = Boolean(mapping?.sourceFieldPath);
  const isSkipped = Boolean(mapping?.skipped);
  const isDirty = Boolean(mapping?.isDirty);
  const isRequired = Boolean(targetField.required);
  const isMissingRequired = isRequired && !isMapped && !isSkipped;

  const typeCheck = checkTypeCompatibility(
    mapping?.sourceType,
    targetField.type
  );

  // Handle Source Field Selection
  const handleSelectSource = (fieldPath: string, fieldType?: string) => {
    onUpdateMapping({
      targetFieldKey: targetField.key,
      sourceFieldPath: fieldPath,
      sourceType: fieldType,
      transformation: mapping?.transformation,
      skipped: false,
      isDirty: true,
    });
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragOver(false);

    try {
      const dataStr = e.dataTransfer.getData("application/x-zyoris-field") || e.dataTransfer.getData("text/plain");
      if (dataStr) {
        let fieldPath = dataStr;
        let fieldType: string | undefined;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.path) {
            fieldPath = parsed.path;
            fieldType = parsed.type;
          }
        } catch {
          // Plain string path
        }

        handleSelectSource(fieldPath, fieldType);
        toast.success(`Connected ${fieldPath} → ${targetField.label}`);
      }
    } catch (err) {
      console.warn("Drag and drop mapping error:", err);
    }
  };

  // Toggle Skip Action
  const handleToggleSkip = () => {
    onUpdateMapping({
      targetFieldKey: targetField.key,
      sourceFieldPath: mapping?.sourceFieldPath,
      sourceType: mapping?.sourceType,
      transformation: mapping?.transformation,
      skipped: !isSkipped,
      isDirty: true,
    });
  };

  // Save Transformation
  const handleSaveTransformation = () => {
    const transformConfig: MappingTransformation | undefined =
      selectedTransformType === "none"
        ? undefined
        : {
            type: selectedTransformType,
            defaultValue:
              selectedTransformType === "DEFAULT_VALUE" ? defaultVal : undefined,
          };

    onUpdateMapping({
      targetFieldKey: targetField.key,
      sourceFieldPath: mapping?.sourceFieldPath,
      sourceType: mapping?.sourceType,
      transformation: transformConfig,
      skipped: mapping?.skipped,
      isDirty: true,
    });
    setShowTransformModal(false);
  };

  // Test Server Transformation Preview
  const handleTestServerTransformation = async () => {
    if (!integrationId) {
      toast.info("Client-side simulation active (saving integration unlocks server validation).");
      return;
    }
    const sampleInput = sampleSourceValue !== undefined ? String(sampleSourceValue) : "  Sample Input 123  ";
    setIsPreviewingServer(true);

    try {
      const res = await previewTransformationApi(integrationId, {
        sampleValue: sampleInput,
        rules: [
          {
            type: selectedTransformType as any,
            params: selectedTransformType === "DEFAULT_VALUE" ? { defaultValue: defaultVal } : undefined,
          },
        ],
      });

      if (res.success && res.data) {
        setServerPreviewResult(res.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Server preview failed.");
    } finally {
      setIsPreviewingServer(false);
    }
  };

  // Calculated Preview
  const previewValue = isMapped
    ? applyClientTransformation(sampleSourceValue ?? "Example Value", mapping?.transformation)
    : "";

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={classNames(
          "p-3 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs",
          isDragOver
            ? "border-primary ring-2 ring-primary/40 bg-primary/5"
            : isSkipped
            ? "border-border/60 bg-surface-secondary/30 opacity-70"
            : isMissingRequired
            ? "border-error/30 bg-error/5 border-l-4 border-l-error"
            : mapping?.isSuggested && !mapping?.isConfirmed
            ? "border-indigo-500 bg-indigo-50/15 dark:bg-indigo-950/20 border-l-4 border-l-indigo-500"
            : mapping?.isConfirmed
            ? "border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10 border-l-4 border-l-emerald-500"
            : isMapped
            ? "border-border bg-surface hover:border-border-hover shadow-2xs"
            : "border-border/80 bg-surface/80"
        )}
      >
        {/* Left Side: Target Field Info */}
        <div className="w-full md:w-5/12 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-text text-xs">
              {targetField.label || targetField.key}
            </span>

            {targetField.key !== targetField.label && (
              <span className="text-[10px] font-mono text-text-muted">
                ({targetField.key})
              </span>
            )}

            {isRequired && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-error/15 text-error border border-error/30 uppercase">
                Required
              </span>
            )}

            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-secondary text-text-secondary border border-border">
              {targetField.type}
            </span>

            {mapping?.isSuggested && !mapping?.isConfirmed && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                Suggested ({Math.round((mapping.confidence ?? 0.85) * 100)}%)
              </span>
            )}

            {mapping?.isConfirmed && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Confirmed
              </span>
            )}

            {isSkipped && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface-secondary text-text-muted border border-border uppercase">
                Skipped
              </span>
            )}

            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"
                title="Unsaved mapping modifications"
              />
            )}
          </div>

          {targetField.description && (
            <p className="text-[11px] text-text-muted line-clamp-1">
              {targetField.description}
            </p>
          )}

          {isMissingRequired && (
            <p className="text-[10px] font-semibold text-error flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3" />
              <span>Required field must be mapped or skipped</span>
            </p>
          )}
        </div>

        {/* Center: Mapping Indicator & Type Compatibility */}
        <div className="hidden md:flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1 text-text-muted">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>

          {isMapped && !isSkipped && (
            <span
              className={classNames(
                "text-[9px] font-mono font-semibold px-1 rounded uppercase mt-0.5",
                typeCheck.badge === "MATCH"
                  ? "text-success bg-success/10"
                  : typeCheck.badge === "AUTO-CONVERT" || typeCheck.badge === "PARSE-DATE"
                  ? "text-info bg-info/10"
                  : "text-warning bg-warning/10"
              )}
            >
              {typeCheck.badge}
            </span>
          )}
        </div>

        {/* Right Side: Source Field Selector & Action Controls */}
        <div className="w-full md:w-6/12 flex items-center justify-end gap-2">
          {!isSkipped ? (
            <div className="flex-1 min-w-0">
              <SourceFieldSelector
                fields={sourceFields}
                selectedFieldPath={mapping?.sourceFieldPath}
                onSelectField={handleSelectSource}
                onClear={onRemoveMapping}
                disabled={disabled}
                placeholder="Select or drop source field..."
              />
            </div>
          ) : (
            <div className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-surface-secondary/50 text-text-muted text-xs italic">
              Field is marked as skipped / ignored
            </div>
          )}

          {/* Inline Transformation & Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {mapping?.isSuggested && !mapping?.isConfirmed && (
              <>
                {onAcceptSuggestion && (
                  <button
                    type="button"
                    onClick={onAcceptSuggestion}
                    disabled={disabled}
                    title="Accept suggested mapping"
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Accept</span>
                  </button>
                )}
                {onRejectSuggestion && (
                  <button
                    type="button"
                    onClick={onRejectSuggestion}
                    disabled={disabled}
                    title="Reject suggested mapping"
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-surface text-text-secondary hover:text-error hover:border-error/30 hover:bg-error/10 font-semibold text-[11px] transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Reject</span>
                  </button>
                )}
              </>
            )}

            {isMapped && !isSkipped && (
              <button
                type="button"
                onClick={() => setShowTransformModal(true)}
                disabled={disabled}
                title={
                  mapping?.transformation && mapping.transformation.type !== "none"
                    ? `Active transform: ${mapping.transformation.type}`
                    : "Add transformation rule"
                }
                className={classNames(
                  "p-1.5 rounded-lg border text-xs transition-colors relative",
                  mapping?.transformation && mapping.transformation.type !== "none"
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "border-border bg-surface text-text-muted hover:text-text hover:bg-surface-hover"
                )}
              >
                <Sliders className="w-3.5 h-3.5" />
                {mapping?.transformation && mapping.transformation.type !== "none" && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            )}

            {/* Skip Toggle */}
            <button
              type="button"
              onClick={handleToggleSkip}
              disabled={disabled}
              title={isSkipped ? "Unskip field" : "Skip / Ignore this field"}
              className={classNames(
                "p-1.5 rounded-lg border text-xs transition-colors",
                isSkipped
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 font-semibold"
                  : "border-border bg-surface text-text-muted hover:text-text hover:bg-surface-hover"
              )}
            >
              {isSkipped ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Remove Mapping */}
            {isMapped && (
              <button
                type="button"
                onClick={onRemoveMapping}
                disabled={disabled}
                title="Clear mapping"
                className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-error hover:bg-error/10 hover:border-error/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Transformation Modal / Drawer */}
      {showTransformModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-sm text-text">
                  Configure Transformation Pipeline: {targetField.label}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTransformModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <TransformationRuleEditor
              initialType={mapping?.transformation?.type || "none"}
              initialConfig={mapping?.transformation?.config || {}}
              initialDefaultValue={mapping?.transformation?.defaultValue || ""}
              initialRules={
                Array.isArray(mapping?.transformation?.config?.rules)
                  ? mapping?.transformation?.config?.rules
                  : undefined
              }
              sourceSampleValue={sampleSourceValue}
              targetFieldLabel={targetField.label}
              targetFieldKey={targetField.key}
              integrationId={integrationId}
              disabled={disabled}
              onChange={(res) => setPendingTransform(res)}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowTransformModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingTransform) {
                    onUpdateMapping({
                      targetFieldKey: targetField.key,
                      sourceFieldPath: mapping?.sourceFieldPath,
                      sourceType: mapping?.sourceType,
                      transformation:
                        pendingTransform.primaryType === "none"
                          ? undefined
                          : {
                              type: pendingTransform.primaryType,
                              defaultValue: pendingTransform.defaultValue,
                              config: {
                                ...pendingTransform.config,
                                rules: pendingTransform.rules,
                              },
                            },
                      skipped: mapping?.skipped,
                      isDirty: true,
                    });
                  }
                  setShowTransformModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-xs"
              >
                Apply Transformation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
