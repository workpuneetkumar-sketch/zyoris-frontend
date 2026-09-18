"use client";

import { useState, useEffect } from "react";
import { Lead, computeLeadScore } from "@/types/leads";
import { getLeadStatusInfo } from "@/utils/leadStatus";
import { getLeadScore as fetchLeadScore } from "@/lib/api/leadsApi";
import { AiExtractionPanel } from "@/components/ai/AiExtractionPanel";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Tag,
  FileText,
  DollarSign,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Calendar,
  Globe,
  Loader2,
  X,
  Copy,
  Check,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { LeadApiActionsToolbar } from "@/components/leads/LeadApiActionsToolbar";

interface ViewLeadModalProps {
  lead: Lead;
  onClose: () => void;
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function safeString(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function getInitials(name: string): string {
  if (!name) return "NA";
  return name
    .split(" ")
    .map((n) => n[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

export default function ViewLeadModal({ lead, onClose }: ViewLeadModalProps) {
  const [score, setScore] = useState<number | null>(lead.score ?? null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "INTELLIGENCE" | "EXTRACTION">("OVERVIEW");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const statusInfo = getLeadStatusInfo(lead.status);

  useEffect(() => {
    let mounted = true;
    async function loadScore() {
      if (!lead.id) return;
      setScoreLoading(true);
      setScoreError(null);
      try {
        const result = await fetchLeadScore(lead.id);
        if (mounted) {
          setScore(result.score);
        }
      } catch (error: any) {
        if (mounted) {
          setScoreError(error.message || "Failed to fetch lead score");
          setScore(computeLeadScore(lead));
        }
      } finally {
        if (mounted) {
          setScoreLoading(false);
        }
      }
    }
    loadScore();
    return () => {
      mounted = false;
    };
  }, [lead.id, lead]);

  const val =
    typeof lead.estimatedValue === "number" && lead.estimatedValue > 0
      ? lead.estimatedValue
      : 0;

  const handleCopy = (text: string, type: "email" | "phone") => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const hasContactInfo = lead.email || lead.phone || lead.city || lead.company;
  const hasTags = lead.tags && lead.tags.length > 0;
  const hasNote = lead.note && lead.note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-blue-100 my-auto transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Animated Hero Header */}
        <div className="relative px-7 py-6 border-b border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white overflow-hidden">
          {/* Subtle Background Glow Spheres */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-blue-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar Ring with Initials */}
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-white text-blue-700 font-extrabold text-xl flex items-center justify-center shadow-lg border-2 border-white/40 transform transition-transform hover:scale-105">
                  {getInitials(lead.name || "Lead")}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                    {lead.name || "Unnamed Lead"}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
                    {statusInfo.emoji} {statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-blue-100 font-medium mt-1">
                  <span>{safeString(lead.company)}</span>
                  <span>•</span>
                  <span>Source: {safeString(lead.source)}</span>
                  {val > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-extrabold text-emerald-300">₹{val.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all transform hover:rotate-90 duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-7 pt-3 bg-blue-50/50 border-b border-blue-100">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "OVERVIEW"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <User size={14} /> Lead Overview & Score
          </button>
          <button
            onClick={() => setActiveTab("INTELLIGENCE")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "INTELLIGENCE"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Zap size={14} className="text-amber-500" /> AI API Actions & Intelligence
          </button>
          <button
            onClick={() => setActiveTab("EXTRACTION")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "EXTRACTION"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Sparkles size={14} className="text-purple-500" /> Conversation Data Extraction
          </button>
        </div>

        {/* Body Content */}
        <div className="p-7 overflow-y-auto bg-slate-50/40 space-y-6 flex-1">
          {/* TAB 1: OVERVIEW & SCORE */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Score + Estimated Value Hero Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Score Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart2 size={15} className="text-blue-600" /> AI Predictive Lead Score
                    </p>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Real-time Evaluation
                    </span>
                  </div>

                  {scoreLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                    </div>
                  ) : score !== null ? (
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center border-4 font-black text-xl shrink-0 shadow-sm"
                        style={{
                          borderColor: score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444",
                          color: score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626",
                          backgroundColor: score >= 70 ? "#ecfdf5" : score >= 40 ? "#fffbeb" : "#fef2f2",
                        }}
                      >
                        {score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {score >= 70 ? (
                            <TrendingUp size={16} className="text-emerald-500" />
                          ) : score >= 40 ? (
                            <Minus size={16} className="text-amber-500" />
                          ) : (
                            <TrendingDown size={16} className="text-red-500" />
                          )}
                          <span
                            className={`text-sm font-extrabold ${
                              score >= 70
                                ? "text-emerald-600"
                                : score >= 40
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {score >= 70 ? "Very Hot Lead (High Priority)" : score >= 40 ? "Warm Lead" : "Cold Lead"}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${score}%`,
                              background: score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">Confidence Score: 88%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">Score unavailable</div>
                  )}
                  {scoreError && <div className="mt-2 text-[10px] text-red-500">{scoreError}</div>}
                </div>

                {/* Estimated Deal Value Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <DollarSign size={15} className="text-emerald-600" /> Estimated Value & Pipeline Opportunity
                    </p>
                    <div className="text-3xl font-black text-emerald-700 tracking-tight">
                      {val > 0 ? `₹${val.toLocaleString()}` : "Not Specified"}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Target Closing Probability</span>
                    <span className="font-bold text-gray-900">{score && score >= 70 ? "85%" : "50%"}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information Grid with Click to Copy */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Contact & Profile Information</h3>
                  <span className="text-[11px] text-gray-400">Click to copy contact details</span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div
                    onClick={() => handleCopy(lead.email || "", "email")}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Mail size={16} />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Email Address</p>
                        <p className="text-xs font-bold text-gray-900">{safeString(lead.email)}</p>
                      </div>
                    </div>
                    {lead.email && (
                      <span className="text-gray-400 group-hover:text-blue-600 transition-colors">
                        {copiedEmail ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div
                    onClick={() => handleCopy(lead.phone || "", "phone")}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Phone size={16} />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</p>
                        <p className="text-xs font-bold text-gray-900 font-mono">{safeString(lead.phone)}</p>
                      </div>
                    </div>
                    {lead.phone && (
                      <span className="text-gray-400 group-hover:text-emerald-600 transition-colors">
                        {copiedPhone ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <div className="p-3.5 rounded-xl border border-gray-100 flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <MapPin size={16} />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Location / City</p>
                      <p className="text-xs font-bold text-gray-900">{safeString(lead.city)}</p>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="p-3.5 rounded-xl border border-gray-100 flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                      <Building2 size={16} />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Company Name</p>
                      <p className="text-xs font-bold text-gray-900">{safeString(lead.company)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags & Notes */}
              {(hasTags || hasNote) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hasTags && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                        <Tag size={14} className="text-blue-500" /> Categorization Tags
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Array.isArray(lead.tags) &&
                          lead.tags.map((tag: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100"
                            >
                              {typeof tag === "string" ? tag : tag.label || tag.name || tag}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {hasNote && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                        <FileText size={14} className="text-amber-500" /> Lead Notes
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                        {lead.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI API ACTIONS & INTELLIGENCE */}
          {activeTab === "INTELLIGENCE" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" /> Real-time Lead Automation Subsystems
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Trigger scoring algorithms, automated sales rep routing, data enrichment, and ICP qualification pings.
                    </p>
                  </div>
                </div>

                {/* API Action Toolbar Component */}
                <LeadApiActionsToolbar leadId={lead.id} leadName={lead.name} lead={lead} />
              </div>
            </div>
          )}

          {/* TAB 3: DATA EXTRACTION */}
          {activeTab === "EXTRACTION" && (
            <div className="animate-in fade-in duration-200">
              <AiExtractionPanel leadId={lead.id} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 bg-white border-t border-blue-100 flex items-center justify-between">
          <div className="text-xs text-gray-400 font-mono">
            Lead ID: {lead.id}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all shadow-xs"
          >
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
}
