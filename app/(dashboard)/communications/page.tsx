"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import EmailWidget from "@/components/communications/EmailWidget";
import WhatsAppWidget from "@/components/communications/WhatsAppWidget";
import CallsWidget from "@/components/communications/CallsWidget";
import MeetingsWidget from "@/components/communications/MeetingsWidget";
import CalendarWidget from "@/components/communications/CalendarWidget";
import { MessageSquareText } from "lucide-react";

export default function CommunicationDashboard() {
    const { user } = useAuth();

    // Determine greeting based on role
    const getGreeting = () => {
        const role = user?.role || "Team Member";
        return `Welcome, ${role} - Here is your Communication Overview`;
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] p-6 bg-gray-50/50">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                        <MessageSquareText size={22} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Communication Dashboard</h1>
                </div>
                <p className="text-sm text-gray-500">{getGreeting()}</p>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                {/* Main Widgets */}
                <div className="lg:col-span-1 min-h-[350px] md:h-[400px]">
                    <EmailWidget />
                </div>
                <div className="lg:col-span-1 min-h-[350px] md:h-[400px]">
                    <WhatsAppWidget />
                </div>
                <div className="lg:col-span-1 min-h-[350px] md:h-[400px]">
                    <CallsWidget />
                </div>

                {/* Secondary row */}
                <div className="md:col-span-2 lg:col-span-2 min-h-[350px] md:h-[400px]">
                    <MeetingsWidget />
                </div>
                <div className="md:col-span-1 lg:col-span-1 min-h-[350px] md:h-[400px]">
                    <CalendarWidget />
                </div>
            </div>
        </div>
    );
}
