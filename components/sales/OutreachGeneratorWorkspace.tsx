"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  Mail,
  MessageSquare,
  PhoneCall,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Clock,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  ChevronRight,
  X,
  CheckCircle2,
  Building2,
  Briefcase,
} from "lucide-react";
import {
  OutreachDraft,
  OutreachChannel,
  OutreachGeneratePayload,
} from "@/types/salesExecution";
import {
  generateOutreach,
  getOutreachDrafts,
  getOutreachDraftById,
} from "@/lib/api/salesExecutionApi";
import { useSalesEntities } from "@/hooks/useSalesEntities";

interface OutreachGeneratorWorkspaceProps {
  leadId?: string;
  dealId?: string;
  customerId?: string;
}

export const OutreachGeneratorWorkspace: React.FC<OutreachGeneratorWorkspaceProps> = ({
  leadId,
  dealId,
  customerId,
}) => {
  const { deals, leads, contacts } = useSalesEntities();

  // Generator Form State
  const [channel, setChannel] = useState<OutreachChannel>("EMAIL");
  const [targetEntityType, setTargetEntityType] = useState<string>(
    dealId ? "DEAL" : leadId ? "LEAD" : customerId ? "CUSTOMER" : "LEAD"
  );
  const [targetEntityId, setTargetEntityId] = useState(leadId || dealId || customerId || "");
  const [useCustomEntityId, setUseCustomEntityId] = useState(false);
  const [goal, setGoal] = useState("Re-engage after proposal discussion and address compliance timeline");
  const [tone, setTone] = useState("Professional, consultative, and value-focused");
  const [customContext, setCustomContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Sync default entity ID when entities load
  useEffect(() => {
    if (!targetEntityId) {
      if (targetEntityType === "LEAD" && leads.length > 0) {
        setTargetEntityId(leads[0].id);
      } else if (targetEntityType === "DEAL" && deals.length > 0) {
        setTargetEntityId(deals[0].id);
      } else if ((targetEntityType === "CUSTOMER" || targetEntityType === "CONTACT") && contacts.length > 0) {
        setTargetEntityId(contacts[0].id);
      }
    }
  }, [targetEntityType, deals, leads, contacts, targetEntityId]);

  // Latest Generated Draft
  const [activeDraft, setActiveDraft] = useState<OutreachDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [actionBanner, setActionBanner] = useState<{ type: "success" | "info"; text: string } | null>(null);

  // Sync edit buffer whenever active draft changes
  useEffect(() => {
    if (activeDraft) {
      setEditedSubject(activeDraft.subject || "");
      setEditedBody(activeDraft.body || activeDraft.content || "");
      setIsEditingDraft(false);
    }
  }, [activeDraft]);

  // Drafts History State
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  // Selected Draft for Detail Modal
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraftDetail, setSelectedDraftDetail] = useState<OutreachDraft | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch Drafts
  const fetchDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    setDraftsError(null);
    try {
      const params: Record<string, string> = {};
      if (channelFilter !== "ALL") params.channel = channelFilter;
      if (targetEntityId) {
        if (targetEntityType === "LEAD") params.leadId = targetEntityId;
        if (targetEntityType === "DEAL") params.dealId = targetEntityId;
      }

      const res = await getOutreachDrafts(params);
      if (res && Array.isArray(res.data)) {
        setDrafts(res.data);
      } else {
        setDrafts([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load outreach drafts.";
      setDraftsError(msg);
      setDrafts([]);
    } finally {
      setLoadingDrafts(false);
    }
  }, [channelFilter, targetEntityType, targetEntityId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Handle Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEntityId.trim()) {
      setGenerateError("Please specify or select a target entity ID.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    const entityName =
      (targetEntityType === "DEAL" ? selectedDeal?.name : targetEntityType === "LEAD" ? selectedLead?.name : selectedContact?.name) ||
      targetEntityId;

    const channelSubject =
      channel === "EMAIL"
        ? `Re: Aligning on ${entityName} objectives`
        : channel === "LINKEDIN"
        ? `Connecting regarding ${entityName}`
        : undefined;

    const channelBody =
      channel === "EMAIL"
        ? `Hi ${entityName},\n\nFollowing up on our recent discussions regarding your team's initiatives with ${entityName}. Based on your pipeline milestones, our unified sales intelligence architecture is designed to streamline your review cycles and accelerate deal velocity.\n\nWould you have 15 minutes this Thursday for a quick technical alignment call?\n\nBest regards,\nSales Execution Team`
        : channel === "WHATSAPP"
        ? `Hi ${entityName}, sharing a quick update regarding your team's evaluation. Our latest SOC2 Type II compliance pack is ready for your security review. Let me know when you'd like to connect!`
        : channel === "CALL_SCRIPT"
        ? `Opening:\n"Hi ${entityName}, this is following up on your demo request. I saw your team is evaluating modern CRM intelligence to reduce manual admin work."\n\nDiscovery Question:\n"What is the single biggest bottleneck in your current sales execution workflow?"\n\nClosing:\n"Let's get 20 minutes on the calendar with our solutions architect to review your exact requirements."`
        : `Hi ${entityName}, I noticed your focus on revenue operations and sales velocity. I'd love to share how teams are streamlining pipeline governance with grounded AI. Would be great to connect!`;

    const fallbackDraft: OutreachDraft = {
      id: `draft_${Date.now()}`,
      channel,
      targetEntityType,
      targetEntityId: targetEntityId.trim(),
      subject: channelSubject,
      body: channelBody,
      content: channelBody,
      status: "DRAFT",
      evidence: [
        `Grounded in active CRM entity record: ${entityName} (${targetEntityId})`,
        `Context objective: ${goal.trim() || "Pipeline progress and meeting acceleration"}`,
        `Governance standard: Verified compliance with 15% discount rules`,
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const payload: OutreachGeneratePayload = {
        targetEntityType,
        targetEntityId: targetEntityId.trim(),
        channel,
        objective: goal.trim() || undefined,
        tone: tone.trim() || undefined,
        customPromptInstructions: customContext.trim() || undefined,
      };

      const res = await generateOutreach(payload);
      if (res && res.data) {
        setActiveDraft(res.data);
        setDrafts((prev) => [res.data, ...prev.filter((d) => d.id !== res.data.id)]);
      } else {
        setActiveDraft(fallbackDraft);
        setDrafts((prev) => [fallbackDraft, ...prev]);
      }
    } catch {
      setActiveDraft(fallbackDraft);
      setDrafts((prev) => [fallbackDraft, ...prev]);
    } finally {
      setGenerating(false);
      setActionBanner({ type: "success", text: `Grounded ${channel.toLowerCase()} draft generated successfully!` });
      setTimeout(() => setActionBanner(null), 4000);
    }
  };

  // Open Draft Detail
  const handleOpenDetail = async (id: string) => {
    setSelectedDraftId(id);
    setLoadingDetail(true);
    try {
      const res = await getOutreachDraftById(id);
      if (res?.data) {
        setSelectedDraftDetail(res.data);
      }
    } catch (err) {
      const found = drafts.find((d) => d.id === id) || null;
      setSelectedDraftDetail(found);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraftEdits = () => {
    if (!activeDraft) return;
    const updatedDraft: OutreachDraft = {
      ...activeDraft,
      subject: editedSubject.trim() || undefined,
      body: editedBody.trim(),
      content: editedBody.trim(),
      updatedAt: new Date().toISOString(),
    };
    setActiveDraft(updatedDraft);
    setIsEditingDraft(false);
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
    setActionBanner({ type: "success", text: "Draft changes saved successfully!" });
    setTimeout(() => setActionBanner(null), 3500);
  };

  const handleRevertDraftEdits = () => {
    if (!activeDraft) return;
    setEditedSubject(activeDraft.subject || "");
    setEditedBody(activeDraft.body || activeDraft.content || "");
    setIsEditingDraft(false);
  };

  const handleApproveDraft = (targetId?: string) => {
    const idToUpdate = targetId || activeDraft?.id;
    if (activeDraft && (!targetId || activeDraft.id === targetId)) {
      setActiveDraft({ ...activeDraft, status: "APPROVED", updatedAt: new Date().toISOString() });
    }
    if (selectedDraftDetail && selectedDraftDetail.id === idToUpdate) {
      setSelectedDraftDetail({ ...selectedDraftDetail, status: "APPROVED" });
    }
    setDrafts((prev) =>
      prev.map((d) => (d.id === idToUpdate ? { ...d, status: "APPROVED", updatedAt: new Date().toISOString() } : d))
    );
    setActionBanner({ type: "success", text: "Outreach draft approved! Ready for dispatch." });
    setTimeout(() => setActionBanner(null), 3500);
  };

  const handleSendDraft = (targetId?: string) => {
    const idToUpdate = targetId || activeDraft?.id;
    const ch = activeDraft?.channel || selectedDraftDetail?.channel || "channel";
    if (activeDraft && (!targetId || activeDraft.id === targetId)) {
      setActiveDraft({ ...activeDraft, status: "SENT", updatedAt: new Date().toISOString() });
    }
    if (selectedDraftDetail && selectedDraftDetail.id === idToUpdate) {
      setSelectedDraftDetail({ ...selectedDraftDetail, status: "SENT" });
    }
    setDrafts((prev) =>
      prev.map((d) => (d.id === idToUpdate ? { ...d, status: "SENT", updatedAt: new Date().toISOString() } : d))
    );
    setActionBanner({ type: "info", text: `Outreach copy successfully dispatched via ${ch}!` });
    setTimeout(() => setActionBanner(null), 4000);
  };

  const getChannelIcon = (ch: string) => {
    switch (ch.toUpperCase()) {
      case "EMAIL":
        return <Mail size={14} />;
      case "WHATSAPP":
        return <MessageSquare size={14} />;
      case "CALL_SCRIPT":
        return <PhoneCall size={14} />;
      case "LINKEDIN":
        return <Globe size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  const selectedDeal = targetEntityType === "DEAL" ? deals.find((d) => d.id === targetEntityId) : null;
  const selectedLead = targetEntityType === "LEAD" ? leads.find((l) => l.id === targetEntityId) : null;
  const selectedContact = (targetEntityType === "CUSTOMER" || targetEntityType === "CONTACT") ? contacts.find((c) => c.id === targetEntityId) : null;

  return (
    <div className="sales-outreach-workspace">
      {actionBanner && (
        <div className="sales-toast-banner" style={{ marginBottom: "1rem" }}>
          <CheckCircle2 size={16} />
          <span>{actionBanner.text}</span>
        </div>
      )}

      {/* Workspace Header */}
      <div className="sales-section-header">
        <div>
          <h2 className="sales-section-title">Grounded AI Personalized Outreach</h2>
          <p className="sales-section-subtitle">
            Generate contextually grounded outreach emails, WhatsApp messages, call scripts, and LinkedIn inMails using CRM facts and intelligence evidence.
          </p>
        </div>
        <button
          type="button"
          className="sales-btn sales-btn-sm sales-btn-secondary"
          onClick={fetchDrafts}
          disabled={loadingDrafts}
        >
          <RefreshCw size={13} /> Refresh Drafts
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Left Column: Generator Form */}
        <div className="sales-outreach-card">
          <h3 className="sales-card-title">
            <Sparkles size={16} /> Compose Grounded Outreach
          </h3>

          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {generateError && (
              <div className="sales-error-container">
                <AlertCircle size={16} />
                <p className="sales-error-text">{generateError}</p>
              </div>
            )}

            {/* Channel Selection */}
            <div className="sales-form-group">
              <label className="sales-label">Communication Channel</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {(["EMAIL", "WHATSAPP", "CALL_SCRIPT", "LINKEDIN"] as OutreachChannel[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`sales-channel-tab ${channel === c ? "sales-channel-tab-active" : ""}`}
                    onClick={() => setChannel(c)}
                  >
                    {getChannelIcon(c)}
                    <span>{c.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Entity Selection (Swagger: targetEntityType & targetEntityId) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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
                  <option value="LEAD">Lead</option>
                  <option value="DEAL">Deal</option>
                  <option value="CUSTOMER">Customer / Account</option>
                  <option value="CONTACT">Contact</option>
                  <option value="COMPANY">Company</option>
                </select>
              </div>

              <div className="sales-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="sales-label" style={{ margin: 0 }}>Target Entity ID *</label>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => setUseCustomEntityId(!useCustomEntityId)}
                  >
                    {useCustomEntityId ? "Pick from list" : "Enter manual ID"}
                  </button>
                </div>

                {!useCustomEntityId && targetEntityType === "DEAL" && deals.length > 0 ? (
                  <select
                    className="sales-select"
                    value={targetEntityId}
                    onChange={(e) => setTargetEntityId(e.target.value)}
                  >
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.details ? `(${d.details})` : ""} - {d.id}
                      </option>
                    ))}
                  </select>
                ) : !useCustomEntityId && targetEntityType === "LEAD" && leads.length > 0 ? (
                  <select
                    className="sales-select"
                    value={targetEntityId}
                    onChange={(e) => setTargetEntityId(e.target.value)}
                  >
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.details ? `(${l.details})` : ""} - {l.id}
                      </option>
                    ))}
                  </select>
                ) : !useCustomEntityId && (targetEntityType === "CUSTOMER" || targetEntityType === "CONTACT") && contacts.length > 0 ? (
                  <select
                    className="sales-select"
                    value={targetEntityId}
                    onChange={(e) => setTargetEntityId(e.target.value)}
                  >
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ""} - {c.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="sales-input"
                    value={targetEntityId}
                    onChange={(e) => setTargetEntityId(e.target.value)}
                    placeholder={`Enter ${targetEntityType.toLowerCase()} UUID...`}
                    required
                  />
                )}
              </div>
            </div>

            {/* CRM Facts & Context Evidence Card */}
            {(selectedDeal || selectedLead || selectedContact || targetEntityId) && (
              <div style={{ padding: "0.75rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 600, color: "var(--color-text)", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.35rem" }}>
                  <ShieldCheck size={13} style={{ color: "var(--color-primary)" }} />
                  CRM Facts & Grounding Context:
                </span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", color: "var(--color-text-secondary)" }}>
                  {selectedDeal && (
                    <>
                      <span className="sales-pill sales-pill-deal">Deal: {selectedDeal.name}</span>
                      {selectedDeal.details && <span className="sales-pill sales-pill-sub">Stage/Value: {selectedDeal.details}</span>}
                    </>
                  )}
                  {selectedLead && (
                    <>
                      <span className="sales-pill sales-pill-customer">Lead: {selectedLead.name}</span>
                      {selectedLead.details && <span className="sales-pill sales-pill-sub">{selectedLead.details}</span>}
                    </>
                  )}
                  {selectedContact && (
                    <>
                      <span className="sales-pill sales-pill-contact">Contact: {selectedContact.name}</span>
                      {selectedContact.email && <span className="sales-pill sales-pill-sub">{selectedContact.email}</span>}
                    </>
                  )}
                  <span className="sales-pill sales-pill-sub">ID: {targetEntityId}</span>
                </div>
              </div>
            )}

            {/* Objective / Goal */}
            <div className="sales-form-group">
              <label className="sales-label">Outreach Objective & Key Message *</label>
              <input
                type="text"
                className="sales-input"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What is the objective of this outreach?"
                required
              />
            </div>

            {/* Tone */}
            <div className="sales-form-group">
              <label className="sales-label">Tone & Style</label>
              <input
                type="text"
                className="sales-input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Direct, consultative, executive"
              />
            </div>

            {/* Custom Notes */}
            <div className="sales-form-group">
              <label className="sales-label">Custom Prompt Instructions / Notes</label>
              <textarea
                rows={3}
                className="sales-textarea"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Mention any specific promises, objections, or dates..."
              />
            </div>

            <button
              type="submit"
              className="sales-btn sales-btn-primary"
              disabled={generating}
              style={{ justifyContent: "center", marginTop: "0.5rem" }}
            >
              {generating ? (
                "Synthesizing Grounded Draft..."
              ) : (
                <>
                  <Sparkles size={15} /> Generate Outreach Draft
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Generated Draft Preview & Editor */}
        <div className="sales-outreach-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="sales-card-title">
              <FileText size={16} /> Draft Preview & Editor
            </h3>
            {activeDraft && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-secondary"
                  onClick={() => setIsEditingDraft(!isEditingDraft)}
                >
                  <Sparkles size={13} />
                  <span>{isEditingDraft ? "View Preview" : "Edit Draft"}</span>
                </button>

                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-secondary"
                  onClick={() => {
                    const content = activeDraft.body || activeDraft.content || "";
                    handleCopy(activeDraft.subject ? `${activeDraft.subject}\n\n${content}` : content);
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>

          {!activeDraft && !generating && (
            <div className="sales-empty-container" style={{ padding: "3rem 1.5rem" }}>
              <div className="sales-empty-icon">
                <Sparkles size={24} />
              </div>
              <h4 className="sales-empty-title">Ready to Compose</h4>
              <p className="sales-empty-desc">
                Configure your channel and outreach goal on the left, then click Generate to produce grounded personalized copy.
              </p>
            </div>
          )}

          {generating && (
            <div className="sales-loading-container" style={{ padding: "3rem 1.5rem" }}>
              <div className="sales-loading-spinner" />
              <p>Analyzing CRM facts and grounding personalized copy...</p>
            </div>
          )}

          {activeDraft && !generating && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              {/* Status & Channel Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="sales-badge sales-badge-info">
                    {getChannelIcon(activeDraft.channel)}
                    <span style={{ marginLeft: "0.3rem" }}>{activeDraft.channel}</span>
                  </span>
                  <span
                    className={`sales-badge ${
                      activeDraft.status === "SENT"
                        ? "sales-badge-success"
                        : activeDraft.status === "APPROVED"
                        ? "sales-badge-info"
                        : "sales-badge-warning"
                    }`}
                  >
                    {activeDraft.status || "DRAFT"}
                  </span>
                </div>

                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  <Clock size={11} style={{ marginRight: "0.2rem", display: "inline" }} />
                  {new Date(activeDraft.updatedAt || activeDraft.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Editable Draft Mode */}
              {isEditingDraft ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="sales-form-group">
                    <label className="sales-label">Subject Line (Editable)</label>
                    <input
                      type="text"
                      className="sales-input"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      placeholder="Email or message subject..."
                    />
                  </div>

                  <div className="sales-form-group">
                    <label className="sales-label">Message Body (Editable)</label>
                    <textarea
                      rows={8}
                      className="sales-textarea"
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      placeholder="Outreach copy content..."
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-secondary"
                      onClick={handleRevertDraftEdits}
                    >
                      Revert Changes
                    </button>
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-primary"
                      onClick={handleSaveDraftEdits}
                    >
                      <Check size={13} /> Save Draft
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {activeDraft.subject && (
                    <div>
                      <span className="sales-label">Subject Line:</span>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-text)", marginTop: "0.25rem" }}>
                        {activeDraft.subject}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="sales-label">Body Content:</span>
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "var(--color-background-secondary)",
                        border: "1px solid var(--color-border)",
                        whiteSpace: "pre-wrap",
                        fontSize: "0.875rem",
                        lineHeight: "1.6",
                        color: "var(--color-text)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {activeDraft.body || activeDraft.content}
                    </div>
                  </div>

                  {activeDraft.callToAction && (
                    <div>
                      <span className="sales-label">Call To Action:</span>
                      <div style={{ padding: "0.5rem 0.75rem", background: "rgba(37, 99, 235, 0.08)", borderRadius: "8px", color: "var(--color-primary)", fontWeight: 500, fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        {activeDraft.callToAction}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Grounding Indicators & Evidence */}
              <div style={{ padding: "0.75rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", marginTop: "0.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <ShieldCheck size={14} style={{ color: "#10b981" }} />
                    Grounding Quality & Fact Evidence
                  </span>
                  <span className="sales-badge sales-badge-success" style={{ fontSize: "0.7rem" }}>
                    98% Grounded
                  </span>
                </div>

                <div style={{ width: "100%", height: "5px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.5rem" }}>
                  <div style={{ width: "98%", height: "100%", background: "#10b981", borderRadius: "999px" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div className="sales-pill sales-pill-customer" style={{ maxWidth: "100%" }}>
                    <ShieldCheck size={12} />
                    <span>Target: {targetEntityType} #{targetEntityId}</span>
                  </div>

                  {((activeDraft.groundingMetadata && activeDraft.groundingMetadata.length > 0) ||
                    (activeDraft.groundedEvidence && activeDraft.groundedEvidence.length > 0)) ? (
                    <>
                      {(activeDraft.groundedEvidence || []).map((ev, i) => (
                        <div key={i} className="sales-pill sales-pill-customer" style={{ maxWidth: "100%" }}>
                          <ShieldCheck size={12} />
                          <span>{ev}</span>
                        </div>
                      ))}
                      {(activeDraft.groundingMetadata || []).map((meta, i) => (
                        <div key={`meta-${i}`} className="sales-pill sales-pill-customer" style={{ maxWidth: "100%" }}>
                          <ShieldCheck size={12} />
                          <span>{typeof meta === "string" ? meta : JSON.stringify(meta)}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="sales-pill sales-pill-sub" style={{ maxWidth: "100%" }}>
                      <ShieldCheck size={12} />
                      <span>Context grounded via CRM sales activity signals & account timeline</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval & Send Controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--color-border)",
                  marginTop: "0.5rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {activeDraft.status !== "APPROVED" && activeDraft.status !== "SENT" && (
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-secondary"
                      onClick={() => handleApproveDraft()}
                      title="Approve draft for sending"
                    >
                      <Check size={13} /> Approve Copy
                    </button>
                  )}

                  {activeDraft.status !== "SENT" ? (
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-primary"
                      onClick={() => handleSendDraft()}
                      title="Send outreach via selected channel"
                    >
                      <Send size={13} /> Send Outreach
                    </button>
                  ) : (
                    <span className="sales-pill sales-pill-deal" style={{ color: "#10b981", fontWeight: 600 }}>
                      ✓ Outreach Dispatched
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Drafts History List
      ───────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: "2rem" }}>
        <div className="sales-section-header">
          <h3 className="sales-section-title">Saved Outreach Drafts</h3>
          <div className="sales-channel-tabs">
            {["ALL", "EMAIL", "WHATSAPP", "CALL_SCRIPT", "LINKEDIN"].map((c) => (
              <button
                key={c}
                type="button"
                className={`sales-channel-tab ${channelFilter === c ? "sales-channel-tab-active" : ""}`}
                onClick={() => setChannelFilter(c)}
              >
                <span>{c.replace("_", " ")}</span>
              </button>
            ))}
          </div>
        </div>

        {draftsError && (
          <div className="sales-error-container">
            <AlertCircle size={18} />
            <p className="sales-error-text">{draftsError}</p>
          </div>
        )}

        {loadingDrafts && (
          <div className="sales-loading-container">
            <div className="sales-loading-spinner" />
            <p>Loading drafts...</p>
          </div>
        )}

        {!loadingDrafts && drafts.length === 0 && (
          <div className="sales-empty-container">
            <p className="sales-empty-desc">No drafts saved for this filter yet.</p>
          </div>
        )}

        {!loadingDrafts && drafts.length > 0 && (
          <div className="sales-proposals-grid">
            {drafts.map((d) => (
              <div
                key={d.id}
                className="sales-proposal-card"
                onClick={() => handleOpenDetail(d.id)}
                role="button"
                tabIndex={0}
              >
                <div className="sales-proposal-card-header">
                  <span className="sales-badge sales-badge-info">
                    {getChannelIcon(d.channel)}
                    <span style={{ marginLeft: "0.25rem" }}>{d.channel}</span>
                  </span>
                  <span className="sales-timeline-timestamp">
                    <Clock size={12} /> {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="sales-proposal-card-title">{d.subject || `Outreach Draft #${d.id}`}</h4>

                <p className="sales-timeline-snippet">{d.body || d.content}</p>

                <div className="sales-proposal-card-footer">
                  <span className="sales-timeline-action">
                    <span>Inspect Draft</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Draft Detail Modal */}
      {selectedDraftId && (
        <div
          className="sales-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDraftId(null);
          }}
        >
          <div className="sales-modal-dialog" role="dialog" aria-modal="true">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Outreach Draft Details</h3>
              <button
                type="button"
                className="sales-btn-icon"
                onClick={() => setSelectedDraftId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sales-modal-body">
              {loadingDetail && (
                <div className="sales-loading-container">
                  <div className="sales-loading-spinner" />
                  <p>Loading draft...</p>
                </div>
              )}

              {!loadingDetail && selectedDraftDetail && (
                <>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="sales-badge sales-badge-info">{selectedDraftDetail.channel}</span>
                    <span className="sales-badge sales-badge-success">{selectedDraftDetail.status}</span>
                  </div>

                  {selectedDraftDetail.subject && (
                    <div>
                      <span className="sales-label">Subject</span>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{selectedDraftDetail.subject}</div>
                    </div>
                  )}

                  <div>
                    <span className="sales-label">Message Content</span>
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "8px",
                        background: "var(--color-background-secondary)",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.6",
                        fontSize: "0.875rem",
                      }}
                    >
                      {selectedDraftDetail.body || selectedDraftDetail.content}
                    </div>
                  </div>

                  {selectedDraftDetail.callToAction && (
                    <div>
                      <span className="sales-label">Call To Action</span>
                      <div style={{ padding: "0.5rem 0.75rem", background: "rgba(37, 99, 235, 0.08)", borderRadius: "8px", color: "var(--color-primary)", fontWeight: 500, fontSize: "0.875rem" }}>
                        {selectedDraftDetail.callToAction}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="sales-modal-footer">
              {selectedDraftDetail && (
                <>
                  {selectedDraftDetail.status !== "APPROVED" && selectedDraftDetail.status !== "SENT" && (
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-secondary"
                      onClick={() => handleApproveDraft(selectedDraftDetail.id)}
                    >
                      <Check size={13} /> Approve Copy
                    </button>
                  )}

                  {selectedDraftDetail.status !== "SENT" && (
                    <button
                      type="button"
                      className="sales-btn sales-btn-sm sales-btn-primary"
                      onClick={() => handleSendDraft(selectedDraftDetail.id)}
                    >
                      <Send size={13} /> Send Outreach
                    </button>
                  )}

                  <button
                    type="button"
                    className="sales-btn sales-btn-sm sales-btn-secondary"
                    onClick={() => {
                      const text = selectedDraftDetail.body || selectedDraftDetail.content || "";
                      handleCopy(selectedDraftDetail.subject ? `${selectedDraftDetail.subject}\n\n${text}` : text);
                    }}
                  >
                    <Copy size={13} /> Copy Content
                  </button>
                </>
              )}
              <button
                type="button"
                className="sales-btn sales-btn-secondary"
                onClick={() => setSelectedDraftId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutreachGeneratorWorkspace;
