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
  Eye,
  EyeOff,
  Code,
  X,
  HelpCircle,
} from "lucide-react";
import classNames from "classnames";

export interface MappingRowData {
  targetFieldKey: string;
  sourceFieldPath?: string;
  sourceType?: string;
  transformation?: MappingTransformation;
  skipped?: boolean;
  isDirty?: boolean;
  error?: string;
}

export interface MappingRowProps {
  targetField: TargetFieldDefinition;
  sourceFields: DiscoveredField[] | FlatSourceField[];
  mapping?: MappingRowData;
  onUpdateMapping: (updated: MappingRowData) => void;
  onRemoveMapping: () => void;
  disabled?: boolean;
  sampleSourceValue?: any;
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
  if (value === undefined || value === null) {
    return transformation?.defaultValue || "";
  }
  const str = String(value);
  if (!transformation || transformation.type === "none") {
    return str;
  }
  switch (transformation.type) {
    case "UPPERCASE":
      return str.toUpperCase();
    case "LOWERCASE":
      return str.toLowerCase();
    case "TRIM":
      return str.trim();
    case "PARSE_DATE":
      try {
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toISOString();
      } catch {
        return str;
      }
    case "DEFAULT_VALUE":
      return str.trim() ? str : transformation.defaultValue || "";
    default:
      return str;
  }
}

