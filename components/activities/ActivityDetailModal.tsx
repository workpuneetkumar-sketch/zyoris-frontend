"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  User,
  Building2,
  FileText,
  Phone,
  Mail,
  Users,
  MessageCircle,
  LayoutList,
  ExternalLink,
} from "lucide-react";
import { Activity, ActivityType, ActivityStatus, ActivityPriority } from "@/types/activities";
import { sanitizeSourcePageText, extractSourcePageInfo } from "@/lib/utils/sourcePageSanitizer";

interface ActivityDetailModalProps {
  isOpen: boolean;
  activity: Activity | null;
  onClose: () => void;
}

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  Task: <LayoutList size={14} />,
  Call: <Phone size={14} />,
  Meeting: <Users size={14} />,
  Email: <Mail size={14} />,
  Note: <FileText size={14} />,
  WhatsApp: <MessageCircle size={14} />,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  Task: "bg-blue-50 text-blue-600 border-blue-200",
  Call: "bg-green-50 text-green-600 border-green-200",
  Meeting: "bg-violet-50 text-violet-600 border-violet-200",
  Email: "bg-amber-50 text-amber-600 border-amber-200",
  Note: "bg-slate-50 text-slate-600 border-slate-200",
  WhatsApp: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const STATUS_STYLES: Record<ActivityStatus, string> = {
  Upcoming: "bg-blue-50 text-blue-600 border border-blue-200",
  Completed: "bg-green-50 text-green-600 border border-green-200",
  Overdue: "bg-red-50 text-red-500 border border-red-200",
};

const PRIORITY_STYLES: Record<ActivityPriority, string> = {
  High: "bg-red-50 text-red-500 border border-red-200",
  Medium: "bg-amber-50 text-amber-600 border border-amber-200",
  Low: "bg-green-50 text-green-600 border border-green-200",
};

export function ActivityDetailModal({
  isOpen,
  activity,
  onClose,
}: ActivityDetailModalProps) {
  if (!isOpen || !activity) return null;

  const { sourcePageId, sourcePageTitle } = extractSourcePageInfo(activity);
  const displayTitle = sanitizeSourcePageText(activity.title, sourcePageTitle) || "Activity Details";
  const displayDescription = sanitizeSourcePageText(activity.description, sourcePageTitle);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Activity Details"
    >
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                TYPE_COLORS[activity.type] || "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {TYPE_ICONS[activity.type] || <FileText size={14} />}
              {activity.type}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Activity Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Title */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {displayTitle}
            </h3>
          </div>

          {/* Description */}
          {displayDescription && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Description / Notes
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {displayDescription}
              </p>
            </div>
          )}

          {/* Source Page (Clickable Link, Clean Title) */}
          {sourcePageId && (
            <div className="flex items-center justify-between p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
              <div className="flex items-center gap-2 text-xs">
                <FileText size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">
                    Source Page
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {sourcePageTitle || "Workspace Page"}
                  </p>
                </div>
              </div>
              <Link
                href={`/workspace/pages/${sourcePageId}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold shadow-2xs transition"
              >
                <span>Open Page</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          )}

          {/* Status & Priority Grid */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Status
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  STATUS_STYLES[activity.status] || "bg-slate-100 text-slate-600"
                }`}
              >
                {activity.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Priority
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  PRIORITY_STYLES[activity.priority] || "bg-slate-100 text-slate-600"
                }`}
              >
                {activity.priority}
              </span>
            </div>
          </div>

          {/* Details Metadata Grid */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Owner */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Assigned / Owner</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center">
                  {activity.ownerAvatar || activity.owner?.[0] || "U"}
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activity.owner || "User"}
                </span>
              </div>
            </div>

            {/* Related Contact */}
            {activity.relatedTo && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Related Contact</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activity.relatedTo}
                </span>
              </div>
            )}

            {/* Related Company */}
            {activity.relatedToCompany && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Related Company</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activity.relatedToCompany}
                </span>
              </div>
            )}

            {/* Due Date & Time */}
            {(activity.dueDate || activity.dueTime) && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Due Time</span>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{activity.dueDate}</span>
                  {activity.dueTime && (
                    <>
                      <span className="text-slate-300">at</span>
                      <Clock size={13} className="text-slate-400" />
                      <span>{activity.dueTime}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Created Timestamp */}
            {activity.createdAt && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Created</span>
                <span className="text-slate-500 font-medium">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
