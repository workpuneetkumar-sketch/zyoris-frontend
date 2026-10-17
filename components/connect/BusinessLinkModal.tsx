"use client";

import React, { useState } from "react";
import {
  X,
  Link as LinkIcon,
  Briefcase,
  Target,
  CheckSquare,
  User,
  Building,
  Calendar,
  FolderKanban,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BusinessEntityType, BusinessEntityLink, ConnectMessage } from "@/types/connect";
import { linkMessageToEntity } from "@/lib/api/connectApi";

interface BusinessLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ConnectMessage | null;
  onLinkCreated: (link: BusinessEntityLink) => void;
}

const ENTITY_CONFIG: Array<{
  type: BusinessEntityType;
  label: string;
  icon: React.ElementType;
  color: string;
  placeholder: string;
}> = [
  { type: "LEAD", label: "Lead", icon: Target, color: "text-blue-500", placeholder: "e.g. LEAD-1024 or Lead Name" },
  { type: "DEAL", label: "Deal", icon: Briefcase, color: "text-emerald-500", placeholder: "e.g. DEAL-501 or Enterprise Deal" },
  { type: "TASK", label: "Task", icon: CheckSquare, color: "text-amber-500", placeholder: "e.g. TASK-88 or Follow-up task" },
  { type: "CONTACT", label: "Contact", icon: User, color: "text-indigo-500", placeholder: "e.g. John Doe / contact ID" },
  { type: "COMPANY", label: "Company", icon: Building, color: "text-purple-500", placeholder: "e.g. Acme Corp" },
  { type: "MEETING", label: "Meeting", icon: Calendar, color: "text-rose-500", placeholder: "e.g. Demo Sync" },
  { type: "PROJECT", label: "Project", icon: FolderKanban, color: "text-cyan-500", placeholder: "e.g. Website Redesign" },
  { type: "DOCUMENT", label: "Document", icon: FileText, color: "text-orange-500", placeholder: "e.g. Proposal.pdf" },
];

export default function BusinessLinkModal({
  isOpen,
  onClose,
  message,
  onLinkCreated,
}: BusinessLinkModalProps) {
  const [selectedType, setSelectedType] = useState<BusinessEntityType>("LEAD");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !message) return null;

  const currentConfig = ENTITY_CONFIG.find((c) => c.type === selectedType) || ENTITY_CONFIG[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) {
      setError("Please specify the Entity ID or reference");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const link = await linkMessageToEntity(
        message.id,
        selectedType,
        targetId.trim(),
        { title: title.trim() || undefined }
      );
      onLinkCreated({
        ...link,
        title: title.trim() || targetId.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to link business entity:", err);
      setError("Could not create entity link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <LinkIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Link Business Entity</h3>
              <p className="text-xs text-text-muted">Connect message to CRM Leads, Deals, Tasks, etc.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 mx-4 mt-4 bg-surface-hover border border-border-light rounded-xl text-xs text-text-muted line-clamp-2 italic">
          "{message.content}"
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-2 text-xs text-error">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Entity Type Picker */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Select Entity Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ENTITY_CONFIG.map((cfg) => {
                const Icon = cfg.icon;
                const isSelected = selectedType === cfg.type;
                return (
                  <button
                    key={cfg.type}
                    type="button"
                    onClick={() => setSelectedType(cfg.type)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "border-border hover:bg-surface-hover text-text-secondary"
                    }`}
                  >
                    <Icon size={16} className={isSelected ? "text-primary" : cfg.color} />
                    <span className="text-[10px]">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target ID / Reference */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              {currentConfig.label} ID or Code <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={currentConfig.placeholder}
              required
              className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          {/* Optional Title / Label */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Friendly Display Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enterprise Q4 Expansion"
              className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface-hover rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetId.trim()}
              className="px-5 py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center gap-1.5"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>Link Entity</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
