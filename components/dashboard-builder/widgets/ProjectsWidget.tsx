"use client";
// components/dashboard-builder/widgets/ProjectsWidget.tsx

const PROJECTS = [
  { name: "CRM Integration", progress: 78, status: "On Track", color: "#10b981", due: "Aug 15" },
  { name: "Mobile App v2", progress: 54, status: "At Risk", color: "#f59e0b", due: "Jul 30" },
  { name: "Data Pipeline", progress: 92, status: "On Track", color: "#10b981", due: "Aug 5" },
  { name: "Marketing Site", progress: 31, status: "Behind", color: "#ef4444", due: "Sep 1" },
];

const STATUS_COLORS: Record<string, string> = {
  "On Track": "text-emerald-600 bg-emerald-50 border-emerald-100",
  "At Risk": "text-amber-600 bg-amber-50 border-amber-100",
  "Behind": "text-red-600 bg-red-50 border-red-100",
};

export function ProjectsWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {PROJECTS.map((p) => (
        <div key={p.name} className="flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-800 truncate mr-2">{p.name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[9px] text-gray-400">{p.due}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[p.status]}`}>{p.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${p.progress}%`, backgroundColor: p.color }}
              />
            </div>
            <p className="text-[10px] font-bold text-gray-600 w-8 text-right">{p.progress}%</p>
          </div>
        </div>
      ))}
    </div>
  );
}
