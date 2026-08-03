"use client";
// Rule Builder — matches POST /assignment-rules/create Swagger schema exactly

import { useState, useEffect, useRef } from "react";
import { X, Save, Loader2, HelpCircle, Plus, Tag } from "lucide-react";
import classNames from "classnames";
import type {
  AssignmentRule,
  CreateAssignmentRulePayload,
  UpdateAssignmentRulePayload,
  AssignmentStrategy,
  AssignmentRuleStatus,
} from "@/types/assignmentRules";

const STRATEGIES: { value: AssignmentStrategy; label: string; desc: string }[] = [
  { value: "ROUND_ROBIN", label: "Round Robin", desc: "Rotate evenly across all eligible assignees in order." },
  { value: "EQUAL_DISTRIBUTION", label: "Equal Distribution", desc: "Balance load so each assignee gets roughly equal leads." },
  { value: "COUNTRY", label: "Country Match", desc: "Assign based on the country of the lead." },
  { value: "LANGUAGE", label: "Language Match", desc: "Assign based on the language preference of the lead." },
  { value: "PIN_CODE", label: "Pin Code Match", desc: "Assign based on postal/zip code mapping." },
  { value: "AI_RECOMMENDATION", label: "AI Recommendation", desc: "Use machine learning scoring to match the best representative." },
  { value: "MANUAL", label: "Manual Routing", desc: "Route to a queue or manual distribution pool." },
];

const EMPTY: CreateAssignmentRulePayload = {
  name: "",
  strategy: "ROUND_ROBIN",
  priority: 1,
  status: "ACTIVE",
  territories: [],
  products: [],
  cities: [],
  states: [],
  countries: [],
  languages: [],
  pinCodes: [],
  minBudget: null,
  maxBudget: null,
  assigneeIds: [],
};

// ── Field helpers ─────────────────────────────────────────────────────────────

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
      {text}
      {hint && (
        <span title={hint} className="cursor-help text-text-muted hover:text-text">
          <HelpCircle size={11} />
        </span>
      )}
    </label>
  );
}

function inputCls(err = false) {
  return classNames(
    "w-full px-3 py-2 rounded-lg border text-sm text-text bg-background-secondary",
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors",
    err ? "border-error" : "border-border"
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={classNames(
          "relative rounded-full border-2 transition-colors duration-200 shrink-0",
          checked ? "bg-primary border-primary" : "bg-background-tertiary border-border"
        )}
        style={{ width: 40, height: 22 }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }}
        />
      </button>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}

// ── Tag input — add items with Enter or comma ─────────────────────────────────

function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add(raw: string) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...values];
    parts.forEach((p) => { if (!next.includes(p)) next.push(p); });
    onChange(next);
    setInput("");
  }

  function remove(v: string) { onChange(values.filter((x) => x !== v)); }

  return (
    <div>
      <Label text={label} hint={hint} />
      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[40px] flex flex-wrap gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background-secondary cursor-text focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-colors"
      >
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[12px] font-medium">
            {v}
            <button type="button" onClick={() => remove(v)} className="hover:text-error transition-colors">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (input.trim()) add(input); }
            if (e.key === "Backspace" && !input && values.length) remove(values[values.length - 1]);
          }}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-text placeholder-text-muted outline-none"
        />
      </div>
      <p className="text-[10.5px] text-text-muted mt-1">Press Enter or comma to add</p>
    </div>
  );
}

// ── AssigneeIds input ─────────────────────────────────────────────────────────

function AssigneeInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  return (
    <div>
      <Label text="Assignee IDs *" hint="User IDs of reps eligible to receive leads under this rule" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Paste user ID and press Enter"
            className={inputCls()}
          />
          <button
            type="button"
            onClick={add}
            disabled={!input.trim()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-40 shrink-0"
          >
            <Plus size={15} />
          </button>
        </div>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {values.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-light text-success text-[11.5px] font-medium font-mono">
                {id.length > 16 ? `…${id.slice(-12)}` : id}
                <button type="button" onClick={() => onChange(values.filter((x) => x !== id))} className="hover:text-error">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  editRule?: AssignmentRule | null;
  isSaving: boolean;
  onSave: (payload: CreateAssignmentRulePayload | UpdateAssignmentRulePayload) => Promise<void>;
  onCancel: () => void;
}

export function RuleFormModal({ isOpen, editRule, isSaving, onSave, onCancel }: Props) {
  const [form, setForm] = useState<CreateAssignmentRulePayload>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editRule) {
      setForm({
        name: editRule.name,
        strategy: editRule.strategy,
        priority: editRule.priority,
        status: editRule.status,
        territories: editRule.territories,
        products: editRule.products,
        cities: editRule.cities,
        states: editRule.states,
        countries: editRule.countries ?? [],
        languages: editRule.languages ?? [],
        pinCodes: editRule.pinCodes ?? [],
        minBudget: editRule.minBudget ?? null,
        maxBudget: editRule.maxBudget ?? null,
        assigneeIds: editRule.assigneeIds,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [isOpen, editRule]);

  function set<K extends keyof CreateAssignmentRulePayload>(k: K, v: CreateAssignmentRulePayload[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Rule name is required";
    if (form.priority < 1) e.priority = "Priority must be at least 1";
    if (form.assigneeIds.length === 0) e.assigneeIds = "At least one assignee ID is required";
    if (form.minBudget != null && form.maxBudget != null && form.minBudget > form.maxBudget) {
      e.budget = "Min budget must be ≤ max budget";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload = editRule ? { ...form, id: editRule.id } : form;
    await onSave(payload);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text">
              {editRule ? "Edit Assignment Rule" : "Create Assignment Rule"}
            </h2>
            <p className="text-[11.5px] text-text-muted mt-0.5">
              Rules are evaluated in ascending priority order
            </p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-surface-hover text-text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <form id="rule-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-7">

            {/* ── Basic Info ──────────────────────────────────── */}
            <section className="space-y-4">
              <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2">Basic Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label text="Rule Name *" />
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder='e.g. "Hyderabad Enterprise Leads"'
                    className={inputCls(!!errors.name)}
                  />
                  {errors.name && <p className="text-[11px] text-error mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label text="Priority" hint="Rules are evaluated ascending — 1 runs first" />
                  <input
                    type="number"
                    min={1}
                    value={form.priority}
                    onChange={(e) => set("priority", Math.max(1, Number(e.target.value)))}
                    className={inputCls(!!errors.priority)}
                  />
                  {errors.priority && <p className="text-[11px] text-error mt-1">{errors.priority}</p>}
                </div>

                <div>
                  <Label text="Status" />
                  <div className="mt-1">
                    <Toggle
                      checked={form.status === "ACTIVE"}
                      onChange={(v) => set("status", v ? "ACTIVE" : "INACTIVE")}
                      label={form.status === "ACTIVE" ? "Active" : "Inactive"}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Strategy ────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2">Assignment Strategy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STRATEGIES.map((s) => (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => set("strategy", s.value)}
                    className={classNames(
                      "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                      form.strategy === s.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-surface-hover"
                    )}
                  >
                    <div className={classNames(
                      "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      form.strategy === s.value ? "border-primary" : "border-border"
                    )}>
                      {form.strategy === s.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-text">{s.label}</p>
                      <p className="text-[11.5px] text-text-muted mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Filters ─────────────────────────────────────── */}
            <section className="space-y-4">
              <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2">Lead Filters</h3>
              <p className="text-[11.5px] text-text-muted -mt-2">This rule applies only to leads matching ALL specified filters. Leave blank for any.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TagInput
                  label="Territories"
                  hint='e.g. "South", "East"'
                  values={form.territories}
                  onChange={(v) => set("territories", v)}
                  placeholder="South, East…"
                />
                <TagInput
                  label="Products"
                  hint='e.g. "CRM", "ERP"'
                  values={form.products}
                  onChange={(v) => set("products", v)}
                  placeholder="CRM, ERP…"
                />
                <TagInput
                  label="Cities"
                  values={form.cities}
                  onChange={(v) => set("cities", v)}
                  placeholder="Hyderabad, Bangalore…"
                />
                <TagInput
                  label="States"
                  values={form.states}
                  onChange={(v) => set("states", v)}
                  placeholder="Telangana, Karnataka…"
                />
                <TagInput
                  label="Countries"
                  values={form.countries ?? []}
                  onChange={(v) => set("countries", v)}
                  placeholder="India, USA…"
                />
                <TagInput
                  label="Languages"
                  values={form.languages ?? []}
                  onChange={(v) => set("languages", v)}
                  placeholder="English, Spanish…"
                />
                <div className="sm:col-span-2">
                  <TagInput
                    label="Pin Codes"
                    values={form.pinCodes ?? []}
                    onChange={(v) => set("pinCodes", v)}
                    placeholder="500081, 560001…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label text="Min Budget (₹)" hint="Minimum lead budget to match this rule" />
                  <input
                    type="number"
                    min={0}
                    value={form.minBudget ?? ""}
                    onChange={(e) => set("minBudget", e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 50000"
                    className={inputCls(!!errors.budget)}
                  />
                </div>
                <div>
                  <Label text="Max Budget (₹)" />
                  <input
                    type="number"
                    min={0}
                    value={form.maxBudget ?? ""}
                    onChange={(e) => set("maxBudget", e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 250000"
                    className={inputCls(!!errors.budget)}
                  />
                  {errors.budget && <p className="text-[11px] text-error mt-1 sm:col-span-2">{errors.budget}</p>}
                </div>
              </div>
            </section>

            {/* ── Assignees ────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-text-muted border-b border-border pb-2">Assignees</h3>
              <AssigneeInput values={form.assigneeIds} onChange={(v) => set("assigneeIds", v)} />
              {errors.assigneeIds && <p className="text-[11px] text-error">{errors.assigneeIds}</p>}
            </section>

          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background-secondary/50 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="rule-form"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 shadow-sm"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isSaving ? "Saving…" : editRule ? "Update Rule" : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
