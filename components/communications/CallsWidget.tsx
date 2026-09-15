"use client";

import React, { useEffect, useState } from "react";
import { Phone, ArrowRight, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { fetchCalls, Call } from "@/lib/api/callsApi";
import Link from "next/link";

export default function CallsWidget() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetchCalls(1);
                setCalls(res.calls.slice(0, 4)); // Show top 4
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const getIcon = (outcome: string) => {
        const lower = outcome.toLowerCase();
        if (lower.includes("missed") || lower.includes("no answer")) return <PhoneMissed size={14} className="text-red-500" />;
        if (lower.includes("inbound") || lower.includes("received")) return <PhoneIncoming size={14} className="text-green-500" />;
        return <PhoneOutgoing size={14} className="text-blue-500" />;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Phone size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Call Log</h3>
                </div>
                <Link href="/calls" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                    View all <ArrowRight size={14} />
                </Link>
            </div>
            <div className="flex-1 p-5 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                ) : calls.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-8">No recent calls</div>
                ) : (
                    <div className="space-y-4">
                        {calls.map((call, idx) => (
                            <div key={call.id || idx} className="flex gap-3 group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200">
                                    {getIcon(call.outcome || "")}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <p className="text-sm font-semibold text-gray-900 truncate pr-2">{call.contactName || "Unknown"}</p>
                                        <span className="text-xs text-gray-400 shrink-0">
                                            {call.date ? new Date(call.date).toLocaleDateString() : ""}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 flex items-center gap-2">
                                        <span className="capitalize">{call.outcome || "Completed"}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span>{call.duration} min</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
