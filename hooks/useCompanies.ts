"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Company,
    CompaniesFilters,
    DEFAULT_COMPANIES_FILTERS,
    COMPANIES_PER_PAGE,
    fetchCompanies,
    fetchCompanyContacts,
    deleteCompany,
} from "@/lib/api/companiesApi";
import type { Contact } from "@/lib/api/contactsApi";

export function useCompanies() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<CompaniesFilters>(DEFAULT_COMPANIES_FILTERS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    // Detail panel state
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [companyContacts, setCompanyContacts] = useState<Contact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactsError, setContactsError] = useState<string | null>(null);

    // ── Fetch companies ───────────────────────────────────────────────────────
    const loadCompanies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCompanies(page, filters);
            setCompanies(data.companies);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch companies.");
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        loadCompanies();
    }, [loadCompanies]);

    // ── Fetch contacts for a company ──────────────────────────────────────────
    const loadCompanyContacts = useCallback(async (companyId: string) => {
        setContactsLoading(true);
        setContactsError(null);
        setCompanyContacts([]);
        try {
            const data = await fetchCompanyContacts(companyId);
            setCompanyContacts(data);
        } catch (err) {
            setContactsError(err instanceof Error ? err.message : "Failed to fetch contacts.");
        } finally {
            setContactsLoading(false);
        }
    }, []);

    // When a company is selected, load its contacts
    useEffect(() => {
        if (selectedCompany) {
            loadCompanyContacts(selectedCompany.id);
        } else {
            setCompanyContacts([]);
            setContactsError(null);
        }
    }, [selectedCompany, loadCompanyContacts]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    function handleFiltersChange(next: CompaniesFilters) {
        setFilters(next);
        setPage(1);
    }

    function handleSelectCompany(company: Company | null) {
        setSelectedCompany(company);
    }

    async function handleDelete(id: string, name: string) {
        if (!window.confirm(`Delete company "${name}"?`)) return;
        try {
            await deleteCompany(id);
            if (selectedCompany?.id === id) setSelectedCompany(null);
            loadCompanies();
        } catch (err) {
            console.error("Delete company error:", err);
        }
    }

    return {
        companies,
        total,
        page,
        perPage: COMPANIES_PER_PAGE,
        filters,
        loading,
        error,
        openMenu,
        selectedCompany,
        companyContacts,
        contactsLoading,
        contactsError,
        setPage,
        setOpenMenu,
        handleFiltersChange,
        handleSelectCompany,
        handleDelete,
        retry: loadCompanies,
        reload: loadCompanies,
    };
}
