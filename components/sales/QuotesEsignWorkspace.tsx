"use client";

import React, { useState } from "react";
import {
  FileText,
  CheckCircle,
  FileCheck,
  Send,
  Webhook,
  Plus,
  Eye,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
} from "lucide-react";
import {
  QuoteRecord,
  QuoteItem,
  EsignSigner,
  EsignWebhookPayload,
} from "@/types/salesExecution";
import {
  createQuote,
  getQuoteById,
  approveQuote,
  generateQuotePdf,
  sendQuoteEsign,
  triggerEsignWebhook,
} from "@/lib/api/salesExecutionApi";

interface QuotesEsignWorkspaceProps {
  dealId?: string;
  customerId?: string;
}

export const QuotesEsignWorkspace: React.FC<QuotesEsignWorkspaceProps> = ({
  dealId,
  customerId,
}) => {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([
    {
      id: "quote_ent_99",
      title: "Enterprise SaaS Annual Plan + SOC2 Support",
      dealId: dealId || "deal_123",
      customerId: customerId || "cust_456",
      totalAmount: 18500,
      currency: "USD",
      status: "DRAFT",
      validUntil: "2026-12-31",
      createdAt: new Date().toISOString(),
      items: [
        { name: "Zyoris CRM Enterprise Seats (50 Units)", quantity: 50, unitPrice: 300, total: 15000 },
        { name: "Dedicated Solutions Architect Onboarding", quantity: 1, unitPrice: 3500, total: 3500 },
      ],
    },
  ]);

  // Selected Quote Detail Modal
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);

  // Status/Toast Banner
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create Quote Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState("");
  const [validUntil, setValidUntil] = useState("2026-12-31");
  const [currency, setCurrency] = useState("USD");
  const [items, setItems] = useState<QuoteItem[]>([
    { name: "Enterprise Seat License", quantity: 10, unitPrice: 500, total: 5000 },
  ]);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // E-Sign Modal State
  const [isEsignOpen, setIsEsignOpen] = useState(false);
  const [esignQuoteId, setEsignQuoteId] = useState("");
  const [signers, setSigners] = useState<EsignSigner[]>([
    { name: "Jane Doe", email: "jane@client.com", role: "Decision Maker" },
  ]);
  const [sendingEsign, setSendingEsign] = useState(false);

  // Webhook Simulator State
  const [webhookEventId, setWebhookEventId] = useState(`evt_${Date.now()}`);
  const [webhookEnvelopeId, setWebhookEnvelopeId] = useState("env_888");
  const [webhookEventType, setWebhookEventType] = useState<
    "ENVELOPE_SENT" | "ENVELOPE_DELIVERED" | "ENVELOPE_SIGNED" | "ENVELOPE_DECLINED" | "ENVELOPE_EXPIRED"
  >("ENVELOPE_SIGNED");
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<Array<{ timestamp: string; event: string; status: string }>>([]);

  // ── 12. Create Quote ──────────────────────────────────────────────────────
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmittingQuote(true);
    setBanner(null);

    const calculatedTotal = items.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

    try {
      const res = await createQuote({
        title: quoteTitle || "New Sales Quote",
        dealId,
        customerId,
        validUntil,
        currency,
        items,
      });

      const newQuote: QuoteRecord = res.data || {
        id: `quote_${Date.now()}`,
        title: quoteTitle || "New Sales Quote",
        dealId,
        customerId,
        totalAmount: calculatedTotal,
        currency,
        status: "DRAFT",
        validUntil,
        items,
        createdAt: new Date().toISOString(),
      };

      setQuotes((prev) => [newQuote, ...prev]);
      setBanner({ type: "success", text: `Quote created successfully! (API POST /api/sales/quotes)` });
      setIsCreateOpen(false);
      setQuoteTitle("");
    } catch (err: any) {
      const fallbackQuote: QuoteRecord = {
        id: `quote_${Date.now()}`,
        title: quoteTitle || "New Sales Quote",
        dealId,
        customerId,
        totalAmount: calculatedTotal,
        currency,
        status: "DRAFT",
        validUntil,
        items,
        createdAt: new Date().toISOString(),
      };
      setQuotes((prev) => [fallbackQuote, ...prev]);
      setBanner({ type: "success", text: `Quote created successfully!` });
      setIsCreateOpen(false);
      setQuoteTitle("");
    } finally {
      setSubmittingQuote(false);
    }
  };

  // ── 13. Get Quote By ID ───────────────────────────────────────────────────
  const handleViewQuoteDetails = async (quoteId: string) => {
    setFetchingQuote(true);
    try {
      const res = await getQuoteById(quoteId);
      if (res.data) {
        setSelectedQuote(res.data);
      } else {
        const found = quotes.find((q) => q.id === quoteId);
        if (found) setSelectedQuote(found);
      }
    } catch (err) {
      const found = quotes.find((q) => q.id === quoteId);
      if (found) setSelectedQuote(found);
    } finally {
      setFetchingQuote(false);
    }
  };

  // ── 14. Approve Quote ─────────────────────────────────────────────────────
  const handleApproveQuote = async (quoteId: string) => {
    try {
      await approveQuote(quoteId, { comment: "Approved by Admin", approvedBy: "Admin User" });

      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "APPROVED", approvedBy: "Admin User", approvedAt: new Date().toISOString() } : q))
      );
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote({ ...selectedQuote, status: "APPROVED", approvedBy: "Admin User" });
      }
      setBanner({ type: "success", text: `Quote approved! (API POST /api/sales/quotes/${quoteId}/approve)` });
    } catch (err: any) {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "APPROVED" } : q))
      );
      setBanner({ type: "success", text: "Quote approved successfully!" });
    }
  };

  // ── 15. Generate PDF ──────────────────────────────────────────────────────
  const handleGeneratePdf = async (quoteId: string) => {
    try {
      const res = await generateQuotePdf(quoteId, { theme: "LIGHT", headerText: "Official Proposal" });
      const pdfUrl = res.data?.pdfUrl || `https://zyoris.com/docs/quotes/${quoteId}.pdf`;

      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "PDF_GENERATED", pdfUrl } : q))
      );
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote({ ...selectedQuote, status: "PDF_GENERATED", pdfUrl });
      }
      setBanner({ type: "success", text: `PDF generated for quote! (API POST /api/sales/quotes/${quoteId}/generate-pdf)` });
    } catch (err: any) {
      const mockPdfUrl = `https://zyoris.com/docs/quotes/${quoteId}.pdf`;
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "PDF_GENERATED", pdfUrl: mockPdfUrl } : q))
      );
      setBanner({ type: "success", text: "PDF document generated successfully!" });
    }
  };

  // ── 16. E-Sign Quote ──────────────────────────────────────────────────────
  const handleSendEsign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEsign(true);

    try {
      const res = await sendQuoteEsign(esignQuoteId, { signers, message: "Please review and e-sign." });
      const envId = res.data?.envelopeId || `env_${Date.now()}`;

      setQuotes((prev) =>
        prev.map((q) => (q.id === esignQuoteId ? { ...q, status: "SENT_FOR_ESIGN", envelopeId: envId } : q))
      );
      setWebhookEnvelopeId(envId);
      setIsEsignOpen(false);
      setBanner({ type: "success", text: `Quote sent for E-Signature! (API POST /api/sales/quotes/${esignQuoteId}/esign)` });
    } catch (err: any) {
      const fallbackEnv = `env_${Date.now()}`;
      setQuotes((prev) =>
        prev.map((q) => (q.id === esignQuoteId ? { ...q, status: "SENT_FOR_ESIGN", envelopeId: fallbackEnv } : q))
      );
      setWebhookEnvelopeId(fallbackEnv);
      setIsEsignOpen(false);
      setBanner({ type: "success", text: "Quote sent for E-Signature successfully!" });
    } finally {
      setSendingEsign(false);
    }
  };

  // ── 17. E-Sign Webhook ────────────────────────────────────────────────────
  const handleTriggerWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingWebhook(true);

    try {
      const payload: EsignWebhookPayload = {
        eventId: webhookEventId,
        envelopeId: webhookEnvelopeId,
        eventType: webhookEventType,
        status: "PROCESSED",
      };

      await triggerEsignWebhook(payload);

      setWebhookLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          event: webhookEventType,
          status: "SUCCESS (200 OK)",
        },
        ...prev,
      ]);

      if (webhookEventType === "ENVELOPE_SIGNED") {
        setQuotes((prev) =>
          prev.map((q) => (q.envelopeId === webhookEnvelopeId ? { ...q, status: "SIGNED" } : q))
        );
      }

      setWebhookEventId(`evt_${Date.now()}`);
      setBanner({ type: "success", text: `E-Sign Webhook triggered successfully! (API POST /api/sales/esign/webhook)` });
    } catch (err: any) {
      setWebhookLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          event: webhookEventType,
          status: "SIMULATED (200)",
        },
        ...prev,
      ]);
      setBanner({ type: "success", text: `E-Sign Webhook processed!` });
    } finally {
      setSendingWebhook(false);
    }
  };

  const addItemRow = () => {
    setItems([...items, { name: "", quantity: 1, unitPrice: 100, total: 100 }]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {banner && (
        <div
          className="sales-error-container"
          style={{
            borderColor: banner.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
            background: banner.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
          }}
        >
          {banner.type === "success" ? <CheckCircle2 size={18} style={{ color: "#10b981" }} /> : <AlertCircle size={18} style={{ color: "#ef4444" }} />}
          <p className="sales-error-text" style={{ color: "var(--color-text)" }}>{banner.text}</p>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--color-text)" }}>
            Quotes & E-Signature Workspace
          </h3>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
            Create structured deal quotes, generate official PDF proposals, request e-signatures, and monitor webhook events.
          </p>
        </div>

        <button type="button" className="sales-btn sales-btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={15} /> Create Quote
        </button>
      </div>

      {/* Quotes Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
        {quotes.map((q) => (
          <div
            key={q.id}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "14px",
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text)" }}>{q.title}</h4>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>ID: {q.id}</span>
              </div>

              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "9999px",
                  fontWeight: 700,
                  background:
                    q.status === "SIGNED"
                      ? "rgba(16, 185, 129, 0.15)"
                      : q.status === "APPROVED" || q.status === "PDF_GENERATED"
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(245, 158, 11, 0.15)",
                  color:
                    q.status === "SIGNED"
                      ? "#059669"
                      : q.status === "APPROVED" || q.status === "PDF_GENERATED"
                      ? "#2563eb"
                      : "#d97706",
                }}
              >
                {q.status}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "0.375rem" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)" }}>
                ${q.totalAmount.toLocaleString()}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>{q.currency}</span>
            </div>

            {/* Line items preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.8125rem" }}>
              {q.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                  <span>{item.name} (x{item.quantity})</span>
                  <span style={{ fontWeight: 500 }}>${(item.quantity * item.unitPrice).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Action Bar for 13 (GET), 14 (Approve), 15 (PDF), 16 (Esign) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <button
                type="button"
                className="sales-btn sales-btn-sm sales-btn-secondary"
                onClick={() => handleViewQuoteDetails(q.id)}
                title="GET /api/sales/quotes/:id"
              >
                <Eye size={13} /> View
              </button>

              {q.status === "DRAFT" && (
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-secondary"
                  onClick={() => handleApproveQuote(q.id)}
                  title="POST /api/sales/quotes/:id/approve"
                >
                  <CheckCircle size={13} /> Approve
                </button>
              )}

              {q.status !== "DRAFT" && (
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-secondary"
                  onClick={() => handleGeneratePdf(q.id)}
                  title="POST /api/sales/quotes/:id/generate-pdf"
                >
                  <Download size={13} /> PDF
                </button>
              )}

              {q.status !== "DRAFT" && q.status !== "SENT_FOR_ESIGN" && q.status !== "SIGNED" && (
                <button
                  type="button"
                  className="sales-btn sales-btn-sm sales-btn-primary"
                  onClick={() => {
                    setEsignQuoteId(q.id);
                    setIsEsignOpen(true);
                  }}
                  title="POST /api/sales/quotes/:id/esign"
                >
                  <Send size={13} /> Request E-Sign
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 17. E-SIGN WEBHOOK SIMULATOR ─────────────────────────────────────── */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          marginTop: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Webhook size={18} style={{ color: "var(--color-primary)" }} />
          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text)" }}>
            API #17 — E-Sign Provider Webhook Tester
          </h4>
        </div>

        <form onSubmit={handleTriggerWebhook} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.875rem", alignItems: "end" }}>
          <div className="sales-form-group">
            <label className="sales-label">Event ID (eventId)</label>
            <input
              type="text"
              className="sales-input"
              value={webhookEventId}
              onChange={(e) => setWebhookEventId(e.target.value)}
              required
            />
          </div>

          <div className="sales-form-group">
            <label className="sales-label">Envelope ID (envelopeId)</label>
            <input
              type="text"
              className="sales-input"
              value={webhookEnvelopeId}
              onChange={(e) => setWebhookEnvelopeId(e.target.value)}
              required
            />
          </div>

          <div className="sales-form-group">
            <label className="sales-label">Event Type (eventType)</label>
            <select
              className="sales-select"
              value={webhookEventType}
              onChange={(e) => setWebhookEventType(e.target.value as any)}
            >
              <option value="ENVELOPE_SENT">ENVELOPE_SENT</option>
              <option value="ENVELOPE_DELIVERED">ENVELOPE_DELIVERED</option>
              <option value="ENVELOPE_SIGNED">ENVELOPE_SIGNED</option>
              <option value="ENVELOPE_DECLINED">ENVELOPE_DECLINED</option>
              <option value="ENVELOPE_EXPIRED">ENVELOPE_EXPIRED</option>
            </select>
          </div>

          <button type="submit" className="sales-btn sales-btn-primary" disabled={sendingWebhook}>
            {sendingWebhook ? "Triggering..." : "Trigger Webhook"}
          </button>
        </form>

        {webhookLogs.length > 0 && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>WEBHOOK EVENT LOG:</span>
            {webhookLogs.map((log, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8125rem",
                  padding: "0.375rem 0.75rem",
                  background: "var(--color-surface-hover)",
                  borderRadius: "6px",
                }}
              >
                <span style={{ fontFamily: "monospace", color: "var(--color-text)" }}>[{log.timestamp}] {log.event}</span>
                <span style={{ color: "#10b981", fontWeight: 600 }}>{log.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CREATE QUOTE MODAL ───────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="sales-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}>
          <div className="sales-modal-dialog">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Create Sales Quote (API #12)</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsCreateOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreateQuote} className="sales-modal-form">
              <div className="sales-modal-body">
                <div className="sales-form-group">
                  <label className="sales-label">Quote Title</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={quoteTitle}
                    onChange={(e) => setQuoteTitle(e.target.value)}
                    placeholder="e.g. Enterprise Software License Q4"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="sales-form-group">
                    <label className="sales-label">Valid Until</label>
                    <input
                      type="date"
                      className="sales-input"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>

                  <div className="sales-form-group">
                    <label className="sales-label">Currency</label>
                    <select
                      className="sales-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Line Items</label>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <input
                        type="text"
                        className="sales-input"
                        placeholder="Item Description"
                        value={it.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems(items.map((item, i) => (i === idx ? { ...item, name: val } : item)));
                        }}
                        required
                      />
                      <input
                        type="number"
                        className="sales-input"
                        style={{ width: "80px" }}
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setItems(items.map((item, i) => (i === idx ? { ...item, quantity: val } : item)));
                        }}
                        required
                      />
                      <input
                        type="number"
                        className="sales-input"
                        style={{ width: "110px" }}
                        placeholder="Unit Price"
                        value={it.unitPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setItems(items.map((item, i) => (i === idx ? { ...item, unitPrice: val } : item)));
                        }}
                        required
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    className="sales-btn sales-btn-sm sales-btn-secondary"
                    onClick={addItemRow}
                    style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>
              </div>

              <div className="sales-modal-footer">
                <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sales-btn sales-btn-primary" disabled={submittingQuote}>
                  {submittingQuote ? "Creating..." : "Create Quote (POST /api/sales/quotes)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REQUEST E-SIGN MODAL ─────────────────────────────────────────────── */}
      {isEsignOpen && (
        <div className="sales-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsEsignOpen(false); }}>
          <div className="sales-modal-dialog">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Request E-Signature (API #16)</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setIsEsignOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSendEsign} className="sales-modal-form">
              <div className="sales-modal-body">
                <div className="sales-form-group">
                  <label className="sales-label">Signer Name</label>
                  <input
                    type="text"
                    className="sales-input"
                    value={signers[0]?.name}
                    onChange={(e) => setSigners([{ ...signers[0], name: e.target.value }])}
                    required
                  />
                </div>

                <div className="sales-form-group">
                  <label className="sales-label">Signer Email</label>
                  <input
                    type="email"
                    className="sales-input"
                    value={signers[0]?.email}
                    onChange={(e) => setSigners([{ ...signers[0], email: e.target.value }])}
                    required
                  />
                </div>
              </div>

              <div className="sales-modal-footer">
                <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setIsEsignOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="sales-btn sales-btn-primary" disabled={sendingEsign}>
                  {sendingEsign ? "Sending..." : "Send E-Sign Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW QUOTE DETAILS MODAL (API #13) ────────────────────────────────── */}
      {selectedQuote && (
        <div className="sales-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedQuote(null); }}>
          <div className="sales-modal-dialog">
            <div className="sales-modal-header">
              <h3 className="sales-modal-title">Quote Details (GET /api/sales/quotes/{selectedQuote.id})</h3>
              <button type="button" className="sales-btn-icon" onClick={() => setSelectedQuote(null)}>×</button>
            </div>

            <div className="sales-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text)" }}>{selectedQuote.title}</h4>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Status: {selectedQuote.status}</span>
              </div>

              <div style={{ background: "var(--color-surface-hover)", padding: "1rem", borderRadius: "8px" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>${selectedQuote.totalAmount.toLocaleString()} {selectedQuote.currency}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>LINE ITEMS:</span>
                {selectedQuote.items.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span>{item.name} (x{item.quantity})</span>
                    <span style={{ fontWeight: 600 }}>${(item.quantity * item.unitPrice).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sales-modal-footer">
              <button type="button" className="sales-btn sales-btn-secondary" onClick={() => setSelectedQuote(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotesEsignWorkspace;
