"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAnalysisSession, chatWithDatasetSession } from "@/lib/api/aiInsightsApi";
import { Loader2, ArrowLeft } from "lucide-react";

// Import Modular Architecture
import { SessionStatusPill } from "../components/SharedComponents";
import { ExecutiveSummaryCard, DatasetProfileCard } from "../components/HeroComponents";
import { KpiInsightCard } from "../components/KpiComponents";
import { AnalyticsChartCard, ForecastCard } from "../components/AnalyticsComponents";
import { IntelligenceCenter } from "../components/IntelligenceComponents";
import { AiCopilotPanel } from "../components/CopilotComponents";

export default function SessionWorkspace() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const router = useRouter();
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Progressive Polling
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('last_ai_session_id', sessionId as string);
    }
    
    if (session && (session.status === 'PROCESSING' || session.status === 'PENDING')) {
      const interval = setInterval(() => {
        loadSession(false);
      }, 2000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  const handleBack = () => {
    sessionStorage.removeItem('last_ai_session_id');
    router.push('/ai-insights');
  };

  const loadSession = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await getAnalysisSession(sessionId as string);
      setSession(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleSendMessage = async (msg: string) => {
    if (!msg.trim()) return;

    const userMsg = msg.trim();
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await chatWithDatasetSession(sessionId as string, userMsg, chatSessionId);
      setChatSessionId(res.conversationId);
      setChatHistory(prev => [...prev, { role: "assistant", content: res.message.content }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error answering your question." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-[#FAFBFC]">
        <Loader2 size={48} className="animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium animate-pulse tracking-wide">Initializing AI Workspace...</p>
      </div>
    );
  }

  if (!session) return null;

  const isProcessing = session.status === 'PROCESSING' || session.status === 'PENDING';
  const progressState = session.progressState || 'Analyzing Dataset';

  const execSummary = session.insights?.find((i: any) => i.type === "EXECUTIVE_SUMMARY");
  const kpis = session.insights?.filter((i: any) => i.type === "KPI") || [];
  const feedItems = session.insights?.filter((i: any) => i.type !== "KPI" && i.type !== "EXECUTIVE_SUMMARY") || [];
  const charts = session.charts?.sort((a: any, b: any) => a.rank - b.rank) || [];
  const forecast = session.insights?.find((i: any) => i.type === "FORECAST");

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-slate-900 pb-24 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      <div className="max-w-[1500px] mx-auto px-6 py-8 relative z-10 space-y-8">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-all group font-semibold">
            <div className="p-1.5 rounded-full bg-white border border-slate-200 shadow-sm group-hover:-translate-x-1 transition-transform">
              <ArrowLeft size={14} />
            </div>
            Back to Sessions
          </button>
          
          <div className="flex items-center gap-3">
             <SessionStatusPill isProcessing={isProcessing} progressState={progressState} />
          </div>
        </div>

        {/* HERO SECTION: Split View */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <ExecutiveSummaryCard isProcessing={isProcessing} summaryText={execSummary?.description || null} />
          <DatasetProfileCard session={session} isProcessing={isProcessing} />
        </div>

        {/* KPI WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isProcessing && kpis.length === 0 ? (
            Array(4).fill(0).map((_, idx) => (
              <div key={idx} className="bg-white border border-slate-200/60 p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-44 animate-pulse flex flex-col justify-between">
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))
          ) : (
            kpis.map((kpi: any, idx: number) => (
              <KpiInsightCard key={idx} kpi={kpi} idx={idx} />
            ))
          )}
        </div>

        {/* ANALYTICS & FORECASTING */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {forecast && <ForecastCard forecast={forecast} />}

            {isProcessing && charts.length === 0 ? (
              Array(2).fill(0).map((_, idx) => (
                <div key={idx} className="bg-white border border-slate-200/60 p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-96 animate-pulse" />
              ))
            ) : (
              charts.map((chart: any, idx: number) => (
                <AnalyticsChartCard key={idx} chart={chart} idx={idx} />
              ))
            )}
          </div>

          {/* Right Column: Feed & Chat */}
          <div className="lg:col-span-5 space-y-6">
            <IntelligenceCenter feedItems={feedItems} isProcessing={isProcessing} />
            
            <AiCopilotPanel 
              chatHistory={chatHistory}
              chatMessage={chatMessage}
              setChatMessage={setChatMessage}
              isChatLoading={isChatLoading}
              isProcessing={isProcessing}
              handleSendMessage={handleSendMessage}
              chatEndRef={chatEndRef}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
