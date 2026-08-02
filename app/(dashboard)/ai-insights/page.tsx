"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadDataset, getDatasetDetails, getDatasetInsights, getDatasetCharts, chatWithDataset } from "@/lib/api/aiInsightsApi";
import { Brain, UploadCloud, FileSpreadsheet, BarChart2, MessageSquare, AlertTriangle, CheckCircle, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AiInsightsPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"IDLE" | "UPLOADING" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [datasetId, setDatasetId] = useState<string | null>(null);
  
  const [kpis, setKpis] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);

  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("UPLOADING");
    try {
      const res = await uploadDataset(file);
      setDatasetId(res.datasetId);
      setStatus("PROCESSING");
      pollStatus(res.datasetId);
    } catch (error) {
      console.error(error);
      setStatus("FAILED");
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const details = await getDatasetDetails(id);
        if (details.status === "COMPLETED") {
          clearInterval(interval);
          fetchInsights(id);
        } else if (details.status === "FAILED") {
          clearInterval(interval);
          setStatus("FAILED");
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);
  };

  const fetchInsights = async (id: string) => {
    try {
      const insightsData = await getDatasetInsights(id);
      const chartsData = await getDatasetCharts(id);
      
      setKpis(insightsData.filter((a: any) => a.type === "KPI"));
      setAnomalies(insightsData.filter((a: any) => a.type === "ANOMALY"));
      setRecommendations(insightsData.filter((a: any) => a.type === "RECOMMENDATION"));
      setCharts(chartsData);
      setStatus("COMPLETED");
      
      setChatHistory([
        { role: "assistant", content: "Hello! I have analyzed your dataset. What would you like to know?" }
      ]);
    } catch (error) {
      console.error(error);
      setStatus("FAILED");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !datasetId) return;

    const userMsg = chatMessage.trim();
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await chatWithDataset(datasetId, userMsg, conversationId);
      setConversationId(res.conversationId);
      setChatHistory(prev => [...prev, res.message]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error answering that." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 text-text">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <Brain size={24} className="text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Business Intelligence</h1>
          <p className="text-sm text-text-muted">Autonomous data analysis, anomaly detection, and insights powered by Groq.</p>
        </div>
      </div>

      {status === "IDLE" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-background-elevated border border-border/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
          <div 
            className="w-full max-w-md border-2 border-dashed border-primary/30 rounded-2xl p-10 flex flex-col items-center justify-center hover:bg-primary/5 transition cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".csv,.xlsx,.xls" />
            <UploadCloud size={48} className="text-primary/60 mb-4" />
            <h3 className="text-lg font-semibold text-text">Drag & drop dataset</h3>
            <p className="text-sm text-text-muted mt-1">Supports CSV and Excel files</p>
          </div>
          {file && (
            <div className="mt-6 flex items-center gap-4 bg-background px-4 py-3 rounded-lg border border-border">
              <FileSpreadsheet size={20} className="text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={handleUpload} className="ml-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition">
                Analyze Data
              </button>
            </div>
          )}
        </motion.div>
      )}

      {(status === "UPLOADING" || status === "PROCESSING") && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-32">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
            <div className="absolute inset-2 border-4 border-primary rounded-full animate-spin border-t-transparent" />
            <Brain size={32} className="absolute inset-0 m-auto text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">{status === "UPLOADING" ? "Uploading Dataset..." : "AI is Analyzing..."}</h2>
          <p className="text-text-muted mt-2 text-center max-w-md">Groq's neural engine is reading the schema, finding anomalies, and generating strategic insights.</p>
        </motion.div>
      )}

      {status === "FAILED" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-500">Analysis Failed</h2>
          <p className="text-red-400 mt-2">There was an error processing your dataset. Please ensure it is a valid CSV or Excel file.</p>
          <button onClick={() => setStatus("IDLE")} className="mt-6 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg font-medium hover:bg-red-500/30 transition">Try Again</button>
        </motion.div>
      )}

      {status === "COMPLETED" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          
          {/* KPIs Grid */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, i) => (
                <div key={i} className="bg-background-elevated border border-border/50 p-5 rounded-2xl shadow-sm">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{kpi.title}</p>
                  <p className="text-2xl font-bold text-primary truncate">{kpi.value}</p>
                  <p className="text-xs text-text-secondary mt-2 line-clamp-2">{kpi.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Charts */}
              {charts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {charts.map((chart, i) => (
                    <div key={i} className="bg-background-elevated border border-border/50 p-5 rounded-2xl shadow-sm h-80 flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart2 size={16} className="text-primary" />
                        <h3 className="font-semibold text-sm">{chart.title}</h3>
                      </div>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          {chart.chartType === "bar" ? (
                            <BarChart data={chart.data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                              <XAxis dataKey={chart.config.dataKey} stroke="#ffffff50" fontSize={12} />
                              <YAxis stroke="#ffffff50" fontSize={12} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                              <Bar dataKey={chart.config.seriesKey || 'value'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          ) : chart.chartType === "pie" ? (
                            <PieChart>
                              <Pie data={chart.data} dataKey={chart.config.seriesKey || 'value'} nameKey={chart.config.dataKey} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                {chart.data.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                          ) : (
                            <LineChart data={chart.data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                              <XAxis dataKey={chart.config.dataKey} stroke="#ffffff50" fontSize={12} />
                              <YAxis stroke="#ffffff50" fontSize={12} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                              <Line type="monotone" dataKey={chart.config.seriesKey || 'value'} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Anomalies & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anomalies.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4 text-red-500">
                      <AlertTriangle size={18} />
                      <h3 className="font-semibold text-sm">Detected Anomalies</h3>
                    </div>
                    <div className="space-y-3">
                      {anomalies.map((an, i) => (
                        <div key={i} className="bg-background-elevated/50 p-3 rounded-xl border border-red-500/20">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm text-text">{an.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">{an.impact}</span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">{an.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recommendations.length > 0 && (
                  <div className="bg-green-500/5 border border-green-500/10 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4 text-green-500">
                      <CheckCircle size={18} />
                      <h3 className="font-semibold text-sm">Strategic Actions</h3>
                    </div>
                    <div className="space-y-3">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="bg-background-elevated/50 p-3 rounded-xl border border-green-500/20">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm text-text">{rec.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">{rec.confidence}% CONF</span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ZiiBot Chat Interface */}
            <div className="bg-background-elevated border border-border/50 rounded-2xl shadow-sm flex flex-col h-[600px] lg:h-auto lg:max-h-[800px]">
              <div className="p-4 border-b border-border/50 bg-background/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Chat with ZiiBot</h3>
                  <p className="text-[10px] text-text-muted">Ask questions about your data</p>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                <AnimatePresence>
                  {chatHistory.map((msg, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-background border border-border rounded-bl-none text-text'}`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {isChatLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-background border border-border p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-text-muted" />
                        <span className="text-xs text-text-muted">ZiiBot is thinking...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-border/50 bg-background/50">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask about revenue trends..."
                    className="w-full bg-background border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition"
                    disabled={isChatLoading}
                  />
                  <button type="submit" disabled={isChatLoading || !chatMessage.trim()} className="absolute right-2 p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition disabled:opacity-50">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </div>
  );
}
