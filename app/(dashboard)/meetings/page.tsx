"use client";

import { useEffect, useState } from "react";
import { getMeetings, Meeting } from "@/lib/api/meetingsApi";
import { Calendar as CalendarIcon, Clock, Users, Link as LinkIcon, MapPin, Video, FileText } from "lucide-react";

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadMeetings();
    }, []);

    const loadMeetings = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getMeetings();
            // Filter to only upcoming meetings (date >= today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcoming = data.filter(m => {
                const meetingDateStr = m.date || m.startTime;
                if (!meetingDateStr) return false;
                const meetingDate = new Date(meetingDateStr);
                meetingDate.setHours(0, 0, 0, 0);
                return meetingDate >= today;
            }).sort((a, b) => {
                const dateA = new Date(a.date || a.startTime).getTime();
                const dateB = new Date(b.date || b.startTime).getTime();
                return dateA - dateB;
            });
            
            setMeetings(upcoming);
        } catch (err) {
            console.error("Failed to load meetings", err);
            setError("Failed to load upcoming meetings. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return "";
        if (timeString.includes("T")) {
            const d = new Date(timeString);
            if (!isNaN(d.getTime())) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        return timeString;
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Upcoming Meetings</h1>
                    <p className="text-sm text-gray-500 mt-1">View your scheduled meetings</p>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Upcoming Meetings</h1>
                </div>
                <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-100">
                    <p className="text-red-500 text-sm font-medium">{error}</p>
                    <button
                        onClick={loadMeetings}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Meetings</h1>
                    <p className="text-sm text-gray-500 mt-1">Review your attendees, agenda, and linked entities.</p>
                </div>
            </div>

            {meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white p-12 rounded-2xl border border-gray-100 border-dashed text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarIcon className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No upcoming meetings</h3>
                    <p className="text-sm text-gray-500">You don't have any scheduled meetings right now.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {meetings.map(meeting => (
                        <div key={meeting.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-900">{meeting.title}</h3>
                                        {meeting.status && (
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                                meeting.status === "SCHEDULED" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                                meeting.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                                "bg-gray-50 text-gray-700 border border-gray-200"
                                            }`}>
                                                {meeting.status}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                            <CalendarIcon size={14} className="text-blue-600"/>
                                            <span>{new Date(meeting.date || meeting.startTime).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                            <Clock size={14} className="text-amber-600"/>
                                            <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                                        </div>
                                        {meeting.location && (
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                <MapPin size={14} className="text-rose-500"/>
                                                <span>{meeting.location}</span>
                                            </div>
                                        )}
                                        {(meeting.link || meeting.meetingLink) && (
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                <Video size={14} className="text-violet-500"/>
                                                <a href={meeting.link || meeting.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Join Link</a>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {(meeting.description || (meeting as any).agenda) && (
                                        <div className="mt-4 pt-4 border-t border-gray-50">
                                            <div className="flex items-start gap-2">
                                                <FileText size={16} className="text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Agenda / Description</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{(meeting.description || (meeting as any).agenda) as string}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="md:w-64 flex flex-col gap-4">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Users size={14}/> Attendees</p>
                                        {meeting.attendees && meeting.attendees.length > 0 ? (
                                            <div className="space-y-2">
                                                {meeting.attendees.map(a => (
                                                    <div key={a.id} className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">
                                                            {a.name.charAt(0)}
                                                        </div>
                                                        <span className="truncate">{a.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 font-medium">No attendees listed</p>
                                        )}
                                    </div>

                                    {(meeting as any).linkedEntity && (
                                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                            <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-1.5"><LinkIcon size={14}/> Linked Entity</p>
                                            <p className="text-sm font-medium text-blue-900 truncate">
                                                {((meeting as any).linkedEntity as any).name || ((meeting as any).linkedEntity as any).title || String((meeting as any).linkedEntity)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
