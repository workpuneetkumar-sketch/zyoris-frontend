"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAnalysisSession, chatWithDatasetSession } from "@/lib/api/aiInsightsApi";
import { 
  Brain, FileSpreadsheet, BarChart2, AlertTriangle, CheckCircle, 
  Loader2, MessageSquare, Send, TrendingUp, TrendingDown, Target, 
  Lightbulb, ArrowLeft, Database, ShieldAlert, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function SessionWorkspace() {
  const { sessionId } = useParams();
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
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-slate-50">
        <Loader2 size={48} className="animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium animate-pulse">Initializing AI Workspace...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <p className="text-red-500 font-medium">Session not found or access denied.</p>
        <button onClick={() => router.push('/ai-insights')} className="mt-4 text-indigo-600 hover:underline">Go Back</button>
      </div>
    );
  }

  const isProcessing = session.status === 'PROCESSING' || session.status === 'PENDING';
  const progressState = session.progressState || 'Analyzing Dataset';

  // Parse Insights
  const execSummary = session.insights?.find((i: any) => i.type === "EXECUTIVE_SUMMARY");
  const kpis = session.insights?.filter((i: any) => i.type === "KPI") || [];
  const feedItems = session.insights?.filter((i: any) => i.type !== "KPI" && i.type !== "EXECUTIVE_SUMMARY") || [];
  const charts = session.charts?.sort((a: any, b: any) => a.rank - b.rank) || [];
  const forecasts = session.forecasts || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* Light Theme Background Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-100 blur-[120px]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 relative z-10 space-y-8">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition group font-medium">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Sessions
          </button>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-semibold shadow-sm flex items-center gap-2 text-slate-700">
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                  {progressState}
                </>
              ) : session.status === 'FAILED' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Failed
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Ready
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hero Section: Executive Summary & Overview */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Brain size={24} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive AI Summary</h1>
            </div>
            
            <div className="prose prose-slate max-w-none">
              {!execSummary && isProcessing ? (
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
                </div>
              ) : execSummary ? (
                <div className="text-[15px] leading-relaxed text-slate-600 space-y-4">
                  {execSummary.description.split('\n').map((paragraph: string, i: number) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Summary could not be generated.</p>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900">
                <Database className="text-indigo-600" size={20} />
                Dataset Profile
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Source File</span>
                  <span className="font-semibold text-sm text-slate-900 truncate max-w-[150px]" title={session.filename}>{session.filename}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Total Records</span>
                  <span className="font-semibold text-sm text-slate-900">{session.dataset?.rowCount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Total Columns</span>
                  <span className="font-semibold text-sm text-slate-900">{session.dataset?.columnCount || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Classification</span>
                  <span className="font-semibold text-sm text-indigo-600">{session.dataset?.classification || (isProcessing ? 'Analyzing...' : 'Unknown')}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700">Data Quality Score</span>
                <span className="text-sm font-bold text-green-600">{Math.round(session.dataset?.qualityScore || 0)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${session.dataset?.qualityScore || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isProcessing && kpis.length === 0 ? (
            Array(4).fill(0).map((_, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-8 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
            ))
          ) : (
            kpis.map((kpi: any, idx: number) => {
              const trend = kpi.metadata?.trend || 'flat';
              const isUp = trend === 'up';
              const isDown = trend === 'down';
              
              return (
                <div key={idx} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition duration-300 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{kpi.title}</p>
                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                      <Target size={16} />
                    </div>
                  </div>
                  
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-2 truncate" title={kpi.value}>{kpi.value}</h3>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {isUp && <TrendingUp size={14} className="text-green-600" />}
                      {isDown && <TrendingDown size={14} className="text-red-600" />}
                      {!isUp && !isDown && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                      
                      <span className={isUp ? "text-green-600" : isDown ? "text-red-600" : "text-slate-500"}>
                        {kpi.metadata?.changePercentage ? `${Math.abs(kpi.metadata.changePercentage)}%` : 'Stable'}
                      </span>
                    </div>
                    
                    {kpi.metadata?.confidenceScore && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                        {kpi.metadata.confidenceScore}% Conf
                      </span>
                    )}
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full mb-2 left-0 right-0 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl pointer-events-none z-20">
                    {kpi.description}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Charts & Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isProcessing && charts.length === 0 ? (
            Array(2).fill(0).map((_, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm h-96 animate-pulse" />
            ))
          ) : (
            charts.map((chart: any, idx: number) => (
              <div key={idx} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart2 size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-900">{chart.title}</h3>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.chartType.toLowerCase().includes("line") ? (
                      <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`colorValue${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toLocaleString()} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="value" stroke={COLORS[idx % COLORS.length]} strokeWidth={3} fillOpacity={1} fill={`url(#colorValue${idx})`} />
                      </AreaChart>
                    ) : chart.chartType.toLowerCase().includes("pie") || chart.chartType.toLowerCase().includes("donut") ? (
                      <PieChart>
                        <Pie data={chart.data} cx="50%" cy="50%" innerRadius={chart.chartType.includes("donut") ? 60 : 0} outerRadius={100} paddingAngle={5} dataKey="value">
                          {chart.data.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}/>
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    ) : (
                      <BarChart data={chart.data} layout={chart.chartType.includes("horizontal") ? "vertical" : "horizontal"} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={!chart.chartType.includes("horizontal")} horizontal={chart.chartType.includes("horizontal")} />
                        <XAxis type={chart.chartType.includes("horizontal") ? "number" : "category"} dataKey={chart.chartType.includes("horizontal") ? undefined : "name"} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis type={chart.chartType.includes("horizontal") ? "category" : "number"} dataKey={chart.chartType.includes("horizontal") ? "name" : undefined} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          cursor={{fill: '#f1f5f9'}}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Intelligence Feed */}
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm h-[500px] flex flex-col">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-900">
              <ShieldAlert size={20} className="text-rose-500" />
              Intelligence Feed
            </h3>
            
            <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
              {isProcessing && feedItems.length === 0 ? (
                Array(3).fill(0).map((_, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-full" />
                  </div>
                ))
              ) : feedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <Sparkles size={32} />
                  <p>No actionable insights discovered yet.</p>
                </div>
              ) : (
                feedItems.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 rounded-full p-1.5 shrink-0
                        ${item.type === 'ANOMALY' ? 'bg-rose-100 text-rose-600' : 
                          item.type === 'RECOMMENDATION' ? 'bg-amber-100 text-amber-600' : 
                          'bg-indigo-100 text-indigo-600'}`}
                      >
                        {item.type === 'ANOMALY' ? <AlertTriangle size={14} /> : 
                         item.type === 'RECOMMENDATION' ? <Lightbulb size={14} /> : 
                         <CheckCircle size={14} />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                        
                        {(item.impact || item.confidence) && (
                          <div className="mt-3 flex items-center gap-2">
                            {item.impact && (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-medium border
                                ${item.impact === 'HIGH' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
                                  item.impact === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                                  'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                {item.impact} IMPACT
                              </span>
                            )}
                            {item.confidence && (
                              <span className="text-[10px] text-slate-500 font-medium">{item.confidence}% Confident</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm h-[500px] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold flex items-center gap-2 text-slate-900">
                <MessageSquare size={20} className="text-indigo-600" />
                Dataset Intelligence Chat
              </h3>
              <p className="text-xs text-slate-500 mt-1">Ask questions about trends, anomalies, or predictions.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <Brain size={48} className="opacity-20" />
                  <p className="text-sm">I've analyzed the dataset. What would you like to know?</p>
                  
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {["Summarize this dataset", "What are the top anomalies?", "Forecast next quarter"].map(q => (
                      <button 
                        key={q} 
                        onClick={() => handleSendMessage(q)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs rounded-full transition font-medium"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {chatHistory.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
                        ${msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-sm' 
                          : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {isChatLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75" />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatMessage); }} className="p-4 border-t border-slate-100 bg-white">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  placeholder="Ask a question about your data..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400"
                  disabled={isChatLoading || isProcessing}
                />
                <button 
                  type="submit"
                  disabled={!chatMessage.trim() || isChatLoading || isProcessing}
                  className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
