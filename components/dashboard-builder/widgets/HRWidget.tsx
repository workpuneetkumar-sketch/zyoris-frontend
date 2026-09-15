"use client";
// components/dashboard-builder/widgets/HRWidget.tsx

const STATS = [
  { label: "Total Employees", value: "248", sub: "+3 this month", color: "#6366f1" },
  { label: "On Leave", value: "12", sub: "4.8% absence rate", color: "#f59e0b" },
  { label: "Open Positions", value: "7", sub: "Hiring active", color: "#8b5cf6" },
];

const DEPT_DATA = [
  { dept: "Engineering", pct: 35, color: "#6366f1" },
  { dept: "Sales", pct: 25, color: "#10b981" },
  { dept: "Marketing", pct: 15, color: "#f59e0b" },
  { dept: "Operations", pct: 15, color: "#8b5cf6" },
  { dept: "Finance", pct: 10, color: "#ec4899" },
];

export function HRWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-3 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">By Department</p>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {DEPT_DATA.map((d) => (
          <div key={d.dept} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <p className="text-[10px] text-gray-600 w-20 flex-shrink-0">{d.dept}</p>
            <div className="flex-1 h-1.5 rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
            </div>
            <p className="text-[10px] font-bold text-gray-600 w-7 text-right">{d.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
