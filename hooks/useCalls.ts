"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Call, fetchCalls, createCall } from "@/lib/api/callsApi";
import { fetchContactById } from "@/lib/api/contactsApi";

export function useCalls() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCalls = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCalls(page);
            
            // Enrich calls with contact names if missing
            const enrichedCalls = await Promise.all(
                data.calls.map(async (call) => {
                    if (!call.contactName && call.contactId) {
                        try {
                            const contact = await fetchContactById(call.contactId);
                            return { ...call, contactName: contact.name };
                        } catch (err) {
                            console.error(`Failed to fetch contact ${call.contactId}`, err);
                            return call;
                        }
                    }
                    return call;
                })
            );
            
            setCalls(enrichedCalls);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch calls.");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        loadCalls();
    }, [loadCalls]);

    const handleCreateCall = async (data: Partial<Call>) => {
        try {
            await createCall(data);
            loadCalls();
            toast.success("Call logged successfully");
        } catch (err: any) {
            console.error("Log call error:", err);
            toast.error(err.message || "Failed to log call.");
        }
    };

    return {
        calls,
        total,
        page,
        loading,
        error,
        setPage,
        handleCreateCall,
        retry: loadCalls,
        reload: loadCalls,
    };
}
