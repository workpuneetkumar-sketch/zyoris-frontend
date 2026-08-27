"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  Building2,
  User,
  Eye,
  Edit3,
  Trash2,
  Loader2 as SpinnerIcon,
  X,
  Filter,
  Users,
  UserCheck,
  Building,
  Hash,
  ArrowUpDown,
} from "lucide-react";

import {
  CanonicalCustomer,
  CustomersFilters,
  LifecycleState,
  CanonicalType,
  LIFECYCLE_STATES,
  CANONICAL_TYPES,
  LIFECYCLE_STATE_LABELS,
  CANONICAL_TYPE_LABELS,
} from "@/types/customers";

export interface CustomersTableProps {
  customers: CanonicalCustomer[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  filters: CustomersFilters;
  loading: boolean;
  openMenu: string | null;
  onPageChange: (page: number) => void;
  onPerPageChange: (size: number) => void;
  onRefreshCustomers: () => Promise<void>;
  onFiltersChange: (filters: CustomersFilters) => void;
  onNewCustomer: () => void;
  onAction: (action: string, customer: CanonicalCustomer) => void;
  setOpenMenu: (id: string | null) => void;
  owners: Array<{ id: string; name: string; email?: string }>;
  ownersLoading?: boolean;
}

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30",
  "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30",
  "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30",
  "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30",
  "bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/30",
];

function nameToColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function CustomerAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
  const colorClass = nameToColor(name);
  return (
    <div className={`w-9 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center shrink-0 select-none ${colorClass}`}>
      {initials || "?"}
    </div>
  );
}

function OwnerAvatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() || "?";
  const colorClass = nameToColor(name);
  return (
    <div className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 select-none ${colorClass}`}>
      {initial}
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-9 pl-3 pr-9 rounded-lg border px-3 text-sm font-medium focus:outline-none focus:ring-2 cursor-pointer transition-all
          bg-[var(--color-surface)]
          text-[var(--color-text)]
          border-[var(--color-border)]
          focus:border-[var(--color-primary-light)]
          focus:ring-[var(--color-primary)]/30"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
      />
    </div>
  );
}

function LifecycleBadge({ state }: { state: LifecycleState | string | undefined | null }) {
  if (!state) return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  const label = LIFECYCLE_STATE_LABELS[state as LifecycleState] || state;
  const styles: Record<string, string> = {
    PROSPECT:  "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30",
    LEAD:      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
    QUALIFIED: "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
    ACTIVE:    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
    CHURNED:   "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
    INACTIVE:  "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30",
  };
  const cls = styles[state] ?? "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: CanonicalType | string | undefined | null }) {
  if (!type) return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  const label = CANONICAL_TYPE_LABELS[type as CanonicalType] || type;
  const styles: Record<string, string> = {
    INDIVIDUAL:   "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
    ORGANIZATION: "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
    ACCOUNT:      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
    CONTACT:      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  };
  const cls = styles[type] ?? "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${cls}`}>
      {type === "INDIVIDUAL" && <User size={11} />}
      {type === "ORGANIZATION" && <Building size={11} />}
      {type === "ACCOUNT" && <Building2 size={11} />}
      {type === "CONTACT" && <UserCheck size={11} />}
      {label}
    </span>
  );
}

