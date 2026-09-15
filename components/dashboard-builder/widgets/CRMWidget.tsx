"use client";
// components/dashboard-builder/widgets/CRMWidget.tsx
// Shows lead funnel + recent activity

const STAGES = [
  { label: "New Leads", count: 142, pct: 100, color: "#6366f1" },
  { label: "Contacted", count: 98, pct: 69, color: "#8b5cf6" },
  { label: "Qualified", count: 67, pct: 47, color: "#a78bfa" },
  { label: "Proposal", count: 34, pct: 24, color: "#c4b5fd" },
  { label: "Won", count: 18, pct: 13, color: "#10b981" },
];

const RECENT = [
  { name: "Acme Corp", stage: "Proposal", time: "2m ago" },
  { name: "TechFlow", stage: "Qualified", time: "14m ago" },
  { name: "BlueStar", stage: "Won", time: "1h ago" },
];

export function CRMWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Funnel */}
      <div className="space-y-1.5">
        {STAGES.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <p className="text-[10px] text-gray-500 w-16 flex-shrink-0">{s.label}</p>
            <div className="flex-1 h-1.5 rounded-full bg-gray-100">
              <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
            </div>
            <p className="text-[10px] font-bold text-gray-700 w-6 text-right">{s.count}</p>
          </div>
        ))}
      </div>
      {/* Divider */}
      <div className="h-px bg-gray-100" />
      {/* Recent */}
      <div className="flex-1 overflow-hidden space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recent</p>
        {RECENT.map((r) => (
          <div key={r.name} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-800">{r.name}</p>
              <p className="text-[10px] text-gray-400">{r.stage}</p>
            </div>
            <p className="text-[10px] text-gray-400">{r.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
