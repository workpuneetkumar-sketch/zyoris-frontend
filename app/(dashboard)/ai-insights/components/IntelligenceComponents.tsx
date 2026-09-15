import { ShieldAlert, Sparkles, AlertTriangle, Lightbulb, CheckCircle, Target } from "lucide-react";
import { motion } from "framer-motion";
import { InsightBadge, ConfidenceIndicator } from "./SharedComponents";

export function IntelligenceCard({ item }: { item: any }) {
  const isAnomaly = item.type === 'ANOMALY';
  const isRecommendation = item.type === 'RECOMMENDATION';
  
  const iconBg = isAnomaly ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                 isRecommendation ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                 'bg-blue-50 text-blue-600 border-blue-100';
                 
  return (
    <motion.div 
      whileHover={{ scale: 1.01, y: -2 }}
      className="p-5 rounded-[24px] border border-slate-200/60 bg-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className={`mt-1 rounded-2xl p-3 shrink-0 shadow-sm border ${iconBg}`}>
          {isAnomaly ? <AlertTriangle size={18} /> : 
           isRecommendation ? <Lightbulb size={18} /> : 
           <CheckCircle size={18} />}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1.5">
             <h4 className="font-extrabold text-[15px] text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h4>
             {item.impact && <InsightBadge impact={item.impact} />}
          </div>
          <p className="text-[13px] text-slate-500 leading-relaxed font-medium mb-3">{item.description}</p>
          
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {item.confidence && <ConfidenceIndicator confidence={item.confidence} />}
            {isRecommendation && (
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-lg">
                Recommended Action
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function IntelligenceCenter({ feedItems, isProcessing }: { feedItems: any[], isProcessing: boolean }) {
  return (
    <div className="bg-white border border-slate-200/60 p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900">Intelligence Center</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Anomalies & Opportunities</p>
        </div>
        <div className="relative">
          <ShieldAlert size={20} className="text-rose-500" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
        </div>
      </div>
      
      <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
        {isProcessing && feedItems.length === 0 ? (
          Array(3).fill(0).map((_, idx) => (
            <div key={idx} className="p-5 rounded-[24px] border border-slate-100 bg-slate-50 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-full mb-2" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))
        ) : feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
              <Sparkles size={24} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-500">No active insights</p>
            <p className="text-xs">The engine is still monitoring the data.</p>
          </div>
        ) : (
          feedItems.map((item: any, idx: number) => (
            <IntelligenceCard key={idx} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
