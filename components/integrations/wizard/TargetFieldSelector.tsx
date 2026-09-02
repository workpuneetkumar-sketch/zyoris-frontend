"use client";

import React, { useState, useMemo } from "react";
import { TargetFieldDefinition } from "@/types/integrations";
import {
  Search,
  Check,
  ChevronDown,
  X,
  AlertCircle,
  HelpCircle,
  Plus,
} from "lucide-react";
import classNames from "classnames";
import { getFieldTypeIcon } from "./SourceFieldSelector";

export interface TargetFieldSelectorProps {
  targetFields: TargetFieldDefinition[];
  selectedKey?: string;
  onSelect: (field: TargetFieldDefinition | null) => void;
  onAddCustomField?: (customField: TargetFieldDefinition) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showDescription?: boolean;
}

export const TargetFieldSelector: React.FC<TargetFieldSelectorProps> = ({
  targetFields,
  selectedKey,
  onSelect,
  onAddCustomField,
  disabled = false,
  placeholder = "Select target field...",
  className,
  showDescription = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState("string");

  const filteredFields = useMemo(() => {
    if (!search.trim()) return targetFields;
    const q = search.toLowerCase().trim();
    return targetFields.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.type && f.type.toLowerCase().includes(q))
    );
  }, [targetFields, search]);

  const selectedField = useMemo(() => {
    if (!selectedKey) return null;
    return targetFields.find((f) => f.key === selectedKey) || null;
  }, [targetFields, selectedKey]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKey.trim() || !customLabel.trim()) return;

    const newField: TargetFieldDefinition = {
      key: customKey.trim().replace(/\s+/g, "_"),
      label: customLabel.trim(),
      type: customType,
      required: false,
      description: "Custom organization mapped field",
    };

    if (onAddCustomField) {
      onAddCustomField(newField);
    }
    onSelect(newField);
    setIsAddingCustom(false);
    setCustomKey("");
    setCustomLabel("");
    setIsOpen(false);
  };

  return (
    <div className={classNames("relative w-full", className)}>
      {/* Trigger Button */}
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
              <span className="font-semibold text-text truncate">
                {selectedField.label}
              </span>
              <span className="font-mono text-[10px] text-text-muted truncate hidden sm:inline">
                ({selectedField.key})
              </span>
              {selectedField.required && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-error/10 text-error border border-error/20 uppercase">
                  Required
                </span>
              )}
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

      {/* Dropdown Content */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsAddingCustom(false);
            }}
          />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-surface shadow-xl p-2 space-y-2 max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {isAddingCustom ? (
              <form onSubmit={handleCreateCustom} className="p-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text">
                    Add Custom Target Field
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="p-1 text-text-muted hover:text-text rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-muted block mb-1">
                    Field Label
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => {
                      setCustomLabel(e.target.value);
                      if (!customKey) {
                        setCustomKey(
                          e.target.value.toLowerCase().replace(/\s+/g, "_")
                        );
                      }
                    }}
                    placeholder="e.g. Lead Score"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-muted block mb-1">
                    API Key / Field Name
                  </label>
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="e.g. lead_score"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs font-mono text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-text-muted block mb-1">
                      Data Type
                    </label>
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="object">Object</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-xs"
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                {/* Search Header */}
                <div className="relative flex-shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search target schema fields..."
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

                {/* Target Fields List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {filteredFields.length === 0 ? (
                    <div className="p-4 text-center text-xs text-text-muted">
                      No matching target fields found.
                    </div>
                  ) : (
                    filteredFields.map((f) => {
                      const isSelected = f.key === selectedKey;
                      return (
                        <button
                          key={f.key}
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {getFieldTypeIcon(f.type)}
                              <span className="font-semibold truncate">
                                {f.label}
                              </span>
                              <span className="text-[10px] text-text-muted font-mono truncate">
                                {f.key}
                              </span>
                              {f.required && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-error/10 text-error border border-error/20 uppercase">
                                  Req
                                </span>
                              )}
                            </div>
                            {showDescription && f.description && (
                              <p className="text-[10px] text-text-muted truncate mt-0.5 pl-5">
                                {f.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-surface-secondary border border-border text-text-muted">
                              {f.type || "string"}
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

                {/* Footer: Add custom target field */}
                {onAddCustomField && (
                  <div className="pt-2 border-t border-border flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border hover:border-primary/50 text-xs text-text-muted hover:text-text transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Custom Field</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
