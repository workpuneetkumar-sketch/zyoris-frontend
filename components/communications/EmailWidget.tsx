"use client";

import React, { useEffect, useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { fetchEmails, EmailLog } from "@/lib/api/emailApi";
import Link from "next/link";

export default function EmailWidget() {
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetchEmails();
                setEmails(res.emails.slice(0, 4)); // Show top 4
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const getInitials = (email: string) => {
        return email.split("@")[0].substring(0, 2).toUpperCase();
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <Mail size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Recent Emails</h3>
                </div>
                <Link href="/email" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                    View all <ArrowRight size={14} />
                </Link>
            </div>
            <div className="flex-1 p-5 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-8">No recent emails</div>
                ) : (
                    <div className="space-y-4">
                        {emails.map(email => (
                            <div key={email.id} className="flex gap-3 group">
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">
                                    {getInitials(email.to)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <p className="text-sm font-medium text-gray-900 truncate pr-2">{email.to}</p>
                                        <span className="text-xs text-gray-400 shrink-0">
                                            {email.createdAt ? new Date(email.createdAt).toLocaleDateString() : ""}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">{email.subject || "No Subject"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
