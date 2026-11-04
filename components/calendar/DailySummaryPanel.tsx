"use client";

import React, { useState } from "react";
import { Meeting } from "@/lib/api/meetingsApi";
import { Task } from "@/lib/api/tasksApi";
import { Call } from "@/lib/api/callsApi";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatTimeDisplay, formatDateKey } from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import {
  Video,
  Clock,
  Plus,
  CloudOff,
  ChevronDown,
  Edit2,
} from "lucide-react";

interface DailySummaryPanelProps {
  selectedDate: Date;
  events: UnifiedCalendarEvent[];
  rawMeetings?: Meeting[];
  rawCalls?: Call[];
  rawTasks?: Task[];
  onOpenCreate: (date: Date) => void;
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onEditEvent?: (event: UnifiedCalendarEvent) => void;
  onSelectMeeting?: (meeting: Meeting) => void;
  onSelectCall: (call: Call) => void;
  onSelectTask: (task: Task) => void;
  embedded?: boolean;
}

export default function DailySummaryPanel({
  selectedDate,
  events,
  onOpenCreate,
  onSelectEvent,
  onEditEvent,
  onSelectCall,
  onSelectTask,
  embedded = true,
}: DailySummaryPanelProps) {
  const [activeTab, setActiveTab] = useState<"all" | "meetings" | "calls" | "tasks">("all");
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedDateKey = formatDateKey(selectedDate);

  // Strictly use `events` (which is already filtered by department, category, and search query!)
  const dayEvents = events.filter((e) => e.date === selectedDateKey);

  const dayMeetings = dayEvents.filter(
    (e) =>
      e.sourceType !== "call" &&
      e.sourceType !== "task" &&
      e.category !== "call" &&
      e.category !== "task"
  );

  const dayCalls = dayEvents.filter(
    (e) => e.sourceType === "call" || e.category === "call"
  );

  const dayTasks = dayEvents.filter(
    (e) => e.sourceType === "task" || e.category === "task"
  );

  const handleEdit = (evt: UnifiedCalendarEvent) => {
    if (onEditEvent) {
      onEditEvent(evt);
    } else {
      onSelectEvent(evt);
    }
  };

  return (
    <div
      className={
        embedded
          ? "border-t border-[#E2E8F0] pt-4 flex flex-col"
          : "w-full bg-white border-t border-[#E2E8F0] p-4 flex flex-col"
      }
    >
      {/* Selected Day Agenda Header */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-left group"
        >
          <ChevronDown
            size={14}
            className={`text-[#637381] transition-transform ${
              isExpanded ? "" : "-rotate-90"
            }`}
          />
          <div>
            <h3 className="text-xs font-bold text-[#212B36] tracking-tight">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              Schedule
            </h3>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#637381] bg-[#F4F6F8] px-2 py-0.5 rounded-full">
            {dayEvents.length}
          </span>
          <button
            type="button"
            onClick={() => onOpenCreate(selectedDate)}
            className="p-1 rounded-lg text-[#637381] hover:text-[#212B36] hover:bg-[#F4F6F8] transition-colors"
            title="Add event for selected date"
            aria-label="Add event for selected date"
          >
            <Plus size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Compact Category Pill Tabs (Meetings, Calls, Tasks) */}
          <div className="grid grid-cols-4 gap-1 bg-[#F4F6F8] p-0.5 rounded-lg text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-1 rounded-md transition-colors ${
                activeTab === "all"
                  ? "bg-white text-[#212B36] shadow-sm"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              All ({dayEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("meetings")}
              className={`py-1 rounded-md transition-colors ${
                activeTab === "meetings"
                  ? "bg-white text-[#212B36] shadow-sm"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              Meet ({dayMeetings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calls")}
              className={`py-1 rounded-md transition-colors ${
                activeTab === "calls"
                  ? "bg-white text-[#212B36] shadow-sm"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              Calls ({dayCalls.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`py-1 rounded-md transition-colors ${
                activeTab === "tasks"
                  ? "bg-white text-[#212B36] shadow-sm"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              Tasks ({dayTasks.length})
            </button>
          </div>

          {/* Filtered Items List */}
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
            {/* MEETINGS & EVENTS */}
            {(activeTab === "all" || activeTab === "meetings") &&
              dayMeetings.map((m) => {
                const token = getCategoryToken(m.category, m.customColor);
                const isPendingSync = m.syncStatus === "pending_sync";

                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectEvent(m)}
                    style={{
                      backgroundColor: token.bg,
                      borderLeftColor: token.dot,
                      color: token.text,
                    }}
                    className="p-2.5 rounded-lg border-l-[3px] transition-all cursor-pointer flex items-start justify-between gap-2 group hover:brightness-95"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-xs truncate">{m.title}</p>
                        {isPendingSync && (
                          <span title="Saved locally – pending server sync">
                            <CloudOff size={10} className="text-amber-600 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] opacity-85 mt-0.5 flex items-center gap-1 font-medium">
                        <Clock size={10} />
                        <span>
                          {m.allDay || !m.startTime
                            ? "All day"
                            : `${formatTimeDisplay(m.startTime)} – ${formatTimeDisplay(
                                m.endTime
                              )}`}
                        </span>
                      </p>
                      {(m.room || m.location) && (
                        <p className="text-[10px] opacity-75 mt-0.5 truncate">
                          {m.room || m.location}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {m.meetingLink && (
                        <a
                          href={m.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 bg-white/70 hover:bg-white rounded text-[#212B36] transition-colors"
                          title="Join video call"
                        >
                          <Video size={12} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(m);
                        }}
                        className="p-1 bg-white/70 hover:bg-white rounded text-[#212B36] text-[10px] font-semibold flex items-center gap-0.5 px-1.5 transition-colors"
                        title="Edit event"
                      >
                        <Edit2 size={10} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* CALLS */}
            {(activeTab === "all" || activeTab === "calls") &&
              dayCalls.map((cEvt) => {
                const token = getCategoryToken(cEvt.category, cEvt.customColor);
                const rawCall = cEvt.rawSource as Call | undefined;

                return (
                  <div
                    key={cEvt.id}
                    onClick={() => {
                      if (rawCall && cEvt.sourceType === "call") {
                        onSelectCall(rawCall);
                      } else {
                        onSelectEvent(cEvt);
                      }
                    }}
                    style={{
                      backgroundColor: token.bg,
                      borderLeftColor: token.dot,
                      color: token.text,
                    }}
                    className="p-2.5 rounded-lg border-l-[3px] transition-all cursor-pointer flex items-center justify-between gap-2 hover:brightness-95"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs truncate">{cEvt.title}</p>
                      <p className="text-[10px] opacity-85 mt-0.5 truncate">
                        {cEvt.startTime
                          ? `${formatTimeDisplay(cEvt.startTime)} – ${formatTimeDisplay(
                              cEvt.endTime
                            )}`
                          : cEvt.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rawCall && cEvt.sourceType === "call") {
                          onSelectCall(rawCall);
                        } else {
                          handleEdit(cEvt);
                        }
                      }}
                      className="text-[10px] font-semibold bg-white/70 hover:bg-white text-[#212B36] px-2 py-0.5 rounded transition-colors shrink-0"
                    >
                      {cEvt.sourceType === "call" && rawCall ? "View" : "Edit"}
                    </button>
                  </div>
                );
              })}

            {/* TASKS */}
            {(activeTab === "all" || activeTab === "tasks") &&
              dayTasks.map((tEvt) => {
                const token = getCategoryToken(tEvt.category, tEvt.customColor);
                const rawTask = tEvt.rawSource as Task | undefined;

                return (
                  <div
                    key={tEvt.id}
                    onClick={() => {
                      if (rawTask && tEvt.sourceType === "task") {
                        onSelectTask(rawTask);
                      } else {
                        onSelectEvent(tEvt);
                      }
                    }}
                    style={{
                      backgroundColor: token.bg,
                      borderLeftColor: token.dot,
                      color: token.text,
                    }}
                    className="p-2.5 rounded-lg border-l-[3px] transition-all cursor-pointer flex items-center justify-between gap-2 hover:brightness-95"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs truncate">{tEvt.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] opacity-85">
                        <span>{tEvt.allDay ? "Due today" : formatTimeDisplay(tEvt.startTime)}</span>
                        {rawTask?.priority && (
                          <span className="font-bold uppercase">• {rawTask.priority}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(tEvt);
                        }}
                        className="text-[10px] font-semibold bg-white/70 hover:bg-white text-[#212B36] px-1.5 py-0.5 rounded transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Empty State for Selected Day */}
            {((activeTab === "all" && dayEvents.length === 0) ||
              (activeTab === "meetings" && dayMeetings.length === 0) ||
              (activeTab === "calls" && dayCalls.length === 0) ||
              (activeTab === "tasks" && dayTasks.length === 0)) && (
              <div className="py-4 px-3 bg-[#F4F6F8]/60 rounded-xl border border-dashed border-[#E2E8F0] flex items-center justify-between">
                <p className="text-[11px] text-[#919EAB]">Nothing scheduled</p>
                <button
                  type="button"
                  onClick={() => onOpenCreate(selectedDate)}
                  className="text-[11px] font-semibold text-[#FF5630] hover:underline"
                >
                  + Add
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
