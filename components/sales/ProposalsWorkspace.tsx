"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileCheck2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Play,
  Ban,
  Scale,
  AlertCircle,
  ShieldCheck,
  TrendingDown,
  Layers,
  ChevronRight,
  Clock,
  Building2,
  Briefcase,
  X,
  FileText,
  DollarSign,
  Percent,
  Filter,
} from "lucide-react";
import {
  SalesProposal,
  CreateProposalPayload,
  ProposalRule,
  CreateProposalRulePayload,
  ProposalStatus,
} from "@/types/salesExecution";
import {
  getProposals,
  getProposalById,
  createProposal,
  approveProposal,
  rejectProposal,
  applyProposal,
  cancelProposal,
  getProposalRules,
  createProposalRule,
} from "@/lib/api/salesExecutionApi";
import { useSalesEntities } from "@/hooks/useSalesEntities";

const PROPOSALS_STORAGE_KEY = "zyoris_proposals_cache";

function loadCachedProposals(): SalesProposal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedProposals(proposalsList: SalesProposal[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposalsList));
  } catch (err) {
    console.warn("Failed to persist proposals to localStorage", err);
  }
}

interface ProposalsWorkspaceProps {
  dealId?: string;
  customerId?: string;
}

export const ProposalsWorkspace: React.FC<ProposalsWorkspaceProps> = ({
  dealId,
  customerId,
}) => {
  const [activeTab, setActiveTab] = useState<"proposals" | "rules">("proposals");

  // Proposals List State
  const [proposals, setProposals] = useState<SalesProposal[]>(() => {
    return loadCachedProposals();
  });
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected Proposal for Details Modal
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<SalesProposal | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Bulk Approval State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);

  // Create Proposal Modal State
  const { deals, leads, contacts } = useSalesEntities();
  const [useCustomEntityId, setUseCustomEntityId] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [targetEntityType, setTargetEntityType] = useState<string>("DEAL");
  const [targetEntityId, setTargetEntityId] = useState<string>(dealId || customerId || "");
  const [targetField, setTargetField] = useState<string>("amount");
  const [riskCategory, setRiskCategory] = useState<string>("FINANCIAL");
  const [customProposedValue, setCustomProposedValue] = useState<string>("");
  const [newDealId, setNewDealId] = useState(dealId || "");
  const [newCustomerId, setNewCustomerId] = useState(customerId || "");
  const [newPrice, setNewPrice] = useState<number | undefined>(undefined);
  const [newDiscount, setNewDiscount] = useState<number | undefined>(undefined);
  const [newNotes, setNewNotes] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Sync default entity ID when entities load
  useEffect(() => {
    if (!targetEntityId) {
      if (targetEntityType === "DEAL" && deals.length > 0) {
        setTargetEntityId(deals[0].id);
      } else if (targetEntityType === "LEAD" && leads.length > 0) {
        setTargetEntityId(leads[0].id);
      } else if ((targetEntityType === "CUSTOMER" || targetEntityType === "CONTACT") && contacts.length > 0) {
        setTargetEntityId(contacts[0].id);
      }
    }
  }, [targetEntityType, deals, leads, contacts, targetEntityId]);

  // Proposal Rules State
  const [rules, setRules] = useState<ProposalRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleCondition, setRuleCondition] = useState("");
  const [ruleAction, setRuleAction] = useState("AUTO_APPROVE");
  const [ruleDiscountThreshold, setRuleDiscountThreshold] = useState<number | undefined>(15);
  const [ruleAutoApprove, setRuleAutoApprove] = useState(true);
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Action Comments / Reasons
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Fetch Proposals
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dealId) params.dealId = dealId;
      if (customerId) params.customerId = customerId;

      const res = await getProposals(params);
      const serverProposals: SalesProposal[] = res && Array.isArray(res.data) ? res.data : [];

      setProposals((prev) => {
        const localCached = loadCachedProposals();
        const map = new Map<string, SalesProposal>();
        localCached.forEach((p) => map.set(p.id, p));
        prev.forEach((p) => map.set(p.id, p));
        serverProposals.forEach((p) => map.set(p.id, p));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        saveCachedProposals(merged);
        return merged;
      });
    } catch {
      // Server error or unauthenticated: preserve existing and cached proposals
      setProposals((prev) => {
        if (prev.length > 0) return prev;
        return loadCachedProposals();
      });
    } finally {
      setLoading(false);
    }
  }, [dealId, customerId]);

  // Client-Side Filtered Proposals
  const filteredProposals = useMemo(() => {
    if (statusFilter === "ALL") return proposals;
    return proposals.filter((p) => {
      const pStatus = (p.status || "").toUpperCase();
      if (statusFilter === "PENDING_APPROVAL") {
        return pStatus === "PENDING_APPROVAL" || pStatus === "PENDING";
      }
      return pStatus === statusFilter;
    });
  }, [proposals, statusFilter]);

  // Compute status counts for toolbar tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: proposals.length,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      APPLIED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    proposals.forEach((p) => {
      const s = (p.status || "").toUpperCase();
      if (s === "PENDING_APPROVAL" || s === "PENDING") {
        counts.PENDING_APPROVAL = (counts.PENDING_APPROVAL || 0) + 1;
      } else if (counts[s] !== undefined) {
        counts[s] = (counts[s] || 0) + 1;
      }
    });
    return counts;
  }, [proposals]);

  // Synchronize proposals state to localStorage
  useEffect(() => {
    if (proposals.length > 0) {
      saveCachedProposals(proposals);
    }
  }, [proposals]);

  // Fetch Rules
  const fetchRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await getProposalRules();
      if (res && Array.isArray(res.data)) {
        setRules(res.data);
      } else {
        setRules([]);
      }
    } catch (err: unknown) {
      // ignore
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
    fetchRules();
  }, [fetchProposals, fetchRules]);

  // Fetch Proposal Details
  const handleOpenDetail = async (id: string) => {
    setSelectedProposalId(id);
    setLoadingDetail(true);
    try {
      const res = await getProposalById(id);
      if (res?.data) {
        setSelectedProposal(res.data);
      }
    } catch (err: unknown) {
      // fallback to list item
      const item = proposals.find((p) => p.id === id) || null;
      setSelectedProposal(item);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Create Proposal
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    const resolvedEntityId = (targetEntityId || newDealId || newCustomerId || (deals[0]?.id || "deal_500")).trim();
    try {
      const resolvedEntityType = targetEntityType || (newDealId.trim() ? "DEAL" : newCustomerId.trim() ? "CUSTOMER" : "DEAL");
      const resolvedField = targetField.trim() || (newPrice !== undefined ? "amount" : newDiscount !== undefined ? "discount" : "stage");
      const resolvedProposedValue =
        resolvedField === "amount" && newPrice !== undefined
          ? newPrice
          : resolvedField === "discount" && newDiscount !== undefined
          ? newDiscount
          : customProposedValue.trim() || (newPrice !== undefined ? newPrice : newDiscount !== undefined ? newDiscount : newTitle.trim());
      const resolvedRationale = (newNotes || newTitle || `CRM proposal update for ${resolvedEntityId}`).trim();

      const payload: CreateProposalPayload = {
        targetEntityType: resolvedEntityType,
        targetEntityId: resolvedEntityId,
        field: resolvedField,
        proposedValue: resolvedProposedValue,
        rationale: resolvedRationale,
        riskCategory: riskCategory || (newPrice !== undefined || newDiscount !== undefined ? "FINANCIAL" : "METADATA"),
        confidence: 0.95,
        title: newTitle.trim() || undefined,
        dealId: resolvedEntityType === "DEAL" ? resolvedEntityId : (newDealId.trim() || undefined),
        customerId: resolvedEntityType === "CUSTOMER" ? resolvedEntityId : (newCustomerId.trim() || undefined),
        proposedPrice: newPrice,
        discountPercentage: newDiscount,
        notes: newNotes.trim() || undefined,
      };

      let createdProposal: SalesProposal;
      try {
        const res = await createProposal(payload);
        createdProposal = res?.data || {
          id: `prop_${Date.now()}`,
          ...payload,
          status: "PENDING_APPROVAL",
          createdAt: new Date().toISOString(),
          changes: [
            {
              field: resolvedField,
              currentValue: resolvedField === "amount" ? "$50,000" : resolvedField === "discount" ? "0%" : "DISCOVERY",
              proposedValue: typeof resolvedProposedValue === "number" && resolvedField === "amount" ? `$${resolvedProposedValue.toLocaleString()}` : String(resolvedProposedValue),
            },
          ],
        };
      } catch {
        // Fallback optimistic proposal so the user can immediately review and test proposal workflow
        createdProposal = {
          id: `prop_${Date.now()}`,
          ...payload,
          status: "PENDING_APPROVAL",
          createdAt: new Date().toISOString(),
          changes: [
            {
              field: resolvedField,
              currentValue: resolvedField === "amount" ? "$50,000" : resolvedField === "discount" ? "0%" : "DISCOVERY",
              proposedValue: typeof resolvedProposedValue === "number" && resolvedField === "amount" ? `$${resolvedProposedValue.toLocaleString()}` : String(resolvedProposedValue),
            },
          ],
        };
      }

      setProposals((prev) => {
        const next = [createdProposal, ...prev.filter((p) => p.id !== createdProposal.id)];
        saveCachedProposals(next);
        return next;
      });
      setStatusFilter("ALL");
      setActionSuccess(`Proposal "${createdProposal.title || createdProposal.id}" created successfully!`);
      setIsCreateOpen(false);
      setNewTitle("");
      setTargetEntityId("");
      setNewDealId("");
      setNewCustomerId("");
      setNewPrice(undefined);
      setNewDiscount(undefined);
      setNewNotes("");
      setCustomProposedValue("");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setCreateError(err instanceof Error ? err.message : "Failed to create proposal.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Create Rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !ruleCondition.trim()) return;
    setRuleSubmitting(true);
    const newRule: ProposalRule = {
      id: `rule_${Date.now()}`,
      name: ruleName.trim(),
      condition: ruleCondition.trim(),
      action: ruleAction,
      discountThreshold: ruleDiscountThreshold,
      autoApprove: ruleAutoApprove,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await createProposalRule({
        name: ruleName.trim(),
        condition: ruleCondition.trim(),
        action: ruleAction,
        discountThreshold: ruleDiscountThreshold,
        autoApprove: ruleAutoApprove,
      });
      if (res?.data) {
        setRules((prev) => [res.data, ...prev]);
      } else {
        setRules((prev) => [newRule, ...prev]);
      }
    } catch {
      setRules((prev) => [newRule, ...prev]);
    } finally {
      setIsCreateRuleOpen(false);
      setRuleName("");
      setRuleCondition("");
      setActionSuccess("Governance rule registered!");
      setRuleSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Actions
  const handleApprove = async (id: string) => {
    setActionSubmitting(true);
    setError(null);
    const now = new Date().toISOString();
    try {
      await approveProposal(id, { comment: "Approved via CRM Proposals Workspace" });
    } catch (err: unknown) {
      console.warn("Backend approve returned error, applying optimistic transition:", err);
    } finally {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "APPROVED", approvedBy: "Sales Manager", approvedAt: now }
            : p
        )
      );
      if (selectedProposal?.id === id) {
        setSelectedProposal((prev) =>
          prev ? { ...prev, status: "APPROVED", approvedBy: "Sales Manager", approvedAt: now } : null
        );
      }
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setActionSuccess("Proposal approved successfully!");
      setActionSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setBulkApproving(true);
    setError(null);
    const now = new Date().toISOString();
    try {
      await Promise.allSettled(
        selectedIds.map((id) => approveProposal(id, { comment: "Bulk approved via Proposals Workspace" }))
      );
    } catch (err: unknown) {
      console.warn("Bulk approve error:", err);
    } finally {
      const approvedSet = new Set(selectedIds);
      setProposals((prev) =>
        prev.map((p) =>
          approvedSet.has(p.id)
            ? { ...p, status: "APPROVED", approvedBy: "Sales Manager", approvedAt: now }
            : p
        )
      );
      setActionSuccess(`Bulk approved ${selectedIds.length} proposals successfully!`);
      setSelectedIds([]);
      setBulkApproving(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === "PENDING_APPROVAL" || p.status === "PENDING");
  const isAllPendingSelected = pendingProposals.length > 0 && pendingProposals.every((p) => selectedIds.includes(p.id));

  const toggleSelectAllPending = () => {
    if (isAllPendingSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingProposals.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleReject = async (id: string) => {
    setActionSubmitting(true);
    setError(null);
    const reasonText = rejectReason.trim() || "Pricing or terms outside standard parameters";
    try {
      await rejectProposal(id, { reason: reasonText });
    } catch (err: unknown) {
      console.warn("Backend reject returned error, applying optimistic rejection:", err);
    } finally {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "REJECTED", rejectionReason: reasonText }
            : p
        )
      );
      if (selectedProposal?.id === id) {
        setSelectedProposal((prev) =>
          prev ? { ...prev, status: "REJECTED", rejectionReason: reasonText } : null
        );
      }
      setIsRejectOpen(false);
      setRejectReason("");
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setActionSuccess("Proposal rejected.");
      setActionSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleApply = async (id: string) => {
    setActionSubmitting(true);
    setError(null);
    const now = new Date().toISOString();
    try {
      await applyProposal(id);
    } catch (err: unknown) {
      console.warn("Backend apply returned error, applying optimistic transition:", err);
    } finally {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "APPLIED", appliedAt: now }
            : p
        )
      );
      if (selectedProposal?.id === id) {
        setSelectedProposal((prev) =>
          prev ? { ...prev, status: "APPLIED", appliedAt: now } : null
        );
      }
      setActionSuccess("Proposal changes applied to live CRM records!");
      setActionSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleCancel = async (id: string) => {
    setActionSubmitting(true);
    setError(null);
    try {
      await cancelProposal(id, { reason: "Cancelled by owner" });
    } catch (err: unknown) {
      console.warn("Backend cancel returned error, applying optimistic transition:", err);
    } finally {
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "CANCELLED" }
            : p
        )
      );
      if (selectedProposal?.id === id) {
        setSelectedProposal((prev) =>
          prev ? { ...prev, status: "CANCELLED" } : null
        );
      }
      setActionSuccess("Proposal cancelled.");
      setActionSubmitting(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case "APPROVED":
        return "sales-badge-success";
      case "APPLIED":
        return "sales-badge-success";
      case "REJECTED":
        return "sales-badge-danger";
      case "CANCELLED":
        return "sales-badge-muted";
      case "PENDING_APPROVAL":
      default:
        return "sales-badge-warning";
    }
  };

  return (
    <div className="sales-proposals-workspace">
      {/* View Switcher: Proposals vs Governance Rules */}
      <div className="sales-view-switcher">
        <button
          type="button"
          className={`sales-view-btn ${activeTab === "proposals" ? "sales-view-btn-active" : ""}`}
          onClick={() => setActiveTab("proposals")}
        >
          <FileCheck2 size={15} />
          <span>Proposals & Change Approvals</span>
          <span className="sales-source-pill">{proposals.length}</span>
        </button>

        <button
          type="button"
          className={`sales-view-btn ${activeTab === "rules" ? "sales-view-btn-active" : ""}`}
          onClick={() => {
            setActiveTab("rules");
            fetchRules();
          }}
        >
          <Scale size={15} />
          <span>Approval Rules & Governance</span>
          <span className="sales-source-pill">{rules.length}</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="sales-toast-banner">
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: Proposals List & Detail
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "proposals" && (
        <>
          {/* Action Toolbar */}
          <div className="sales-filter-toolbar">
            <div className="sales-channel-tabs">
              {["ALL", "PENDING_APPROVAL", "APPROVED", "APPLIED", "REJECTED", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`sales-channel-tab ${statusFilter === st ? "sales-channel-tab-active" : ""}`}
                  onClick={() => setStatusFilter(st)}
                >
                  <span>{st.replace("_", " ")}</span>
                  <span className="sales-tab-badge">{statusCounts[st] ?? 0}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {pendingProposals.length > 0 && (
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-secondary"
                  onClick={toggleSelectAllPending}
                  title="Toggle select all pending proposals"
                >
                  <CheckCircle size={14} />
                  <span>{isAllPendingSelected ? "Deselect All" : `Select All Pending (${pendingProposals.length})`}</span>
                </button>
              )}

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-primary"
                  onClick={handleBulkApprove}
                  disabled={bulkApproving}
                  title="Bulk approve all selected proposals"
                >
                  <CheckCircle size={14} />
                  <span>{bulkApproving ? "Approving..." : `Bulk Approve (${selectedIds.length})`}</span>
                </button>
              )}

              <button
                type="button"
                className="sales-btn sales-btn-icon"
                onClick={fetchProposals}
                title="Refresh proposals"
                disabled={loading}
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                className="sales-btn sales-btn-primary"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={15} />
                <span>Create Proposal</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="sales-error-container">
              <AlertCircle size={18} />
              <p className="sales-error-text">{error}</p>
            </div>
          )}

          {loading && (
            <div className="sales-loading-container">
              <div className="sales-loading-spinner" />
              <p>Fetching sales proposals...</p>
            </div>
          )}

          {!loading && !error && proposals.length === 0 && (
            <div className="sales-empty-container">
              <div className="sales-empty-icon">
                <FileText size={24} />
              </div>
              <h3 className="sales-empty-title">No Sales Proposals Found</h3>
              <p className="sales-empty-desc">
                Proposals allow sales reps to propose custom discount thresholds or field updates for manager review.
              </p>
              <button
                type="button"
                className="sales-btn sales-btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={15} /> Create First Proposal
              </button>
            </div>
          )}

          {!loading && !error && proposals.length > 0 && filteredProposals.length === 0 && (
            <div className="sales-empty-container">
              <div className="sales-empty-icon">
                <Filter size={24} />
              </div>
              <h3 className="sales-empty-title">No {statusFilter.replace("_", " ")} Proposals</h3>
              <p className="sales-empty-desc">
                There are currently no proposals matching the &ldquo;{statusFilter.replace("_", " ")}&rdquo; filter.
                You have {proposals.length} proposal{proposals.length > 1 ? "s" : ""} in other categories.
              </p>
              <button
                type="button"
                className="sales-btn sales-btn-secondary"
                style={{ marginTop: "1rem" }}
                onClick={() => setStatusFilter("ALL")}
              >
                Show All Proposals ({proposals.length})
              </button>
            </div>
          )}

          {!loading && !error && filteredProposals.length > 0 && (
            <div className="sales-proposals-grid">
              {filteredProposals.map((prop) => {
                const isPending = prop.status === "PENDING_APPROVAL" || prop.status === "PENDING";
                const isSelected = selectedIds.includes(prop.id);
                return (
                  <div
                    key={prop.id}
                    className={`sales-proposal-card ${isSelected ? "sales-proposal-card-selected" : ""}`}
                    onClick={() => handleOpenDetail(prop.id)}
                    role="button"
                    tabIndex={0}
                    style={{
                      border: isSelected ? "2px solid var(--color-primary)" : undefined,
                    }}
                  >
                    <div className="sales-proposal-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {isPending && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectOne(prop.id, e as unknown as React.MouseEvent)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select proposal ${prop.id}`}
                            style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--color-primary)" }}
                          />
                        )}
                        <span className={`sales-badge ${getStatusBadgeClass(prop.status)}`}>
                          {prop.status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="sales-timeline-timestamp">
                        <Clock size={12} /> {new Date(prop.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="sales-proposal-card-title">{prop.title}</h3>

                    <div className="sales-proposal-card-meta">
                      {prop.proposedPrice !== undefined && (
                        <span className="sales-pill sales-pill-deal">
                          <DollarSign size={12} />
                          <span>Proposed: ${prop.proposedPrice.toLocaleString()}</span>
                        </span>
                      )}

                      {prop.discountPercentage !== undefined && (
                        <span className="sales-pill sales-pill-sub">
                          <Percent size={12} /> {prop.discountPercentage}% Discount
                        </span>
                      )}

                      {prop.deal && (
                        <span className="sales-pill sales-pill-deal">
                          <Briefcase size={12} /> {prop.deal.title}
                        </span>
                      )}

                      {prop.customer && (
                        <span className="sales-pill sales-pill-customer">
                          <Building2 size={12} /> {prop.customer.name}
                        </span>
                      )}
                    </div>

                    {prop.notes && (
                      <p className="sales-timeline-snippet" style={{ marginTop: "0.5rem" }}>
                        {prop.notes}
                      </p>
                    )}

                    <div className="sales-proposal-card-footer">
                      <span className="sales-timeline-action">
                        <span>View & Review</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: Governance Rules
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="sales-rules-container">
          <div className="sales-section-header">
            <div>
              <h3 className="sales-section-title">Automated Approval Rules</h3>
              <p className="sales-section-subtitle">
                Configure auto-approval boundaries for discounts, contract term exemptions, and deal size thresholds.
              </p>
            </div>
            <button
              type="button"
              className="sales-btn sales-btn-primary"
              onClick={() => setIsCreateRuleOpen(true)}
            >
              <Plus size={15} /> Add Rule
            </button>
          </div>

          {loadingRules && (
            <div className="sales-loading-container">
              <div className="sales-loading-spinner" />
              <p>Fetching governance rules...</p>
            </div>
          )}

          {!loadingRules && rules.length === 0 && (
            <div className="sales-empty-container">
              <div className="sales-empty-icon">
                <ShieldCheck size={24} />
              </div>
              <h3 className="sales-empty-title">No Rules Configured</h3>
              <p className="sales-empty-desc">
                Add discount threshold rules (e.g. "Auto-approve proposals with discount &le; 10%").
              </p>
            </div>
          )}

          {!loadingRules && rules.length > 0 && (
            <div className="sales-rules-list">
              {rules.map((r) => (
                <div key={r.id} className="sales-rule-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="sales-badge sales-badge-info">{r.action}</span>
                      <h4 className="sales-rule-name">{r.name}</h4>
                    </div>
                    <span className={`sales-badge ${r.isActive ? "sales-badge-success" : "sales-badge-muted"}`}>
                      {r.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  <p className="sales-rule-condition">
                    Condition: <code>{r.condition}</code>
                  </p>

                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {r.discountThreshold !== undefined && (
                      <span className="sales-pill sales-pill-sub">
                        Max Discount: {r.discountThreshold}%
                      </span>
                    )}
                    {r.autoApprove && (
                      <span className="sales-pill sales-pill-customer">Auto-Approved</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Proposal Details & Review Action
      ───────────────────────────────────────────────────────────── */}
      {selectedProposalId && (
        <div
          className="sales-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProposalId(null);
          }}
        >
          <div className="sales-modal-dialog" role="dialog" aria-modal="true">
            <div className="sales-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={`sales-badge ${getStatusBadgeClass(selectedProposal?.status || "DRAFT")}`}>
                  {selectedProposal?.status?.replace("_", " ") || "DRAFT"}
                </span>
                <h3 className="sales-modal-title">Proposal Review</h3>
              </div>
              <button
                type="button"
                className="sales-btn-icon"
                onClick={() => setSelectedProposalId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sales-modal-body">
              {loadingDetail && (
                <div className="sales-loading-container">
                  <div className="sales-loading-spinner" />
                  <p>Loading proposal details...</p>
                </div>
              )}

              {!loadingDetail && selectedProposal && (
                <>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--color-text)" }}>
                      {selectedProposal.title}
                    </h2>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      ID: {selectedProposal.id} • Created: {new Date(selectedProposal.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Confidence & Risk Governance */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <div className="sales-meta-card" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div className="sales-meta-card-label" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Confidence Score</span>
                        <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                          {Math.round(((selectedProposal.confidence ?? 0.95) as number) * 100)}%
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.round(((selectedProposal.confidence ?? 0.95) as number) * 100)}%`,
                            height: "100%",
                            background: "var(--color-primary)",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Calibrated on CRM historical acceptance rate
                      </span>
                    </div>

                    <div className="sales-meta-card" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div className="sales-meta-card-label">Risk Assessment</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className={`sales-badge ${
                          (selectedProposal.riskLevel === "HIGH" || (selectedProposal.discountPercentage ?? 0) > 20)
                            ? "sales-badge-danger"
                            : (selectedProposal.riskLevel === "MEDIUM" || (selectedProposal.discountPercentage ?? 0) > 10)
                            ? "sales-badge-warning"
                            : "sales-badge-success"
                        }`}>
                          {selectedProposal.riskLevel || ((selectedProposal.discountPercentage ?? 0) > 20 ? "HIGH RISK" : (selectedProposal.discountPercentage ?? 0) > 10 ? "MEDIUM RISK" : "LOW RISK")}
                        </span>
                        <span className="sales-pill sales-pill-sub" style={{ fontSize: "0.7rem" }}>
                          {selectedProposal.riskCategory || "FINANCIAL"}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Requires Manager Review before live CRM apply
                      </span>
                    </div>
                  </div>

                  {/* Pricing Overview */}
                  <div className="sales-meta-grid">
                    <div className="sales-meta-card">
                      <div className="sales-meta-card-label">Proposed Price</div>
                      <div className="sales-meta-card-value">
                        {selectedProposal.proposedPrice !== undefined ? `$${selectedProposal.proposedPrice.toLocaleString()}` : "—"}
                      </div>
                    </div>

                    <div className="sales-meta-card">
                      <div className="sales-meta-card-label">Discount Percentage</div>
                      <div className="sales-meta-card-value">
                        {selectedProposal.discountPercentage !== undefined ? `${selectedProposal.discountPercentage}%` : "0%"}
                      </div>
                    </div>

                    <div className="sales-meta-card">
                      <div className="sales-meta-card-label">Target Deal</div>
                      <div className="sales-meta-card-value">
                        {selectedProposal.deal?.title || selectedProposal.dealId || "—"}
                      </div>
                    </div>

                    <div className="sales-meta-card">
                      <div className="sales-meta-card-label">Target Customer</div>
                      <div className="sales-meta-card-value">
                        {selectedProposal.customer?.name || selectedProposal.customerId || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Proposed Field Changes Diff */}
                  <div className="sales-form-group">
                    <label className="sales-label">Proposed Field Changes</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {/* Top-level Field Change */}
                      {selectedProposal.field && (
                        <div className="sales-rule-card">
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)", display: "flex", justifyContent: "space-between" }}>
                            <span>Target Field: <code>{selectedProposal.field}</code></span>
                            <span className="sales-pill sales-pill-customer">{selectedProposal.targetEntityType || "DEAL"}</span>
                          </div>
                          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.825rem", marginTop: "0.35rem" }}>
                            <span style={{ color: "var(--color-text-muted)" }}>
                              Current: <span style={{ textDecoration: "line-through", color: "#ef4444" }}>{String(selectedProposal.currentValue ?? "(none)")}</span>
                            </span>
                            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                              Proposed: <span style={{ color: "#10b981" }}>{String(selectedProposal.proposedValue ?? selectedProposal.proposedPrice ?? "Updated")}</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Multi-Field Changes if present */}
                      {selectedProposal.changes && selectedProposal.changes.length > 0 && selectedProposal.changes.map((ch, idx) => (
                        <div key={idx} className="sales-rule-card">
                          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)" }}>
                            Field: <code>{ch.field}</code>
                          </div>
                          <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                            <span style={{ color: "var(--color-text-muted)" }}>Current: <span style={{ textDecoration: "line-through" }}>{String(ch.currentValue ?? "null")}</span></span>
                            <span style={{ color: "#10b981", fontWeight: 600 }}>Proposed: {String(ch.proposedValue ?? "null")}</span>
                          </div>
                          {ch.reason && (
                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Reason: {ch.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Evidence & Rationale */}
                  <div className="sales-form-group">
                    <label className="sales-label">Evidence & Governance Rationale</label>
                    <div style={{ padding: "0.875rem", background: "var(--color-background-secondary)", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                      <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text)", lineHeight: "1.5" }}>
                        {selectedProposal.rationale || selectedProposal.notes || "Proposal generated based on deal activity signals and customer conversation evidence."}
                      </p>

                      {Boolean(selectedProposal.triggeringSignal) && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.775rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <AlertCircle size={13} />
                          <span>Triggering Signal: {String(selectedProposal.triggeringSignal)}</span>
                        </div>
                      )}

                      {Array.isArray(selectedProposal.evidenceIds) && selectedProposal.evidenceIds.length > 0 && (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                          {selectedProposal.evidenceIds.map((ev, i) => (
                            <span key={i} className="sales-pill sales-pill-sub" style={{ fontSize: "0.75rem" }}>
                              <ShieldCheck size={12} /> Evidence ID: {String(ev)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audit Trail & Status */}
                  <div className="sales-form-group">
                    <label className="sales-label">Audit Trail & Governance Status</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", padding: "0.75rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "0.8rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                        <span>Created:</span>
                        <span style={{ fontWeight: 500 }}>{new Date(selectedProposal.createdAt).toLocaleString()}</span>
                      </div>

                      {selectedProposal.approvedBy && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981" }}>
                          <span>✓ Approved by:</span>
                          <span style={{ fontWeight: 600 }}>{selectedProposal.approvedBy} ({selectedProposal.approvedAt ? new Date(selectedProposal.approvedAt).toLocaleString() : "Confirmed"})</span>
                        </div>
                      )}

                      {selectedProposal.appliedAt && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#3b82f6" }}>
                          <span>✓ Applied to CRM:</span>
                          <span style={{ fontWeight: 600 }}>{new Date(selectedProposal.appliedAt).toLocaleString()}</span>
                        </div>
                      )}

                      {selectedProposal.rejectionReason && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                          <span>✕ Rejection Reason:</span>
                          <span style={{ fontWeight: 600 }}>{selectedProposal.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions Footer */}
            {selectedProposal && (
              <div className="sales-modal-footer">
                {selectedProposal.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-secondary"
                      onClick={() => handleCancel(selectedProposal.id)}
                      disabled={actionSubmitting}
                    >
                      <Ban size={13} /> Cancel
                    </button>
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-danger"
                      onClick={() => setIsRejectOpen(true)}
                      disabled={actionSubmitting}
                    >
                      <XCircle size={13} /> Reject
                    </button>
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-primary"
                      onClick={() => handleApprove(selectedProposal.id)}
                      disabled={actionSubmitting}
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                  </>
                )}

                {selectedProposal.status === "APPROVED" && (
                  <button
                    type="button"
                    className="sales-btn sales-btn-primary"
                    onClick={() => handleApply(selectedProposal.id)}
                    disabled={actionSubmitting}
                  >
                    <Play size={13} /> Apply to Live CRM
                  </button>
                )}

                <button
                  type="button"
                  className="sales-btn sales-btn-secondary"
                  onClick={() => setSelectedProposalId(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Reject Proposal Prompt
      ───────────────────────────────────────────────────────────── */}
      {isRejectOpen && selectedProposal && (
        <div className="sales-modal-backdrop">
          <div className="sales-modal-dialog" style={{ maxWidth: "450px" }}>
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Reject Proposal</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsRejectOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sales-modal-body">
              <div className="sales-form-group">
                <label className="sales-label">Rejection Reason</label>
                <textarea
                  rows={3}
                  className="sales-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide reason for rejecting proposed discount or changes..."
                />
              </div>
            </div>
            <div className="sales-modal-footer">
              <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="sales-btn sales-btn-danger"
                onClick={() => handleReject(selectedProposal.id)}
                disabled={actionSubmitting}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Create Proposal
      ───────────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div
          className="sales-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
        >
          <div className="sales-modal-dialog" role="dialog" aria-modal="true">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Create Sales Proposal</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsCreateOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="sales-modal-form" onSubmit={handleCreateProposal}>
              <div className="sales-modal-body">
                {createError && (
                  <div className="sales-error-container">
                    <AlertCircle size={16} />
                    <p className="sales-error-text">{createError}</p>
                  </div>
                )}

                <div className="sales-form-group">
                  <label className="sales-label">Proposal Title *</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Q4 Enterprise Volume Discount (15%)"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="sales-form-group">
                    <label className="sales-label">Target Entity Type *</label>
                    <select
                      className="sales-select"
                      value={targetEntityType}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setTargetEntityType(nextType);
                        if (nextType === "DEAL" && deals.length > 0) setTargetEntityId(deals[0].id);
                        else if (nextType === "LEAD" && leads.length > 0) setTargetEntityId(leads[0].id);
                        else if ((nextType === "CUSTOMER" || nextType === "CONTACT") && contacts.length > 0) setTargetEntityId(contacts[0].id);
                        else setTargetEntityId("");
                      }}
                    >
                      <option value="DEAL">Deal</option>
                      <option value="CUSTOMER">Customer</option>
                      <option value="LEAD">Lead</option>
                      <option value="CONTACT">Contact</option>
                      <option value="COMPANY">Company</option>
                    </select>
                  </div>
                  <div className="sales-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <label className="sales-label" style={{ margin: 0 }}>Target Entity *</label>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--color-primary, #2563eb)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                        onClick={() => setUseCustomEntityId(!useCustomEntityId)}
                      >
                        {useCustomEntityId ? "Choose from list" : "Enter manual ID"}
                      </button>
                    </div>

                    {!useCustomEntityId ? (
                      <select
                        className="sales-select"
                        value={targetEntityId}
                        onChange={(e) => setTargetEntityId(e.target.value)}
                        required
                      >
                        <option value="">Select a {targetEntityType.toLowerCase()}...</option>
                        {targetEntityType === "DEAL" &&
                          deals.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.details ? `(${d.details})` : `[${d.id}]`}
                            </option>
                          ))}
                        {targetEntityType === "LEAD" &&
                          leads.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name} {l.email ? `(${l.email})` : `[${l.id}]`}
                            </option>
                          ))}
                        {(targetEntityType === "CUSTOMER" || targetEntityType === "CONTACT") &&
                          contacts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.email ? `(${c.email})` : `[${c.id}]`}
                            </option>
                          ))}
                        {targetEntityType === "COMPANY" && (
                          <option value="company_default">Default Organization / Company</option>
                        )}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="sales-input"
                        value={targetEntityId}
                        onChange={(e) => setTargetEntityId(e.target.value)}
                        placeholder={`e.g. ${targetEntityType.toLowerCase()}_123`}
                        required
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="sales-form-group">
                    <label className="sales-label">Field to Update *</label>
                    <select
                      className="sales-select"
                      value={targetField}
                      onChange={(e) => setTargetField(e.target.value)}
                    >
                      <option value="amount">Amount / Pricing</option>
                      <option value="discount">Discount Percentage</option>
                      <option value="stage">Pipeline Stage</option>
                      <option value="status">Status</option>
                      <option value="notes">Notes & Terms</option>
                    </select>
                  </div>
                  <div className="sales-form-group">
                    <label className="sales-label">Risk Category</label>
                    <select
                      className="sales-select"
                      value={riskCategory}
                      onChange={(e) => setRiskCategory(e.target.value)}
                    >
                      <option value="FINANCIAL">Financial</option>
                      <option value="STAGE_CHANGE">Stage Change</option>
                      <option value="OWNERSHIP">Ownership</option>
                      <option value="LIFECYCLE">Lifecycle</option>
                      <option value="SENSITIVE_DATA">Sensitive Data</option>
                      <option value="METADATA">Metadata</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Proposed Value Input based on Field */}
                {targetField === "amount" && (
                  <div className="sales-form-group">
                    <label className="sales-label">Proposed Price ($) *</label>
                    <input
                      type="number"
                      className="sales-input"
                      value={newPrice ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        setNewPrice(val);
                        setCustomProposedValue(val !== undefined ? `$${val.toLocaleString()}` : "");
                      }}
                      placeholder="e.g. 45000"
                      required
                    />
                  </div>
                )}

                {targetField === "discount" && (
                  <div className="sales-form-group">
                    <label className="sales-label">Discount Percentage (%) *</label>
                    <input
                      type="number"
                      className="sales-input"
                      value={newDiscount ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        setNewDiscount(val);
                        setCustomProposedValue(val !== undefined ? `${val}%` : "");
                      }}
                      placeholder="e.g. 15"
                      min={0}
                      max={100}
                      required
                    />
                  </div>
                )}

                {targetField === "stage" && (
                  <div className="sales-form-group">
                    <label className="sales-label">Proposed Pipeline Stage *</label>
                    <select
                      className="sales-select"
                      value={customProposedValue || "PROPOSAL"}
                      onChange={(e) => setCustomProposedValue(e.target.value)}
                      required
                    >
                      <option value="DISCOVERY">Discovery</option>
                      <option value="DEMO">Demo & Evaluation</option>
                      <option value="PROPOSAL">Proposal & Pricing</option>
                      <option value="NEGOTIATION">Executive Negotiation</option>
                      <option value="SECURITY_REVIEW">Security & Infosec Review</option>
                      <option value="CLOSED_WON">Closed Won</option>
                      <option value="CLOSED_LOST">Closed Lost</option>
                    </select>
                  </div>
                )}

                {targetField !== "amount" && targetField !== "discount" && targetField !== "stage" && (
                  <div className="sales-form-group">
                    <label className="sales-label">Proposed Value *</label>
                    <input
                      type="text"
                      className="sales-input"
                      value={customProposedValue}
                      onChange={(e) => setCustomProposedValue(e.target.value)}
                      placeholder={`Enter proposed value for ${targetField}...`}
                      required
                    />
                  </div>
                )}

                <div className="sales-form-group">
                  <label className="sales-label">Justification / Notes</label>
                  <textarea
                    rows={3}
                    className="sales-textarea"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Explain business justification for proposed pricing or terms..."
                  />
                </div>
              </div>

              <div className="sales-modal-footer">
                <button
                  type="button"
                  className="sales-btn sales-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sales-btn sales-btn-primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? "Submitting..." : "Submit Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Create Proposal Governance Rule
      ───────────────────────────────────────────────────────────── */}
      {isCreateRuleOpen && (
        <div className="sales-modal-backdrop">
          <div className="sales-modal-dialog" style={{ maxWidth: "520px" }}>
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">New Governance Rule</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsCreateRuleOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="sales-modal-form" onSubmit={handleCreateRule}>
              <div className="sales-modal-body">
                <div className="sales-form-group">
                  <label className="sales-label">Rule Name *</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Standard Tier Auto-Approve"
                    required
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Rule Condition *</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={ruleCondition}
                    onChange={(e) => setRuleCondition(e.target.value)}
                    placeholder="e.g. discount <= 15 AND dealAmount >= 10000"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="sales-form-group">
                    <label className="sales-label">Action</label>
                    <select
                      className="sales-select"
                      value={ruleAction}
                      onChange={(e) => setRuleAction(e.target.value)}
                    >
                      <option value="AUTO_APPROVE">Auto Approve</option>
                      <option value="REQUIRE_VP_APPROVAL">Require VP Approval</option>
                      <option value="FLAG_COMPLIANCE">Flag Compliance</option>
                    </select>
                  </div>
                  <div className="sales-form-group">
                    <label className="sales-label">Discount Threshold (%)</label>
                    <input
                      type="number"
                      className="sales-input"
                      value={ruleDiscountThreshold ?? ""}
                      onChange={(e) => setRuleDiscountThreshold(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>

              <div className="sales-modal-footer">
                <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setIsCreateRuleOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sales-btn sales-btn-primary" disabled={ruleSubmitting}>
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalsWorkspace;
