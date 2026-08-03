import { BarChart2, TrendingUp } from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E'];

const PremiumTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 p-4 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{label}</p>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <p className="font-bold text-slate-900 text-sm">
              {p.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsChartCard({ chart, idx }: { chart: any, idx: number }) {
  return (
    <div className="bg-white border border-slate-200/60 p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900">{chart.title}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Autonomous Trend Analysis</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
          <BarChart2 size={18} />
        </div>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toLocaleString()} dx={-10} />
              <RechartsTooltip content={<PremiumTooltip />} />
              <Area type="monotone" dataKey="value" stroke={COLORS[idx % COLORS.length]} strokeWidth={3} fillOpacity={1} fill={`url(#colorValue${idx})`} activeDot={{ r: 6, strokeWidth: 0, fill: COLORS[idx % COLORS.length] }} />
            </AreaChart>
          ) : chart.chartType.toLowerCase().includes("pie") || chart.chartType.toLowerCase().includes("donut") ? (
            <PieChart>
              <Pie data={chart.data} cx="50%" cy="50%" innerRadius={chart.chartType.includes("donut") ? 70 : 0} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                {chart.data.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <RechartsTooltip content={<PremiumTooltip />}/>
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }} iconType="circle" />
            </PieChart>
          ) : (
            <BarChart data={chart.data} layout={chart.chartType.includes("horizontal") ? "vertical" : "horizontal"} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={!chart.chartType.includes("horizontal")} horizontal={chart.chartType.includes("horizontal")} />
              <XAxis type={chart.chartType.includes("horizontal") ? "number" : "category"} dataKey={chart.chartType.includes("horizontal") ? undefined : "name"} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis type={chart.chartType.includes("horizontal") ? "category" : "number"} dataKey={chart.chartType.includes("horizontal") ? "name" : undefined} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <RechartsTooltip cursor={{fill: '#F8FAFC'}} content={<PremiumTooltip />} />
              <Bar dataKey="value" fill={COLORS[idx % COLORS.length]} radius={[6, 6, 6, 6]} barSize={32} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ForecastCard({ forecast }: { forecast: any }) {
  if (!forecast) return null;
  
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/60 p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="font-extrabold text-lg text-indigo-950">AI Forecasting Center</h3>
          <p className="text-xs text-indigo-500/80 font-medium mt-1">Expected Outcome Analysis</p>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-100/50 text-indigo-600 border border-indigo-200/50">
          <TrendingUp size={18} />
        </div>
      </div>
      
      <div className="space-y-4 relative z-10">
        <p className="text-sm text-indigo-900/70 font-medium leading-relaxed">
          {forecast.description}
        </p>
        <div className="p-4 bg-white/60 backdrop-blur-sm border border-white rounded-[20px] flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Projected Trend</p>
            <p className="text-xl font-extrabold text-indigo-950">Positive Growth</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Confidence Interval</p>
             <p className="text-xl font-extrabold text-emerald-600">89%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
