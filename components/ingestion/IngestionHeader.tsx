"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { triggerIngestionApi } from "@/lib/api/ingestionApi";

type Props = { onTriggerSuccess: () => void };

export function IngestionHeader({ onTriggerSuccess }: Props) {
    const [triggering, setTriggering] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    async function handleTrigger() {
        setTriggering(true);
        setMsg(null);
        try {
            await triggerIngestionApi();
            setMsg("Ingestion triggered successfully.");
            onTriggerSuccess();
        } catch {
            setMsg("Failed to trigger ingestion.");
        } finally {
            setTriggering(false);
        }
    }

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-xl font-bold text-gray-800">Data Ingestion</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    Upload or trigger data ingestion for your organization
                </p>
                {msg && (
                    <p className={`text-sm font-medium mt-1 ${msg.includes("Failed") ? "text-red-500" : "text-blue-600"}`}>
                        {msg}
                    </p>
                )}
            </div>
            <button
                onClick={handleTrigger}
                disabled={triggering}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)" }}
            >
                <RefreshCw size={14} className={triggering ? "animate-spin" : ""} />
                {triggering ? "Running..." : "Trigger Ingestion"}
            </button>
        </div>
    );
}