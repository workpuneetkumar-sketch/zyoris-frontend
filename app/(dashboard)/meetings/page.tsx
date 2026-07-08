"use client";

import { useEffect, useState } from "react";
import { getMeetings, createMeeting, updateMeeting, Meeting, MeetingStatus, Attendee } from "@/lib/api/meetingsApi";
import { Calendar as CalendarIcon, Clock, Users, Link as LinkIcon, MapPin, Video, FileText, Plus, X, Bell, Edit } from "lucide-react";

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        description: "",
        location: "",
        link: "",
        reminder: "15m",
        status: "SCHEDULED" as MeetingStatus
    });

    const [attendeeName, setAttendeeName] = useState("");
    const [attendees, setAttendees] = useState<Attendee[]>([]);

    useEffect(() => {
        loadMeetings();
    }, []);

    const loadMeetings = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getMeetings();
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
            setError("Failed to load upcoming meetings. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (meeting?: Meeting) => {
        if (meeting) {
            setEditingMeeting(meeting);
            
            const getLocalDate = (dateStr: string) => {
                if (!dateStr) return "";
                if (!dateStr.includes("T")) return dateStr;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr.split('T')[0];
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };
            
            const getLocalTime = (timeStr: string) => {
                if (!timeStr) return "";
                if (!timeStr.includes("T")) return timeStr;
                const d = new Date(timeStr);
                if (isNaN(d.getTime())) return timeStr.split('T')[1].substring(0, 5);
                return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            };

            setFormData({
                title: meeting.title,
                date: getLocalDate(meeting.date || meeting.startTime),
                startTime: getLocalTime(meeting.startTime),
                endTime: getLocalTime(meeting.endTime),
                description: meeting.description || "",
                location: meeting.location || "",
                link: meeting.link || meeting.meetingLink || "",
                reminder: meeting.reminder || "15m",
                status: meeting.status || "SCHEDULED"
            });
            setAttendees((meeting.attendees || []).map((a: any) => 
                typeof a === 'string' ? { name: a } : a
            ));
        } else {
            setEditingMeeting(null);
            setFormData({
                title: "", date: "", startTime: "", endTime: "", description: "", location: "", link: "", reminder: "15m", status: "SCHEDULED"
            });
            setAttendees([]);
        }
        setIsModalOpen(true);
    };

    const handleAddAttendee = () => {
        if (attendeeName.trim()) {
            setAttendees([...attendees, { name: attendeeName.trim() }]);
            setAttendeeName("");
        }
    };

    const handleRemoveAttendee = (index: number) => {
        setAttendees(attendees.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
            const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

            const payload = {
                ...formData,
                meetingLink: formData.link, // Send as meetingLink for backend
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                attendees: attendees.map(a => a.name) // <--- Convert to strings here!
            };


            if (editingMeeting) {
                await updateMeeting(editingMeeting.id, payload);
            } else {
                await createMeeting(payload);
            }
            setIsModalOpen(false);
            loadMeetings(); // Refresh list
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to save meeting. Check console for details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return "";
        if (timeString.includes("T")) {
            const d = new Date(timeString);
            if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return timeString;
    };

    if (loading) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Meetings</h1>
                    <p className="text-sm text-gray-500 mt-1">Review your attendees, agenda, and status.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                >
                    <Plus size={16} /> New Meeting
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center justify-between">
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={loadMeetings} className="text-sm underline">Retry</button>
                </div>
            )}

            {meetings.length === 0 && !error ? (
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
                        <div key={meeting.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">

                            <button
                                onClick={() => handleOpenModal(meeting)}
                                className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600 hover:bg-blue-50"
                            >
                                <Edit size={16} />
                            </button>

                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-3 flex-1 pr-8">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-900">{meeting.title}</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${meeting.status === "SCHEDULED" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                                meeting.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                                    "bg-gray-50 text-gray-700 border border-gray-200"
                                            }`}>
                                            {meeting.status || "SCHEDULED"}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                            <CalendarIcon size={14} className="text-blue-600" />
                                            <span>{new Date(meeting.date || meeting.startTime).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                            <Clock size={14} className="text-amber-600" />
                                            <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                                        </div>
                                        {meeting.reminder && (
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                <Bell size={14} className="text-indigo-500" />
                                                <span>{meeting.reminder} before</span>
                                            </div>
                                        )}
                                        {meeting.location && (
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                <MapPin size={14} className="text-rose-500" />
                                                <span>{meeting.location}</span>
                                            </div>
                                        )}
                                        {(meeting.link || meeting.meetingLink) && (
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                <Video size={14} className="text-violet-500" />
                                                <a href={meeting.link || meeting.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Join Link</a>
                                            </div>
                                        )}
                                    </div>

                                    {meeting.description && (
                                        <div className="mt-4 pt-4 border-t border-gray-50">
                                            <div className="flex items-start gap-2">
                                                <FileText size={16} className="text-gray-400 mt-0.5" />
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.description}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="md:w-64 flex flex-col gap-4">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Users size={14} /> Attendees</p>
                                        {meeting.attendees && meeting.attendees.length > 0 ? (
                                            <div className="space-y-2">
                                                {meeting.attendees.map((a, i) => {
                                                    const name = typeof a === 'string' ? a : (a as any).name || 'Unknown';
                                                    return (
                                                        <div key={i} className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">
                                                                {name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="truncate">{name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 font-medium">No attendees listed</p>
                                        )}
                                    </div>
                                    {(meeting as any).linkedEntity && (
                                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                            <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-1.5"><LinkIcon size={14} /> Linked Entity</p>
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

            {/* CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl my-8">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                            <h2 className="text-xl font-bold">{editingMeeting ? "Edit Meeting" : "Schedule Meeting"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title *</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                    <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>
                                {editingMeeting && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as MeetingStatus })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                                            <option value="SCHEDULED">Scheduled</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                    <input required type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                    <input required type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input type="text" placeholder="e.g. Conference Room A" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                                    <input type="url" placeholder="https://zoom.us/..." value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reminder</label>
                                    <select value={formData.reminder} onChange={e => setFormData({ ...formData, reminder: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                                        <option value="5m">5 minutes before</option>
                                        <option value="15m">15 minutes before</option>
                                        <option value="1h">1 hour before</option>
                                        <option value="1d">1 day before</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Attendees</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" placeholder="Attendee Name" value={attendeeName} onChange={e => setAttendeeName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())} className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                                        <button type="button" onClick={handleAddAttendee} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {attendees.map((a, i) => (
                                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                                                {a.name}
                                                <button type="button" onClick={() => handleRemoveAttendee(i)} className="hover:text-red-500"><X size={14} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Agenda / Description</label>
                                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none resize-none" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl font-medium text-gray-600 hover:bg-gray-50 border border-gray-200">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                                    {isSubmitting ? "Saving..." : "Save Meeting"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
