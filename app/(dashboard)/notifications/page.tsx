"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { Bell, CheckCheck, Info, Trash2, Check, BellRing } from "lucide-react";
import classNames from "classnames";
import Link from "next/link";

export default function NotificationsPage() {
  const {
    notifications,
    loading,
    error,
    unreadCount,
    markRead,
    markAllRead,
    removeNotification,
  } = useNotifications();

  const typeColor: Record<string, string> = {
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
  };

  const typeBg: Record<string, string> = {
    info: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    error: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header section with gradient and stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            Notifications
            {unreadCount > 0 ? (
              <BellRing size={24} className="text-blue-600 animate-bounce" strokeWidth={2.5} />
            ) : (
              <Bell size={24} className="text-gray-400" strokeWidth={2.5} />
            )}
          </h1>
          <p className="text-base text-gray-500 font-medium">
            You have <strong className={unreadCount > 0 ? "text-blue-600" : "text-gray-600"}>{unreadCount}</strong> unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm font-bold shadow-sm active:scale-95"
          >
            <CheckCheck size={18} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-24 flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg" />
          </div>
        ) : error ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Info size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Oops, something went wrong</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-24 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-gray-50">
              <Bell size={48} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">You're all caught up!</h3>
            <p className="text-base text-gray-500 mt-2 font-medium max-w-sm">No new notifications at the moment. Take a break or check back later.</p>
            <Link href="/dashboard" className="mt-8 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors active:scale-95">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/50">
            {notifications.map((notification) => {
              const colorClass = typeColor[notification.type ?? "info"] || typeColor.info;
              const bgClass = typeBg[notification.type ?? "info"] || typeBg.info;

              return (
                <div
                  key={notification.id}
                  className={classNames(
                    "group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 transition-all duration-300 hover:bg-gray-50/80",
                    !notification.read ? "bg-blue-50/40" : "bg-transparent"
                  )}
                >
                  {/* Unread indicator line */}
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  )}

                  <div className="flex items-start gap-4 flex-1 min-w-0 pl-2">
                    <div
                      className={classNames(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-white/50",
                        bgClass
                      )}
                    >
                      <Info size={22} strokeWidth={2.5} />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4
                          className={classNames(
                            "text-base font-bold tracking-tight truncate",
                            notification.read ? "text-gray-700" : "text-gray-900"
                          )}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-pulse" />
                        )}
                      </div>
                      <p className="text-[15px] text-gray-500 leading-relaxed break-words font-medium">
                        {notification.message}
                      </p>
                      <p className="text-[13px] text-gray-400 mt-2.5 font-semibold flex items-center gap-1.5">
                        {new Date(notification.createdAt).toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center pr-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    {!notification.read && (
                      <button
                        onClick={() => markRead(notification.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100 active:scale-95"
                        title="Mark as read"
                      >
                        <Check size={18} strokeWidth={2.5} />
                        <span className="sm:hidden">Mark as read</span>
                      </button>
                    )}
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100 active:scale-95"
                      title="Delete notification"
                    >
                      <Trash2 size={18} strokeWidth={2.5} />
                      <span className="sm:hidden">Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
