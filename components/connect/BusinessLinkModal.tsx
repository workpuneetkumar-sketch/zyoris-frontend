"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Link as LinkIcon,
  CheckSquare,
  Users2,
  DollarSign,
  Calendar,
  FolderKanban,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
  Plus,
  ExternalLink,
} from "lucide-react";
import {
  ConnectMessage,
  BusinessEntityLink,
  BusinessLinkTargetType,
} from "@/types/connect";
import {
  createMessageLink,
  getMessageLinks,
  deleteMessageLink,
} from "@/lib/api/connectApi";
import { createTask, fetchTasks } from "@/lib/api/tasksApi";
import { createLead, fetchLeads } from "@/lib/api/leadsApi";
import { getProjects } from "@/lib/api/projectsApi";
import { getMeetings } from "@/lib/api/meetingsApi";

interface BusinessLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ConnectMessage | null;
  onLinksUpdated?: (messageId: string, links: BusinessEntityLink[]) => void;
}

const TARGET_TYPES: {
  type: BusinessLinkTargetType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { type: "TASK", label: "Task", icon: CheckSquare, description: "Action item in Zyoris Tasks" },
  { type: "LEAD", label: "CRM Lead", icon: Users2, description: "Prospective customer or contact" },
  { type: "DEAL", label: "CRM Deal", icon: DollarSign, description: "Sales pipeline opportunity" },
  { type: "MEETING", label: "Meeting", icon: Calendar, description: "Scheduled meeting discussion" },
  { type: "PROJECT", label: "Project", icon: FolderKanban, description: "Workspace delivery project" },
  { type: "DOCUMENT", label: "Document", icon: FileText, description: "Documentation or spec sheet" },
];

