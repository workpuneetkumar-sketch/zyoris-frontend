"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadDataset, getAnalysisSessions, deleteAnalysisSession } from "@/lib/api/aiInsightsApi";
import { Brain, UploadCloud, FileSpreadsheet, Loader2, ArrowRight, Trash2, Calendar, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AiInsightsLandingPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"IDLE" | "UPLOADING" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      const lastSessionId = sessionStorage.getItem('last_ai_session_id');
      if (lastSessionId) {
        router.replace(`/ai-insights/${lastSessionId}`);
      } else {
        loadSessions();
      }
    }
  }, [token, router]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await getAnalysisSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions", e);
    } finally {
      setLoadingSessions(false);
    }
  };

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
      if (res.sessionId) {
        router.push(`/ai-insights/${res.sessionId}`);
      }
    } catch (error: any) {
      console.error(error);
      setStatus("ERROR");
      setErrorMsg(error.message || "Failed to upload file.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await deleteAnalysisSession(id);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (error) {
      console.error("Failed to delete session", error);
    }
  };

  if (!token) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 text-white relative min-h-screen font-sans bg-black">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-14 h-14 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
          <Brain size={28} className="text-blue-600 animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            AI Business Intelligence
          </h1>
          <p className="text-sm text-gray-400 mt-1">Upload business datasets for autonomous profiling, KPIs, forecasting, and RAG chat.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Upload Panel */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-black border border-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
            
            <div 
              className="w-full border-2 border-dashed border-gray-700 bg-gray-900 rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-gray-800 transition cursor-pointer group"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".csv,.xlsx,.xls,.pdf,.doc,.docx" />
              <div className="w-16 h-16 bg-gray-800 shadow-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud size={32} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-white">New Analysis Session</h3>
              <p className="text-xs text-gray-500 mt-2">Drag & drop CSV, Excel, PDF, or Word document</p>
            </div>
            
            {file && status !== "UPLOADING" && (
              <div className="mt-6 w-full flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-gray-900 px-4 py-3 rounded-xl border border-gray-700">
                  <FileSpreadsheet size={24} className="text-blue-600 shrink-0" />
                  <div className="text-left overflow-hidden flex-1">
                    <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {file.size < 1024 * 1024 
                        ? `${(file.size / 1024).toFixed(2)} KB` 
                        : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleUpload} 
                  className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Start AI Intelligence Engine <ArrowRight size={16} />
                </button>
              </div>
            )}

            {status === "UPLOADING" && (
              <div className="mt-6 flex flex-col items-center w-full space-y-3">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <p className="text-sm font-semibold text-gray-300 animate-pulse">Uploading and Initializing AI...</p>
              </div>
            )}
            
            {status === "ERROR" && (
              <div className="mt-6 w-full text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200 text-center font-medium">
                {errorMsg}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-2">
          <div className="bg-black border border-gray-800 rounded-3xl p-8 min-h-[400px] shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <Database className="text-blue-600" size={20} />
              Session History
            </h2>

            {loadingSessions ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={32} className="animate-spin text-blue-600/50" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                <p className="font-medium">No past sessions found.</p>
                <p className="text-sm">Upload a dataset to begin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => router.push(`/ai-insights/${session.id}`)}
                    className="group relative p-5 bg-gray-950 border border-gray-800 rounded-2xl hover:border-gray-600 hover:bg-gray-900 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-900 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-gray-800 transition-colors" />
                    
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={18} className="text-blue-600" />
                        <span className="font-bold text-sm text-white truncate max-w-[180px]">{session.filename}</span>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-4 relative z-10">
                      <div className="flex items-center gap-1"><Calendar size={12}/> {new Date(session.createdAt).toLocaleDateString()}</div>
                      {session.dataset && (
                        <div className="flex items-center gap-1"><Database size={12}/> {session.dataset.rowCount?.toLocaleString()} rows</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between relative z-10">
                      <div className="px-2 py-1 bg-gray-900 rounded-md text-[10px] font-bold border border-gray-700 uppercase tracking-wider">
                        {session.status === 'COMPLETED' ? (
                          <span className="text-green-600">Analyzed</span>
                        ) : session.status === 'FAILED' ? (
                          <span className="text-red-600">Failed</span>
                        ) : (
                          <span className="text-amber-500 animate-pulse">Processing</span>
                        )}
                      </div>
                      
                      {session.dataset?.qualityScore !== undefined && (
                        <div className="text-[10px] text-gray-500 font-medium">
                          Quality: <span className="font-bold text-white">{Math.round(session.dataset.qualityScore)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
