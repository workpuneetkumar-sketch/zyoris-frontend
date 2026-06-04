// app/(dashboard)/leads/_hooks/useLeads.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lead, LeadsFilters, DEFAULT_FILTERS } from "../types/leads";
import { fetchLeads, deleteLead } from "../lib/api/leadsApi";

function quoteCsv(value: unknown) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function buildLeadsCsv(leads: Lead[]) {
    const headers = [
        "ID",
        "Name",
        "Company",
        "Email",
        "Phone",
        "City",
        "Source",
        "Status",
        "Owner",
        "Assigned To",
        "Score",
        "Created At",
        "Tags",
        "Note",
    ];

    const rows = leads.map((lead) =>
        [
            lead.id,
            lead.name,
            lead.company,
            lead.email ?? "",
            lead.phone ?? "",
            lead.city ?? "",
            lead.source,
            lead.status,
            lead.owner,
            lead.assignedTo?.name ?? "",
            lead.score,
            lead.createdAt,
            Array.isArray(lead.tags) ? lead.tags.join("; ") : "",
            lead.note ?? "",
        ]
            .map(quoteCsv)
            .join(",")
    );

    return [headers.map(quoteCsv).join(","), ...rows].join("\n");
}

export function useLeads() {
    const router = useRouter();

    // ── State ─────────────────────────────────────────────────────────────────
    const [leads, setLeads] = useState<Lead[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<LeadsFilters>(DEFAULT_FILTERS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const loadLeads = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLeads(page, filters);
            setLeads(data.leads);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch leads.");
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    function handleFiltersChange(next: LeadsFilters) {
        setFilters(next);
        setPage(1);
    }

    function handleNewLead() {
        router.push("/leads/new");
    }

    async function handleExport() {
        try {
            const csv = buildLeadsCsv(leads);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();

            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
        }
    }

    async function handleAction(action: string, lead: Lead) {
        switch (action) {
            case "View":
                router.push(`/leads/${lead.id}`);
                break;
            case "Edit":
                router.push(`/leads/${lead.id}/edit`);
                break;
            case "Assign":
                router.push(`/leads/${lead.id}/assign`);
                break;
            case "Delete": {
                if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
                try {
                    await deleteLead(lead.id);
                    loadLeads();
                } catch (err) {
                    console.error("Delete error:", err);
                }
                break;
            }
        }
    }

    return {
        // state
        leads,
        total,
        page,
        filters,
        loading,
        error,
        openMenu,
        // setters
        setPage,
        setOpenMenu,
        // handlers
        handleFiltersChange,
        handleNewLead,
        handleExport,
        handleAction,
        retry: loadLeads,
    };
}