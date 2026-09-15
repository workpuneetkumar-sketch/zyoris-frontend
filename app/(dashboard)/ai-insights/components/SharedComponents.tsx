import { Loader2, TrendingUp, TrendingDown, Target } from "lucide-react";
import { motion } from "framer-motion";

export function SessionStatusPill({ isProcessing, progressState }: { isProcessing: boolean, progressState: string }) {
  return (
    <div className="px-4 py-2 rounded-full bg-white border border-slate-200/60 text-xs font-bold shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex items-center gap-2 text-slate-700">
      {isProcessing ? (
        <><Loader2 size={14} className="animate-spin text-blue-600" />{progressState}</>
      ) : (
        <><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />Analysis Complete</>
      )}
    </div>
  );
}

export function ConfidenceIndicator({ confidence, className = "" }: { confidence: number, className?: string }) {
  return (
    <span className={`text-[10px] text-slate-500 font-semibold tracking-wide flex items-center gap-1 ${className}`}>
      <Target size={10}/> {confidence}% CONF
    </span>
  );
}

export function InsightBadge({ impact }: { impact: string }) {
  const impactClass = 
    impact === 'HIGH' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
    impact === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
    'bg-slate-100 border-slate-200 text-slate-600';
    
  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold tracking-wide uppercase border ${impactClass}`}>
      {impact} IMPACT
    </span>
  );
}

export function DatasetHealthCard({ score, classification, isProcessing }: { score: number, classification: string, isProcessing: boolean }) {
  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <div className="flex justify-between items-end mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quality Score</p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {Math.round(score)}<span className="text-lg text-slate-400 font-semibold">%</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block">
            {classification || (isProcessing ? 'Analyzing...' : 'Unknown')}
          </p>
        </div>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
        />
      </div>
    </div>
  );
}
