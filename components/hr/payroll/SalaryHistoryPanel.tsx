"use client";

import React from "react";
import { X, TrendingUp, ArrowUpRight, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { SalaryHistoryEntry } from "@/lib/api/payrollApi";

interface SalaryHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  designation: string;
  department: string;
  history: SalaryHistoryEntry[];
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function formatMonthShort(monthStr: string): string {
  const [, month] = monthStr.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return monthNames[parseInt(month) - 1] || monthStr;
}

export default function SalaryHistoryPanel({
  isOpen,
  onClose,
  employeeName,
  designation,
  department,
  history,
}: SalaryHistoryPanelProps) {
  if (!isOpen) return null;

  const chartData = history.map((h) => ({
    month: formatMonthShort(h.month),
    netPay: h.netPay,
    gross: h.grossEarnings,
    basic: h.basicSalary,
  }));

  const latestNet = history.length > 0 ? history[history.length - 1].netPay : 0;
  const previousNet = history.length > 1 ? history[history.length - 2].netPay : 0;
  const growthPct =
    previousNet > 0
      ? (((latestNet - previousNet) / previousNet) * 100).toFixed(1)
      : "0.0";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
          <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
          {payload.map((item: any, idx: number) => (
            <p key={idx} className="text-gray-600">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: item.color }}
              />
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Salary History</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {employeeName
                  .split(" ")
                  .map((p) => p[0]?.toUpperCase() || "")
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {employeeName}
                </p>
                <p className="text-xs text-gray-400">
                  {designation} · {department}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">
                Current Net Pay
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(latestNet)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp size={12} />
                Growth
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-1">
                {growthPct}%
                <ArrowUpRight
                  size={16}
                  className={
                    parseFloat(growthPct) >= 0
                      ? "text-emerald-500"
                      : "text-red-500"
                  }
                />
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Net Pay Trend
            </p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="netPayGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="netPay"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#netPayGrad)"
                    name="Net Pay"
                    dot={{ r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Month-wise Breakdown */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Monthly Breakdown
            </p>
            <div className="space-y-2">
              {[...history].reverse().map((entry, idx) => (
                <div
                  key={entry.month}
                  className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${
                    idx === 0
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">
                        {formatMonth(entry.month)}
                      </span>
                      {entry.incrementPercentage && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                          <ArrowUpRight size={10} />
                          +{entry.incrementPercentage}% Increment
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        entry.paymentStatus === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {entry.paymentStatus === "PAID" ? "Paid" : "Pending"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Basic</p>
                      <p className="font-semibold text-gray-700">
                        {formatCurrency(entry.basicSalary)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Gross</p>
                      <p className="font-semibold text-gray-700">
                        {formatCurrency(entry.grossEarnings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Deductions</p>
                      <p className="font-semibold text-red-500">
                        -{formatCurrency(entry.totalDeductions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Net Pay</p>
                      <p className="font-bold text-gray-900">
                        {formatCurrency(entry.netPay)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
