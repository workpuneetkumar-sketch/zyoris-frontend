// app/(dashboard)/leads/page.tsx
"use client";

import { LeadsTable } from "@/components/leads/LeadsUI";
import { useLeads } from "@/hooks/useLeads";
import { PER_PAGE } from "@/types/leads";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export default function LeadsPage() {
    const {
        leads,
        total,
        page,
        filters,
        loading,
        error,
        openMenu,
        convertingId,
        confirmAction,
        setPage,
        setOpenMenu,
        setConfirmAction,
        handleFiltersChange,
        handleNewLead,
        handleExport,
        handleAction,
        executeConfirmedAction,
        retry,
    } = useLeads();

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
            <LeadsTable
                leads={leads}
                total={total}
                page={page}
                perPage={PER_PAGE}
                filters={filters}
                loading={loading}
                openMenu={openMenu}
                convertingId={convertingId}
                onPageChange={setPage}
                onFiltersChange={handleFiltersChange}
                onRefreshLeads={retry}
                onNewLead={handleNewLead}
                onExport={handleExport}
                onAction={handleAction}
                setOpenMenu={setOpenMenu}
            />

            <ConfirmationModal
                isOpen={confirmAction.type !== null}
                title={confirmAction.type === "Delete" ? "Delete Lead" : "Convert Lead"}
                message={
                    confirmAction.type === "Delete"
                        ? `Are you sure you want to delete lead "${confirmAction.lead?.name}"?`
                        : `Convert lead "${confirmAction.lead?.name}" to a deal?`
                }
                variant={confirmAction.type === "Delete" ? "danger" : "default"}
                confirmText={confirmAction.type === "Delete" ? "Delete" : "Convert"}
                onConfirm={executeConfirmedAction}
                onCancel={() => setConfirmAction({ type: null, lead: null })}
            />
        </>
    );
}