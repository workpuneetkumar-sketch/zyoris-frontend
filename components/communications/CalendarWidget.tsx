"use client";

import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { getMeetings, Meeting } from "@/lib/api/meetingsApi";
import Link from "next/link";

export default function CalendarWidget() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [meetings, setMeetings] = useState<Meeting[]>([]);

    useEffect(() => {
        async function load() {
            try {
                const res = await getMeetings();
                setMeetings(res);
            } catch (err) {
                console.error(err);
            }
        }
        load();
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const isSameDay = (d1: Date, d2: Date) => 
        d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    const hasMeeting = (date: Date) => {
        return meetings.some(m => isSameDay(new Date(m.startTime), date));
    };

    const daysArray = Array.from({ length: 42 }, (_, i) => {
        const dayNumber = i - firstDay + 1;
        if (dayNumber > 0 && dayNumber <= days) {
            return new Date(year, month, dayNumber);
        }
        return null;
    });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                        <CalendarIcon size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Calendar</h3>
                </div>
                <Link href="/calendar" className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 font-medium">
                    View all <ArrowRight size={14} />
                </Link>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-gray-900">{monthNames[month]} {year}</span>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft size={16} /></button>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={16} /></button>
                    </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d}>{d}</div>)}
                </div>
                
                <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-sm flex-1">
                    {daysArray.map((date, i) => {
                        if (!date) return <div key={i} className="py-0.5"></div>;
                        
                        const isToday = isSameDay(date, new Date());
                        const hasEvent = hasMeeting(date);
                        
                        return (
                            <div key={i} className="py-0.5 flex items-center justify-center relative">
                                <div className={`w-7 h-7 text-xs flex items-center justify-center rounded-full ${
                                    isToday ? "bg-orange-500 text-white font-bold" : "text-gray-700 hover:bg-gray-100 cursor-pointer"
                                }`}>
                                    {date.getDate()}
                                </div>
                                {hasEvent && !isToday && (
                                    <span className="absolute bottom-1 w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
