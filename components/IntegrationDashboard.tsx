"use client";

import React, { useState } from "react";

// Domain interface for Sync Log items matching the backend schema
export interface SyncLog {
  id: string;
  source: string;
  status: "SUCCESS" | "RUNNING" | "FAILED";
  recordsProcessed: number;
  timestamp: string;
  errorMessage?: string;
}

export default function IntegrationDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs">("dashboard");

  // Mock initial data simulating backend response
  const [logs, setLogs] = useState<SyncLog[]>([
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
  ]);

  // Handler for triggering manual job retries
  const handleRetry = (syncId: string) => {
    setLogs((prevLogs) =>
      prevLogs.map((log) =>
        log.id === syncId ? { ...log, status: "RUNNING" } : log
      )
    );
    // TODO: Wire with backend API call next week: integrationApi.retrySync(syncId)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-foreground bg-background">
      {/* Header Section */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integration Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Group 2 — Ayush (Backend Engine) ↔ Moulika (UI)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "dashboard"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "logs"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
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
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Active Pipelines
              </span>
              <div className="text-2xl font-bold mt-1 text-card-foreground">1 Running</div>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Total Records Synced
              </span>
              <div className="text-2xl font-bold mt-1 text-card-foreground">1,712</div>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Error Rate
              </span>
              <div className="text-2xl font-bold mt-1 text-destructive">1 Failed</div>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Engine Status
              </span>
              <div className="text-2xl font-bold mt-1 text-emerald-600">Healthy</div>
            </div>
          </div>

          {/* Sync Progress Indicator (BullMQ Background Job) */}
          <div className="p-5 bg-card border border-border rounded-xl shadow-sm space-y-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>Active BullMQ Sync Job: Schema Inference</span>
              <span className="text-primary">45% Completed</span>
            </div>
            <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[45%] transition-all duration-300"></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Status: Processing records...</span>
              <span>450 / 1000 items</span>
            </div>
          </div>
        </>
      ) : (
        /* Sync Logs & Retry Table */
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
              <tr>
                <th className="p-4">Sync ID</th>
                <th className="p-4">Source Component</th>
                <th className="p-4">Status</th>
                <th className="p-4">Records</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-mono font-medium">{log.id}</td>
                  <td className="p-4">{log.source}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.status === "RUNNING"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4">{log.recordsProcessed}</td>
                  <td className="p-4 text-muted-foreground">{log.timestamp}</td>
                  <td className="p-4 text-right">
                    {log.status === "FAILED" && (
                      <button
                        onClick={() => handleRetry(log.id)}
                        className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 text-xs font-semibold transition-colors"
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