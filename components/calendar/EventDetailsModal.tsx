"use client";

import React from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import {
  formatTimeDisplay,
  calculateDuration,
  parseDateSafe,
} from "@/lib/api/calendarService";
import { getCategoryToken, DEPARTMENT_CALENDAR_TOKENS } from "./calendarTheme";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  Edit2,
  Trash2,
  ExternalLink,
  Building,
  MapPin,
  CloudOff,
  Repeat,
  Bell,
  Lock,
} from "lucide-react";

interface EventDetailsModalProps {
  event: UnifiedCalendarEvent | null;
  onClose: () => void;
  onEdit: (event: UnifiedCalendarEvent) => void;
  onDelete?: (id: string) => Promise<void>;
  onUpdateRsvp?: (
    eventId: string,
    participantIndex: number,
    rsvp: "attending" | "tentative" | "declined"
  ) => void;
}

export default function EventDetailsModal({
  event,
  onClose,
  onEdit,
  onDelete,
  onUpdateRsvp,
}: EventDetailsModalProps) {
  if (!event) return null;

  const dur = event.allDay
    ? "All Day"
    : calculateDuration(event.startTime, event.endTime);
  const token = getCategoryToken(event.category, event.customColor);
  const deptToken =
    DEPARTMENT_CALENDAR_TOKENS[event.department] ||
    DEPARTMENT_CALENDAR_TOKENS.company;
  const isPendingSync = event.syncStatus === "pending_sync";
  const parsedDate = parseDateSafe(event.date);

  const handleDelete = async () => {
    if (!onDelete) return;
    const targetId = event.masterEventId || event.id;
    if (confirm("Are you sure you want to delete this event?")) {
      await onDelete(targetId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Accent Strip */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: token.accent }}
        />

        {/* Header */}
        <div className="p-6 bg-white border-b border-[#F1F3F5] relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-[#919EAB] hover:text-[#212B36] hover:bg-[#F4F6F8] rounded-lg transition-colors"
            aria-label="Close details"
          >
            <X size={18} />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2.5 pr-8">
            <span
              className="px-2.5 py-0.5 rounded-md text-[11px] font-bold"
              style={{
                backgroundColor: token.bg,
                color: token.text,
              }}
            >
              {token.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F4F6F8] text-[#637381] text-[11px] font-semibold">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: deptToken.color }}
              />
              {deptToken.label}
            </span>
            {event.recurrence && event.recurrence !== "none" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F6F8] text-[#637381] text-[10px] font-semibold capitalize">
                <Repeat size={10} />
                {event.recurrence}
              </span>
            )}
          </div>

          <h3 className="text-[20px] font-bold text-[#212B36] tracking-tight leading-snug mb-2">
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#637381] font-medium">
            <span className="flex items-center gap-1.5">
              <CalendarIcon size={13} style={{ color: token.accent }} />
              {parsedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-[#E2E8F0]">•</span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} style={{ color: token.accent }} />
              {event.allDay
                ? "All Day"
                : `${formatTimeDisplay(event.startTime)} – ${formatTimeDisplay(
                    event.endTime
                  )} (${dur})`}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {isPendingSync && (
            <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <CloudOff size={16} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">
                  Saved locally – waiting for server connection
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Your event is preserved in browser storage and will remain
                  available across reloads.
                </p>
              </div>
            </div>
          )}

          {/* Join Call Banner */}
          {event.meetingLink && (
            <div className="p-3.5 bg-[#F4F6F8] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0"
                  style={{ backgroundColor: token.accent }}
                >
                  <Video size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#212B36]">
                    Video Meeting Link
                  </p>
                  <p className="text-[11px] text-[#637381] truncate">
                    {event.meetingLink}
                  </p>
                </div>
              </div>
              <a
                href={event.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-[#1C252E] hover:bg-[#28323D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0"
              >
                <span>Join</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Location & Room */}
          {(event.room || event.location) && (
            <div className="flex flex-col gap-2 p-3 bg-[#F4F6F8] rounded-xl border border-[#E2E8F0]/80 text-xs">
              {event.room && (
                <div className="flex items-center gap-2 text-[#212B36]">
                  <Building
                    size={15}
                    className="shrink-0"
                    style={{ color: token.accent }}
                  />
                  <div>
                    <span className="font-semibold">Room:</span>{" "}
                    <span className="text-[#637381]">{event.room}</span>
                  </div>
                </div>
              )}
              {event.location && event.location !== event.room && (
                <div className="flex items-center gap-2 text-[#212B36]">
                  <MapPin
                    size={15}
                    className="shrink-0"
                    style={{ color: token.accent }}
                  />
                  <div>
                    <span className="font-semibold">Location:</span>{" "}
                    <span className="text-[#637381]">{event.location}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider mb-1.5">
                Description & Agenda
              </h4>
              <p className="text-xs text-[#212B36] leading-relaxed bg-[#F4F6F8] p-3.5 rounded-xl border border-[#E2E8F0]/70 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Participants */}
          {event.participants && event.participants.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-[#919EAB] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={13} style={{ color: token.accent }} />
                <span>Participants ({event.participants.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {event.participants.map((p, idx) => {
                  const rsvpVal = p.rsvp || "attending";
                  const rsvpStyles =
                    rsvpVal === "attending"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : rsvpVal === "tentative"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#F4F6F8] border border-[#E2E8F0]/70 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: token.bg,
                            color: token.text,
                          }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#212B36] truncate">
                            {p.name}
                          </p>
                          {p.email && (
                            <p className="text-[10px] text-[#637381] truncate">
                              {p.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {onUpdateRsvp ? (
                        <button
                          type="button"
                          onClick={() => {
                            const nextOrder: (
                              | "attending"
                              | "tentative"
                              | "declined"
                            )[] = ["attending", "tentative", "declined"];
                            const currentIdx = nextOrder.indexOf(
                              rsvpVal as "attending" | "tentative" | "declined"
                            );
                            const nextRsvp =
                              nextOrder[(currentIdx + 1) % nextOrder.length];
                            onUpdateRsvp(
                              event.masterEventId || event.id,
                              idx,
                              nextRsvp
                            );
                          }}
                          title="Click to cycle RSVP status"
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 transition-colors ${rsvpStyles}`}
                        >
                          {rsvpVal}
                        </button>
                      ) : (
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${rsvpStyles}`}
                        >
                          {rsvpVal}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metadata Summary */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F1F3F5] text-center">
            <div className="p-2.5 bg-[#F4F6F8] rounded-xl">
              <span className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5">
                <Repeat size={10} /> Repeat
              </span>
              <span className="text-xs font-semibold text-[#212B36] capitalize">
                {event.recurrence || "None"}
              </span>
            </div>
            <div className="p-2.5 bg-[#F4F6F8] rounded-xl">
              <span className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5">
                <Bell size={10} /> Reminder
              </span>
              <span className="text-xs font-semibold text-[#212B36]">
                {event.reminder || "15m"}
              </span>
            </div>
            <div className="p-2.5 bg-[#F4F6F8] rounded-xl">
              <span className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5">
                <Lock size={10} /> Privacy
              </span>
              <span className="text-xs font-semibold text-[#212B36] capitalize">
                {event.privacy || "Internal"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F4F6F8] border-t border-[#E2E8F0] flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-[#2563EB]/30 bg-white"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F4F6F8] text-[#212B36] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1C252E] text-white hover:bg-[#28323D] rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
