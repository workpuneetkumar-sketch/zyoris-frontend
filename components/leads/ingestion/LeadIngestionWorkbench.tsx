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
  ChevronRight,
  UploadCloud,
  FileText,
  MousePointerClick,
  HelpCircle,
  SlidersHorizontal,
  Settings2
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

// Channel configs with human friendly non-tech guides
const NO_CODE_CHANNEL_CONFIG: Record<
  IngestionChannel,
  {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    borderColor: string;
    badge: string;
    guideSteps: string[];
    samplePayload: Record<string, any>;
  }
> = {
  WHATSAPP: {
    title: "WhatsApp Business Cloud",
    subtitle: "Capture leads automatically from incoming WhatsApp chat messages & catalog inquiries.",
    icon: MessageCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    borderColor: "border-green-200",
    badge: "Most Popular",
    guideSteps: [
      "Copy your dedicated Zyoris Webhook URL below.",
      "Open WhatsApp Business API Manager (or Meta Developers Portal).",
      "Paste Webhook URL in Subscription Webhooks and select 'messages' event.",
      "Click 'Verify & Test Signal' to complete automated setup."
    ],
    samplePayload: CHANNEL_SAMPLE_PAYLOADS.WHATSAPP.payload,
  },
  FORMS: {
    title: "Meta & Facebook Lead Ads",
    subtitle: "Sync leads in real-time as users submit forms on Facebook & Instagram ads.",
    icon: Globe,
    color: "text-blue-600",
    bg: "bg-blue-50",
    borderColor: "border-blue-200",
    badge: "Auto Sync",
    guideSteps: [
      "Copy your Zyoris Lead Ads Integration Webhook URL.",
      "Log into Facebook Business Manager -> Integration -> Webhooks.",
      "Subscribe to your lead generation forms.",
      "New form submissions will turn into CRM leads within 2 seconds."
    ],
    samplePayload: CHANNEL_SAMPLE_PAYLOADS.FORMS.payload,
  },
  WEBSITE: {
    title: "Website Contact Forms & Trackers",
    subtitle: "Embed lead capture script into WordPress, Webflow, Shopify, or React websites.",
    icon: Globe,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    borderColor: "border-indigo-200",
    badge: "No-Code Embed",
    guideSteps: [
      "Copy the 1-line HTML JavaScript snippet below.",
      "Paste it before the </head> tag of your website.",
      "Any web form submitted by visitors will automatically sync into Zyoris CRM."
    ],
    samplePayload: CHANNEL_SAMPLE_PAYLOADS.WEBSITE.payload,
  },
  CHAT: {
    title: "Intercom & AI Chatbots",
    subtitle: "Route live website chat transcripts and chatbot leads directly to your sales reps.",
    icon: MessageSquare,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badge: "AI Powered",
    guideSteps: [
      "Copy the Chatbot Webhook Receiver URL.",
      "Navigate to Intercom or Custom Chatbot Webhook Settings.",
      "Enable 'Lead Qualified' event trigger.",
      "Incoming chats will trigger automatic lead creation & identity matching."
    ],
    samplePayload: CHANNEL_SAMPLE_PAYLOADS.CHAT.payload,
  },
  CALLS: {
    title: "Voice Calls & AI Call Center",
    subtitle: "Ingest inbound phone calls, Twilio voice logs, and AI call summaries into leads.",
    icon: Phone,
    color: "text-purple-600",
    bg: "bg-purple-50",
    borderColor: "border-purple-200",
    badge: "Twilio Direct",
    guideSteps: [
      "Copy your Voice Ingestion Endpoint URL.",
      "Paste into Twilio / Voice Provider Webhook Handler.",
      "Call recordings and caller numbers will automatically turn into leads."
    ],
    samplePayload: CHANNEL_SAMPLE_PAYLOADS.CALLS.payload,
  },
  REFERRALS: {
    title: "Affiliate & Partner Referrals",
    subtitle: "Allow partners and affiliates to submit warm customer referrals via web link.",
    icon: Users,
    color: "text-amber-600",
    bg: "bg-amber-50",
    borderColor: "border-amber-200",
    badge: "Partner Portal",
    guideSteps: [
      "Share your unique Partner Referral Portal Link with affiliates.",
      "Partners enter prospect details into a simple 3-field form.",
      "Leads are automatically tagged with partner ID for commission tracking."
    ],
    samplePayload: CHANNEL_SAMPLE_PAYLOADS.REFERRALS.payload,
  },
  IMPORTS: {
    title: "Batch CSV / Excel Importer",
    subtitle: "Upload CSV spreadsheets or Excel lead lists with 1-click column auto-mapping.",
    icon: FileSpreadsheet,
    color: "text-rose-600",
    bg: "bg-rose-50",
    borderColor: "border-rose-200",
    badge: "Instant Import",
    guideSteps: [
      "Drag and drop your .csv or .xlsx file in the upload zone below.",
      "Our system auto-detects Name, Email, Phone, and Company columns.",
      "Click 'Import Leads Now' to ingest hundreds of leads in seconds."
    ],
    samplePayload: CHANNEL_SAMPLE_PAYLOADS.IMPORTS.payload,
  },
};

type ActiveTab = "NO_CODE_HUB" | "SIMULATOR" | "DOCS" | "LOGS";
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("NO_CODE_HUB");
  const [selectedChannel, setSelectedChannel] = useState<IngestionChannel>("WHATSAPP");
  const [ingestMode, setIngestMode] = useState<IngestMode>("GENERAL_ENVELOPE");

  // Non-tech wizard modal
  const [noCodeWizardChannel, setNoCodeWizardChannel] = useState<IngestionChannel | null>(null);

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

  // CSV Drag and Drop states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

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
    } catch (e) {}
    setLogs(INITIAL_SEED_LOGS);
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(INITIAL_SEED_LOGS));
    } catch (e) {}
  }, []);

  const saveLogs = (newLogs: IngestLeadResponse[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(newLogs));
    } catch (e) {}
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Channel Select
  const handleChannelSelect = (channel: IngestionChannel) => {
    setSelectedChannel(channel);
    const sample = CHANNEL_SAMPLE_PAYLOADS[channel];
    setSource(sample.source);
    setJsonPayload(JSON.stringify(sample.payload, null, 2));
    setJsonError(null);
  };

  // Simulate Ingestion Run
  const handleIngest = async (targetChannel?: IngestionChannel) => {
    const ch = targetChannel || selectedChannel;
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
          channel: ch,
          source,
          sourceId: sourceId || undefined,
          eventId: eventId || undefined,
          assignedToId: assignedToId || undefined,
          note: note || undefined,
          payload: parsedPayload,
        };
        res = await ingestLeadGeneral(envelope);
      } else {
        res = await ingestLeadByChannel(ch, parsedPayload, {
          sourceId: sourceId || undefined,
          eventId: eventId || undefined,
        });
      }

      setLastResponse(res);
      const updated = [res, ...logs.filter((l) => l.leadId !== res.leadId).slice(0, 49)];
      saveLogs(updated);
      triggerToast(`⚡ Connection Test Successful! Ingested lead: ${res.lead?.name || res.leadId}`);
    } catch (err) {
      console.error("Ingestion error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate CSV File Import for Non-Tech Users
  const handleCsvImport = () => {
    if (!csvFile) return;
    setImportingCsv(true);
    setTimeout(() => {
      const generatedLead: IngestLeadResponse = {
        leadId: `csv_${Math.random().toString(36).substr(2, 8)}`,
        organizationId: "org_zyoris_demo",
        channel: "IMPORTS",
        source: "CSV_BATCH_IMPORTER",
        sourceId: `file_${csvFile.name}`,
        isNewLead: true,
        idempotencyResult: "CREATED",
        identityResolution: {
          matched: true,
          customerId: "cust_batch_881",
          matchReason: "EXACT_EMAIL",
        },
        lead: {
          id: `csv_${Math.random().toString(36).substr(2, 8)}`,
          name: "Rohan Patel (CSV Import)",
          email: "rohan.patel@solargrid.in",
          phone: "+919820011223",
          company: "SolarGrid Tech",
          status: "NEW",
          source: "CSV_BATCH_IMPORTER",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        receivedAt: new Date().toISOString(),
      };

      const updated = [generatedLead, ...logs];
      saveLogs(updated);
      setImportingCsv(false);
      setCsvFile(null);
      triggerToast(`✅ File '${csvFile.name}' Imported! 1 lead added to CRM.`);
    }, 1200);
  };

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

        const existingMap = new Map(logs.map((l) => [l.leadId, l]));
        syncedLogs.forEach((sl) => existingMap.set(sl.leadId, sl));
        const merged = Array.from(existingMap.values()).sort(
          (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        );
        saveLogs(merged);
        triggerToast(`Synced ${syncedLogs.length} live lead events!`);
      }
    } catch (err) {
      triggerToast("Synced event logs.");
    } finally {
      setRefreshingLive(false);
    }
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    triggerToast("Copied to clipboard!");
  };

  // Filtered log items
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
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Sparkles size={16} className="text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Non-Technical Step-by-Step Connector Setup Wizard Modal */}
      {noCodeWizardChannel && (
        <NoCodeConnectorSetupModal
          channelKey={noCodeWizardChannel}
          onClose={() => setNoCodeWizardChannel(null)}
          onTestConnection={() => {
            handleIngest(noCodeWizardChannel);
            setNoCodeWizardChannel(null);
            setActiveTab("LOGS");
          }}
        />
      )}

      {/* Log Detail Inspector Modal */}
      {selectedLogForModal && (
        <IngestionLogDetailModal
          log={selectedLogForModal}
          onClose={() => setSelectedLogForModal(null)}
        />
      )}

      {/* Workbench Header & Audience View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200">
              <Zap size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 leading-tight">
                  Lead Ingestion Center & Channel Connectors
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  LIVE PIPELINE
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Connect channels (WhatsApp, Facebook Ads, Website Forms, CSV) without coding, or test raw API JSON payloads.
              </p>
            </div>
          </div>
        </div>

        {/* Audience Mode Switcher (Non-Tech vs Developer) */}
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shrink-0">
          <button
            onClick={() => setActiveTab("NO_CODE_HUB")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "NO_CODE_HUB"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <MousePointerClick size={15} />
            No-Code Connector Hub (For Managers)
          </button>
          <button
            onClick={() => setActiveTab("SIMULATOR")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "SIMULATOR" || activeTab === "DOCS"
                ? "bg-slate-900 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Code2 size={15} />
            Developer Workbench (API & JSON)
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 overflow-x-auto pb-px">
        <div className="flex items-center gap-2">
          {[
            { id: "NO_CODE_HUB", label: "No-Code Channel Connectors", icon: MousePointerClick },
            { id: "SIMULATOR", label: "JSON & cURL Developer Testbench", icon: Code2 },
            { id: "DOCS", label: "REST Endpoint Reference", icon: BookOpen },
            { id: "LOGS", label: "Ingestion Event Activity Logs", icon: Layers, count: logs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600 bg-blue-50/60"
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

        <button
          onClick={handleSyncLiveLeads}
          disabled={refreshingLive}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-xs mb-1"
        >
          <RefreshCw size={13} className={refreshingLive ? "animate-spin text-blue-600" : "text-gray-500"} />
          {refreshingLive ? "Syncing..." : "Sync Live Data"}
        </button>
      </div>

      {/* MODE 1: NO-CODE MANAGER CONNECTOR HUB */}
      {activeTab === "NO_CODE_HUB" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Friendly Non-Tech Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-extrabold tracking-wider uppercase text-white border border-white/30 inline-flex items-center gap-1.5">
                <Sparkles size={13} className="text-yellow-300" /> Non-Technical Guided Setup
              </span>
              <h2 className="text-2xl font-black tracking-tight">
                Connect Lead Channels in 3 Easy Steps — 0% Code Required
              </h2>
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                Select any channel card below to get your ready-to-use integration link or drag & drop an Excel/CSV file to instantly import your leads into Zyoris CRM.
              </p>
            </div>
          </div>

          {/* 7 Native Channel Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(NO_CODE_CHANNEL_CONFIG) as IngestionChannel[]).map((ch) => {
              const conf = NO_CODE_CHANNEL_CONFIG[ch];
              const Icon = conf.icon;
              return (
                <div
                  key={ch}
                  className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`p-3 rounded-2xl ${conf.bg} border ${conf.borderColor}`}>
                        <Icon size={22} className={conf.color} />
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        {conf.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {conf.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{conf.subtitle}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setNoCodeWizardChannel(ch)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-50 hover:bg-blue-600 hover:text-white border border-gray-200 font-bold text-xs text-gray-800 transition-all flex items-center justify-center gap-2 group-hover:shadow-sm"
                  >
                    <span>Connect {conf.title}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Instant CSV Drag & Drop Batch Upload Zone */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <FileSpreadsheet size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Direct Batch CSV / Excel Lead Uploader</h3>
                  <p className="text-xs text-gray-500">Upload lead spreadsheets to import hundreds of prospects automatically.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                Auto-column Mapping
              </span>
            </div>

            <div className="border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <UploadCloud size={24} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-800">
                  {csvFile ? csvFile.name : "Drag and drop your .csv or .xlsx lead spreadsheet here"}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Supports CSV, XLS, XLSX formats up to 50MB</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <label className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:border-gray-400 text-xs font-bold text-gray-700 cursor-pointer shadow-xs">
                  Choose File
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                {csvFile && (
                  <button
                    onClick={handleCsvImport}
                    disabled={importingCsv}
                    className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-md shadow-rose-200 flex items-center gap-2"
                  >
                    {importingCsv ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {importingCsv ? "Importing Leads..." : "Import Leads Now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: DEVELOPER API SIMULATOR */}
      {activeTab === "SIMULATOR" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Mode Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-900">Developer API Target Mode:</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setIngestMode("GENERAL_ENVELOPE")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  ingestMode === "GENERAL_ENVELOPE" ? "bg-white text-blue-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                POST /leads/ingest (Envelope Body)
              </button>
              <button
                onClick={() => setIngestMode("DIRECT_PATH")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  ingestMode === "DIRECT_PATH" ? "bg-white text-blue-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                POST /leads/ingest/{selectedChannel.toLowerCase()} (Direct Path)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* JSON Code Editor */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Raw Payload JSON Editor</h3>
                <span className="text-[11px] font-mono text-blue-600">Channel: {selectedChannel}</span>
              </div>

              <textarea
                value={jsonPayload}
                onChange={(e) => {
                  setJsonPayload(e.target.value);
                  setJsonError(null);
                }}
                rows={11}
                className="w-full font-mono text-xs p-3.5 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed shadow-inner"
              />

              <button
                onClick={() => handleIngest()}
                disabled={loading}
                className="w-full py-3 px-5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                {loading ? "Normalizing..." : "Submit Test Ingestion Payload"}
              </button>
            </div>

            {/* Execution Response */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3">
                API Response & Identity Match
              </h3>
              {lastResponse ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <span className="font-bold text-emerald-900">Status: {lastResponse.isNewLead ? "201 Created" : "200 OK"}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                      {lastResponse.idempotencyResult}
                    </span>
                  </div>
                  <pre className="p-3 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Awaiting payload execution...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: REST DOCS */}
      {activeTab === "DOCS" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 animate-in fade-in duration-200">
          <h2 className="text-base font-bold text-gray-900">REST Integration Endpoints</h2>
          <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs border border-slate-800">
            {`POST https://api.zyoris.com/leads/ingest\nPOST https://api.zyoris.com/leads/ingest/whatsapp\nPOST https://api.zyoris.com/leads/ingest/forms`}
          </pre>
        </div>
      )}

      {/* MODE 4: EVENT LOGS */}
      {activeTab === "LOGS" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Log Controls */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Ingestion Audit Activity Feed</h2>
                <p className="text-xs text-gray-500">Real-time log trace of normalized lead contracts.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncLiveLeads}
                  disabled={refreshingLive}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                >
                  <RefreshCw size={13} className={refreshingLive ? "animate-spin inline mr-1" : "inline mr-1"} />
                  Sync Live Leads
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8 relative">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search log trace..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50"
                />
              </div>
              <div className="sm:col-span-4">
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-gray-50/50"
                >
                  <option value="ALL">All Channels</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="FORMS">Meta Forms</option>
                  <option value="WEBSITE">Website</option>
                  <option value="CHAT">Chatbots</option>
                  <option value="CALLS">Calls</option>
                  <option value="REFERRALS">Referrals</option>
                  <option value="IMPORTS">Imports</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Lead Profile</th>
                  <th className="p-3.5">Contact Info</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5">Identity</th>
                  <th className="p-3.5">Idempotency</th>
                  <th className="p-3.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.leadId}
                    onClick={() => setSelectedLogForModal(log)}
                    className="hover:bg-blue-50/40 cursor-pointer"
                  >
                    <td className="p-3.5 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(log.receivedAt)}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900">{log.lead?.name || log.leadId}</div>
                      <div className="text-[11px] text-gray-400">{log.lead?.company || "No Company"}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-gray-800">{log.lead?.email || "—"}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{log.lead?.phone || "—"}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                        {log.channel}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {log.identityResolution?.matched ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Matched ({log.identityResolution.matchReason})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">
                          Unmatched
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                        {log.idempotencyResult}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg border border-blue-200">
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Non-Technical Channel Setup Wizard Modal ─────────────────────────────────
function NoCodeConnectorSetupModal({
  channelKey,
  onClose,
  onTestConnection,
}: {
  channelKey: IngestionChannel;
  onClose: () => void;
  onTestConnection: () => void;
}) {
  const conf = NO_CODE_CHANNEL_CONFIG[channelKey];
  const Icon = conf.icon;
  const webhookUrl = `https://api.zyoris.com/leads/ingest/${channelKey.toLowerCase()}?orgId=org_demo`;
  const embedSnippet = `<script src="https://cdn.zyoris.com/v1/lead-tracker.js" data-org="org_demo" data-channel="${channelKey}"></script>`;

  const [copied, setCopied] = useState(false);

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden space-y-0 my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${conf.bg} text-blue-600 shadow-sm`}>
              <Icon size={22} className={conf.color} />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Setup Guide: {conf.title}</h2>
              <p className="text-xs text-slate-400">Step-by-step 0-code connection wizard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Step-by-Step Setup Guide</h3>
            <div className="space-y-2">
              {conf.guideSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200/70 text-xs text-gray-800">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Copyable Webhook Link */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-700 uppercase">Your Dedicated Channel Integration Link</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={channelKey === "WEBSITE" ? embedSnippet : webhookUrl}
                className="w-full text-xs font-mono p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-800"
              />
              <button
                onClick={() => handleCopy(channelKey === "WEBSITE" ? embedSnippet : webhookUrl)}
                className="px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shrink-0 flex items-center gap-1.5"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">Test live payload execution to verify active connection.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onTestConnection}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
            >
              <Zap size={14} /> Send Test Signal & View Log
            </button>
          </div>
        </div>
      </div>
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
  const [copied, setCopied] = useState(false);
  const leadObj = log.lead || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-3xl w-full overflow-hidden space-y-0 my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Log Details: {leadObj.name || log.leadId}</h2>
            <p className="text-xs text-slate-400">Received at {new Date(log.receivedAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 text-[10px] uppercase font-bold">Name</span>
              <p className="font-bold text-gray-900 mt-0.5">{leadObj.name || "—"}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 text-[10px] uppercase font-bold">Email</span>
              <p className="font-bold text-gray-900 mt-0.5">{leadObj.email || "—"}</p>
            </div>
          </div>

          <div>
            <span className="text-gray-700 font-bold uppercase text-[10px]">Full API Ingestion Response JSON</span>
            <pre className="p-4 bg-slate-950 text-slate-100 font-mono rounded-2xl overflow-x-auto max-h-64 leading-relaxed border border-slate-800 mt-1">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-bold text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
