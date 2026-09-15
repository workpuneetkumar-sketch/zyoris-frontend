// app/(dashboard)/events/page.tsx
"use client";

import React, { useState } from 'react';
import { X, Plus, CalendarDays, Clock, MapPin, User } from 'lucide-react';

// ── Demo data ──────────────────────────────────────────────
const DEMO_EVENTS = [
  { id: '1', title: 'Team Outing', date: '2026-07-22', time: '10:00', location: 'Central Park', organizer: 'John Doe', color: 'indigo' },
  { id: '2', title: 'All-Hands Meeting', date: '2026-07-25', time: '09:30', location: 'Conference Room A', organizer: 'Jane Smith', color: 'emerald' },
  { id: '3', title: 'Quarterly Review', date: '2026-07-30', time: '14:00', location: 'Board Room', organizer: 'Mike Johnson', color: 'blue' },
  { id: '4', title: 'Team Lunch', date: '2026-08-05', time: '12:00', location: 'Rooftop Restaurant', organizer: 'Sarah Lee', color: 'purple' },
  { id: '5', title: 'Strategy Workshop', date: '2026-08-10', time: '10:00', location: 'Training Hall', organizer: 'Chris Brown', color: 'orange' },
  { id: '6', title: 'Town Hall', date: '2026-08-15', time: '11:00', location: 'Auditorium', organizer: 'CEO', color: 'red' },
];

const COLORS = [
  { name: 'indigo', bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500', text: 'text-indigo-700' },
  { name: 'emerald', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  { name: 'blue', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', text: 'text-blue-700' },
  { name: 'purple', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500', text: 'text-purple-700' },
  { name: 'orange', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500', text: 'text-orange-700' },
  { name: 'red', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', text: 'text-red-700' },
];

function monthName(m: number): string {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] || '';
}

function getDay(dateStr: string): number {
  return new Date(dateStr).getDate();
}

function getColorProps(colorName: string) {
  return COLORS.find(c => c.name === colorName) || COLORS[0];
}

export default function EventsPage() {
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    organizer: '',
    color: 'indigo',
  });

  const handleCreate = () => {
    if (!newEvent.title || !newEvent.date) return;
    setEvents([{
      id: String(Date.now()),
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location || 'TBD',
      organizer: newEvent.organizer || 'N/A',
      color: newEvent.color,
    }, ...events]);
    setNewEvent({ title: '', date: '', time: '', location: '', organizer: '', color: 'indigo' });
    setShowCreateForm(false);
  };

  const handleDelete = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-indigo-500" />
              Events
            </h1>
            <p className="text-gray-500 mt-1">Create and manage your events</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all hover:shadow-lg font-semibold"
          >
            <Plus size={18} />
            New Event
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Create Event</h2>
                <button onClick={() => setShowCreateForm(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(p => ({ ...p, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Enter event title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent(p => ({ ...p, date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent(p => ({ ...p, time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent(p => ({ ...p, location: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Where?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Organizer</label>
                    <input
                      type="text"
                      value={newEvent.organizer}
                      onChange={(e) => setNewEvent(p => ({ ...p, organizer: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Who?"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => setNewEvent(p => ({ ...p, color: c.name }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${c.dot} ${newEvent.color === c.name ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-50 hover:opacity-75'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowCreateForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newEvent.title}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Count */}
        <p className="mb-6 text-sm text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100">
              <CalendarDays className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-4">No events yet</h3>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create your first event
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const col = getColorProps(event.color);
              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-5 flex flex-col h-full ${col.bg}`}
                >
                  {/* Date badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100 text-center min-w-[50px]">
                      <p className="text-xs uppercase text-gray-500 font-medium">{monthName(new Date(event.date).getMonth())}</p>
                      <p className="text-xl font-bold text-gray-800 leading-none mt-1">{getDay(event.date)}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full mt-2 ${col.dot}`} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 leading-tight">{event.title}</h3>

                  {/* Details */}
                  <div className="space-y-2 mt-auto">
                    {event.time && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={14} className="text-gray-400 shrink-0" />
                        <span>{event.time}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400 shrink-0" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.organizer && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={14} className="text-gray-400 shrink-0" />
                        <span>{event.organizer}</span>
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-xs text-gray-400 hover:text-red-500 mt-4 self-end transition-colors"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}