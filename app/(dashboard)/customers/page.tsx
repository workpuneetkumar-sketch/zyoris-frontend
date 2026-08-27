"use client";

import { useState, useEffect } from "react";
import { CustomersTable } from "@/components/customers/CustomersUI";
import { useCustomers } from "@/hooks/useCustomers";
import { CanonicalCustomer } from "@/types/customers";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { IdentityResolveModal } from "@/components/customers/IdentityResolveModal";
import { ConvertLeadModal } from "@/components/customers/ConvertLeadModal";
import { ConvertCompanyModal } from "@/components/customers/ConvertCompanyModal";
import {
  Users,
  UserCheck,
  Target,
  TrendingUp,
  UserX,
  Search,
  GitBranch,
  Building2,
  ArrowRightLeft,
  UserPlus,
  Factory,
} from "lucide-react";

type CustomersTab = "customers" | "identity" | "convert-lead" | "convert-company";

interface CustomersStats {
  total: number;
  active: number;
  qualified: number;
  churned: number;
  prospects: number;
}

function deriveStatsFromList(customers: CanonicalCustomer[]): CustomersStats {
  const countByState = (s: string) =>
    customers.filter((c) => c.lifecycleState?.toUpperCase() === s).length;
  return {
    total: customers.length,
    active: countByState("ACTIVE"),
    qualified: countByState("QUALIFIED"),
    churned: countByState("CHURNED"),
    prospects: countByState("PROSPECT") + countByState("LEAD"),
  };
}

interface SummaryCardProps {
  label: string;
  value: number | string | null;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
  hint?: string;
}

function SummaryCard({ label, value, icon, iconBg, iconColor, loading, hint }: SummaryCardProps) {
  return (
    <div
      className="rounded-xl border shadow-sm p-4 flex items-center justify-between gap-4 min-w-0
        bg-[var(--color-surface)]
        border-[var(--color-border)]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1 truncate">{label}</p>
        {loading ? (
          <div className="h-8 w-16 rounded-md animate-pulse mb-1" style={{ background: "var(--color-background-tertiary)" }} />
        ) : (
          <p className="text-2xl font-bold text-[var(--color-text)] leading-none tracking-tight">
            {value ?? "—"}
          </p>
        )}
        {hint && !loading && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5">{hint}</p>
        )}
      </div>
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        style={{ color: iconColor }}
      >
        {icon}
      </div>
    </div>
  );
}

const TABS: { id: CustomersTab; label: string; icon: React.ReactNode }[] = [
  { id: "customers",       label: "All Customers",  icon: <Users size={14} /> },
  { id: "identity",        label: "Identity Resolve", icon: <Search size={14} /> },
  { id: "convert-lead",    label: "Convert Lead",   icon: <ArrowRightLeft size={14} /> },
  { id: "convert-company", label: "Convert Company", icon: <Factory size={14} /> },
];

