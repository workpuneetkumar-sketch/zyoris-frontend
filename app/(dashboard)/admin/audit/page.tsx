"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getAuditLogs, getAuditLog, AuditLog } from "@/lib/api/auditApi";
import { toast } from "react-toastify";
import { AccessDenied } from "@/components/ui/AccessDenied";
import {
  FileSearch,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Clock,
  Tag,
  Info,
} from "lucide-react";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function ActionBadge({ action }: { action: string }) {
  const color = action.includes("DELETE")
    ? "bg-red-50 text-red-700 border-red-200"
    : action.includes("CREATE") || action.includes("ASSIGN")
      ? "bg-green-50 text-green-700 border-green-200"
      : action.includes("UPDATE") || action.includes("PATCH")
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <span className={`inline-block border text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {action}
    </span>
  );
}

function formatFieldLabel(key: string): string {
  const map: Record<string, string> = {
    taskId: "Task Reference",
    entityId: "Record Reference",
    entityType: "Target Type",
    newAssigneeId: "New Assignee",
    previousAssigneeId: "Previous Assignee",
    assigneeId: "Assignee",
    dealId: "Deal Reference",
    leadId: "Lead Reference",
    userId: "User Reference",
    organizationId: "Organization",
    status: "Status",
    previousStatus: "Previous Status",
    newStatus: "New Status",
    reason: "Reason",
    amount: "Amount",
    notes: "Notes",
    title: "Title",
    name: "Name",
    role: "Role",
    ipAddress: "IP Address",
    userAgent: "User Agent",
  };

  if (map[key]) return map[key];

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(key: string, val: any): React.ReactNode {
  if (val === null || val === undefined) {
    return <span className="text-gray-400 italic">None</span>;
  }
  if (typeof val === "boolean") {
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${val ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
        {val ? "Yes" : "No"}
      </span>
    );
  }
  if (typeof val === "number") {
    return <span className="font-medium text-gray-800">{val.toLocaleString()}</span>;
  }
  if (typeof val === "string") {
    const isIdField = /id$/i.test(key) || key === "taskId" || key === "entityId";
    if (isIdField && val.length > 12) {
      return (
        <span className="inline-flex items-center font-mono text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {val.slice(0, 8)}…{val.slice(-4)}
        </span>
      );
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      return <span className="text-gray-700 text-xs">{formatDate(val)}</span>;
    }
    return <span className="text-gray-800 text-xs break-words">{val}</span>;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-gray-400 italic">Empty</span>;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {val.map((item, idx) => (
          <span key={idx} className="bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded">
            {typeof item === "object" ? formatFieldValue(key, item) : String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof val === "object") {
    return (
      <div className="space-y-1.5 pl-2 border-l-2 border-gray-100 mt-1">
        {Object.entries(val).map(([subKey, subVal]) => (
          <div key={subKey} className="text-xs">
            <span className="text-gray-500 font-medium">{formatFieldLabel(subKey)}: </span>
            {formatFieldValue(subKey, subVal)}
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-gray-800 text-xs">{String(val)}</span>;
}

function StructuredMetadataView({ metadata }: { metadata?: Record<string, any> | null }) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <p className="text-xs text-gray-400 italic bg-gray-50 rounded-lg px-3 py-2.5">
        No additional context recorded for this event.
      </p>
    );
  }

  const entries = Object.entries(metadata);

  return (
    <div className="bg-gray-50/70 border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
      {entries.map(([key, val]) => (
        <div key={key} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs">
          <span className="text-gray-500 font-medium shrink-0">
            {formatFieldLabel(key)}
          </span>
          <div className="text-left sm:text-right sm:max-w-[65%]">
            {formatFieldValue(key, val)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const { user, isInitializing } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  if (!isInitializing && user && !isAdmin) {
    return <AccessDenied />;
  }

  return <AuditContent />;
}

function AuditContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogs(p, PAGE_SIZE);
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs(page);
    }
  }, [isAdmin, page, fetchLogs]);

  async function openDetail(log: AuditLog) {
    setDetailLog(log);
    setDetailLoading(true);
    try {
      const full = await getAuditLog(log.id);
      setDetailLog(full);
    } catch {
      // Use the list data if detail fetch fails
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-2 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <FileSearch size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500">
              {total > 0 ? `${total.toLocaleString()} events recorded` : "System activity log"}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileSearch size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No audit logs yet</p>
          <p className="text-sm mt-1">Actions will appear here once users start interacting.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Action
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    User
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">
                    When
                  </th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDetail(log)}
                  >
                    <td className="px-5 py-3.5">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-5 py-3.5">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-gray-900 text-xs">{log.user.name}</p>
                          <p className="text-xs text-gray-400">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 hidden md:table-cell whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Info size={14} className="text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Detail Panel ── */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => !detailLoading && setDetailLog(null)}
          />
          <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Log Detail</h2>
                <p className="text-xs text-gray-400 mt-0.5">Event Details</p>
              </div>
              <button
                onClick={() => setDetailLog(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-emerald-500" />
                </div>
              ) : (
                <>
                  {/* Action */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      <Tag size={12} /> Action
                    </div>
                    <ActionBadge action={detailLog.action} />
                  </div>

                  {/* User */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      <User size={12} /> User
                    </div>
                    {detailLog.user ? (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <p className="text-sm font-medium text-gray-900">{detailLog.user.name}</p>
                        <p className="text-xs text-gray-400">{detailLog.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">System</span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      <Clock size={12} /> Timestamp
                    </div>
                    <p className="text-sm text-gray-700">{formatDate(detailLog.createdAt)}</p>
                  </div>

                  {/* Metadata / Details */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                      <Info size={12} /> Event Details
                    </div>
                    <StructuredMetadataView metadata={detailLog.metadata} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
