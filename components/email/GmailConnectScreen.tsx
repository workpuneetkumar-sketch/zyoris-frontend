"use client";

import { Mail, ShieldCheck } from "lucide-react";

const PROVIDERS = ["Gmail", "Yahoo Mail", "Outlook / Microsoft 365", "Custom company email", "Other IMAP/SMTP providers"];

export function GmailConnectScreen() {
    return (
        <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
            <header className="flex items-start gap-4 border-b border-gray-100 pb-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Mail size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-900">Email accounts</h2>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                        Connect a mailbox provider when account authorization and mailbox synchronization are available on the server.
                    </p>
                </div>
            </header>

            <div className="space-y-3">
                {PROVIDERS.map((provider) => (
                    <div key={provider} className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                            <Mail size={18} className="text-gray-400" />
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{provider}</p>
                                <p className="text-xs text-gray-500">Connection status unavailable · server integration required</p>
                            </div>
                        </div>
                        <button disabled title="Account authorization is not available in the current backend" className="h-9 shrink-0 rounded-lg border border-gray-200 px-4 text-xs font-semibold text-gray-400 disabled:cursor-not-allowed">
                            Connect unavailable
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-blue-600" />
                <p>
                    No provider credentials or access tokens are collected here. The deployed backend currently has no email account listing or OAuth authorization route, so the interface cannot truthfully show connected accounts or initiate a connection yet.
                </p>
            </div>
        </section>
    );
}