function TabBar({ active, onChange }: { active: CustomersTab; onChange: (t: CustomersTab) => void }) {
  return (
    <div
      className="flex items-center gap-0 border-b px-4 pt-1 overflow-x-auto
        border-[var(--color-border)]
        bg-[var(--color-surface)]"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex items-center gap-1.5
            ${active === tab.id
              ? "text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`}
          style={active === tab.id ? { borderColor: "var(--color-primary)" } : undefined}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<CustomersTab>("customers");
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [convertLeadModalOpen, setConvertLeadModalOpen] = useState(false);
  const [convertCompanyModalOpen, setConvertCompanyModalOpen] = useState(false);

  const {
    customers, total, page, pageSize, totalPages, filters, loading, error, openMenu,
    confirmAction, setPage, setPageSize, setOpenMenu, setConfirmAction,
    handleFiltersChange, handleNewCustomer, handleAction, executeConfirmedAction, retry,
    owners, ownersLoading,
  } = useCustomers();

  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<CustomersStats>({
    total: 0, active: 0, qualified: 0, churned: 0, prospects: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => setStatsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (customers.length > 0) {
      setStats(deriveStatsFromList(customers));
    }
  }, [customers]);

  useEffect(() => {
    if (activeTab === "identity") {
      setIdentityModalOpen(true);
    } else if (activeTab === "convert-lead") {
      setConvertLeadModalOpen(true);
    } else if (activeTab === "convert-company") {
      setConvertCompanyModalOpen(true);
    }
  }, [activeTab]);

  const handleTabChange = (t: CustomersTab) => {
    setActiveTab(t);
    if (t === "customers") {
      setIdentityModalOpen(false);
      setConvertLeadModalOpen(false);
      setConvertCompanyModalOpen(false);
    }
  };

  if (error && activeTab === "customers") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>
        <button
          onClick={retry}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ background: "var(--color-primary)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] leading-tight">
              Customers
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              Canonical customer and identity management across all sources.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIdentityModalOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-medium transition-colors shadow-sm
                bg-[var(--color-surface)]
                border-[var(--color-border)]
                text-[var(--color-text-secondary)]
                hover:bg-[var(--color-surface-hover)]"
            >
              <GitBranch size={15} />
              Resolve Identity
            </button>
            <button
              onClick={handleNewCustomer}
              className="flex items-center gap-2 h-9 px-4 rounded-lg text-white text-sm font-semibold transition-all shadow-sm
                bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)]
                hover:from-[var(--color-primary)] hover:to-[var(--color-primary-light)]
                hover:shadow-lg"
            >
              <UserPlus size={15} />
              New Customer
            </button>
          </div>
        </div>

        {/* ── Summary Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard
            label="Total Customers"
            value={statsLoading ? null : (stats.total || total)}
            icon={<Users size={20} />}
            iconBg="bg-blue-50 dark:bg-blue-500/15"
            iconColor="var(--color-primary)"
            loading={statsLoading}
            hint="All records"
          />
          <SummaryCard
            label="Active Accounts"
            value={statsLoading ? null : stats.active}
            icon={<UserCheck size={20} />}
            iconBg="bg-emerald-50 dark:bg-emerald-500/15"
            iconColor="var(--color-success)"
            loading={statsLoading}
            hint="Lifecycle: ACTIVE"
          />
          <SummaryCard
            label="Qualified Pipeline"
            value={statsLoading ? null : stats.qualified}
            icon={<Target size={20} />}
            iconBg="bg-violet-50 dark:bg-violet-500/15"
            iconColor="#7c3aed"
            loading={statsLoading}
            hint="Lifecycle: QUALIFIED"
          />
          <SummaryCard
            label="Prospects & Leads"
            value={statsLoading ? null : stats.prospects}
            icon={<TrendingUp size={20} />}
            iconBg="bg-cyan-50 dark:bg-cyan-500/15"
            iconColor="#0891b2"
            loading={statsLoading}
            hint="PROSPECT + LEAD"
          />
          <SummaryCard
            label="Churned"
            value={statsLoading ? null : stats.churned}
            icon={<UserX size={20} />}
            iconBg="bg-red-50 dark:bg-red-500/15"
            iconColor="var(--color-error)"
            loading={statsLoading}
            hint="Lifecycle: CHURNED"
          />
        </div>

        {/* ── Tabbed card ─────────────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden border shadow-sm
            border-[var(--color-border)]"
        >
          <TabBar active={activeTab} onChange={handleTabChange} />

          {activeTab === "customers" && (
            <div style={{ background: "var(--color-background-secondary)" }} className="bg-opacity-50 p-4 md:p-5">
              <CustomersTable
                customers={customers}
                total={total}
                page={page}
                perPage={pageSize}
                totalPages={totalPages}
                filters={filters}
                loading={loading}
                openMenu={openMenu}
                onPageChange={setPage}
                onPerPageChange={setPageSize}
                onRefreshCustomers={retry}
                onFiltersChange={handleFiltersChange}
                onNewCustomer={handleNewCustomer}
                onAction={handleAction}
                setOpenMenu={setOpenMenu}
                owners={owners}
                ownersLoading={ownersLoading}
              />
            </div>
          )}

          {activeTab === "identity" && (
            <div className="p-6 bg-gradient-to-br dark:from-[var(--color-background-secondary)]/60 to-transparent">
              <div className="max-w-2xl mx-auto text-center py-8">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
                    bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
                >
                  <GitBranch size={28} className="text-cyan-500" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
                  Identity Resolution
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                  Match identity payloads (email, phone, external IDs, CRM references)
                  against your canonical customer records with confidence scoring.
                </p>
                <button
                  onClick={() => setIdentityModalOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-white text-sm font-semibold transition-all shadow
                    bg-gradient-to-r from-[var(--color-primary-dark)] to-cyan-500
                    hover:shadow-lg"
                >
                  <Search size={15} />
                  Run Identity Resolution
                </button>
              </div>
            </div>
          )}

          {activeTab === "convert-lead" && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto text-center py-8">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
                    bg-gradient-to-br from-blue-500/20 to-violet-500/20"
                >
                  <ArrowRightLeft size={28} className="text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
                  Convert Lead to Customer
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                  Promote a qualified Lead into a Contact + Canonical Customer,
                  optionally creating a Deal with an initial amount.
                </p>
                <button
                  onClick={() => setConvertLeadModalOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-white text-sm font-semibold transition-all shadow
                    bg-gradient-to-r from-[var(--color-primary-dark)] to-violet-500
                    hover:shadow-lg"
                >
                  <UserPlus size={15} />
                  Start Lead Conversion
                </button>
              </div>
            </div>
          )}

          {activeTab === "convert-company" && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto text-center py-8">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
                    bg-gradient-to-br from-amber-500/20 to-emerald-500/20"
                >
                  <Building2 size={28} className="text-amber-500" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
                  Convert Company to Customer
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                  Promote a Company record directly into a Canonical Customer with
                  a chosen lifecycle state and type.
                </p>
                <button
                  onClick={() => setConvertCompanyModalOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-white text-sm font-semibold transition-all shadow
                    bg-gradient-to-r from-amber-500 to-emerald-500
                    hover:shadow-lg"
                >
                  <Factory size={15} />
                  Start Company Conversion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Drawers & Modals ───────────────────────────────────────────── */}
      <ConfirmationModal
        isOpen={confirmAction.type !== null && confirmAction.customer !== null}
        title={confirmAction.type === "Delete" ? "Delete Customer" : "Confirm"}
        message={
          confirmAction.type === "Delete"
            ? `Are you sure you want to delete customer "${confirmAction.customer?.name}"? This action cannot be undone.`
            : ""
        }
        variant={confirmAction.type === "Delete" ? "danger" : "default"}
        confirmText={confirmAction.type === "Delete" ? "Delete" : "Confirm"}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction({ type: null, customer: null })}
      />

      <IdentityResolveModal
        isOpen={identityModalOpen}
        onClose={() => { setIdentityModalOpen(false); setActiveTab("customers"); }}
      />

      <ConvertLeadModal
        isOpen={convertLeadModalOpen}
        onClose={() => { setConvertLeadModalOpen(false); setActiveTab("customers"); }}
        onSuccess={() => { setConvertLeadModalOpen(false); setActiveTab("customers"); retry(); }}
      />

      <ConvertCompanyModal
        isOpen={convertCompanyModalOpen}
        onClose={() => { setConvertCompanyModalOpen(false); setActiveTab("customers"); }}
        onSuccess={() => { setConvertCompanyModalOpen(false); setActiveTab("customers"); retry(); }}
      />
    </>
  );
}
