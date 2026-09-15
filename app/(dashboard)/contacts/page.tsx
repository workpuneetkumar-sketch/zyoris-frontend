"use client";

import { ContactsUI } from "@/components/contacts/ContactsUI";
import { useContacts } from "@/hooks/useContacts";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

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
        confirmDelete,
        setPage,
        setOpenMenu,
        setConfirmDelete,
        handleFiltersChange,
        handleDelete,
        executeDelete,
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
        <>
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

            <ConfirmationModal
                isOpen={confirmDelete !== null}
                title="Delete Contact"
                message={`Are you sure you want to delete contact "${confirmDelete?.name}"?`}
                variant="danger"
                confirmText="Delete"
                onConfirm={executeDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
}
