"use client";

import { Deal } from "@/types/deals";
import { getStageConfig } from "@/lib/dealConfig";
import {
  Calendar,
  User,
  Building2,
  Mail,
  Phone,
  Clock,
  Hash,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { updateDeal, UpdateDealPayload } from "@/lib/api/dealsApi";
import { DEFAULT_DEAL_STAGES } from "@/types/deals";

interface DealDetailProps {
  deal: Deal;
  onUpdate?: () => Promise<void>;
}

export function DealDetail({ deal, onUpdate }: DealDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "notes">(
    "overview"
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: deal.name,
    amount: deal.amount.toString(),
    stage: deal.stage,
  });

  if (!deal) return null;

  const stageConfig = getStageConfig(deal.stage);
  const isWon = deal.stage.toUpperCase() === "WON";
  const isLost = deal.stage.toUpperCase() === "LOST";

  const handleStageChange = async (newStage: string) => {
    if (newStage === deal.stage) return;
    
    try {
      setIsUpdating(true);
      setUpdateError(null);
      await updateDeal(deal.dealId, { stage: newStage });
      if (onUpdate) await onUpdate();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update stage");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      
      const payload: UpdateDealPayload = {
        name: editForm.name,
        amount: Number(editForm.amount),
        stage: editForm.stage,
      };

      await updateDeal(deal.dealId, payload);
      if (onUpdate) await onUpdate();
      setIsEditModalOpen(false);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update deal");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return "$0";
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const conversionProb = typeof deal.conversionProbability === 'number' 
    ? Math.round(deal.conversionProbability * 100) 
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Error Banner */}
      {updateError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm font-semibold text-red-800">{updateError}</p>
          <button 
            onClick={() => setUpdateError(null)}
            className="ml-auto text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Primary info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Stage & Amount Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
            {isUpdating && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Loader2 className="text-blue-600 animate-spin" size={24} />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {/* Stage */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Current Stage
                </p>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stageConfig.color
                    } shadow-sm`}
                  />
                  <p className="text-[16px] font-bold text-gray-900">
                    {stageConfig.label}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Deal Amount
                </p>
                <p className="text-[24px] font-black text-green-600">
                  {formatCurrency(deal.amount)}
                </p>
              </div>
            </div>

            {/* Conversion Probability */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Conversion Probability
                </p>
                <span className="text-[14px] font-black text-gray-900">
                  {conversionProb}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isWon
                        ? "bg-green-400"
                        : isLost
                        ? "bg-red-400"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${conversionProb}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
              {/* Owner */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Owner
                  </p>
                  <p className="text-[14px] font-semibold text-gray-900">{deal.owner || "Unassigned"}</p>
                </div>
              </div>

              {/* Close Date */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  <Calendar size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Expected Close
                  </p>
                  <p className="text-[14px] font-semibold text-gray-900">
                    {formatDate(deal.closeDate)}
                  </p>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  <Clock size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Created At
                  </p>
                  <p className="text-[14px] font-semibold text-gray-900">
                    {formatDate(deal.createdAt)}
                  </p>
                </div>
              </div>

              {/* External ID */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  <Hash size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    External ID
                  </p>
                  <p className="text-[14px] font-semibold text-gray-700 font-mono">
                    {deal.externalId || "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              Company Details
            </h3>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <Building2 size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Company Name
                </p>
                <p className="text-[16px] font-black text-gray-900">
                  {deal.companyName || "No Company Linked"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit sticky top-6">
          <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            Quick Summary
          </h3>

          <div className="space-y-5">
            <div className="p-4 bg-gray-50 rounded-xl space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Internal Deal ID
              </p>
              <p className="text-[12px] text-gray-600 font-mono break-all font-medium">
                {deal.dealId}
              </p>
            </div>
            {deal.leadId && (
              <div className="p-4 bg-blue-50 rounded-xl space-y-1">
                <div className="flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-blue-400" />
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    Converted from Lead
                  </p>
                </div>
                <p className="text-[12px] text-blue-600 font-mono break-all font-medium">
                  {deal.leadId}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                  Status
                </p>
                <select
                  value={deal.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  disabled={isUpdating}
                  className="bg-transparent text-[13px] font-black text-gray-800 focus:outline-none focus:ring-0 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {DEFAULT_DEAL_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {getStageConfig(s).label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                  Total Value
                </p>
                <p className="text-[18px] font-black text-green-600">
                  {formatCurrency(deal.amount)}
                </p>
              </div>

              <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                  Close Date
                </p>
                <p className="text-[13px] font-black text-gray-700">
                  {formatDate(deal.closeDate)}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setEditForm({
                  name: deal.name,
                  amount: deal.amount.toString(),
                  stage: deal.stage,
                });
                setIsEditModalOpen(true);
              }}
              disabled={isUpdating}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-blue-100 mt-2 flex items-center justify-center gap-2"
            >
              <Pencil size={16} />
              Edit Deal
            </button>
          </div>
        </div>
      </div>

      {/* Edit Deal Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">Edit Deal</h3>
                <p className="text-xs text-blue-100 font-bold uppercase tracking-widest mt-1">Update deal details</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-blue-100 hover:text-white p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Deal Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl text-[14px] font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
                  placeholder="Enter deal name"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold">
                      $
                    </div>
                    <input 
                      type="number" 
                      value={editForm.amount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-8 pr-5 py-3.5 bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl text-[14px] font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Stage</label>
                  <select 
                    value={editForm.stage}
                    onChange={(e) => setEditForm(prev => ({ ...prev, stage: e.target.value }))}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl text-[14px] font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none appearance-none"
                  >
                    {DEFAULT_DEAL_STAGES.map(s => (
                      <option key={s} value={s}>{getStageConfig(s).label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="px-6 py-3 text-[13px] font-black text-gray-500 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isUpdating || !editForm.name.trim()}
                className="px-8 py-3 text-[13px] font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline and Notes Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-8 px-6 pt-5">
            {["overview", "timeline", "notes"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-[12px] font-black uppercase tracking-widest pb-4 border-b-2 transition-all ${
                  activeTab === tab
                    ? "text-blue-600 border-b-blue-600"
                    : "text-gray-400 border-b-transparent hover:text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
          {activeTab === "overview" && (
            <div className="text-gray-500 text-[14px] leading-relaxed">
              <p>
                This deal is currently in the <span className="font-bold text-gray-900">{stageConfig.label}</span> stage. 
                {deal.owner ? ` It is assigned to ${deal.owner}.` : " It has not been assigned to an owner yet."}
              </p>
              <p className="mt-4">
                {deal.companyName ? `Associated with ${deal.companyName}.` : "No company has been linked to this deal."}
              </p>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                <Clock size={24} />
              </div>
              <h4 className="text-[14px] font-bold text-gray-900 mb-1">No activities found</h4>
              <p className="text-[12px] text-gray-400 max-w-[200px]">
                Activities like stage changes and assignments will appear here.
              </p>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                <Mail size={24} />
              </div>
              <h4 className="text-[14px] font-bold text-gray-900 mb-1">No notes recorded</h4>
              <p className="text-[12px] text-gray-400 max-w-[200px]">
                Add notes to keep track of important discussions and details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
