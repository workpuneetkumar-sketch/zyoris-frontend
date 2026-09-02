"use client";

import React, { useState, useMemo } from "react";
import { DiscoveredField } from "@/types/integrations";
import {
  Search,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  Braces,
  List,
  Check,
  ChevronDown,
  X,
  Sparkles,
  Layers,
} from "lucide-react";
import classNames from "classnames";

export interface FlatSourceField {
  path: string;
  name: string;
  label?: string;
  type: string;
  inferredType: string;
  required?: boolean;
  sampleValue?: any;
  depth: number;
}

export function flattenDiscoveredFields(
  fields: DiscoveredField[],
  prefix = "",
  depth = 0
): FlatSourceField[] {
  const result: FlatSourceField[] = [];

  for (const field of fields) {
    const fieldPath = prefix
      ? `${prefix}.${field.path || field.name || field.key}`
      : field.path || field.name || field.key || "";
    const fieldName = field.name || field.key || field.label || fieldPath;
    const typeStr = field.type || field.dataType || (field.inferredType as string) || "string";

    result.push({
      path: fieldPath,
      name: fieldName,
      label: field.label,
      type: typeStr,
      inferredType: typeStr,
      required: field.required,
      sampleValue: field.sampleValue ?? field.sample,
      depth,
    });

    if (Array.isArray(field.children) && field.children.length > 0) {
      result.push(
        ...flattenDiscoveredFields(field.children, fieldPath, depth + 1)
      );
    }
  }

  return result;
}

export function getFieldTypeIcon(type?: string) {
  const t = (type || "").toLowerCase();
  if (["number", "int", "integer", "float", "double", "decimal", "numeric"].includes(t)) {
    return <Hash className="w-3.5 h-3.5 text-blue-500" />;
  }
  if (["boolean", "bool"].includes(t)) {
    return <ToggleLeft className="w-3.5 h-3.5 text-emerald-500" />;
  }
  if (["date", "datetime", "timestamp", "time"].includes(t)) {
    return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
  }
  if (["object", "json", "map", "record"].includes(t)) {
    return <Braces className="w-3.5 h-3.5 text-purple-500" />;
  }
  if (["array", "list", "set"].includes(t)) {
    return <List className="w-3.5 h-3.5 text-indigo-500" />;
  }
  return <Type className="w-3.5 h-3.5 text-slate-500" />;
}

export interface SourceFieldSelectorProps {
  fields: DiscoveredField[] | FlatSourceField[];
  selectedPath?: string;
  onSelect: (field: FlatSourceField | null) => void;
  disabled?: boolean;
  placeholder?: string;
  targetExpectedType?: string;
  className?: string;
  showSamplePreview?: boolean;
}

export const SourceFieldSelector: React.FC<SourceFieldSelectorProps> = ({
  fields,
  selectedPath,
  onSelect,
  disabled = false,
  placeholder = "Select source field...",
  targetExpectedType,
  className,
  showSamplePreview = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const flatList = useMemo(() => {
    if (fields.length === 0) return [];
    if ("depth" in fields[0] && "path" in fields[0]) {
      return fields as FlatSourceField[];
    }
    return flattenDiscoveredFields(fields as DiscoveredField[]);
  }, [fields]);

  const filteredFields = useMemo(() => {
    if (!search.trim()) return flatList;
    const q = search.toLowerCase().trim();
    return flatList.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        (f.label && f.label.toLowerCase().includes(q)) ||
        f.type.toLowerCase().includes(q)
    );
  }, [flatList, search]);

  const selectedField = useMemo(() => {
    if (!selectedPath) return null;
    return flatList.find((f) => f.path === selectedPath) || null;
  }, [flatList, selectedPath]);

  return (
    <div className={classNames("relative w-full", className)}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border text-left transition-all shadow-xs",
          selectedField
            ? "bg-surface border-border text-text font-medium"
            : "bg-surface-secondary/40 border-border text-text-muted hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-primary/30 border-primary"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedField ? (
            <>
              {getFieldTypeIcon(selectedField.type)}
              <span className="font-mono text-xs font-semibold text-text truncate">
                {selectedField.path}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-surface-secondary border border-border text-text-muted">
                {selectedField.type}
              </span>
            </>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedField && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={classNames(
              "w-3.5 h-3.5 text-text-muted transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-surface shadow-xl p-2 space-y-2 max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input */}
            <div className="relative flex-shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search source fields..."
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface-secondary text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Field Options List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredFields.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-muted">
                  No source fields found matching &ldquo;{search}&rdquo;
                </div>
              ) : (
                filteredFields.map((f) => {
                  const isSelected = f.path === selectedPath;
                  const isCompatible =
                    !targetExpectedType ||
                    targetExpectedType.toLowerCase() === f.type.toLowerCase() ||
                    targetExpectedType.toLowerCase() === "string";

                  return (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => {
                        onSelect(f);
                        setIsOpen(false);
                      }}
                      className={classNames(
                        "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs group",
                        isSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-surface-hover text-text"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {getFieldTypeIcon(f.type)}
                        <span
                          className="font-mono truncate"
                          style={{ paddingLeft: `${f.depth * 8}px` }}
                        >
                          {f.path}
                        </span>
                        {f.required && (
                          <span className="text-[10px] text-error font-bold">
                            *
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {f.sampleValue !== undefined && showSamplePreview && (
                          <span
                            className="text-[10px] text-text-muted truncate max-w-24 font-mono hidden sm:inline"
                            title={`Sample: ${JSON.stringify(f.sampleValue)}`}
                          >
                            &quot;{String(f.sampleValue).substring(0, 15)}&quot;
                          </span>
                        )}
                        <span
                          className={classNames(
                            "px-1.5 py-0.5 rounded text-[10px] uppercase font-mono border",
                            isCompatible
                              ? "bg-surface-secondary border-border text-text-muted"
                              : "bg-warning/10 border-warning/30 text-warning"
                          )}
                        >
                          {f.type}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
