"use client";

import { CallsUI } from "@/components/calls/CallsUI";
import { useCalls } from "@/hooks/useCalls";
import { AlertCircle } from "lucide-react";

export default function CallsPage() {
    const {
        calls,
        total,
        page,
        loading,
        error,
        setPage,
        handleCreateCall,
        retry,
    } = useCalls();

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={retry}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <CallsUI
            calls={calls}
            total={total}
            page={page}
            loading={loading}
            onPageChange={setPage}
            onLogCall={handleCreateCall}
        />
    );
}
