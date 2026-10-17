"use client";

import React, { useState, useEffect } from "react";
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
  PlusCircle,
  Search,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { BusinessEntityType, BusinessEntityLink, ConnectMessage } from "@/types/connect";
import { linkMessageToEntity } from "@/lib/api/connectApi";
import { createTask, fetchTasks, TaskPriority, TaskStatus } from "@/lib/api/tasksApi";
import { createLead, fetchLeads } from "@/lib/api/leadsApi";
import { getProjects } from "@/lib/api/projectsApi";
import { getMeetings } from "@/lib/api/meetingsApi";
import { getDocuments } from "@/lib/api/documentsApi";

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
  { type: "TASK", label: "Task", icon: CheckSquare, color: "text-amber-500", placeholder: "e.g. TASK-88 or task ID" },
  { type: "LEAD", label: "CRM Lead", icon: Target, color: "text-blue-500", placeholder: "e.g. LEAD-1024 or lead ID" },
  { type: "DEAL", label: "CRM Deal", icon: Briefcase, color: "text-emerald-500", placeholder: "e.g. DEAL-501 or deal ID" },
  { type: "PROJECT", label: "Project", icon: FolderKanban, color: "text-cyan-500", placeholder: "e.g. Project ID" },
  { type: "MEETING", label: "Meeting", icon: Calendar, color: "text-rose-500", placeholder: "e.g. Meeting ID" },
  { type: "DOCUMENT", label: "Document", icon: FileText, color: "text-orange-500", placeholder: "e.g. Document ID" },
  { type: "CONTACT", label: "Contact", icon: User, color: "text-indigo-500", placeholder: "e.g. Contact ID" },
  { type: "COMPANY", label: "Company", icon: Building, color: "text-purple-500", placeholder: "e.g. Company ID" },
];

