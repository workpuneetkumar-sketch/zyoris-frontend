// components/deals/PipelineSelector.tsx
"use client";

import { useState } from "react";
import {
  GitBranch,
  Plus,
  Settings2,
  Trash2,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
  Globe,
  Briefcase,
  Layers,
} from "lucide-react";
import {
  Pipeline,
  CreatePipelinePayload,
  UpdatePipelinePayload,
} from "@/types/pipelines";

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  loading: boolean;
  error: string | null;
  onSelectPipeline: (pipeline: Pipeline) => void;
  onCreatePipeline: (payload: CreatePipelinePayload) => Promise<boolean>;
  onUpdatePipeline: (id: string, payload: UpdatePipelinePayload) => Promise<boolean>;
  onDeletePipeline: (id: string) => Promise<boolean>;
  onRetry: () => void;
}

export function PipelineSelector({
  pipelines,
  selectedPipeline,
  loading,
  error,
  onSelectPipeline,
  onCreatePipeline,
  onUpdatePipeline,
  onDeletePipeline,
  onRetry,
}: PipelineSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [salesMotion, setSalesMotion] = useState("OUTBOUND");

  const openCreate = () => {
    setName("");
    setDescription("");
    setProduct("");
    setRegion("");
    setBusinessUnit("");
    setSalesMotion("OUTBOUND");
    setFormError(null);
    setIsCreateOpen(true);
    setIsDropdownOpen(false);
  };

  const openEdit = () => {
    if (!selectedPipeline) return;
    setName(selectedPipeline.name || "");
    setDescription(selectedPipeline.description || "");
    setProduct(selectedPipeline.product || "");
    setRegion(selectedPipeline.region || "");
    setBusinessUnit(selectedPipeline.businessUnit || "");
    setSalesMotion(selectedPipeline.salesMotion || "OUTBOUND");
    setFormError(null);
    setIsEditOpen(true);
    setIsDropdownOpen(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Pipeline name is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const ok = await onCreatePipeline({
        name: name.trim(),
        description: description.trim() || undefined,
        product: product.trim() || undefined,
        region: region.trim() || undefined,
        businessUnit: businessUnit.trim() || undefined,
        salesMotion: salesMotion.trim() || undefined,
        isActive: true,
      });
      if (ok) {
        setIsCreateOpen(false);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to create pipeline");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPipeline || !name.trim()) {
      setFormError("Pipeline name is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const ok = await onUpdatePipeline(selectedPipeline.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        product: product.trim() || undefined,
        region: region.trim() || undefined,
        businessUnit: businessUnit.trim() || undefined,
        salesMotion: salesMotion.trim() || undefined,
      });
      if (ok) {
        setIsEditOpen(false);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to update pipeline");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedPipeline) return;
    setSubmitting(true);
    try {
      const ok = await onDeletePipeline(selectedPipeline.id);
      if (ok) {
        setIsDeleteConfirmOpen(false);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to delete pipeline");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
        <Loader2 size={14} className="animate-spin text-blue-600" />
        <span>Loading pipelines...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
        <AlertCircle size={14} />
        <span>Error loading pipelines</span>
        <button
          onClick={onRetry}
          className="ml-1 text-blue-600 font-bold hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {/* Active Pipeline Selector Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2.5 h-10 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-left shadow-sm transition-all text-xs font-semibold text-gray-800"
        >
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GitBranch size={13} />
          </div>

          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-tight">
              Pipeline
            </span>
            <span className="text-xs font-bold text-gray-900 truncate max-w-[160px]">
              {selectedPipeline ? selectedPipeline.name : "Default Pipeline"}
            </span>
          </div>

          <ChevronDown size={14} className="text-gray-400 ml-auto shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Select Pipeline
            </div>

            <div className="max-h-60 overflow-y-auto px-1 space-y-0.5">
              {pipelines.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">
                  No pipelines found. Create your first pipeline below.
                </div>
              ) : (
                pipelines.map((p) => {
                  const isSelected = selectedPipeline?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPipeline(p);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                        {(p.product || p.region || p.salesMotion) && (
                          <div className="text-[10px] text-gray-400 truncate mt-0.5">
                            {[p.product, p.region, p.salesMotion].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-gray-100 mt-1 pt-1 px-1">
              <button
                onClick={openCreate}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus size={14} />
                Create New Pipeline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Quick Metadata Chips */}
      {selectedPipeline && (
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-500">
          {selectedPipeline.salesMotion && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium">
              <Briefcase size={11} className="text-gray-400" />
              {selectedPipeline.salesMotion}
            </span>
          )}
          {selectedPipeline.region && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium">
              <Globe size={11} className="text-gray-400" />
              {selectedPipeline.region}
            </span>
          )}
          {selectedPipeline.product && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium">
              <Layers size={11} className="text-gray-400" />
              {selectedPipeline.product}
            </span>
          )}
        </div>
      )}

      {/* Edit & Delete Action Buttons */}
      {selectedPipeline && (
        <div className="flex items-center gap-1">
          <button
            onClick={openEdit}
            title="Edit Pipeline Configuration"
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition-colors shadow-sm"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            title="Delete or Deactivate Pipeline"
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-gray-400 transition-colors shadow-sm"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* ── Create Pipeline Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <GitBranch size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Create Pipeline</h3>
                  <p className="text-[11px] text-gray-400">Configure sales flow & target market</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Pipeline Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Software Pipeline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard sales motion for ACV > $50k"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Product
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cloud ERP"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. North America"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Business Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise"
                    value={businessUnit}
                    onChange={(e) => setBusinessUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Sales Motion
                  </label>
                  <select
                    value={salesMotion}
                    onChange={(e) => setSalesMotion(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="OUTBOUND">OUTBOUND</option>
                    <option value="INBOUND">INBOUND</option>
                    <option value="CHANNEL">CHANNEL</option>
                    <option value="EXPANSION">EXPANSION</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Create Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Pipeline Modal ── */}
      {isEditOpen && selectedPipeline && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Settings2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Edit Pipeline</h3>
                  <p className="text-[11px] text-gray-400">Update configuration & filters</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Pipeline Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Product
                  </label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Business Unit
                  </label>
                  <input
                    type="text"
                    value={businessUnit}
                    onChange={(e) => setBusinessUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Sales Motion
                  </label>
                  <select
                    value={salesMotion}
                    onChange={(e) => setSalesMotion(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="OUTBOUND">OUTBOUND</option>
                    <option value="INBOUND">INBOUND</option>
                    <option value="CHANNEL">CHANNEL</option>
                    <option value="EXPANSION">EXPANSION</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete / Deactivate Pipeline Confirmation ── */}
      {isDeleteConfirmOpen && selectedPipeline && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 p-6 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Delete &quot;{selectedPipeline.name}&quot;?
            </h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              The backend will verify if this pipeline can be safely deleted or deactivated.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm shadow-red-200"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
