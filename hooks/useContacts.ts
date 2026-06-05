"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Contact,
    ContactsFilters,
    DEFAULT_CONTACTS_FILTERS,
    CONTACTS_PER_PAGE,
    fetchContacts,
    deleteContact,
} from "@/lib/api/contactsApi";

export function useContacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<ContactsFilters>(DEFAULT_CONTACTS_FILTERS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadContacts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchContacts(page, filters);
            setContacts(data.contacts);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch contacts.");
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    function handleFiltersChange(next: ContactsFilters) {
        setFilters(next);
        setPage(1);
    }

    async function handleDelete(id: string, name: string) {
        if (!window.confirm(`Delete contact "${name}"?`)) return;
        try {
            await deleteContact(id);
            loadContacts();
        } catch (err) {
            console.error("Delete contact error:", err);
        }
    }

    return {
        contacts,
        total,
        page,
        perPage: CONTACTS_PER_PAGE,
        filters,
        loading,
        error,
        openMenu,
        setPage,
        setOpenMenu,
        handleFiltersChange,
        handleDelete,
        retry: loadContacts,
        reload: loadContacts,
    };
}