export default function BusinessLinkModal({
  isOpen,
  onClose,
  message,
  onLinkCreated,
}: BusinessLinkModalProps) {
  // Mode: "create" (Convert message to new Task/CRM Lead) vs "select" (Link existing object)
  const [mode, setMode] = useState<"create" | "select">("create");
  const [createType, setCreateType] = useState<"TASK" | "LEAD">("TASK");

  // Create Task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("TODO");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Create Lead form state
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCompany, setLeadCompany] = useState("");

  // Select existing form state
  const [selectedType, setSelectedType] = useState<BusinessEntityType>("TASK");
  const [targetId, setTargetId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Existing items list cache
  const [existingItems, setExistingItems] = useState<Array<{ id: string; title: string; subtitle?: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form fields when modal opens
  useEffect(() => {
    if (isOpen && message) {
      const cleanContent = message.content.replace(/\n+/g, " ").trim();
      const snippet = cleanContent.length > 80 ? cleanContent.slice(0, 77) + "..." : cleanContent;
      setTaskTitle(snippet || "Follow up from chat");
      setLeadName(message.sender?.name ? `${message.sender.name} (from chat)` : snippet || "New Lead");
      setLeadEmail(message.sender?.email || "");
      setLeadCompany("");
      setTargetId("");
      setCustomTitle("");
      setError(null);
      setSearchFilter("");
    }
  }, [isOpen, message]);

  // Fetch existing items when switching entity type in "select" mode
  useEffect(() => {
    if (!isOpen || mode !== "select") return;

    let isMounted = true;
    const loadItems = async () => {
      setLoadingItems(true);
      try {
        if (selectedType === "TASK") {
          const res = await fetchTasks();
          if (isMounted) {
            setExistingItems(
              (res.tasks || []).map((t) => ({
                id: t.id,
                title: t.title,
                subtitle: `${t.priority} • ${t.status}`,
              }))
            );
          }
        } else if (selectedType === "LEAD") {
          const res = await fetchLeads(1, { status: "", source: "", owner: "", search: "" }, 50);
          if (isMounted) {
            setExistingItems(
              (res.leads || []).map((l) => ({
                id: l.id,
                title: l.name,
                subtitle: `${l.company || l.email || "Lead"} • ${l.status || ""}`,
              }))
            );
          }
        } else if (selectedType === "PROJECT") {
          const projects = await getProjects();
          if (isMounted) {
            setExistingItems(
              projects.map((p) => ({
                id: p.id,
                title: p.name,
                subtitle: p.status,
              }))
            );
          }
        } else if (selectedType === "MEETING") {
          const meetings = await getMeetings();
          if (isMounted) {
            setExistingItems(
              meetings.map((m) => ({
                id: m.id,
                title: m.title,
                subtitle: m.startTime ? new Date(m.startTime).toLocaleDateString() : undefined,
              }))
            );
          }
        } else if (selectedType === "DOCUMENT") {
          const docs = await getDocuments();
          if (isMounted) {
            setExistingItems(
              docs.map((d) => ({
                id: d.id,
                title: d.fileName,
                subtitle: d.fileType,
              }))
            );
          }
        } else {
          if (isMounted) setExistingItems([]);
        }
      } catch (e) {
        console.warn(`Failed to fetch items for ${selectedType}:`, e);
        if (isMounted) setExistingItems([]);
      } finally {
        if (isMounted) setLoadingItems(false);
      }
    };

    loadItems();
    return () => {
      isMounted = false;
    };
  }, [isOpen, mode, selectedType]);

  if (!isOpen || !message) return null;

  // Handle Create New Task from Message
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError("Please provide a task title");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const createdTask = await createTask({
        title: taskTitle.trim(),
        description: `Created from message: "${message.content}"`,
        priority: taskPriority,
        status: taskStatus,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      });

      const link = await linkMessageToEntity(
        message.id,
        "TASK",
        createdTask.id,
        { title: createdTask.title }
      );

      onLinkCreated({
        ...link,
        title: createdTask.title,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to create task from message:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to create and link task.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Create New Lead from Message
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) {
      setError("Please provide a lead name");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const createdLead = await createLead({
        name: leadName.trim(),
        email: leadEmail.trim() || `${Date.now()}@lead.placeholder`,
        company: leadCompany.trim() || undefined,
        note: `Created from message by ${message.sender?.name || "user"}: "${message.content}"`,
      });

      const link = await linkMessageToEntity(
        message.id,
        "LEAD",
        createdLead.id,
        { title: createdLead.name }
      );

      onLinkCreated({
        ...link,
        title: createdLead.name,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to create lead from message:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to create and link lead.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Linking an Existing Entity
  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) {
      setError("Please select or specify the entity ID to link");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const chosenItem = existingItems.find((item) => item.id === targetId.trim());
      const titleMatch = !chosenItem
        ? existingItems.find((item) => item.title.toLowerCase() === targetId.trim().toLowerCase())
        : null;
      const matchedEntity = chosenItem || titleMatch;
      const finalTargetId = matchedEntity ? matchedEntity.id : targetId.trim();
      const displayTitle = customTitle.trim() || matchedEntity?.title || targetId.trim();

      const link = await linkMessageToEntity(
        message.id,
        selectedType,
        finalTargetId,
        { title: displayTitle }
      );

      onLinkCreated({
        ...link,
        title: displayTitle,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to link business entity:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Target not found in system. Please verify the ID or choose an existing object from the list.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = existingItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <LinkIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Business Object Workflows</h3>
              <p className="text-xs text-text-muted">Convert message or connect to Tasks, CRM, Projects & Docs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Quote Preview */}
        <div className="px-6 pt-4 shrink-0">
          <div className="p-3 bg-surface-hover border border-border-light rounded-xl text-xs text-text-secondary flex items-start gap-2.5">
            <span className="font-semibold text-text shrink-0">{message.sender?.name || "Author"}:</span>
            <span className="line-clamp-2 italic text-text-muted">"{message.content}"</span>
          </div>
        </div>

        {/* Top Workflow Mode Tabs */}
        <div className="px-6 pt-3 shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-hover rounded-xl border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                mode === "create"
                  ? "bg-surface text-primary shadow-xs font-bold border border-border-light"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <PlusCircle size={15} />
              <span>Convert Message</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("select");
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                mode === "select"
                  ? "bg-surface text-primary shadow-xs font-bold border border-border-light"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <LinkIcon size={15} />
              <span>Link Existing Object</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-2 text-xs text-error shrink-0">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {mode === "create" ? (
            <div>
              {/* Entity creation target selector */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setCreateType("TASK")}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    createType === "TASK"
                      ? "bg-amber-500/10 border-amber-500 text-amber-600 shadow-xs"
                      : "border-border text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  <CheckSquare size={16} />
                  <span>Create Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateType("LEAD")}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    createType === "LEAD"
                      ? "bg-blue-500/10 border-blue-500 text-blue-600 shadow-xs"
                      : "border-border text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  <Target size={16} />
                  <span>Create CRM Lead</span>
                </button>
              </div>

              {createType === "TASK" ? (
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      Task Title <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Follow up on proposal"
                      required
                      className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Priority
                      </label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Due Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                      </input>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-2 border-t border-border">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface-hover rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !taskTitle.trim()}
                      className="px-5 py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center gap-2"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      <span>Create & Link Task</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateLead} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      Lead Contact Name <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      required
                      className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="jane@company.com"
                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={leadCompany}
                        onChange={(e) => setLeadCompany(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-2 border-t border-border">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface-hover rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !leadName.trim()}
                      className="px-5 py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center gap-2"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      <span>Create & Link Lead</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleLinkExisting} className="space-y-4">
              {/* Entity Type Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Select Business Entity Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ENTITY_CONFIG.map((cfg) => {
                    const Icon = cfg.icon;
                    const isSelected = selectedType === cfg.type;
                    return (
                      <button
                        key={cfg.type}
                        type="button"
                        onClick={() => {
                          setSelectedType(cfg.type);
                          setTargetId("");
                          setCustomTitle("");
                        }}
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

              {/* Existing items picker list (if available) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Choose Existing {selectedType}
                  </label>
                  {loadingItems && (
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> Loading...
                    </span>
                  )}
                </div>

                {existingItems.length > 0 && (
                  <div className="mb-2 relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder={`Filter ${selectedType.toLowerCase()}s...`}
                      className="w-full pl-7 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {existingItems.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-surface">
                    {filteredItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-text-muted">No matches found</div>
                    ) : (
                      filteredItems.map((item) => {
                        const isChosen = targetId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setTargetId(item.id);
                              setCustomTitle(item.title);
                            }}
                            className={`p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChosen
                                ? "bg-primary/10 text-primary font-bold"
                                : "hover:bg-surface-hover text-text"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold truncate">{item.title}</div>
                              {item.subtitle && (
                                <div className="text-[10px] text-text-muted truncate">{item.subtitle}</div>
                              )}
                            </div>
                            {isChosen && <Check size={14} className="shrink-0 text-primary" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  !loadingItems && (
                    <div className="p-3 border border-border-light rounded-xl text-center text-xs text-text-muted bg-surface-hover/30">
                      No active {selectedType.toLowerCase()}s found in workspace. Enter an ID manually below.
                    </div>
                  )
                )}
              </div>

              {/* Manual ID Input */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Selected / Manual {selectedType} ID <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder={`Enter ${selectedType} ID`}
                  required
                  className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Display Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Display Label (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Q4 Growth Deal"
                  className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border">
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
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center gap-2"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  <span>Link {selectedType}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