function ActionMenu({
  customer,
  open,
  onClose,
  onAction,
  deleting,
}: {
  customer: CanonicalCustomer;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, customer: CanonicalCustomer) => void;
  deleting: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const actions = [
    { key: "View",   label: "View details", icon: <Eye size={14} />,   danger: false },
    { key: "Edit",   label: "Edit customer",  icon: <Edit3 size={14} />, danger: false },
    { key: "Delete", label: "Delete",         icon: <Trash2 size={14} />, danger: true  },
  ];

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2 w-44 rounded-xl border shadow-lg z-30 overflow-hidden
        bg-[var(--color-surface)]
        border-[var(--color-border)]"
    >
      {actions.map((a) => (
        <button
          key={a.key}
          disabled={a.key === "Delete" && deleting}
          onClick={() => { onAction(a.key, customer); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors
            ${a.danger
              ? "text-[var(--color-error)] hover:bg-[var(--color-error-light)]"
              : "text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {deleting && a.key === "Delete" ? <SpinnerIcon size={14} className="animate-spin" /> : a.icon}
          <span className="font-medium">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-5 rounded-md animate-pulse bg-[var(--color-surface-hover)]" style={{ opacity: 0.5 }} />
        </td>
      ))}
    </tr>
  );
}

export function CustomersTable(props: CustomersTableProps) {
  const {
    customers, total, page, perPage, totalPages, filters, loading,
    openMenu, onPageChange, onPerPageChange, onRefreshCustomers,
    onFiltersChange, onNewCustomer, onAction, setOpenMenu,
    owners, ownersLoading,
  } = props;

  const stateOptions = [
    { value: "All States", label: "All States" },
    ...LIFECYCLE_STATES.map(s => ({ value: s, label: LIFECYCLE_STATE_LABELS[s] })),
  ];
  const typeOptions = [
    { value: "All Types", label: "All Types" },
    ...CANONICAL_TYPES.map(t => ({ value: t, label: CANONICAL_TYPE_LABELS[t] })),
  ];
  const ownerOptions = [
    { value: "All Owners", label: "All Owners" },
    ...owners.map(o => ({ value: o.id, label: o.name })),
  ];

  const perPageOptions = [10, 20, 50, 100].map(n => ({ value: String(n), label: `${n} / page` }));

  const startIdx = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endIdx = Math.min(page * perPage, total);

  return (
    <div className="space-y-3">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              placeholder="Search customers by name, email, phone…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none transition-colors
                bg-[var(--color-surface)]
                text-[var(--color-text)]
                border-[var(--color-border)]
                placeholder:text-[var(--color-text-muted)]
                focus:border-[var(--color-primary-light)]
                focus:ring-2 focus:ring-[var(--color-primary)]/25"
            />
          </div>

          <Select
            value={filters.lifecycleState}
            options={stateOptions}
            onChange={(v) => onFiltersChange({ ...filters, lifecycleState: v as any })}
          />
          <Select
            value={filters.canonicalType}
            options={typeOptions}
            onChange={(v) => onFiltersChange({ ...filters, canonicalType: v as any })}
          />
          <Select
            value={filters.ownerId}
            options={ownerOptions}
            onChange={(v) => onFiltersChange({ ...filters, ownerId: v })}
            className={ownersLoading ? "opacity-60" : ""}
          />

          <button
            onClick={onRefreshCustomers}
            className="h-9 w-9 rounded-lg border flex items-center justify-center transition-colors
              bg-[var(--color-surface)]
              border-[var(--color-border)]
              text-[var(--color-text-secondary)]
              hover:bg-[var(--color-surface-hover)]
              hover:text-[var(--color-primary)]"
            title="Refresh"
          >
            <ArrowUpDown size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={String(perPage)}
            options={perPageOptions}
            onChange={(v) => onPerPageChange(Number(v))}
          />
          <button
            onClick={onNewCustomer}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-white text-sm font-semibold transition-all shadow-sm
              bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)]
              hover:from-[var(--color-primary)] hover:to-[var(--color-primary-light)]
              hover:shadow-lg"
          >
            <Users size={15} />
            New Customer
          </button>
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border shadow-sm
        bg-[var(--color-surface)]
        border-[var(--color-border)]"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b
                border-[var(--color-border-light)]
                bg-[var(--color-background-secondary)]/60"
              >
                <th className="text-left font-medium text-[var(--color-text-secondary)] px-4 py-3 w-[28%]">
                  Customer
                </th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] px-4 py-3 w-[14%]">
                  Type
                </th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] px-4 py-3 w-[14%]">
                  Lifecycle
                </th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] px-4 py-3 w-[14%]">
                  Contact
                </th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] px-4 py-3 w-[14%]">
                  Owner
                </th>
                <th className="text-left font-medium text-[var(--color-text-secondary)] px-4 py-3 w-[12%]">
                  External ID
                </th>
                <th className="text-right font-medium text-[var(--color-text-secondary)] px-4 py-3 w-[4%]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && customers.length === 0 && (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              )}

              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full mb-3 flex items-center justify-center
                      bg-[var(--color-background-secondary)]"
                    >
                      <Users size={22} className="text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                      No customers found
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">
                      {filters.search || filters.lifecycleState !== "All States" || filters.canonicalType !== "All Types" || filters.ownerId !== "All Owners"
                        ? "Try adjusting your filters."
                        : "Get started by creating your first customer."}
                    </p>
                    <button
                      onClick={onNewCustomer}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-white text-xs font-semibold transition-all
                        bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)]
                        hover:from-[var(--color-primary)] hover:to-[var(--color-primary-light)]"
                    >
                      <Users size={13} />
                      New Customer
                    </button>
                  </td>
                </tr>
              )}

              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b last:border-b-0 transition-colors group
                    border-[var(--color-border-light)]
                    hover:bg-[var(--color-surface-hover)]/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CustomerAvatar name={customer.name} />
                      <div className="min-w-0">
                        <button
                          onClick={() => onAction("View", customer)}
                          className="text-sm font-semibold text-[var(--color-text)] truncate block text-left
                            hover:text-[var(--color-primary)] transition-colors"
                        >
                          {customer.name || "Unnamed"}
                        </button>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {customer.email && (
                            <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                              <Mail size={10} /> {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone size={10} /> {customer.phone}
                            </span>
                          )}
                          {!customer.email && !customer.phone && customer.createdAt && (
                            <span>Created {new Date(customer.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <TypeBadge type={customer.canonicalType} />
                  </td>

                  <td className="px-4 py-3">
                    <LifecycleBadge state={customer.lifecycleState} />
                  </td>

                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-[12px] truncate max-w-[180px]">
                          <Mail size={11} className="text-[var(--color-text-muted)] shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-[12px]">
                          <Phone size={11} className="text-[var(--color-text-muted)] shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {!customer.email && !customer.phone && (
                        <span className="text-[12px] text-[var(--color-text-muted)]">—</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {customer.owner ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <OwnerAvatar name={customer.owner.name} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[var(--color-text)] truncate max-w-[120px]">
                            {customer.owner.name}
                          </p>
                          {customer.owner.email && (
                            <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[140px]">
                              {customer.owner.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[var(--color-text-muted)]">Unassigned</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-[12px] text-[var(--color-text-secondary)]">
                    <div className="space-y-1">
                      {customer.externalId && (
                        <div className="flex items-center gap-1.5">
                          <Hash size={11} className="text-[var(--color-text-muted)] shrink-0" />
                          <span className="font-mono">{customer.externalId}</span>
                        </div>
                      )}
                      {customer.externalSystem && (
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          via {customer.externalSystem}
                        </div>
                      )}
                      {!customer.externalId && (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="relative flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === customer.id ? null : customer.id); }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors
                          text-[var(--color-text-muted)]
                          hover:bg-[var(--color-background-secondary)]
                          hover:text-[var(--color-text)]"
                      >
                        <MoreVertical size={15} />
                      </button>
                      <ActionMenu
                        customer={customer}
                        open={openMenu === customer.id}
                        onClose={() => setOpenMenu(null)}
                        onAction={onAction}
                        deleting={false}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t
          border-[var(--color-border-light)]
          bg-[var(--color-background-secondary)]/40"
        >
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Showing <span className="font-semibold text-[var(--color-text-secondary)]">{startIdx}</span>
            {" – "}
            <span className="font-semibold text-[var(--color-text-secondary)]">{endIdx}</span>
            {" of "}
            <span className="font-semibold text-[var(--color-text-secondary)]">{total}</span>
            {" customers"}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                bg-[var(--color-surface)]
                border-[var(--color-border)]
                text-[var(--color-text-secondary)]
                hover:bg-[var(--color-surface-hover)]
                hover:text-[var(--color-primary)]"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex items-center gap-1 px-2">
              {(() => {
                const pages: number[] = [];
                const maxShown = 5;
                const half = Math.floor(maxShown / 2);
                let start = Math.max(1, page - half);
                let end = Math.min(totalPages || 1, start + maxShown - 1);
                if (end - start + 1 < maxShown) start = Math.max(1, end - maxShown + 1);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    disabled={loading}
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-[12px] font-semibold transition-all
                      ${p === page
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"}`}
                  >
                    {p}
                  </button>
                ));
              })()}
            </div>

            <button
              onClick={() => onPageChange(Math.min(totalPages || 1, page + 1))}
              disabled={page >= (totalPages || 1) || loading}
              className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                bg-[var(--color-surface)]
                border-[var(--color-border)]
                text-[var(--color-text-secondary)]
                hover:bg-[var(--color-surface-hover)]
                hover:text-[var(--color-primary)]"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomersTable;
