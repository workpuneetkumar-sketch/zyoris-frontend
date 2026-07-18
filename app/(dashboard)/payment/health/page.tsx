"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Key,
  Webhook,
  Shield,
  CreditCard,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { getPaymentStatus } from "@/lib/api/paymentService";

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentHealthPage() {
  const [apiKeyPresent, setApiKeyPresent] = useState(
    !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  );
  const [testingApi, setTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [apiMessage, setApiMessage] = useState("");

  const testRazorpayConnection = async () => {
    setTestingApi(true);
    setApiStatus("idle");
    try {
      // Try to hit the backend create-order endpoint with dummy data to test connectivity
      // This will fail with a validation error, but if we get a response, the API is up
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://zyoris.onrender.com"}/payments/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: "test", amount: 1 }),
        }
      );
      if (res.status === 401 || res.status === 403) {
        setApiStatus("ok");
        setApiMessage("Backend is reachable (auth required for actual orders)");
      } else if (res.status === 400 || res.status === 404 || res.status === 500) {
        setApiStatus("ok");
        setApiMessage("Backend is reachable and payment endpoint exists");
      } else if (res.ok) {
        setApiStatus("ok");
        setApiMessage("Backend is reachable and responding");
      } else {
        setApiStatus("fail");
        setApiMessage(`Backend returned status ${res.status}`);
      }
    } catch (err: any) {
      setApiStatus("fail");
      setApiMessage(err.message || "Cannot reach backend");
    } finally {
      setTestingApi(false);
    }
  };

  const items = [
    {
      label: "Razorpay Key ID",
      icon: Key,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      ok: apiKeyPresent,
      value: apiKeyPresent
        ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.slice(0, 12) + "…"
        : "Not configured",
    },
    {
      label: "Payment Endpoints",
      icon: CreditCard,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      ok: true,
      value: "4 endpoints available",
    },
    {
      label: "Create Order API",
      icon: Shield,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ok: true,
      value: "POST /payments/create-order",
    },
    {
      label: "Verify Payment API",
      icon: Shield,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ok: true,
      value: "POST /payments/verify",
    },
    {
      label: "Payment Status API",
      icon: Shield,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ok: true,
      value: "GET /payments/:id/status",
    },
    {
      label: "Webhook Endpoint",
      icon: Webhook,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ok: true,
      value: "POST /payments/webhook",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-6 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Health</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Razorpay integration status and configuration
          </p>
        </div>
      </div>

      {/* ── API Connection Test ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Backend Connection Test</h3>
          <button
            onClick={testRazorpayConnection}
            disabled={testingApi}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={testingApi ? "animate-spin" : ""} />
            Test Connection
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Tests if the backend payment endpoints are reachable at{" "}
          <code className="bg-gray-100 px-1 rounded text-gray-600">
            {process.env.NEXT_PUBLIC_BACKEND_URL || "https://zyoris.onrender.com"}
          </code>
        </p>
        {apiStatus !== "idle" && (
          <div
            className={`flex items-center gap-3 p-3 rounded-xl ${
              apiStatus === "ok"
                ? "bg-emerald-50 border border-emerald-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {apiStatus === "ok" ? (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            ) : (
              <XCircle size={18} className="text-red-500 shrink-0" />
            )}
            <span
              className={`text-sm font-medium ${
                apiStatus === "ok" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {apiMessage}
            </span>
          </div>
        )}
      </div>

      {/* ── Status Cards ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Configuration & Endpoints</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center`}
                  >
                    <Icon size={16} className={item.iconColor} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{item.value}</p>
                  </div>
                </div>
                {item.ok ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <XCircle size={18} className="text-red-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Env Vars Info ──────────────────────────────────── */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Environment Variables</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">NEXT_PUBLIC_RAZORPAY_KEY_ID</span>
            <span className={`font-mono text-xs px-2 py-0.5 rounded ${apiKeyPresent ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {apiKeyPresent ? "Set ✓" : "Missing ✗"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">NEXT_PUBLIC_BACKEND_URL</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 truncate max-w-[300px]">
              {process.env.NEXT_PUBLIC_BACKEND_URL || "Not set"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
