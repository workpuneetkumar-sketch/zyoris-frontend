// components/deals/SharedOwnersModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Users,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Percent,
  Shield,
} from "lucide-react";
import { SharedOwner, CreateSharedOwnerPayload } from "@/types/enterpriseDeals";
import {
  fetchSharedOwners,
  addOrUpdateSharedOwner,
  deleteSharedOwner,
} from "@/lib/api/enterpriseDealsApi";

interface SharedOwnersModalProps {
  isOpen: boolean;
  dealId: string;
  dealName?: string;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
}

export function SharedOwnersModal({
  isOpen,
  dealId,
  dealName,
  onClose,
  onUpdated,
}: SharedOwnersModalProps) {
  const [mounted, setMounted] = useState(false);
  const [owners, setOwners] = useState<SharedOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form for adding a new co-owner
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("CO_OWNER");
  const [splitPercentage, setSplitPercentage] = useState<number>(20);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadOwners = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSharedOwners(dealId);
      setOwners(list);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load shared owners.");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (isOpen) {
      loadOwners();
    }
  }, [isOpen, loadOwners]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const currentTotalSplit = owners.reduce((sum, o) => sum + (Number(o.splitPercentage) || 0), 0);
  const remainingSplit = Math.max(0, 100 - currentTotalSplit);

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setError("User ID or email is required.");
      return;
    }

    const pct = Number(splitPercentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setError("Split percentage must be between 1 and 100.");
      return;
    }

    if (currentTotalSplit + pct > 100) {
      setError(`Total split cannot exceed 100%. Remaining available: ${remainingSplit}%.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: CreateSharedOwnerPayload = {
        userId: userId.trim(),
        role: role.trim(),
        splitPercentage: pct,
      };

      await addOrUpdateSharedOwner(dealId, payload);
      setSuccessMsg("Shared owner added successfully.");
      setUserId("");
      setSplitPercentage(Math.min(20, Math.max(5, remainingSplit - pct)));
      await loadOwners();
      if (onUpdated) await onUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to add shared owner.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOwner = async (sharedOwnerId: string) => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteSharedOwner(dealId, sharedOwnerId);
      setSuccessMsg("Shared owner removed.");
      await loadOwners();
      if (onUpdated) await onUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to remove shared owner.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Shared Owners & Attribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                {dealName || "Opportunity Shared Attribution"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Split Allocation Banner */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Percent className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Allocated Shared Split:
            </span>
            <span
              className={`text-xs font-bold ${
                currentTotalSplit > 100
                  ? "text-red-600"
                  : currentTotalSplit === 100
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {currentTotalSplit}%
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Remaining: <strong className="text-slate-700 dark:text-slate-200">{remainingSplit}%</strong>
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Existing Shared Owners Table */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned Shared Owners ({owners.length})
            </label>

            {loading ? (
              <div className="py-8 flex items-center justify-center text-slate-400 space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Loading owners...</span>
              </div>
            ) : owners.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                No shared owners assigned to this opportunity yet.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {owners.map((owner, idx) => (
                  <div
                    key={owner.id || `${owner.userId}-${idx}`}
                    className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                        {(owner.userName || owner.userEmail || owner.userId).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {owner.userName || owner.userEmail || owner.userId}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Role: <span className="font-medium text-slate-600 dark:text-slate-300">{owner.role || "CO_OWNER"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="px-2.5 py-1 rounded-full font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                        {owner.splitPercentage}% Split
                      </span>
                      {owner.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOwner(owner.id!)}
                          disabled={submitting}
                          title="Remove shared owner"
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Shared Owner Form */}
          <form onSubmit={handleAddOwner} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Shared Owner / Co-Rep</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  User ID / Email *
                </label>
                <input
                  type="text"
                  placeholder="e.g. usr_102 or rep@zyoris.com"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="CO_OWNER">Co-Owner</option>
                  <option value="TECHNICAL_LEAD">Technical Lead / SE</option>
                  <option value="CHANNEL_MANAGER">Channel Manager</option>
                  <option value="CUSTOMER_SUCCESS">Customer Success Rep</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Split % (Max {remainingSplit}%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={splitPercentage}
                  onChange={(e) => setSplitPercentage(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || !userId.trim() || remainingSplit <= 0}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Shared Owner</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
