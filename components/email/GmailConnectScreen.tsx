"use client";

import { ShieldCheck, Mail, RefreshCw, CheckCircle2, ExternalLink, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

interface GmailConnectScreenProps {
    connecting: boolean;
    error: string | null;
    onConnect: () => void;
}

export function GmailConnectScreen({ connecting, error, onConnect }: GmailConnectScreenProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Banner & Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-500 via-yellow-500 to-blue-500 p-0.5 shadow-md shrink-0">
                        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                            <Mail className="w-7 h-7 text-red-500" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Gmail OAuth 2.0 Integration</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100 flex items-center gap-1">
                                <Sparkles size={12} /> Google Cloud Sync
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Connect your Google workspace account to sync inbox, send emails, and track communications seamlessy.
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Banner if any */}
            {error && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-bold">OAuth Connection Notice</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        <Mail size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900">2-Way Sync</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        Sync incoming and outgoing emails directly with your CRM workspace threads.
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        <CheckCircle2 size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900">OAuth Security</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        Industry standard Google OAuth 2.0 authentication. No passwords stored.
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                        <ShieldCheck size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900">Template Dispatch</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        Send automated outreach and template responses using your connected Google account.
                    </p>
                </div>
            </div>

            {/* Connect Action Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/80 border border-blue-100 text-center space-y-4">
                <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-base font-bold text-gray-900">Authorize Google Account Access</h3>
                    <p className="text-xs text-gray-600">
                        Clicking the button below will redirect you to Google's official authorization page to grant permission.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={onConnect}
                        disabled={connecting}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-60"
                    >
                        {connecting ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Connecting to Google...
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-4 h-4" />
                                Connect Gmail Account
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </button>
                </div>

                <p className="text-[11px] text-gray-400 font-medium">
                    Endpoint: <code className="bg-white/80 px-1.5 py-0.5 rounded border text-[10px]">POST /email/oauth/gmail/connect</code>
                </p>
            </div>
        </div>
    );
}
