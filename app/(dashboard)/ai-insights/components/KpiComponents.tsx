import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

const KPI_BG_COLORS = [
  'bg-blue-50/50 border-blue-100', 
  'bg-indigo-50/50 border-indigo-100', 
  'bg-emerald-50/50 border-emerald-100', 
  'bg-rose-50/50 border-rose-100'
];
const KPI_ICON_COLORS = [
  'text-blue-600 bg-blue-100', 
  'text-indigo-600 bg-indigo-100', 
  'text-emerald-600 bg-emerald-100', 
  'text-rose-600 bg-rose-100'
];

export function KpiInsightCard({ kpi, idx }: { kpi: any, idx: number }) {
  const trend = kpi.metadata?.trend || 'flat';
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const bgClass = KPI_BG_COLORS[idx % KPI_BG_COLORS.length];
  const iconClass = KPI_ICON_COLORS[idx % KPI_ICON_COLORS.length];
  
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`border p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all relative overflow-hidden group ${bgClass}`}
    >
      <div className="absolute right-0 top-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{kpi.title}</p>
        <div className={`p-2 rounded-xl ${iconClass}`}>
          <Activity size={16} />
        </div>
      </div>
      
      <h3 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight truncate relative z-10" title={kpi.value}>
        {kpi.value}
      </h3>
      
      <div className="flex items-center justify-between relative z-10 bg-white/60 backdrop-blur-sm p-2 rounded-xl border border-white/50">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          {isUp && <TrendingUp size={14} className="text-emerald-600" />}
          {isDown && <TrendingDown size={14} className="text-rose-600" />}
          {!isUp && !isDown && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
          
          <span className={isUp ? "text-emerald-700" : isDown ? "text-rose-700" : "text-slate-600"}>
            {kpi.metadata?.changePercentage ? `${Math.abs(kpi.metadata.changePercentage)}%` : 'Stable'}
          </span>
        </div>
        
        {kpi.metadata?.confidenceScore && (
          <span className="text-[10px] text-slate-500 font-semibold tracking-wide">
            {kpi.metadata.confidenceScore}% CONF
          </span>
        )}
      </div>
      
      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-0 right-0 bg-slate-900 text-white text-xs font-medium p-3 rounded-xl shadow-xl pointer-events-none z-20">
        {kpi.description}
      </div>
    </motion.div>
  );
}
