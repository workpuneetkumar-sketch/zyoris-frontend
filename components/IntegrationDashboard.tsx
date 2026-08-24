"use client";

import React, { useState } from "react";

// Types matching Ayush's backend schema
interface SyncLog {
  id: string;
  source: string;
  status: "SUCCESS" | "RUNNING" | "FAILED";
  recordsProcessed: number;
  timestamp: string;
  errorMessage?: string;
}

export default function IntegrationDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs">("dashboard");

  // Sample data simulating backend state
  const logs: SyncLog[] = [
    {
      id: "SYNC-8921",
      source: "REST Connector",
      status: "SUCCESS",
      recordsProcessed: 1250,
      timestamp: "2026-08-25 02:15:00",
    },
    {
      id: "SYNC-8922",
      source: "Schema Inference",
      status: "RUNNING",
      recordsProcessed: 450,
      timestamp: "2026-08-25 02:30:12",
    },
    {
      id: "SYNC-8923",
      source: "BullMQ Pipeline",
      status: "FAILED",
      recordsProcessed: 12,
      timestamp: "2026-08-25 02:34:00",
      errorMessage: "Field mapping failure at record #13",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Integration Dashboard</h1>
          <p className="text-sm text-slate-500">
            Group 2 — Ayush (Backend Engine) ↔ Moulika (UI)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === "logs"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Sync Logs & Retries
          </button>
        </div>
      </div>

      {activeTab === "dashboard" ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Active Pipelines
              </span>
              <div className="text-2xl font-bold mt-1 text-slate-800">1 Running</div>
            </div>
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Total Records Synced
              </span>
              <div className="text-2xl font-bold mt-1 text-slate-800">1,712</div>
            </div>
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Error Rate
              </span>
              <div className="text-2xl font-bold mt-1 text-red-600">1 Failed</div>
            </div>
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Engine Status
              </span>
              <div className="text-2xl font-bold mt-1 text-green-600">Healthy</div>
            </div>
          </div>

          {/* Sync Progress Indicator (BullMQ Job) */}
          <div className="p-5 bg-white border rounded-xl shadow-sm space-y-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>Active BullMQ Sync Job: Schema Inference</span>
              <span className="text-blue-600">45% Completed</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-[45%] transition-all duration-300"></div>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Status: Processing records...</span>
              <span>450 / 1000 items</span>
            </div>
          </div>
        </>
      ) : (
        /* Sync Logs & Retry Table */
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 font-medium">
              <tr>
                <th className="p-4">Sync ID</th>
                <th className="p-4">Source Component</th>
                <th className="p-4">Status</th>
                <th className="p-4">Records</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-medium">{log.id}</td>
                  <td className="p-4">{log.source}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        log.status === "SUCCESS"
                          ? "bg-green-100 text-green-700"
                          : log.status === "RUNNING"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4">{log.recordsProcessed}</td>
                  <td className="p-4 text-slate-500">{log.timestamp}</td>
                  <td className="p-4 text-right">
                    {log.status === "FAILED" && (
                      <button
                        onClick={() => alert(`Retrying job ${log.id}...`)}
                        className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 text-xs font-semibold"
                      >
                        Retry UI
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}