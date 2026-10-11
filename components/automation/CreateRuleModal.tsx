"use client";

import React, { useState } from "react";
import {
  X,
  Zap,
  RefreshCw,
  Plus,
  AlertCircle,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  TriggerType,
  ActionType,
  CreateRulePayload,
  getTriggerLabel,
  getActionLabel,
  getTriggerIcon,
  getActionIcon,
  getConfigFields,
  getValidActionsForTrigger,
  validateConfig,
  getHumanReadableConfigSummary,
  ConfigField,
} from "@/lib/api/automationApi";

// ─── Types ──────────────────────────────────────────────────────────────

interface RuleFormData {
  name: string;
  trigger: TriggerType;
  action: ActionType;
  config: Record<string, any>;
}

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateRulePayload) => Promise<void>;
  isSubmitting: boolean;
}

// ─── Config Field Input ───────────────────────────────────────────────

const ConfigFieldInput = ({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: any;
  onChange: (key: string, value: any) => void;
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={field.type === "number" ? "number" : "text"}
        value={value || ""}
        onChange={(e) => {
          const val = field.type === "number" ? Number(e.target.value) : e.target.value;
          onChange(field.key, val);
        }}
        placeholder={field.placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
      />
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Info size={12} />
        {field.helperText}
      </p>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────

export default function CreateRuleModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateRuleModalProps) {
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    trigger: "LEAD_CREATED",
    action: "ASSIGN_USER",
    config: {},
  });
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  const validActions = getValidActionsForTrigger(formData.trigger);
  const configFields = getConfigFields(formData.action);

  const resetForm = () => {
    setFormData({
      name: "",
      trigger: "LEAD_CREATED",
      action: "ASSIGN_USER",
      config: {},
    });
    setConfigErrors([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateConfigField = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
    setConfigErrors((prev) => prev.filter((e) => !e.includes(key)));
  };

  const handleActionChange = (action: ActionType) => {
    const fields = getConfigFields(action);
    const newConfig: Record<string, any> = {};
    fields.forEach((field) => {
      newConfig[field.key] = "";
    });
    setFormData((prev) => ({
      ...prev,
      action,
      config: newConfig,
    }));
    setConfigErrors([]);
  };

  const handleTriggerChange = (trigger: TriggerType) => {
    const validActions = getValidActionsForTrigger(trigger);
    const defaultAction = validActions.length > 0 ? validActions[0] : "ASSIGN_USER";
    const fields = getConfigFields(defaultAction);
    const newConfig: Record<string, any> = {};
    fields.forEach((field) => {
      newConfig[field.key] = "";
    });
    setFormData((prev) => ({
      ...prev,
      trigger,
      action: defaultAction,
      config: newConfig,
    }));
    setConfigErrors([]);
  };

  const handleSubmit = async () => {
    const validation = validateConfig(formData.action, formData.config);
    if (!validation.valid) {
      setConfigErrors(validation.errors);
      return;
    }

    const payload: CreateRulePayload = {
      name: formData.name.trim(),
      trigger: formData.trigger,
      action: formData.action,
      config: formData.config,
    };

    await onSubmit(payload);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create Automation Rule</h3>
              <p className="text-xs text-gray-500">Configure your automation workflow</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Lead Follow Up Reminder"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.trigger}
                onChange={(e) => handleTriggerChange(e.target.value as TriggerType)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none cursor-pointer transition-all"
              >
                {["LEAD_CREATED", "DEAL_WON", "LEAVE_APPLIED", "TASK_OVERDUE"].map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {getTriggerIcon(trigger as TriggerType)} {getTriggerLabel(trigger as TriggerType)}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.action}
                onChange={(e) => handleActionChange(e.target.value as ActionType)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none cursor-pointer transition-all"
              >
                {validActions.map((action) => (
                  <option key={action} value={action}>
                    {getActionIcon(action)} {getActionLabel(action)}
                  </option>
                ))}
              </select>
              {validActions.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No valid actions for this trigger</p>
              )}
            </div>
          </div>

          {/* Configuration Fields */}
          {configFields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration
              </label>
              <div className="space-y-3">
                {configFields.map((field) => (
                  <ConfigFieldInput
                    key={field.key}
                    field={field}
                    value={formData.config[field.key] || ""}
                    onChange={updateConfigField}
                  />
                ))}
              </div>
              {configErrors.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                  {configErrors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuration Summary */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Configuration Summary
                </span>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                formData.name.trim() 
                  ? "text-indigo-700 bg-indigo-50 border-indigo-200/60" 
                  : "text-amber-700 bg-amber-50 border-amber-200/60"
              }`}>
                {formData.name.trim() ? "Ready to create" : "Name required"}
              </span>
            </div>

            {/* Rule Identity & Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-200/60 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Rule Name
                </span>
                <span className="font-semibold text-gray-800 break-words block">
                  {formData.name.trim() || <span className="text-gray-400 italic font-normal">Not named yet</span>}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-gray-200/60 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Automation Flow
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                  <span className="truncate">{getTriggerIcon(formData.trigger)} {getTriggerLabel(formData.trigger)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-indigo-600">{getActionIcon(formData.action)} {getActionLabel(formData.action)}</span>
                </div>
              </div>
            </div>

            {/* Action Details */}
            <div className="p-3 bg-white rounded-lg border border-gray-200/60 shadow-2xs text-xs space-y-1.5">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Action Parameters
              </span>
              {getHumanReadableConfigSummary(formData.action, formData.config).map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-0.5">
                  <span className="text-gray-500 font-medium">{item.label}</span>
                  <span className={`font-semibold sm:text-right break-words ${
                    item.value === "Not configured yet" ? "text-gray-400 italic font-normal" : "text-gray-800"
                  }`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Rule
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}