"use client";

export interface DataSenseReportData {
  datasetType: string;
  section1_datasetOverview: string;
  section2_performanceAnalysis: string;
  section3_issuesWeaknesses: string;
  section4_dataQualityAssessment: string;
  section5_improvementRecommendations: string;
  section6_riskAssessment: string;
  section7_executiveSummary: string;
}

const SECTIONS: { key: keyof DataSenseReportData; title: string }[] = [
  { key: "section1_datasetOverview", title: "📊 Dataset Overview" },
  { key: "section2_performanceAnalysis", title: "📈 Performance Analysis" },
  { key: "section3_issuesWeaknesses", title: "⚠ Issues & Weaknesses" },
  { key: "section4_dataQualityAssessment", title: "🧹 Data Quality Assessment" },
  { key: "section5_improvementRecommendations", title: "🚀 Improvement Recommendations" },
  { key: "section6_riskAssessment", title: "🔎 Risk Assessment" },
  { key: "section7_executiveSummary", title: "📌 Executive Summary" },
];

import { BrainCircuit, Target, Lightbulb, AlertCircle } from "lucide-react";

export function DataSenseReport({ report }: { report: any }) {
  const icons: any = {
    executive_summary: <BrainCircuit className="text-blue-600" />,
    key_findings: <Target className="text-indigo-600" />,
    opportunities: <Lightbulb className="text-amber-500" />,
    risks: <AlertCircle className="text-red-500" />,
  };

  return (
    <div className="mt-12 bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-inner">
      <div className="bg-white px-8 py-6 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <BrainCircuit size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Intelligence Report</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-tighter">
              DataSense AI · Senior Analyst Mode
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-semibold border border-slate-200">
            Dataset: {report.datasetType.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.entries(report).map(([key, content]: any) => {
          if (typeof content !== "string" || key === "datasetType") return null;

          return (
            <div key={key} className="bg-white/50 border border-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                {icons[key] || <Lightbulb size={20} className="text-blue-500" />}
                <h3 className="text-sm font-bold text-slate-800 capitalize">
                  {key.replace("_", " ")}
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                "{content}"
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
