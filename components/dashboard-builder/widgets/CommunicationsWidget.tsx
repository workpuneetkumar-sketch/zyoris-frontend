"use client";
// components/dashboard-builder/widgets/CommunicationsWidget.tsx

import { Mail, Phone, MessageSquare, ArrowUp, ArrowDown } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

const CHANNELS = [
  { name: "Email", sent: 284, replied: 198, rate: 70, color: "#3b82f6", icon: Mail },
  { name: "Calls", sent: 142, replied: 98, rate: 69, color: "#10b981", icon: Phone },
  { name: "WhatsApp", sent: 97, replied: 81, rate: 83, color: "#25d366", icon: MessageSquare },
];

const radialData = CHANNELS.map((c) => ({ name: c.name, value: c.rate, fill: c.color }));

export function CommunicationsWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.name} className="text-center">
              <div className="w-8 h-8 rounded-xl mx-auto flex items-center justify-center mb-1" style={{ backgroundColor: c.color + "18" }}>
                <Icon size={14} style={{ color: c.color }} />
              </div>
              <p className="text-sm font-extrabold text-gray-900">{c.sent}</p>
              <p className="text-[9px] text-gray-400">{c.name}</p>
              <p className="text-[10px] font-bold" style={{ color: c.color }}>{c.rate}% reply</p>
            </div>
          );
        })}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="30%"
            outerRadius="90%"
            data={radialData}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#f1f5f9" }} />
            <Tooltip
              formatter={(v: number) => [`${v}%`, "Reply Rate"]}
              contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
