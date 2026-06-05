"use client";

import { CompaniesUI } from "@/components/companies/CompaniesUI";
import { useCompanies } from "@/hooks/useCompanies";

export default function CompaniesPage() {
    const {
        companies,
        total,
        page,
        perPage,
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
        retry,
        reload,
    } = useCompanies();

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
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
        <CompaniesUI
            companies={companies}
            total={total}
            page={page}
            perPage={perPage}
            filters={filters}
            loading={loading}
            openMenu={openMenu}
            selectedCompany={selectedCompany}
            companyContacts={companyContacts}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            onPageChange={setPage}
            onFiltersChange={handleFiltersChange}
            onSelectCompany={handleSelectCompany}
            onDelete={handleDelete}
            onReload={reload}
            setOpenMenu={setOpenMenu}
        />
    );
}
