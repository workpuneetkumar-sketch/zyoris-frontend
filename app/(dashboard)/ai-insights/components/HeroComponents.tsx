import { Sparkles, ShieldAlert, Database, FileSpreadsheet } from "lucide-react";
import { DatasetHealthCard } from "./SharedComponents";

export function ExecutiveSummaryCard({ isProcessing, summaryText }: { isProcessing: boolean, summaryText: string | null }) {
  return (
    <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl border border-slate-200/60 p-8 md:p-10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-violet-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none" />
      
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Executive Briefing</h1>
            <p className="text-sm font-medium text-slate-500">Autonomous synthesis of your dataset</p>
          </div>
        </div>
        
        {!isProcessing && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
            <ShieldAlert size={14} className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-700">High Confidence</span>
          </div>
        )}
      </div>
      
      <div className="prose prose-slate max-w-none relative z-10">
        {!summaryText && isProcessing ? (
          <div className="space-y-4">
            <div className="h-4 bg-slate-100 rounded-full animate-pulse w-3/4" />
            <div className="h-4 bg-slate-100 rounded-full animate-pulse w-full" />
            <div className="h-4 bg-slate-100 rounded-full animate-pulse w-5/6" />
            <div className="h-4 bg-slate-100 rounded-full animate-pulse w-2/3 mt-6" />
          </div>
        ) : summaryText ? (
          <div className="text-[16px] leading-relaxed text-slate-600 space-y-5 font-medium">
            {summaryText.split('\n').map((paragraph: string, i: number) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Summary could not be generated.</p>
        )}
      </div>
    </div>
  );
}

export function DatasetProfileCard({ session, isProcessing }: { session: any, isProcessing: boolean }) {
  return (
    <div className="xl:col-span-4 bg-white/80 backdrop-blur-xl border border-slate-200/60 p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-xl font-extrabold text-slate-900">Dataset Profile</h2>
          <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
            <Database size={20} />
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} className="text-indigo-600" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Source File</p>
              <p className="font-bold text-slate-900 text-sm truncate">{session?.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Records</p>
              <p className="font-extrabold text-slate-900 text-lg">{session?.dataset?.rowCount?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Columns</p>
              <p className="font-extrabold text-slate-900 text-lg">{session?.dataset?.columnCount || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      <DatasetHealthCard 
        score={session?.dataset?.qualityScore || 0} 
        classification={session?.dataset?.classification || ''}
        isProcessing={isProcessing}
      />
    </div>
  );
}
