"use client";

import { ContactsUI } from "@/components/contacts/ContactsUI";
import { useContacts } from "@/hooks/useContacts";

export default function ContactsPage() {
    const {
        contacts,
        total,
        page,
        perPage,
        filters,
        loading,
        error,
        openMenu,
        setPage,
        setOpenMenu,
        handleFiltersChange,
        handleDelete,
        retry,
        reload,
    } = useContacts();

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
        <ContactsUI
            contacts={contacts}
            total={total}
            page={page}
            perPage={perPage}
            filters={filters}
            loading={loading}
            openMenu={openMenu}
            onPageChange={setPage}
            onFiltersChange={handleFiltersChange}
            onDelete={handleDelete}
            onReload={reload}
            setOpenMenu={setOpenMenu}
        />
    );
}
