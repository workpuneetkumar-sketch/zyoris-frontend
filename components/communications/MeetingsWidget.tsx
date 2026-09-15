"use client";

import React, { useEffect, useState } from "react";
import { Video, ArrowRight, Clock, MapPin } from "lucide-react";
import { getMeetings, Meeting } from "@/lib/api/meetingsApi";
import Link from "next/link";

export default function MeetingsWidget() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await getMeetings();
                // Filter for upcoming meetings
                const upcoming = res.filter(m => new Date(m.startTime).getTime() > Date.now());
                upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                setMeetings(upcoming.slice(0, 4)); // Show top 4 upcoming
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                        <Video size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Upcoming Meetings</h3>
                </div>
                <Link href="/meetings" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 font-medium">
                    View all <ArrowRight size={14} />
                </Link>
            </div>
            <div className="flex-1 p-5 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-8">No upcoming meetings</div>
                ) : (
                    <div className="space-y-4">
                        {meetings.map((meeting) => (
                            <div key={meeting.id} className="flex gap-4 group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
                                <div className="flex flex-col items-center justify-center w-12 shrink-0 border-r border-gray-100 pr-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">{formatDate(meeting.startTime)}</span>
                                    <span className="text-sm font-bold text-gray-900">{formatTime(meeting.startTime)}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{meeting.title}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            <span>
                                                {Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000)} min
                                            </span>
                                        </div>
                                        {(meeting.location || meeting.link) && (
                                            <div className="flex items-center gap-1 truncate">
                                                <MapPin size={12} />
                                                <span className="truncate">{meeting.location || "Online"}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
