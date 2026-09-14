"use client";

import React, { useState } from "react";
import {
  Zap,
  Globe,
  MessageSquare,
  Phone,
  MessageCircle,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Code2,
  Layers,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Workflow,
  Sparkles,
  ExternalLink,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import {
  IngestionChannel,
  CHANNEL_SAMPLE_PAYLOADS,
  IngestLeadEnvelope,
  IngestLeadResponse,
  ingestLeadGeneral,
  ingestLeadByChannel,
} from "@/lib/api/leadIngestionApi";

// Channel icons mapping
const CHANNEL_CONFIG: Record<IngestionChannel, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  FORMS: { label: "Lead Forms", icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
  WEBSITE: { label: "Website Trackers", icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50" },
  CHAT: { label: "Chatbots", icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50" },
  CALLS: { label: "Voice / Calls", icon: Phone, color: "text-purple-600", bg: "bg-purple-50" },
  WHATSAPP: { label: "WhatsApp Cloud", icon: MessageCircle, color: "text-green-600", bg: "bg-green-50" },
  REFERRALS: { label: "Affiliate & Referrals", icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  IMPORTS: { label: "Batch CSV / Excel", icon: FileSpreadsheet, color: "text-rose-600", bg: "bg-rose-50" },
};

type ActiveTab = "SIMULATOR" | "DOCS" | "PIPELINE" | "LOGS";
type IngestMode = "GENERAL_ENVELOPE" | "DIRECT_PATH";

export function LeadIngestionWorkbench() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("SIMULATOR");
  const [selectedChannel, setSelectedChannel] = useState<IngestionChannel>("WHATSAPP");
  const [ingestMode, setIngestMode] = useState<IngestMode>("GENERAL_ENVELOPE");

  // Form envelope inputs
  const [source, setSource] = useState(CHANNEL_SAMPLE_PAYLOADS.WHATSAPP.source);
  const [sourceId, setSourceId] = useState("wamid.HBgL919876543210");
  const [eventId, setEventId] = useState(`evt_${Date.now().toString().slice(-6)}`);
  const [assignedToId, setAssignedToId] = useState("usr_agent_01");
  const [note, setNote] = useState("High priority lead ingested via workbench test");

  // JSON payload string
  const [jsonPayload, setJsonPayload] = useState(
    JSON.stringify(CHANNEL_SAMPLE_PAYLOADS.WHATSAPP.payload, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Execution state
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<IngestLeadResponse | null>(null);
  const [logs, setLogs] = useState<IngestLeadResponse[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<"curl" | "ts" | "python">("curl");

  // Handle Channel Switch
  const handleChannelSelect = (channel: IngestionChannel) => {
    setSelectedChannel(channel);
    const sample = CHANNEL_SAMPLE_PAYLOADS[channel];
    setSource(sample.source);
    setJsonPayload(JSON.stringify(sample.payload, null, 2));
    setJsonError(null);
  };

  // Handle Ingest Submit
  const handleIngest = async () => {
    setJsonError(null);
    let parsedPayload: Record<string, any>;
    try {
      parsedPayload = JSON.parse(jsonPayload);
    } catch (err: any) {
      setJsonError("Invalid JSON syntax in payload body.");
      return;
    }

    setLoading(true);
    try {
      let res: IngestLeadResponse;
      if (ingestMode === "GENERAL_ENVELOPE") {
        const envelope: IngestLeadEnvelope = {
          channel: selectedChannel,
          source,
          sourceId: sourceId || undefined,
          eventId: eventId || undefined,
          assignedToId: assignedToId || undefined,
          note: note || undefined,
          payload: parsedPayload,
        };
        res = await ingestLeadGeneral(envelope);
      } else {
        res = await ingestLeadByChannel(selectedChannel, parsedPayload, {
          sourceId: sourceId || undefined,
          eventId: eventId || undefined,
        });
      }

      setLastResponse(res);
      setLogs((prev) => [res, ...prev.slice(0, 19)]);
    } catch (err) {
      console.error("Ingestion error:", err);
    } finally {
      setLoading(false);
    }
  };

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCodeSnippet = () => {
    const endpoint =
      ingestMode === "GENERAL_ENVELOPE"
        ? "/leads/ingest"
        : `/leads/ingest/${selectedChannel.toLowerCase()}`;

    if (codeLanguage === "curl") {
      if (ingestMode === "GENERAL_ENVELOPE") {
        return `curl -X POST https://api.zyoris.com/leads/ingest \\
  -H "Authorization: Bearer <jwt_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "${selectedChannel}",
    "source": "${source}",
    "sourceId": "${sourceId}",
    "eventId": "${eventId}",
    "assignedToId": "${assignedToId}",
    "note": "${note}",
    "payload": ${jsonPayload}
  }'`;
      } else {
        return `curl -X POST "https://api.zyoris.com/leads/ingest/${selectedChannel.toLowerCase()}?sourceId=${sourceId}" \\
  -H "Authorization: Bearer <jwt_token>" \\
  -H "x-event-id: ${eventId}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload}'`;
      }
    } else if (codeLanguage === "ts") {
      return `import axios from "axios";

const response = await axios.post(
  "https://api.zyoris.com${endpoint}",
  ${
    ingestMode === "GENERAL_ENVELOPE"
      ? JSON.stringify(
          {
            channel: selectedChannel,
            source,
            sourceId,
            eventId,
            assignedToId,
            note,
            payload: JSON.parse(jsonPayload || "{}"),
          },
          null,
          2
        )
      : jsonPayload
  },
  {
    headers: {
      Authorization: "Bearer <jwt_token>",
      "Content-Type": "application/json",
    },
  }
);

console.log("Ingested Lead ID:", response.data.leadId);`;
    } else {
      return `import requests

url = "https://api.zyoris.com${endpoint}"
headers = {
    "Authorization": "Bearer <jwt_token>",
    "Content-Type": "application/json"
}

payload = ${jsonPayload}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
              <Zap size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                Lead Ingestion & Normalized Contract Workbench
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Ingest, normalize, and test leads across 7 channel adapters with real-time identity resolution & idempotency validation.
              </p>
            </div>
          </div>
        </div>

        {/* Action badges */}
        <div className="flex items-center gap-2">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <BookOpen size={14} className="text-blue-600" />
            Swagger /docs
            <ExternalLink size={12} className="text-gray-400" />
          </a>
          <a
            href="/docs.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Code2 size={14} className="text-emerald-600" />
            OpenAPI Spec
          </a>
        </div>
      </div>

      {/* Main Workbench Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { id: "SIMULATOR", label: "Live Ingestion Testbench", icon: Send },
          { id: "DOCS", label: "REST API Reference & Specs", icon: BookOpen },
          { id: "PIPELINE", label: "Internal Subsystems Pipeline", icon: Workflow },
          { id: "LOGS", label: "Ingestion Event Logs", icon: Layers, count: logs.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SIMULATOR & TEST BENCH */}
      {activeTab === "SIMULATOR" && (
        <div className="space-y-6">
          {/* Channel Selector Cards */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
              Select Ingestion Channel Adapter
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {(Object.keys(CHANNEL_CONFIG) as IngestionChannel[]).map((ch) => {
                const cfg = CHANNEL_CONFIG[ch];
                const Icon = cfg.icon;
                const isSelected = selectedChannel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => handleChannelSelect(ch)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${cfg.bg} mb-1.5`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-900">{ch}</span>
                    <span className="text-[10px] text-gray-400 truncate max-w-full">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration & Payload Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form & Payload Editor (7 Cols) */}
            <div className="lg:col-span-7 space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              {/* Endpoint Mode Toggle */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Code2 size={15} className="text-blue-600" />
                  Target API Endpoint Mode
                </span>
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setIngestMode("GENERAL_ENVELOPE")}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      ingestMode === "GENERAL_ENVELOPE"
                        ? "bg-white text-blue-600 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    POST /leads/ingest
                  </button>
                  <button
                    onClick={() => setIngestMode("DIRECT_PATH")}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      ingestMode === "DIRECT_PATH"
                        ? "bg-white text-blue-600 shadow-sm font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    POST /leads/ingest/:channel
                  </button>
                </div>
              </div>

              {/* Envelope Options */}
              {ingestMode === "GENERAL_ENVELOPE" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-200/80">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Source Descriptor</label>
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Source ID (Provider)</label>
                    <input
                      type="text"
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      placeholder="e.g. form_sub_9921"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Event ID (Idempotency)</label>
                    <input
                      type="text"
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      placeholder="e.g. evt_20260913_001"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Assigned Agent ID</label>
                    <input
                      type="text"
                      value={assignedToId}
                      onChange={(e) => setAssignedToId(e.target.value)}
                      placeholder="usr_agent_01"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Internal Note</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ingested lead note..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Raw JSON Payload Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Raw {selectedChannel} Payload JSON
                  </label>
                  <button
                    onClick={() => {
                      const sample = CHANNEL_SAMPLE_PAYLOADS[selectedChannel];
                      setJsonPayload(JSON.stringify(sample.payload, null, 2));
                      setJsonError(null);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Reset Sample
                  </button>
                </div>
                <textarea
                  value={jsonPayload}
                  onChange={(e) => {
                    setJsonPayload(e.target.value);
                    setJsonError(null);
                  }}
                  rows={12}
                  className="w-full font-mono text-xs p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed shadow-inner"
                />
                {jsonError && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={13} /> {jsonError}
                  </p>
                )}
              </div>

              {/* Submit Trigger Button */}
              <button
                onClick={handleIngest}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200"
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Ingesting & Normalizing...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Submit Ingestion Payload ({ingestMode === "GENERAL_ENVELOPE" ? "POST /leads/ingest" : `POST /leads/ingest/${selectedChannel.toLowerCase()}`})
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Execution Response & Identity Resolution Card (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {lastResponse ? (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={16} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {lastResponse.isNewLead ? "201 Created (New Lead)" : "200 OK (Lead Updated)"}
                        </p>
                        <p className="text-[10px] text-gray-500">ID: {lastResponse.leadId}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 uppercase">
                      {lastResponse.idempotencyResult}
                    </span>
                  </div>

                  {/* Identity Resolution Box */}
                  <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <UserCheck size={15} className="text-indigo-600" />
                        Customer Identity Resolution
                      </span>
                      {lastResponse.identityResolution.matched ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          MATCHED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                          NO MATCH
                        </span>
                      )}
                    </div>
                    {lastResponse.identityResolution.matched && (
                      <div className="text-xs space-y-1 text-indigo-900">
                        <p className="flex justify-between">
                          <span className="text-gray-500">Customer ID:</span>
                          <span className="font-mono font-bold">{lastResponse.identityResolution.customerId}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-500">Match Reason:</span>
                          <span className="font-bold text-emerald-700">{lastResponse.identityResolution.matchReason}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Normalized Lead Summary */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Normalized Lead Details</p>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/70 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-semibold text-gray-900">{lastResponse.lead.name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-semibold text-gray-900">{lastResponse.lead.email || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-semibold text-gray-900">{lastResponse.lead.phone || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Company:</span>
                        <span className="font-semibold text-gray-900">{lastResponse.lead.company || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Source:</span>
                        <span className="font-semibold text-blue-600">{lastResponse.source}</span>
                      </div>
                    </div>
                  </div>

                  {/* Full JSON Response */}
                  <div>
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">Full API Response JSON</p>
                    <pre className="font-mono text-[11px] p-3 bg-slate-950 text-slate-100 rounded-xl overflow-x-auto max-h-56 leading-relaxed">
                      {JSON.stringify(lastResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3 shadow-sm">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <Send size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Awaiting Ingestion Execution</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Click "Submit Ingestion Payload" to test normalization, customer core identity matching, and idempotency logic.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: API DOCS & SPECS */}
      {activeTab === "DOCS" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">REST API Specifications & Code Integration</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Official REST endpoints exposed under <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-600 font-mono">/leads</code> for third-party webhooks & frontend integrations.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
              {(["curl", "ts", "python"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCodeLanguage(lang)}
                  className={`px-3 py-1 text-xs font-bold rounded-md uppercase transition-all ${
                    codeLanguage === lang
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoints Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold uppercase">POST</span>
              <h3 className="text-sm font-bold text-gray-900 font-mono">/leads/ingest</h3>
              <p className="text-xs text-gray-600">
                General ingestion endpoint where channel envelope parameter is passed inside request body.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold uppercase">POST</span>
              <h3 className="text-sm font-bold text-gray-900 font-mono">/leads/ingest/:channel</h3>
              <p className="text-xs text-gray-600">
                Channel-direct endpoint. Pass channel name in URL path (<code className="font-mono">whatsapp</code>, <code className="font-mono">forms</code>, etc.) and raw payload in body.
              </p>
            </div>
          </div>

          {/* Code Snippet Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Generated Integration Snippet</span>
              <button
                onClick={() => copySnippet(getCodeSnippet())}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedCode ? "Copied!" : "Copy Code"}
              </button>
            </div>
            <pre className="font-mono text-xs p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
              {getCodeSnippet()}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: INTERNAL PIPELINE FLOW */}
      {activeTab === "PIPELINE" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">Lead Ingestion Subsystem Architecture</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Internal processing sequence executed when <code className="font-mono text-blue-600">LeadIngestionService.ingestLead</code> processes incoming payloads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {[
              {
                step: "01",
                title: "Idempotency Guard",
                desc: "Deduplicates webhook replays via (orgId, source, eventId) in database.",
                icon: ShieldCheck,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                step: "02",
                title: "Channel Adapter",
                desc: "Parses WhatsApp, Meta Lead Ads, Twilio, GA, or Intercom raw payload into normalized contract.",
                icon: Layers,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                step: "03",
                title: "Identity Resolution",
                desc: "Matches phone/email against Customer Core entities without premature lead conversion.",
                icon: UserCheck,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                step: "04",
                title: "Assignment & Outbox",
                desc: "Evaluates routing rules and emits activity signals to Lead Intelligence outbox.",
                icon: Workflow,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                step: "05",
                title: "Automations Trigger",
                desc: "Fires downstream triggers (Auto-responders, AI scoring, Slack notifications).",
                icon: Sparkles,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
            ].map((p, idx) => {
              const Icon = p.icon;
              return (
                <div key={p.step} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className={`p-2 rounded-lg ${p.bg}`}>
                      <Icon size={18} className={p.color} />
                    </span>
                    <span className="text-xs font-mono font-extrabold text-gray-400">STEP {p.step}</span>
                  </div>
                  <h3 className="text-xs font-bold text-gray-900">{p.title}</h3>
                  <p className="text-[11px] text-gray-500 leading-normal">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: EVENT LOGS */}
      {activeTab === "LOGS" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Recent Workbench Ingestion Log Activity</h2>
            <span className="text-xs text-gray-500 font-medium">{logs.length} Recent Ingestion Events</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No recent ingestion events logged in this session yet. Run a test payload in the Testbench tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Lead ID</th>
                    <th className="p-3">Identity Match</th>
                    <th className="p-3 text-right">Idempotency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3 text-gray-500 font-mono">
                        {new Date(log.receivedAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-900">{log.channel}</span>
                      </td>
                      <td className="p-3 text-gray-600">{log.source}</td>
                      <td className="p-3 font-mono text-blue-600 font-semibold">{log.leadId}</td>
                      <td className="p-3">
                        {log.identityResolution.matched ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Matched ({log.identityResolution.matchReason})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                            Unmatched
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {log.idempotencyResult}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
