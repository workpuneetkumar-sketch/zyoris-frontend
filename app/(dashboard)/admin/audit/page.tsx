"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getAuditLogs, getAuditLog, AuditLog } from "@/lib/api/auditApi";
import { toast } from "react-toastify";
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

export default function AuditPage() {
  const { user, isInitializing } = useAuth();
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

  // Guard: ADMIN only — wait for initialization
  useEffect(() => {
    if (!isInitializing && user && user.role !== "ADMIN") {
      router.push("/admin");
    }
  }, [user, isInitializing, router]);

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
    fetchLogs(page);
  }, [page, fetchLogs]);

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
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{detailLog.id.slice(0, 16)}…</p>
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
                        <p className="text-xs text-gray-300 font-mono mt-0.5">{detailLog.user.id}</p>
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

                  {/* Metadata */}
                  {detailLog.metadata && Object.keys(detailLog.metadata).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        <Info size={12} /> Metadata
                      </div>
                      <pre className="bg-gray-50 rounded-lg px-3 py-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(detailLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