export const MappingRow: React.FC<MappingRowProps> = ({
  targetField,
  sourceFields,
  mapping,
  onUpdateMapping,
  onRemoveMapping,
  disabled = false,
  sampleSourceValue,
  className,
}) => {
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [selectedTransformType, setSelectedTransformType] =
    useState<TransformationRuleType>(mapping?.transformation?.type || "none");
  const [defaultVal, setDefaultVal] = useState<string>(
    mapping?.transformation?.defaultValue || ""
  );

  const isMapped = Boolean(mapping?.sourceFieldPath);
  const isSkipped = Boolean(mapping?.skipped);
  const isDirty = Boolean(mapping?.isDirty);
  const isRequired = Boolean(targetField.required);
  const isMissingRequired = isRequired && !isMapped && !isSkipped;

  const typeCheck = checkTypeCompatibility(
    mapping?.sourceType,
    targetField.type
  );

  const transformedPreview = applyClientTransformation(
    sampleSourceValue,
    mapping?.transformation
  );

  const handleSourceSelect = (field: FlatSourceField | null) => {
    if (!field) {
      onUpdateMapping({
        targetFieldKey: targetField.key,
        sourceFieldPath: undefined,
        sourceType: undefined,
        transformation: undefined,
        skipped: false,
        isDirty: true,
      });
      return;
    }

    onUpdateMapping({
      targetFieldKey: targetField.key,
      sourceFieldPath: field.path,
      sourceType: field.type,
      transformation: mapping?.transformation,
      skipped: false,
      isDirty: true,
    });
  };

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

  const handleSaveTransform = () => {
    onUpdateMapping({
      targetFieldKey: targetField.key,
      sourceFieldPath: mapping?.sourceFieldPath,
      sourceType: mapping?.sourceType,
      transformation: {
        type: selectedTransformType,
        defaultValue: defaultVal || undefined,
      },
      skipped: isSkipped,
      isDirty: true,
    });
    setShowTransformModal(false);
  };

  return (
    <div
      className={classNames(
        "p-3 rounded-xl border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs group",
        isMissingRequired
          ? "border-error/40 bg-error/5"
          : isMapped
          ? "border-border bg-surface hover:border-border-hover"
          : isSkipped
          ? "border-dashed border-border bg-surface-secondary/30 opacity-70"
          : "border-border/60 bg-surface/50",
        isDirty && "ring-1 ring-amber-500/30",
        className
      )}
    >
      {/* Left Column: Target Field Info */}
      <div className="md:w-5/12 min-w-0 flex items-start sm:items-center gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getFieldTypeIcon(targetField.type)}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-text truncate">
                {targetField.label}
              </span>
              <span className="font-mono text-[10px] text-text-muted truncate">
                ({targetField.key})
              </span>
              {isRequired && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-error/10 text-error border border-error/20 uppercase">
                  Required
                </span>
              )}
              {isDirty && (
                <span
                  className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"
                  title="Unsaved local modification"
                />
              )}
            </div>
            {targetField.description && (
              <p className="text-[10px] text-text-muted truncate mt-0.5 max-w-sm">
                {targetField.description}
              </p>
            )}
          </div>
        </div>

        {/* Arrow separator on desktop */}
        <ArrowRight className="hidden md:block w-4 h-4 text-text-muted flex-shrink-0 mx-1" />
      </div>

      {/* Right Column: Source Field Selector & Controls */}
      <div className="md:w-7/12 flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          {isSkipped ? (
            <div className="px-3 py-2 rounded-xl bg-surface-secondary border border-dashed border-border text-text-muted italic flex items-center justify-between">
              <span>Field skipped from sync</span>
              <button
                type="button"
                onClick={handleToggleSkip}
                className="text-primary hover:underline font-semibold text-[11px]"
              >
                Undo Skip
              </button>
            </div>
          ) : (
            <SourceFieldSelector
              fields={sourceFields}
              selectedPath={mapping?.sourceFieldPath}
              onSelect={handleSourceSelect}
              targetExpectedType={targetField.type}
              disabled={disabled}
              placeholder={`Map to ${targetField.label}...`}
            />
          )}
        </div>

        {/* Actions & Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Type Compatibility Badge */}
          {isMapped && !isSkipped && (
            <span
              className={classNames(
                "px-2 py-1 rounded-lg text-[10px] font-semibold border hidden sm:inline-block",
                typeCheck.isCompatible
                  ? "bg-success/10 border-success/20 text-success"
                  : "bg-warning/10 border-warning/30 text-warning"
              )}
              title={typeCheck.warning}
            >
              {typeCheck.badge}
            </span>
          )}

          {/* Transformation Button */}
          {isMapped && !isSkipped && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowTransformModal(true)}
              className={classNames(
                "p-1.5 rounded-lg border transition-colors relative",
                mapping?.transformation?.type &&
                  mapping.transformation.type !== "none"
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-surface border-border text-text-muted hover:text-text hover:bg-surface-hover"
              )}
              title="Configure data transformation rule"
            >
              <Sliders className="w-3.5 h-3.5" />
              {mapping?.transformation?.type &&
                mapping.transformation.type !== "none" && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                )}
            </button>
          )}

          {/* Skip Toggle */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleToggleSkip}
            className={classNames(
              "p-1.5 rounded-lg border transition-colors",
              isSkipped
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                : "bg-surface border-border text-text-muted hover:text-text hover:bg-surface-hover"
            )}
            title={isSkipped ? "Unskip field" : "Skip field from sync"}
          >
            {isSkipped ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Clear / Delete */}
          {(isMapped || isSkipped) && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemoveMapping}
              className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-error hover:bg-error/10 hover:border-error/30 transition-colors"
              title="Reset mapping"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Transformation Modal Dialog */}
      {showTransformModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-text">
                  Transform: {targetField.label}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTransformModal(false)}
                className="p-1 text-text-muted hover:text-text rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Transformation Rule
                </label>
                <select
                  value={selectedTransformType}
                  onChange={(e) =>
                    setSelectedTransformType(
                      e.target.value as TransformationRuleType
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="none">None (Pass-through direct value)</option>
                  <option value="TRIM">Trim whitespace</option>
                  <option value="UPPERCASE">Uppercase string</option>
                  <option value="LOWERCASE">Lowercase string</option>
                  <option value="PARSE_DATE">Parse ISO Date / Timestamp</option>
                  <option value="DEFAULT_VALUE">Fallback default value</option>
                </select>
              </div>

              {selectedTransformType === "DEFAULT_VALUE" && (
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Fallback Default Value
                  </label>
                  <input
                    type="text"
                    value={defaultVal}
                    onChange={(e) => setDefaultVal(e.target.value)}
                    placeholder="Enter default fallback value..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Sample Preview */}
              {sampleSourceValue !== undefined && (
                <div className="p-3 rounded-xl bg-surface-secondary border border-border space-y-1.5">
                  <span className="text-[10px] font-semibold text-text-muted uppercase">
                    Live Sample Evaluation
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted truncate max-w-40">
                      Raw: &quot;{String(sampleSourceValue)}&quot;
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-primary font-bold truncate max-w-40">
                      Result: &quot;{transformedPreview}&quot;
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowTransformModal(false)}
                className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-text hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTransform}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-xs transition-colors"
              >
                Apply Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
