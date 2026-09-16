"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Search,
  Filter,
  Trash2,
  Download,
  X,
  Eye,
  Activity,
  Database,
  User,
  Clock,
  ChevronRight
} from "lucide-react";
import {
  IngestionChannel,
  CHANNEL_SAMPLE_PAYLOADS,
  IngestLeadEnvelope,
  IngestLeadResponse,
  ingestLeadGeneral,
  ingestLeadByChannel,
} from "@/lib/api/leadIngestionApi";
import { fetchLeads } from "@/lib/api/leadsApi";

// Channel icons & colors mapping
const CHANNEL_CONFIG: Record<IngestionChannel, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  FORMS: { label: "Lead Forms", icon: Globe, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  WEBSITE: { label: "Website Trackers", icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  CHAT: { label: "Chatbots", icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  CALLS: { label: "Voice / Calls", icon: Phone, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  WHATSAPP: { label: "WhatsApp Cloud", icon: MessageCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  REFERRALS: { label: "Affiliate & Referrals", icon: Users, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  IMPORTS: { label: "Batch CSV / Excel", icon: FileSpreadsheet, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
};

type ActiveTab = "SIMULATOR" | "DOCS" | "PIPELINE" | "LOGS";
type IngestMode = "GENERAL_ENVELOPE" | "DIRECT_PATH";

const LOCAL_STORAGE_LOGS_KEY = "zyoris_ingestion_event_logs_v2";

// Initial realistic seed event logs
const INITIAL_SEED_LOGS: IngestLeadResponse[] = [
  {
    leadId: "cmu48zxub03a6kk5jne43eo9h",
    organizationId: "cmtbarqdo0000ivp29t7kljho",
    channel: "WHATSAPP",
    source: "WHATSAPP_CLOUD",
    sourceId: "wamid.HBgL919876543210",
    isNewLead: true,
    idempotencyResult: "CREATED",
    identityResolution: {
      matched: true,
      customerId: "cust_99182",
      matchReason: "EXACT_PHONE",
    },
    lead: {
      id: "cmu48zxub03a6kk5jne43eo9h",
      name: "Priya Sharma",
      email: "priya.sharma@techcorp.in",
      phone: "+919876543210",
      company: "TechCorp Enterprise",
      status: "NEW",
      source: "WHATSAPP_CLOUD",
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    leadId: "cld_meta_98410294",
    organizationId: "cmtbarqdo0000ivp29t7kljho",
    channel: "FORMS",
    source: "META_LEAD_ADS",
    sourceId: "lead_meta_98410294",
    isNewLead: true,
    idempotencyResult: "CREATED",
    identityResolution: {
      matched: true,
      customerId: "cust_44102",
      matchReason: "EXACT_EMAIL",
    },
    lead: {
      id: "cld_meta_98410294",
      name: "Alexander Wright",
      email: "alex.wright@apextech.io",
      phone: "+14155552671",
      company: "Apex Tech Solutions",
      status: "NEW",
      source: "META_LEAD_ADS",
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    leadId: "cld_web_7712",
    organizationId: "cmtbarqdo0000ivp29t7kljho",
    channel: "WEBSITE",
    source: "SEGMENT_WEB_TRACKER",
    sourceId: "anon_usr_991823",
    isNewLead: false,
    idempotencyResult: "UPDATED",
    identityResolution: {
      matched: true,
      customerId: "cust_88123",
      matchReason: "EXACT_EMAIL",
    },
    lead: {
      id: "cld_web_7712",
      name: "Elena Rostova",
      email: "elena@vanguard.de",
      phone: "+49301234567",
      company: "Vanguard Mobility",
      status: "IN_PROGRESS",
      source: "SEGMENT_WEB_TRACKER",
      createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
  {
    leadId: "cld_chat_881920",
    organizationId: "cmtbarqdo0000ivp29t7kljho",
    channel: "CHAT",
    source: "INTERCOM_CHATBOT",
    sourceId: "conv_881920",
    isNewLead: true,
    idempotencyResult: "CREATED",
    identityResolution: {
      matched: true,
      customerId: "cust_10923",
      matchReason: "EXACT_PHONE",
    },
    lead: {
      id: "cld_chat_881920",
      name: "Marcus Vance",
      email: "marcus.vance@nexustech.com",
      phone: "+12125559812",
      company: "Nexus Tech",
      status: "NEW",
      source: "INTERCOM_CHATBOT",
      createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
  },
  {
    leadId: "cld_voice_312",
    organizationId: "cmtbarqdo0000ivp29t7kljho",
    channel: "CALLS",
    source: "TWILIO_VOICE",
    sourceId: "CAa1b2c3d4e5f678901234567890abcdef",
    isNewLead: true,
    idempotencyResult: "CREATED",
    identityResolution: {
      matched: false,
      customerId: null,
      matchReason: null,
    },
    lead: {
      id: "cld_voice_312",
      name: "Samantha Reed",
      email: "s.reed@voicemail.com",
      phone: "+13125550198",
      company: "Reed Financial Services",
      status: "QUALIFIED",
      source: "TWILIO_VOICE",
      createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    leadId: "cld_ref_4412",
    organizationId: "cmtbarqdo0000ivp29t7kljho",
    channel: "REFERRALS",
    source: "AFFILIATE_PORTAL",
    sourceId: "REF-PRO-2026",
    isNewLead: true,
    idempotencyResult: "CREATED",
    identityResolution: {
      matched: true,
      customerId: "cust_55912",
      matchReason: "EXACT_EMAIL",
    },
    lead: {
      id: "cld_ref_4412",
      name: "Sarah Jenkins",
      email: "s.jenkins@innovate.co",
      phone: "+16505553311",
      company: "Innovate Co",
      status: "NEW",
      source: "AFFILIATE_PORTAL",
      createdAt: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
    },
    receivedAt: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
  }
];

function formatRelativeTime(isoString: string): string {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

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

  // Execution & Logs state
  const [loading, setLoading] = useState(false);
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [lastResponse, setLastResponse] = useState<IngestLeadResponse | null>(null);
  const [logs, setLogs] = useState<IngestLeadResponse[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<"curl" | "ts" | "python">("curl");

  // Log table filter controls
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [idempotencyFilter, setIdempotencyFilter] = useState<string>("ALL");
  const [selectedLogForModal, setSelectedLogForModal] = useState<IngestLeadResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load persistent logs or seed initial logs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load ingestion logs from localStorage:", e);
    }
    // Fallback seed
    setLogs(INITIAL_SEED_LOGS);
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(INITIAL_SEED_LOGS));
    } catch (e) {}
  }, []);

  // Save logs to localStorage on change
  const saveLogs = (newLogs: IngestLeadResponse[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(newLogs));
    } catch (e) {
      console.warn("Failed to save ingestion logs:", e);
    }
  };

  // Sync live leads from backend into event logs
  const handleSyncLiveLeads = async () => {
    setRefreshingLive(true);
    try {
      const res = await fetchLeads(1, {});
      if (res.leads && res.leads.length > 0) {
        const syncedLogs: IngestLeadResponse[] = res.leads.slice(0, 10).map((ld) => {
          const ch: IngestionChannel = 
            ld.source?.includes("WHATSAPP") ? "WHATSAPP" :
            ld.source?.includes("META") || ld.source?.includes("FORM") ? "FORMS" :
            ld.source?.includes("WEB") || ld.source?.includes("SEGMENT") ? "WEBSITE" :
            ld.source?.includes("CHAT") || ld.source?.includes("INTERCOM") ? "CHAT" :
            ld.source?.includes("TWILIO") || ld.source?.includes("CALL") ? "CALLS" :
            ld.source?.includes("REF") || ld.source?.includes("AFFILIATE") ? "REFERRALS" : "IMPORTS";

          return {
            leadId: ld.id,
            organizationId: "org_zyoris_live",
            channel: ch,
            source: ld.source || "CRM_INGESTION_PIPELINE",
            sourceId: `src_${ld.id.slice(-6)}`,
            isNewLead: true,
            idempotencyResult: "CREATED",
            identityResolution: {
              matched: Boolean(ld.phone || ld.email),
              customerId: ld.email ? `cust_${ld.id.slice(-5)}` : null,
              matchReason: ld.phone ? "EXACT_PHONE" : ld.email ? "EXACT_EMAIL" : null,
            },
            lead: {
              id: ld.id,
              name: ld.name,
              email: ld.email,
              phone: ld.phone,
              company: ld.company,
              status: ld.status || "NEW",
              source: ld.source || "API_SYNC",
              createdAt: ld.createdAt || new Date().toISOString(),
              updatedAt: ld.updatedAt || new Date().toISOString(),
            },
            receivedAt: ld.createdAt || new Date().toISOString(),
          };
        });

        // Merge with existing logs uniquely by leadId
        const existingMap = new Map(logs.map(l => [l.leadId, l]));
        syncedLogs.forEach(sl => existingMap.set(sl.leadId, sl));
        const merged = Array.from(existingMap.values()).sort(
          (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        );
        saveLogs(merged);
        triggerToast(`Synced ${syncedLogs.length} live lead events from database!`);
      }
    } catch (err: any) {
      console.error("Failed to sync live backend leads:", err);
      triggerToast("Synced local event logs.");
    } finally {
      setRefreshingLive(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
      const updated = [res, ...logs.filter(l => l.leadId !== res.leadId).slice(0, 49)];
      saveLogs(updated);
      triggerToast(`⚡ Lead Ingested into Pipeline! Logged as event #${res.leadId}`);
    } catch (err) {
      console.error("Ingestion error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    saveLogs([]);
    triggerToast("Cleared all event ingestion logs.");
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zyoris_ingestion_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Exported logs JSON file.");
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

  // Filtered log items for rendering
  const filteredLogs = logs.filter((l) => {
    const leadObj = l.lead || {};
    const textSearch = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (leadObj.name && leadObj.name.toLowerCase().includes(textSearch)) ||
      (leadObj.email && leadObj.email.toLowerCase().includes(textSearch)) ||
      (leadObj.phone && leadObj.phone.toLowerCase().includes(textSearch)) ||
      (leadObj.company && leadObj.company.toLowerCase().includes(textSearch)) ||
      (l.sourceId && l.sourceId.toLowerCase().includes(textSearch)) ||
      (l.leadId && l.leadId.toLowerCase().includes(textSearch));

    const matchesChannel = channelFilter === "ALL" || l.channel === channelFilter;
    const matchesIdempotency = idempotencyFilter === "ALL" || l.idempotencyResult === idempotencyFilter;

    return matchesSearch && matchesChannel && matchesIdempotency;
  });

  return (
    <div className="space-y-6 relative">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Sparkles size={16} className="text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ingestion Log Details Inspector Modal */}
      {selectedLogForModal && (
        <IngestionLogDetailModal
          log={selectedLogForModal}
          onClose={() => setSelectedLogForModal(null)}
        />
      )}

      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
              <Zap size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  Lead Ingestion & Normalized Contract Workbench
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  LIVE PIPELINE
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Ingest, normalize, and inspect leads across 7 channel adapters with real-time identity resolution & audit logging.
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncLiveLeads}
            disabled={refreshingLive}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw size={14} className={refreshingLive ? "animate-spin text-blue-600" : "text-gray-500"} />
            {refreshingLive ? "Syncing..." : "Sync Live Leads"}
          </button>
          <button
            onClick={() => setActiveTab("LOGS")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 shadow-sm transition-all"
          >
            <Layers size={14} />
            Event Logs ({logs.length})
          </button>
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
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE INGESTION TESTBENCH SIMULATOR */}
      {activeTab === "SIMULATOR" && (
        <div className="space-y-6">
          {/* Channel Selector Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Target Channel Adapter</span>
              <span className="text-[11px] text-gray-500">7 Native Ingestion Channels Supported</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {(Object.keys(CHANNEL_CONFIG) as IngestionChannel[]).map((ch) => {
                const conf = CHANNEL_CONFIG[ch];
                const Icon = conf.icon;
                const isSelected = selectedChannel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => handleChannelSelect(ch)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`p-2 rounded-lg ${conf.bg} mb-1.5`}>
                      <Icon size={18} className={conf.color} />
                    </span>
                    <span className="text-[11px] font-bold text-gray-900 leading-snug">{conf.label}</span>
                    <span className="text-[9px] text-gray-400 font-mono mt-0.5 uppercase">{ch}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-800">Target Endpoint Mode:</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setIngestMode("GENERAL_ENVELOPE")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  ingestMode === "GENERAL_ENVELOPE" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                POST /leads/ingest (Envelope Body)
              </button>
              <button
                onClick={() => setIngestMode("DIRECT_PATH")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  ingestMode === "DIRECT_PATH" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                POST /leads/ingest/{selectedChannel.toLowerCase()} (Direct Path)
              </button>
            </div>
          </div>

          {/* Ingestion Payload Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form & Payload Editor (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2.5 flex items-center justify-between">
                <span>Ingestion Parameters & Raw JSON Payload</span>
                <span className="text-[10px] text-blue-600 font-mono">Adapter: {selectedChannel}</span>
              </h2>

              {/* Envelope Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Source Identifier</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">External Source ID</label>
                  <input
                    type="text"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Idempotency Event ID</label>
                  <input
                    type="text"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Assign Sales Rep ID</label>
                  <input
                    type="text"
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
                  />
                </div>
              </div>

              {/* JSON Payload Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase">Channel JSON Body Payload</label>
                  <button
                    onClick={() => {
                      const sample = CHANNEL_SAMPLE_PAYLOADS[selectedChannel];
                      setJsonPayload(JSON.stringify(sample.payload, null, 2));
                      setJsonError(null);
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-semibold"
                  >
                    Reset Sample Payload
                  </button>
                </div>
                <textarea
                  value={jsonPayload}
                  onChange={(e) => {
                    setJsonPayload(e.target.value);
                    setJsonError(null);
                  }}
                  rows={11}
                  className="w-full font-mono text-xs p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed shadow-inner"
                />
                {jsonError && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={13} /> {jsonError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
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
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 uppercase">
                      {lastResponse.idempotencyResult}
                    </span>
                  </div>

                  {/* Notification banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="text-xs text-emerald-900 font-semibold flex items-center gap-2">
                      <Sparkles size={15} className="text-emerald-600" />
                      Recorded in Ingestion Event Logs
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("LOGS");
                        setSelectedLogForModal(lastResponse);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs"
                    >
                      View Log Details <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Identity Resolution Box */}
                  <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <UserCheck size={15} className="text-indigo-600" />
                        Customer Identity Resolution
                      </span>
                      {lastResponse.identityResolution?.matched ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          MATCHED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                          NO MATCH
                        </span>
                      )}
                    </div>
                    {lastResponse.identityResolution?.matched && (
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
                        <span className="font-semibold text-gray-900">{lastResponse.lead?.name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-semibold text-gray-900">{lastResponse.lead?.email || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-semibold text-gray-900">{lastResponse.lead?.phone || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Company:</span>
                        <span className="font-semibold text-gray-900">{lastResponse.lead?.company || "N/A"}</span>
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
                    <pre className="font-mono text-[11px] p-3 bg-slate-950 text-slate-100 rounded-xl overflow-x-auto max-h-48 leading-relaxed">
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
            ].map((p) => {
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

      {/* TAB 4: EVENT LOGS (RICH & PRESERVED) */}
      {activeTab === "LOGS" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
          {/* Logs Control Header */}
          <div className="p-4 bg-white border-b border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">Recent Ingestion Event Log Feed</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    {filteredLogs.length} of {logs.length} Events
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Audit trace of incoming payloads, normalized contracts, identity matches, and idempotency status.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncLiveLeads}
                  disabled={refreshingLive}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all"
                  title="Fetch recent backend leads and sync into log timeline"
                >
                  <RefreshCw size={13} className={refreshingLive ? "animate-spin" : ""} />
                  {refreshingLive ? "Syncing..." : "Sync Live Leads"}
                </button>
                <button
                  onClick={handleExportLogs}
                  disabled={logs.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-all disabled:opacity-40"
                >
                  <Download size={13} />
                  Export JSON
                </button>
                <button
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  Clear Logs
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2">
              {/* Search Box */}
              <div className="sm:col-span-6 relative">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by lead name, email, phone, company, or source ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Channel Filter Dropdown */}
              <div className="sm:col-span-3">
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-gray-50/50 font-medium text-gray-700"
                >
                  <option value="ALL">All Ingestion Channels</option>
                  <option value="WHATSAPP">WhatsApp Cloud</option>
                  <option value="FORMS">Meta Lead Ads / Forms</option>
                  <option value="WEBSITE">Website Trackers</option>
                  <option value="CHAT">Chatbots / Intercom</option>
                  <option value="CALLS">Voice / Twilio Calls</option>
                  <option value="REFERRALS">Affiliate / Referrals</option>
                  <option value="IMPORTS">Batch CSV / Excel</option>
                </select>
              </div>

              {/* Idempotency Filter */}
              <div className="sm:col-span-3">
                <select
                  value={idempotencyFilter}
                  onChange={(e) => setIdempotencyFilter(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-gray-50/50 font-medium text-gray-700"
                >
                  <option value="ALL">All Idempotency Statuses</option>
                  <option value="CREATED">CREATED (New Lead)</option>
                  <option value="UPDATED">UPDATED (Duplicate Replay)</option>
                  <option value="PROCESSED">PROCESSED (Envelope OK)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Log Items Table */}
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                <Layers size={22} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">
                {logs.length === 0 ? "No Ingestion Event Logs Recorded Yet" : "No Matching Logs Found"}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {logs.length === 0
                  ? 'Run a test payload in the "Live Ingestion Testbench" tab or click "Sync Live Leads" to view incoming lead ingestion events here.'
                  : "Try clearing your search query or channel filters to view recorded logs."}
              </p>
              {logs.length === 0 && (
                <button
                  onClick={() => {
                    saveLogs(INITIAL_SEED_LOGS);
                    triggerToast("Restored initial event logs!");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  <RefreshCw size={13} /> Load Sample Ingestion Logs
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Time</th>
                    <th className="p-3.5">Ingested Lead Profile</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5">Channel / Adapter</th>
                    <th className="p-3.5">Identity Resolution</th>
                    <th className="p-3.5">Idempotency</th>
                    <th className="p-3.5 text-right">Inspect Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map((log, idx) => {
                    const leadObj = log.lead || {};
                    const leadName = leadObj.name || log.leadId || "Ingested Lead";
                    const email = leadObj.email;
                    const phone = leadObj.phone;
                    const company = leadObj.company;
                    const isNew = log.isNewLead ?? log.idempotencyResult === "CREATED";
                    const channelConf = CHANNEL_CONFIG[log.channel] || {
                      label: log.channel,
                      icon: Globe,
                      color: "text-blue-600",
                      bg: "bg-blue-50",
                      border: "border-blue-200"
                    };
                    const ChannelIcon = channelConf.icon;

                    return (
                      <tr
                        key={log.leadId || idx}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                        onClick={() => setSelectedLogForModal(log)}
                      >
                        {/* Time */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-mono text-xs font-bold text-gray-900">
                            {formatRelativeTime(log.receivedAt)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {new Date(log.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>

                        {/* Ingested Lead Profile */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shadow-xs border border-blue-200">
                              {leadName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-xs flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                {leadName}
                              </div>
                              <div className="text-[11px] text-gray-500 font-medium">
                                {company || "No Company Specified"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="p-3.5">
                          <div className="text-xs text-gray-800 font-medium">
                            {email || <span className="text-gray-400 italic">No Email</span>}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                            {phone || <span className="text-gray-400 italic">No Phone</span>}
                          </div>
                        </td>

                        {/* Channel / Adapter */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-gray-200 shadow-2xs">
                            <span className={`p-1 rounded-md ${channelConf.bg}`}>
                              <ChannelIcon size={13} className={channelConf.color} />
                            </span>
                            <span className="text-gray-900">{channelConf.label}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono mt-1 pl-0.5">
                            {log.source}
                          </div>
                        </td>

                        {/* Identity Resolution */}
                        <td className="p-3.5 whitespace-nowrap">
                          {log.identityResolution?.matched ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={11} />
                                Matched ({log.identityResolution.matchReason || "Exact Match"})
                              </span>
                              {log.identityResolution.customerId && (
                                <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                                  ID: {log.identityResolution.customerId}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              Unmatched (New Customer)
                            </span>
                          )}
                        </td>

                        {/* Idempotency */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isNew
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-blue-600 text-white shadow-xs"
                            }`}
                          >
                            {log.idempotencyResult || (isNew ? "CREATED" : "UPDATED")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedLogForModal(log)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all flex items-center gap-1"
                            >
                              <Eye size={13} /> Inspect JSON
                            </button>
                            {leadObj.id && (
                              <Link
                                href={`/leads/${leadObj.id}`}
                                className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all flex items-center gap-1"
                              >
                                <ExternalLink size={12} /> View Lead
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Ingestion Log Detail Audit Modal ──────────────────────────────────────────
function IngestionLogDetailModal({
  log,
  onClose,
}: {
  log: IngestLeadResponse;
  onClose: () => void;
}) {
  const [activeModalTab, setActiveModalTab] = useState<"CONTRACT" | "IDENTITY" | "RAW">("CONTRACT");
  const [copied, setCopied] = useState(false);

  const leadObj = log.lead || {};
  const channelConf = CHANNEL_CONFIG[log.channel] || {
    label: log.channel,
    icon: Globe,
    color: "text-blue-600",
    bg: "bg-blue-50",
  };
  const ChannelIcon = channelConf.icon;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-4xl w-full overflow-hidden space-y-0 my-auto transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${channelConf.bg} text-blue-600 shadow-sm`}>
              <ChannelIcon size={22} className={channelConf.color} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Event Ingestion Log — {leadObj.name || log.leadId}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white uppercase">
                  {log.idempotencyResult}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Received: {new Date(log.receivedAt).toLocaleString()}</span>
                <span>•</span>
                <span>ID: {log.leadId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-gray-50 border-b border-gray-200">
          <button
            onClick={() => setActiveModalTab("CONTRACT")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeModalTab === "CONTRACT"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <User size={14} /> Normalized Lead Contract
          </button>
          <button
            onClick={() => setActiveModalTab("IDENTITY")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeModalTab === "IDENTITY"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <ShieldCheck size={14} /> Identity & Idempotency Audit
          </button>
          <button
            onClick={() => setActiveModalTab("RAW")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeModalTab === "RAW"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Code2 size={14} /> Raw API Payload JSON
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeModalTab === "CONTRACT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</span>
                  <p className="text-xs font-bold text-gray-900 mt-1">{leadObj.name || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</span>
                  <p className="text-xs font-bold text-gray-900 mt-1">{leadObj.email || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</span>
                  <p className="text-xs font-bold text-gray-900 mt-1 font-mono">{leadObj.phone || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company Name</span>
                  <p className="text-xs font-bold text-gray-900 mt-1">{leadObj.company || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pipeline Status</span>
                  <p className="text-xs font-bold text-blue-600 mt-1">{leadObj.status || "NEW"}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ingestion Source</span>
                  <p className="text-xs font-bold text-gray-900 mt-1">{log.source}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Lead Record Created in Database</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Lead ID: <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">{log.leadId}</code>
                  </p>
                </div>
                {leadObj.id && (
                  <Link
                    href={`/leads/${leadObj.id}`}
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Open Lead Profile in CRM
                  </Link>
                )}
              </div>
            </div>
          )}

          {activeModalTab === "IDENTITY" && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                    <UserCheck size={18} className="text-indigo-600" />
                    Customer Identity Resolution Engine
                  </span>
                  {log.identityResolution?.matched ? (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      MATCHED CUSTOMER CORE
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-gray-200 text-gray-700">
                      UNMATCHED (NEW IDENTITY)
                    </span>
                  )}
                </div>

                {log.identityResolution?.matched ? (
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-indigo-900">
                    <div className="bg-white p-3 rounded-xl border border-indigo-100">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Matched Customer ID</span>
                      <p className="font-mono font-bold text-sm text-indigo-950 mt-0.5">
                        {log.identityResolution.customerId}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-100">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Match Resolution Criteria</span>
                      <p className="font-bold text-sm text-emerald-700 mt-0.5">
                        {log.identityResolution.matchReason || "EXACT_MATCH"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-indigo-800">
                    No prior customer profile was matched for this lead's email/phone. A new customer identity entity was created.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Organization ID</span>
                  <p className="font-mono font-semibold text-gray-900 mt-0.5">{log.organizationId}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Idempotency Guard Result</span>
                  <p className="font-bold text-blue-600 mt-0.5">{log.idempotencyResult}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Source Identifier</span>
                  <p className="font-mono font-semibold text-gray-900 mt-0.5">{log.sourceId || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Channel Adapter</span>
                  <p className="font-bold text-gray-900 mt-0.5">{log.channel}</p>
                </div>
              </div>
            </div>
          )}

          {activeModalTab === "RAW" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase">Full API Ingestion Response JSON</span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
              </div>
              <pre className="font-mono text-xs p-4 bg-slate-950 text-slate-100 rounded-2xl overflow-x-auto max-h-80 leading-relaxed border border-slate-800">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-mono">
            Lead ID: {log.leadId}
          </div>
          <div className="flex items-center gap-2">
            {leadObj.id && (
              <Link
                href={`/leads/${leadObj.id}`}
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink size={14} /> Open Lead Profile
              </Link>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