export default function BusinessLinkModal({
  isOpen,
  onClose,
  message,
  onLinksUpdated,
}: BusinessLinkModalProps) {
  const [activeTab, setActiveTab] = useState<"link" | "create">("link");
  const [selectedType, setSelectedType] = useState<BusinessLinkTargetType>("TASK");

  // Existing links on this message
  const [links, setLinks] = useState<BusinessEntityLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Link existing form state
  const [targetId, setTargetId] = useState("");
  const [targetTitle, setTargetTitle] = useState("");
  const [availableItems, setAvailableItems] = useState<Array<{ id: string; title: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Quick create form state
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");

  useEffect(() => {
    if (!isOpen || !message) {
      setLinks([]);
      setFeedback(null);
      return;
    }

    setNewTitle(message.content.slice(0, 80));
    loadCurrentLinks(message.id);
  }, [isOpen, message?.id]);

  useEffect(() => {
    if (!isOpen) return;
    loadAvailableItems(selectedType);
  }, [isOpen, selectedType]);

  const loadCurrentLinks = async (msgId: string) => {
    setLoadingLinks(true);
    try {
      const data = await getMessageLinks(msgId);
      setLinks(data);
      if (onLinksUpdated) onLinksUpdated(msgId, data);
    } catch (err) {
      console.error("Failed to load message links:", err);
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadAvailableItems = async (type: BusinessLinkTargetType) => {
    setLoadingItems(true);
    setAvailableItems([]);
    try {
      if (type === "TASK") {
        const res = await fetchTasks({ limit: 15 });
        const list = res.tasks || (Array.isArray(res) ? res : []);
        setAvailableItems(list.map((t: any) => ({ id: t.id, title: t.title || "Task" })));
      } else if (type === "LEAD") {
        const res = await fetchLeads(1, { status: "All Status", source: "All Sources", owner: "All Owners", search: "" }, 15);
        const list = res.leads || (Array.isArray(res) ? res : []);
        setAvailableItems(list.map((l: any) => ({ id: l.id, title: l.name || l.companyName || "Lead" })));
      } else if (type === "PROJECT") {
        const list = await getProjects();
        setAvailableItems(list.map((p) => ({ id: p.id, title: p.name })));
      } else if (type === "MEETING") {
        const list = await getMeetings();
        setAvailableItems(list.map((m: any) => ({ id: m.id, title: m.title || "Meeting" })));
      }
    } catch (err) {
      console.warn(`Could not preload items for ${type}:`, err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !targetId.trim()) return;

    // Check duplicate
    if (links.some((l) => l.targetType === selectedType && l.targetId === targetId.trim())) {
      setFeedback({ type: "error", message: `This message is already linked to this ${selectedType}.` });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const created = await createMessageLink(message.id, {
        targetType: selectedType,
        targetId: targetId.trim(),
        metadata: {
          title: targetTitle.trim() || undefined,
        },
      });

      const updatedLinks = [...links, created];
      setLinks(updatedLinks);
      if (onLinksUpdated) onLinksUpdated(message.id, updatedLinks);

      setTargetId("");
      setTargetTitle("");
      setFeedback({ type: "success", message: `Successfully linked to ${selectedType}!` });
    } catch (err: any) {
      console.error("Failed to link entity:", err);
      const msg = err.response?.data?.message || err.message || "Failed to link entity";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !newTitle.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      let createdEntityId = "";
      let createdEntityTitle = newTitle.trim();

      if (selectedType === "TASK") {
        const task = await createTask({
          title: createdEntityTitle,
          description: `Created from message: "${message.content}"`,
          priority: newPriority as any,
          status: "TODO",
        });
        createdEntityId = task.id;
      } else if (selectedType === "LEAD") {
        const lead = await createLead({
          name: createdEntityTitle,
          notes: `Created from message: "${message.content}"`,
          status: "NEW",
        } as any);
        createdEntityId = (lead as any).id;
      } else {
        // Fallback for types without quick-create
        throw new Error(`Quick create not supported for ${selectedType}. Please link existing record.`);
      }

      if (createdEntityId) {
        const link = await createMessageLink(message.id, {
          targetType: selectedType,
          targetId: createdEntityId,
          metadata: { title: createdEntityTitle },
        });

        const updatedLinks = [...links, link];
        setLinks(updatedLinks);
        if (onLinksUpdated) onLinksUpdated(message.id, updatedLinks);

        setFeedback({
          type: "success",
          message: `Created new ${selectedType} and linked to message!`,
        });
        setNewTitle("");
      }
    } catch (err: any) {
      console.error("Failed to quick-create and link:", err);
      const msg = err.response?.data?.message || err.message || "Failed to create record";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!message) return;
    setDeletingLinkId(linkId);
    try {
      const ok = await deleteMessageLink(message.id, linkId);
      if (ok) {
        const updated = links.filter((l) => l.id !== linkId);
        setLinks(updated);
        if (onLinksUpdated) onLinksUpdated(message.id, updated);
        setFeedback({ type: "success", message: "Link removed successfully." });
      }
    } catch (err: any) {
      console.error("Failed to delete link:", err);
      setFeedback({ type: "error", message: "Failed to remove link." });
    } finally {
      setDeletingLinkId(null);
    }
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-hover flex items-center justify-center text-primary border border-border">
              <LinkIcon size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Business Entity Links</h3>
              <p className="text-[11px] text-text-muted truncate max-w-xs">
                Turn message into real Zyoris work
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="px-5 py-2.5 bg-surface-hover border-b border-border text-xs text-text-secondary truncate">
          <span className="font-semibold text-text">Message: </span>
          <span className="italic">"{message.content.slice(0, 100)}..."</span>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-border/50">
          <button
            onClick={() => setActiveTab("link")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "link"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Link Existing Record
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "create"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Quick Create & Link
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mx-5 mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-success-light text-success-foreground border border-success"
                : "bg-error-light text-error-foreground border border-error"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="p-0.5 hover:opacity-70">
              <X size={13} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Target Entity Type Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Select Record Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TARGET_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = selectedType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setSelectedType(t.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-xs ring-1 ring-primary"
                        : "border-border bg-surface hover:bg-surface-hover text-text"
                    }`}
                  >
                    <Icon size={16} className={isSelected ? "text-primary" : "text-text-muted"} />
                    <span className="text-xs font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: Link Existing */}
          {activeTab === "link" ? (
            <form onSubmit={handleLinkExisting} className="space-y-3">
              {/* Preloaded list dropdown if available */}
              {availableItems.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Select from recent {selectedType}s
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => {
                      const selected = availableItems.find((item) => item.id === e.target.value);
                      setTargetId(e.target.value);
                      if (selected) setTargetTitle(selected.title);
                    }}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Choose existing record --</option>
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.id.slice(-6)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {loadingItems && (
                <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin text-primary" />
                  <span>Loading recent {selectedType} records...</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Record ID (or canonical resource ID) *
                </label>
                <input
                  type="text"
                  required
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder={`Enter ${selectedType} canonical ID...`}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Display Title / Note (Optional)
                </label>
                <input
                  type="text"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  placeholder="e.g. Redesign homepage navigation..."
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !targetId.trim()}
                className="w-full py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                <span>Link to Message</span>
              </button>
            </form>
          ) : (
            /* Tab 2: Quick Create */
            <form onSubmit={handleQuickCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  New {selectedType} Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`Enter ${selectedType} title...`}
                  className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {selectedType === "TASK" && (
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !newTitle.trim()}
                className="w-full py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Create {selectedType} & Link</span>
              </button>
            </form>
          )}

          {/* Existing Links Section */}
          <div className="pt-3 border-t border-border">
            <h4 className="text-xs font-bold text-text mb-2 flex items-center justify-between">
              <span>Currently Linked Records</span>
              <span className="text-[11px] font-normal text-text-muted">({links.length})</span>
            </h4>

            {loadingLinks ? (
              <div className="py-4 text-center text-xs text-text-muted flex items-center justify-center gap-1.5">
                <Loader2 size={13} className="animate-spin text-primary" />
                <span>Loading links...</span>
              </div>
            ) : links.length === 0 ? (
              <p className="text-xs text-text-muted italic">No business records linked yet.</p>
            ) : (
              <div className="space-y-1.5">
                {links.map((link) => {
                  const typeConfig = TARGET_TYPES.find((t) => t.type === link.targetType);
                  const Icon = typeConfig?.icon || LinkIcon;
                  const label = link.metadata?.title || `${link.targetType} (${link.targetId.slice(-6)})`;

                  return (
                    <div
                      key={link.id}
                      className="p-2.5 rounded-xl bg-surface-hover border border-border flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={14} className="text-primary shrink-0" />
                        <span className="font-semibold text-text truncate">{label}</span>
                        <span className="text-[10px] text-text-muted uppercase px-1.5 py-0.2 rounded bg-surface border border-border shrink-0">
                          {link.targetType}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        disabled={deletingLinkId === link.id}
                        className="p-1 rounded-md text-text-muted hover:text-error hover:bg-surface transition-colors shrink-0"
                        title="Remove link"
                      >
                        {deletingLinkId === link.id ? (
                          <Loader2 size={12} className="animate-spin text-error" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
